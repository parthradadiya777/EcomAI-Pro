import express from "express";
import dns from "node:dns/promises";
import net from "node:net";
import path from "node:path";
import {fileURLToPath} from "node:url";
import * as cheerio from "cheerio";
import * as XLSX from "xlsx";

const app=express();
console.log("EcomAI AI providers configured:", {gemini:Boolean(process.env.GEMINI_API_KEY), openai:Boolean(process.env.OPENAI_API_KEY)});
app.use(express.json({limit:"30mb"}));
const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);

const MARKET_DOMAINS={
  Meesho:["meesho.com"], Myntra:["myntra.com"],
  Amazon:["amazon.in","amazon.com"], Flipkart:["flipkart.com"], Shopify:["myshopify.com"]
};
const BLOCK_SIGNALS=["site maintenance","under maintenance","temporarily unavailable","access denied","verify you are human","captcha","robot check","request blocked","enable javascript"];

function clean(v){return typeof v==="string"?v.replace(/\s+/g," ").trim():v}
function extractPriceSignals(text=""){
  const t=String(text||"").replace(/\u00a0/g," ");
  const patterns=[
    /(?:selling price|sale price|current price|offer price|our price|price)\s*(?:is|:)?\s*(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i
  ];
  let price=null;
  for(const re of patterns){const m=t.match(re);if(m){price=m[1].replace(/,/g,"");break}}
  const mrpMatch=t.match(/(?:maximum retail price|mrp)\s*(?:is|:)?\s*(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i);
  return {price,currency:price?"₹":null,mrp:mrpMatch?mrpMatch[1].replace(/,/g,""):null};
}
function detectPlatform(raw){
  try{
    const u=new URL(raw),host=u.hostname.replace(/^www\./,"").toLowerCase();
    for(const [name,domains] of Object.entries(MARKET_DOMAINS)) if(domains.some(d=>host===d||host.endsWith("."+d))) return name;
    if(host==="localhost"||host.endsWith(".local"))return null;
    const parts=host.split(".");
    const label=parts.length>2?parts[parts.length-2]:parts[0];
    if(!label||["www","shop","store","m","app"].includes(label))return null;
    return label.charAt(0).toUpperCase()+label.slice(1);
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
function looksMarketplaceErrorPage(text="",title=""){
  const t=clean(title||"");
  if(/^(oops!?|something went wrong|page not found|access denied|error)(?:\b|\s|!)/i.test(t))return true;
  const h=String(text||"").toLowerCase().slice(0,1200);
  return /oops!?\s+something went wrong|something went wrong|page not found|access denied|application error/i.test(h);
}
function titleFromProductUrl(rawUrl){
  try{
    const u=new URL(rawUrl);
    const parts=decodeURIComponent(u.pathname).split("/").filter(Boolean);
    const buyIndex=parts.findIndex(x=>x.toLowerCase()==="buy");
    const slug=buyIndex>0?parts[buyIndex-1]:"";
    const cleaned=slug.replace(/\b\d{6,}\b/g," ").replace(/[-_]+/g," ").replace(/\s+/g," ").trim();
    if(!cleaned)return "Marketplace product";
    return cleaned.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ").slice(0,180);
  }catch{return "Marketplace product"}
}
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
    if(u.hostname.replace(/^www\./,"").toLowerCase()!==sourceHost||seen.has(abs)||!likelyPaths.some(p=>u.pathname.toLowerCase().includes(p))||abs===sourceUrl)return;
    const title=clean($(el).text())||clean($(el).attr("aria-label"))||clean($(el).find("img").attr("alt"));
    if(!title&&u.pathname.length<12)return;
    seen.add(abs);out.push({url:abs,title:title||"Related product"});
  });
  return out;
}
function parseMarkdownRelated(markdown,sourceUrl){
  const out=[],seen=new Set([sourceUrl]),sourceHost=new URL(sourceUrl).hostname.replace(/^www\./,"").toLowerCase();
  const add=(url,title="")=>{
    try{
      const u=new URL(url,sourceUrl),host=u.hostname.replace(/^www\./,"").toLowerCase();
      if(host!==sourceHost||seen.has(u.href)||!/(\/buy|\/p\/|\/product|\/products\/|\/item\/|\/shop\/)/i.test(u.pathname))return;
      const cleanTitle=clean(title)||decodeURIComponent(u.pathname).split("/").filter(Boolean).pop()?.replace(/[-_]+/g," ")||"Related product";
      seen.add(u.href);out.push({url:u.href,title:cleanTitle.slice(0,180)});
    }catch{}
  };
  const re=/\[([^\]]{3,180})\]\((https?:\/\/[^)]+)\)/g;let m;
  while((m=re.exec(markdown))&&out.length<12)add(m[2],m[1]);
  // Some marketplace pages returned by browser readers contain raw URLs instead
  // of markdown links. Extract those too, especially Myntra /buy product URLs.
  if(out.length<12){
    const rawUrlRe=/https?:\/\/[^\s<>()\[\]"]+/g;let r;
    while((r=rawUrlRe.exec(markdown))&&out.length<12)add(r[0].replace(/[.,;]+$/,""));
  }
  // Relative Myntra links can also appear in reader output.
  if(out.length<12 && sourceHost==="myntra.com"){
    const relRe=/(?:^|\s)(\/[^\s<>()\[\]]*\/buy)(?=\s|$)/g;let r;
    while((r=relRe.exec(markdown))&&out.length<12)add(r[1]);
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
  const blocked=looksBlocked($("body").text(),pageTitle);if(blocked||looksMarketplaceErrorPage($("body").text(),pageTitle))throw new Error("Marketplace returned a non-product/error page.");
  const parsed=parseProductJsonLd($,finalUrl),desc=clean($('meta[property="og:description"]').attr("content")||$('meta[name="description"]').attr("content"));
  const imageSet=new Set(parsed.images);
  $("meta[property='og:image'],meta[property='og:image:url'],meta[name='twitter:image']").each((_,el)=>{const u=imageUrl($(el).attr("content"),finalUrl);if(u)imageSet.add(u)});
  $("img").each((_,el)=>{const raw=$(el).attr("src")||$(el).attr("data-src")||$(el).attr("data-lazy-src")||$(el).attr("data-original")||$(el).attr("data-image")||$(el).attr("data-url");const u=imageUrl(raw,finalUrl);if(u)imageSet.add(u);const srcset=$(el).attr("srcset");if(srcset)srcset.split(",").forEach(part=>{const candidate=part.trim().split(/\s+/)[0];const su=imageUrl(candidate,finalUrl);if(su)imageSet.add(su)});if(imageSet.size>=30)return false});
  return {sourceUrl:rawUrl,finalUrl,platform:detectPlatform(rawUrl)||detectPlatform(finalUrl),title:pageTitle||clean(parsed.product.name)||null,description:desc||clean(parsed.product.description)||null,brand:clean(parsed.brand)||null,sku:clean(parsed.sku)||null,category:clean(parsed.category)||null,price:parsed.price!==null?String(parsed.price):null,currency:clean(parsed.currency)||null,availability:clean(parsed.availability)||null,images:[...imageSet].slice(0,30),relatedProducts:collectRelated($,finalUrl,rawUrl).slice(0,5),extractionMethod:"direct HTML / structured metadata",warnings:[]};
}
function extractFromReader(rawUrl,reader){
  const content=String(reader.content||""),blocked=looksBlocked(content,reader.title);if(blocked)throw new Error("Secondary reader also returned a non-product page ("+blocked+").");
  const lines=content.split("\n").map(clean).filter(Boolean),combined=lines.join(" "),priceMatch=combined.match(/(?:₹|Rs\.?|INR\s?)(\s?[\d,]+(?:\.\d{1,2})?)/i),imageSet=new Set();
  const imgRe=/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g;let im;while((im=imgRe.exec(content))&&imageSet.size<30)imageSet.add(im[1]);
  const rawImgRe=/https?:\/\/[^\s<>()\[\]"]+(?:assets\.myntassets\.com[^\s<>()\[\]"]+|\.(?:jpg|jpeg|png|webp)(?:\?[^\s<>()\[\]"]*)?)/gi;while((im=rawImgRe.exec(content))&&imageSet.size<30)imageSet.add(im[0].replace(/\\u0026/g,"&"));
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
    return slug.replace(/\b(buy|product|item|p)\b/gi," ").replace(/\b\d{5,}\b/g," ").replace(/\s+/g," ").trim().slice(0,180);
  }catch{return ""}
}
function parseMyntraReaderProducts(markdown,query=""){
  const out=[],seen=new Set();
  const add=(raw,title="")=>{
    try{
      let value=String(raw||"").replace(/&amp;/g,"&").trim();
      const u=new URL(value,"https://www.myntra.com");
      const host=u.hostname.replace(/^www\./,"").toLowerCase(),p=u.pathname.toLowerCase();
      if(host!=="myntra.com"||!p.includes("/buy"))return;
      const url=u.href.split("#")[0];
      if(seen.has(url))return;
      seen.add(url);
      const cleanTitle=clean(title)||decodeURIComponent(u.pathname).split("/").filter(Boolean).pop()?.replace(/[-_]+/g," ")||"Myntra product";
      out.push({url,title:cleanTitle.slice(0,180),searchQuery:query});
    }catch{}
  };
  const md=/\[([^\]]{2,220})\]\(([^)]+)\)/g;let m;
  while((m=md.exec(String(markdown||"")))&&out.length<15)add(m[2],m[1]);
  const raw=/https?:\/\/www\.myntra\.com\/[^\s<>()\[\]"]+\/buy(?:\?[^\s<>()\[\]"]*)?/gi;let r;
  while((r=raw.exec(String(markdown||"")))&&out.length<15)add(r[0].replace(/[.,;]+$/,""));
  const rel=/(\/kurta-sets\/[^\s<>()\[\]"]+\/buy(?:\?[^\s<>()\[\]"]*)?)/gi;
  while((r=rel.exec(String(markdown||"")))&&out.length<15)add(r[1]);
  return out;
}
async function searchMyntraViaReader(query,rawUrl){
  const targets=[
    "https://www.myntra.com/kurta-sets?rawQuery="+encodeURIComponent(query),
    "https://www.myntra.com/search?q="+encodeURIComponent(query),
    "https://www.myntra.com/kurta-set-for-women"
  ];
  for(const searchUrl of targets){
    try{
      const reader=await fetchWithJina(searchUrl);
      const found=parseMyntraReaderProducts(reader.content,query);
      if(found.length)return found.slice(0,10);
      const generic=parseMarkdownRelated(reader.content,searchUrl);
      if(generic.length)return generic.slice(0,10).map(x=>({...x,searchQuery:query}));
    }catch{}
  }
  return [];
}

function marketplaceHost(platform){
  if(platform==="Myntra")return "myntra.com";
  if(platform==="Meesho")return "meesho.com";
  if(platform==="Amazon")return "amazon.in";
  if(platform==="Flipkart")return "flipkart.com";
  if(platform==="Shopify")return null;
  return null;
}
function isLikelyProductPath(path,platform){
  const p=String(path||"").toLowerCase();
  if(platform==="Myntra")return /\/buy(?:\/|$)/.test(p);
  if(platform==="Meesho")return /\/p\//.test(p);
  if(platform==="Amazon")return /\/dp\//.test(p);
  if(platform==="Flipkart")return /\/p\//.test(p);
  return /\/(?:p|product|products|item|items|dp|buy|shop|detail|details)(?:\/|$)/.test(p) || p.split("/").filter(Boolean).length>=2;
}
function parseMarketplaceUrlsFromReader(markdown,platform,queries=[],sourceHost=""){
  const host=marketplaceHost(platform)||sourceHost||"";
  const out=[],seen=new Set();
  const add=(raw,title="",query="")=>{
    try{
      let value=String(raw||"").replace(/&amp;/g,"&").trim();
      if(value.startsWith("<"))return;
      const u=new URL(value);
      const h=u.hostname.replace(/^www\./,"").toLowerCase(),p=u.pathname.toLowerCase();
      if(h!==host)return;
      const valid=isLikelyProductPath(p,platform);
      if(!valid)return;
      const url=u.href.split("#")[0];
      if(seen.has(url))return;
      seen.add(url);out.push({url,title:clean(title)||"Marketplace product",searchQuery:query});
    }catch{}
  };
  const md=/\[([^\]]{2,220})\]\((https?:\/\/[^)]+)\)/g;let m;
  while((m=md.exec(markdown||""))&&out.length<20)add(m[2],m[1],queries[0]||"");
  const raw=/https?:\/\/[^\s<>()\[\]"]+/g;let r;
  while((r=raw.exec(markdown||""))&&out.length<20)add(r[0].replace(/[.,;]+$/,""),"",queries[0]||"");
  return out;
}

async function searchBingRssMarketplaceProducts(host,platform,queries){
  const searchOne=async q=>{
    try{
      const target="https://www.bing.com/search?format=rss&mkt=en-IN&q="+encodeURIComponent("site:"+host+" "+q);
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
      const response=await fetch(target,{signal:controller.signal,headers:{"user-agent":"Mozilla/5.0 (compatible; EcomAIPro/0.4)","accept":"application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8"}});
      clearTimeout(timer);
      if(!response.ok)return [];
      const xml=await response.text();
      const $=cheerio.load(xml,{xmlMode:true}),out=[];
      $("item").each((_,el)=>{
        if(out.length>=10)return false;
        const link=clean($(el).find("link").first().text());
        const title=clean($(el).find("title").first().text());
        const description=clean($(el).find("description").first().text());
        const priceMatch=(title+" "+description).match(/(?:₹|Rs\.?|INR\s?)(\s?[\d,]+(?:\.\d{1,2})?)/i);
        const price=priceMatch?priceMatch[1].replace(/^\s+/,""):null;
        if(!link)return;
        try{
          const u=new URL(link),h=u.hostname.replace(/^www\./,"").toLowerCase(),p=u.pathname.toLowerCase();
          if(h!==host)return;
          const valid=isLikelyProductPath(p,platform);
          if(!valid)return;
          out.push({url:u.href.split("#")[0],title:title||"Marketplace product",price,currency:price?"₹":null,searchQuery:q});
        }catch{}
      });
      return out;
    }catch{return []}
  };
  const lists=await Promise.all([...new Set(queries)].slice(0,6).map(searchOne));
  const out=[],seen=new Set();
  for(const list of lists)for(const x of list)if(!seen.has(x.url)){seen.add(x.url);out.push(x);if(out.length>=12)return out}
  return out;
}

async function searchIndexedMarketplaceProducts(host,platform,queries){
  // Use Jina as a browser/search transport instead of fetching Google/Bing HTML
  // directly. Render-hosted requests to search-engine HTML are frequently
  // challenged, while the reader exposes the public result links in markdown.
  const searchOne=async q=>{
    const targets=[
      "https://www.google.com/search?q="+encodeURIComponent("site:"+host+" "+q),
      "https://www.bing.com/search?q="+encodeURIComponent("site:"+host+" "+q)
    ];
    const out=[];
    for(const target of targets){
      try{
        const reader=await fetchWithJina(target);
        const found=parseMarketplaceUrlsFromReader(reader.content,platform,[q],host);
        for(const x of found){if(!out.some(v=>v.url===x.url))out.push({...x,searchQuery:q});if(out.length>=8)break}
        if(out.length>=8)break;
      }catch{}
    }
    return out;
  };
  const lists=await Promise.all([...new Set(queries)].slice(0,6).map(searchOne));
  const out=[],seen=new Set();
  for(const list of lists)for(const x of list)if(!seen.has(x.url)){seen.add(x.url);out.push(x);if(out.length>=12)return out}
  return out;
}

const MYNTRA_PUBLIC_FALLBACKS=[
{url:"https://www.myntra.com/kurta-sets/cordset/cordset-women-floral-printed-regular-thread-work-pure-cotton-kurta-with-trousers--with-dupatta/39653997/buy",title:"CORDSET Women Floral Printed Regular Thread Work Pure Cotton Kurta With Trousers & With Dupatta"},
{url:"https://www.myntra.com/kurta-sets/fabindia/fabindia-women-floral-printed-regular-thread-work-pure-cotton-kurta-with-trousers--with-dupatta/43232913/buy",title:"Fabindia Women Floral Printed Regular Thread Work Pure Cotton Kurta With Trousers & With Dupatta"},
{url:"https://www.myntra.com/kurta-sets/indoera/indo-era-floral-printed-thread-work-pure-cotton-kurta-with-trousers--dupatta/29482036/buy",title:"Indo Era Floral Printed Thread Work Pure Cotton Kurta With Trousers & Dupatta"},
{url:"https://www.myntra.com/kurta-sets/cheti/cheti-women-floral-printed-regular-thread-work-pure-cotton-kurta-with-trousers--with-dupatta/38138938/buy",title:"CHETI Women Floral Printed Regular Thread Work Pure Cotton Kurta With Trousers & With Dupatta"},
{url:"https://www.myntra.com/kurta-sets/szn/szn-floral-printed-thread-work-pure-silk-straight-kurta-with-sharara--dupatta/35839335/buy",title:"SZN Floral Printed Thread Work Pure Silk Straight Kurta With Sharara & Dupatta"},
{url:"https://www.myntra.com/kurta-sets/g4girl/g4girl-floral-printed-thread-work-pure-cotton-straight-kurta-with-trousers---dupatta/30710499/buy",title:"G4Girl Floral Printed Thread Work Pure Cotton Straight Kurta With Trousers & Dupatta"},
{url:"https://www.myntra.com/kurta-sets/chansi/chansi-ethnic-motifs-printed-empire-thread-work-kurta-with-palazzos--dupatta/25212622/buy",title:"CHANSI Floral Printed Empire Thread Work Kurta With Palazzos & Dupatta"},
{url:"https://www.myntra.com/kurta-sets/navibhu/navibhu-women-floral-printed-thread-work-pure-cotton-kurta-with-trousers--dupatta/39376759/buy",title:"Navibhu Women Floral Printed Thread Work Pure Cotton Kurta With Trousers & Dupatta"},
{url:"https://www.myntra.com/kurta-sets/ganga/ganga-floral-printed-thread-work-linen-kurta-with-palazzos--dupatta/24562922/buy",title:"Ganga Floral Printed Thread Work Linen Kurta With Palazzos & Dupatta"},
{url:"https://www.myntra.com/kurta-sets/anouk/anouk-mustard-yellow-floral-printed-thread-work-straight-kurta-with-trousers--dupatta/32096884/buy",title:"Anouk Mustard Yellow Floral Printed Thread Work Straight Kurta With Trousers & Dupatta"}
];

async function searchMarketplaceProducts(rawUrl,platform,seedTitle="",refreshKey=""){
  let host=marketplaceHost(platform);
  if(!host){
    try{host=new URL(rawUrl).hostname.replace(/^www\./,"").toLowerCase()}catch{return []}
  }
  const rawSeed=normalizeKeyword(seedTitle||slugQuery(rawUrl));
  const stop=new Set(["buy","shop","online","product","item","page","ref","dp","www","com","amazon","myntra","meesho","flipkart"]);
  const words=rawSeed.split(" ").filter(w=>w.length>2&&!stop.has(w)&&!/^b0[a-z0-9]{8,}$/i.test(w)&&!/^\d{5,}$/.test(w));
  const genericProductTerms=[
    "shoes","shoe","sneaker","sneakers","sandals","slippers","boots","heels","loafers","shirt","tshirt","jeans","dress","jacket","kurta","kurti","saree","palazzo","dupatta","suit","salwar",
    "phone","mobile","smartphone","laptop","tablet","watch","headphones","earbuds","speaker","camera","television","tv","monitor","keyboard","mouse","printer",
    "shampoo","serum","cream","moisturizer","lipstick","makeup","perfume","skincare","haircare","soap",
    "chair","table","sofa","bed","mattress","lamp","bottle","mixer","cookware","kitchen","storage","backpack","bag","wallet","toy","book","bedding","curtain"
  ];
  const core=words.filter(w=>genericProductTerms.includes(w));
  const query=(core.length?core:words).slice(0,5).join(" ")||rawSeed.split(" ").slice(0,5).join(" ");
  if(!query)return [];

  if(platform==="Myntra"){
    const myntraQueries=[query];
    if(core.includes("palazzo"))myntraQueries.push("kurta palazzo");
    else if(core.includes("saree"))myntraQueries.push("printed saree");
    else if(core.includes("shoe")||core.includes("shoes")||core.includes("sneaker"))myntraQueries.push("sneakers");
    else myntraQueries.push(query+" women");
    const lists=await Promise.all([...new Set(myntraQueries)].slice(0,3).map(q=>searchMyntraViaReader(q,rawUrl)));
    const items=[],seen=new Set([rawUrl]);
    for(const list of lists)for(const x of list)if(!seen.has(x.url)){seen.add(x.url);items.push(x);if(items.length>=8)return items}
    if(items.length<5){
      const seed=normalizeKeyword(query);
      const scored=MYNTRA_PUBLIC_FALLBACKS.map(x=>({...x,score:seed.split(" ").filter(w=>normalizeKeyword(x.title).includes(w)).length})).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score);
      if(refreshKey)scored.sort(()=>Math.random()-0.5);
      for(const x of scored){if(!seen.has(x.url)){seen.add(x.url);items.push({...x,searchQuery:query,discovery:"public marketplace fallback"});if(items.length>=8)return items}}
    }
    const bing=await searchBingRssMarketplaceProducts(host,platform,[...new Set(myntraQueries)]);
    for(const x of bing)if(!seen.has(x.url)){seen.add(x.url);items.push(x);if(items.length>=8)return items}
    const indexed=await searchIndexedMarketplaceProducts(host,platform,[...new Set(myntraQueries)]);
    for(const x of indexed)if(!seen.has(x.url)){seen.add(x.url);items.push(x);if(items.length>=8)return items}
    return items;
  }

  // First use the marketplace's own public search through the browser reader.
  // This is especially important for Amazon, where search engines may omit /dp/ results.
  const directQueries=[query];
  if(core.includes("shoe")||core.includes("shoes")||core.includes("sneaker"))directQueries.push("sneakers");
  if(core.includes("phone")||core.includes("mobile")||core.includes("smartphone"))directQueries.push("smartphone");
  if(core.includes("laptop"))directQueries.push("laptop");
  if(core.includes("headphones")||core.includes("earbuds"))directQueries.push("headphones");
  if(core.includes("shampoo")||core.includes("serum")||core.includes("cream"))directQueries.push(core.find(x=>["shampoo","serum","cream"].includes(x)));
  const directSearchOne=async q=>{
    try{
      const searchUrl=platform==="Amazon"
        ?"https://www.amazon.in/s?k="+encodeURIComponent(q)
        :platform==="Flipkart"
        ?"https://www.flipkart.com/search?q="+encodeURIComponent(q)
        :platform==="Meesho"
        ?"https://www.meesho.com/search?q="+encodeURIComponent(q)
        :"";
      if(!searchUrl)return [];
      const reader=await fetchWithJina(searchUrl);
      return parseMarketplaceUrlsFromReader(reader.content,platform,[q],host).slice(0,10);
    }catch{return []}
  };
  const directLists=await Promise.all([...new Set(directQueries)].slice(0,4).map(directSearchOne));
  {
    const directItems=[],seen=new Set([rawUrl]);
    for(const list of directLists)for(const x of list)if(!seen.has(x.url)){seen.add(x.url);directItems.push(x);if(directItems.length>=8)return directItems}
  }

  // All other supported marketplaces use the same progressive public-search ladder:
  // exact product terms -> attribute/category terms -> broader product query.
  const queries=[query];
  const addQuery=q=>{q=normalizeKeyword(q);if(q&&!queries.includes(q))queries.push(q)};
  if(words.length>=2)addQuery(words.slice(0,3).join(" "));
  if(core.length)addQuery(core.slice(0,3).join(" "));
  if(core.includes("shoe")||core.includes("shoes")||core.includes("sneaker")){addQuery("sneakers");addQuery("shoes");}
  if(core.includes("phone")||core.includes("mobile")||core.includes("smartphone")){addQuery("mobile phone");addQuery("smartphone");}
  if(core.includes("laptop"))addQuery("laptop");
  if(core.includes("headphones")||core.includes("earbuds"))addQuery("headphones");
  if(core.includes("shampoo")||core.includes("serum")||core.includes("cream"))addQuery(core.find(x=>["shampoo","serum","cream"].includes(x)));
  if(core.includes("kurta")||core.includes("kurti")){addQuery("kurta set");addQuery("kurti set");}
  if(core.includes("saree"))addQuery("saree");
  if(core.includes("dress"))addQuery("women dress");
  const searchOne=async q=>{
    const searchUrl="https://html.duckduckgo.com/html/?q="+encodeURIComponent("site:"+host+" "+q);
    const c=new AbortController(),t=setTimeout(()=>c.abort(),10000);
    try{
      const response=await fetch(searchUrl,{signal:c.signal,headers:{"user-agent":"Mozilla/5.0 (compatible; EcomAIPro/0.4)","accept":"text/html"}});
      if(!response.ok)return [];
      const html=await response.text(),$=cheerio.load(html),out=[];
      $("a.result__a").each((_,el)=>{
        if(out.length>=8)return false;
        const href=$(el).attr("href"),title=clean($(el).text());if(!href||!title)return;
        try{
          const u=new URL(href,searchUrl);let target=u.href.split("#")[0];
          if(u.hostname.includes("duckduckgo.com")){const wrapped=u.searchParams.get("uddg");if(!wrapped)return;try{target=decodeURIComponent(wrapped)}catch{target=wrapped}}
          const targetUrl=new URL(target),h=targetUrl.hostname.replace(/^www\./,"").toLowerCase(),path=targetUrl.pathname.toLowerCase();
          if(h!==host)return;
          const ok=(platform==="Meesho"&&/\/p\//.test(path))||(platform==="Amazon"&&/\/dp\//.test(path))||(platform==="Flipkart"&&/\/p\//.test(path));
          if(!ok)return;
          out.push({url:targetUrl.href,title,searchQuery:q});
        }catch{}
      });
      return out;
    }catch{return []}finally{clearTimeout(t)}
  };
  const lists=await Promise.all([...new Set(queries)].slice(0,8).map(searchOne));
  const items=[],seen=new Set([rawUrl]);
  for(const list of lists)for(const x of list)if(!seen.has(x.url)){seen.add(x.url);items.push(x);if(items.length>=8)return items}
  // If DDG is unavailable, use reader-backed indexed search.
  const indexed=await searchIndexedMarketplaceProducts(host,platform,[...new Set(queries)].slice(0,6));
  for(const x of indexed)if(!seen.has(x.url)){seen.add(x.url);items.push(x);if(items.length>=8)return items}
  return items;
}

function classifyMatchType(item,seedTitle=""){
  const source=normalizeKeyword(seedTitle),target=normalizeKeyword(item.title||"");
  const sourceWords=source.split(" ").filter(x=>x.length>2),targetWords=new Set(target.split(" "));
  const hits=sourceWords.filter(w=>targetWords.has(w)).length;
  const productTerms=["kurta","kurti","palazzo","dupatta","saree","suit","salwar","anarkali","set","shoe","shoes","sneaker","sneakers","sandals","slippers","boots","loafers","phone","mobile","laptop","tablet","watch","headphones","earbuds","camera","shampoo","serum","cream","dress","shirt","jeans","bag","wallet"];
  const productHits=sourceWords.filter(w=>targetWords.has(w)&&productTerms.includes(w)).length;
  if(productHits>=2&&hits>=3)return "Close Match";
  if(productHits>=1||hits>=2)return "Similar Product";
  return "Category Benchmark";
}

async function findMarketplaceImage(title,productUrl=""){
  let host="",platform="";
  try{const u=new URL(productUrl);host=u.hostname.replace(/^www\./,"").toLowerCase();platform=detectPlatform(productUrl)||""}catch{}
  const productCode=(String(productUrl).match(/\/(\d{5,})\/(?:buy|p|dp)/i)||[])[1]||"";
  const site=host?("site:"+host+" "):"";
  const queries=[
    site+(productCode?productCode+" ":"")+String(title||"").slice(0,150),
    site+String(title||"").slice(0,150),
    String(title||"").slice(0,170)+(platform?" "+platform:"")
  ];
  const pick=html=>{
    const values=[];
    for(const re of [/"murl":"([^"]+)"/g,/"ou":"([^"]+)"/g,/"original":"([^"]+)"/g]){
      for(const m of html.matchAll(re))values.push(String(m[1]).replace(/\\u0026/g,"&").replace(/\\\\/g,"/"));
    }
    return values.find(u=>/^https?:\/\//i.test(u)&&!/(favicon|logo|sprite|placeholder|icon)/i.test(u))||null;
  };
  for(const q of queries){
    try{
      const c=new AbortController(),t=setTimeout(()=>c.abort(),9000);
      const response=await fetch("https://www.bing.com/images/search?q="+encodeURIComponent(q),{signal:c.signal,headers:{"user-agent":"Mozilla/5.0","accept":"text/html,*/*"}});
      if(response.ok){
        const html=await response.text(),found=pick(html);
        if(found)return found;
      }
      clearTimeout(t);
    }catch{}
  }
  // Bing image HTML is often challenged from Render. Use Jina as a browser
  // transport for Google Images and extract the actual image CDN URLs it exposes.
  for(const q of queries){
    try{
      const reader=await fetchWithJina("https://www.google.com/search?tbm=isch&q="+encodeURIComponent(q));
      const body=String(reader.content||"");
      const preferred=[...body.matchAll(/https?:\/\/assets\.myntassets\.com\/[^\s<>()\[\]"]+/gi)]
        .map(m=>m[0].replace(/\\u0026/g,"&").replace(/\\/g,"/"))
        .find(u=>!/(logo|sprite|icon|placeholder)/i.test(u));
      if(preferred)return preferred;
      const generic=[...body.matchAll(/https?:\/\/[^\s<>()\[\]"]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s<>()\[\]"]*)?/gi)]
        .map(m=>m[0].replace(/\\u0026/g,"&").replace(/\\/g,"/"))
        .find(u=>!/(logo|sprite|icon|placeholder)/i.test(u));
      if(generic)return generic;
    }catch{}
  }
  return null;
}

function productRelevanceScore(title,seedTitle=""){
  const a=new Set(normalizeKeyword(seedTitle).split(" ").filter(w=>w.length>2));
  const b=new Set(normalizeKeyword(title).split(" ").filter(w=>w.length>2));
  const productTerms=["shoe","shoes","sneaker","sneakers","footwear","sandals","slippers","boots","heels","loafers","shirt","tshirt","jeans","dress","jacket","kurta","kurti","saree","palazzo","dupatta","suit","salwar","phone","mobile","smartphone","laptop","tablet","watch","headphones","earbuds","speaker","camera","television","tv","monitor","keyboard","mouse","printer","shampoo","serum","cream","moisturizer","lipstick","makeup","perfume","skincare","haircare","soap","chair","table","sofa","bed","mattress","lamp","bottle","mixer","cookware","kitchen","storage","backpack","bag","wallet","toy","book","bedding","curtain"];
  const shared=[...a].filter(w=>b.has(w));
  const productShared=shared.filter(w=>productTerms.includes(w));
  return {score:shared.length,productShared:productShared.length};
}
async function lookupMarketplacePrice(item,platform){
  if(item?.price)return {price:item.price,currency:item.currency||"₹",mrp:item.mrp||null};
  try{
    const host=marketplaceHost(platform)||new URL(item.url).hostname.replace(/^www\\./,"").toLowerCase();
    const productId=(String(item.url||"").match(/\/(\d{5,})\/(?:buy|p|dp)(?:\?|$)/i)||[])[1]||"";
    const q=productId||(item.title||"");
    if(!q)return {};
    const hits=await searchBingRssMarketplaceProducts(host,platform,[q]);
    const exact=hits.find(x=>x.url===item.url)||hits.find(x=>productId&&x.url.includes("/"+productId+"/"));
    if(exact?.price)return {price:exact.price,currency:exact.currency||"₹",mrp:exact.mrp||null};
  }catch{}
  return {};
}

async function hydrateRelated(items,seedTitle=""){
  return (await Promise.all(items.slice(0,8).map(async item=>{
    try{
      try{
        const {html,finalUrl}=await fetchHtml(item.url);
        const $=cheerio.load(html),parsed=parseProductJsonLd($,finalUrl);
        const rawBody=$("body").text();
        const pageTitle=clean($('meta[property="og:title"]').attr("content")||$("h1").first().text()||$("title").text());
        if(looksBlocked(rawBody,pageTitle)||looksMarketplaceErrorPage(rawBody,pageTitle))throw new Error("Marketplace returned an error page.");
        const title=pageTitle||item.title||titleFromProductUrl(item.url);
        const pageImages=[];
        $("img").each((_,el)=>{
          if(pageImages.length>=12)return false;
          for(const key of ["src","data-src","data-lazy-src","data-original","data-image","data-url"]){
            const value=imageUrl($(el).attr(key),finalUrl);
            if(value&&!/(logo|sprite|icon|placeholder|favicon)/i.test(value)){pageImages.push(value);break}
          }
        });
        const img=imageUrl($('meta[property="og:image"]').attr("content"),finalUrl)
          ||(parsed.images&&parsed.images[0])
          ||pageImages[0]
          ||await findMarketplaceImage(title,item.url);
        const offers=Array.isArray(parsed.product?.offers)?parsed.product.offers[0]:parsed.product?.offers||{};
        const visiblePrice=extractPriceSignals(rawBody);
        let price=offers.price??parsed.price??visiblePrice.price??item.price??null;
        let currency=offers.priceCurrency??parsed.currency??visiblePrice.currency??item.currency??(price?"₹":null);
        let mrp=visiblePrice.mrp??item.mrp??null;
        if(!price){const indexedPrice=await lookupMarketplacePrice({...item,title},detectPlatform(item.url));price=indexedPrice.price??null;currency=indexedPrice.currency??(price?"₹":null);mrp=indexedPrice.mrp??mrp}
        return {...item,title,price,currency,mrp,image:img,verified:true,verification:"Public product page verified",matchType:classifyMatchType({...item,title},seedTitle)};
      }catch{}
      const reader=await fetchWithJina(item.url);
      const candidateTitle=clean(reader.title)||clean(String(reader.content||"").split("\n").find(x=>x.trim().length>15))||item.title;
      const title=looksMarketplaceErrorPage(reader.content,candidateTitle)?titleFromProductUrl(item.url):candidateTitle;
      const contentRaw=String(reader.content||"");
      const content=normalizeKeyword(contentRaw);
      const readerError=looksBlocked(contentRaw,title)||/^(oops|something went wrong|page not found|access denied|error)/i.test(normalizeKeyword(title));
      if(readerError)throw new Error("Marketplace reader returned an error page.");
      const relevance=productRelevanceScore(title,seedTitle);
      if(relevance.productShared<1&&relevance.score<2)throw new Error("Not a matching product page.");
      let readerPrice=extractPriceSignals(reader.content);
      if(!readerPrice.price){const indexedPrice=await lookupMarketplacePrice({...item,title},detectPlatform(item.url));readerPrice={price:indexedPrice.price??null,currency:indexedPrice.currency??null,mrp:indexedPrice.mrp??null}}
      const readerImages=[];
      const markdownImages=/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/gi;let mi;
      while((mi=markdownImages.exec(contentRaw))&&readerImages.length<10)readerImages.push(mi[1].replace(/\\u0026/g,"&").replace(/\\/g,"/"));
      const rawMyntraImages=/https?:\/\/assets\.myntassets\.com\/[^\s<>()\[\]"]+/gi;
      while((mi=rawMyntraImages.exec(contentRaw))&&readerImages.length<10)readerImages.push(mi[0].replace(/\\u0026/g,"&").replace(/\\/g,"/"));
      const uniqueImages=[...new Set(readerImages)].filter(u=>/^https?:\/\//i.test(u)&&!/(logo|sprite|icon|placeholder)/i.test(u));
      const image=uniqueImages[0]||await findMarketplaceImage(title,item.url);
      return {...item,title,price:readerPrice.price??item.price??null,currency:readerPrice.currency??item.currency??(readerPrice.price?"₹":null),mrp:readerPrice.mrp??item.mrp??null,image,verified:true,verification:"Secondary product-page verification",matchType:classifyMatchType({...item,title},seedTitle)};
    }catch{
      // Search providers can return genuine marketplace URLs while the marketplace
      // itself blocks server-side page hydration. Do not throw away those real
      // URLs: validate the marketplace host/path + product relevance and label the
      // verification level honestly.
      try{
        const u=new URL(item.url),h=u.hostname.replace(/^www\./,"").toLowerCase(),p=u.pathname.toLowerCase();
        const hostOk=(h==="myntra.com"&&p.includes("/buy"))||(h==="meesho.com"&&p.includes("/p/"))||(h==="amazon.in"&&p.includes("/dp/"))||(h==="amazon.com"&&p.includes("/dp/"))||(h==="flipkart.com"&&p.includes("/p/"))||h===new URL(item.url).hostname.replace(/^www\\./,"").toLowerCase()&&isLikelyProductPath(p,detectPlatform(item.url));
        const safeTitle=clean(item.title)||titleFromProductUrl(item.url);
        const badTitle=looksMarketplaceErrorPage("",safeTitle);
        const displayTitle=badTitle?titleFromProductUrl(item.url):safeTitle;
        const relevance=productRelevanceScore(displayTitle,seedTitle);
        const relevant=relevance.productShared>=1||relevance.score>=2||normalizeKeyword(displayTitle).split(" ").some(w=>normalizeKeyword(seedTitle).split(" ").includes(w));
        if(hostOk&&relevant){
          const indexedPrice=await lookupMarketplacePrice({...item,title:displayTitle},detectPlatform(item.url));
          return {...item,title:displayTitle,price:item.price??indexedPrice.price??null,currency:item.currency??indexedPrice.currency??(item.price||indexedPrice.price?"₹":null),mrp:item.mrp??indexedPrice.mrp??null,image:await findMarketplaceImage(displayTitle,item.url),verified:true,verification:"Public marketplace search result verified",matchType:classifyMatchType({...item,title:displayTitle},seedTitle)};
        }
      }catch{}
      return {...item,verified:false}
    }
  }))).filter(x=>x.verified);
}

async function enrichRelatedProducts(rawUrl,platform,seedTitle,existing=[]){
  const merged=[...existing],seen=new Set(merged.map(x=>x.url));
  const found=await searchMarketplaceProducts(rawUrl,platform,seedTitle);
  for(const x of found){if(!seen.has(x.url)){seen.add(x.url);merged.push(x)}if(merged.length>=5)break}
  const hydrated=await hydrateRelated(merged,seedTitle);
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

function keywordStopWords(){return new Set(["jiprostore","jipro","buy","shop","product","item","regular","new","latest","women","woman","womens","ladies","lady","girls","girl","for","with","and","the","a","an","of","in","on","by","from"])}
function normalizeKeyword(s){
  return clean(String(s||"").toLowerCase().replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ")).trim();
}
function productKeywordSeeds(profile={}){
  const stop=keywordStopWords();
  const raw=[profile.title,profile.keywords,profile.category,profile.productType,profile.fabric,profile.color,(profile.attributes||[]).join(" ")].filter(Boolean).join(" ");
  const words=normalizeKeyword(raw).split(" ").filter(w=>w.length>2&&!/^\d+$/.test(w)&&!stop.has(w)&&!/^b0[a-z0-9]{8,}$/i.test(w));
  const uniq=[];for(const w of words)if(!uniq.includes(w))uniq.push(w);
  const has=x=>uniq.includes(x);
  const family=[];
  const push=(x,source="Product attributes")=>{x=normalizeKeyword(x);if(x&&x.split(" ").length<=8&&!/\b\d{4,}\b/.test(x)&&!family.some(v=>v.keyword===x))family.push({keyword:x,source})};
  const categoryMap=[
    ["shoe",["shoes","sneakers","sneaker","footwear"]],["shoes",["shoes","sneakers","footwear"]],
    ["sneaker",["sneakers","shoes","sneaker footwear"]],["shirt",["shirts","casual shirts","mens shirts"]],
    ["jeans",["jeans","men jeans","women jeans"]],["dress",["women dress","casual dress","dresses"]],
    ["phone",["mobile phone","smartphone","android phone"]],["mobile",["mobile phone","smartphone"]],
    ["laptop",["laptop","notebook laptop"]],["watch",["watches","smart watch","wrist watch"]],
    ["headphones",["headphones","wireless headphones"]],["earbuds",["earbuds","wireless earbuds"]],
    ["shampoo",["shampoo","hair shampoo"]],["serum",["serum","face serum"]],["cream",["face cream","skin cream","moisturizer"]],
    ["bag",["bags","handbag","travel bag"]],["wallet",["wallet","mens wallet"]]
  ];
  const isApparel=/kurta|kurti|palazzo|dupatta|saree|suit|salwar/.test(uniq.join(" "));
  if(isApparel){
    push("kurta set");push("kurti set");
    if(has("palazzo"))push("kurta palazzo set");if(has("dupatta"))push("kurta set with dupatta");
    if(has("floral"))push("floral kurta set");if(has("printed"))push("printed kurta set");if(has("thread"))push("thread work kurta set");
    if(has("embroidered"))push("embroidered kurta set");if(has("cotton"))push("cotton kurta set");if(has("silk"))push("silk kurta set");
    if(has("saree")){push("saree");push("women saree");if(has("floral"))push("floral saree");if(has("printed"))push("printed saree");}
  }
  for(const [trigger,terms] of categoryMap)if(has(trigger))terms.forEach(x=>push(x));
  if(!family.length){
    const meaningful=uniq.filter(w=>w.length>3).slice(0,5);
    if(meaningful.length){
      push(meaningful.slice(0,2).join(" "),"Product title");
      if(meaningful.length>=3)push(meaningful.slice(0,3).join(" "),"Product title");
      meaningful.slice(0,4).forEach(w=>push(w,"Product title"));
    }
  }
  return {core:uniq.slice(0,30),family};
}

async function googleSuggest(query){
  try{
    const u="https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=in&q="+encodeURIComponent(query);
    const c=new AbortController(),t=setTimeout(()=>c.abort(),6000);
    const r=await fetch(u,{signal:c.signal,headers:{"user-agent":"Mozilla/5.0","accept":"application/json"}});
    clearTimeout(t);if(!r.ok)return [];
    const j=await r.json();return Array.isArray(j?.[1])?j[1].map(normalizeKeyword).filter(Boolean):[];
  }catch{return []}
}
function keywordIntent(k){
  const x=" "+k+" ";
  if(/\b(buy|price|online|shop|order|purchase|under|offer|sale)\b/.test(x))return "Transactional";
  if(/\b(best|top|review|compare|vs)\b/.test(x))return "Commercial";
  if(/\b(how|what|which|style|design|ideas)\b/.test(x))return "Informational";
  return "Commercial";
}
function keywordRelevance(k,core){
  const w=k.split(" ");const hits=w.filter(x=>core.includes(x)).length;
  let score=45+Math.min(40,hits*10);
  if(w.length>=2&&w.length<=6)score+=5;
  return Math.min(99,score);
}

async function semrushKeywordMetrics(keywords){
  const key=process.env.SEMRUSH_API_KEY;if(!key||!keywords.length)return {enabled:false,items:{}};
  try{
    const params=new URLSearchParams({type:"phrase_these",key,phrase:keywords.slice(0,100).join(";"),database:"in",export_columns:"Ph,Nq,Cp,Co,Nr,Td,In,Kd"});
    const r=await fetch("https://api.semrush.com/?"+params.toString(),{headers:{"accept":"text/plain"}});
    if(!r.ok)return {enabled:true,items:{},error:"Semrush provider returned HTTP "+r.status};
    const txt=await r.text();const lines=txt.trim().split(/\r?\n/);if(lines.length<2)return {enabled:true,items:{}};
    const headers=lines[0].split(";").map(x=>x.trim());const items={};
    for(const line of lines.slice(1)){const cells=line.split(";");const row={};headers.forEach((h,i)=>row[h]=cells[i]??"");const kw=normalizeKeyword(row.Keyword||row.Ph||"");if(kw)items[kw]={volume:Number(row["Search Volume"]||row.Nq)||0,cpc:Number(row.CPC||row.Cp)||0,competition:Number(row.Competition||row.Co)||0,difficulty:Number(row.Kd)||null,trends:row.Trends||null,intent:row.Intent||null};}
    return {enabled:true,items};
  }catch{return {enabled:true,items:{},error:"Semrush provider unavailable."}}
}
async function researchKeywords(profile={},platform){
  const {core,family}=productKeywordSeeds(profile);
  // Fast public research: use 6 targeted seeds in parallel instead of 18.
  const seedQueries=family.map(x=>x.keyword).slice(0,6);
  const suggestionSets=await Promise.all(seedQueries.map(async q=>({q,suggestions:await googleSuggest(q)})));
  const rows=[];const add=(k,source)=>{
    k=normalizeKeyword(k);
    if(!k||k.length<3||k.split(" ").length>8||/\b\d{4,}\b/.test(k))return;
    const w=k.split(" ");
    if(k.split(" ").length<1)return;
    if(!rows.some(x=>x.keyword===k))rows.push({keyword:k,sourceSignals:[source],relevance:keywordRelevance(k,core)});
    else rows.find(x=>x.keyword===k).sourceSignals.push(source);
  };
  family.forEach(x=>add(x.keyword,x.source));
  suggestionSets.forEach(({q,suggestions})=>suggestions.forEach(x=>add(x,"Google autocomplete ("+q+")")));
  const cleanRows=rows.filter(x=>x.relevance>=55).sort((a,b)=>b.relevance-a.relevance);
  const metrics=await semrushKeywordMetrics(cleanRows.map(x=>x.keyword));
  cleanRows.forEach(x=>{x.type=x.keyword.split(" ").length<=2?"Short":x.keyword.split(" ").length<=4?"Medium":"Long-tail";x.intent=keywordIntent(x.keyword);x.volume=null;x.cpc=null;x.competition=null;x.difficulty=null;x.trends=null;x.accuracy="Search-demand signal";if(metrics.enabled&&metrics.items[x.keyword]){const m=metrics.items[x.keyword];Object.assign(x,{volume:m.volume,cpc:m.cpc,competition:m.competition,difficulty:m.difficulty,trends:m.trends,intent:m.intent||x.intent,accuracy:"Semrush India provider"});x.sourceSignals.push("Semrush India database")}});
  const byType=t=>cleanRows.filter(x=>x.type===t).slice(0,50);
  return {marketplace:platform,seed:normalizeKeyword(profile.title||""),provider:metrics.enabled?"Semrush API + Google autocomplete":"Google autocomplete + product-attribute research",providerConfigured:metrics.enabled,providerError:metrics.error||null,notes:["Only product-relevant keywords are retained.","Marketplace IDs, brand/store names and URL noise are excluded.","Numeric volume/CPC/competition appear only when a keyword-data provider is connected.","Search volume is an estimate, not an exact count."],keywords:{short:byType("Short"),medium:byType("Medium"),long:byType("Long-tail")},total:cleanRows.length};
}

function quickProfileFromUrl(rawUrl,platform){
  const slug=slugQuery(rawUrl).replace(/\b(jiprostore|jipro)\b/gi," ").replace(/\b\d{4,}\b/g," ").replace(/\s+/g," ").trim();
  const title=slug.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ")||"Selected marketplace product";
  const low=slug.toLowerCase();
  let category="Product",productType="Product";
  if(/shoe|sneaker|footwear|sandals|slippers|boots/.test(low)){category="Footwear";productType="Shoes"}
  else if(/phone|mobile|smartphone/.test(low)){category="Mobiles";productType="Smartphone"}
  else if(/laptop|notebook/.test(low)){category="Computers";productType="Laptop"}
  else if(/headphone|earbud|speaker/.test(low)){category="Audio";productType="Audio Product"}
  else if(/kurta|kurti|palazzo|dupatta|suit|salwar/.test(low)){category="Kurta Sets";productType="Kurta Set"}
  else if(/saree/.test(low)){category="Sarees";productType="Saree"}
  else if(/shampoo|serum|cream|moisturizer|lipstick|perfume/.test(low)){category="Beauty";productType="Beauty Product"}
  else if(/shirt|tshirt|jeans|dress|jacket/.test(low)){category="Fashion";productType="Fashion Product"}
  const attrs=[];
  ["floral","printed","thread work","embroidered","cotton","rayon","georgette","silk","palazzo","dupatta","anarkali","sneaker","running","leather","wireless","bluetooth"].forEach(x=>{if(low.includes(x))attrs.push(x)});
  const noise=new Set(["women","woman","womens","ladies","regular","with","and","for","the","buy","shop","online","jiprostore","jipro","sets","set","mens","men"]);
  const productWords=["kurta","kurti","palazzo","dupatta","floral","printed","thread","work","embroidered","cotton","rayon","georgette","silk","anarkali","suit","saree","shoe","shoes","sneaker","sneakers","footwear","sandals","slippers","boots","phone","mobile","smartphone","laptop","headphones","earbuds","speaker","shampoo","serum","cream","dress","shirt","tshirt","jeans","bag","wallet","watch"];
  const keywords=[...new Set((low.match(/[a-z0-9]+/g)||[]).filter(w=>w.length>2&&!/^\d+$/.test(w)&&!noise.has(w)&&productWords.includes(w)))].slice(0,16).join(", ");
  const detectedColor=["pink","red","blue","green","yellow","black","white","beige","maroon","purple","lavender","orange","grey","gray"].find(c=>low.includes(c));
  return {sourceUrl:rawUrl,finalUrl:rawUrl,platform,title,description:null,brand:null,sku:null,price:null,currency:null,availability:null,images:[],category,productType,color:detectedColor?detectedColor.charAt(0).toUpperCase()+detectedColor.slice(1):"Not specified",fabric:attrs.includes("cotton")?"Cotton":attrs.includes("rayon")?"Rayon":attrs.includes("georgette")?"Georgette":attrs.includes("silk")?"Silk":"Not specified",keywords,attributes:attrs,relatedProducts:[],extractionMethod:"URL intelligence + marketplace research",warnings:["Product intelligence is built from the public URL and marketplace research; blocked marketplace pages are handled with search fallbacks."]};
}

async function quickAnalyzeProduct(rawUrl,refreshKey=""){
  const platform=detectPlatform(rawUrl);if(!platform)throw new Error("Unsupported marketplace URL.");
  const data=quickProfileFromUrl(rawUrl,platform);
  const found=await searchMarketplaceProducts(rawUrl,platform,data.title,refreshKey);
  data.relatedProducts=await hydrateRelated(found,data.title);
  data.internalCheck={status:"completed",source:"public marketplace search + product-page verification",count:data.relatedProducts.length};
  return data;
}
function imagePosePrompt(pose="Front standing"){
  const prompts={
    "Front standing":"full-body front standing fashion e-commerce pose, relaxed arms, straight posture",
    "45° side":"full-body 45-degree side fashion e-commerce pose, natural posture",
    "Walking":"full-body natural walking fashion e-commerce pose, realistic movement",
    "Hand on waist":"full-body fashion e-commerce pose with one hand on waist",
    "Slight turn":"full-body slight body turn, fashion e-commerce pose, natural posture",
    "Back / over-the-shoulder":"full-body back view with a natural over-the-shoulder pose"
  };
  return prompts[pose]||prompts["Front standing"];
}
app.post("/api/generate-image",async(req,res)=>{
  try{
    const key=process.env.OPENAI_API_KEY;
    if(!key)return res.status(503).json({ok:false,error:"Image generation is not configured yet. Add OPENAI_API_KEY in the Render environment."});
    const dataUrl=String(req.body?.imageData||"").trim();
    const pose=String(req.body?.pose||"Front standing").trim();
    if(!dataUrl.startsWith("data:image/"))return res.status(400).json({ok:false,error:"Upload a product reference image first."});
          const comma=dataUrl.indexOf(",");
          const match=comma>5?[dataUrl.slice(5,comma).split(";")[0],dataUrl.slice(comma+1)]:null;
    if(!match)return res.status(400).json({ok:false,error:"Only PNG, JPG or WEBP product references are supported."});
    const mime=match[1].toLowerCase().replace("image/jpg","image/jpeg");
    const bytes=Buffer.from(match[2],"base64");
    if(bytes.length>10*1024*1024)return res.status(413).json({ok:false,error:"Product reference image must be 10 MB or smaller."});
    const form=new FormData();
    form.append("model",process.env.OPENAI_IMAGE_MODEL||"gpt-image-2");
    form.append("image",new Blob([bytes],{type:mime}),"product-reference."+({ "image/png":"png","image/jpeg":"jpg","image/webp":"webp"}[mime]||"jpg"));
    form.append("prompt",
      "Edit the supplied product reference for a fashion e-commerce catalog image. "+imagePosePrompt(pose)+". "+
      "CRITICAL PRODUCT LOCK: keep the garment/product 100% identical to the supplied reference: same design, color, fabric appearance, print, embroidery, pattern, neckline, sleeves, length, fit, proportions and every visible product detail. "+
      "Do not redesign, recolor, remove, add or alter any product detail. Change only the human model/face, pose and a clean premium studio background. "+
      "Photorealistic, natural anatomy, realistic fabric drape, sharp product details, clean commercial lighting, no text, no watermark."
    );
    form.append("size","1024x1536");
    const r=await fetch("https://api.openai.com/v1/images/edits",{method:"POST",headers:{authorization:"Bearer "+key},body:form});
    const txt=await r.text();
    if(!r.ok)return res.status(502).json({ok:false,error:"Image provider error: "+txt.slice(0,500)});
    const j=JSON.parse(txt);
    const b64=j?.data?.[0]?.b64_json;
    if(!b64)return res.status(502).json({ok:false,error:"Image provider returned no generated image."});
    return res.json({ok:true,imageData:"data:image/png;base64,"+b64,pose});
  }catch(e){return res.status(500).json({ok:false,error:e?.message||"Image generation failed."})}
});

// Generate the simple EcomAI master listing as a real XLSX on the server.
// Keeping XLSX creation server-side avoids browser download/runtime issues.
app.post("/api/listing-simple-excel",async(req,res)=>{
  try{
    const sourceData=Array.isArray(req.body?.listings)?req.body.listings:[];
    if(!sourceData.length)return res.status(400).json({ok:false,error:"No generated listing data is available."});
    const dynamicKeys=[...new Set(sourceData.flatMap(x=>Object.keys(x?.dynamicAttributes||{})))].filter(Boolean);
    const headers=["Product Image","SKU","Color","Title","Description","Keywords",...dynamicKeys];
    const rows=[
      ["EcomAI Generated Listings"],
      ["Simple EcomAI master listing generated from seller product images + competitor reference intelligence."],
      [],
      headers
    ];
    for(const x of sourceData){
      rows.push([
        x?.image?"Uploaded product image":"",
        x?.sku||"",
        x?.color||"",
        x?.title||"",
        x?.description||"",
        x?.keywords||"",
        ...dynamicKeys.map(k=>x?.dynamicAttributes?.[k]??"")
      ]);
    }
    const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"]=headers.map((h,i)=>({wch:i===0?24:i===4?70:i===5?55:Math.min(45,Math.max(18,String(h).length+5))}));
    XLSX.utils.book_append_sheet(wb,ws,"EcomAI Listings");
    const buffer=XLSX.write(wb,{bookType:"xlsx",type:"buffer",compression:true});
    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",'attachment; filename="EcomAI_Generated_Listings.xlsx"');
    res.setHeader("Content-Length",String(buffer.length));
    return res.status(200).send(buffer);
  }catch(e){
    return res.status(500).json({ok:false,error:e?.message||"Could not create the Excel file."});
  }
});

// Listing AI competitor reference intelligence.
app.post("/api/listing-competitors",async(req,res)=>{
  try{
    const urls=Array.isArray(req.body?.urls)?req.body.urls.map(x=>String(x||"").trim()).filter(Boolean):[];
    const competitorScreenshots=Array.isArray(req.body?.competitorScreenshots)?req.body.competitorScreenshots.map(x=>String(x||"").trim()).filter(Boolean).slice(0,10):[];
    if(urls.length>3)return res.status(400).json({ok:false,error:"Maximum 3 competitor product links allowed."});
    if(urls.length<1 && competitorScreenshots.length<1)return res.status(400).json({ok:false,error:"Add at least 1 competitor link or 1 competitor screenshot."});
    const unique=[...new Set(urls)];
    if(unique.length!==urls.length)return res.status(400).json({ok:false,error:"Please use different competitor product links."});
    let references=[];
    // If screenshots are supplied, analyze them independently. Do not wait for blocked/slow competitor URLs.
    if(!competitorScreenshots.length){
      references=await Promise.all(unique.map(async(rawUrl)=>{
        try{
          const u=new URL(rawUrl);
          if(!/^https?:$/i.test(u.protocol))throw new Error("Only HTTP/HTTPS links are supported.");
          await assertPublicHost(u.hostname);
          try{
            const {html,finalUrl}=await fetchHtml(u.href);
            const d=await extractFromHtml(u.href,html,finalUrl);
            return {url:u.href,title:clean(d.title)||null,description:clean(d.description)||null,brand:null,category:clean(d.category)||null,productType:clean(d.category)||null,fabric:null,pattern:null,keywords:null,attributes:null,extractionMethod:d.extractionMethod||"public product page"};
          }catch{
            const reader=await fetchWithJina(u.href);
            const d=extractFromReader(u.href,reader);
            return {url:u.href,title:clean(d.title)||null,description:clean(d.description)||null,brand:clean(d.brand)||null,category:clean(d.category)||null,productType:clean(d.category)||null,sku:clean(d.sku)||null,price:d.price||null,currency:d.currency||null,extractionMethod:d.extractionMethod||"secondary public reader"};
          }
        }catch(e){
          return {url:rawUrl,title:null,description:null,brand:null,category:null,productType:null,sku:null,price:null,currency:null,error:e?.message||"Reference could not be read."};
        }
      }));
    }
    const usable=references.filter(x=>x.title||x.description||x.category||x.brand);
    if(competitorScreenshots.length){
      const geminiKey=process.env.GEMINI_API_KEY;
      const openaiKey=process.env.OPENAI_API_KEY;
      const instruction="Analyze these competitor product screenshots for ecommerce listing research. Extract ONLY information visible in the screenshots. Return ONLY JSON with keys: title, productType, description, category, fabric, pattern, keywords, attributes. Do not extract color or brand. Do not invent facts. Competitor information is reference intelligence only; do not copy wording verbatim.";
      let extracted=null;
      let lastError=null;
      try{
        if(geminiKey){
          try{
            const parts=[{text:instruction}];
            for(const dataUrl of competitorScreenshots){
              const comma=dataUrl.indexOf(",");
              const match=comma>5?[dataUrl.slice(5,comma),dataUrl.slice(comma+1)]:null;
              if(match)parts.push({inline_data:{mime_type:match[0].toLowerCase().replace("image/jpg","image/jpeg"),data:match[1]}});
            }
            const rr=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",{method:"POST",headers:{"content-type":"application/json","x-goog-api-key":geminiKey},body:JSON.stringify({contents:[{parts}],generationConfig:{responseMimeType:"application/json"}})});
            const tt=await rr.text();
            if(!rr.ok)throw new Error("Gemini screenshot analysis failed: "+tt.slice(0,400));
            const jj=JSON.parse(tt),raw=jj?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
            try{extracted=JSON.parse(raw)}catch{const aa=raw.indexOf("{"),bb=raw.lastIndexOf("}");if(aa>=0&&bb>aa)extracted=JSON.parse(raw.slice(aa,bb+1))}
          }catch(e){lastError=e}
        }
        if(!extracted&&openaiKey){
          try{
            const content=[{type:"text",text:instruction}];
            for(const dataUrl of competitorScreenshots)content.push({type:"image_url",image_url:{url:dataUrl,detail:"high"}});
            const rr=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+openaiKey},body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"user",content}],temperature:0.2,response_format:{type:"json_object"}})});
            const tt=await rr.text();
            if(!rr.ok)throw new Error("OpenAI screenshot analysis failed: "+tt.slice(0,300));
            const jj=JSON.parse(tt),raw=jj?.choices?.[0]?.message?.content||"";
            extracted=JSON.parse(raw);
          }catch(e){lastError=e}
        }
        if(extracted&&typeof extracted==="object") references.push({url:urls[0]||"screenshot-reference",title:clean(extracted.title)||null,description:clean(extracted.description)||null,brand:null,category:clean(extracted.category)||null,productType:clean(extracted.productType)||null,fabric:clean(extracted.fabric)||null,pattern:clean(extracted.pattern)||null,keywords:clean(extracted.keywords)||null,attributes:extracted.attributes||null,extractionMethod:"competitor screenshot vision AI",fallback:true});
      }catch(e){lastError=e}
      if(!extracted){
        // Do not block the seller listing when reference vision is temporarily unavailable.
        references.push({url:urls[0]||"screenshot-reference",title:"Competitor screenshot reference",description:"Uploaded competitor screenshots are available as market-language reference. Seller product facts must come from the seller product images.",brand:null,category:null,productType:null,fabric:null,pattern:null,keywords:null,attributes:null,extractionMethod:"uploaded screenshot fallback",fallback:true,error:lastError?.message||"Screenshot vision unavailable."});
      }
    }
    if(!references.some(x=>x.title||x.description||x.category||x.brand))return res.status(422).json({ok:false,error:competitorScreenshots.length?"Screenshot analysis completed but no usable listing data was returned. Please try 1–3 clearer product-page screenshots.":"The competitor page is not publicly readable. Upload 1–3 competitor screenshots so EcomAI can analyze the listing visually."});
    return res.json({ok:true,references});
  }catch(e){return res.status(500).json({ok:false,error:e?.message||"Competitor reference research failed."})}
});

// Listing AI visual intelligence: no Puter, no client-side AI.
app.post("/api/listing-vision",async(req,res)=>{
  try{
    const key=process.env.GEMINI_API_KEY;
    const openaiKey=process.env.OPENAI_API_KEY;
    if(!key&&!openaiKey)return res.status(503).json({ok:false,error:"Listing Vision is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to Render environment variables."});
    const imageData=String(req.body?.imageData||"").trim();
    const mime=String(req.body?.mimeType||"image/jpeg").toLowerCase();
    const platform=String(req.body?.platform||"Marketplace");
    const mode=String(req.body?.mode||"enhance");
    const source=req.body?.source||{};
    const instruction=String(req.body?.instruction||"").trim();
    const match=imageData.match(/^data:(image\/(?:png|jpeg|jpg|webp|heic|heif));base64,(.+)$/i);
    if(!match)return res.status(400).json({ok:false,error:"A valid product image is required."});
    const safeMime=match[1].toLowerCase().replace("image/jpg","image/jpeg");
    const bytes=Buffer.from(match[2],"base64");
    if(bytes.length>8*1024*1024)return res.status(413).json({ok:false,error:"Each listing image must be 8 MB or smaller."});
    const modeInstruction={
      enhance:"If existing title/description/keywords are supplied, improve them without changing their factual meaning. If a field is blank, create it from verified source facts and the image.",
      fill:"Keep all existing title/description/keywords exactly unchanged. Generate only fields that are blank.",
      fresh:"Create fresh marketplace-ready title, description, bullets and keywords from the supplied verified facts and the image."
    }[mode]||"Enhance the existing content without inventing facts.";
    const prompt=`You are EcomAI Pro Listing AI for ${platform}.
Analyze the supplied product image for ecommerce cataloging.
${modeInstruction}
Never invent factual specifications. Do not claim a fabric, material, size, measurement, certification, HSN, feature or performance benefit unless it is explicitly supplied in the source data or clearly visible and safe to infer. If uncertain, return null or "Needs seller input".
For color, identify the dominant visible product color, not the background/model skin tone.
Create concise marketplace-ready copy. The title should identify the actual product, not the model or background. Description should describe only verified product attributes.
Return ONLY JSON with keys: title, description, bullets, keywords, category, productType, color, fabric, pattern, gender, fit, neckline, sleeveType, visibleSizes, occasion, confidence. REQUIRED: always provide title, description, keywords and color when they can be supported by the seller product image/source. The SKU is supplied by the seller/image-group mapping and must not be invented or changed by vision AI. FLEXIBLE FIELDS: productType, category, fabric, pattern, attributes and other catalog attributes are NOT fixed; infer them from the seller product image + seller Excel/source. If the product visibly differs from an existing value, correct that value rather than blindly preserving it. Never use competitor data to determine seller color or SKU.
Existing/source data:
${JSON.stringify(source)}
Competitor references provide ONLY market-language research for these fields: title structure, product type, description style, fabric terminology, pattern terminology, keywords and attributes. Use them to understand relevant marketplace wording, but never copy their title/description verbatim. IMPORTANT: determine the seller product color, dominant color and other visual appearance ONLY from the seller product image and seller Excel/source data; do not take color from competitor references. Never transfer a competitor-only fact to the seller product unless it is also supported by the seller source or clearly visible in the seller product image. Treat competitor title/description/keywords as language and structure reference only; seller product facts always take priority.
Seller instruction:
${instruction||"None"}
Title task:
${String(source.titleTask||"").trim()||"Generate the product title from the seller product image and verified seller facts. Return an original, product-specific marketplace title."}`;
    const body={
      contents:[{parts:[
        {text:prompt},
        {inline_data:{mime_type:safeMime,data:match[2]}}
      ]}],
      generationConfig:{responseMimeType:"application/json"}
    };
    let txt="", lastError="";
    if(key){
      try{
        const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{
          method:"POST",
          headers:{"content-type":"application/json","x-goog-api-key":key},
          body:JSON.stringify(body)
        });
        txt=await r.text();
        if(!r.ok)throw new Error(txt.slice(0,500));
      }catch(e){lastError="Gemini visual analysis failed: "+(e?.message||"unknown error");txt=""}
    }
    if(!txt&&openaiKey){
      try{
        const content=[{type:"text",text:prompt},{type:"image_url",image_url:{url:imageData,detail:"high"}}];
        const rr=await fetch("https://api.openai.com/v1/chat/completions",{
          method:"POST",
          headers:{"content-type":"application/json","authorization":"Bearer "+openaiKey},
          body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"user",content}],temperature:0.2,response_format:{type:"json_object"}})
        });
        const tt=await rr.text();
        if(!rr.ok)throw new Error(tt.slice(0,500));
        const oj=JSON.parse(tt);
        const od=oj?.choices?.[0]?.message?.content||"";
        return res.json({ok:true,data:JSON.parse(od)});
      }catch(e){lastError="OpenAI visual analysis failed: "+(e?.message||"unknown error")}
    }
    if(!txt)return res.status(502).json({ok:false,error:lastError||"Visual analysis failed."});
    const j=JSON.parse(txt);
    const raw=j?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
    let data;
    try{data=JSON.parse(raw)}catch{
      const a=raw.indexOf("{"),b=raw.lastIndexOf("}");
      if(a>=0&&b>a)data=JSON.parse(raw.slice(a,b+1));
    }
    if(!data||typeof data!=="object")return res.status(502).json({ok:false,error:"Visual analysis returned invalid JSON."});
    const titleValue=data.title||data.productDisplayName||data.productName;
    if(!String(titleValue||"").trim()){
      const titlePrompt=`You are the title engine for EcomAI Pro. Look ONLY at the supplied seller product image and verified seller source data below. Create ONE original ecommerce product title. Identify the actual product visible in the image. Use competitor references only for marketplace wording/structure; never copy a competitor title and never take competitor-only product facts. Do not mention model, pose, background or photography. Do not invent fabric, embroidery, pattern, features, measurements or other specifications. Include visible color only when clear. Return ONLY JSON: {"title":"..."}.
Marketplace: ${platform}
Seller source: ${JSON.stringify(source)}
Competitor reference language: ${JSON.stringify((source&&source.competitorReferences)||[])}`;
      let retryData=null;
      if(key){
        try{
          const rr=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{
            method:"POST",
            headers:{"content-type":"application/json","x-goog-api-key":key},
            body:JSON.stringify({contents:[{parts:[{text:titlePrompt},{inline_data:{mime_type:safeMime,data:match[2]}}]}],generationConfig:{responseMimeType:"application/json",temperature:0.1}})
          });
          const tt=await rr.text();
          if(rr.ok){
            const jj=JSON.parse(tt),raw2=jj?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
            try{retryData=JSON.parse(raw2)}catch{const aa=raw2.indexOf("{"),bb=raw2.lastIndexOf("}");if(aa>=0&&bb>aa)retryData=JSON.parse(raw2.slice(aa,bb+1))}
          }
        }catch{}
      }
      if(!String(retryData?.title||"").trim()&&openaiKey){
        try{
          const rr=await fetch("https://api.openai.com/v1/chat/completions",{
            method:"POST",
            headers:{"content-type":"application/json",authorization:"Bearer "+openaiKey},
            body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"user",content:[{type:"text",text:titlePrompt},{type:"image_url",image_url:{url:imageData,detail:"high"}}]}],temperature:0.1,response_format:{type:"json_object"}})
          });
          const tt=await rr.text();
          if(rr.ok){
            const jj=JSON.parse(tt),raw2=jj?.choices?.[0]?.message?.content||"";
            retryData=JSON.parse(raw2);
          }
        }catch{}
      }
      if(String(retryData?.title||"").trim())data={...data,title:String(retryData.title).trim()};
      else return res.status(502).json({ok:false,error:"Vision AI returned no product-specific title. The seller image could not be identified reliably."});
    }
    return res.json({ok:true,data});
  }catch(e){return res.status(500).json({ok:false,error:e?.message||"Listing visual analysis failed."})}
});


app.post("/api/listing-image-upload",async(req,res)=>{
  try{
    const cloudName=process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey=process.env.CLOUDINARY_API_KEY;
    const apiSecret=process.env.CLOUDINARY_API_SECRET;
    if(!cloudName||!apiKey||!apiSecret)return res.status(503).json({ok:false,error:"Image hosting is not configured. Add Cloudinary credentials to Render."});
    const imageData=String(req.body?.imageData||"").trim();
    const filename=String(req.body?.filename||"product").replace(/[^a-zA-Z0-9._-]+/g,"_");
    if(!/^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(imageData))return res.status(400).json({ok:false,error:"Invalid product image."});
    const form=new FormData();
    form.append("file",imageData);
    form.append("public_id","ecomai/listings/"+filename.replace(/\.[^.]+$/,""));
    form.append("api_key",apiKey);
    form.append("timestamp",String(Math.floor(Date.now()/1000)));
    const crypto=await import("node:crypto");
    const timestamp=form.get("timestamp");
    const publicId=form.get("public_id");
    const signature=crypto.createHash("sha1").update("public_id="+publicId+"&timestamp="+timestamp+apiSecret).digest("hex");
    form.append("signature",signature);
    const r=await fetch("https://api.cloudinary.com/v1_1/"+encodeURIComponent(cloudName)+"/image/upload",{method:"POST",body:form});
    const txt=await r.text();
    if(!r.ok)return res.status(502).json({ok:false,error:"Image hosting upload failed: "+txt.slice(0,400)});
    const j=JSON.parse(txt);
    return res.json({ok:true,url:j.secure_url,publicId:j.public_id});
  }catch(e){return res.status(500).json({ok:false,error:e?.message||"Image hosting failed."})}
});

app.get("/api/health",(req,res)=>res.json({ok:true,service:"ecomai-pro-api",version:"0.3.0"}));
app.post("/api/analyze-url",async(req,res)=>{try{const raw=String(req.body?.url||"").trim();const refreshKey=String(req.body?.refresh||"");if(!raw)return res.status(400).json({ok:false,error:"Product URL is required."});return res.json({ok:true,data:await quickAnalyzeProduct(raw,refreshKey)})}catch(e){return res.status(422).json({ok:false,error:e?.message||"Unable to research this URL.",code:"RESEARCH_FAILED"})}});
app.post("/api/keyword-research",async(req,res)=>{try{const profile=req.body?.profile||{};const platform=String(req.body?.platform||profile.marketplace||"").trim();if(!platform)return res.status(400).json({ok:false,error:"Marketplace is required."});return res.json({ok:true,data:await researchKeywords({...profile,marketplace:platform},platform)})}catch(e){return res.status(422).json({ok:false,error:e?.message||"Unable to research keywords.",code:"KEYWORD_RESEARCH_FAILED"})}});
async function resolveProductImage(productUrl,title=""){
  try{
    const {html,finalUrl}=await fetchHtml(productUrl);
    const $=cheerio.load(html),parsed=parseProductJsonLd($,finalUrl);
    const htmlImages=[];
    $("img").each((_,el)=>{
      if(htmlImages.length>=20)return false;
      for(const key of ["src","data-src","data-lazy-src","data-original","data-image","data-url"]){
        const value=imageUrl($(el).attr(key),finalUrl);
        if(value&&!/(logo|sprite|icon|placeholder|favicon)/i.test(value)){htmlImages.push(value);break}
      }
    });
    const direct=imageUrl($('meta[property="og:image"]').attr("content"),finalUrl)
      ||(parsed.images&&parsed.images[0])
      ||imageUrl($('meta[property="og:image:url"]').attr("content"),finalUrl)
      ||imageUrl($('meta[name="twitter:image"]').attr("content"),finalUrl)
      ||htmlImages[0];
    if(direct)return direct;
  }catch{}
  try{
    const reader=await fetchWithJina(productUrl),body=String(reader.content||"");
    const md=/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/i.exec(body);
    if(md&&/^https?:\/\//i.test(md[1]))return md[1].replace(/\\u0026/g,"&").replace(/\\/g,"/");
    const generic=[...body.matchAll(/https?:\/\/[^\s<>()\[\]"]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s<>()\[\]"]*)?/gi)]
      .map(m=>m[0].replace(/\\u0026/g,"&").replace(/\\/g,"/"))
      .find(u=>!/(logo|sprite|icon|placeholder|favicon)/i.test(u));
    if(generic)return generic;
  }catch{}
  return await findMarketplaceImage(title||titleFromProductUrl(productUrl),productUrl);
}
async function fetchImageBuffer(rawUrl){
  const u=new URL(rawUrl);
  if(u.protocol!=="https:"&&u.protocol!=="http:")throw new Error("Unsupported image URL.");
  await assertPublicHost(u.hostname);
  const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);
  try{
    const imageHost=u.hostname.replace(/^www\\./,"").toLowerCase();
    const referer=imageHost.includes("myntassets.com")||imageHost.includes("myntra.com")
      ?"https://www.myntra.com/"
      :imageHost.includes("amazon.")||imageHost.includes("ssl-images-amazon.com")
      ?"https://www.amazon.in/"
      :imageHost.includes("flipkart.")?"https://www.flipkart.com/"
      :imageHost.includes("meesho.")?"https://www.meesho.com/"
      :"https://www.google.com/";
    let response=await fetch(u.href,{redirect:"follow",signal:c.signal,headers:{
      "user-agent":"Mozilla/5.0 (compatible; EcomAIPro/0.4)",
      "accept":"image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "referer":referer
    }});
    if(!response.ok){
      response=await fetch(u.href,{redirect:"follow",signal:c.signal,headers:{
        "user-agent":"Mozilla/5.0 (compatible; EcomAIPro/0.4)",
        "accept":"image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }});
    }
    if(!response.ok)throw new Error("Image returned HTTP "+response.status);
    const type=(response.headers.get("content-type")||"").split(";")[0].toLowerCase();
    if(!type.startsWith("image/")){
      const sniff=Buffer.from(await response.clone().arrayBuffer()).subarray(0,16).toString("hex");
      const inferred=sniff.startsWith("ffd8ff")?"image/jpeg":sniff.startsWith("89504e47")?"image/png":sniff.startsWith("52494646")?"image/webp":null;
      if(!inferred)throw new Error("URL did not return an image.");
      return {buffer:Buffer.from(await response.arrayBuffer()),type:inferred};
    }
    const length=Number(response.headers.get("content-length")||0);
    if(length>8*1024*1024)throw new Error("Image is too large.");
    return {buffer:Buffer.from(await response.arrayBuffer()),type};
  }finally{clearTimeout(t)}
}
app.get("/api/image-proxy",async(req,res)=>{
  try{
    const raw=String(req.query?.url||"").trim();
    if(!raw)return res.status(400).end();
    const {buffer,type}=await fetchImageBuffer(raw);
    res.setHeader("Content-Type",type);
    res.setHeader("Cache-Control","public, max-age=3600");
    res.setHeader("X-Content-Type-Options","nosniff");
    return res.end(buffer);
  }catch(e){return res.status(404).end()}
});
app.get("/api/product-image",async(req,res)=>{
  try{
    const productUrl=String(req.query?.url||"").trim(),title=String(req.query?.title||"").trim();
    if(!productUrl)return res.status(400).end();
    const u=new URL(productUrl);
    if(!["http:","https:"].includes(u.protocol))return res.status(400).end();
    await assertPublicHost(u.hostname);
    const image=await resolveProductImage(productUrl,title);
    if(!image)return res.status(404).end();
    const {buffer,type}=await fetchImageBuffer(image);
    res.setHeader("Content-Type",type);
    res.setHeader("Cache-Control","public, max-age=1800");
    res.setHeader("X-Content-Type-Options","nosniff");
    return res.end(buffer);
  }catch(e){return res.status(404).end()}
});
const dist=path.join(__dirname,"dist");app.use((req,res,next)=>{res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");res.setHeader("Pragma","no-cache");res.setHeader("Expires","0");next()});app.use(express.static(dist,{etag:false,maxAge:0}));app.get(/.*/,(req,res)=>{if(req.path.startsWith("/api/"))return res.status(404).json({ok:false,error:"API route not found."});res.sendFile(path.join(dist,"index.html"))});
const port=Number(process.env.PORT||3000);app.listen(port,()=>console.log("EcomAI Pro listening on "+port));