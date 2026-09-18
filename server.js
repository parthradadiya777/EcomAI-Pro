import express from "express";
import dns from "node:dns/promises";
import net from "node:net";
import path from "node:path";
import {fileURLToPath} from "node:url";
import * as cheerio from "cheerio";

const app=express();
app.use(express.json({limit:"1mb"}));
const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);

const MARKET_DOMAINS={
  Meesho:["meesho.com"], Myntra:["myntra.com"],
  Amazon:["amazon.in","amazon.com"], Flipkart:["flipkart.com"], Shopify:["myshopify.com"]
};
const BLOCK_SIGNALS=["site maintenance","under maintenance","temporarily unavailable","access denied","verify you are human","captcha","robot check","request blocked","enable javascript"];

function clean(v){return typeof v==="string"?v.replace(/\s+/g," ").trim():v}
function detectPlatform(raw){
  try{
    const u=new URL(raw),host=u.hostname.replace(/^www\./,"").toLowerCase();
    for(const [name,domains] of Object.entries(MARKET_DOMAINS)) if(domains.some(d=>host===d||host.endsWith("."+d))) return name;
    return null;
  }catch{return null}
}
function isPrivateIp(ip){
  if(net.isIPv4(ip)){const [a,b]=ip.split(".").map(Number);return a===10||a===127||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||a===0||a>=224}
  if(net.isIPv6(ip)){const v=ip.toLowerCase();return v==="::1"||v.startsWith("fc")||v.startsWith("fd")||v.startsWith("fe80:")}
  return true;
}
async function assertPublicHost(hostname){
  if(["localhost","localhost.localdomain"].includes(hostname.toLowerCase())) throw new Error("Local URLs are not allowed.");
  const addresses=await dns.lookup(hostname,{all:true});
  if(!addresses.length||addresses.some(a=>isPrivateIp(a.address))) throw new Error("This URL does not resolve to a public host.");
}
function walkJsonLd(node,out){
  if(!node)return;
  if(Array.isArray(node)){node.forEach(x=>walkJsonLd(x,out));return}
  if(typeof node!=="object")return;
  if(node["@graph"])walkJsonLd(node["@graph"],out);
  const types=Array.isArray(node["@type"])?node["@type"]:[node["@type"]];
  if(types.some(t=>String(t).toLowerCase()==="product"))out.push(node);
  Object.keys(node).forEach(k=>{if(k!=="@graph")walkJsonLd(node[k],out)});
}
function imageUrl(value,base){
  if(!value)return null;
  const raw=typeof value==="string"?value:(value.url||value.contentUrl);
  if(!raw)return null;
  try{return new URL(raw,base).href}catch{return null}
}
function looksBlocked(text,title=""){const hay=(title+" "+text).toLowerCase();return BLOCK_SIGNALS.find(s=>hay.includes(s))||null}
function parseProductJsonLd($,base){
  const products=[];
  $('script[type="application/ld+json"]').each((_,el)=>{try{walkJsonLd(JSON.parse($(el).contents().text()),products)}catch{}});
  const product=products[0]||{},offers=Array.isArray(product.offers)?product.offers[0]:product.offers||{};
  return {product,brand:typeof product.brand==="string"?product.brand:product.brand?.name,sku:product.sku||product.mpn||null,price:offers.price??product.price??null,currency:offers.priceCurrency??product.priceCurrency??null,availability:offers.availability?String(offers.availability).split("/").pop():null,category:product.category||null,images:(Array.isArray(product.image)?product.image:[product.image]).map(x=>imageUrl(x,base)).filter(Boolean)};
}
function collectRelated($,baseUrl,sourceUrl){
  const out=[],seen=new Set([sourceUrl]),sourceHost=new URL(sourceUrl).hostname.replace(/^www\./,"").toLowerCase();
  const likelyPaths=["/buy","/p/","/product","/products/","/item/","/shop/"];
  $("a[href]").each((_,el)=>{
    if(out.length>=12)return false;
    const href=$(el).attr("href"); if(!href)return;
    let abs; try{abs=new URL(href,baseUrl).href}catch{return}
    const u=new URL(abs);
    if(u.hostname.replace(/^www\./,"").toLowerCase()!==sourceHost||seen.has(abs)||!likely.test(u.pathname)||abs===sourceUrl)return;
    const title=clean($(el).text())||clean($(el).attr("aria-label"))||clean($(el).find("img").attr("alt"));
    if(!title&&u.pathname.length<12)return;
    seen.add(abs);out.push({url:abs,title:title||"Related product"});
  });
  return out;
}
function parseMarkdownRelated(markdown,sourceUrl){
  const out=[],seen=new Set([sourceUrl]),sourceHost=new URL(sourceUrl).hostname.replace(/^www\./,"").toLowerCase();
  const re=/\[([^\]]{3,180})\]\((https?:\/\/[^)]+)\)/g;let m;
  while((m=re.exec(markdown))&&out.length<12){
    const title=clean(m[1]),url=m[2]; try{const u=new URL(url);const host=u.hostname.replace(/^www\./,"").toLowerCase();if(host!==sourceHost||seen.has(u.href)||!/(\/buy|\/p\/|\/product|\/products\/|\/item\/|\/shop\/)/i.test(u.pathname))continue;seen.add(u.href);out.push({url:u.href,title})}catch{}
  }
  return out;
}
async function fetchHtml(rawUrl){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),14000);
  try{
    const response=await fetch(rawUrl,{redirect:"follow",signal:c.signal,headers:{"user-agent":"Mozilla/5.0 (compatible; EcomAIPro/0.3; +https://ecomai-pro-app.onrender.com)","accept":"text/html,application/xhtml+xml"}});
    if(!response.ok)throw new Error("Marketplace returned HTTP "+response.status+".");
    const ct=response.headers.get("content-type")||"";if(!ct.includes("text/html")&&!ct.includes("application/xhtml+xml"))throw new Error("URL did not return an HTML product page.");
    return {html:await response.text(),finalUrl:response.url};
  }catch(e){if(e.name==="AbortError")throw new Error("The product page took too long to respond.");throw e}finally{clearTimeout(t)}
}
async function fetchWithJina(rawUrl){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),25000);
  try{
    const response=await fetch("https://r.jina.ai/"+rawUrl,{signal:c.signal,headers:{"accept":"application/json"}});
    if(!response.ok)throw new Error("Secondary reader returned HTTP "+response.status+".");
    const text=await response.text();try{const j=JSON.parse(text);return {content:String(j.content||""),title:String(j.title||""),url:String(j.url||rawUrl)}}catch{return {content:text,title:"",url:rawUrl}}
  }catch(e){if(e.name==="AbortError")throw new Error("Secondary page reader timed out.");throw e}finally{clearTimeout(t)}
}
async function extractFromHtml(rawUrl,html,finalUrl){
  const $=cheerio.load(html),pageTitle=clean($('meta[property="og:title"]').attr("content")||$("title").text()||$("h1").first().text());
  const blocked=looksBlocked($("body").text(),pageTitle);if(blocked)throw new Error("Marketplace returned a non-product/blocked page ("+blocked+").");
  const parsed=parseProductJsonLd($,finalUrl),desc=clean($('meta[property="og:description"]').attr("content")||$('meta[name="description"]').attr("content"));
  const imageSet=new Set(parsed.images);
  $("meta[property='og:image'],meta[property='og:image:url'],meta[name='twitter:image']").each((_,el)=>{const u=imageUrl($(el).attr("content"),finalUrl);if(u)imageSet.add(u)});
  $("img").each((_,el)=>{const u=imageUrl($(el).attr("src")||$(el).attr("data-src")||$(el).attr("data-lazy-src"),finalUrl);if(u)imageSet.add(u);if(imageSet.size>=30)return false});
  return {sourceUrl:rawUrl,finalUrl,platform:detectPlatform(rawUrl)||detectPlatform(finalUrl),title:pageTitle||clean(parsed.product.name)||null,description:desc||clean(parsed.product.description)||null,brand:clean(parsed.brand)||null,sku:clean(parsed.sku)||null,category:clean(parsed.category)||null,price:parsed.price!==null?String(parsed.price):null,currency:clean(parsed.currency)||null,availability:clean(parsed.availability)||null,images:[...imageSet].slice(0,30),relatedProducts:collectRelated($,finalUrl,rawUrl).slice(0,5),extractionMethod:"direct HTML / structured metadata",warnings:[]};
}
function extractFromReader(rawUrl,reader){
  const content=String(reader.content||""),blocked=looksBlocked(content,reader.title);if(blocked)throw new Error("Secondary reader also returned a non-product page ("+blocked+").");
  const lines=content.split("\n").map(clean).filter(Boolean),combined=lines.join(" "),priceMatch=combined.match(/(?:₹|Rs\.?|INR\s?)(\s?[\d,]+(?:\.\d{1,2})?)/i),imageSet=new Set();
  const imgRe=/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g;let im;while((im=imgRe.exec(content))&&imageSet.size<30)imageSet.add(im[1]);
  const data={sourceUrl:rawUrl,finalUrl:reader.url||rawUrl,platform:detectPlatform(rawUrl)||detectPlatform(reader.url||rawUrl),title:clean(reader.title)||lines.find(x=>x.length>15)||null,description:combined.slice(0,800)||null,brand:null,sku:null,category:null,price:priceMatch?priceMatch[1].replace(/^\s+/,""):null,currency:priceMatch?"₹":null,availability:null,images:[...imageSet],relatedProducts:parseMarkdownRelated(content,rawUrl).slice(0,5),extractionMethod:"secondary browser reader",warnings:[]};
  if(!data.title&&!data.images.length&&!data.price)throw new Error("The marketplace page did not expose enough product information.");
  if(!data.images.length)data.warnings.push("No product images were exposed by the reader.");
  if(!data.price)data.warnings.push("Price was not exposed by the reader.");
  if(data.relatedProducts.length<3)data.warnings.push("Fewer than 3 related products were exposed by the source page.");
  return data;
}

function slugQuery(rawUrl){
  try{
    const u=new URL(rawUrl);
    const slug=decodeURIComponent(u.pathname).split("/").filter(Boolean).join(" ").replace(/[-_]+/g," ");
    return slug.replace(/\b(buy|product|item|p)\b/gi," ").replace(/\s+/g," ").trim().slice(0,180);
  }catch{return ""}
}
async function searchMarketplaceProducts(rawUrl,platform,seedTitle=""){
  const host=(platform==="Myntra"?"myntra.com":platform==="Meesho"?"meesho.com":platform==="Amazon"?"amazon.in":platform==="Flipkart"?"flipkart.com":null);
  if(!host)return [];
  const query=(seedTitle||slugQuery(rawUrl)).replace(/\s+/g," ").trim();
  if(!query)return [];
  const searchUrl="https://html.duckduckgo.com/html/?q="+encodeURIComponent("site:"+host+" "+query);
  const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);
  try{
    const response=await fetch(searchUrl,{signal:c.signal,headers:{"user-agent":"Mozilla/5.0 (compatible; EcomAIPro/0.3.1)","accept":"text/html"}});
    if(!response.ok)return [];
    const html=await response.text(),$=cheerio.load(html),items=[],seen=new Set([rawUrl]);
    $("a.result__a").each((_,el)=>{
      if(items.length>=8)return false;
      const href=$(el).attr("href"),title=clean($(el).text());
      if(!href||!title)return;
      try{
        const u=new URL(href,searchUrl);
        if(u.hostname.includes("duckduckgo.com"))return;
        const target=u.href.split("#")[0];
        const h=u.hostname.replace(/^www\./,"").toLowerCase();
        if(h!==host||seen.has(target))return;
         if(!["/buy","/p/","/product","/products/","/item/","/shop/"].some(p=>u.pathname.toLowerCase().includes(p)))return;
        seen.add(target);items.push({url:target,title});
      }catch{}
    });
    return items;
  }catch{return []}finally{clearTimeout(t)}
}

async function hydrateRelated(items){
  return (await Promise.all(items.slice(0,5).map(async item=>{
    try{
      const {html,finalUrl}=await fetchHtml(item.url);
      const $=cheerio.load(html),parsed=parseProductJsonLd($,finalUrl);
      const title=clean($('meta[property="og:title"]').attr("content")||$("h1").first().text())||item.title;
      const img=imageUrl($('meta[property="og:image"]').attr("content"),finalUrl)||(parsed.images&&parsed.images[0])||null;
      const offers=Array.isArray(parsed.product?.offers)?parsed.product.offers[0]:parsed.product?.offers||{};
      return {...item,title,price:offers.price??parsed.price??null,currency:offers.priceCurrency??parsed.currency??null,image:img,verified:true};
    }catch{return {...item,verified:false}}
  }))).filter(Boolean);
}

async function enrichRelatedProducts(rawUrl,platform,seedTitle,existing=[]){
  const merged=[...existing],seen=new Set(merged.map(x=>x.url));
  const found=await searchMarketplaceProducts(rawUrl,platform,seedTitle);
  for(const x of found){if(!seen.has(x.url)){seen.add(x.url);merged.push(x)}if(merged.length>=5)break}
  const hydrated=await hydrateRelated(merged);
  return hydrated.slice(0,5);
}

async function extractProduct(rawUrl){
  const url=new URL(rawUrl);if(!["http:","https:"].includes(url.protocol))throw new Error("Only HTTP/HTTPS product URLs are supported.");
  await assertPublicHost(url.hostname);
  try{
    const {html,finalUrl}=await fetchHtml(url.href);const data=await extractFromHtml(url.href,html,finalUrl);
    if(!data.title&&!data.images.length)throw new Error("Insufficient product data.");
    if(data.relatedProducts.length<3){const reader=await fetchWithJina(url.href);const extra=parseMarkdownRelated(reader.content,url.href),seen=new Set(data.relatedProducts.map(x=>x.url));for(const x of extra){if(!seen.has(x.url)){seen.add(x.url);data.relatedProducts.push(x)}if(data.relatedProducts.length>=5)break}}
    data.relatedProducts=await enrichRelatedProducts(url.href,data.platform,data.title,data.relatedProducts);
    data.internalCheck={status:"completed",source:"marketplace search + public product page signals",count:data.relatedProducts.length};
    return data;
  }catch(primary){
    const reader=await fetchWithJina(url.href);const data=extractFromReader(url.href,reader);data.warnings.unshift("Primary marketplace fetch was unavailable, so a secondary browser reader was used.");data.relatedProducts=await enrichRelatedProducts(url.href,data.platform,data.title,data.relatedProducts);data.internalCheck={status:"completed",source:"marketplace search + public product page signals",count:data.relatedProducts.length};return data;
  }
}
app.get("/api/health",(req,res)=>res.json({ok:true,service:"ecomai-pro-api",version:"0.3.0"}));
app.post("/api/analyze-url",async(req,res)=>{try{const raw=String(req.body?.url||"").trim();if(!raw)return res.status(400).json({ok:false,error:"Product URL is required."});return res.json({ok:true,data:await extractProduct(raw)})}catch(e){return res.status(422).json({ok:false,error:e?.message||"Unable to analyze this URL.",code:"EXTRACTION_FAILED"})}});
const dist=path.join(__dirname,"dist");app.use((req,res,next)=>{res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");res.setHeader("Pragma","no-cache");res.setHeader("Expires","0");next()});app.use(express.static(dist,{etag:false,maxAge:0}));app.get(/.*/,(req,res)=>{if(req.path.startsWith("/api/"))return res.status(404).json({ok:false,error:"API route not found."});res.sendFile(path.join(dist,"index.html"))});
const port=Number(process.env.PORT||3000);app.listen(port,()=>console.log("EcomAI Pro listening on "+port));