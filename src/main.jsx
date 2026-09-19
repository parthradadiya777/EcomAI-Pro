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
      await runKeywordResearch(data,p);
      if(real.length<3)setNotice("Research returned fewer than 3 verified marketplace references. The engine will broaden from close matches to similar products and category benchmarks; it will never invent products.");
    }catch(e){setNotice(e.message||"Unable to analyze this product.");}
    finally{setLoading(false);}
  };

  const toggle=(id)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):s.length<5?[...s,id]:s);
  const continueToResearch=()=>{
    if(selected.length<3){setNotice("Select at least 3 verified marketplace products before continuing.");return}
    setAnalyzed({...analyzed,selectedCompetitors:candidates.filter(x=>selected.includes(x.id)),keywordResearch:keywordData});setModule(3);
  };
  const keywordRows=keywordData?.keywords?.[keywordTab]||[];

  return <div className="content">
    <ModuleHeader step={2} title="Add or import a product" sub={platform?platform+" detected. Build a product profile, then run marketplace-specific product and keyword research.":"Choose a product URL or enter the product details manually."}/>
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
      <div className="related-head"><div><span className="eyebrow">REAL MARKETPLACE RESEARCH</span><h3>Select 3–5 verified marketplace references</h3><p className="helper">EcomAI uses a fallback ladder: Close Match → Similar Product → Category Benchmark. Every card is a real marketplace URL verified by the research engine.</p></div><div className="related-tools"><span className="related-count">{selected.length}/5 selected</span><button className="outline refresh-btn" onClick={()=>analyzeProduct(true)} disabled={loading||keywordLoading}><RefreshCw size={15} className={loading?"spin":""}/> Refresh research</button></div></div>
      <div className="research-search"><Search size={16}/><input value={analyzed?.keywords||""} readOnly/><span className="research-status">EcomAI is searching {platform} and verifying public product pages</span></div>
      {candidates.length===0?<div className="related-empty">No verified marketplace products were returned. Try another product URL or broaden the product attributes; EcomAI will not display fake competitor cards.</div>:<><div className="research-result-meta"><span>{candidates.length} verified references found</span><span>Select up to 5</span></div><div className="research-product-grid">{candidates.map(x=><label className={"research-product "+(selected.includes(x.id)?"picked":"")} key={x.id}><div className="research-product-check"><input type="checkbox" checked={selected.includes(x.id)} onChange={()=>toggle(x.id)}/><span>{x.verified?"Verified":"Unverified"}</span></div><div className="research-product-image">{x.image?<img src={"/api/image-proxy?url="+encodeURIComponent(x.image)} alt="" onError={e=>{e.currentTarget.style.display="none";e.currentTarget.parentElement.classList.add("image-pending")}}/>:<div className="image-pending"><ImageIcon size={22}/><span>Image pending</span></div>}</div><div className="research-product-body"><small>{platform} · {x.verified?"Public product page checked":"Search result"} · {x.matchType||"Marketplace Reference"}</small><strong title={x.title}>{x.title}</strong>{x.price&&<b>{x.currency||"₹"}{x.price}</b>}<a href={x.url} target="_blank" rel="noreferrer">Open product <ExternalLink size={12}/></a></div></label>)}</div></>}

    </section>}

    {candidates.length>0&&<ImageGenerator product={{...analyzed,selectedCompetitors:candidates.filter(x=>selected.includes(x.id))}}/>}
  </div>
}
function ImageGenerator({product}){
  const poses=["Front standing","45° side","Walking","Hand on waist","Slight turn","Back / over-the-shoulder"];
  const [pose,setPose]=React.useState("Front standing");
  const [reference,setReference]=React.useState(null);
  const [generating,setGenerating]=React.useState(false);
  const generate=()=>{setGenerating(true);setTimeout(()=>setGenerating(false),900)};
  return <section className="image-generator-card">
    <div className="image-generator-head"><div><span className="eyebrow">IMAGE GENERATOR</span><h3>Generate model images directly here</h3><p>Choose a pose without leaving product research. Keep the product reference unchanged while varying model, face, pose and background.</p></div><span className="pricing-badge">6 poses</span></div>
    <div className="image-generator-body"><label className="image-upload-box"><input type="file" accept="image/*" onChange={e=>setReference(e.target.files?.[0]||null)}/><ImageIcon size={22}/><strong>{reference?reference.name:"Upload product reference"}</strong><small>PNG / JPG product reference</small></label><div className="pose-panel"><span>Choose pose</span><div className="pose-grid">{poses.map(x=><button type="button" key={x} className={pose===x?"active":""} onClick={()=>setPose(x)}>{x}</button>)}</div><button className="primary generate-btn" onClick={generate}>{generating?<><LoaderCircle size={16} className="spin"/> Generating…</>:<>Generate {pose}</>}</button><small className="generator-note">Selected pose: <b>{pose}</b>.</small></div></div>
  </section>
}

function MarketPlaceholder({onBack,product,setModule}){
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
    <ModuleHeader step={3} title="Competitor & Market Analysis" sub={`${product?.platform||"Marketplace"} research for ${product?.title||"selected product"}. Findings below are based on the verified references you selected.`}/>
    <div className="module3-toolbar"><button className="ghost" onClick={onBack}>← Back to Product / Listing</button><span><CheckCircle2 size={14}/> {competitors.length} verified references selected</span></div>
    <section className="analysis-hero"><div><span className="eyebrow">MARKET SNAPSHOT</span><h2>{product?.title||"Selected product"}</h2><p>Observed competitor signals from the selected {product?.platform||"marketplace"} references. This is evidence from the researched listings, not invented market data.</p></div><div className="analysis-stats"><div><span>References</span><b>{competitors.length}</b></div><div><span>Observed avg price</span><b>{avgPrice?`₹${avgPrice.toLocaleString("en-IN")}`:"—"}</b></div><div><span>Price range</span><b>{minPrice?`₹${minPrice.toLocaleString("en-IN")}–₹${maxPrice.toLocaleString("en-IN")}`:"—"}</b></div></div></section>
    <section className="analysis-grid"><div className="analysis-card"><span>Price positioning</span><strong>{minPrice?`₹${minPrice.toLocaleString("en-IN")}–₹${maxPrice.toLocaleString("en-IN")}`:"Not available"}</strong><small>Observed across selected references.</small></div><div className="analysis-card"><span>Title patterns</span><strong>{repeated.length?repeated.slice(0,3).map(x=>x[0]).join(" · "):"Limited signal"}</strong><small>Repeated terms across selected listings.</small></div><div className="analysis-card"><span>Keyword signals</span><strong>{keywordSignals.length?`${keywordSignals.length} signals`:"Limited signal"}</strong><small>From Module 2 keyword research.</small></div><div className="analysis-card"><span>Images</span><strong>Image pending</strong><small>Image retrieval is separate and does not block research.</small></div></section>
    <section className="module3-section"><div className="module3-section-head"><div><span className="eyebrow">VERIFIED COMPETITORS</span><h3>Selected marketplace references</h3></div><span className="muted">Real URLs · selected in Module 2</span></div><div className="competitor-table-wrap"><table className="competitor-table"><thead><tr><th>Product</th><th>Match</th><th>Price</th><th>Research URL</th></tr></thead><tbody>{competitors.map(x=><tr key={x.id}><td><strong>{x.title}</strong></td><td><span className="match-pill">{x.matchType||"Verified"}</span></td><td>{x.price?<><strong>{x.currency||"₹"}{Number(x.price).toLocaleString("en-IN")}</strong>{x.mrp&&Number(x.mrp)>Number(x.price)?<small className="price-mrp">MRP {x.currency||"₹"}{Number(x.mrp).toLocaleString("en-IN")}</small>:null}</>:"Price unavailable"}</td><td><a href={x.url} target="_blank" rel="noreferrer">Open product <ExternalLink size={12}/></a></td></tr>)}</tbody></table></div></section>
    <section className="module3-two-col"><div className="module3-section"><div className="module3-section-head"><div><span className="eyebrow">COMPETITOR PATTERNS</span><h3>What repeats across references</h3></div></div>{repeated.length?<div className="pattern-list">{repeated.map(([word,count])=><div className="pattern-row" key={word}><b>{word}</b><span>{count}/{competitors.length} references</span><div><i style={{width:(count/competitors.length*100)+"%"}}/></div></div>)}<p className="analysis-note">Repeated title terms are research signals, not a claim about total marketplace demand.</p></div>:<div className="analysis-empty">Not enough repeated title signals in the selected references.</div>}</div>
    <div className="module3-section"><div className="module3-section-head"><div><span className="eyebrow">KEYWORD SIGNALS</span><h3>Research already available</h3></div></div>{keywordSignals.length?<div className="signal-list">{keywordSignals.map((x,i)=><div className="signal-row" key={x.keyword}><span>{i+1}</span><strong>{x.keyword}</strong><em>{x.type||"Signal"}</em><small>{x.relevance||"—"} relevance</small></div>)}</div>:<div className="analysis-empty">No keyword signals were returned.</div>}</div></section>
    <section className="recommendation-card"><div className="recommendation-icon"><Sparkles size={20}/></div><div><span className="eyebrow">LISTING OPPORTUNITY</span><h3>Turn these signals into your listing plan</h3><p>Use repeated competitor terms as research inputs, compare your price with the observed range, and carry verified keyword signals into Listing AI. Image retrieval remains pending and does not block this workflow.</p><div className="opportunity-tags">{targetTerms.slice(0,6).map(x=><span key={x}>{x}</span>)}</div></div><button className="primary" onClick={()=>setModule(4)}>Next: Listing AI <ArrowRight size={15}/></button></section>
  </div>
}


function ListingAI({product,onBack}){
  const p=product||{};
  const competitors=p.selectedCompetitors||[];
  const keywords=p.keywordResearch?.keywords||{};
  const all=[...(keywords.short||[]),...(keywords.medium||[]),...(keywords.long||[])];
  const unique=[...new Map(all.map(x=>[String(x.keyword||"").toLowerCase(),x])).values()].filter(x=>x.keyword);
  const stop=new Set(["with","and","for","the","women","woman","men","mens","regular","printed","pure","cotton","work","new"]);
  const base=(p.title||"").replace(/\b\d{5,}\b/g," ").replace(/[-_/]+/g," ").replace(/\s+/g," ").trim();
  const words=(base.toLowerCase().match(/[a-z0-9]+/g)||[]).filter(w=>w.length>2&&!stop.has(w));
  const title=[...new Set(words)].slice(0,9).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ");
  const keyTerms=[...new Set([...unique.map(x=>x.keyword),...words])].filter(Boolean).slice(0,12);
  const bullets=[
    "Designed for the selected marketplace: "+(p.platform||"Marketplace"),
    "Use verified product attributes and researched keyword signals; avoid unrelated terms.",
    "Keep title claims limited to attributes actually present in the source product.",
    "Carry the strongest relevant terms into bullets, description and backend/search fields where the marketplace supports them."
  ];
  const desc=`Shop this ${base||"product"} with a clear, marketplace-ready listing focused on the product's verified attributes and relevant search terms. Add only specifications, fabric, fit, color, size and included components that are confirmed for the product. Use concise language and avoid unsupported claims.`;
  const [sellingPrice,setSellingPrice]=React.useState("");
  const [mrp,setMrp]=React.useState("");
  const [costPrice,setCostPrice]=React.useState("");
  const competitorPrices=competitors.map(x=>Number(String(x.price||"").replace(/[^0-9.]/g,""))).filter(Number.isFinite);
  const priceStats=competitorPrices.length?{low:Math.min(...competitorPrices),avg:Math.round(competitorPrices.reduce((a,b)=>a+b,0)/competitorPrices.length),high:Math.max(...competitorPrices)}:null;
  const enteredPrice=Number(sellingPrice);
  const enteredMrp=Number(mrp);
  const enteredCost=Number(costPrice);
  const priceGap=enteredPrice&&priceStats?.avg?((enteredPrice-priceStats.avg)/priceStats.avg)*100:null;
  const discountPct=enteredPrice&&enteredMrp&&enteredMrp>enteredPrice?((enteredMrp-enteredPrice)/enteredMrp)*100:null;
  const grossMargin=enteredPrice&&enteredCost?enteredPrice-enteredCost:null;
  const copy=(text)=>navigator.clipboard?.writeText(text);
  return <div className="content">
    <ModuleHeader step={4} title="Listing AI" sub={`${p.platform||"Marketplace"} listing draft built from your product profile, verified competitor references and keyword research.`}/>
    <div className="module3-toolbar"><button className="ghost" onClick={onBack}>← Back to Competitor & Market</button><span><CheckCircle2 size={14}/> Evidence-based draft</span></div>
    <section className="listing-ai-hero"><div><span className="eyebrow">LISTING BUILDER</span><h2>Create a marketplace-specific listing</h2><p>EcomAI keeps the listing tied to the selected marketplace and the evidence collected in Modules 2–3. It does not invent missing product specifications.</p></div><div className="listing-platform"><Globe2 size={18}/><b>{p.platform||"Marketplace"}</b><small>Platform-specific workflow</small></div></section>
    <section className="pricing-card">      <div className="pricing-head">        <div><span className="eyebrow">YOUR LISTING PRICE</span><h3>Set your own selling price</h3><p>Seller/customer enters the actual price for this listing. Competitor prices are shown only as research references and never replace your price.</p></div>        <span className="pricing-badge">Seller controlled</span>      </div>      <div className="pricing-input-grid">        <label><span>Selling Price <b>*</b></span><div className="price-input"><span>₹</span><input type="number" min="0" value={sellingPrice} onChange={e=>setSellingPrice(e.target.value)} placeholder="Enter your price"/></div></label>        <label><span>MRP <small>Optional</small></span><div className="price-input"><span>₹</span><input type="number" min="0" value={mrp} onChange={e=>setMrp(e.target.value)} placeholder="Enter MRP"/></div></label>        <label><span>Cost Price <small>Optional</small></span><div className="price-input"><span>₹</span><input type="number" min="0" value={costPrice} onChange={e=>setCostPrice(e.target.value)} placeholder="For margin view"/></div></label>      </div>      <div className="pricing-reference">        <div><span>Observed low</span><b>{priceStats?("₹"+priceStats.low.toLocaleString("en-IN")):"Price unavailable"}</b></div>        <div><span>Observed average</span><b>{priceStats?("₹"+priceStats.avg.toLocaleString("en-IN")):"Price unavailable"}</b></div>        <div><span>Observed high</span><b>{priceStats?("₹"+priceStats.high.toLocaleString("en-IN")):"Price unavailable"}</b></div>      </div>      {enteredPrice>0&&<div className="pricing-analysis">        <div><span>Your selling price</span><b>{"₹"+enteredPrice.toLocaleString("en-IN")}</b></div>        {priceGap!==null&&<div><span>Vs observed average</span><b>{(priceGap>0?"+":"")+priceGap.toFixed(1)+"%"}</b></div>}        {discountPct!==null&&<div><span>MRP discount</span><b>{discountPct.toFixed(1)+"%"}</b></div>}        {grossMargin!==null&&<div><span>Gross margin before fees</span><b>{"₹"+grossMargin.toLocaleString("en-IN")}</b></div>}      </div>}      <div className="pricing-note"><ShieldCheck size={14}/> Your entered selling price remains the listing price. EcomAI only adds research context around it.</div>    </section>    <section className="listing-grid">
      <div className="listing-card"><div className="listing-card-head"><div><span className="eyebrow">TITLE</span><h3>Recommended title draft</h3></div><button className="copy-btn" onClick={()=>copy(title)}>Copy</button></div><div className="draft-box">{title||"Add a product URL to generate a title draft."}</div><small>Draft assembled from the product title and verified keyword signals. Review before publishing.</small></div>
      <div className="listing-card"><div className="listing-card-head"><div><span className="eyebrow">DESCRIPTION</span><h3>Product description draft</h3></div><button className="copy-btn" onClick={()=>copy(desc)}>Copy</button></div><div className="draft-box description-draft">{desc}</div><small>Only confirmed product attributes should be added before publishing.</small></div>
    </section>
    <section className="module3-section"><div className="module3-section-head"><div><span className="eyebrow">SEARCH TERMS</span><h3>Relevant keyword inputs</h3></div><span className="muted">{unique.length} researched signals</span></div>{keyTerms.length?<div className="keyword-chip-grid">{keyTerms.map((x,i)=><button className="keyword-chip" key={x+"-"+i} onClick={()=>copy(x)}>{x}<span>Copy</span></button>)}</div>:<div className="analysis-empty">No verified keyword signals are available yet.</div>}</section>
    <section className="module3-two-col"><div className="module3-section"><div className="module3-section-head"><div><span className="eyebrow">LISTING CHECKLIST</span><h3>Before publishing</h3></div></div><div className="listing-checklist">{bullets.map((x,i)=><div key={i}><CheckCircle2 size={15}/><span>{x}</span></div>)}</div></div>
      <div className="module3-section"><div className="module3-section-head"><div><span className="eyebrow">SOURCE COVERAGE</span><h3>What informed this draft</h3></div></div><div className="coverage-list"><div><span>Product profile</span><b>{p.title?"Available":"Missing"}</b></div><div><span>Marketplace</span><b>{p.platform||"Unknown"}</b></div><div><span>Verified references</span><b>{competitors.length}</b></div><div><span>Keyword research</span><b>{unique.length}</b></div></div></div>
    </section>
    <section className="recommendation-card"><div className="recommendation-icon"><Wand2 size={20}/></div><div><span className="eyebrow">NEXT</span><h3>Creative AI</h3><p>After the listing structure is ready, the next module can turn the same product evidence into marketplace-specific creative directions and image/video briefs.</p></div><button className="primary" onClick={()=>alert("Creative AI is the next module build.")}>Next: Creative AI <ArrowRight size={15}/></button></section>
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
  if(module===3) return <div className="app-shell"><Sidebar active="Competitor" onModule={setModule}/><MarketPlaceholder onBack={()=>setModule(2)} product={analyzed} setModule={setModule}/></div>;
  if(module===4) return <div className="app-shell"><Sidebar active="ListingAI" onModule={setModule}/><ListingAI onBack={()=>setModule(3)} product={analyzed}/></div>;
  if(module===5) return <div className="app-shell"><Sidebar active="ImageGenerator" onModule={setModule}/><main className="content"><ModuleHeader title="Image Generator" sub="Create product model poses without leaving EcomAI Pro."/><ImageGenerator product={analyzed||{}}/></main></div>;
  if(module===6) return <div className="app-shell"><Sidebar active="Settings" onModule={setModule}/><main className="content"><ModuleHeader title="Settings" sub="EcomAI Pro workspace settings."/><section className="module-card"><h3>Workspace settings</h3><p className="helper">Marketplace and integration settings will live here.</p></section></main></div>;
  return <div className="app-shell"><Sidebar active="Dashboard" onModule={setModule}/><main className="content"><ModuleHeader title="Dashboard" sub="Your ecommerce intelligence workspace."/><section className="hero-card"><div className="hero-copy"><span className="eyebrow">ECOMAI PRO</span><h2>Start with any marketplace product.</h2><p>Analyze a product, research real competitors and generate model images from the same workspace.</p><button className="primary" onClick={()=>setModule(1)}>Open Marketplace <ArrowRight size={16}/></button></div></section></main></div>;
}

createRoot(document.getElementById("root")).render(<App/>);