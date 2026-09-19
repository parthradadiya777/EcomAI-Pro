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
  const onFile=e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setError("");setResults([]);
    setReference(file);
    const reader=new FileReader();
    reader.onload=()=>setPreview(String(reader.result||""));
    reader.readAsDataURL(file);
  };
  const generate=async()=>{
    setAttempted(true);
    if(!preview){setError("Please upload a product reference image before generating.");return}
    setGenerating(true);setError("");
    try{
      if(!window.puter?.ai?.txt2img)throw new Error("Image engine is still loading. Please wait a moment and try again.");
      const prompt="Edit the supplied product reference for a fashion e-commerce catalog image. "+(
        {"Front standing":"full-body front standing fashion e-commerce pose, relaxed arms, straight posture","45° side":"full-body 45-degree side fashion e-commerce pose, natural posture","Walking":"full-body natural walking fashion e-commerce pose, realistic movement","Hand on waist":"full-body fashion e-commerce pose with one hand on waist","Slight turn":"full-body slight body turn, fashion e-commerce pose, natural posture","Back / over-the-shoulder":"full-body back view with a natural over-the-shoulder pose"}[pose]||"full-body front standing fashion e-commerce pose"
      )+". CRITICAL PRODUCT LOCK: keep the garment/product 100% identical to the supplied reference — same design, color, fabric appearance, print, embroidery, pattern, neckline, sleeves, length, fit, proportions and every visible product detail. Do not redesign, recolor, remove, add or alter any product detail. Change only the human model/face, pose and a clean premium studio background. Photorealistic, natural anatomy, realistic fabric drape, sharp product details, clean commercial lighting, no text, no watermark.";
      const image=await window.puter.ai.txt2img(prompt,{model:"gemini-3.1-flash-image-preview",input_image:preview,ratio:{w:2,h:3}});
      const imageData=image?.src||"";
      if(!imageData)throw new Error("Image engine returned no generated image.");
      setResults(prev=>[...prev.filter(x=>x.pose!==pose),{pose,imageData}]);
    }catch(e){setError(e?.message||"Image generation failed. Please try again.")}
    finally{setGenerating(false)}
  };
  const dataUrlToJpg=async(dataUrl)=>{
    const blob=await fetch(dataUrl).then(r=>r.blob());
    const bitmap=await createImageBitmap(blob);
    const canvas=document.createElement("canvas");
    canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext("2d");
    ctx.drawImage(bitmap,0,0);
    bitmap.close?.();
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("JPG conversion failed.")),"image/jpeg",0.92));
  };
  const downloadZip=async()=>{
    if(!results.length)return;
    setZipping(true);setError("");
    try{
      const zip=new JSZip();
      for(const item of results){
        const jpg=await dataUrlToJpg(item.imageData);
        zip.file("EcomAI_"+item.pose.replace(/[^a-z0-9]+/gi,"_")+".jpg",jpg);
      }
      const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download="EcomAI_Image_Generator_JPG.zip";document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(e){setError(e.message||"ZIP creation failed.")}
    finally{setZipping(false)}
  };
  const downloadJpg=async(item)=>{
    try{
      const jpg=await dataUrlToJpg(item.imageData);
      const url=URL.createObjectURL(jpg);
      const a=document.createElement("a");
      a.href=url;a.download="EcomAI_"+item.pose.replace(/[^a-z0-9]+/gi,"_")+".jpg";document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(e){setError(e.message||"JPG download failed.")}
  };
  return <section className="image-generator-card">
    <div className="image-generator-head"><div><span className="eyebrow">IMAGE GENERATOR</span><h3>Generate model images</h3><p>Upload the exact product reference, choose a pose, and generate catalog-ready model images. Generated downloads are JPG.</p></div><span className="pricing-badge">6 poses · JPG</span></div>
    <div className="image-generator-body">
      <label className={"image-upload-box "+(attempted&&!preview?"upload-error":"")}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile}/>{preview?<img className="generator-preview" src={preview} alt="Product reference"/>:<ImageIcon size={22}/>}<strong>{reference?reference.name:"Upload product reference"}</strong><small>PNG / JPG / WEBP · max 10 MB</small></label>
      <div className="pose-panel"><span>Choose pose</span><div className="pose-grid">{poses.map(x=><button type="button" key={x} className={pose===x?"active":""} onClick={()=>setPose(x)}>{x}{results.some(r=>r.pose===x)&&<small className="pose-done">✓ Ready</small>}</button>)}</div><button className="primary generate-btn" onClick={generate} disabled={generating}>{generating?<><LoaderCircle size={16} className="spin"/> Generating…</>:<>Generate {pose}</>}</button><small className="generator-note">Generated poses kept here: <b>{results.length}/6</b>. You can replace any pose by generating it again.</small>{error&&<div className="generator-error"><AlertCircle size={14}/>{error}</div>}</div>
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
  const [marketplace,setMarketplace]=React.useState("Myntra");
  const [workbookName,setWorkbookName]=React.useState("");
  const [rows,setRows]=React.useState([]);
  const [headers,setHeaders]=React.useState([]);
  const [status,setStatus]=React.useState("");
  const [error,setError]=React.useState("");
  const [progress,setProgress]=React.useState(0);
  const [processing,setProcessing]=React.useState(false);
  const [downloadReady,setDownloadReady]=React.useState(false);
  const [contentMode,setContentMode]=React.useState("enhance");
  const [customInstruction,setCustomInstruction]=React.useState("");
  const inputRef=React.useRef(null);

  const rules={
    Myntra:{label:"Myntra",required:["SKU / Style ID","Product Name","Brand","Color","Fabric / Material","Description","Search Keywords"],maxTitle:80},
    Amazon:{label:"Amazon",required:["SKU","Item Name","Brand","Bullet Points","Product Description","Generic Keywords"],maxTitle:200},
    Flipkart:{label:"Flipkart",required:["Seller SKU","Product Title","Brand","Color","Material","Description","Search Keywords"],maxTitle:120},
    Meesho:{label:"Meesho",required:["SKU","Product Name","Category","Color","Material","Description","Search Keywords"],maxTitle:100},
    Shopify:{label:"Shopify",required:["Handle","Title","Body HTML","Product Type","Tags"],maxTitle:255}
  };
  const normalize=v=>String(v??"").replace(/\\s+/g," ").trim();
  const findField=(obj,patterns)=>{
    for(const [k,v] of Object.entries(obj||{})){
      const nk=k.toLowerCase().replace(/[^a-z0-9]+/g," ");
      if(patterns.some(p=>nk.includes(p)))return normalize(v);
    }
    return "";
  };
  const findMany=(obj,patterns)=>{
    return Object.entries(obj||{}).filter(([k,v])=>{
      const nk=k.toLowerCase().replace(/[^a-z0-9]+/g," ");
      return patterns.some(p=>nk.includes(p))&&normalize(v);
    }).map(([,v])=>normalize(v)).filter(Boolean);
  };
  const sourceProfile=row=>({
    sku:findField(row,["sku","style id","seller sku","item sku","product id","style code"]),
    brand:findField(row,["brand","brand name"]),
    name:findField(row,["product name","item name","product title","style name","name"]),
    existingTitle:findField(row,["listing title","listing name","seo title","catalog title","product title","item name","title"]),
    category:findField(row,["category","product type","product category","department"]),
    type:findField(row,["product type","type","sub category"]),
    color:findField(row,["color","colour"]),
    fabric:findField(row,["fabric","material","fabric type"]),
    pattern:findField(row,["pattern","print","design","occasion"]),
    gender:findField(row,["gender","target gender"]),
    size:findField(row,["size","size name"]),
    existingDescription:findField(row,["listing description","seo description","product description","long description","description","body html"]),
    existingBullets:findMany(row,["bullet","key feature","feature 1","feature 2","feature 3","feature 4","feature 5","highlight"]),
    existingKeywords:findField(row,["search keyword","search term","generic keyword","backend keyword","keywords","tags"]),
  });
  const localDraft=(row,platform,mode)=>{
    const p=sourceProfile(row);
    const title=p.existingTitle||[p.brand,p.name||p.type,p.color,p.fabric,p.pattern].filter(Boolean).join(" · ").slice(0,rules[platform].maxTitle)||p.sku||"Product listing";
    const facts=[p.category,p.type,p.color,p.fabric,p.pattern,p.gender,p.size].filter(Boolean);
    const description=p.existingDescription||("Shop "+title+". "+(facts.length?"Key product details: "+facts.join(", ")+". ":"")+"Use only the verified attributes supplied in the source sheet.");
    const bullets=p.existingBullets.length?p.existingBullets.slice(0,5):[p.fabric&&("Material / fabric: "+p.fabric),p.color&&("Color: "+p.color),p.pattern&&("Design / pattern: "+p.pattern),p.category&&("Category: "+p.category),p.size&&("Size information: "+p.size)].filter(Boolean).slice(0,5);
    const keywords=p.existingKeywords||[p.brand,p.name,p.category,p.type,p.color,p.fabric,p.pattern,p.gender].filter(Boolean).join(", ");
    return {title,description,bullets,keywords};
  };
  const parseAiResponse=text=>{
    const raw=String(text||"").trim();
    try{return JSON.parse(raw)}catch{}
    const a=raw.indexOf("[");const b=raw.lastIndexOf("]");
    if(a>=0&&b>a){try{return JSON.parse(raw.slice(a,b+1))}catch{}}
    return null;
  };
  const generateBatch=async(batch,platform,mode,instruction)=>{
    const payload=batch.map((row,index)=>{
      const source=sourceProfile(row);
      return {index,source,existingContent:{
        title:source.existingTitle,
        description:source.existingDescription,
        bullets:source.existingBullets,
        keywords:source.existingKeywords
      }};
    });
    const modeInstruction={
      enhance:"ENHANCE MODE: If existing title, description, bullets or keywords are present, improve them for clarity, search relevance, readability and marketplace style while preserving their factual meaning. Do not invent specifications, claims, fabric, measurements, certifications, benefits, offers or features. If an existing field is blank, create it from verified source facts.",
      fill:"FILL MISSING MODE: Preserve every existing listing title, description, bullet and keyword exactly. Only create content for fields that are blank.",
      fresh:"FRESH MODE: Create a new listing from the verified source facts. Existing listing copy may be used only as context; do not copy unsupported claims."
    }[mode];
    const prompt="Generate marketplace-ready listing fields for "+platform+". "+modeInstruction+" "+(instruction?"CUSTOM SELLER INSTRUCTION: "+instruction+". ":"")+"Return ONLY a JSON array with one object per row: {index,title,description,bullets,keywords}. bullets must be an array of up to 5 strings. Never invent facts. Preserve brand/product identity. Keep the title within "+rules[platform].maxTitle+" characters where practical.\\nINPUT:\\n"+JSON.stringify(payload);
    if(!window.puter?.ai?.chat)throw new Error("AI engine is still loading.");
    const response=await window.puter.ai.chat(prompt,{model:"gpt-5.6-luna",temperature:0.2,max_tokens:6000,normalize:true});
    const content=response?.message?.content??response?.text??response;
    const parsed=parseAiResponse(typeof content==="string"?content:JSON.stringify(content));
    if(!Array.isArray(parsed))throw new Error("AI listing response was invalid.");
    return parsed;
  };
  const fillRows=async()=>{
    if(!rows.length)return;
    setProcessing(true);setError("");setStatus("Preparing listing engine…");setProgress(0);setDownloadReady(false);
    const output=rows.map(x=>({...x}));
    try{
      for(let i=0;i<rows.length;i+=10){
        const batch=rows.slice(i,i+10);
        let generated;
        try{generated=await generateBatch(batch,marketplace,contentMode,customInstruction)}
        catch(e){generated=batch.map(row=>localDraft(row,marketplace,contentMode));setStatus("AI unavailable for this batch; existing content/source-only safe fill used.")}
        generated.forEach((g,j)=>{
          const fallback=localDraft(batch[j]||{},marketplace,contentMode),target=output[i+j],source=sourceProfile(batch[j]||{});
          let title=g.title||fallback.title;
          let description=g.description||fallback.description;
          let bullets=(Array.isArray(g.bullets)?g.bullets:fallback.bullets).filter(Boolean);
          let keywords=g.keywords||fallback.keywords;
          if(contentMode==="fill"){
            title=source.existingTitle||title;
            description=source.existingDescription||description;
            bullets=source.existingBullets.length?source.existingBullets:bullets;
            keywords=source.existingKeywords||keywords;
          }
          const putIfBlank=(patterns,value)=>{
            if(!value)return;
            const match=headers.find(h=>patterns.some(p=>h.toLowerCase().replace(/[^a-z0-9]+/g," ").includes(p)));
            if(match&&!normalize(target[match]))target[match]=value;
          };
          if(contentMode!=="fill"){
            putIfBlank(["product name","item name","product title","listing title","title","style name"],title);
            putIfBlank(["description","product description","long description","body html","listing description","seo description"],description);
            putIfBlank(["search keyword","search term","generic keyword","backend keyword","keywords","tags"],keywords);
            const bulletHeaders=headers.filter(h=>/bullet|key feature|feature [1-9]|highlights?/i.test(h));
            bullets.forEach((b,k)=>{if(bulletHeaders[k]&&!normalize(target[bulletHeaders[k]]))target[bulletHeaders[k]]=b});
          }
          target["EcomAI Listing Title"]=title;
          target["EcomAI Description"]=description;
          target["EcomAI Bullet Points"]=bullets.join(" | ");
          target["EcomAI Search Keywords"]=keywords;
          target["EcomAI Status"]=contentMode==="enhance"&&source.existingTitle+source.existingDescription+source.existingKeywords?"Enhanced":"Ready";
        });
        const done=Math.min(i+batch.length,rows.length);
        setProgress(Math.round(done/rows.length*100));
        setStatus((contentMode==="enhance"?"Enhanced ":"Auto-filled ")+done.toLocaleString("en-IN")+" of "+rows.length.toLocaleString("en-IN")+" listings…");
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      setRows(output);setDownloadReady(true);setStatus((contentMode==="enhance"?"Enhanced ":"Completed ")+rows.length.toLocaleString("en-IN")+" listings.");
    }catch(e){setError(e?.message||"Listing generation failed.");setStatus("")}
    finally{setProcessing(false)}
  };
  const onFile=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setError("");setStatus("Reading marketplace Excel…");setProgress(0);setRows([]);setDownloadReady(false);setWorkbookName(file.name);
    try{
      const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:"array"}),sheet=wb.Sheets[wb.SheetNames[0]];
      if(!sheet)throw new Error("No worksheet found in this Excel file.");
      const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:""});
      const best=matrix.slice(0,15).reduce((acc,row,i)=>{const count=(row||[]).filter(x=>normalize(x)).length;return count>(acc.count||0)?{index:i,count}:acc},{index:0,count:0});
      const headerRow=(matrix[best.index]||[]).map((x,i)=>normalize(x)||("Column "+(i+1)));
      const dataRows=matrix.slice(best.index+1).filter(row=>(row||[]).some(x=>normalize(x))).slice(0,5000);
      const objects=dataRows.map(row=>Object.fromEntries(headerRow.map((h,i)=>[h,normalize(row?.[i])])));
      if(headerRow.length<2||!objects.length)throw new Error("This Excel has no usable product rows. Upload a marketplace sheet containing product data/SKUs.");
      setHeaders(headerRow);setRows(objects);setStatus("Loaded "+objects.length.toLocaleString("en-IN")+" product rows. EcomAI will detect existing listing content automatically."); 
    }catch(e){setError(e?.message||"Could not read the Excel file.");setStatus("")}
  };
  const contentStats=React.useMemo(()=>{
    let title=0,description=0,bullets=0,keywords=0;
    rows.forEach(row=>{const p=sourceProfile(row);if(p.existingTitle)title++;if(p.existingDescription)description++;if(p.existingBullets.length)bullets++;if(p.existingKeywords)keywords++});
    return {title,description,bullets,keywords};
  },[rows,headers]);
  const downloadExcel=()=>{
    if(!rows.length)return;
    const extra=["EcomAI Listing Title","EcomAI Description","EcomAI Bullet Points","EcomAI Search Keywords","EcomAI Status"];
    const ws=XLSX.utils.json_to_sheet(rows,{header:[...headers,...extra]}),wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"EcomAI Listings");
    XLSX.writeFile(wb,marketplace+"_EcomAI_Listings_"+rows.length+".xlsx");
  };
  const sample=()=>{
    const demo=[{SKU:"DEMO-001",Brand:"Demo Brand","Product Name":"Floral Printed Kurta Set","Listing Title":"Floral Printed Cotton Kurta Set for Women","Description:"" ,"Bullet 1":"Cotton fabric","Bullet 2":"Floral print","Search Keywords":"cotton kurta set, floral kurta"},{SKU:"DEMO-002",Brand:"Demo Brand","Product Name":"Solid Straight Kurta",Category:"Kurta",Color:"Blue",Fabric:"Rayon",Pattern:"Solid",Size:"S,M,L,XL"}];
    setHeaders(Object.keys(demo[0]));setRows(demo);setWorkbookName("Demo marketplace sheet");setStatus("Demo rows loaded. Existing listing copy can be enhanced automatically.");setError("");setDownloadReady(false);
  };
  return <div className="content">
    <ModuleHeader title="Listing AI" sub="Upload a marketplace Excel sheet and EcomAI can fill missing content or enhance the listing copy already present — from 1 product to 5,000 products."/>
    <div className="module3-toolbar"><button className="ghost" onClick={onBack}>← Back to Competitor & Market</button><span><CheckCircle2 size={14}/> 1 listing = 1 listing credit</span></div>
    <section className="listing-killer-hero"><div className="listing-killer-copy"><span className="eyebrow">THE LISTING ENGINE</span><h2>Your marketplace Excel in.<br/>Completed listings out.</h2><p>Upload the marketplace Excel. EcomAI reads product facts plus any existing title, description, bullets and keywords, then either enhances your copy or fills only what is missing. Nothing factual is invented.</p><div className="listing-promise"><span>1–5,000 listings</span><span>Enhance existing copy</span><span>Excel export</span></div></div><div className="listing-credit-card"><span>PAY PER LISTING</span><strong>1 listing = 1 credit</strong><small>Credits are consumed only for listings processed by the Listing Engine.</small><div><b>{rows.length.toLocaleString("en-IN")}</b><span>credits required for this file</span></div></div></section>
    <section className="listing-workspace">
      <div className="listing-step-card"><div className="listing-step-head"><div><span className="eyebrow">STEP 1</span><h3>Select marketplace</h3><p>Choose the exact marketplace template you are uploading.</p></div></div><div className="marketplace-pills">{Object.entries(rules).map(([key,r])=><button key={key} className={marketplace===key?"active":""} onClick={()=>setMarketplace(key)}>{r.label}</button>)}</div></div>
      <div className="listing-step-card"><div className="listing-step-head"><div><span className="eyebrow">STEP 2</span><h3>Upload marketplace Excel</h3><p>Upload the marketplace product sheet/export. EcomAI reads up to 5,000 product rows and automatically detects existing listing fields.</p></div><button className="outline" onClick={sample}>Try demo</button></div><label className={"excel-drop "+(workbookName?"has-file":"")}><input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile}/><FileText size={25}/><strong>{workbookName||"Drop marketplace Excel here or click to upload"}</strong><small>.XLSX / .XLS / .CSV · maximum 5,000 product rows</small><button type="button" className="outline" onClick={e=>{e.preventDefault();inputRef.current?.click()}}>Choose Excel</button></label>{error&&<div className="listing-error"><AlertCircle size={15}/>{error}</div>}</div>
      {rows.length>0&&<div className="listing-step-card listing-content-options"><div className="listing-preview-head"><div><span className="eyebrow">STEP 3</span><h3>Existing listing content</h3><p>If the seller's Excel already contains title, description, bullets or keywords, EcomAI can use that copy as the starting point.</p></div><span className="row-count">{rows.length.toLocaleString("en-IN")} products</span></div><div className="content-detection-grid"><div><span>Titles</span><b>{contentStats.title}/{rows.length}</b></div><div><span>Descriptions</span><b>{contentStats.description}/{rows.length}</b></div><div><span>Bullets</span><b>{contentStats.bullets}/{rows.length}</b></div><div><span>Keywords</span><b>{contentStats.keywords}/{rows.length}</b></div></div><div className="listing-mode-grid"><button className={contentMode==="enhance"?"active":""} onClick={()=>setContentMode("enhance")}><strong>✨ Enhance existing</strong><span>Improve title, description, bullets and keywords while preserving the seller's factual meaning.</span></button><button className={contentMode==="fill"?"active":""} onClick={()=>setContentMode("fill")}><strong>↗ Fill missing only</strong><span>Keep existing copy exactly as it is and generate only blank fields.</span></button><button className={contentMode==="fresh"?"active":""} onClick={()=>setContentMode("fresh")}><strong>✦ Generate fresh</strong><span>Create new marketplace-ready copy from the verified product facts.</span></button></div><div className="listing-instruction"><label>Optional seller instruction <small>Example: “Keep the brand tone premium, avoid discount language, focus on office wear.”</small></label><textarea value={customInstruction} onChange={e=>setCustomInstruction(e.target.value)} placeholder="Tell EcomAI how you want the listing enhanced…"></textarea></div></div>}
      {rows.length>0&&<div className="listing-step-card"><div className="listing-preview-head"><div><span className="eyebrow">STEP 4</span><h3>Automatic field mapping</h3><p>Original source columns stay intact. EcomAI adds enhanced/generated listing fields to the output and fills blank marketplace fields when possible.</p></div><span className="row-count">{rows.length.toLocaleString("en-IN")} products</span></div><div className="mapping-grid">{rules[marketplace].required.map(field=><div key={field}><span>{field}</span><b>Auto-fill</b></div>)}</div><div className="sheet-preview"><table><thead><tr>{headers.slice(0,8).map(h=><th key={h}>{h}</th>)}{headers.length>8&&<th>+{headers.length-8} more</th>}</tr></thead><tbody>{rows.slice(0,4).map((row,i)=><tr key={i}>{headers.slice(0,8).map(h=><td key={h}>{normalize(row[h]).slice(0,70)||"—"}</td>)}{headers.length>8&&<td>…</td>}</tr>)}</tbody></table></div></div>}
      {rows.length>0&&<div className="listing-action-card"><div><span className="eyebrow">STEP 5</span><h3>{contentMode==="enhance"?"Enhance all listings automatically":contentMode==="fill"?"Fill missing listing fields automatically":"Generate all listings automatically"}</h3><p>Run the Listing Engine for every row. Existing seller copy is handled according to the mode above. Designed for 1–5,000 products with live progress and no row-by-row work.</p></div><div className="listing-action-side"><div><span>Listings</span><b>{rows.length.toLocaleString("en-IN")}</b></div><div><span>Credits</span><b>{rows.length.toLocaleString("en-IN")}</b></div><button className="primary" onClick={fillRows} disabled={processing}>{processing?<><LoaderCircle size={16} className="spin"/> Processing {progress}%</>:<>{contentMode==="enhance"?"Enhance":contentMode==="fill"?"Fill missing":"Generate"} {rows.length.toLocaleString("en-IN")} listings <ArrowRight size={16}/></>}</button></div>{(processing||status)&&<div className="listing-progress"><div className="listing-progress-top"><span>{status}</span><b>{progress}%</b></div><div><i style={{width:progress+"%"}}/></div></div>}</div>}
      {downloadReady&&<div className="listing-complete-card"><div className="complete-icon"><CheckCircle2 size={20}/></div><div><span className="eyebrow">READY</span><h3>{rows.length.toLocaleString("en-IN")} listings processed</h3><p>Your original marketplace columns are preserved, while EcomAI's enhanced/generated fields are added and blank marketplace fields are filled where possible.</p></div><button className="primary" onClick={downloadExcel}>Download Completed Excel <ArrowRight size={16}/></button></div>}
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