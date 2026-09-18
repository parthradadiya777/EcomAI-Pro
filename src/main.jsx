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
  const [manual,setManual]=React.useState({category:"",type:"",color:"",fabric:"",keywords:""});
  const [candidates,setCandidates]=React.useState([]);
  const [selected,setSelected]=React.useState([]);
  React.useEffect(()=>setProductUrl(url),[url]);

  const analyzeProduct=()=>{
    const target=productUrl.trim(); setNotice(""); setAnalyzed(null); setCandidates([]); setSelected([]);
    if(!target){setNotice("Paste a product URL first.");return}
    const p=detectPlatform(target);
    if(!p){setNotice("We could not identify the marketplace. Please use a supported marketplace product URL.");return}
    setLoading(true);
    setTimeout(()=>{
      const u=new URL(target);
      const slug=decodeURIComponent(u.pathname).split("/").filter(Boolean).join(" ").replace(/[-_]+/g," ").replace(/\\b(buy|product|item|p)\\b/gi," ").replace(/\\s+/g," ").trim();
      const words=slug.split(" ").filter(x=>x.length>2).slice(0,10);
      const data={sourceUrl:target,platform:p,title:words.join(" ")||"Selected marketplace product",category:manual.category||"Detect from product",productType:manual.type||"Product",color:manual.color||"Not specified",fabric:manual.fabric||"Not specified",keywords:manual.keywords||words.join(", "),extractionMethod:"URL intelligence",warnings:["Product details are based on the URL and user-provided attributes. Competitor products will be selected from marketplace search results."]};
      setAnalyzed(data);
      const base=data.title;
      setCandidates([
        {id:1,title:base+" — Similar Design",price:"Marketplace result",reason:"Same product type & keyword pattern"},
        {id:2,title:base+" — Trending Style",price:"Marketplace result",reason:"Similar category & design intent"},
        {id:3,title:base+" — Comparable Listing",price:"Marketplace result",reason:"Similar listing structure"},
        {id:4,title:base+" — Alternative Design",price:"Marketplace result",reason:"Related product attributes"},
        {id:5,title:base+" — Market Reference",price:"Marketplace result",reason:"Category reference"}
      ]);
      setLoading(false);
      setNotice("Product profile created. Select 3–5 real marketplace result URLs below.");
    },650);
  };

  const toggle=(id)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):s.length<5?[...s,id]:s);
  const continueToResearch=()=>{if(selected.length<3){setNotice("Select at least 3 marketplace results before continuing.");return}setAnalyzed({...analyzed,selectedCompetitors:candidates.filter(x=>selected.includes(x.id))});setModule(3)};

  return <div className="content">
    <ModuleHeader step={2} title="Add or import a product" sub={platform?platform+" detected. Build a product profile first, then choose 3–5 marketplace references for research.":"Choose a product URL or enter the product details manually."}/>
    <section className="source-grid">
      <button className={"source-card "+(source==="url"?"selected":"")} onClick={()=>setSource("url")}><div className="source-icon"><Link2 size={20}/></div><div><strong>Analyze Product URL</strong><p>Build product intelligence from the URL.</p></div><ArrowRight size={18}/></button>
      <button className={"source-card "+(source==="existing"?"selected":"")} onClick={()=>setSource("existing")}><div className="source-icon"><Package size={20}/></div><div><strong>Use Existing Listing</strong><p>Connect a seller account later.</p></div><ArrowRight size={18}/></button>
      <button className={"source-card "+(source==="manual"?"selected":"")} onClick={()=>setSource("manual")}><div className="source-icon"><Plus size={20}/></div><div><strong>Add New Product</strong><p>Enter attributes yourself.</p></div><ArrowRight size={18}/></button>
    </section>
    {source==="url"&&<section className="module-card"><span className="eyebrow">PRODUCT URL</span><h3>Create product intelligence</h3><p className="helper">We use the marketplace URL as the starting point instead of trying to scrape a blocked marketplace page.</p><div className="url-row import-url"><Link2 size={18}/><input value={productUrl} onChange={e=>setProductUrl(e.target.value)} placeholder="Paste product URL"/><button className="primary" onClick={analyzeProduct} disabled={loading}>{loading?<><LoaderCircle size={16} className="spin"/> Building...</>:<>Build Product Profile <ArrowRight size={16}/></>}</button></div><div className="security-row"><ShieldCheck size={15}/> Platform: <strong>{platform||"Not confirmed"}</strong><span>•</span> No marketplace scraping required</div></section>}
    {source==="manual"&&<section className="module-card"><span className="eyebrow">PRODUCT ATTRIBUTES</span><h3>Help EcomAI understand the product</h3><div className="manual-grid"><input placeholder="Category (e.g. Kurti Set)" value={manual.category} onChange={e=>setManual({...manual,category:e.target.value})}/><input placeholder="Product type" value={manual.type} onChange={e=>setManual({...manual,type:e.target.value})}/><input placeholder="Color" value={manual.color} onChange={e=>setManual({...manual,color:e.target.value})}/><input placeholder="Fabric" value={manual.fabric} onChange={e=>setManual({...manual,fabric:e.target.value})}/><textarea placeholder="Keywords / design details" value={manual.keywords} onChange={e=>setManual({...manual,keywords:e.target.value})}></textarea></div></section>}
    {analyzed&&<section className="product-result">
      <div className="result-head"><div><span className="eyebrow">PRODUCT PROFILE</span><h3>{analyzed.title}</h3><p>{analyzed.platform} · URL intelligence</p></div><span className="result-status"><CheckCircle2 size={15}/> Profile ready</span></div>
      <div className="profile-grid"><div><div className="info-row"><span>Category</span><strong>{analyzed.category}</strong></div><div className="info-row"><span>Product type</span><strong>{analyzed.productType}</strong></div><div className="info-row"><span>Color</span><strong>{analyzed.color}</strong></div></div><div><div className="info-row"><span>Fabric</span><strong>{analyzed.fabric}</strong></div><div className="info-row"><span>Keywords</span><strong>{analyzed.keywords}</strong></div><div className="info-row"><span>Marketplace</span><strong>{analyzed.platform}</strong></div></div></div>
    </section>}
    {candidates.length>0&&<section className="related-card"><div className="related-head"><div><span className="eyebrow">MARKETPLACE RESEARCH SET</span><h3>Select 3–5 real marketplace products</h3><p className="helper">These are research slots. Open each search result, verify it on the marketplace, then select the products you want EcomAI to compare.</p></div><span className="related-count">{selected.length}/5</span></div><div className="research-search"><Search size={16}/><input value={analyzed?.keywords||""} readOnly/><button className="outline" onClick={()=>window.open("https://www.google.com/search?q="+encodeURIComponent("site:"+({Myntra:"myntra.com",Meesho:"meesho.com",Amazon:"amazon.in",Flipkart:"flipkart.com"}[platform]||"")+" "+(analyzed?.keywords||"")),"_blank")}>Search Marketplace <ExternalLink size={14}/></button></div><div className="candidate-list">{candidates.map(x=><label className={"candidate "+(selected.includes(x.id)?"picked":"")} key={x.id}><input type="checkbox" checked={selected.includes(x.id)} onChange={()=>toggle(x.id)}/><span className="candidate-num">{x.id}</span><span className="candidate-copy"><strong>{x.title}</strong><small>{x.reason}</small></span><span className="candidate-price">{x.price}</span></label>)}</div><div className="result-actions"><span>Select 3–5 only after marketplace verification.</span><button className="primary" onClick={continueToResearch}>Continue to Competitor & Trends <ArrowRight size={15}/></button></div></section>}
    <div className="bottom-flow"><button className="ghost" onClick={onBack}>← Back</button><div className="flow-steps"><span className="done">1 Marketplace</span><b>→</b><span className="done">2 Product / Listing</span><b>→</b><span>3 Competitor & Trends</span></div></div>
  </div>
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