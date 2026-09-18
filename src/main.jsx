import React from 'react';
import {createRoot} from 'react-dom/client';
import {LayoutDashboard, Store, Package, Search, Sparkles, FileText, Wand2, Settings} from 'lucide-react';
import './styles.css';

const markets=[
  {name:'Meesho',short:'M'},
  {name:'Myntra',short:'M'},
  {name:'Amazon',short:'A'},
  {name:'Flipkart',short:'F'},
  {name:'Shopify',short:'S'}
];

function App(){
  const [url,setUrl]=React.useState('');
  const [detected,setDetected]=React.useState(null);
  const detect=()=>{
    const value=url.trim().toLowerCase();
    const hit=markets.find(m=>value.includes(m.name.toLowerCase()));
    setDetected(hit?.name || 'Unknown marketplace');
  };
  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><span className="spark">✦</span>EcomAI <b>Pro</b></div>
      <p className="tagline">Marketplace Intelligence & Listing Copilot</p>
      <nav>
        <a className="active"><LayoutDashboard size={17}/>Dashboard</a>
        <a><Store size={17}/>Marketplace</a>
        <a><Package size={17}/>My Listings</a>
        <a><Search size={17}/>Competitor & Market</a>
        <a><Sparkles size={17}/>Listing AI</a>
        <a><Wand2 size={17}/>Creative AI</a>
        <a><FileText size={17}/>Optimize</a>
        <a><Settings size={17}/>Settings</a>
      </nav>
      <div className="secure">🔒 Secure integration layer<br/>Official APIs / permitted integrations only.</div>
    </aside>
    <main>
      <header><div><h1>Marketplace</h1><p>Connect your stores and start working with real listings.</p></div><span className="step">Module 1 · Marketplace Connection</span></header>
      <section className="hero">
        <div><span className="eyebrow">START HERE</span><h2>Connect a marketplace or analyze a product URL</h2><p>The system detects the platform first. You confirm it before we continue.</p></div>
        <div className="urlbox"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste product URL — https://www.myntra.com/..."/><button onClick={detect}>Detect Platform</button></div>
        {detected && <div className="detected"><span>Detected</span><strong>{detected}</strong><em>✓ Please confirm this is correct before continuing.</em></div>}
      </section>
      <section className="section"><div className="sectiontitle"><h3>Marketplace Connections</h3><p>Connect once. Later modules can import and optimize your actual listings.</p></div>
      <div className="cards">{markets.map((m,i)=><div className="market" key={m.name}><div className="markethead"><div className="logo">{m.short}</div><div><h4>{m.name}</h4><span>Seller account + listings</span></div><span className="state">Not connected</span></div><div className="marketfoot"><small>Official integration required</small><button onClick={()=>setDetected(m.name)}>Connect</button></div></div>)}</div></section>
      <section className="next"><div><span className="eyebrow">NEXT MODULES</span><h3>Built for the complete seller journey</h3><p>Marketplace → Product → Competitor & Trends → What Should I Create? → Creative → Listing → Optimize → Publish → Analytics</p></div><div className="chips"><span>Personalized recommendations</span><span>Actual listing integration</span><span>Platform-specific rules</span></div></section>
    </main>
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);