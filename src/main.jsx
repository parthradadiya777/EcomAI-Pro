import React from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, Store, Package, Search, Sparkles, FileText, Wand2,
  Settings, CheckCircle2, Link2, ShieldCheck, ArrowRight, X,
  AlertCircle, ExternalLink
} from "lucide-react";
import "./styles.css";

const MARKETS = [
  {name:"Meesho", code:"MS", tone:"pink", desc:"Seller account & catalog"},
  {name:"Myntra", code:"MY", tone:"violet", desc:"Seller account & catalog"},
  {name:"Amazon", code:"AZ", tone:"orange", desc:"Seller account & catalog"},
  {name:"Flipkart", code:"FK", tone:"blue", desc:"Seller account & catalog"},
  {name:"Shopify", code:"SH", tone:"green", desc:"Store & products"}
];

const domains = {
  Meesho:["meesho.com"],
  Myntra:["myntra.com"],
  Amazon:["amazon.in","amazon.com"],
  Flipkart:["flipkart.com"],
  Shopify:[]
};

function detectPlatform(raw){
  try{
    const u=new URL(raw);
    const host=u.hostname.replace(/^www\./,"").toLowerCase();
    for(const m of MARKETS){
      if((domains[m.name]||[]).some(d=>host===d || host.endsWith("."+d))) return m.name;
    }
    if(host.includes("myshopify.com")) return "Shopify";
    return null;
  }catch{return null;}
}

function App(){
  const [url,setUrl]=React.useState("");
  const [detected,setDetected]=React.useState(null);
  const [confirmed,setConfirmed]=React.useState(false);
  const [connections,setConnections]=React.useState({});
  const [modal,setModal]=React.useState(null);
  const [notice,setNotice]=React.useState("");

  const analyze=()=>{
    setNotice("");
    setConfirmed(false);
    if(!url.trim()){ setNotice("Paste a product URL first."); setDetected(null); return; }
    const p=detectPlatform(url);
    setDetected(p);
    if(!p) setNotice("We couldn't identify a supported marketplace from this URL.");
  };

  const confirmPlatform=()=>{
    setConfirmed(true);
    setNotice("Platform confirmed. Next we can move into product/listing import.");
  };

  const connect=(name)=>{
    setConnections(prev=>({...prev,[name]:true}));
    setModal(null);
    setNotice(name+" marked as connected for this development build. Official API authorization will be wired in the integration layer.");
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span>✦</span> EcomAI <b>Pro</b></div>
      <div className="brand-sub">Marketplace Intelligence & Listing Copilot</div>
      <nav className="nav">
        <a><LayoutDashboard size={17}/>Dashboard</a>
        <a className="active"><Store size={17}/>Marketplace</a>
        <a><Package size={17}/>My Listings</a>
        <a><Search size={17}/>Competitor & Market</a>
        <a><Sparkles size={17}/>Listing AI</a>
        <a><Wand2 size={17}/>Creative AI</a>
        <a><FileText size={17}/>Optimize</a>
        <a><Settings size={17}/>Settings</a>
      </nav>
      <div className="sidebar-note">
        <div className="note-icon"><ShieldCheck size={16}/></div>
        <div><strong>Secure integration</strong><small>Official APIs / permitted integrations only.</small></div>
      </div>
    </aside>

    <main className="content">
      <header className="topbar">
        <div>
          <div className="crumb">EcomAI Pro <span>/</span> Setup</div>
          <h1>Connect your marketplaces</h1>
          <p>One connection layer for the listing, competitor and creative workflow.</p>
        </div>
        <div className="progress-chip"><span>1</span> of 8 modules</div>
      </header>

      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">START WITH ANY PRODUCT</span>
          <h2>Paste a product URL.<br/>We detect the marketplace first.</h2>
          <p>We never assume the platform. The detected marketplace must be confirmed before analysis continues.</p>
        </div>
        <div className="url-panel">
          <label>Product URL</label>
          <div className="url-row">
            <Link2 size={18} className="url-icon"/>
            <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()} placeholder="https://www.myntra.com/..." />
            <button onClick={analyze}>Detect <ArrowRight size={16}/></button>
          </div>
          <div className="microcopy"><ShieldCheck size={14}/> Only the public URL is used for detection at this stage.</div>
        </div>
      </section>

      {notice && <div className="notice"><AlertCircle size={17}/><span>{notice}</span><button onClick={()=>setNotice("")}><X size={15}/></button></div>}

      {detected && <section className="detect-card">
        <div className="detect-left">
          <div className={"market-logo "+(MARKETS.find(x=>x.name===detected)?.tone||"")}>{MARKETS.find(x=>x.name===detected)?.code}</div>
          <div><span className="eyebrow">PLATFORM DETECTED</span><h3>{detected}</h3><p>We found a {detected} product URL.</p></div>
        </div>
        <div className="detect-actions">
          {!confirmed ? <>
            <span>Is this correct?</span>
            <button className="secondary" onClick={()=>setDetected(null)}>Change</button>
            <button className="primary" onClick={confirmPlatform}><CheckCircle2 size={16}/> Yes, continue</button>
          </> : <div className="confirmed"><CheckCircle2 size={18}/> Confirmed</div>}
        </div>
      </section>}

      <section className="section">
        <div className="section-head">
          <div><span className="eyebrow">OPTIONAL ACCOUNT CONNECTION</span><h3>Connect seller accounts</h3></div>
          <span className="muted">Connect once → import real listings later</span>
        </div>
        <div className="market-grid">
          {MARKETS.map(m=><div className="market-card" key={m.name}>
            <div className="market-top">
              <div className={"market-logo "+m.tone}>{m.code}</div>
              <div className="market-text"><h4>{m.name}</h4><p>{m.desc}</p></div>
              <span className={"status "+(connections[m.name]?"connected":"")}>{connections[m.name]?"Connected":"Not connected"}</span>
            </div>
            <div className="market-bottom">
              <span><ShieldCheck size={14}/> Official integration</span>
              <button className={connections[m.name]?"ghost":"outline"} onClick={()=>connections[m.name] ? setModal(m.name) : setModal(m.name)}>{connections[m.name]?"Manage":"Connect"}</button>
            </div>
          </div>)}
        </div>
      </section>

      <section className="flow-card">
        <div>
          <span className="eyebrow">WHAT HAPPENS NEXT</span>
          <h3>Connection is only the first layer</h3>
          <p>After this module, the product moves through the exact marketplace-specific workflow we planned.</p>
        </div>
        <div className="flow-steps">
          <span className="done">1 Marketplace</span><b>→</b><span>2 Product / Listing</span><b>→</b><span>3 Competitor & Trends</span><b>→</b><span>4 What Should I Create?</span>
        </div>
      </section>
    </main>

    {modal && <div className="modal-backdrop" onClick={()=>setModal(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-x" onClick={()=>setModal(null)}><X size={18}/></button>
        <div className={"modal-logo "+(MARKETS.find(x=>x.name===modal)?.tone||"")}>{MARKETS.find(x=>x.name===modal)?.code}</div>
        <h3>{connections[modal]?"Manage ":"Connect "}{modal}</h3>
        <p>This button is wired into the app flow. The next integration layer will use the marketplace's official authorization/API process; no passwords are stored in this UI.</p>
        <div className="modal-actions"><button className="ghost" onClick={()=>setModal(null)}>Cancel</button><button className="primary" onClick={()=>connect(modal)}>{connections[modal]?"Reconnect":"Continue"} <ExternalLink size={15}/></button></div>
      </div>
    </div>}
  </div>
}
createRoot(document.getElementById("root")).render(<App/>);
