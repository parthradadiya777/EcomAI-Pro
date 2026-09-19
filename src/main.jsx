import React from "react";
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
  const [keywordData,setKeywordData]=React.useState(null);
  const [keywordLoading,setKeywordLoading]=React.useState(false);
  const [keywordTab,setKeywordTab]=React.useState("short");
  React.useEffect(()=>setProductUrl(url),[url]);

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
      const cleanProfileWords=[...new Set(words.filter(x=>["kurta","kurti","palazzo","dupatta","floral","printed","thread","work","embroidered","cotton","rayon","georgette","silk","anarkali","suit","saree"].includes(x)))];
      const data={...raw,sourceUrl:target,platform:p,title,category:raw.category||manual.category||"Detect from product",productType:manual.type||raw.productType||"Product",color:manual.color||raw.color||"Not specified",fabric:manual.fabric||raw.fabric||"Not specified",keywords:manual.keywords||raw.keywords||cleanProfileWords.slice(0,14).join(", ")};
      setAnalyzed(data);
      const real=(raw.relatedProducts||[]).map((x,i)=>({...x,id:i+1}));
      setCandidates(real);
      await runKeywordResearch(data,p);
      if(real.length<3)setNotice("Research returned fewer than 3 verified marketplace references. The engine will broaden from close matches to similar products and category benchmarks; it will never invent products.");
    }catch(e){setNotice(e.message||"Unable to analyze this product.");}
    finally{setLoading(false);}
  };

  const toggle=(id)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):s.length<5?[...s,id]:s);
  const continueToResearch=()=>{
    if(selected.length<3){setNotice("Select at least 3 verified marketplace products before continuing.");return}
    setAnalyzed({...analyzed,selectedCompetitors:candidates.filter(x=>selected.includes(x.id))});setModule(3);
  };
  const keywordRows=keywordData?.keywords?.[keywordTab]||[];

  return <div className="content">
    <ModuleHeader step={2} title="Add or import a product" sub={platform?platform+" detected. Build a product profile, then run marketplace-specific product and keyword research.":"Choose a product URL or enter the product details manually."}/>
    <section className="source-grid">
      <button className={"source-card "+(source==="url"?"selected":"")} onClick={()=>setSource("url")}><div className="source-icon"><Link2 size={20}/></div><div><strong>Analyze Product URL</strong><p>Build product intelligence from the real product page.</p></div><ArrowRight size={18}/></button>
      <button className={"source-card "+(source==="existing"?"selected":"")} onClick={()=>setSource("existing")}><div className="source-icon"><Package size={20}/></div><div><strong>Use Existing Listing</strong><p>Connect a seller account later.</p></div><ArrowRight size={18}/></button>
      <button className={"source-card "+(source==="manual"?"selected":"")} onClick={()=>setSource("manual")}><div className="source-icon"><Plus size={20}/></div><div><strong>Add New Product</strong><p>Enter attributes yourself.</p></div><ArrowRight size={18}/></button>
    </section>
    {source==="url"&&<section className="module-card"><span className="eyebrow">PRODUCT URL</span><h3>Create product intelligence</h3><p className="helper">EcomAI checks the public product page where possible, then searches the detected marketplace for real related product URLs. It does not create placeholder competitors.</p><div className="url-row import-url"><Link2 size={18}/><input value={productUrl} onChange={e=>setProductUrl(e.target.value)} placeholder="Paste product URL"/><button className="primary" onClick={analyzeProduct} disabled={loading}>{loading?<><LoaderCircle size={16} className="spin"/> Researching...</>:<>Build Product Profile <ArrowRight size={16}/></>}</button></div><div className="security-row"><ShieldCheck size={15}/> Platform: <strong>{platform||"Not confirmed"}</strong><span>•</span> Product-page + marketplace research</div></section>}
    {source==="manual"&&<section className="module-card"><span className="eyebrow">PRODUCT ATTRIBUTES</span><h3>Help EcomAI understand the product</h3><div className="manual-grid"><input placeholder="Category (e.g. Kurti Set)" value={manual.category} onChange={e=>setManual({...manual,category:e.target.value})}/><input placeholder="Product type" value={manual.type} onChange={e=>setManual({...manual,type:e.target.value})}/><input placeholder="Color" value={manual.color} onChange={e=>setManual({...manual,color:e.target.value})}/><input placeholder="Fabric" value={manual.fabric} onChange={e=>setManual({...manual,fabric:e.target.value})}/><textarea placeholder="Keywords / design details" value={manual.keywords} onChange={e=>setManual({...manual,keywords:e.target.value})}></textarea></div></section>}
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
      <div className="related-head"><div><span className="eyebrow">REAL MARKETPLACE RESEARCH</span><h3>Select 3–5 verified marketplace references</h3><p className="helper">EcomAI uses a fallback ladder: Close Match → Similar Product → Category Benchmark. Every card is a real marketplace URL verified by the research engine.</p></div><div className="related-tools"><span className="related-count">{selected.length}/5 selected</span><button className="outline refresh-btn" onClick={()=>analyzeProduct(true)} disabled={loading||keywordLoading}><RefreshCw size={15} className={loading?"spin":""}/> Refresh research</button></div></div>
      <div className="research-search"><Search size={16}/><input value={analyzed?.keywords||""} readOnly/><span className="research-status">EcomAI is searching {platform} and verifying public product pages</span></div>
      {candidates.length===0?<div className="related-empty">No verified marketplace products were returned. Try another product URL or broaden the product attributes; EcomAI will not display fake competitor cards.</div>:<div className="research-result-meta"><span>{candidates.length} verified references found</span><span>Select up to 5</span></div><div className="research-product-grid">{candidates.map(x=><label className={"research-product "+(selected.includes(x.id)?"picked":"")} key={x.id}><div className="research-product-check"><input type="checkbox" checked={selected.includes(x.id)} onChange={()=>toggle(x.id)}/><span>{x.verified?"Verified":"Unverified"}</span></div><div className="research-product-image">{x.image?<img src={x.image} alt=""/>:<ImageIcon size={25}/>}</div><div className="research-product-body"><small>{platform} · {x.verified?"Public product page checked":"Search result"} · {x.matchType||"Marketplace Reference"}</small><strong title={x.title}>{x.title}</strong>{x.price&&<b>{x.currency||"₹"}{x.price}</b>}<a href={x.url} target="_blank" rel="noreferrer">Open product <ExternalLink size={12}/></a></div></label>)}</div>}
      <div className="result-actions"><span>{selected.length<3?"Select at least 3 verified marketplace references.":"Ready: "+selected.length+" references selected."}</span><button className="primary" onClick={continueToResearch} disabled={selected.length<3}>Continue to Competitor & Trends <ArrowRight size={15}/></button></div>
    </section>}
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