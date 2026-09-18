import express from "express";
import dns from "node:dns/promises";
import net from "node:net";
import path from "node:path";
import {fileURLToPath} from "node:url";
import * as cheerio from "cheerio";

const app = express();
app.use(express.json({limit:"1mb"}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MARKET_DOMAINS = {
  Meesho:["meesho.com"],
  Myntra:["myntra.com"],
  Amazon:["amazon.in","amazon.com"],
  Flipkart:["flipkart.com"],
  Shopify:["myshopify.com"]
};

function detectPlatform(raw){
  try{
    const u=new URL(raw);
    const host=u.hostname.replace(/^www\./,"").toLowerCase();
    for(const [name,domains] of Object.entries(MARKET_DOMAINS)){
      if(domains.some(d=>host===d || host.endsWith("."+d))) return name;
    }
    return "Other ecommerce";
  }catch{return null;}
}

function isPrivateIp(ip){
  if(net.isIPv4(ip)){
    const [a,b]=ip.split(".").map(Number);
    return a===10 || a===127 || (a===172 && b>=16 && b<=31) || (a===192 && b===168) || a===0 || a>=224;
  }
  if(net.isIPv6(ip)){
    const v=ip.toLowerCase();
    return v==="::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80:");
  }
  return true;
}

async function assertPublicHost(hostname){
  if(["localhost","localhost.localdomain"].includes(hostname.toLowerCase())) throw new Error("Local URLs are not allowed.");
  const addresses=await dns.lookup(hostname,{all:true});
  if(!addresses.length || addresses.some(a=>isPrivateIp(a.address))) throw new Error("This URL does not resolve to a public host.");
}

function first(v){return Array.isArray(v)?v[0]:v;}
function clean(v){return typeof v==="string"?v.replace(/\s+/g," ").trim():v;}

function walkJsonLd(node, out){
  if(!node) return;
  if(Array.isArray(node)){for(const x of node) walkJsonLd(x,out); return;}
  if(typeof node!=="object") return;
  if(node["@graph"]) walkJsonLd(node["@graph"],out);
  const type=node["@type"];
  const types=Array.isArray(type)?type:[type];
  if(types.some(t=>String(t).toLowerCase()==="product")) out.push(node);
  for(const key of Object.keys(node)){
    if(key!=="@graph") walkJsonLd(node[key],out);
  }
}

function imageUrl(value, base){
  if(!value) return null;
  const raw=typeof value==="string"?value:(value.url||value.contentUrl);
  if(!raw) return null;
  try{return new URL(raw,base).href}catch{return null;}
}

async function extractProduct(rawUrl){
  const url=new URL(rawUrl);
  if(!["http:","https:"].includes(url.protocol)) throw new Error("Only HTTP/HTTPS product URLs are supported.");
  await assertPublicHost(url.hostname);

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  let response;
  try{
    response=await fetch(url.href,{
      redirect:"follow",
      signal:controller.signal,
      headers:{
        "user-agent":"Mozilla/5.0 (compatible; EcomAIPro/0.2; +https://ecomai-pro.onrender.com)",
        "accept":"text/html,application/xhtml+xml"
      }
    });
  }catch(err){
    if(err.name==="AbortError") throw new Error("The product page took too long to respond.");
    throw new Error("Could not fetch the product page.");
  }finally{clearTimeout(timeout)}

  if(!response.ok) throw new Error("Marketplace returned HTTP "+response.status+". The page may require a browser session or block automated requests.");
  const contentType=response.headers.get("content-type")||"";
  if(!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("This URL did not return an HTML product page.");
  const html=await response.text();
  if(html.length>6_000_000) throw new Error("Product page is too large to analyze.");

  const $=cheerio.load(html);
  const title=clean($('meta[property="og:title"]').attr("content")||$("title").text()||$("h1").first().text());
  const description=clean($('meta[property="og:description"]').attr("content")||$('meta[name="description"]').attr("content"));
  const canonical=$('link[rel="canonical"]').attr("href");
  const imageSet=new Set();
  $("meta[property='og:image'],meta[property='og:image:url'],meta[name='twitter:image']").each((_,el)=>{
    const u=imageUrl($(el).attr("content"),response.url); if(u) imageSet.add(u);
  });
  $("img").each((_,el)=>{
    const src=$(el).attr("src")||$(el).attr("data-src")||$(el).attr("data-lazy-src");
    const u=imageUrl(src,response.url); if(u) imageSet.add(u);
    if(imageSet.size>=30) return false;
  });

  const jsonProducts=[];
  $('script[type="application/ld+json"]').each((_,el)=>{
    try{walkJsonLd(JSON.parse($(el).contents().text()),jsonProducts)}catch{}
  });
  const product=jsonProducts[0]||{};
  const offers=Array.isArray(product.offers)?product.offers[0]:product.offers||{};
  const brand=typeof product.brand==="string"?product.brand:product.brand?.name;
  const sku=product.sku||product.mpn||null;
  const price=offers.price??product.price??null;
  const currency=offers.priceCurrency??product.priceCurrency??null;
  const availability=offers.availability?String(offers.availability).split("/").pop():null;
  const category=product.category||null;
  const productImages=(product.image||[]); 
  (Array.isArray(productImages)?productImages:[productImages]).forEach(x=>{
    const u=imageUrl(x,response.url); if(u) imageSet.add(u);
  });

  const h1=clean($("h1").first().text());
  const result={
    sourceUrl:rawUrl,
    finalUrl:response.url,
    platform:detectPlatform(response.url)||detectPlatform(rawUrl),
    title:title||h1||null,
    description:description||clean(product.description)||null,
    brand:clean(brand)||null,
    sku:clean(sku)||null,
    category:clean(category)||null,
    price:price!==null?String(price):null,
    currency:clean(currency)||null,
    availability:clean(availability)||null,
    images:[...imageSet].slice(0,30),
    extractedFrom:"public product page metadata",
    warnings:[]
  };
  if(!result.title) result.warnings.push("Product title was not found.");
  if(!result.images.length) result.warnings.push("No product images were found in page metadata.");
  if(!result.price) result.warnings.push("Price was not found in page metadata.");
  return result;
}

app.get("/api/health",(req,res)=>res.json({ok:true,service:"ecomai-pro-api",version:"0.2.0"}));

app.post("/api/analyze-url",async(req,res)=>{
  try{
    const raw=String(req.body?.url||"").trim();
    if(!raw) return res.status(400).json({ok:false,error:"Product URL is required."});
    const data=await extractProduct(raw);
    return res.json({ok:true,data});
  }catch(err){
    return res.status(422).json({ok:false,error:err?.message||"Unable to analyze this URL."});
  }
});

const dist=path.join(__dirname,"dist");
app.use(express.static(dist));
app.get("*",(req,res)=>{
  if(req.path.startsWith("/api/")) return res.status(404).json({ok:false,error:"API route not found."});
  res.sendFile(path.join(dist,"index.html"));
});

const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log("EcomAI Pro listening on "+port));
