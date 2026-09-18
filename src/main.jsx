import React from "react";
import {createRoot} from "react-dom/client";
import {
  LayoutDashboard,Store,Package,Search,Sparkles,FileText,Wand2,Settings,
  CheckCircle2,Link2,ShieldCheck,ArrowRight,X,AlertCircle,ExternalLink,Plus,
  LoaderCircle,Image as ImageIcon
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

function detectPlatform(raw){
  try{
    const u=new URL(raw);
    const host=u.hostname.replace(/^www\./,"").toLowerCase();
    for(const m of MARKETS){
      if((domains[m.name]||[]).some(d=>host===d||host.endsWith("."+d))) return m.name;
    }
    if(host.includes("myshopify.com")) return "Shopify";
  }catch{}
  return null;
}

function ModuleHeader({step,title,sub}){return <header className="topbar"><div><div className="crumb">EcomAI Pro <span>/</span> {step===1?"Setup":"Product Import"}</div><h1>{title}</h1><p>{sub}</p></div><div className="progress-chip"><span>{step}</span> of 8 modules</div></header>}

function Nav({active,onModule}){
  return <nav className="nav">
    <a><LayoutDashboard size={17}/>Dashboard</a>
    <a className={active==="Marketplace"?"active":""} onClick={()=>onModule(1)}><Store size={17}/>Marketplace</a>
    <a className={active==="Products"?"active":""} onClick={()=>onModule(2)}><Package size={17}/>My Listings</a>
    <a><Search size={17}/>Competitor & Market</a>
    <a><Sparkles size={17}/>Listing AI</a>
    <a><Wand2 size={17}/>Creative AI</a>
    <a><FileText size={17}/>Optimize</a>
    <a><Settings size={17}/>Settings</a>
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
    <ModuleHeader step={1} title="Connect your marketplaces" sub="One connection layer for the listing, competitor and creative workflow."/>
    <section className="hero-card">
      <div className="hero-copy"><span className="eyebrow">START WITH ANY PRODUCT</span><h2>Paste a product URL.<br/>We detect the marketplace first.</h2><p>We never assume the platform. The detected marketplace must be confirmed before analysis continues.</p></div>
      <div className="url-panel"><label>Product URL</label><div className="url-row"><Link2 size={18} className="url-icon"/><input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()} placeholder="https://www.myntra.com/..."/><button onClick={analyze}>Detect <ArrowRight size={16}/></button></div><div className="microcopy"><ShieldCheck size={14}/> Only the public URL is used for detection at this stage.</div></div>
    </section>
    {notice&&<div className="notice"><AlertCircle size={17}/><span>{notice}</span><button onClick={()=>setNotice("")}><X size={15}/></button></div>}
    {detected&&<section className="detect-card"><div className="detect-left"><div className={"market-logo "+(MARKETS.find(x=>x.name===detected)?.tone||"")}>{MARKETS.find(x=>x.name===detected)?.code}</div><div><span className="eyebrow">PLATFORM DETECTED</span><h3>{detected}</h3><p>We found a {detected} product URL.</p></div></div><div className="detect-actions">{!confirmed?<><span>Is this correct?</span><button className="secondary" onClick={()=>setDetected(null)}>Change</button><button className="primary" onClick={confirmPlatform}><CheckCircle2 size={16}/> Yes, continue</button></>:<><div className="confirmed"><CheckCircle2 size={18}/> Confirmed</div><button className="primary" onClick={()=>setModule(2)}>Continue to Product Import <ArrowRight size={15}/></button></>}</div></section>}
    <section className="section"><div className="section-head"><div><span className="eyebrow">OPTIONAL ACCOUNT CONNECTION</span><h3>Connect seller accounts</h3></div><span className="muted">Connect once → import real listings later</span></div><div className="market-grid">{MARKETS.map(m=><div className="market-card" key={m.name}><div className="market-top"><div className={"market-logo "+m.tone}>{m.code}</div><div className="market-text"><h4>{m.name}</h4><p>{m.desc}</p></div><span className={"status "+(connections[m.name]?"connected":"")}>{connections[m.name]?"Connected":"Not connected"}</span></div><div className="market-bottom"><span><ShieldCheck size={14}/> Official integration</span><button className={connections[m.name]?"ghost":"outline"} onClick={()=>setModal(m.name)}>{connections[m.name]?"Manage":"Connect"}</button></div></div>)}</div></section>
    <section className="flow-card"><div><span className="eyebrow">WHAT HAPPENS NEXT</span><h3>Connection is only the first layer</h3><p>After this module, the product moves through the exact marketplace-specific workflow we planned.</p></div><div className="flow-steps"><span className="done">1 Marketplace</span><b>→</b><span>2 Product / Listing</span><b>→</b><span>3 Competitor & Trends</span><b>→</b><span>4 What Should I Create?</span></div></section>
    {modal&&<div className="modal-backdrop" onClick={()=>setModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="modal-x" onClick={()=>setModal(null)}><X size={18}/></button><div className={"modal-logo "+(MARKETS.find(x=>x.name===modal)?.tone||"")}>{MARKETS.find(x=>x.name===modal)?.code}</div><h3>{connections[modal]?"Manage ":"Connect "}{modal}</h3><p>This development build reserves the connection flow. The live connector will use the marketplace's official authorization/API process; no passwords are stored in this UI.</p><div className="modal-actions"><button className="ghost" onClick={()=>setModal(null)}>Cancel</button><button className="primary" onClick={()=>connect(modal)}>{connections[modal]?"Reconnect":"Continue"} <ExternalLink size={15}/></button></div></div></div>}
  </>
}

function ProductImport({platform,url,onBack,setModule,analyzed,setAnalyzed,notice,setNotice}){
  const [source,setSource]=React.useState("url");
  const [productUrl,setProductUrl]=React.useState(url);
  const [loading,setLoading]=React.useState(false);
  React.useEffect(()=>setProductUrl(url),[url]);

  const analyzeProduct=async()=>{
    const target=productUrl.trim();
    setNotice("");
    setAnalyzed(null);
    if(!target){setNotice("Paste a product URL first.");return}
    const p=detectPlatform(target);
    if(!p){setNotice("This URL is not from a supported marketplace. You can still add it as a generic ecommerce URL later.");return}
    setLoading(true);
    try{
      const res=await fetch("/api/analyze-url",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:target})});
      const body=await res.json();
      if(!res.ok||!body.ok) throw new Error(body.error||"Unable to analyze this URL.");
      setAnalyzed(body.data);
      setNotice("Product extraction completed. Review the verified data before moving to market analysis.");
    }catch(err){
      setNotice(err.message||"Product extraction failed.");
    }finally{setLoading(false)}
  };

  return <div className="content">
    <ModuleHeader step={2} title="Add or import a product" sub={platform ? platform+" detected. Choose how you want to bring the product into EcomAI Pro." : "Choose an existing listing or start from a new product URL."}/>
    <section className="source-grid">
      <button className={"source-card "+(source==="url"?"selected":"")} onClick={()=>setSource("url")}><div className="source-icon"><Link2 size={20}/></div><div><strong>Analyze Product URL</strong><p>Start from a public product page.</p></div><ArrowRight size={18}/></button>
      <button className={"source-card "+(source==="existing"?"selected":"")} onClick={()=>setSource("existing")}><div className="source-icon"><Package size={20}/></div><div><strong>Use Existing Listing</strong><p>Import from a connected seller account.</p></div><ArrowRight size={18}/></button>
      <button className={"source-card "+(source==="manual"?"selected":"")} onClick={()=>setSource("manual")}><div className="source-icon"><Plus size={20}/></div><div><strong>Add New Product</strong><p>Enter product data manually.</p></div><ArrowRight size={18}/></button>
    </section>
    {source==="url"&&<section className="module-card"><span className="eyebrow">PRODUCT URL</span><h3>Analyze the selected product</h3><p className="helper">The server fetches the public page and extracts available structured product metadata. It will not invent missing product information.</p><div className="url-row import-url"><Link2 size={18}/><input value={productUrl} onChange={e=>setProductUrl(e.target.value)} placeholder="Paste product URL"/><button className="primary" onClick={analyzeProduct} disabled={loading}>{loading?<><LoaderCircle size={16} className="spin"/> Analyzing...</>:<>Analyze Product <ArrowRight size={16}/></>}</button></div><div className="security-row"><ShieldCheck size={15}/> Platform: <strong>{platform||"Not confirmed"}</strong><span>•</span> Server extraction <span>•</span> Public page only</div></section>}
    {source==="url"&&analyzed&&<><ProductResult data={analyzed} onContinue={()=>setModule(3)}/><RelatedProducts items={analyzed.relatedProducts||[]} check={analyzed.internalCheck}/></>}
    {source==="existing"&&<section className="module-card"><span className="eyebrow">EXISTING LISTING</span><h3>Connect a seller account to import listings</h3><p className="helper">Once official marketplace authorization is connected, listings can appear here for analysis and optimization.</p><div className="empty-box"><Store size={23}/><strong>No connected marketplace yet</strong><span>Return to Module 1 and connect a seller account.</span><button className="outline" onClick={onBack}>Back to Marketplace Connection</button></div></section>}
    {source==="manual"&&<section className="module-card"><span className="eyebrow">NEW PRODUCT</span><h3>Manual product intake</h3><div className="manual-grid"><input placeholder="Product name"/><input placeholder="SKU"/><input placeholder="Category"/><input placeholder="Brand"/><textarea placeholder="Product details / verified attributes"></textarea></div></section>}
    <div className="bottom-flow"><button className="ghost" onClick={onBack}>← Back</button><div className="flow-steps"><span className="done">1 Marketplace</span><b>→</b><span className="done">2 Product / Listing</span><b>→</b><span>3 Competitor & Trends</span></div></div>
  </div>
}


function RelatedProducts({items=[],check}) {
  return <section className="related-card">
    <div className="related-head"><div><span className="eyebrow">INTERNAL MARKET CHECK</span><h3>Similar products found on {check?.platform||"this marketplace"}</h3><p className="helper">The system checks the submitted marketplace first, then searches and verifies product pages before showing them here.</p></div><span className="related-count">{items.length}/5</span></div>
    {!items.length ? <div className="related-empty"><LoaderCircle size={18} className="spin"/> Searching the marketplace for 3–5 relevant products...</div> :
      <div className="related-products-grid">{items.slice(0,5).map((item,i)=><div className="related-product-card" key={item.url}>
        <div className="related-product-image">{item.image?<img src={item.image} alt=""/>:<Package size={25}/>}<span>{item.verified?"Verified":"Found"}</span></div>
        <div className="related-product-body"><small>PRODUCT {i+1}</small><strong>{item.title||"Related product"}</strong>{item.price&&<b>{item.currency||"₹"} {item.price}</b>}<a href={item.url} target="_blank" rel="noreferrer">View product <ExternalLink size={13}/></a></div>
      </div>)}</div>}
    {items.length>0&&items.length<3&&<div className="related-warning"><AlertCircle size={15}/> Only {items.length} verified products were available from the marketplace search. We will not invent additional products.</div>}
  </section>
}

function ProductResult({data,onContinue}){
  return <section className="product-result">
    <div className="result-head"><div><span className="eyebrow">EXTRACTED PRODUCT</span><h3>{data.title||"Untitled product"}</h3><p>{data.platform} · extracted from public page metadata</p></div><span className="result-status"><CheckCircle2 size={15}/> Product data extracted</span></div>
    <div className="result-grid">
      <div className="result-gallery">{data.images?.length?<img src={data.images[0]} alt="" />:<div className="no-image"><ImageIcon size={24}/><span>No image found</span></div>}<div className="thumbs">{(data.images||[]).slice(0,6).map((src,i)=><img src={src} alt="" key={src+i}/>)}</div></div>
      <div className="result-info">
        <div className="info-row"><span>Platform</span><strong>{data.platform||"—"}</strong></div>
        <div className="info-row"><span>Price</span><strong>{data.price ? (data.currency?data.currency+" ":"")+data.price : "Not found"}</strong></div>
        <div className="info-row"><span>Brand</span><strong>{data.brand||"Not found"}</strong></div>
        <div className="info-row"><span>Category</span><strong>{data.category||"Not found"}</strong></div>
        <div className="info-row"><span>SKU / MPN</span><strong>{data.sku||"Not found"}</strong></div>
        <div className="info-row"><span>Availability</span><strong>{data.availability||"Not found"}</strong></div>
        <div className="desc-box"><span>Description</span><p>{data.description||"No description was available in the page metadata."}</p></div>
      </div>
    </div>
    {data.warnings?.length>0&&<div className="warning-box"><AlertCircle size={15}/><div><strong>Review before continuing</strong>{data.warnings.map((w,i)=><span key={i}>{w}</span>)}</div></div>}
    <div className="result-actions"><span>Data will become the single product record used by the next modules.</span><button className="primary" onClick={onContinue}>Continue to Competitor & Trends <ArrowRight size={15}/></button></div>
  </section>
}

function MarketPlaceholder({onBack,product}){
  return <div className="content"><ModuleHeader step={3} title="Competitor & Market Analysis" sub="The next engine will combine marketplace, category, competitor and trend signals for this specific product."/><section className="module-card placeholder-main"><div className="placeholder-icon"><Search size={25}/></div><span className="eyebrow">MODULE 3 READY</span><h3>{product?.title||"Selected product"}</h3><p>Product data is loaded. Competitor discovery, trend signals and listing-gap analysis are the next build layer.</p><div className="planned"><span>✓ Platform-specific research</span><span>✓ Competitor pattern analysis</span><span>✓ Current market trend signals</span><span>✓ Listing gap detection</span><span>✓ Category best practices</span></div><button className="ghost" onClick={onBack}>← Back to Product Import</button></section></div>
}

function App(){
  const [module,setModule]=React.useState(1);
  const [url,setUrl]=React.useState("");
  const [detected,setDetected]=React.useState(null);
  const [confirmed,setConfirmed]=React.useState(false);
  const [connections,setConnections]=React.useState({});
  const [modal,setModal]=React.useState(null);
  const [notice,setNotice]=React.useState("");
  const [analyzed,setAnalyzed]=React.useState(null);

  const state={url,setUrl,detected,setDetected,confirmed,setConfirmed,connections,setConnections,modal,setModal,notice,setNotice,setModule};

  if(module===2) return <div className="app-shell"><Sidebar active="Products" onModule={setModule}/><ProductImport platform={detected} url={url} onBack={()=>setModule(1)} setModule={setModule} analyzed={analyzed} setAnalyzed={setAnalyzed} notice={notice} setNotice={setNotice}/></div>;
  if(module===3) return <div className="app-shell"><Sidebar active="Products" onModule={setModule}/><MarketPlaceholder onBack={()=>setModule(2)} product={analyzed}/></div>;
  return <div className="app-shell"><Sidebar active="Marketplace" onModule={setModule}/><main className="content"><MarketplaceConnection state={state}/></main></div>;
}

createRoot(document.getElementById("root")).render(<App/>);