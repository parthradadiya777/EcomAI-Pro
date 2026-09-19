import React from "react";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import {createRoot} from "react-dom/client";
import {
  LayoutDashboard,Store,Package,Search,Sparkles,FileText,Wand2,Settings,
  CheckCircle2,Link2,ShieldCheck,ArrowRight,X,AlertCircle,ExternalLink,Plus,
  LoaderCircle,Image as ImageIcon,BarChart3,Target,Globe2,RefreshCw
} from "lucide-react";
import "./styles.css";

const MARKETS=[
  {name:"Meesho",code:"MS",tone:"pink",desc:"Seller account & catalog"},
  {name:"Myntra",code:"MY",tone:"violet",desc:"Seller account & catalog"},
  {name:"Amazon",code:"AZ",tone:"orange",desc:"Seller account & catalog"},
  {name:"Flipkart",code:"FK",tone:"blue",desc:"Seller account & catalog"},
  {name:"Shopify",code:"SH",tone:"green",desc:"Store & products"}
];
const domains={Meesho:["meesho.com"],Myntra:["myntra.com"],Amazon:["amazon.in","amazon.com"],Flipkart:["flipkart.com"],Shopify:[]};

const STORAGE_KEY="ecomai-pro-workflow-v1";
function loadWorkflow(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")||{}}catch{return {}}
}
function saveWorkflow(patch){
  try{const current=loadWorkflow();localStorage.setItem(STORAGE_KEY,JSON.stringify({...current,...patch}));}catch{}
}

function detectPlatform(raw){
  try{
    const u=new URL(raw);
    const host=u.hostname.replace(/^www\./,"").toLowerCase();
    for(const m of MARKETS){
      if((domains[m.name]||[]).some(d=>host===d||host.endsWith("."+d))) return m.name;
    }
    if(host.includes("myshopify.com")) return "Shopify";
    const parts=host.split(".");
    const label=parts.length>2?parts[parts.length-2]:parts[0];
    if(!label||["www","shop","store","m","app"].includes(label)) return null;
    return label.charAt(0).toUpperCase()+label.slice(1);
  }catch{}
  return null;
}

function ModuleHeader({title,sub}){return <header className="topbar"><div><div className="crumb">EcomAI Pro</div><h1>{title}</h1><p>{sub}</p></div></header>}

function Nav({active,onModule}){
  return <nav className="nav">
    <a className={active==="Dashboard"?"active":""} onClick={()=>onModule(0)}><LayoutDashboard size={17}/>Dashboard</a>
    <a className={active==="Marketplace"?"active":""} onClick={()=>onModule(1)}><Store size={17}/>Marketplace</a>
    <a className={active==="Competitor"?"active":""} onClick={()=>onModule(3)}><Search size={17}/>Competitor & Market</a>
    <a className={active==="ListingAI"?"active":""} onClick={()=>onModule(4)}><Sparkles size={17}/>Listing AI</a>
    <a className={active==="ImageGenerator"?"active":""} onClick={()=>onModule(5)}><Wand2 size={17}/>Image Generator</a>
    <a className={active==="Settings"?"active":""} onClick={()=>onModule(6)}><Settings size={17}/>Settings</a>
  </nav>
}

function Sidebar({active,onModule}){
  return <aside className="sidebar">
    <div className="brand"><span>✦</span> EcomAI <b>Pro</b></div>
    <div className="brand-sub">Marketplace Intelligence & Listing Copilot</div>
    <Nav active={active} onModule={onModule}/>
    <div className="sidebar-note"><div className="note-icon"><ShieldCheck size={16}/></div><div><strong>Secure integration</strong><small>Official APIs / permitted integrations only.</small></div></div>
  </aside>
}

function MarketplaceConnection({state}){
  const {url,setUrl,detected,setDetected,confirmed,setConfirmed,connections,setConnections,modal,setModal,notice,setNotice,setModule}=state;
  const analyze=()=>{
    setNotice("");setConfirmed(false);
    if(!url.trim()){setNotice("Paste a product URL first.");setDetected(null);return}
    const p=detectPlatform(url);
    setDetected(p);
    if(!p)setNotice("We couldn't identify a supported marketplace from this URL.");
  };
  const confirmPlatform=()=>{setConfirmed(true);setNotice("Platform confirmed. Continue to Product / Listing Import.");};
  const connect=name=>{setConnections(prev=>({...prev,[name]:true}));setModal(null);setNotice(name+" is marked connected for this development build. Official API authorization will be wired in the integration layer.")};
  return <>
    <ModuleHeader title="Connect your marketplaces" sub="One connection layer for the listing, competitor and creative workflow."/>
    <section className="hero-card">
      <div className="hero-copy"><span className="eyebrow">START WITH ANY PRODUCT</span><h2>Paste a product URL.<br/>We detect the marketplace first.</h2><p>We never assume the platform. The detected marketplace must be confirmed before analysis continues.</p></div>
      <div className="url-panel"><label>Product URL</label><div className="url-row"><Link2 size={18} className="url-icon"/><input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()} placeholder="https://www.myntra.com/..."/><button onClick={analyze}>Detect <ArrowRight size={16}/></button></div><div className="microcopy"><ShieldCheck size={14}/> Only the public URL is used for detection at this stage.</div></div>
    </section>
    {notice&&<div className="notice"><AlertCircle size={17}/><span>{notice}</span><button onClick={()=>setNotice("")}><X size={15}/></button></div>}
    {detected&&<section className="detect-card"><div className="detect-left"><div className={"market-logo "+(MARKETS.find(x=>x.name===detected)?.tone||"")}>{MARKETS.find(x=>x.name===detected)?.code}</div><div><span className="eyebrow">PLATFORM DETECTED</span><h3>{detected}</h3><p>We found a {detected} product URL.</p></div></div><div className="detect-actions">{!confirmed?<><span>Is this correct?</span><button className="secondary" onClick={()=>setDetected(null)}>Change</button><button className="primary" onClick={confirmPlatform}><CheckCircle2 size={16}/> Yes, continue</button></>:<><div className="confirmed"><CheckCircle2 size={18}/> Confirmed</div><button className="primary" onClick={()=>setModule(2)}>Continue to Product Import <ArrowRight size={15}/></button></>}</div></section>}
    <section className="section"><div className="section-head"><div><span className="eyebrow">OPTIONAL ACCOUNT CONNECTION</span><h3>Connect seller accounts</h3></div><span className="muted">Connect once → import real listings later</span></div><div className="market-grid">{MARKETS.map(m=><div className="market-card" key={m.name}><div className="market-top"><div className={"market-logo "+m.tone}>{m.code}</div><div className="market-text"><h4>{m.name}</h4><p>{m.desc}</p></div><span className={"status "+(connections[m.name]?"connected":"")}>{connections[m.name]?"Connected":"Not connected"}</span></div><div className="market-bottom"><span><ShieldCheck size={14}/> Official integration</span><button className={connections[m.name]?"ghost":"outline"} onClick={()=>setModal(m.name)}>{connections[m.name]?"Manage":"Connect"}</button></div></div>)}</div></section>
    {modal&&<div className="modal-backdrop" onClick={()=>setModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="modal-x" onClick={()=>setModal(null)}><X size={18}/></button><div className={"modal-logo "+(MARKETS.find(x=>x.name===modal)?.tone||"")}>{MARKETS.find(x=>x.name===modal)?.code}</div><h3>{connections[modal]?"Manage ":"Connect "}{modal}</h3><p>This development build reserves the connection flow. The live connector will use the marketplace's official authorization/API process; no passwords are stored in this UI.</p><div className="modal-actions"><button className="ghost" onClick={()=>setModal(null)}>Cancel</button><button className="primary" onClick={()=>connect(modal)}>{connections[modal]?"Reconnect":"Continue"} <ExternalLink size={15}/></button></div></div></div>}
  </>
}

function ProductImport({platform,url,onBack,setModule,analyzed,setAnalyzed,notice,setNotice}){
  const saved=React.useMemo(()=>loadWorkflow(),[]);
  const [source,setSource]=React.useState(saved.source||"url");
  const [productUrl,setProductUrl]=React.useState(url||saved.productUrl||"");
  const [loading,setLoading]=React.useState(false);
  const [manual,setManual]=React.useState({category:"",type:"",color:"",fabric:"",keywords:""});
  const [candidates,setCandidates]=React.useState(saved.candidates||[]);
  const [selected,setSelected]=React.useState(saved.selected||[]);
  const [keywordData,setKeywordData]=React.useState(saved.keywordData||null);
  const [keywordLoading,setKeywordLoading]=React.useState(false);
  const [keywordTab,setKeywordTab]=React.useState("short");
  React.useEffect(()=>{if(url)setProductUrl(url)},[url]);
  React.useEffect(()=>{saveWorkflow({productUrl,candidates,selected,keywordData,analyzed})},[productUrl,candidates,selected,keywordData,analyzed]);

  const runKeywordResearch=async(profile,p)=>{
    setKeywordLoading(true);setKeywordData(null);
    try{
      const r=await fetch("/api/keyword-research",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({platform:p,profile})});
      const j=await r.json();if(!j.ok)throw new Error(j.error||"Keyword research failed.");
      setKeywordData(j.data);
    }catch(e){setNotice(e.message||"Keyword research failed.");}
    finally{setKeywordLoading(false);}
  };

  const analyzeProduct=async(refresh=false)=>{
    const target=productUrl.trim();setNotice("");setAnalyzed(null);setCandidates([]);setSelected([]);setKeywordData(null);
    if(!target){setNotice("Paste a product URL first.");return}
    const p=detectPlatform(target);
    if(!p){setNotice("We could not identify the marketplace. Please use a supported marketplace product URL.");return}
    setLoading(true);
    try{
      const r=await fetch("/api/analyze-url",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:target,refresh:refresh?Date.now():""})});
      const j=await r.json();if(!j.ok)throw new Error(j.error||"Unable to analyze this product URL.");
      const raw=j.data||{};
      const title=raw.title||"Selected marketplace product";
      const words=title.toLowerCase().replace(/[^a-z0-9 ]+/g," ").split(/\s+/).filter(x=>x.length>2&&!["women","woman","womens","jiprostore","jipro"].includes(x));
      const productSignalWords=["kurta","kurti","palazzo","dupatta","floral","printed","thread","work","embroidered","cotton","rayon","georgette","silk","anarkali","suit","saree","shoe","shoes","sneaker","sneakers","footwear","sandals","slippers","boots","heels","loafers","shirt","tshirt","jeans","dress","jacket","phone","mobile","smartphone","laptop","tablet","watch","headphones","earbuds","speaker","camera","television","tv","monitor","keyboard","mouse","printer","shampoo","serum","cream","moisturizer","lipstick","makeup","perfume","skincare","haircare","soap","chair","table","sofa","bed","mattress","lamp","bottle","mixer","cookware","kitchen","storage","backpack","bag","wallet","toy","book","bedding","curtain"];
      const cleanProfileWords=[...new Set(words.filter(x=>productSignalWords.includes(x)))];
      const data={...raw,sourceUrl:target,platform:p,title,category:raw.category||manual.category||"Detect from product",productType:manual.type||raw.productType||"Product",color:manual.color||raw.color||"Not specified",fabric:manual.fabric||raw.fabric||"Not specified",keywords:manual.keywords||raw.keywords||cleanProfileWords.slice(0,14).join(", ")};
      setAnalyzed(data);
      const real=(raw.relatedProducts||[]).map((x,i)=>({...x,id:i+1}));
      setCandidates(real);
      setSelected(real.map(x=>x.id));
      await runKeywordResearch(data,p);
      if(real.length<3)setNotice("Research returned fewer than 3 verified marketplace references. The engine will broaden from close matches to similar products and category benchmarks; it will never invent products.");
    }catch(e){setNotice(e.message||"Unable to analyze this product.");}
    finally{setLoading(false);}
  };

  
  React.useEffect(()=>{if(analyzed)setAnalyzed(prev=>prev?({...prev,selectedCompetitors:candidates,keywordResearch:keywordData}):prev)},[candidates,keywordData]);
  const keywordRows=keywordData?.keywords?.[keywordTab]||[];

  return <div className="content">
    <ModuleHeader title="Add or import a product" sub={platform?platform+" detected. Build a product profile, then run marketplace-specific product and keyword research.":"Choose a product URL or enter the product details manually."}/>
    <section className="module-card"><span className="eyebrow">PRODUCT URL</span><h3>Create product intelligence</h3><p className="helper">EcomAI checks the public product page where possible, then searches the detected marketplace for real related product URLs. It does not create placeholder competitors.</p><div className="url-row import-url"><Link2 size={18}/><input value={productUrl} onChange={e=>setProductUrl(e.target.value)} placeholder="Paste product URL"/><button className="primary" onClick={analyzeProduct} disabled={loading}>{loading?<><LoaderCircle size={16} className="spin"/> Researching...</>:<>Build Product Profile <ArrowRight size={16}/></>}</button></div><div className="security-row"><ShieldCheck size={15}/> Platform: <strong>{platform||"Not confirmed"}</strong><span>•</span> Product-page + marketplace research</div></section>
    {false&&<section className="module-card"><span className="eyebrow">PRODUCT ATTRIBUTES</span><h3>Help EcomAI understand the product</h3><div className="manual-grid"><input placeholder="Category (e.g. Kurti Set)" value={manual.category} onChange={e=>setManual({...manual,category:e.target.value})}/><input placeholder="Product type" value={manual.type} onChange={e=>setManual({...manual,type:e.target.value})}/><input placeholder="Color" value={manual.color} onChange={e=>setManual({...manual,color:e.target.value})}/><input placeholder="Fabric" value={manual.fabric} onChange={e=>setManual({...manual,fabric:e.target.value})}/><textarea placeholder="Keywords / design details" value={manual.keywords} onChange={e=>setManual({...manual,keywords:e.target.value})}></textarea></div></section>}
    {analyzed&&<section className="product-result">
      <div className="result-head"><div><span className="eyebrow">PRODUCT PROFILE</span><h3>{analyzed.title}</h3><p>{analyzed.platform} · {analyzed.extractionMethod||"Product intelligence"}</p></div><span className="result-status"><CheckCircle2 size={15}/> Profile ready</span></div>
      <div className="profile-grid"><div><div className="info-row"><span>Category</span><strong>{analyzed.category}</strong></div><div className="info-row"><span>Product type</span><strong>{analyzed.productType}</strong></div><div className="info-row"><span>Color</span><strong>{analyzed.color}</strong></div></div><div><div className="info-row"><span>Fabric</span><strong>{analyzed.fabric}</strong></div><div className="info-row"><span>Keywords / attributes</span><strong>{analyzed.keywords}</strong></div><div className="info-row"><span>Marketplace</span><strong>{analyzed.platform}</strong></div></div></div>
      {analyzed.warnings?.length>0&&<div className="warning-box"><AlertCircle size={15}/><div><strong>Research note</strong><span>{analyzed.warnings[0]}</span></div></div>}
    </section>}
    {analyzed&&<section className="keyword-card">
      <div className="keyword-head"><div><span className="eyebrow">KEYWORD INTELLIGENCE</span><h3>Short + Medium + Long-tail keyword research</h3><p className="helper">Real product-relevant keyword signals. We show exactly which research source produced each keyword and never invent numeric search volume.</p></div><span className={"provider-badge "+(keywordData?.providerConfigured?"paid":"public")}>{keywordLoading?<><LoaderCircle size={13} className="spin"/> Researching</>:keywordData?.providerConfigured?"Provider data":"Public research"}</span></div>
      <div className="research-source-bar"><div><strong>Research references</strong><span>Google Autocomplete · Product attributes{keywordData?.providerConfigured?" · Semrush India database":""}</span></div><div className="source-proof"><span>✓ Live signal</span><span>✓ Product matched</span>{keywordData?.providerConfigured&&<span>✓ Provider metrics</span>}</div></div>
      <div className="keyword-metrics"><div><Globe2 size={15}/><span>Marketplace</span><b>{platform}</b></div><div><Target size={15}/><span>Research rows</span><b>{keywordData?.total||"—"}</b></div><div><BarChart3 size={15}/><span>Data mode</span><b>{keywordData?.providerConfigured?"Volume + CPC + competition":"Demand signals"}</b></div></div>
      <div className="keyword-tabs"><button className={keywordTab==="short"?"active":""} onClick={()=>setKeywordTab("short")}>Short</button><button className={keywordTab==="medium"?"active":""} onClick={()=>setKeywordTab("medium")}>Medium</button><button className={keywordTab==="long"?"active":""} onClick={()=>setKeywordTab("long")}>Long-tail</button></div>
      {keywordLoading?<div className="keyword-loading"><LoaderCircle className="spin" size={20}/> Running keyword research across product signals…</div>:keywordRows.length===0?<div className="keyword-empty">No sufficiently related keyword found from the current signals. We will not fill this table with unrelated terms.</div>:<div className="keyword-table-wrap"><table className="keyword-table"><thead><tr><th>Keyword</th><th>Intent</th><th>Volume</th><th>CPC</th><th>Competition</th><th>Relevance</th><th>Research source</th></tr></thead><tbody>{keywordRows.map((x,i)=><tr key={x.keyword+i}><td><div className="keyword-cell"><strong>{x.keyword}</strong><small>{x.type}</small><button className="copy-keyword" title="Copy keyword" onClick={e=>{e.preventDefault();navigator.clipboard?.writeText(x.keyword);e.currentTarget.textContent="✓ Copied";setTimeout(()=>{if(e.currentTarget)e.currentTarget.textContent="Copy"},900)}}>Copy</button></div></td><td>{x.intent}</td><td>{x.volume==null?"—":x.volume.toLocaleString()}</td><td>{x.cpc==null?"—":"₹"+x.cpc}</td><td>{x.competition==null?"—":Math.round(x.competition*100)+"%"}</td><td><span className="relevance-pill">{x.relevance}%</span></td><td><div className="source-list">{(x.sourceSignals||[]).slice(0,3).map((src,j)=><span key={j}>{src}</span>)}</div></td></tr>)}</tbody></table></div>}
      <div className="keyword-foot">{keywordData?.providerConfigured?<span>Metrics are estimates from the connected India provider. Source labels above show the evidence used for each keyword.</span>:<span>Current public research uses live Google autocomplete + the product's own attributes. Numeric volume/CPC/competition are left blank until a data provider is connected.</span>}</div>
    </section>}
    {analyzed&&<section className="related-card">
      <div className="related-head"><div><span className="eyebrow">REAL MARKETPLACE RESEARCH</span><h3>Verified marketplace references</h3><p className="helper">EcomAI uses a fallback ladder: Close Match → Similar Product → Category Benchmark. Every card is a real marketplace URL verified by the research engine.</p></div><div className="related-tools"><button className="outline refresh-btn" onClick={()=>analyzeProduct(true)} disabled={loading||keywordLoading}><RefreshCw size={15} className={loading?"spin":""}/> Refresh research</button></div></div>
      <div className="research-search"><Search size={16}/><input value={analyzed?.keywords||""} readOnly/><span className="research-status">EcomAI is searching {platform} and verifying public product pages</span></div>
      {candidates.length===0?<div className="related-empty">No verified marketplace products were returned. Try another product URL or broaden the product attributes; EcomAI will not display fake competitor cards.</div>:<><div className="research-result-meta"><span>{candidates.length} verified references found</span><span>All verified references are used for market analysis</span></div><div className="research-product-grid">{candidates.map(x=><div className="research-product" key={x.id}><div className="research-product-check"><span>{x.verified?"Verified":"Unverified"}</span></div><div className="research-product-image">{x.image?<img src={"/api/image-proxy?url="+encodeURIComponent(x.image)} alt="" onError={e=>{e.currentTarget.style.display="none";e.currentTarget.parentElement.classList.add("image-pending")}}/>:<div className="image-pending"><ImageIcon size={22}/><span>Image pending</span></div>}</div><div className="research-product-body"><small>{platform} · {x.verified?"Public product page checked":"Search result"} · {x.matchType||"Marketplace Reference"}</small><strong title={x.title}>{x.title}</strong>{x.price&&<b>{x.currency||"₹"}{x.price}</b>}<a href={x.url} target="_blank" rel="noreferrer">Open product <ExternalLink size={12}/></a></div></div>)}</div></>}

    </section>}

  </div>
}
function ImageGenerator({product}){
  const poses=["Front standing","45° side","Walking","Hand on waist","Slight turn","Back / over-the-shoulder"];
  const [pose,setPose]=React.useState("Front standing");
  const [reference,setReference]=React.useState(null);
  const [preview,setPreview]=React.useState("");
  const [results,setResults]=React.useState([]);
  const [generating,setGenerating]=React.useState(false);
  const [zipping,setZipping]=React.useState(false);
  const [error,setError]=React.useState("");
  const [attempted,setAttempted]=React.useState(false);

  React.useEffect(()=>()=>{if(preview&&preview.startsWith("blob:"))URL.revokeObjectURL(preview)},[preview]);

  const fileDataUrl=async(file)=>{
    const bytes=new Uint8Array(await file.arrayBuffer());
    let binary="";
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    return "data:"+(file.type||"image/jpeg")+";base64,"+btoa(binary);
  };

  const onFile=e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setAttempted(true);setError("");setResults([]);
    if(!/^image\/(png|jpeg|webp)$/i.test(file.type)){
      setReference(null);setPreview("");setError("Please upload PNG, JPG or WEBP.");
      e.target.value="";return;
    }
    if(file.size>10*1024*1024){
      setReference(null);setPreview("");setError("Product reference image must be 10 MB or smaller.");
      e.target.value="";return;
    }
    setReference(file);
    setPreview(URL.createObjectURL(file));
  };

  const generate=async()=>{
    setAttempted(true);
    if(!reference){setError("Please upload a product reference image before generating.");return}
    setGenerating(true);setError("");
    try{
      const imageData=await fileDataUrl(reference);
      const r=await fetch("/api/generate-image",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({imageData,pose})});
      const j=await r.json();
      if(!j.ok)throw new Error(j.error||"Image generation failed.");
      if(!j.imageData)throw new Error("Image provider returned no generated image.");
      setResults(prev=>[...prev.filter(x=>x.pose!==pose),{pose,imageData:j.imageData}]);
    }catch(e){setError(e?.message||"Image generation failed. Please try again.")}
    finally{setGenerating(false)}
  };

  const dataUrlToJpg=async(dataUrl)=>{
    const blob=await fetch(dataUrl).then(r=>r.blob());
    const bitmap=await createImageBitmap(blob);
    const canvas=document.createElement("canvas");
    canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext("2d");ctx.drawImage(bitmap,0,0);bitmap.close?.();
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("JPG conversion failed.")),"image/jpeg",0.92));
  };

  const downloadZip=async()=>{
    if(!results.length)return;
    setZipping(true);setError("");
    try{
      const zip=new JSZip();
      for(const item of results)zip.file("EcomAI_"+item.pose.replace(/[^a-z0-9]+/gi,"_")+".jpg",await dataUrlToJpg(item.imageData));
      const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});
      const url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download="EcomAI_Image_Generator_JPG.zip";document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(e){setError(e.message||"ZIP creation failed.")}
    finally{setZipping(false)}
  };

  const downloadJpg=async(item)=>{
    try{
      const jpg=await dataUrlToJpg(item.imageData),url=URL.createObjectURL(jpg),a=document.createElement("a");
      a.href=url;a.download="EcomAI_"+item.pose.replace(/[^a-z0-9]+/gi,"_")+".jpg";document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(e){setError(e.message||"JPG download failed.")}
  };

  return <section className="image-generator-card">
    <div className="image-generator-head"><div><span className="eyebrow">IMAGE GENERATOR</span><h3>Generate model images</h3><p>Upload the exact product reference, choose a pose, and generate catalog-ready model images. Uploading never replaces the page.</p></div><span className="pricing-badge">6 poses · JPG</span></div>
    <div className="image-generator-body">
      <label className={"image-upload-box "+(attempted&&!preview?"upload-error":"")}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile}/>{preview?<img className="generator-preview" src={preview} alt="Product reference"/>:<ImageIcon size={22}/>}<strong>{reference?reference.name:"Upload product reference"}</strong><small>PNG / JPG / WEBP · max 10 MB</small><span className="upload-helper">Your image stays in this page until you click Generate.</span></label>
      <div className="pose-panel"><span>Choose pose</span><div className="pose-grid">{poses.map(x=><button type="button" key={x} className={pose===x?"active":""} onClick={()=>setPose(x)}>{x}{results.some(r=>r.pose===x)&&<small className="pose-done">✓ Ready</small>}</button>)}</div><button className="primary generate-btn" onClick={generate} disabled={generating}>{generating?<><LoaderCircle size={16} className="spin"/> Generating…</>:<>Generate {pose}</>}</button><small className="generator-note">Generated poses kept here: <b>{results.length}/6</b>. Backend image generation is used; no Puter dependency.</small>{error&&<div className="generator-error"><AlertCircle size={14}/>{error}</div>}</div>
    </div>
    {results.length>0&&<div className="generated-result"><div className="generated-result-head"><div><span className="eyebrow">GENERATED IMAGES</span><h4>{results.length}/6 poses ready</h4></div><button className="primary zip-btn" onClick={downloadZip} disabled={zipping}>{zipping?<><LoaderCircle size={15} className="spin"/> Creating ZIP…</>:<>Download All JPG (ZIP)</>}</button></div><div className="generated-grid">{results.map(item=><div className="generated-item" key={item.pose}><img src={item.imageData} alt={item.pose}/><div className="generated-item-foot"><strong>{item.pose}</strong><button className="outline" onClick={()=>downloadJpg(item)}>JPG</button></div></div>)}</div></div>}
  </section>
}

function MarketPlaceholder({onBack,product}){
  const competitors=product?.selectedCompetitors||[];
  const prices=competitors.map(x=>Number(String(x.price||"").replace(/[^0-9.]/g,""))).filter(Number.isFinite);
  const avgPrice=prices.length?Math.round(prices.reduce((a,b)=>a+b,0)/prices.length):null;
  const minPrice=prices.length?Math.min(...prices):null,maxPrice=prices.length?Math.max(...prices):null;
  const titleWords=(product?.title||"").toLowerCase().match(/[a-z0-9]+/g)||[];
  const stop=new Set(["women","woman","mens","men","with","and","for","the","regular","printed","floral","work","pure","cotton","online","buy","new"]);
  const targetTerms=[...new Set(titleWords.filter(w=>w.length>3&&!stop.has(w)))];
  const patternCounts={};
  competitors.forEach(x=>{const words=(x.title||"").toLowerCase().match(/[a-z0-9]+/g)||[];[...new Set(words)].forEach(w=>{if(w.length>3&&!stop.has(w))patternCounts[w]=(patternCounts[w]||0)+1})});
  const repeated=Object.entries(patternCounts).filter(([,n])=>n>=Math.max(2,Math.ceil(competitors.length*.5))).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const selectedKeywords=product?.keywordResearch?.keywords||{};
  const keywordSignals=[...(selectedKeywords.short||[]),...(selectedKeywords.medium||[]),...(selectedKeywords.long||[])].slice(0,10);
  return <div className="content">
    <ModuleHeader title="Competitor & Market Analysis" sub={`${product?.platform||"Marketplace"} research for ${product?.title||"selected product"}. Findings below are based on the verified marketplace references returned by research.`}/>
    <div className="module3-toolbar"><button className="ghost" onClick={onBack}>← Back to Product / Listing</button><span><CheckCircle2 size={14}/> {competitors.length} verified references</span></div>
    <section className="analysis-hero"><div><span className="eyebrow">MARKET SNAPSHOT</span><h2>{product?.title||"Selected product"}</h2><p>Observed competitor signals from the verified {product?.platform||"marketplace"} references. This is evidence from the researched listings, not invented market data.</p></div><div className="analysis-stats"><div><span>References</span><b>{competitors.length}</b></div><div><span>Observed avg price</span><b>{avgPrice?`₹${avgPrice.toLocaleString("en-IN")}`:"—"}</b></div><div><span>Price range</span><b>{minPrice?`₹${minPrice.toLocaleString("en-IN")}–₹${maxPrice.toLocaleString("en-IN")}`:"—"}</b></div></div></section>
    <section className="analysis-grid"><div className="analysis-card"><span>Price positioning</span><strong>{minPrice?`₹${minPrice.toLocaleString("en-IN")}–₹${maxPrice.toLocaleString("en-IN")}`:"Not available"}</strong><small>Observed across selected references.</small></div><div className="analysis-card"><span>Title patterns</span><strong>{repeated.length?repeated.slice(0,3).map(x=>x[0]).join(" · "):"Limited signal"}</strong><small>Repeated terms across selected listings.</small></div><div className="analysis-card"><span>Keyword signals</span><strong>{keywordSignals.length?`${keywordSignals.length} signals`:"Limited signal"}</strong><small>From keyword research.</small></div><div className="analysis-card"><span>Images</span><strong>Image pending</strong><small>Image retrieval is separate and does not block research.</small></div></section>
    <section className="module3-section"><div className="module3-section-head"><div><span className="eyebrow">VERIFIED COMPETITORS</span><h3>Selected marketplace references</h3></div><span className="muted">Real URLs · verified by research</span></div><div className="competitor-table-wrap"><table className="competitor-table"><thead><tr><th>Product</th><th>Match</th><th>Price</th><th>Research URL</th></tr></thead><tbody>{competitors.map(x=><tr key={x.id}><td><strong>{x.title}</strong></td><td><span className="match-pill">{x.matchType||"Verified"}</span></td><td>{x.price?<><strong>{x.currency||"₹"}{Number(x.price).toLocaleString("en-IN")}</strong>{x.mrp&&Number(x.mrp)>Number(x.price)?<small className="price-mrp">MRP {x.currency||"₹"}{Number(x.mrp).toLocaleString("en-IN")}</small>:null}</>:"Price unavailable"}</td><td><a href={x.url} target="_blank" rel="noreferrer">Open product <ExternalLink size={12}/></a></td></tr>)}</tbody></table></div></section>
    <section className="module3-two-col"><div className="module3-section"><div className="module3-section-head"><div><span className="eyebrow">COMPETITOR PATTERNS</span><h3>What repeats across references</h3></div></div>{repeated.length?<div className="pattern-list">{repeated.map(([word,count])=><div className="pattern-row" key={word}><b>{word}</b><span>{count}/{competitors.length} references</span><div><i style={{width:(count/competitors.length*100)+"%"}}/></div></div>)}<p className="analysis-note">Repeated title terms are research signals, not a claim about total marketplace demand.</p></div>:<div className="analysis-empty">Not enough repeated title signals in the selected references.</div>}</div>
    <div className="module3-section"><div className="module3-section-head"><div><span className="eyebrow">KEYWORD SIGNALS</span><h3>Research already available</h3></div></div>{keywordSignals.length?<div className="signal-list">{keywordSignals.map((x,i)=><div className="signal-row" key={x.keyword}><span>{i+1}</span><strong>{x.keyword}</strong><em>{x.type||"Signal"}</em><small>{x.relevance||"—"} relevance</small></div>)}</div>:<div className="analysis-empty">No keyword signals were returned.</div>}</div></section>
    <section className="recommendation-card"><div className="recommendation-icon"><Sparkles size={20}/></div><div><span className="eyebrow">LISTING OPPORTUNITY</span><h3>Turn these signals into your listing plan</h3><p>Use repeated competitor terms as research inputs, compare your price with the observed range, and carry verified keyword signals into Listing AI. Image retrieval remains pending and does not block this workflow.</p><div className="opportunity-tags">{targetTerms.slice(0,6).map(x=><span key={x}>{x}</span>)}</div></div></section>
  </div>
}


function ListingAI({product,onBack}){
  const [marketplace,setMarketplace]=React.useState("");
  const [workbookName,setWorkbookName]=React.useState("");
  const [sourceWorkbook,setSourceWorkbook]=React.useState(null);
  const [sourceHeaderRow,setSourceHeaderRow]=React.useState(0);
  const [rows,setRows]=React.useState([]);
  const [generatedPreview,setGeneratedPreview]=React.useState([]);
  const [simpleGenerationStarted,setSimpleGenerationStarted]=React.useState(false);
  const [headers,setHeaders]=React.useState([]);
  const [templateMode,setTemplateMode]=React.useState(false);
  const [templateFields,setTemplateFields]=React.useState([]);
  const [imageGroups,setImageGroups]=React.useState([]);
  const [zipError,setZipError]=React.useState("");
  const [competitorUrls,setCompetitorUrls]=React.useState(["","",""]);
  const [competitorRefs,setCompetitorRefs]=React.useState([]);
  const [competitorLoading,setCompetitorLoading]=React.useState(false);

  const [competitorError,setCompetitorError]=React.useState("");
  const [competitorScreenshots,setCompetitorScreenshots]=React.useState([]);
  const [status,setStatus]=React.useState("");
  const [error,setError]=React.useState("");
  const [progress,setProgress]=React.useState(0);
  const [processing,setProcessing]=React.useState(false);
  const [downloadReady,setDownloadReady]=React.useState(false);
  const [contentMode,setContentMode]=React.useState("fresh");
  const [customInstruction,setCustomInstruction]=React.useState("");
  const [visionConfigured,setVisionConfigured]=React.useState(null);
  const inputRef=React.useRef(null);
  const zipRef=React.useRef(null);
  const folderRef=React.useRef(null);

  const rules={
    Myntra:{label:"Myntra",required:["vendorArticleNumber","vendorArticleName","brand","Prominent Colour","Fabric","Product Details","Product Display Name","Front Image","Side Image","Back Image"],maxTitle:80},
    Amazon:{label:"Amazon",required:["SKU","Item Name","Brand","Bullet Points","Product Description","Generic Keywords"],maxTitle:200},
    Flipkart:{label:"Flipkart",required:["Seller SKU","Product Title","Brand","Color","Material","Description","Search Keywords"],maxTitle:120},
    Meesho:{label:"Meesho",required:["SKU","Product Name","Category","Color","Material","Description","Search Keywords"],maxTitle:100},
    Shopify:{label:"Shopify",required:["Handle","Title","Body HTML","Product Type","Tags"],maxTitle:255}
  };
  const normalize=v=>String(v??"").replace(/\s+/g," ").trim();
  const detectMarketplaceFromWorkbook=(matrix,sheetNames=[])=>{
    const all=(matrix||[]).slice(0,25).flat().map(x=>normKey(x)).filter(Boolean);
    const has=k=>all.includes(normKey(k));
    const joined=all.join("|");
    // Known templates are detected automatically; unknown marketplace templates are accepted too.
    if((has("styleId")||has("styleGroupId"))&&(has("vendorSku")||has("vendorArticleNumber")||has("vendorArticleName")))return "Myntra";
    if(has("vendorArticleNumber")||has("vendorArticleName"))return "Myntra";
    if((has("sellerSku")||has("itemSku")||has("sku"))&&(has("productDescription")||has("itemDescription")||has("productDescriptionText"))&&(has("genericKeywords")||has("searchTerms")||has("searchTerms1")))return "Amazon";
    if((has("sellerSku")||has("sellerSKU")||has("sku"))&&(has("productTitle")||has("listingTitle")||has("title"))&&(has("sellingPrice")||has("mrp")||has("price")))return "Flipkart";
    if(has("supplierSku")||has("supplierSkuCode")||has("styleCode")||has("catalogName"))return "Meesho";
    if(has("handle")&&has("bodyHtml")&&(has("productType")||has("vendor")))return "Shopify";
    if((sheetNames||[]).some(n=>/myntra/i.test(String(n))))return "Myntra";
    if(/vendorarticlenumber|vendorarticlename|styleid|stylegroupid|vendorsku/.test(joined))return "Myntra";
    return "Marketplace";
  };
  const normKey=v=>normalize(v).toLowerCase().replace(/[^a-z0-9]+/g,"");
  const findField=(obj,patterns)=>{
    const keyNorm=v=>String(v||"").toLowerCase().replace(/[^a-z0-9]+/g,"");
    const normalizedPatterns=(patterns||[]).map(keyNorm).filter(Boolean);
    for(const [k,v] of Object.entries(obj||{})){
      const nk=keyNorm(k);
      if(normalizedPatterns.some(p=>nk.includes(p))&&normalize(v))return normalize(v);
    }
    return "";
  };
  const sourceProfile=row=>({
    sku:findField(row,["sku","style id","seller sku","item sku","product id","style code","vendorarticlenumber","van"]),
    brand:findField(row,["brand","brand name"]),
    name:findField(row,["product name","item name","product title","style name","vendorarticlename","name"]),
    existingTitle:findField(row,["listing title","listing name","seo title","catalog title","product display name","product title","item name","title","vendorarticlename"]),
    category:findField(row,["category","product type","product category","department","articletype"]),
    type:findField(row,["product type","type","sub category","articletype"]),
    color:findField(row,["prominent colour","prominent color","brand colour","brand color","color","colour"]),
    fabric:findField(row,["fabric","material","fabric type"]),
    pattern:findField(row,["pattern","print","design","occasion"]),
    gender:findField(row,["gender","target gender","agegroup"]),
    size:findField(row,["size","brand size","standard size","size name"]),
    existingDescription:findField(row,["product details","style note","listing description","seo description","product description","long description","description","body html"]),
    existingKeywords:findField(row,["search keyword","search term","generic keyword","backend keyword","keywords","tags"]),
    sourceUrl:findField(row,["product url","product link","listing url","source url","url","link"])
  });
  const localDraft=(row,platform)=>{
    const p=sourceProfile(row);
    const title=(p.existingTitle||p.name||p.type||p.sku||"Product listing").slice(0,(rules[platform]?.maxTitle||120));
    const facts=[p.category,p.type,p.color,p.fabric,p.pattern,p.gender,p.size].filter(Boolean);
    const description=p.existingDescription||"";
    const keywords=p.existingKeywords||[p.brand,p.name,p.category,p.type,p.color,p.fabric,p.pattern,p.gender].filter(Boolean).join(", ");
    return {title,description,bullets:facts.slice(0,5).map(x=>String(x)),keywords,color:p.color,fabric:p.fabric,category:p.category,productType:p.type,pattern:p.pattern,gender:p.gender};
  };
  const parseAiResponse=text=>{
    const raw=String(text||"").trim();
    try{return JSON.parse(raw)}catch{}
    const a=raw.indexOf("{"),b=raw.lastIndexOf("}");
    if(a>=0&&b>a){try{return JSON.parse(raw.slice(a,b+1))}catch{}}
    return null;
  };
  const fileDataUrl=async(file)=>{
    const b=await file.arrayBuffer(),bytes=new Uint8Array(b);let binary="";
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    return "data:"+(file.type||"image/jpeg")+";base64,"+btoa(binary);
  };
  const imageStem=name=>normalize(name.split("/").pop().replace(/\.[^.]+$/,"")).replace(/(?:[_-](?:front|side|back|detail|look|shot|img|image|1|2|3|4|5|6|7))$/i,"").replace(/\s+/g,"_");
  const zipSkuKey=name=>{
    const parts=String(name||"").split("/").filter(Boolean);
    if(parts.length>1){
      const folder=normalize(parts[0]);
      if(folder&&folder!=="."&&folder!=="__MACOSX")return folder;
    }
    return imageStem(name);
  };
  const parseZip=async(file)=>{
    const zip=await JSZip.loadAsync(file),map=new Map();
    const entries=Object.values(zip.files).filter(x=>!x.dir&&/\.(?:jpg|jpeg|png|webp)$/i.test(String(x.name||"")));
    for(const entry of entries){
      const data=await entry.async("base64"),lower=String(entry.name||"").toLowerCase();
      const mime=lower.endsWith(".png")?"image/png":lower.endsWith(".webp")?"image/webp":"image/jpeg";
      const key=zipSkuKey(entry.name);
      if(!map.has(key))map.set(key,{key,files:[]});
      map.get(key).files.push({name:entry.name,dataUrl:"data:"+mime+";base64,"+data});
    }
    if(!entries.length)throw new Error("No supported product images found in the ZIP. JPG/JPEG/PNG/WEBP are supported.");
    return [...map.values()];
  };
  const parseImageFolder=async(fileList)=>{
    const files=[...fileList].filter(f=>/^image\/(?:png|jpeg|webp)$/i.test(f.type)&&f.size<=10*1024*1024);
    if(!files.length)throw new Error("No supported product images found in the selected folder.");
    const map=new Map();
    for(const file of files){
      const relative=String(file.webkitRelativePath||file.name),parts=relative.split("/").filter(Boolean);
      const key=parts.length>=3?parts[1]:imageStem(file.name);
      const safeKey=key||imageStem(file.name);
      if(!map.has(safeKey))map.set(safeKey,{key:safeKey,files:[]});
      map.get(safeKey).files.push({name:relative,dataUrl:await fileDataUrl(file)});
    }
    return [...map.values()];
  };
  const attachImages=(groups,nextRows)=>{
    return nextRows.map(row=>{
      const p=sourceProfile(row),key=imageStem(p.sku||p.name||"")||normalize(findField(row,["stylegroupid"]));
      const group=groups.find(g=>normKey(g.key)===normKey(key))||groups.find(g=>normKey(g.key).includes(normKey(key))||normKey(key).includes(normKey(g.key)));
      return {...row,__imageGroup:group||null};
    });
  };
  const onFile=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setError("");setStatus("Reading original marketplace Excel…");setProgress(0);setRows([]);setDownloadReady(false);setWorkbookName(file.name);setImageGroups([]);
    try{
      const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:"array"});setSourceWorkbook(wb);
      const sheetName=wb.SheetNames.find(n=>!/^__instructions$/i.test(String(n)))||wb.SheetNames[0];
      const sheet=wb.Sheets[sheetName];if(!sheet)throw new Error("No worksheet found in this Excel file.");
      const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:""});
      const detectedMarketplace=detectMarketplaceFromWorkbook(matrix,wb.SheetNames);
      if(!detectedMarketplace)throw new Error("EcomAI could not identify this marketplace template. Please upload the original marketplace Excel/template.");
      setMarketplace(detectedMarketplace);
      const headerIndex=matrix.slice(0,25).findIndex(row=>{
        const keys=(row||[]).map(x=>normKey(x));
        return (
          (keys.includes("vendorarticlenumber")||keys.includes("styleid")||keys.includes("vendorsku")) &&
          (keys.includes("vendorarticlename")||keys.includes("vendorarticlebrand")||keys.includes("articletype")||keys.includes("stylesizename"))
        );
      });
      const bestIndex=headerIndex>=0?headerIndex:matrix.slice(0,25).reduce((acc,row,i)=>{
        const count=(row||[]).filter(x=>normalize(x)).length;
        return count>(acc.count||0)?{index:i,count}:acc
      },{index:0,count:0}).index;
      const headerRow=(matrix[bestIndex]||[]).map((x,i)=>normalize(x)||("Column "+(i+1)));
      const dataRows=matrix.slice(bestIndex+1).filter(row=>(row||[]).some(x=>normalize(x))).slice(0,5000);
      const objects=dataRows.map((row,i)=>({...Object.fromEntries(headerRow.map((h,j)=>[h,normalize(row?.[j])])),__excelRow:bestIndex+2+i}));
      setTemplateMode(detectedMarketplace==="Myntra"&&headerIndex>=0);setTemplateFields(headerRow);setHeaders(headerRow);setSourceHeaderRow(bestIndex+1);setRows(objects);
      setStatus(objects.length?"Original "+detectedMarketplace+" Excel loaded. Existing rows and columns will be preserved.":"Original "+detectedMarketplace+" template loaded. Add Product Images Folder/ZIP to create product rows.");
    }catch(e){setError(e?.message||"Could not read the original Excel.");setStatus("")}
  };

  const applyImageGroups=async(groups)=>{
    if(!groups.length)throw new Error("No supported product images found.");
    setImageGroups(groups);
    setSimpleGenerationStarted(false);
    setGeneratedPreview([]);
    setRows([]);
    const isOriginalTemplate=!!sourceWorkbook&&templateMode&&headers.length>20;
    if(isOriginalTemplate){
      const sheetName=sourceWorkbook.SheetNames.find(n=>!/^__instructions$/i.test(String(n)))||sourceWorkbook.SheetNames[0];
      const sheet=sourceWorkbook.Sheets[sheetName];
      const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:""});
      const headerRowIndex=(sourceHeaderRow||3)-1;
      const templateHeaders=(matrix[headerRowIndex]||[]).map((x,i)=>normalize(x)||("Column "+(i+1)));
      const capacity=[];
      for(let r=headerRowIndex+1;r<Math.min(matrix.length,headerRowIndex+301);r++){
        const row=matrix[r]||[];
        const nonEmpty=row.filter(x=>normalize(x)).length;
        if(nonEmpty===0 || (nonEmpty<=2 && /^1\(\d+\)$/.test(normalize(row[0])))){
          capacity.push(r+1);
        }
      }
      if(capacity.length<groups.length){
        for(let r=Math.max(matrix.length+1,headerRowIndex+2);capacity.length<groups.length&&r<=headerRowIndex+groups.length+10;r++)capacity.push(r);
      }
      const targetRows=groups.map((g,i)=>{
        const excelRow=capacity[i]||((sourceHeaderRow||3)+1+i);
        const sourceRow=matrix[excelRow-1]||[];
        const obj=Object.fromEntries(templateHeaders.map((h,j)=>[h,normalize(sourceRow[j])]));
        // Seed the stable SKU fields from the image group so AI can build the listing
        // while preserving every original marketplace column.
        const skuHeaders=templateHeaders.filter(h=>/^(vendorskucode|skucode)$/i.test(normKey(h)));
        skuHeaders.forEach(h=>{if(!normalize(obj[h]))obj[h]=g.key});
        const articleHeaders=templateHeaders.filter(h=>/^(vendorarticlenumber)$/i.test(normKey(h)));
        articleHeaders.forEach(h=>{if(!normalize(obj[h]))obj[h]=g.key});
        return {...obj,__imageGroup:g,__excelRow:excelRow};
      });
      setHeaders(templateHeaders);setRows(targetRows);setTemplateMode(true);
      setStatus(groups.length+" product image groups matched to the original marketplace template. "+targetRows.length+" rows ready for AI generation.");
      return;
    }
    if(rows.length){
      const matched=attachImages(groups,rows);
      const matchedCount=matched.filter(r=>r.__imageGroup).length;
      setRows(matched);setStatus(groups.length+" product image groups loaded. "+matchedCount+" existing Excel rows matched.");
      return;
    }
    // Image-first workflow: keep image groups as the source of truth and do not create
    // temporary marketplace rows. The simple EcomAI listing is generated automatically
    // as soon as competitor references are ready.
    setRows([]);setHeaders([]);setTemplateMode(false);
    setStatus(groups.length+" product image groups ready. EcomAI will automatically generate the simple listing Excel.");
  };
  const onZip=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setError("");setZipError("");setStatus("Reading Product Images ZIP…");
    try{await applyImageGroups(await parseZip(file))}catch(e){setZipError(e?.message||"Could not read the image ZIP.");setStatus("")}
  };
  const onFolder=async(e)=>{
    const files=e.target.files;if(!files?.length)return;
    setError("");setZipError("");setStatus("Reading Product Images Folder…");
    try{await applyImageGroups(await parseImageFolder(files))}catch(e){setZipError(e?.message||"Could not read the image folder.");setStatus("")}
  };

  const marketplaceImageField=(field,platform)=>{
    const f=normKey(field);
    if(platform==="Myntra")return /frontimage|sideimage|backimage|detailangle|lookshotimage/.test(f);
    if(platform==="Amazon")return /mainimageurl|otherimageurl|imageurl|image1|image2|image3|image4|image5|image6|image7|image8/.test(f);
    if(platform==="Flipkart")return /image|imageurl|frontimage|sideimage|backimage/.test(f);
    if(platform==="Meesho")return /image|imageurl|catalogimage/.test(f);
    if(platform==="Shopify")return /image|src/.test(f);
    return false;
  };
  const uploadImage=async(file,groupKey,platform=marketplace)=>{
    if(!file?.dataUrl)return "";
    try{
      const r=await fetch("/api/listing-image-upload",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({imageData:file.dataUrl,filename:(groupKey+"_"+file.name.split("/").pop()).replace(/[^a-zA-Z0-9._-]+/g,"_")})});
      const j=await r.json();return j.ok?j.url:"";
    }catch{return ""}
  };
  const fetchUrlCopy=async(url)=>{
    const target=normalize(url);
    if(!target)return {};
    try{
      const r=await fetch("/api/analyze-url",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:target})});
      const j=await r.json();
      if(!j.ok)return {};
      const d=j.data||{};
      return {
        title:normalize(d.title),
        description:normalize(d.description),
        brand:normalize(d.brand),
        category:normalize(d.category),
        productType:normalize(d.productType),
        color:normalize(d.color),
        fabric:normalize(d.fabric),
        keywords:normalize(d.keywords)
      };
    }catch{return {}}
  };
  const analyzeImage=async(row,platform,mode,instruction,sourceOverride)=>{
    const group=row.__imageGroup;
    const image=group?.files?.[0];
    const source=sourceOverride||sourceProfile(row);
    const payload={platform,mode,instruction,source,imageData:image?.dataUrl||"",mimeType:image?.dataUrl?.match(/^data:([^;]+)/)?.[1]||"image/jpeg"};
    if(!image)return localDraft(row,platform);
    const r=await fetch("/api/listing-vision",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const j=await r.json();if(!j.ok)throw new Error(j.error||"Visual analysis failed.");
    return j.data||{};
  };
  const imageSlot=filename=>{
    const n=String(filename||"").toLowerCase();
    if(/(?:^|[_\-\s])(front|frontview|front-view)(?:[_\-\s.]|$)/.test(n))return "Front Image";
    if(/(?:^|[_\-\s])(side|sideview|side-view|45|45degree|45-degree)(?:[_\-\s.]|$)/.test(n))return "Side Image";
    if(/(?:^|[_\-\s])(back|backview|back-view)(?:[_\-\s.]|$)/.test(n))return "Back Image";
    if(/(?:^|[_\-\s])(detail|closeup|close-up|zoom)(?:[_\-\s.]|$)/.test(n))return "Detail Angle";
    if(/(?:^|[_\-\s])(look|lookshot|look-shot|lifestyle)(?:[_\-\s.]|$)/.test(n))return "Look Shot Image";
    return "";
  };
  const compressCompetitorScreenshot=async(file)=>{
    const src=await fileDataUrl(file);
    return await new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{
        const max=1200, scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
        const canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(img.naturalWidth*scale)); canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
        const ctx=canvas.getContext("2d"); ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",0.62));
      };
      img.onerror=()=>resolve(src); img.src=src;
    });
  };
  const readCompetitorScreenshots=async(files)=>{
    const incoming=[...files].filter(f=>/^image\/(?:png|jpeg|jpg|webp)$/i.test(f.type)&&f.size<=12*1024*1024);
    if(!incoming.length)throw new Error("Please upload JPG, PNG or WEBP competitor screenshots.");
    const remaining=Math.max(0,10-competitorScreenshots.length);
    if(!remaining)throw new Error("Maximum 10 competitor screenshots allowed.");
    const list=incoming.slice(0,remaining);
    const out=[...competitorScreenshots];
    for(const file of list)out.push({name:file.name,dataUrl:await compressCompetitorScreenshot(file)});
    setCompetitorScreenshots(out); setCompetitorError("");
    // Uploading screenshots only prepares the reference set. Analysis starts from the explicit Analyze button.
    return out;
  };
  const analyzeCompetitorSet=async(list=competitorScreenshots)=>{
    const urls=competitorUrls.map(x=>normalize(x)).filter(Boolean);
    if(urls.length<1&&list.length<1)throw new Error("Add at least 1 competitor link or upload a competitor screenshot.");
    setCompetitorLoading(true); setCompetitorError(""); setStatus("Analyzing competitor references…");
    try{
      const shots=list.map(x=>x.dataUrl).filter(Boolean);
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),120000);
      let r;
      try{
        r=await fetch("/api/listing-competitors",{
          method:"POST",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({urls,platform:marketplace,competitorScreenshots:shots}),
          signal:controller.signal
        });
      }catch(e){
        if(e?.name==="AbortError")throw new Error("Competitor analysis timed out. Please try again with fewer screenshots.");
        throw e;
      }finally{clearTimeout(timeout)}
      const j=await r.json().catch(()=>({ok:false,error:"Server returned an invalid response."}));
      if(!r.ok||!j.ok)throw new Error(j.error||("Competitor analysis failed (HTTP "+r.status+")."));
      const refs=Array.isArray(j.references)?j.references:[];
      const usable=refs.filter(x=>x&&((x.title||"").trim()||(x.description||"").trim()||(x.category||"").trim()||(x.brand||"").trim()));
      if(!usable.length)throw new Error("No usable competitor information was extracted. Try clearer screenshots.");
      setCompetitorRefs(usable);
      setStatus(usable.length+" competitor references loaded successfully.");
      return usable;
    }catch(e){
      setCompetitorRefs([]);
      setCompetitorError(e?.message||"Could not analyze competitor references.");
      throw e;
    }finally{setCompetitorLoading(false)}
  };

  const handleBuildMasterListing=async()=>{
    if(competitorLoading||processing)return;
    setCompetitorError(""); setError(""); setStatus("Starting EcomAI master listing…");
    try{
      const refs=await analyzeCompetitorSet(competitorScreenshots);
      if(!imageGroups.length){
        setStatus("Competitor analysis completed. Upload product images to build the master listing.");
        return;
      }
      setSimpleGenerationStarted(true);
      await fillRows(true,refs);
    }catch(e){
      setError(e?.message||"EcomAI master listing generation failed.");
      setStatus("");
    }
  };

  const loadCompetitorReferences=async()=>{
    setCompetitorError("");setCompetitorRefs([]);
    try{
      const urls=competitorUrls.map(x=>normalize(x)).filter(Boolean);
      if(urls.length>3)throw new Error("Maximum 3 competitor product links allowed.");
      if(urls.length<1&&competitorScreenshots.length<1)throw new Error("Add at least 1 competitor link or upload a competitor screenshot.");
      const invalid=urls.find(x=>{try{const u=new URL(x);return !/^https?:$/i.test(u.protocol)}catch{return true}});
      if(invalid)throw new Error("Each competitor reference must be a valid HTTP/HTTPS product URL.");
      if(new Set(urls).size!==urls.length)throw new Error("Please use different competitor product links.");
      await analyzeCompetitorSet(competitorScreenshots);
    }catch(e){
      setCompetitorRefs([]);
      setCompetitorError(e?.message||"Could not read competitor references.");
    }
  };

  const fillRows=async(imageOnly=false,referenceOverride=null)=>{
    if(!rows.length&&!imageGroups.length)return;
    if(competitorUrls.map(x=>normalize(x)).filter(Boolean).length<1&&competitorScreenshots.length<1){setError("Add at least 1 competitor link or upload a competitor screenshot.");return;}
    const activeReferences=referenceOverride||competitorRefs;
    if(!activeReferences.length){setError("Analyze the competitor link or upload competitor screenshots first.");return;}
    setProcessing(true);setError("");setStatus("Preparing image-first Listing Engine…");setProgress(0);setDownloadReady(false);
    const output=imageOnly?imageGroups.map(g=>({SKUCode:g.key,vendorSkuCode:g.key,__imageGroup:g})):rows.map(x=>({...x}));
    const preview=[];
    let referenceData=activeReferences;
    if(!referenceData.length){setError("Competitor analysis returned no usable reference data.");return;}
    let parallelAI=null;
    try{
      if(imageOnly){
        parallelAI=new Array(output.length);
        const concurrency=Math.min(3,output.length);
        setStatus("AI analyzing "+output.length.toLocaleString("en-IN")+" product images…");
        for(let start=0;start<output.length;start+=concurrency){
          const end=Math.min(start+concurrency,output.length);
          await Promise.all(output.slice(start,end).map(async(target,offset)=>{
            const index=start+offset;
            const source=sourceProfile(target);
            try{
              parallelAI[index]=await analyzeImage(target,"Generic",contentMode,customInstruction,{
                ...source,
                competitorReferences:referenceData
              });
            }catch(e){
              parallelAI[index]=localDraft(target,marketplace);
              if(!visionConfigured)setVisionConfigured(false);
            }
          }));
          setProgress(Math.round(end/output.length*70));
          setStatus("AI analyzed "+end.toLocaleString("en-IN")+" of "+output.length.toLocaleString("en-IN")+" product images…");
        }
      }
      for(let i=0;i<output.length;i++){
        const target=output[i],source=sourceProfile(target);
        const generatedMatch = !imageOnly
          ? generatedPreview.find(x=>normalize(x.sku)===normalize(source.sku||source.vendorSkuCode||target.SKUCode||target.vendorSkuCode||target.__imageGroup?.key))
          : null;
        let urlCopy={};
        if(source.sourceUrl && (!source.existingTitle||!source.existingDescription)){
          urlCopy=await fetchUrlCopy(source.sourceUrl);
        }
        const sourceWithUrl={
          ...source,
          competitorReferences:referenceData,
          urlTitle:urlCopy.title||"",
          urlDescription:urlCopy.description||"",
          urlBrand:urlCopy.brand||"",
          urlCategory:urlCopy.category||"",
          urlProductType:urlCopy.productType||"",
          urlColor:urlCopy.color||"",
          urlFabric:urlCopy.fabric||"",
          urlKeywords:urlCopy.keywords||""
        };
        let g;
        if(imageOnly){
          g=parallelAI?.[i]||localDraft(target,marketplace);
        }else{
          const activePlatform=marketplace;
          try{g=await analyzeImage(target,activePlatform,contentMode,customInstruction,sourceWithUrl)}
          catch(e){g=localDraft(target,marketplace);if(!visionConfigured)setVisionConfigured(false)}
        }
        const fallback=localDraft(target,marketplace);
        // Required simple-output fields: SKU comes from seller/image mapping; color comes from seller product image/source; copy comes from AI + competitor intelligence.
        const unwrap=(v)=>{
          if(v==null)return "";
          if(Array.isArray(v))return v.map(x=>unwrap(x)).filter(Boolean).join(", ");
          if(typeof v==="object")return Object.values(v).map(x=>unwrap(x)).filter(Boolean).join(", ");
          return normalize(v);
        };
        const pick=(...keys)=>{
          for(const k of keys){
            const v=g?.[k] ?? g?.attributes?.[k] ?? g?.listing?.[k] ?? g?.product?.[k];
            const s=unwrap(v); if(s)return s;
          }
          return "";
        };
        const aiTitle=pick("title","productDisplayName","productName"),aiDescription=pick("description","productDetails");
        const aiKeywords=pick("keywords","tags","searchKeywords");
        const aiBulletsRaw=g?.bullets ?? g?.keyFeatures ?? g?.features;
        const baseTitle=source.existingTitle||generatedMatch?.title||urlCopy.title||aiTitle||fallback.title;
        const baseDescription=source.existingDescription||generatedMatch?.description||urlCopy.description||aiDescription||fallback.description;
        const title=(contentMode==="enhance"&&aiTitle)?aiTitle:baseTitle;
        const description=(contentMode==="enhance"&&aiDescription)?aiDescription:baseDescription;
        const keywords=source.existingKeywords||generatedMatch?.keywords||urlCopy.keywords||aiKeywords||fallback.keywords;
        const bulletList=Array.isArray(aiBulletsRaw)?aiBulletsRaw.map(unwrap).filter(Boolean):[];
        const bullets=bulletList.length?bulletList:fallback.bullets;
        const aiField=(...keys)=>pick(...keys);
        const value=(patterns,v,force=false)=>{
          if(!v)return;
          const keyNorm=x=>String(x||"").toLowerCase().replace(/[^a-z0-9]+/g,"");
          const ps=(patterns||[]).map(keyNorm).filter(Boolean);
          const h=headers.find(x=>ps.some(p=>keyNorm(x).includes(p)));
          if(h&&(force||!normalize(target[h])))target[h]=v;
        };
        if(contentMode!=="fill"){
          value(["vendor article name","product name","item name","product title","listing title","product display name","title"],title);
          value(["product details","style note","listing description","product description","long description","description","body html"],description);
          value(["search keyword","search term","generic keyword","backend keyword","keywords","tags"],keywords);
          value(["prominent colour","prominent color","brand colour","brand color","color","colour"],aiField("color","colour")||urlCopy.color||fallback.color);
          value(["fabric","material","fabric type","top fabric","bottom fabric"],aiField("fabric","material")||urlCopy.fabric||fallback.fabric);
          value(["category","product type","department","article type"],aiField("category","productType")||urlCopy.category||fallback.category);
          value(["gender","target gender"],aiField("gender")||fallback.gender);
          value(["pattern","print or pattern type","top pattern"],aiField("pattern"));
          value(["neck"],aiField("neckline","neck"));
          value(["sleeve length","sleeve styling"],aiField("sleeveType","sleeveLength"));
          value(["occasion"],aiField("occasion"));
          value(["body or garment size"],aiField("visibleSizes","fit"));
          value(["product display name"],title);
          value(["product details"],description);
        }else{
          value(["vendor article name","product name","item name","product title","listing title","product display name","title"],title);
          value(["product details","style note","listing description","product description","long description","description","body html"],description);
          value(["search keyword","search term","generic keyword","backend keyword","keywords","tags"],keywords);
        }
        const bulletHeaders=headers.filter(h=>/bullet|key feature|feature [1-9]|highlights?/i.test(h));
        bullets.filter(Boolean).slice(0,5).forEach((b,k)=>{if(bulletHeaders[k]&&!normalize(target[bulletHeaders[k]]))target[bulletHeaders[k]]=b});
        const color=aiField("color","colour")||generatedMatch?.color||fallback.color||"";
        const fabric=aiField("fabric","material")||generatedMatch?.dynamicAttributes?.Fabric||fallback.fabric||"";
        const productType=aiField("productType","type")||generatedMatch?.dynamicAttributes?.["Product Type"]||urlCopy.productType||fallback.type||"";
        const category=aiField("category")||generatedMatch?.dynamicAttributes?.Category||urlCopy.category||fallback.category||"";
        const pattern=aiField("pattern")||generatedMatch?.dynamicAttributes?.Pattern||"";
        const group=target.__imageGroup;
        if(group&&!imageOnly){
          const assigned=new Set();
          for(const file of group.files){
            const slot=imageSlot(file.name);
            const exact=slot?headers.find(x=>normKey(x)===normKey(slot)):null;
            if(exact&&!normalize(target[exact])){
              target[exact]=await uploadImage(file,group.key,marketplace);assigned.add(exact);continue;
            }
          }
          const imageHeaders=headers.filter(h=>marketplaceImageField(h,marketplace));
          const orderedFiles=[...group.files].sort((a,b)=>{
            const sa=imageSlot(a.name),sb=imageSlot(b.name);
            const order=x=>({ "Front Image":0,"Side Image":1,"Back Image":2,"Detail Angle":3,"Look Shot Image":4 }[x]??9);
            return order(sa)-order(sb);
          });
          let fi=0;
          for(const h of imageHeaders){
            if(assigned.has(h)||normalize(target[h]))continue;
            const file=orderedFiles[fi++];
            if(!file)break;
            target[h]=await uploadImage(file,group.key,marketplace);
          }
        }
        const imageValue=()=>{const h=headers.find(x=>/front image|image url|product image/i.test(x));return h?normalize(target[h]):(group?.files?.[0]?.dataUrl||"")};
        const dynamicAttributes={};
        const rawAttrs=(g&&typeof g.attributes==="object"&&!Array.isArray(g.attributes))?g.attributes:{};
        Object.entries(rawAttrs).forEach(([k,v])=>{const sv=unwrap(v);if(sv)dynamicAttributes[k]=sv});
        preview.push({sku:source.sku||source.vendorSkuCode||target.SKUCode||target.vendorSkuCode||target.__imageGroup?.key||"",title,description,keywords,color,image:imageValue(),dynamicAttributes});
        setProgress(imageOnly?70+Math.round((i+1)/output.length*30):Math.round((i+1)/output.length*100));setStatus((contentMode==="enhance"?"Processing ":"Building ")+(i+1).toLocaleString("en-IN")+" of "+output.length.toLocaleString("en-IN")+" listings…");
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      setRows(output);setGeneratedPreview(preview);setDownloadReady(true);setStatus("Completed "+output.length.toLocaleString("en-IN")+" listings. Review the EcomAI master listing below.");
    }catch(e){setError(e?.message||"Listing generation failed.");setStatus("")}
    finally{setProcessing(false)}
  };
  React.useEffect(()=>{
    if(imageGroups.length&&competitorRefs.length&&!rows.length&&!simpleGenerationStarted&&!processing){
      setSimpleGenerationStarted(true);
      fillRows(true);
    }
  },[imageGroups,competitorRefs,rows.length,simpleGenerationStarted,processing]);
  const contentStats=React.useMemo(()=>{
    let title=0,description=0,keywords=0;
    rows.forEach(row=>{const p=sourceProfile(row);if(p.existingTitle)title++;if(p.existingDescription)description++;if(p.existingKeywords)keywords++});
    return {title,description,keywords};
  },[rows,headers]);
  const downloadSimpleExcel=(dataOverride=null)=>{
    const sourceData=dataOverride||generatedPreview;
    if(!sourceData.length)return;
    try{
      const dynamicKeys=[...new Set(sourceData.flatMap(x=>Object.keys(x.dynamicAttributes||{})))].filter(Boolean);
      const headersOut=["Product Image","SKU","Color","Title","Description","Keywords",...dynamicKeys];
      const data=[["EcomAI Generated Listings"],["Simple AI listing output. Core fields are fixed; additional attribute columns are generated dynamically from the product/competitor evidence."],[],headersOut];
      sourceData.forEach(x=>data.push([x.image||"",x.sku||"",x.color||"",x.title||"",x.description||"",x.keywords||"",...dynamicKeys.map(k=>x.dynamicAttributes?.[k]||"")]));
      const ws=XLSX.utils.aoa_to_sheet(data);
      ws["!cols"]=headersOut.map((h,i)=>({wch:i===0?55:i===4?70:i===5?55:Math.min(45,Math.max(18,String(h).length+5))}));
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"EcomAI Listings");
      XLSX.writeFile(wb,"EcomAI_Generated_Listings.xlsx");
      setStatus("Simple EcomAI Excel downloaded.");
    }catch(e){setError(e?.message||"Could not create the simple Excel.")}
  };
  const downloadOriginalExcel=()=>{
    if(!rows.length||!sourceWorkbook)return;
    try{
      const wb=sourceWorkbook;
      const previewName="EcomAI Preview";
      if(wb.SheetNames.includes(previewName))delete wb.Sheets[previewName];
      const dynamicKeys=[...new Set(generatedPreview.flatMap(x=>Object.keys(x.dynamicAttributes||{})))].filter(Boolean);
      const headersOut=["Product Image","SKU","Color","Title","Description","Keywords",...dynamicKeys];
      const data=[["EcomAI Generated Listing Preview"],["Generated content is separate; original marketplace sheets are preserved."],[],headersOut];
      generatedPreview.forEach(x=>data.push([x.image||"",x.sku||"",x.color||"",x.title||"",x.description||"",x.keywords||"",...dynamicKeys.map(k=>x.dynamicAttributes?.[k]||"")]));
      const ws=XLSX.utils.aoa_to_sheet(data);wb.Sheets[previewName]=ws;wb.SheetNames.push(previewName);
      XLSX.writeFile(wb,workbookName||"Myntra-Sku-Template-EcomAI.xlsx");
      setStatus("Marketplace Excel created with the original sheets preserved.");
    }catch(e){setError(e?.message||"Could not create the marketplace Excel.")}
  };
  const sample=()=>{
    const demo=[{SKU:"DEMO-001",Brand:"Demo Brand","Product Name":"Floral Printed Kurta Set","Listing Title":"Floral Printed Cotton Kurta Set for Women",Description:"Cotton kurta set with floral print.","Search Keywords":"cotton kurta set, floral kurta"},{SKU:"DEMO-002",Brand:"Demo Brand","Product Name":"Solid Straight Kurta",Category:"Kurta",Color:"Blue",Fabric:"Rayon"}];
    setTemplateMode(false);setHeaders(Object.keys(demo[0]));setRows(demo);setWorkbookName("Demo marketplace sheet");setStatus("Demo loaded. Existing content can be enhanced or missing content can be filled.");setError("");setDownloadReady(false);
  };
  return <div className="content">
    <ModuleHeader title="Listing AI" sub="First analyze competitor references and upload product images. EcomAI then creates the simple listing automatically; upload the marketplace template only afterward. EcomAI uses seller content first and image intelligence only where needed — no Puter."/>
    <div className="module3-toolbar"><button className="ghost" onClick={onBack}>← Back to Competitor & Market</button><span><CheckCircle2 size={14}/> 1 listing = 1 listing credit</span></div>
    <section className="listing-killer-hero"><div className="listing-killer-copy"><span className="eyebrow">THE LISTING ENGINE</span><h2>Excel + product images in.<br/>Marketplace listing out.</h2><p>EcomAI detects whether the Excel is a real product sheet or a marketplace attribute template. Product images are matched by SKU folder names. Existing seller title and description are preserved or enhanced; missing content can be created from the product image.</p><div className="listing-promise"><span>1–5,000 listings</span><span>Image ZIP matching</span><span>No Puter dependency</span></div></div><div className="listing-credit-card"><span>PAY PER LISTING</span><strong>1 listing = 1 credit</strong><small>Credits are consumed only for listings processed by the Listing Engine.</small><div><b>{rows.length.toLocaleString("en-IN")}</b><span>credits required for this file</span></div></div></section>
    <section className="listing-step-card competitor-reference-card">
      <div className="listing-step-head"><div><span className="eyebrow">PRODUCT REFERENCE INTELLIGENCE</span><h3>Competitor references <small className="optional-label">link OR screenshot · up to 3 links / 10 screenshots</small></h3><p>Use a competitor link first. If the page is blocked/private, upload screenshots instead. If the link works, screenshots are not required. EcomAI combines both when both are available.</p></div><span className="row-count">{competitorRefs.length?competitorRefs.length+" references loaded":competitorScreenshots.length?competitorScreenshots.length+" screenshots ready":"Link or screenshot"}</span></div>
      <div className="competitor-link-grid">
        {competitorUrls.map((url,i)=><div className="competitor-link-input" key={i}><span>{i+1}</span><Link2 size={16}/><input value={url} onChange={e=>setCompetitorUrls(prev=>prev.map((x,j)=>j===i?e.target.value:x))} placeholder={"Competitor product link "+(i+1)}/></div>)}
      </div>
      <div className="reference-actions">{competitorRefs.length>0&&<span className="reference-ready"><CheckCircle2 size={15}/> {competitorRefs.length} references ready for automatic listing generation</span>}{competitorLoading&&<span className="reference-processing"><LoaderCircle size={15} className="spin"/> EcomAI is analyzing competitor screenshots/references…</span>}{competitorError&&!competitorScreenshots.length&&<span className="reference-error"><AlertCircle size={15}/> {competitorError}</span>}</div>
      <div className="competitor-fallback"><div className="fallback-head"><div><strong>Competitor screenshots</strong><small>If the competitor link is blocked/private, upload screenshots so EcomAI can analyze the listing visually.</small></div><label className="upload-mini"><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={async e=>{try{await readCompetitorScreenshots(e.target.files)}catch(err){setCompetitorError(err.message)}}}/><ImageIcon size={16}/> {competitorScreenshots.length?"Add more":"Upload screenshots"}</label></div>{competitorScreenshots.length>0&&<div className="competitor-shot-grid">{competitorScreenshots.map((x,i)=><div className="competitor-shot" key={x.name+i}><img src={x.dataUrl} alt={"Competitor screenshot "+(i+1)}/><button type="button" onClick={()=>setCompetitorScreenshots(prev=>prev.filter((_,j)=>j!==i))}>Remove</button><span>Screenshot {i+1}</span></div>)}</div>}{competitorScreenshots.length===0&&<label className="excel-drop compact-drop"><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={async e=>{try{await readCompetitorScreenshots(e.target.files)}catch(err){setCompetitorError(err.message)}}}/><ImageIcon size={20}/><strong>Upload Competitor Screenshot(s)</strong><small>1–10 · JPG / PNG / WEBP</small></label>}</div>{competitorRefs.length>0&&<div className="reference-preview">{competitorRefs.map((r,i)=><div key={i}><strong>{r.title||"Reference product"}</strong><small>{r.category||r.productType||"Product reference"}{r.color?" · "+r.color:""}{r.fabric?" · "+r.fabric:""}</small></div>)}</div>}
    </section>
    <section className="listing-workspace">
      <div className="listing-step-card"><div className="listing-step-head"><div><span className="eyebrow">STEP 2</span><h3>Upload Product Images Folder or ZIP</h3><p>Select the actual product-image folder directly, or upload a ZIP. Use one product folder per SKU, e.g. <b>LOOK-001/front.jpg</b>, <b>LOOK-001/back.jpg</b>.</p></div><span className="row-count">{imageGroups.length?imageGroups.length+" product groups":"Required for image-first AI"}</span></div><div className="image-source-actions"><label className={"excel-drop compact-drop "+(imageGroups.length?"has-file":"")}><input type="file" ref={folderRef} webkitdirectory="" directory="" multiple onChange={onFolder}/><ImageIcon size={22}/><strong>Choose Product Images Folder</strong><small>Direct folder upload · JPG / PNG / WEBP</small></label><label className={"excel-drop compact-drop "+(imageGroups.length?"has-file":"")}><input ref={zipRef} type="file" accept=".zip" onChange={onZip}/><ImageIcon size={22}/><strong>Choose Images ZIP</strong><small>ZIP with SKU folders or flat SKU filenames</small></label></div>{imageGroups.length>0&&<div className="reference-ready"><CheckCircle2 size={15}/> {imageGroups.length} product image groups loaded</div>}{zipError&&<div className="listing-error"><AlertCircle size={15}/>{zipError}</div>}</div>
      {imageGroups.length>0&&competitorScreenshots.length>0&&<div className="master-build-cta"><div><span className="eyebrow">ECOMAI READY</span><strong>Competitor references + product images are ready</strong><small>Now EcomAI can analyze both sources and build the Master Listing.</small></div><button type="button" className="primary analyze-reference-btn analyze-reference-large" onClick={handleBuildMasterListing} disabled={competitorLoading||processing}><Sparkles size={17}/>{competitorLoading||processing?"Building Master Listing…":"Build EcomAI Master Listing"}</button></div>}
      {rows.length>0&&<div className="listing-step-card"><div className="listing-preview-head"><div><span className="eyebrow">STEP 3</span><h3>{(contentStats.title+contentStats.description+contentStats.keywords)===0?"Marketplace template detected — original sheet will stay untouched":"Existing listing content"}</h3><p>{(contentStats.title+contentStats.description+contentStats.keywords)===0?"No seller title, description or keywords are present in the uploaded template. The simple EcomAI listing is generated automatically before the marketplace template is uploaded. This step only shows the original template data after upload.":"Seller-provided title, description and keywords are detected automatically. EcomAI will not overwrite existing copy in Fill Missing mode."}</p></div><span className="row-count">{rows.length.toLocaleString("en-IN")} products</span></div><div className="content-detection-grid"><div><span>Existing Titles</span><b>{contentStats.title}/{rows.length}</b></div><div><span>Existing Descriptions</span><b>{contentStats.description}/{rows.length}</b></div><div><span>Existing Keywords</span><b>{contentStats.keywords}/{rows.length}</b></div><div><span>Images</span><b>{imageGroups.length?imageGroups.length:"—"}</b></div></div><div className="listing-mode-single"><div className="listing-mode-selected"><span className="mode-icon">✦</span><div><strong>Generate Listing</strong><span>EcomAI will analyze the competitor reference, product image and available product data, then create the required listing content.</span></div><span className="mode-badge">Automatic</span></div></div><div className="listing-instruction"><label>Optional seller instruction <small>Example: “Premium tone, focus on office wear, no discount claims.”</small></label><textarea value={customInstruction} onChange={e=>setCustomInstruction(e.target.value)} placeholder="Tell EcomAI how you want the listing written…"></textarea></div></div>}
      {(competitorLoading||processing)&&<div className="competitor-processing-modal" role="status" aria-live="polite">
        <div className="competitor-processing-backdrop"/>
        <div className="competitor-processing-dialog">
          <div className="competitor-processing-icon"><LoaderCircle size={28} className="spin"/></div>
          <span className="eyebrow">ECOMAI PROCESSING</span>
          <h3>Analyzing competitor references…</h3>
          <p>EcomAI is extracting product language, attributes, patterns and market signals from your competitor screenshots.</p>
          <div className="competitor-processing-bar"><i/></div>
          <small>Please keep this page open. You can continue after the analysis is complete.</small>
        </div>
      </div>}
      {competitorLoading&&<div className="listing-step-card ecomai-processing-card"><div className="listing-preview-head"><div><span className="eyebrow">ECOMAI PROCESSING</span><h3>Analyzing competitor references…</h3><p>EcomAI is reading your competitor links/screenshots before starting the product-image listing.</p></div><span className="row-count"><LoaderCircle size={15} className="spin"/> In progress</span></div><div className="processing-steps"><span className="done">✓ Reading competitor references</span><span className="done">✓ Analyzing screenshots</span><span>○ Building market-language signals</span><span>○ Preparing product listing</span></div></div>}
      {processing&&imageGroups.length>0&&rows.length===0&&<div className="listing-step-card ecomai-processing-card"><div className="listing-preview-head"><div><span className="eyebrow">ECOMAI PROCESSING</span><h3>Preparing your Simple EcomAI Listing Excel…</h3><p>EcomAI is analyzing your product images and competitor intelligence and building the master listing. Please keep this page open.</p></div><span className="row-count"><LoaderCircle size={15} className="spin"/> {progress}%</span></div><div className="listing-progress"><div className="listing-progress-top"><span>{status||"Starting EcomAI analysis…"}</span><b>{progress}%</b></div><div><i style={{width:progress+"%"}}/></div></div><div className="processing-steps"><span className={progress>0?"done":""}>✓ Reading product images</span><span className={progress>=25?"done":""}>✓ Analyzing competitor references</span><span className={progress>=50?"done":""}>✓ Generating product attributes</span><span className={progress>=75?"done":""}>✓ Creating title, description & keywords</span><span className={progress>=100?"done":""}>✓ Preparing Excel download</span></div></div>}
      {generatedPreview.length>0&&<div className="listing-step-card generated-preview-card"><div className="listing-preview-head"><div><span className="eyebrow">STEP 3 · AUTOMATIC</span><h3>Simple EcomAI master listing ready</h3><p>આ preview competitor intelligence + your product image પરથી બનાવાયું છે. આ original marketplace sheet થી completely separate છે.</p></div><span className="row-count">{generatedPreview.length} generated</span></div><div className="generated-preview-table"><table><thead><tr><th>Product Image</th><th>SKU</th><th>Color</th><th>Title</th><th>Description</th><th>Keywords</th>{[...new Set(generatedPreview.flatMap(x=>Object.keys(x.dynamicAttributes||{})))].map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{generatedPreview.slice(0,10).map((x,i)=><tr key={i}><td>{x.image?<img src={x.image} alt="" style={{width:70,height:70,objectFit:"contain"}}/>:"—"}</td><td>{x.sku||"—"}</td><td>{x.color||"—"}</td><td>{x.title||"—"}</td><td>{x.description||"—"}</td><td>{x.keywords||"—"}</td>{[...new Set(generatedPreview.flatMap(y=>Object.keys(y.dynamicAttributes||{})))].map(k=><td key={k}>{x.dynamicAttributes?.[k]||"—"}</td>)}</tr>)}</tbody></table></div><p className="preview-note">આ master listing અહીં review કરવા માટે ready છે. Excel download કરવું હોય તો નીચેના Download Simple Excel buttonથી કરી શકો. Marketplace template હજુ upload કરવાનું નથી; તે પછી Step 4 માં આવશે.</p></div>}{generatedPreview.length>0&&<div className="listing-step-card"><div className="listing-step-head"><div><span className="eyebrow">STEP 4</span><h3>Upload marketplace template</h3><p>Upload the original marketplace Excel only after the simple EcomAI listing has been generated. EcomAI will merge the generated listing into the original marketplace structure.</p></div>{marketplace&&<span className="row-count">{marketplace} detected</span>}</div><label className={"excel-drop "+(workbookName?"has-file":"")}><input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile}/><FileText size={25}/><strong>{workbookName||"Drop marketplace Excel here or click to upload"}</strong><small>.XLSX / .XLS / .CSV · marketplace detection is automatic</small><button type="button" className="outline" onClick={e=>{e.preventDefault();inputRef.current?.click()}}>Choose Marketplace Excel</button></label></div>}{rows.length>0&&<div className="listing-step-card"><div className="listing-preview-head"><div><span className="eyebrow">STEP 5</span><h3>Existing marketplace data & field mapping</h3><p>Original marketplace fields stay intact. EcomAI fills known fields and image URLs using the detected marketplace rules.</p></div><span className="row-count">{templateMode?"Marketplace template":"Product data sheet"}</span></div><div className="mapping-grid">{(rules[marketplace]?.required||headers.slice(0,8)).map(field=><div key={field}><span>{field}</span><b>Auto-fill / AI</b></div>)}</div><div className="sheet-preview"><table><thead><tr>{headers.slice(0,8).map(h=><th key={h}>{h}</th>)}{headers.length>8&&<th>+{headers.length-8} more</th>}</tr></thead><tbody>{rows.slice(0,4).map((row,i)=><tr key={i}>{headers.slice(0,8).map(h=><td key={h}>{normalize(row[h]).slice(0,70)||"—"}</td>)}{headers.length>8&&<td>…</td>}</tr>)}</tbody></table></div></div>}
      {rows.length>0&&<div className="listing-action-card"><div><span className="eyebrow">STEP 6</span><h3>Generate final marketplace listing automatically</h3><p>No Puter. EcomAI sends the matched product image plus seller data to the Listing Vision engine. Image analysis is used only for attributes that are not already supplied.</p></div><div className="listing-action-side"><div><span>Listings</span><b>{rows.length.toLocaleString("en-IN")}</b></div><div><span>Credits</span><b>{rows.length.toLocaleString("en-IN")}</b></div><button className="primary" onClick={fillRows} disabled={processing}>{processing?<><LoaderCircle size={16} className="spin"/> Processing {progress}%</>:<>{contentMode==="enhance"?"Enhance":contentMode==="fill"?"Fill missing":"Generate"} {rows.length.toLocaleString("en-IN")} listings <ArrowRight size={16}/></>}</button></div>{(processing||status)&&<div className="listing-progress"><div className="listing-progress-top"><span>{status}</span><b>{progress}%</b></div><div><i style={{width:progress+"%"}}/></div></div>}</div>}
      {downloadReady&&<div className="listing-complete-card"><div className="complete-icon"><CheckCircle2 size={20}/></div><div><span className="eyebrow">AI LISTING READY</span><h3>{rows.length.toLocaleString("en-IN")} listings generated</h3><p>The master listing is ready in the app. Download the Simple EcomAI Excel only if you want it; the original marketplace Excel stays separate and can be created later.</p></div><div className="complete-actions"><button className="primary" onClick={downloadSimpleExcel}>Download Simple Excel <ArrowRight size={16}/></button><button className="secondary" onClick={downloadOriginalExcel}>Create Marketplace Excel</button></div></div>}
    </section>
  </div>
}

function App(){
  const saved=React.useMemo(()=>loadWorkflow(),[]);
  const [module,setModule]=React.useState(saved.module??0);
  const [url,setUrl]=React.useState(saved.url||saved.productUrl||"");
  const [detected,setDetected]=React.useState(saved.detected||((saved.url||saved.productUrl)?detectPlatform(saved.url||saved.productUrl):null));
  const [confirmed,setConfirmed]=React.useState(saved.confirmed||false);
  const [connections,setConnections]=React.useState(saved.connections||{});
  const [modal,setModal]=React.useState(null);
  const [notice,setNotice]=React.useState("");
  const [analyzed,setAnalyzed]=React.useState(saved.analyzed||null);
  React.useEffect(()=>{saveWorkflow({module,url,detected,confirmed,connections,analyzed})},[module,url,detected,confirmed,connections,analyzed]);
  const state={url,setUrl,detected,setDetected,confirmed,setConfirmed,connections,setConnections,modal,setModal,notice,setNotice,setModule};
  if(module===1) return <div className="app-shell"><Sidebar active="Marketplace" onModule={setModule}/><main className="content"><MarketplaceConnection state={state}/></main></div>;
  if(module===2) return <div className="app-shell"><Sidebar active="Marketplace" onModule={setModule}/><ProductImport platform={detected} url={url} onBack={()=>setModule(1)} setModule={setModule} analyzed={analyzed} setAnalyzed={setAnalyzed} notice={notice} setNotice={setNotice}/></div>;
  if(module===3) return <div className="app-shell"><Sidebar active="Competitor" onModule={setModule}/><MarketPlaceholder onBack={()=>setModule(2)} product={analyzed}/></div>;
  if(module===4) return <div className="app-shell"><Sidebar active="ListingAI" onModule={setModule}/><ListingAI onBack={()=>setModule(3)} product={analyzed}/></div>;
  if(module===5) return <div className="app-shell"><Sidebar active="ImageGenerator" onModule={setModule}/><main className="content"><ModuleHeader title="Image Generator" sub="Create product model poses without leaving EcomAI Pro."/><ImageGenerator product={analyzed||{}}/></main></div>;
  if(module===6) return <div className="app-shell"><Sidebar active="Settings" onModule={setModule}/><main className="content"><ModuleHeader title="Settings" sub="EcomAI Pro workspace settings."/><section className="module-card"><h3>Workspace settings</h3><p className="helper">Marketplace and integration settings will live here.</p></section></main></div>;
  return <div className="app-shell"><Sidebar active="Dashboard" onModule={setModule}/><main className="content"><ModuleHeader title="Dashboard" sub="Your ecommerce intelligence workspace."/><section className="hero-card"><div className="hero-copy"><span className="eyebrow">ECOMAI PRO</span><h2>Start with any marketplace product.</h2><p>Analyze a product, research real competitors and generate model images from the same workspace.</p><button className="primary" onClick={()=>setModule(1)}>Open Marketplace <ArrowRight size={16}/></button></div></section></main></div>;
}

createRoot(document.getElementById("root")).render(<App/>);