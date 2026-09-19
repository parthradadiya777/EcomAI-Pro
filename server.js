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

function parseMarketplaceUrlsFromReader(markdown,platform,queries=[]){
  const host=platform==="Myntra"?"myntra.com":platform==="Meesho"?"meesho.com":platform==="Amazon"?"amazon.in":platform==="Flipkart"?"flipkart.com":null;
  if(!host)return [];
  const out=[],seen=new Set();
  const add=(raw,title="",query="")=>{
    try{
      let value=String(raw||"").replace(/&amp;/g,"&").trim();
      if(value.startsWith("<"))return;
      const u=new URL(value);
      const h=u.hostname.replace(/^www\./,"").toLowerCase(),p=u.pathname.toLowerCase();
      if(h!==host)return;
      const valid=(platform==="Myntra"&&/\/buy(?:\/|$)/.test(p))||(platform==="Meesho"&&/\/p\//.test(p))||(platform==="Amazon"&&/\/dp\//.test(p))||(platform==="Flipkart"&&/\/p\//.test(p));
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
        if(!link)return;
        try{
          const u=new URL(link),h=u.hostname.replace(/^www\./,"").toLowerCase(),p=u.pathname.toLowerCase();
          if(h!==host)return;
          const valid=(platform==="Myntra"&&p.includes("/buy"))||(platform==="Meesho"&&p.includes("/p/"))||(platform==="Amazon"&&p.includes("/dp/"))||(platform==="Flipkart"&&p.includes("/p/"));
          if(!valid)return;
          out.push({url:u.href.split("#")[0],title:title||"Marketplace product",searchQuery:q});
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
        const found=parseMarketplaceUrlsFromReader(reader.content,platform,[q]);
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
  const host=(platform==="Myntra"?"myntra.com":platform==="Meesho"?"meesho.com":platform==="Amazon"?"amazon.in":platform==="Flipkart"?"flipkart.com":null);
  if(!host)return [];
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
        const img=imageUrl($('meta[property="og:image"]').attr("content"),finalUrl)||(parsed.images&&parsed.images[0])||await findMarketplaceImage(title,item.url);
        const offers=Array.isArray(parsed.product?.offers)?parsed.product.offers[0]:parsed.product?.offers||{};
        return {...item,title,price:offers.price??parsed.price??null,currency:offers.priceCurrency??parsed.currency??null,image:img,verified:true,verification:"Public product page verified",matchType:classifyMatchType({...item,title},seedTitle)};
      }catch{}
      const reader=await fetchWithJina(item.url);
      const candidateTitle=clean(reader.title)||clean(String(reader.content||"").split("\n").find(x=>x.trim().length>15))||item.title;
      const title=looksMarketplaceErrorPage(reader.content,candidateTitle)?titleFromProductUrl(item.url):candidateTitle;
      const contentRaw=String(reader.content||"");
      const content=normalizeKeyword(contentRaw);
      const readerError=looksBlocked(contentRaw,title)||/^(oops|something went wrong|page not found|access denied|error)/i.test(normalizeKeyword(title));
      if(readerError)throw new Error("Marketplace reader returned an error page.");
      if(!/(kurta|kurti|palazzo|saree|suit|salwar|dupatta)/.test(content+" "+normalizeKeyword(title)))throw new Error("Not a matching product page.");
      const priceMatch=String(reader.content||"").match(/(?:₹|Rs\.?|INR\s?)(\s?[\d,]+(?:\.\d{1,2})?)/i);
      const readerImages=[];
      const markdownImages=/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/gi;let mi;
      while((mi=markdownImages.exec(contentRaw))&&readerImages.length<10)readerImages.push(mi[1].replace(/\\u0026/g,"&").replace(/\\/g,"/"));
      const rawMyntraImages=/https?:\/\/assets\.myntassets\.com\/[^\s<>()\[\]"]+/gi;
      while((mi=rawMyntraImages.exec(contentRaw))&&readerImages.length<10)readerImages.push(mi[0].replace(/\\u0026/g,"&").replace(/\\/g,"/"));
      const uniqueImages=[...new Set(readerImages)].filter(u=>/^https?:\/\//i.test(u)&&!/(logo|sprite|icon|placeholder)/i.test(u));
      const image=uniqueImages[0]||await findMarketplaceImage(title,item.url);
      return {...item,title,price:priceMatch?priceMatch[1].replace(/^\s+/,""):null,currency:priceMatch?"₹":null,image,verified:true,verification:"Secondary product-page verification",matchType:classifyMatchType({...item,title},seedTitle)};
    }catch{
      // Search providers can return genuine marketplace URLs while the marketplace
      // itself blocks server-side page hydration. Do not throw away those real
      // URLs: validate the marketplace host/path + product relevance and label the
      // verification level honestly.
      try{
        const u=new URL(item.url),h=u.hostname.replace(/^www\./,"").toLowerCase(),p=u.pathname.toLowerCase();
        const hostOk=(h==="myntra.com"&&p.includes("/buy"))||(h==="meesho.com"&&p.includes("/p/"))||(h==="amazon.in"&&p.includes("/dp/"))||(h==="amazon.com"&&p.includes("/dp/"))||(h==="flipkart.com"&&p.includes("/p/"));
        const safeTitle=clean(item.title)||titleFromProductUrl(item.url);
        const badTitle=looksMarketplaceErrorPage("",safeTitle);
        const displayTitle=badTitle?titleFromProductUrl(item.url):safeTitle;
        const relevant=/(kurta|kurti|palazzo|saree|suit|salwar|dupatta)/.test(normalizeKeyword(displayTitle)+" "+normalizeKeyword(seedTitle));
        if(hostOk&&relevant){
          return {...item,title:displayTitle,price:null,currency:null,image:await findMarketplaceImage(displayTitle,item.url),verified:true,verification:"Public marketplace search result verified",matchType:classifyMatchType({...item,title:displayTitle},seedTitle)};
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
    if(meaningful.length)push(meaningful.join(" "));
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
  let score=45+Math.min(35,hits*8);
  if(/kurta|kurti/.test(k))score+=8;
  if(/set/.test(k))score+=6;
  if(/palazzo|dupatta|floral|printed|thread|embroidered/.test(k))score+=5;
  if(w.length>=2&&w.length<=6)score+=3;
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
app.get("/api/health",(req,res)=>res.json({ok:true,service:"ecomai-pro-api",version:"0.3.0"}));
app.post("/api/analyze-url",async(req,res)=>{try{const raw=String(req.body?.url||"").trim();const refreshKey=String(req.body?.refresh||"");if(!raw)return res.status(400).json({ok:false,error:"Product URL is required."});return res.json({ok:true,data:await quickAnalyzeProduct(raw,refreshKey)})}catch(e){return res.status(422).json({ok:false,error:e?.message||"Unable to research this URL.",code:"RESEARCH_FAILED"})}});
app.post("/api/keyword-research",async(req,res)=>{try{const profile=req.body?.profile||{};const platform=String(req.body?.platform||profile.marketplace||"").trim();if(!platform)return res.status(400).json({ok:false,error:"Marketplace is required."});return res.json({ok:true,data:await researchKeywords({...profile,marketplace:platform},platform)})}catch(e){return res.status(422).json({ok:false,error:e?.message||"Unable to research keywords.",code:"KEYWORD_RESEARCH_FAILED"})}});
async function resolveProductImage(productUrl,title=""){
  try{
    const {html,finalUrl}=await fetchHtml(productUrl);
    const $=cheerio.load(html),parsed=parseProductJsonLd($,finalUrl);
    const direct=imageUrl($('meta[property="og:image"]').attr("content"),finalUrl)
      ||(parsed.images&&parsed.images[0])
      ||imageUrl($('meta[property="og:image:url"]').attr("content"),finalUrl)
      ||imageUrl($('meta[name="twitter:image"]').attr("content"),finalUrl);
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
    const response=await fetch(u.href,{redirect:"follow",signal:c.signal,headers:{
      "user-agent":"Mozilla/5.0 (compatible; EcomAIPro/0.4)",
      "accept":"image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "referer":"https://www.myntra.com/"
    }});
    if(!response.ok)throw new Error("Image returned HTTP "+response.status);
    const type=(response.headers.get("content-type")||"").split(";")[0].toLowerCase();
    if(!type.startsWith("image/"))throw new Error("URL did not return an image.");
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