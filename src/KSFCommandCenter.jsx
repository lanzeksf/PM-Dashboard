import React, { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// KSF COMMAND CENTER
// Main dashboard shell — Kern Bot fully embedded, other modules coming soon
// ─────────────────────────────────────────────────────────────────────────────

const SHELL_USERS = [
  { id:"loren",   name:"Loren C.",   initials:"LC", color:"#a78bfa", role:"Senior PM",             tier:"admin"    },
  { id:"lanze",   name:"Lanze A.",   initials:"LA", color:"#22c55e", role:"Manufacturing Engineer", tier:"standard" },
  { id:"tony",    name:"Tony S.",    initials:"TS", color:"#38bdf8", role:"Structural Coordinator", tier:"standard" },
  { id:"luis",    name:"Luis A.",    initials:"LU", color:"#f59e0b", role:"Solar APM",              tier:"standard" },
  { id:"jillian", name:"Jillian H.", initials:"JH", color:"#f472b6", role:"Solar Coordinator",     tier:"standard" },
  { id:"adam",    name:"Adam K.",    initials:"AK", color:"#fb923c", role:"Aerospace Engineer",     tier:"standard" },
  { id:"jacob",   name:"Jacob T.",   initials:"JT", color:"#4ade80", role:"Field Coordinator",      tier:"standard" },
];

const SHELL_COLORS = {
  bg:"#0a0a0a", sidebar:"#000000", surface:"#111111",
  border:"rgba(255,255,255,0.13)", borderHi:"rgba(255,255,255,0.22)",
  text:"#ededed", muted:"#aaaaaa", hint:"#777777",
  accent:"#5b7cfa", accentDim:"rgba(91,124,250,0.15)",
  success:"#34d399", warning:"#fbbf24", danger:"#f87171",
  pm:"#a78bfa", pmDim:"rgba(167,139,250,0.14)",
};

const NAV_ICONS = {
  dashboard:  ()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  kernbot:    ()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><circle cx="8.5" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="16" r="1.2" fill="currentColor" stroke="none"/></svg>,
  owner:      ()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.35 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  scope:      ()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  changes:    ()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M14.5 9.5a2.5 2 0 0 0-5 0c0 1.5 5 2 5 3.5a2.5 2 0 0 1-5 0"/><line x1="12" y1="7" x2="12" y2="9.5"/><line x1="12" y1="15" x2="12" y2="17"/></svg>,
  // Drafting triangle / set square — right angle triangle with ruler tick marks
  detailing:  ()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20L20 20L4 4Z"/><line x1="4" y1="20" x2="4" y2="4"/><line x1="4" y1="20" x2="20" y2="20"/><line x1="8" y1="20" x2="8" y2="18"/><line x1="12" y1="20" x2="12" y2="18"/><line x1="16" y1="20" x2="16" y2="18"/><line x1="4" y1="12" x2="6" y2="12"/><line x1="4" y1="8" x2="6" y2="8"/><line x1="4" y1="16" x2="6" y2="16"/></svg>,
  // Clean chat bubble — simple and complete
  rfi:        ()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  // AISC W-shape: top flange, diagonal fillets, thin web, bottom flange
  fab: ()=><svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="2.5" x2="19" y2="2.5"/>
    <line x1="1" y1="4.5" x2="19" y2="4.5"/>
    <line x1="1" y1="2.5" x2="1" y2="4.5"/>
    <line x1="19" y1="2.5" x2="19" y2="4.5"/>
    <line x1="1" y1="4.5" x2="8.5" y2="6"/>
    <line x1="19" y1="4.5" x2="11.5" y2="6"/>
    <line x1="8.5" y1="6" x2="8.5" y2="14"/>
    <line x1="11.5" y1="6" x2="11.5" y2="14"/>
    <line x1="8.5" y1="14" x2="1" y2="15.5"/>
    <line x1="11.5" y1="14" x2="19" y2="15.5"/>
    <line x1="1" y1="15.5" x2="1" y2="17.5"/>
    <line x1="19" y1="15.5" x2="19" y2="17.5"/>
    <line x1="1" y1="17.5" x2="19" y2="17.5"/>
  </svg>,
  field:      ()=><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

const NAV_ITEMS = [
  { id:"dashboard",  label:"Dashboard"      },
  { id:"kernbot",    label:"Kern Bot"        },
  { id:"owner",      label:"Owner Pending"   },
  { id:"scope",      label:"Scope Tracker"   },
  { id:"changes",    label:"Change Orders"   },
  { id:"detailing",  label:"Detailing"       },
  { id:"rfi",        label:"RFI Log"         },
  { id:"fab",        label:"Fabrication"     },
  { id:"field",      label:"Field Needs"     },
];

// ── Coming Soon placeholder ──────────────────────────────────────────────────
function ComingSoon({label}) {
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:SHELL_COLORS.bg,gap:14}}>
      <div style={{width:52,height:52,borderRadius:14,background:SHELL_COLORS.surface,border:`1px solid ${SHELL_COLORS.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:22,opacity:0.4}}>◈</span>
      </div>
      <div style={{textAlign:"center"}}>
        <p style={{margin:"0 0 6px",fontSize:16,fontWeight:500,color:SHELL_COLORS.text}}>{label}</p>
        <p style={{margin:0,fontSize:13,color:SHELL_COLORS.hint,lineHeight:1.7}}>This module is coming soon.<br/>APIs and integrations will be connected here.</p>
      </div>
      <div style={{marginTop:4,padding:"6px 16px",borderRadius:20,background:"rgba(255,255,255,0.06)",border:`1px solid rgba(255,255,255,0.12)`}}>
        <span style={{fontSize:11,color:"#888888"}}>In development</span>
      </div>
    </div>
  );
}

// ── Login Screen ─────────────────────────────────────────────────────────────
function ShellLogin({onLogin}) {
  return (
    <div style={{minHeight:"100vh",background:SHELL_COLORS.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,-apple-system,sans-serif",padding:"2rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:"2.5rem"}}>
        <div style={{width:48,height:48,borderRadius:12,background:"#1a1a1a",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{color:"#fff",fontWeight:800,fontSize:15,letterSpacing:"-0.5px"}}>KSF</span>
        </div>
        <div>
          <p style={{margin:0,fontWeight:600,fontSize:20,color:SHELL_COLORS.text}}>Command Center</p>
          <p style={{margin:0,fontSize:12,color:SHELL_COLORS.muted}}>Kern Steel Fabrication · Structural · Solar · Aerospace</p>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(148px,1fr))",gap:10,width:"100%",maxWidth:680}}>
        {SHELL_USERS.map(u=>(
          <button key={u.id} onClick={()=>onLogin(u)}
            style={{background:SHELL_COLORS.surface,border:`1px solid ${SHELL_COLORS.border}`,borderRadius:13,padding:"18px 12px",cursor:"pointer",textAlign:"center",fontFamily:"inherit",transition:"border-color 0.15s",outline:"none"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=u.color+"60"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=SHELL_COLORS.border}>
            <div style={{width:42,height:42,borderRadius:"50%",background:u.color+"28",border:`1px solid ${u.color}40`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}>
              <span style={{fontSize:13,fontWeight:600,color:u.color}}>{u.initials}</span>
            </div>
            <p style={{margin:0,fontWeight:500,fontSize:13,color:SHELL_COLORS.text}}>{u.name}</p>
            <p style={{margin:"3px 0 0",fontSize:11,color:SHELL_COLORS.muted}}>{u.role}</p>
            {u.tier==="admin"&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,background:SHELL_COLORS.pmDim,color:SHELL_COLORS.pm,display:"inline-block",marginTop:6}}>Admin</span>}
          </button>
        ))}
      </div>
      <p style={{marginTop:"2rem",fontSize:11,color:SHELL_COLORS.hint}}>Microsoft 365 SSO will replace this at deployment</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KERN BOT — full embedded module
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared in-memory store ──────────────────────────────────────────────────
const YEAR = new Date().getFullYear();
const makePMQ  = n => `PMQ-${YEAR}-${String(n).padStart(4,"0")}`;
const nowStamp = () => new Date().toISOString();
const daysAgo  = n => { const d=new Date(); d.setDate(d.getDate()-n);   return d.toISOString(); };
const hoursAgo = n => { const d=new Date(); d.setHours(d.getHours()-n); return d.toISOString(); };
const fmtDate  = d => new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const fmtRel   = iso => {
  const diff=Date.now()-new Date(iso).getTime(), m=Math.floor(diff/60000), h=Math.floor(diff/3600000), day=Math.floor(diff/86400000);
  if(m<2)return"just now"; if(m<60)return`${m}m ago`; if(h<24)return`${h}h ago`; if(day===1)return"yesterday"; return`${day}d ago`;
};
const fmtBytes = b => b<1024?""+b+"B":b<1048576?(b/1024).toFixed(1)+"KB":(b/1048576).toFixed(1)+"MB";

let _pmqN=2, _msgN=500;
const nextPMQ = () => { _pmqN++; return makePMQ(_pmqN); };
const nextId  = () => { _msgN++; return _msgN; };

// File helpers
const isImage   = f => /^image\//i.test(f.type);
const isPDF     = f => f.type==="application/pdf";
const isViewable= f => isImage(f)||isPDF(f);

const readFileAsDataURL = file => new Promise((res,rej)=>{
  const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file);
});

const MAX_FILE_SIZE = 8*1024*1024; // 8 MB
const MAX_ATTACHMENTS = 6;

const STORE = {
  chats: [
    { id:"t1", owner:"tony", title:"Minimum edge distance — A325 bolts",
      createdAt:hoursAgo(2), lastActivity:hoursAgo(2), escalated:false, resolved:false, unread:false,
      msgs:[
        {id:101,role:"user",text:"What is the minimum edge distance for A325 bolts in 3/8\" plate using standard holes?"},
        {id:102,role:"bot",confidence:91,sources:[{doc:"AISC 360",section:"Table J3.4"}],
          text:"Per AISC 360 Table J3.4, minimum edge distance for standard holes with 7/8\" A325 bolts is 1-1/8\" for sheared edges and 1\" for rolled or sawn edges. For ¾\" bolts: 1\" sheared, 7/8\" rolled/sawn."},
      ]},
    { id:"t2", owner:"tony", title:"Weld access hole geometry — moment connection",
      createdAt:daysAgo(1), lastActivity:hoursAgo(1), escalated:true, resolved:false, unread:true, pmqId:makePMQ(1),
      msgs:[
        {id:103,role:"user",text:"Weld access hole geometry for moment connections per AWS D1.1? W18×97 beam into W14 column."},
        {id:104,role:"bot",confidence:58,sources:[{doc:"AWS D1.1",section:"§5.17"}],
          text:"Partial match at 58% — AWS D1.1 §5.17 addresses weld access holes generally but your specific W18×97 moment connection may require EOR confirmation on dimensions."},
        {id:105,role:"bot",escalationNotice:true,text:`Thread escalated as ${makePMQ(1)}. Loren's replies will appear here.`},
        {id:106,role:"pm",name:"Loren C.",unread:true,
          text:"Tony — for a W18×97 CJP moment connection, weld access hole dimensions follow AISC 360 §J1.6. Min hole height is 1-1/2\" or 75% of flange thickness, whichever is greater. What is the flange thickness?"},
      ]},
    { id:"t3", owner:"tony", title:"A572 Gr.50 substitution for A36",
      createdAt:daysAgo(2), lastActivity:daysAgo(2), escalated:false, resolved:false, unread:false,
      msgs:[
        {id:107,role:"user",text:"Can we substitute A572 Gr.50 for A36 on HSS brace members without EOR approval?"},
        {id:108,role:"bot",confidence:93,sources:[{doc:"KSF PM Manual",section:"§1.6"}],
          text:"No. Per KSF Standard — material substitution requires written EOR approval before fabrication. No verbal approvals accepted."},
      ]},
    { id:"lu1", owner:"luis", title:"Base plate design — W12 column",
      createdAt:daysAgo(2), lastActivity:daysAgo(2), escalated:true, resolved:false, unread:false, pmqId:makePMQ(2),
      msgs:[
        {id:301,role:"user",text:"Required base plate thickness for W12×53 carrying 85 kips on 6\" concrete pedestal?"},
        {id:302,role:"bot",confidence:64,sources:[{doc:"AISC Design Guide 1",section:"Ch. 3"}],
          text:"Partial match at 64% — AISC Design Guide 1 covers base plate design but specific calculation for your loading needs verification."},
        {id:303,role:"bot",escalationNotice:true,text:`Thread escalated as ${makePMQ(2)}. Loren's replies will appear here.`},
      ]},
    { id:"ad1", owner:"adam", title:"EO requirement — field splice modification",
      createdAt:daysAgo(3), lastActivity:daysAgo(3), escalated:true, resolved:true, pmqId:makePMQ(3), unread:false,
      msgs:[
        {id:401,role:"user",text:"Field conditions require moving a splice location by 4\". EO or verbal approval?"},
        {id:402,role:"bot",confidence:97,sources:[{doc:"KSF PM Manual",section:"Aerospace"}],
          text:"Any field modification requires a written Engineering Order. No exceptions."},
        {id:403,role:"bot",escalationNotice:true,text:`Thread escalated as ${makePMQ(3)}. Loren's replies will appear here.`},
        {id:404,role:"pm",name:"Loren C.",text:"Adam — bot is correct. Written EO required. Do not proceed until EO-2026-011 is confirmed."},
      ]},
    { id:"lz1", owner:"lanze", title:"Fabrication throughput — structural vs solar",
      createdAt:hoursAgo(4), lastActivity:hoursAgo(4), escalated:false, resolved:false, unread:false,
      msgs:[
        {id:501,role:"user",text:"Typical fabrication cycle times for structural vs solar carport members? Trying to identify shop floor bottlenecks."},
        {id:502,role:"bot",confidence:72,sources:[{doc:"KSF PM Manual",section:"Shop Floor"}],
          text:"Per KSF SOP, structural members average 3-5 days through fab. Solar carport members are typically 1-3 days. Bottlenecks most commonly occur at fit-up and weld inspection stages."},
      ]},
    { id:"l1", owner:"loren", title:"Bolt pretension values — AISC 360",
      createdAt:hoursAgo(3), lastActivity:hoursAgo(3), escalated:false, resolved:false, unread:false,
      msgs:[
        {id:201,role:"user",text:"Minimum bolt pretension values for A325 and A490 in slip-critical connections per AISC 360?"},
        {id:202,role:"bot",confidence:95,sources:[{doc:"AISC 360",section:"Table J3.1"}],
          text:"Per AISC 360 Table J3.1, minimum pretension for A325: ½\"=12k, ¾\"=28k, 7/8\"=39k, 1\"=51k. For A490: ½\"=15k, ¾\"=35k, 7/8\"=49k, 1\"=64k."},
      ]},
    { id:"l2", owner:"loren", title:"CJP weld inspection requirements",
      createdAt:daysAgo(1), lastActivity:daysAgo(1), escalated:false, resolved:false, unread:false,
      msgs:[
        {id:203,role:"user",text:"Visual inspection requirements for CJP groove welds per AWS D1.1?"},
        {id:204,role:"bot",confidence:88,sources:[{doc:"AWS D1.1",section:"§6.9"}],
          text:"Per AWS D1.1 §6.9, CJP groove welds require visual inspection for: crack prohibition, weld/base metal fusion, crater fill, weld profiles per 6.6.1, and size conformance."},
      ]},
  ],
  queue: [
    { id:"q1", pmqId:makePMQ(1), title:"Weld access hole geometry — moment connection",
      from:"Tony S.", fromPos:"Structural Coordinator", project:"4521", projectType:"Structural",
      urgency:"High", psRef:"", createdAt:daysAgo(1), resolved:false,
      additionalContext:"W18×97 beam to W14 column, gridline C-4. Erection in 5 days.",
      thread:[
        {id:103,role:"issuer",name:"Tony S.",  text:"Weld access hole geometry for moment connections? W18×97 into W14 column.",confidence:null},
        {id:104,role:"bot",   name:"Kern Bot", text:"AWS D1.1 §5.17 — 58% confidence, W18×97 moment connection needs senior review.",confidence:58},
        {id:106,role:"pm",   name:"Loren C.", text:"Tony — AISC 360 §J1.6. Min hole height is 1-1/2\" or 75% of flange thickness, whichever governs. What is the flange thickness?"},
      ]},
    { id:"q2", pmqId:makePMQ(2), title:"Base plate thickness — W12 column axial load",
      from:"Luis A.", fromPos:"Solar APM", project:"4388", projectType:"Solar",
      urgency:"Medium", psRef:"RFI-0019", createdAt:daysAgo(2), resolved:false,
      additionalContext:"Solar carport column, 6\" concrete pedestal, 85 kip axial load.",
      thread:[
        {id:301,role:"issuer",name:"Luis A.",  text:"Required base plate thickness for W12×53 carrying 85 kips on 6\" concrete pedestal?",confidence:null},
        {id:302,role:"bot",   name:"Kern Bot", text:"Partial match at 64% — AISC Design Guide 1 covers base plate design but specific calculation needs verification.",confidence:64},
      ]},
    { id:"q3", pmqId:makePMQ(3), title:"EO requirement — field splice modification",
      from:"Adam K.", fromPos:"Aerospace Engineer", project:"4601", projectType:"Aero",
      urgency:"High", psRef:"EO-2026-011", createdAt:daysAgo(3), resolved:true,
      additionalContext:"Lockheed maintenance stand, field splice moved 4\" due to bracket interference.",
      thread:[
        {id:401,role:"issuer",name:"Adam K.",  text:"Field conditions require moving a splice location by 4\". EO or verbal approval?",confidence:null},
        {id:402,role:"bot",   name:"Kern Bot", text:"Any field modification requires a written Engineering Order. No exceptions.",confidence:97},
        {id:404,role:"pm",   name:"Loren C.", text:"Adam — written EO required. Do not proceed until EO-2026-011 is in hand."},
      ]},
  ],
  standards: [
    { id:"s1",title:"Anchor rod hole sizing — base plates",vertical:"Structural",version:"A.1",
      body:"All anchor rod holes in base plates must use KSF-verified dimensions per Table 14-1 (AISC 16th Ed). Holes are always round. Jam nuts go below the base plate. Washers below are 1/8\" thick matching the washer above.\n\n- ¾\" rod → 1 5/16\" hole, ¼\"×2\" sq washer\n- 1¼\" rod → 2 1/16\" hole, ½\"×4\" sq washer\n- 2\" rod → 3¼\" hole, ¾\"×5\" sq washer",
      updatedBy:"Loren C.",updatedAt:"Apr 10, 2026",status:"active",history:[]},
    { id:"s2",title:"Material substitution approval — all verticals",vertical:"All",version:"A",
      body:"Any material substitution from contract-specified material requires written EOR approval before fabrication proceeds. This applies to all three verticals. No verbal approvals.",
      updatedBy:"Loren C.",updatedAt:"Mar 2, 2026",status:"active",history:[]},
  ],
};

const _listeners = new Set();
const store = {
  get chats()     { return STORE.chats; },
  get queue()     { return STORE.queue; },
  get standards() { return STORE.standards; },
  subscribe(fn)   { _listeners.add(fn); return ()=>_listeners.delete(fn); },
  notify()        { _listeners.forEach(fn=>fn()); },
  updateChat(id,patch) {
    const i=STORE.chats.findIndex(c=>c.id===id); if(i===-1)return;
    STORE.chats[i]={...STORE.chats[i],...patch}; store.notify();
  },
  addChat(c)   { STORE.chats.unshift(c); store.notify(); },
  removeChat(id) { STORE.chats=STORE.chats.filter(c=>c.id!==id); store.notify(); },
  updateQueue(id,patch) {
    const i=STORE.queue.findIndex(q=>q.id===id); if(i===-1)return;
    STORE.queue[i]={...STORE.queue[i],...patch}; store.notify();
  },
  addQueue(q)  { STORE.queue.unshift(q); store.notify(); },
  removeQueue(id) { STORE.queue=STORE.queue.filter(q=>q.id!==id); store.notify(); },
  addStd(s)    { STORE.standards.unshift(s); store.notify(); },
  updateStd(id,patch) {
    const i=STORE.standards.findIndex(s=>s.id===id); if(i===-1)return;
    STORE.standards[i]={...STORE.standards[i],...patch}; store.notify();
  },
  resolveByPMQ(pmqId) {
    STORE.chats.forEach((c,i)=>{ if(c.pmqId===pmqId) STORE.chats[i]={...c,resolved:true,lastActivity:nowStamp()}; });
    STORE.queue.forEach((q,i)=>{ if(q.pmqId===pmqId) STORE.queue[i]={...q,resolved:true}; });
    store.notify();
  },
  unresolveByPMQ(pmqId) {
    STORE.chats.forEach((c,i)=>{ if(c.pmqId===pmqId) STORE.chats[i]={...c,resolved:false,lastActivity:nowStamp()}; });
    STORE.queue.forEach((q,i)=>{ if(q.pmqId===pmqId) STORE.queue[i]={...q,resolved:false}; });
    store.notify();
  },
};

function useStore() {
  const [tick,setTick]=useState(0);
  useEffect(()=>store.subscribe(()=>setTick(t=>t+1)),[]);
  return tick;
}

// ── Colors ─────────────────────────────────────────────────────────────────
const C = {
  bg:"#0a0a0a", sidebar:"#000000", surface:"#111111", surface2:"#1a1a1a",
  border:"rgba(255,255,255,0.13)", borderHi:"rgba(255,255,255,0.22)",
  text:"#ededed", muted:"#aaaaaa", hint:"#777777",
  accent:"#5b7cfa", accentDim:"rgba(91,124,250,0.15)", accentText:"#8eaafe",
  success:"#34d399", successDim:"rgba(52,211,153,0.12)",
  warning:"#fbbf24", warningDim:"rgba(251,191,36,0.12)",
  danger:"#f87171",  dangerDim:"rgba(248,113,113,0.12)",
  pm:"#a78bfa",      pmDim:"rgba(167,139,250,0.16)",
};

const USERS_LIST = [
  { id:"loren",   name:"Loren C.",   initials:"LC", color:"#a78bfa", position:"Senior PM",             tier:"admin",   canRespond:true  },
  { id:"lanze",   name:"Lanze A.",   initials:"LA", color:"#22c55e", position:"Manufacturing Engineer", tier:"standard",canRespond:false },
  { id:"tony",    name:"Tony S.",    initials:"TS", color:"#38bdf8", position:"Structural Coordinator", tier:"standard",canRespond:false },
  { id:"luis",    name:"Luis A.",    initials:"LU", color:"#f59e0b", position:"Solar APM",              tier:"standard",canRespond:false },
  { id:"jillian", name:"Jillian H.", initials:"JH", color:"#f472b6", position:"Solar Coordinator",     tier:"standard",canRespond:false },
  { id:"adam",    name:"Adam K.",    initials:"AK", color:"#fb923c", position:"Aerospace Engineer",     tier:"standard",canRespond:false },
  { id:"jacob",   name:"Jacob T.",   initials:"JT", color:"#4ade80", position:"Field Coordinator",      tier:"standard",canRespond:false },
];

const PROJECT_TYPES=["Aero","Solar","Structural","General question"];
const URGENCY_OPTS =["Low","Medium","High"];
const VERTICALS    =["All","Structural","Solar","Aero"];

const KSF_SYSTEM_PROMPT = `You are Kern Bot, the internal assistant for Kern Steel Fabrication (KSF) in Bakersfield, CA. You work across three verticals: Structural steel fabrication and erection, Solar Carports, and Aerospace maintenance stands for Lockheed Martin and the US Air Force.

Your job is to help the KSF PM team get fast, accurate answers about fabrication procedures, AISC standards, AWS welding, RFIs, contracts, change orders, material specs, tolerances, and field issues.

How to respond:
- Talk like a knowledgeable colleague, not a textbook. Be direct and conversational.
- If the user explicitly asks for a specific format — bullet points, a numbered list, a table, short answers — always follow that instruction. User formatting requests override everything else.
- Otherwise, default to plain prose. No bullet-pointed reports, no bold headers unless the question genuinely calls for structure.
- If a question is ambiguous and the answer would be meaningfully different depending on context, cover both cases in plain language rather than asking — e.g. if someone asks "hole size for a 1-1/2 bolt" without context, give both the standard bolt hole size and anchor rod hole size since they're different.
- Cite standards naturally in the sentence — like "per AISC 360 Table J3.3" not as a separate block.
- Keep it short. One or two paragraphs is usually right. The team is busy.
- If you're not certain, say so plainly — "I'd check with Loren on this" or "this one needs EOR sign-off."
- Never end with a confidence statement like "CONFIDENCE: HIGH". The UI handles that.
- Never say "As an AI" or explain your limitations. Just answer.

Critical rules:
- Aerospace (Lockheed, USAF): any field modification needs a written Engineering Order. No exceptions, no verbal approvals.
- Material substitutions: always need written EOR approval before fab starts.
- Solar carports: AHJ permit must be confirmed before construction starts.
- When in doubt on anything Loren-level, say so and recommend escalating.

Team: Loren C. (Senior PM, decision-maker), Tony S. (Structural), Luis A. + Jillian H. (Solar), Adam K. (Aerospace), Jacob T. (Field — keep it brief), Lanze A. (Manufacturing Engineer, shop floor optimization).`;

async function callKernBot(userMessage, conversationHistory=[]) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if(!apiKey) return {text:"API key not configured. Add VITE_ANTHROPIC_API_KEY to your environment variables.",sources:[],confidence:0};

  const messages = [
    ...conversationHistory.map(m=>({
      role: m.role==="user"?"user":"assistant",
      content: m.text||""
    })),
    {role:"user", content:userMessage}
  ];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({
        model:"claude-sonnet-4-5",
        max_tokens:1024,
        system:KSF_SYSTEM_PROMPT,
        messages
      })
    });
    if(!res.ok){ const err=await res.text(); throw new Error(err); }
    const data = await res.json();
    const text = data.content?.[0]?.text||"No response received.";

    // Parse confidence from response text
    let confidence = 85;
    if(/HIGH confidence|confidence.*HIGH|90%|95%|97%|certain|definitive/i.test(text)) confidence=93;
    else if(/MEDIUM confidence|confidence.*MEDIUM|70%|75%|80%|likely|probably/i.test(text)) confidence=78;
    else if(/LOW confidence|confidence.*LOW|uncertain|unclear|recommend.*escalat|not.*sure/i.test(text)) confidence=55;

    // Extract any standard references as sources
    const sources=[];
    const stdPatterns=[
      {re:/AISC\s*360[^,\s]*/gi, doc:"AISC 360"},
      {re:/AISC\s*303[^,\s]*/gi, doc:"AISC 303"},
      {re:/AWS\s*D1\.1[^,\s]*/gi, doc:"AWS D1.1"},
      {re:/AISC\s*CoSP[^,\s]*/gi, doc:"AISC CoSP"},
      {re:/KSF\s*SOP[^,\s]*/gi,   doc:"KSF SOP"},
    ];
    stdPatterns.forEach(({re,doc})=>{
      const m=text.match(re);
      if(m) sources.push({doc,section:m[0].replace(doc,"").trim()||""});
    });

    return {text, sources, confidence};
  } catch(e) {
    return {text:`Error connecting to Kern Bot: ${e.message}. Check your API key and network connection.`,sources:[],confidence:0};
  }
}

// ── Badges ─────────────────────────────────────────────────────────────────
const ConfBadge = ({s}) => {
  if(s==null) return null;
  const c=s>=90?C.success:s>=80?C.warning:C.danger, lbl=s>=90?"High":s>=80?"Medium":"Low";
  return <span style={{fontSize:10,fontWeight:500,padding:"2px 9px",borderRadius:20,background:`${c}18`,color:c,display:"inline-flex",alignItems:"center",gap:4}}><span style={{fontFamily:"monospace"}}>{s}%</span> · {lbl}</span>;
};
const UrgBadge = ({u}) => {
  const m={High:[C.danger,C.dangerDim],Medium:[C.warning,C.warningDim],Low:[C.success,C.successDim]};
  const [c,b]=m[u]||m.Low;
  return <span style={{fontSize:10,fontWeight:500,padding:"2px 9px",borderRadius:20,background:b,color:c}}>{u}</span>;
};
const VerBadge = ({v}) => {
  const m={All:"#94a3b8",Structural:"#38bdf8",Solar:"#facc15",Aero:"#a78bfa"};
  const c=m[v]||m.All;
  return <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:`${c}18`,color:c,fontWeight:500}}>{v}</span>;
};

// ── Icons ──────────────────────────────────────────────────────────────────
const MI = {
  rename:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  escalate:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  resolve:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  unresolve: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 14l-4-4 4-4M20 20v-7a4 4 0 00-4-4H5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  delete:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  remove:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  archive:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="21 8 21 21 3 21 3 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><rect x="1" y="3" width="22" height="5" rx="1" stroke="currentColor" strokeWidth="1.6"/><line x1="10" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  paperclip: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  download:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  expand:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  close:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  pdf:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  file:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

// ── Context Menu ───────────────────────────────────────────────────────────
function CtxMenu({items,onClose,style}) {
  const ref=useRef();
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))onClose();};
    document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h);
  },[onClose]);
  return (
    <div ref={ref} style={{position:"absolute",background:"#1e2235",border:`1px solid ${C.borderHi}`,borderRadius:9,padding:4,zIndex:300,minWidth:164,boxShadow:"0 6px 28px rgba(0,0,0,0.65)",...style}}>
      {items.map((it,i)=>it==="---"
        ?<div key={i} style={{height:1,background:C.border,margin:"3px 0"}}/>
        :<button key={i} onClick={()=>{it.fn();onClose();}}
            style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"7px 10px",background:"none",border:"none",cursor:"pointer",color:it.danger?C.danger:C.text,fontSize:12,fontFamily:"inherit",borderRadius:6,textAlign:"left"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <span style={{width:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:it.danger?1:0.6}}>{MI[it.icon]||null}</span>
            {it.label}
          </button>
      )}
    </div>
  );
}

// ── Lightbox / viewer ──────────────────────────────────────────────────────
function PDFViewer({dataUrl}) {
  const [pages,setPages]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    setLoading(true); setPages([]); setError(false);

    const render=async()=>{
      try {
        // Load PDF.js from CDN
        if(!window.pdfjsLib){
          await new Promise((res,rej)=>{
            const s=document.createElement("script");
            s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            s.onload=res; s.onerror=rej;
            document.head.appendChild(s);
          });
          window.pdfjsLib.GlobalWorkerOptions.workerSrc=
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
        // Decode base64 → Uint8Array
        const base64=dataUrl.split(",")[1];
        const binary=atob(base64);
        const bytes=new Uint8Array(binary.length);
        for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);

        const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
        if(cancelled) return;

        const rendered=[];
        for(let p=1;p<=pdf.numPages;p++){
          const page=await pdf.getPage(p);
          const viewport=page.getViewport({scale:1.6});
          const canvas=document.createElement("canvas");
          canvas.width=viewport.width;
          canvas.height=viewport.height;
          await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
          if(cancelled) return;
          rendered.push(canvas.toDataURL("image/png"));
        }
        setPages(rendered);
        setLoading(false);
      } catch(e){
        if(!cancelled){ setError(true); setLoading(false); }
      }
    };
    render();
    return()=>{ cancelled=true; };
  },[dataUrl]);

  if(loading) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:40}}>
      <div style={{width:32,height:32,borderRadius:"50%",border:`3px solid ${C.accent}`,borderTopColor:"transparent",animation:"kbspin 0.8s linear infinite"}}/>
      <span style={{color:C.muted,fontSize:13}}>Rendering PDF…</span>
      <style>{`@keyframes kbspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if(error) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:40}}>
      <span style={{color:C.muted,fontSize:13}}>Could not render PDF in this environment.</span>
    </div>
  );
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8,padding:"10px 0",alignItems:"center",width:"100%"}}>
      {pages.map((src,i)=>(
        <img key={i} src={src} alt={`Page ${i+1}`}
          style={{width:"min(860px,96%)",borderRadius:4,boxShadow:"0 2px 16px rgba(0,0,0,0.5)",background:"#fff",display:"block"}}/>
      ))}
    </div>
  );
}

function Viewer({file,onClose}) {
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onClose();};
    document.addEventListener("keydown",h); return()=>document.removeEventListener("keydown",h);
  },[onClose]);

  const download=()=>{
    const a=document.createElement("a"); a.href=file.dataUrl; a.download=file.name; a.click();
  };

  return (
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",flexDirection:"column",zIndex:500}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      {/* toolbar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",flexShrink:0,borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:13,color:C.text,fontWeight:500}}>{file.name}</span>
          <span style={{fontSize:11,color:C.hint}}>{fmtBytes(file.size)}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={download} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
            <span style={{color:C.hint,display:"flex"}}>{MI.download}</span>Download
          </button>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:7,background:C.surface,border:`1px solid ${C.border}`,cursor:"pointer",color:C.muted,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {MI.close}
          </button>
        </div>
      </div>
      {/* content */}
      <div style={{flex:1,overflow:"auto",padding:20}}>
        {isImage({type:file.mimeType})&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100%"}}>
            <img src={file.dataUrl} alt={file.name} style={{maxWidth:"100%",objectFit:"contain",borderRadius:4,boxShadow:"0 4px 40px rgba(0,0,0,0.5)"}}/>
          </div>
        )}
        {file.mimeType==="application/pdf"&&(
          <PDFViewer dataUrl={file.dataUrl}/>
        )}
      </div>
    </div>
  );
}

// ── Attachment thumbnail tray (input area) ─────────────────────────────────
function AttachTray({attachments,onRemove}) {
  if(!attachments.length) return null;
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"8px 12px 0",borderTop:`1px solid ${C.border}`}}>
      {attachments.map((f,i)=>(
        <div key={i} style={{position:"relative",borderRadius:7,overflow:"visible"}}>
          {isImage({type:f.mimeType})?(
            <div style={{position:"relative",width:56,height:56,borderRadius:7,overflow:"hidden",border:`1px solid ${C.border}`,flexShrink:0}}>
              <img src={f.dataUrl} alt={f.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            </div>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 9px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:7,maxWidth:160}}>
              <span style={{color:f.mimeType==="application/pdf"?C.danger:C.muted,flexShrink:0,display:"flex"}}>{f.mimeType==="application/pdf"?MI.pdf:MI.file}</span>
              <div style={{minWidth:0}}>
                <p style={{margin:0,fontSize:11,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</p>
                <p style={{margin:0,fontSize:10,color:C.hint}}>{fmtBytes(f.size)}</p>
              </div>
            </div>
          )}
          <button onClick={()=>onRemove(i)}
            style={{position:"absolute",top:-6,right:-6,width:16,height:16,borderRadius:"50%",background:"#e74c3c",border:"1.5px solid #0d0f16",color:"#fff",fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,padding:0,zIndex:1}}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Attachment display in bubble ───────────────────────────────────────────
function AttachDisplay({attachments,onView}) {
  if(!attachments?.length) return null;
  const images=attachments.filter(f=>isImage({type:f.mimeType}));
  const others=attachments.filter(f=>!isImage({type:f.mimeType}));

  const download=(f)=>{const a=document.createElement("a");a.href=f.dataUrl;a.download=f.name;a.click();};

  return (
    <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
      {/* image grid */}
      {images.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:images.length===1?"1fr":"1fr 1fr",gap:4}}>
          {images.map((f,i)=>(
            <div key={i} style={{position:"relative",borderRadius:8,overflow:"hidden",cursor:"pointer",aspectRatio:"16/9",background:C.surface2}}
              onClick={()=>onView(f)}>
              <img src={f.dataUrl} alt={f.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              {/* hover overlay */}
              <div className="img-overlay" style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"background 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,0,0,0.45)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,0,0,0)";}}>
                <button onClick={e=>{e.stopPropagation();onView(f);}} style={{background:"rgba(0,0,0,0.6)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,padding:"4px 8px",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:"inherit"}}>
                  {MI.expand}<span>View</span>
                </button>
                <button onClick={e=>{e.stopPropagation();download(f);}} style={{background:"rgba(0,0,0,0.6)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,padding:"4px 8px",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:"inherit"}}>
                  {MI.download}<span>Save</span>
                </button>
              </div>
              <div style={{position:"absolute",bottom:4,left:5,right:5,fontSize:10,color:"rgba(255,255,255,0.7)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",pointerEvents:"none"}}>{f.name}</div>
            </div>
          ))}
        </div>
      )}
      {/* non-image files */}
      {others.map((f,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8}}>
          <span style={{color:f.mimeType==="application/pdf"?C.danger:C.accentText,flexShrink:0,display:"flex"}}>{f.mimeType==="application/pdf"?MI.pdf:MI.file}</span>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:0,fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</p>
            <p style={{margin:0,fontSize:10,color:C.hint}}>{fmtBytes(f.size)}</p>
          </div>
          <div style={{display:"flex",gap:4,flexShrink:0}}>
            {isPDF({type:f.mimeType})&&(
              <button onClick={()=>onView(f)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                {MI.expand}<span>View</span>
              </button>
            )}
            <button onClick={()=>download(f)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              {MI.download}<span>Save</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────
// ── Source side panel ─────────────────────────────────────────────────────
function SourcePanel({source,onClose}) {
  return (
    <div style={{position:"absolute",top:0,right:0,bottom:0,width:320,background:C.surface,borderLeft:`1px solid ${C.borderHi}`,display:"flex",flexDirection:"column",zIndex:100,boxShadow:"-8px 0 32px rgba(0,0,0,0.4)"}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <p style={{margin:0,fontWeight:600,fontSize:14,color:C.text}}>{source.doc}</p>
          {source.section&&<p style={{margin:"2px 0 0",fontSize:12,color:C.muted}}>{source.section}</p>}
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.hint,fontSize:18,lineHeight:1,padding:4}}>×</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
        <div style={{background:C.surface2,borderRadius:10,padding:"14px",border:`1px solid ${C.border}`}}>
          <p style={{margin:"0 0 10px",fontSize:12,color:C.hint,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Reference</p>
          <p style={{margin:0,fontSize:13,color:C.muted,lineHeight:1.7}}>Full document content will appear here once the KSF knowledge base is connected. For now this confirms the source cited by Kern Bot.</p>
        </div>
        <div style={{marginTop:12,padding:"10px 12px",background:C.accentDim,border:`1px solid rgba(91,124,250,0.2)`,borderRadius:8}}>
          <p style={{margin:0,fontSize:11,color:C.accentText,lineHeight:1.65}}>📚 Knowledge base integration coming soon. Sources will display full text, page references, and revision history.</p>
        </div>
      </div>
    </div>
  );
}

function Bubble({m,isMe,userColor,userInitials,onView,onSourceClick}) {
  const isPM=m.role==="pm", isBot=m.role==="bot";

  // Avatar
  const avBg=isMe?userColor+"28":isPM?"rgba(167,139,250,0.2)":C.surface2;
  const avC =isMe?userColor:isPM?"#a78bfa":C.muted;
  const avL =isMe?userInitials:isPM?(m.name?.split(" ").map(w=>w[0]).join("").slice(0,2)||"LC"):"KB";

  // Bubble background + border
  // User: neutral surface gray
  // Bot: slightly different surface, or warning tint if low confidence
  // PM (Loren): always clear purple — distinct from everything else
  // Escalation notice: subtle purple pill, no background bubble
  const bg = isPM
    ? "rgba(139,92,246,0.13)"
    : isMe
      ? C.surface2
      : C.surface;

  const bdr = isPM
    ? "rgba(139,92,246,0.55)"
    : m.unread&&isPM
      ? C.warning
      : C.border;

  // Low confidence: just a left border hint, no amber bubble
  const lowConf = isBot && m.confidence!=null && m.confidence<80 && !m.escalationNotice;

  // Loren's messages get a left accent bar
  const leftBar = isPM && !m.escalationNotice;

  // Parse escalation notice text to bold "Thread escalated" and underline PMQ code
  const renderEscalationText = (text) => {
    // Match PMQ-YYYY-NNNN pattern
    const pmqMatch = text.match(/(PMQ-\d{4}-\d{4})/);
    if(!pmqMatch) return <span style={{fontWeight:600}}>{text}</span>;
    const parts = text.split(pmqMatch[1]);
    return (
      <span style={{fontWeight:600}}>
        {parts[0]}
        <span style={{textDecoration:"underline",textUnderlineOffset:"2px"}}>{pmqMatch[1]}</span>
        {parts[1]}
      </span>
    );
  };

  return (
    <div style={{display:"flex",gap:10,alignItems:"flex-start",flexDirection:isMe?"row-reverse":"row"}}>
      <div style={{width:30,height:30,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:1,background:avBg,border:`1px solid ${avC}44`}}>
        <span style={{fontSize:10,fontWeight:700,color:avC}}>{avL}</span>
      </div>
      <div style={{maxWidth:"82%",minWidth:0}}>
        <div style={{fontSize:11,marginBottom:4,display:"flex",alignItems:"center",gap:5,flexDirection:isMe?"row-reverse":"row"}}>
          <span style={{color:isPM?"#a78bfa":isBot?C.muted:C.hint,fontWeight:500}}>
            {isPM?(m.name||"Loren C."):isBot?"Kern Bot":"You"}
          </span>
          {m.unread&&isPM&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:20,background:C.warningDim,color:C.warning,fontWeight:600}}>New</span>}
        </div>

        {/* Escalation notice — inline pill style, no bubble */}
        {m.escalationNotice ? (
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"7px 12px",background:"rgba(139,92,246,0.10)",border:"1px solid rgba(139,92,246,0.3)",borderRadius:8,fontSize:13,color:"#c4b5fd",lineHeight:1.5}}>
            <span style={{fontSize:10,fontWeight:600,padding:"1px 6px",borderRadius:4,background:"rgba(139,92,246,0.2)",color:"#a78bfa",letterSpacing:"0.03em"}}>ESCALATED</span>
            {renderEscalationText(m.text)}
          </div>
        ) : (
          <div style={{
            background:bg,
            border:`1px solid ${bdr}`,
            borderLeft:leftBar?`3px solid #a78bfa`:lowConf?`2px solid rgba(251,191,36,0.5)`:`1px solid ${bdr}`,
            borderRadius:isMe?"12px 3px 12px 12px":"3px 12px 12px 12px",
            padding:"11px 14px",
            fontSize:13,color:C.text,lineHeight:1.75,whiteSpace:"pre-wrap"
          }}>
            {m.text}
            {m.attachments?.length>0&&<AttachDisplay attachments={m.attachments} onView={onView}/>}
            {m.sources?.length>0&&(
              <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:5}}>
                {m.sources.map((s,j)=>(
                  <button key={j} onClick={()=>onSourceClick&&onSourceClick(s)}
                    style={{display:"inline-flex",alignItems:"center",gap:5,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 9px",cursor:"pointer",fontFamily:"inherit",transition:"all 0.12s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=C.accentDim;e.currentTarget.style.borderColor="rgba(91,124,250,0.3)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background=C.surface2;e.currentTarget.style.borderColor=C.border;}}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={C.accentText} strokeWidth="1.5" strokeLinecap="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={C.accentText} strokeWidth="1.5"/></svg>
                    <span style={{fontSize:10,color:C.accentText,fontWeight:500}}>{s.doc}</span>
                    {s.section&&<span style={{fontSize:10,color:C.muted}}>{s.section}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {isBot&&m.confidence!=null&&!m.escalationNotice&&<div style={{marginTop:5}}><ConfBadge s={m.confidence}/></div>}
      </div>
    </div>
  );
}

// ── Input Bar (shared by ChatPane and QueueDetail) ─────────────────────────
function InputBar({value,onChange,onKeyDown,onSend,disabled,placeholder,accentColor,hint,children}) {
  return (
    <div style={{background:C.surface,border:`1px solid ${accentColor||C.borderHi}`,borderRadius:10,overflow:"hidden"}}>
      {children}
      <textarea value={value} onChange={onChange} onKeyDown={onKeyDown}
        placeholder={placeholder} disabled={disabled} rows={1}
        style={{width:"100%",background:"none",border:"none",outline:"none",color:C.text,fontSize:13,fontFamily:"inherit",resize:"none",lineHeight:1.6,padding:"10px 12px",boxSizing:"border-box",display:"block",minHeight:40,maxHeight:130,overflowY:"auto"}}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 8px 7px",borderTop:`1px solid ${C.border}`}}>
        <span style={{fontSize:10,color:hint?C.pm:C.hint}}>{hint||"Shift+Enter for new line"}</span>
        <button onClick={onSend} disabled={disabled||!value.trim()}
          style={{width:27,height:27,borderRadius:7,background:(!disabled&&value.trim())?(accentColor||C.accent):"rgba(255,255,255,0.05)",border:"none",cursor:(!disabled&&value.trim())?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── Attach Button + logic (used in ChatPane and QueueDetail) ───────────────
function useAttachments() {
  const [attachments,setAttachments]=useState([]);
  const [error,setError]=useState("");
  const fileRef=useRef();

  const openPicker=()=>fileRef.current?.click();

  const handleFiles=useCallback(async(files)=>{
    const arr=[...files];
    if(attachments.length+arr.length>MAX_ATTACHMENTS){setError(`Max ${MAX_ATTACHMENTS} attachments`);return;}
    const tooBig=arr.find(f=>f.size>MAX_FILE_SIZE);
    if(tooBig){setError(`${tooBig.name} exceeds 8 MB limit`);return;}
    setError("");
    const loaded=await Promise.all(arr.map(async f=>({name:f.name,size:f.size,mimeType:f.type,dataUrl:await readFileAsDataURL(f)})));
    setAttachments(p=>[...p,...loaded]);
  },[attachments.length]);

  const removeAt=(i)=>setAttachments(p=>p.filter((_,j)=>j!==i));
  const clear=()=>setAttachments([]);

  const fileInput=(
    <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.dwg"
      style={{display:"none"}} onChange={e=>{handleFiles(e.target.files);e.target.value="";}}/>
  );

  return {attachments,error,openPicker,handleFiles,removeAt,clear,fileInput};
}

// ── Modals ─────────────────────────────────────────────────────────────────
function RenameModal({current,onSave,onClose}) {
  const [val,setVal]=useState(current); const ref=useRef();
  useEffect(()=>{ref.current?.focus();ref.current?.select();},[]);
  return (
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:C.surface,border:`1px solid ${C.borderHi}`,borderRadius:12,width:"100%",maxWidth:380,padding:"18px 18px 14px",boxShadow:"0 16px 60px rgba(0,0,0,0.65)"}}>
        <p style={{margin:"0 0 12px",fontWeight:500,fontSize:13,color:C.text}}>Rename conversation</p>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&val.trim()){onSave(val.trim());onClose();}if(e.key==="Escape")onClose();}}
          style={{width:"100%",padding:"9px 11px",background:C.surface2,border:`1px solid ${C.borderHi}`,borderRadius:8,color:C.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={onClose} style={{flex:1,padding:"8px",fontSize:12,background:"none",border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={()=>{if(val.trim()){onSave(val.trim());onClose();}}} style={{flex:2,padding:"8px",fontSize:12,fontWeight:500,background:C.accent,border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Save</button>
        </div>
      </div>
    </div>
  );
}

function EscalateModal({msgs,onSubmit,onClose}) {
  const [ctx,setCtx]=useState(""); const [proj,setProj]=useState(""); const [pt,setPt]=useState(""); const [ps,setPs]=useState(""); const [urg,setUrg]=useState("Medium");
  const inp={width:"100%",padding:"8px 10px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box",outline:"none"};
  const lbl={fontSize:10,color:C.hint,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.07em"};
  // Urgency options — keyboard navigable via arrow keys naturally since they're buttons
  const urgRef = useRef(null);
  return (
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.72)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:C.surface,border:`1px solid ${C.borderHi}`,borderRadius:13,width:"100%",maxWidth:500,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 20px 80px rgba(0,0,0,0.7)"}}>
        <div style={{padding:"13px 15px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div><p style={{margin:0,fontWeight:500,fontSize:14,color:C.text}}>Escalate this thread</p><p style={{margin:0,fontSize:11,color:C.muted}}>Tab through fields · Shift+Enter in context box to submit</p></div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:18,lineHeight:1}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"13px 15px",display:"flex",flexDirection:"column",gap:11}}>
          {/* 1 — Project number */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            <div>
              <p style={lbl}>Project number</p>
              <input autoFocus style={inp} value={proj} onChange={e=>setProj(e.target.value)} placeholder="e.g. 4521"/>
            </div>
            {/* 2 — Project type */}
            <div>
              <p style={lbl}>Project type</p>
              <select style={{...inp,cursor:"pointer"}} value={pt} onChange={e=>setPt(e.target.value)}>
                <option value="">Select…</option>
                {PROJECT_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {/* 3 — ProjectSight reference */}
          <div>
            <p style={lbl}>ProjectSight reference</p>
            <input style={inp} value={ps} onChange={e=>setPs(e.target.value)} placeholder="RFI-0042, submittal ID…"/>
          </div>
          {/* 4 — Urgency */}
          <div>
            <p style={lbl}>Urgency</p>
            <div ref={urgRef} style={{display:"flex",gap:5}}>
              {URGENCY_OPTS.map((u,i)=>{
                const a=urg===u; const cl=u==="High"?C.danger:u==="Medium"?C.warning:C.success;
                return <button key={u} onClick={()=>setUrg(u)}
                  onKeyDown={e=>{
                    if(e.key==="ArrowRight"){ e.preventDefault(); setUrg(URGENCY_OPTS[Math.min(i+1,2)]); }
                    if(e.key==="ArrowLeft"){  e.preventDefault(); setUrg(URGENCY_OPTS[Math.max(i-1,0)]); }
                  }}
                  style={{flex:1,padding:"7px",fontSize:12,borderRadius:7,border:`1px solid ${a?cl+"66":C.border}`,background:a?cl+"18":"none",color:a?cl:C.muted,cursor:"pointer",fontFamily:"inherit",fontWeight:a?500:400}}>{u}</button>;
              })}
            </div>
          </div>
          {/* 5 — Thread preview (read-only, no tab stop) */}
          <div>
            <p style={lbl}>Thread preview</p>
            <div tabIndex={-1} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 11px",maxHeight:110,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
              {msgs.filter(m=>!m.escalationNotice).map((m,i)=>(
                <div key={i} style={{fontSize:11,lineHeight:1.6}}>
                  <span style={{fontWeight:500,color:m.role==="user"?C.accentText:C.pm,marginRight:5}}>{m.role==="user"?"You":"Kern Bot"}</span>
                  <span style={{color:C.muted}}>{m.text.slice(0,85)}{m.text.length>85?"...":""}</span>
                  {m.attachments?.length>0&&<span style={{marginLeft:4,fontSize:10,color:C.hint}}>📎 {m.attachments.length} attachment{m.attachments.length>1?"s":""}</span>}
                  {m.confidence!=null&&<span style={{marginLeft:4,fontSize:9,color:C.hint}}>({m.confidence}%)</span>}
                </div>
              ))}
            </div>
          </div>
          {/* 6 — Additional context — Enter = newline, Shift+Enter = submit */}
          <div>
            <p style={lbl}>Additional context</p>
            <textarea value={ctx} onChange={e=>setCtx(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&e.shiftKey){e.preventDefault();onSubmit({ctx,proj,pt,ps,urg});}}}
              style={{...inp,minHeight:75,resize:"vertical",lineHeight:1.65}}
              placeholder="Add anything the thread doesn't cover… (Shift+Enter to submit)"/>
          </div>
        </div>
        <div style={{padding:"10px 15px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:"8px",fontSize:12,background:"none",border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={()=>onSubmit({ctx,proj,pt,ps,urg})} style={{flex:2,padding:"8px",fontSize:13,fontWeight:500,background:C.accent,border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Send to queue</button>
        </div>
      </div>
    </div>
  );
}

// ── Standards ──────────────────────────────────────────────────────────────
function StdEditor({std,onSave,onCancel,isNew}) {
  const [title,setTitle]=useState(std?.title||""); const [vert,setVert]=useState(std?.vertical||"All"); const [body,setBody]=useState(std?.body||"");
  const inp={width:"100%",padding:"8px 10px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box",outline:"none"};
  const ready=title.trim()&&body.trim();
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <p style={{margin:0,fontWeight:500,fontSize:13,color:C.text}}>{isNew?"New standard":"Edit standard"}</p>
        <button onClick={onCancel} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:17}}>×</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:12}}>
        <div><p style={{fontSize:10,color:C.hint,margin:"0 0 5px",textTransform:"uppercase",letterSpacing:"0.07em"}}>Title</p><input style={inp} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Anchor rod hole sizing…"/></div>
        <div><p style={{fontSize:10,color:C.hint,margin:"0 0 5px",textTransform:"uppercase",letterSpacing:"0.07em"}}>Vertical</p>
          <div style={{display:"flex",gap:5}}>{VERTICALS.map(v=>{const a=vert===v;return <button key={v} onClick={()=>setVert(v)} style={{flex:1,padding:"6px",fontSize:11,borderRadius:6,border:`1px solid ${a?"rgba(79,110,247,0.4)":C.border}`,background:a?C.accentDim:"none",color:a?C.accentText:C.muted,cursor:"pointer",fontFamily:"inherit"}}>{v}</button>;})}</div>
        </div>
        <div><p style={{fontSize:10,color:C.hint,margin:"0 0 5px",textTransform:"uppercase",letterSpacing:"0.07em"}}>Body</p><textarea value={body} onChange={e=>setBody(e.target.value)} style={{...inp,minHeight:200,resize:"vertical",lineHeight:1.75}} placeholder="Describe the standard in plain language…"/></div>
      </div>
      <div style={{padding:"10px 14px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,flexShrink:0}}>
        <button onClick={onCancel} style={{flex:1,padding:"8px",fontSize:12,background:"none",border:`1px solid ${C.border}`,borderRadius:7,color:C.muted,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
        <button onClick={()=>{if(ready)onSave({title,vert,body});}} disabled={!ready} style={{flex:2,padding:"8px",fontSize:12,fontWeight:500,background:ready?C.accent:C.surface2,border:"none",borderRadius:7,color:ready?"#fff":C.hint,cursor:ready?"pointer":"not-allowed",fontFamily:"inherit"}}>{isNew?"Create standard":"Save — new version"}</button>
      </div>
    </div>
  );
}

function StdList({user}) {
  useStore();
  const standards=store.standards;
  const [editing,setEditing]=useState(null); const [isNew,setIsNew]=useState(false); const [menuId,setMenuId]=useState(null);
  const save=data=>{
    const dt=new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    if(isNew){store.addStd({id:"s"+Date.now(),title:data.title,vertical:data.vert,body:data.body,version:"A",updatedBy:user.name,updatedAt:dt,status:"active",history:[]});}
    else{const s=standards.find(x=>x.id===editing.id);if(!s)return;const old={version:s.version,body:s.body,updatedBy:s.updatedBy,updatedAt:s.updatedAt};const pts=s.version.split(".");const nv=pts.length===1?pts[0]+".1":pts[0]+"."+(parseInt(pts[1])+1);store.updateStd(editing.id,{title:data.title,vertical:data.vert,body:data.body,version:nv,updatedBy:user.name,updatedAt:dt,history:[old,...(s.history||[])]});}
    setEditing(null);setIsNew(false);
  };
  if(editing||isNew) return <StdEditor std={editing} onSave={save} onCancel={()=>{setEditing(null);setIsNew(false);}} isNew={isNew}/>;
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div><p style={{margin:0,fontWeight:500,fontSize:13,color:C.text}}>Standards library</p><p style={{margin:0,fontSize:10,color:C.hint}}>Tier 0 — highest priority in bot responses</p></div>
        <button onClick={()=>setIsNew(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:C.accentDim,border:`1px solid rgba(79,110,247,0.3)`,borderRadius:7,color:C.accentText,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>New
        </button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"11px"}}>
        {standards.filter(s=>s.status==="active").map(s=>(
          <div key={s.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 12px",marginBottom:8,position:"relative"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:5}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap"}}>
                  <p style={{margin:0,fontWeight:500,fontSize:12,color:C.text}}>{s.title}</p>
                  <VerBadge v={s.vertical}/><span style={{fontSize:10,color:C.hint,fontFamily:"monospace"}}>v{s.version}</span>
                </div>
                <p style={{margin:0,fontSize:10,color:C.hint}}>{s.updatedBy} · {s.updatedAt}</p>
              </div>
              <div style={{position:"relative",flexShrink:0}}>
                <button onClick={()=>setMenuId(menuId===s.id?null:s.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.hint,padding:"2px 6px",fontSize:14}}>···</button>
                {menuId===s.id&&<CtxMenu onClose={()=>setMenuId(null)} style={{right:0,top:22}} items={[{icon:"rename",label:"Edit",fn:()=>setEditing(s)},"---",{icon:"archive",label:"Archive",fn:()=>store.updateStd(s.id,{status:"archived"})}]}/>}
              </div>
            </div>
            <p style={{margin:0,fontSize:11,color:C.muted,lineHeight:1.65,whiteSpace:"pre-line"}}>{s.body.slice(0,180)}{s.body.length>180?"…":""}</p>
            <button onClick={()=>setEditing(s)} style={{marginTop:7,fontSize:11,color:C.accent,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>Edit / update →</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Queue Detail ───────────────────────────────────────────────────────────
function QueueDetail({item,user,onSend,onResolve,onUnresolve}) {
  const [input,setInput]=useState("");
  const [viewerFile,setViewerFile]=useState(null);
  const [dragOver,setDragOver]=useState(false);
  const [editing,setEditing]=useState(false);
  const [editVals,setEditVals]=useState({});
  const bottomRef=useRef(); const taRef=useRef();
  const {attachments,error:attErr,openPicker,handleFiles,removeAt,clear:clearAtt,fileInput}=useAttachments();

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[item?.thread]);
  useEffect(()=>{setInput("");clearAtt();setEditing(false);},[item?.id]);
  useEffect(()=>{if(taRef.current){taRef.current.style.height="auto";taRef.current.style.height=Math.min(taRef.current.scrollHeight,120)+"px";};},[input]);

  const startEdit=()=>{
    setEditVals({urgency:item.urgency,project:item.project||"",projectType:item.projectType||"",psRef:item.psRef||"",additionalContext:item.additionalContext||""});
    setEditing(true);
  };
  const saveEdit=()=>{
    store.updateQueue(item.id,{urgency:editVals.urgency,project:editVals.project,projectType:editVals.projectType,psRef:editVals.psRef,additionalContext:editVals.additionalContext});
    setEditing(false);
  };
  const cancelEdit=()=>setEditing(false);

  const doSend=()=>{
    if(!input.trim()&&!attachments.length) return;
    onSend(item.id,input.trim(),user.name,attachments);
    setInput(""); clearAtt();
  };

  const onDrop=e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files);};

  const fieldInp={width:"100%",padding:"6px 9px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box",outline:"none"};
  const fieldLbl={fontSize:9,color:C.hint,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3,display:"block"};

  if(!item) return <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:C.bg}}><p style={{fontSize:13,color:C.hint}}>Select a thread from the queue.</p></div>;

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:C.bg}}>
      {fileInput}
      {viewerFile&&<Viewer file={viewerFile} onClose={()=>setViewerFile(null)}/>}
      {/* header */}
      <div style={{padding:"13px 16px 11px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        {/* top row: PMQ + badges + date + edit button */}
        <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:10}}>
          <span style={{fontFamily:"monospace",fontSize:12,color:C.accentText,fontWeight:500}}>{item.pmqId}</span>
          {editing
            ? <div style={{display:"flex",gap:4}}>
                {["Low","Medium","High"].map(u=>{
                  const a=editVals.urgency===u;
                  const cl=u==="High"?C.danger:u==="Medium"?C.warning:C.success;
                  return <button key={u} onClick={()=>setEditVals(v=>({...v,urgency:u}))}
                    style={{fontSize:10,fontWeight:500,padding:"2px 9px",borderRadius:20,background:a?cl+"22":C.surface2,color:a?cl:C.hint,border:`1px solid ${a?cl+"55":C.border}`,cursor:"pointer",fontFamily:"inherit"}}>
                    {u}
                  </button>;
                })}
              </div>
            : <UrgBadge u={item.urgency}/>
          }
          <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:item.resolved?C.successDim:C.dangerDim,color:item.resolved?C.success:C.danger,fontWeight:500}}>{item.resolved?"Resolved":"Open"}</span>
          <span style={{fontSize:10,color:C.hint,marginLeft:"auto"}}>{fmtDate(item.createdAt)}</span>
          {/* edit / save / cancel buttons */}
          {!editing
            ? <button onClick={startEdit} title="Edit details"
                style={{width:26,height:26,borderRadius:6,background:"none",border:`1px solid ${C.border}`,cursor:"pointer",color:C.hint,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background=C.accentDim;e.currentTarget.style.borderColor="rgba(79,110,247,0.35)";e.currentTarget.style.color=C.accentText;}}
                onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.hint;}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            : <div style={{display:"flex",gap:5,marginLeft:"auto"}}>
                <button onClick={cancelEdit} style={{fontSize:11,padding:"3px 10px",borderRadius:6,background:"none",border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                <button onClick={saveEdit} style={{fontSize:11,padding:"3px 10px",borderRadius:6,background:C.accent,border:"none",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:500}}>Save</button>
              </div>
          }
        </div>

        {/* metadata — view or edit */}
        {!editing ? (
          <div style={{display:"flex",gap:"20px 32px",flexWrap:"wrap",alignItems:"flex-start",justifyContent:"center",padding:"4px 0"}}>
            <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center",textAlign:"center"}}>
              <span style={{fontSize:9,color:C.hint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>From</span>
              <span style={{fontSize:13,color:C.text,fontWeight:600}}>{item.from}</span>
              <span style={{fontSize:11,color:C.muted}}>{item.fromPos}</span>
            </div>
            {item.project&&<div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center",textAlign:"center"}}>
              <span style={{fontSize:9,color:C.hint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Job #</span>
              <span style={{fontSize:13,color:C.text,fontWeight:600}}>#{item.project}</span>
            </div>}
            {item.projectType&&<div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center",textAlign:"center"}}>
              <span style={{fontSize:9,color:C.hint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>Type</span>
              <span style={{fontSize:13,color:C.muted}}>{item.projectType}</span>
            </div>}
            {item.psRef&&<div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center",textAlign:"center"}}>
              <span style={{fontSize:9,color:C.hint,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>PS Ref</span>
              <span style={{fontSize:13,color:C.accentText}}>{item.psRef}</span>
            </div>}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              <div>
                <span style={fieldLbl}>Job number</span>
                <input style={fieldInp} value={editVals.project} onChange={e=>setEditVals(v=>({...v,project:e.target.value}))} placeholder="e.g. 4521"/>
              </div>
              <div>
                <span style={fieldLbl}>Project type</span>
                <select style={{...fieldInp,cursor:"pointer"}} value={editVals.projectType} onChange={e=>setEditVals(v=>({...v,projectType:e.target.value}))}>
                  <option value="">Select…</option>
                  {["Aero","Solar","Structural","General question"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <span style={fieldLbl}>ProjectSight ref</span>
                <input style={fieldInp} value={editVals.psRef} onChange={e=>setEditVals(v=>({...v,psRef:e.target.value}))} placeholder="RFI-0042, submittal ID…"/>
              </div>
            </div>
            <div>
              <span style={fieldLbl}>Additional context</span>
              <textarea value={editVals.additionalContext} onChange={e=>setEditVals(v=>({...v,additionalContext:e.target.value}))}
                style={{...fieldInp,minHeight:60,resize:"vertical",lineHeight:1.6}} placeholder="Add context for Loren…"/>
            </div>
          </div>
        )}
      </div>
      {/* thread */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
        <div style={{maxWidth:640,margin:"0 auto",display:"flex",flexDirection:"column",gap:12}}>
          {item.additionalContext&&(
            <div style={{background:C.accentDim,border:`1px solid rgba(79,110,247,0.2)`,borderRadius:9,padding:"10px 13px"}}>
              <p style={{fontSize:10,color:C.accentText,margin:"0 0 4px",fontWeight:500,textTransform:"uppercase",letterSpacing:"0.06em"}}>Additional context</p>
              <p style={{fontSize:13,color:C.text,margin:0,lineHeight:1.7}}>{item.additionalContext}</p>
            </div>
          )}
          {item.thread.map((m,i)=><Bubble key={m.id||i} m={m} isMe={m.role==="pm"&&user.canRespond} userColor={user.color} userInitials={user.initials} onView={setViewerFile}/>)}
          <div ref={bottomRef}/>
        </div>
      </div>
      {/* reply input */}
      {!item.resolved&&user.canRespond&&(
        <div style={{padding:"10px 16px 13px",borderTop:`1px solid ${C.border}`,flexShrink:0,background:C.bg}}
          onDragOver={e=>{e.preventDefault();setDragOver(true);}}
          onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false);}}
          onDrop={onDrop}>
          <div style={{maxWidth:640,margin:"0 auto"}}>
            {attErr&&<p style={{fontSize:11,color:C.danger,margin:"0 0 5px"}}>{attErr}</p>}
            <div style={{background:C.surface,border:`1px solid ${dragOver?"rgba(79,110,247,0.6)":C.borderHi}`,borderRadius:10,overflow:"hidden",marginBottom:8,transition:"border-color 0.15s",boxShadow:dragOver?"0 0 0 3px rgba(79,110,247,0.12)":"none"}}>
              <AttachTray attachments={attachments} onRemove={removeAt}/>
              <textarea ref={taRef} value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&(input.trim()||attachments.length)){e.preventDefault();doSend();}}}
                placeholder={dragOver?"Drop files to attach…":attachments.length?"Add a message (optional) or press Enter to send…":"Reply to this thread — Loren will see it as new…"} rows={1}
                style={{width:"100%",background:"none",border:"none",outline:"none",color:C.text,fontSize:13,fontFamily:"inherit",resize:"none",lineHeight:1.6,padding:"10px 12px",boxSizing:"border-box",display:"block",minHeight:44,maxHeight:120,overflowY:"auto"}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 8px 7px",borderTop:`1px solid ${C.border}`}}>
                <button onClick={openPicker}
                  title="Attach files — images, PDFs, drawings, docs"
                  style={{background:"none",border:"1px solid transparent",cursor:"pointer",color:C.hint,padding:"4px 5px",display:"flex",borderRadius:6,transition:"all 0.15s",alignItems:"center"}}
                  onMouseEnter={e=>{e.currentTarget.style.color=C.accent;e.currentTarget.style.background="rgba(79,110,247,0.12)";e.currentTarget.style.borderColor="rgba(79,110,247,0.3)";}}
                  onMouseLeave={e=>{e.currentTarget.style.color=C.hint;e.currentTarget.style.background="none";e.currentTarget.style.borderColor="transparent";}}>
                  <span style={{display:"flex",alignItems:"center"}}>{MI.paperclip}</span>
                </button>
                <button onClick={doSend} disabled={!input.trim()&&!attachments.length}
                  style={{width:27,height:27,borderRadius:7,background:(input.trim()||attachments.length)?C.accent:"rgba(255,255,255,0.05)",border:"none",cursor:(input.trim()||attachments.length)?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <button onClick={()=>onResolve(item.id)} style={{fontSize:11,padding:"5px 14px",borderRadius:20,background:C.successDim,border:`1px solid rgba(34,197,94,0.3)`,color:C.success,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Mark resolved
              </button>
            </div>
          </div>
        </div>
      )}
      {item.resolved&&(
        <div style={{padding:"10px 16px",borderTop:`1px solid ${C.border}`,background:C.bg,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <p style={{fontSize:11,color:C.muted,margin:0}}>Resolved · logged to knowledge base.</p>
          <button onClick={()=>onUnresolve(item.id)} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:C.warningDim,border:`1px solid rgba(245,158,11,0.3)`,color:C.warning,cursor:"pointer",fontFamily:"inherit"}}>Unresolve</button>
        </div>
      )}
      {!item.resolved&&!user.canRespond&&(
        <div style={{padding:"9px 16px",borderTop:`1px solid ${C.border}`,background:C.bg,flexShrink:0,textAlign:"center"}}>
          <p style={{fontSize:11,color:C.hint,margin:0}}>Only the Senior PM can respond to queue items.</p>
        </div>
      )}
    </div>
  );
}

// ── Chat Pane ──────────────────────────────────────────────────────────────
function ChatPane({chat,user,isAdmin,onEscalate,onResolve,onUnresolve,onSend,onSendReply,onMarkRead}) {
  const msgs=chat?.msgs||[];
  const hasBot=msgs.some(m=>m.role==="bot"&&!m.escalationNotice);
  const isResolved=chat?.resolved, isEscalated=chat?.escalated;
  const [input,setInput]=useState(""); const [loading,setLoading]=useState(false);
  const [viewerFile,setViewerFile]=useState(null);
  const [dragOver,setDragOver]=useState(false);
  const [activeSource,setActiveSource]=useState(null);
  const bottomRef=useRef(); const taRef=useRef();
  const {attachments,error:attErr,openPicker,handleFiles,removeAt,clear:clearAtt,fileInput}=useAttachments();

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading,chat?.id]);
  useEffect(()=>{setInput("");setLoading(false);clearAtt();},[chat?.id]);
  useEffect(()=>{if(chat?.unread)onMarkRead(chat.id);},[chat?.id,chat?.unread]);
  useEffect(()=>{if(taRef.current){taRef.current.style.height="auto";taRef.current.style.height=Math.min(taRef.current.scrollHeight,130)+"px";};},[input]);

  const send=async()=>{
    if((!input.trim()&&!attachments.length)||loading) return;
    const t=input.trim(), att=[...attachments]; setInput(""); clearAtt(); setLoading(true);
    await onSend(chat.id,t,att); setLoading(false);
  };
  const reply=()=>{
    if(!input.trim()&&!attachments.length) return;
    const att=[...attachments]; clearAtt();
    onSendReply(chat.id,input.trim(),att); setInput("");
  };

  const onDrop=e=>{e.preventDefault();handleFiles(e.dataTransfer.files);};

  const QUICK=["Minimum edge distance — A325 bolts in 3/8\" plate","Anchor rod hole size for 1-1/4\" rod","A572 Gr.50 sub for A36 without EOR approval?","CJP weld inspection requirements — AWS D1.1"];

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:C.bg,position:"relative"}}>
      {fileInput}
      {viewerFile&&<Viewer file={viewerFile} onClose={()=>setViewerFile(null)}/>}
      {activeSource&&<SourcePanel source={activeSource} onClose={()=>setActiveSource(null)}/>}
      <div style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <p style={{margin:0,fontWeight:600,fontSize:14,color:C.text}}>{chat?.title||"New conversation"}</p>
          <p style={{margin:0,fontSize:11,color:C.hint}}>AISC · CoSP · AWS D1.1 · KSF Standards — Kern Bot</p>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {isEscalated&&!isResolved&&<span style={{fontSize:11,padding:"2px 9px",borderRadius:20,background:C.pmDim,color:C.pm,fontFamily:"monospace"}}>{chat.pmqId}</span>}
          {isResolved&&<span style={{fontSize:11,padding:"2px 9px",borderRadius:20,background:C.successDim,color:C.success}}>Resolved</span>}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 0"}}>
        <div style={{maxWidth:640,margin:"0 auto",padding:"0 14px",display:"flex",flexDirection:"column",gap:14}}>
          {msgs.length===0&&(
            <div style={{textAlign:"center",padding:"44px 20px"}}>
              <div style={{width:36,height:36,borderRadius:8,background:"#1e2340",border:`1px solid rgba(255,255,255,0.1)`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                <span style={{color:"#fff",fontWeight:700,fontSize:11}}>KB</span>
              </div>
              <p style={{fontSize:14,fontWeight:500,color:C.text,margin:"0 0 6px"}}>Ask Kern Bot anything</p>
              <p style={{fontSize:12,color:C.muted,margin:"0 0 18px",lineHeight:1.7}}>Code questions, material specs, tolerances, procedures.<br/>Attach drawings, photos, or PDFs for context. Escalate if the answer isn't sufficient.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:7,justifyContent:"center"}}>
                {QUICK.map((q,i)=>(
                  <button key={i} onClick={()=>setInput(q)} style={{background:C.surface,border:`1px solid ${C.border}`,color:C.muted,borderRadius:20,padding:"4px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"border-color 0.15s"}}
                    onMouseEnter={e=>e.target.style.borderColor=C.accent} onMouseLeave={e=>e.target.style.borderColor=C.border}>{q}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m,idx)=>{
            const isMe=m.role==="user", isLast=idx===msgs.length-1;
            return (
              <div key={m.id}>
                <Bubble m={m} isMe={isMe} userColor={user.color} userInitials={user.initials} onView={setViewerFile} onSourceClick={setActiveSource}/>
                {!isAdmin&&m.role==="bot"&&m.confidence!=null&&!m.escalationNotice&&isLast&&!isEscalated&&!isResolved&&(
                  <div style={{paddingLeft:40,marginTop:7,display:"flex",gap:9,alignItems:"center"}}>
                    {m.confidence<80&&<span style={{fontSize:11,color:C.warning}}>⚠ Confidence below 80%</span>}
                    <button onClick={onEscalate} style={{fontSize:11,padding:"3px 11px",borderRadius:20,background:C.pmDim,border:`1px solid rgba(177,151,252,0.3)`,color:C.pm,cursor:"pointer",fontFamily:"inherit"}}>Escalate →</button>
                  </div>
                )}
              </div>
            );
          })}
          {loading&&(
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:C.accentDim,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:10,color:C.accent,fontWeight:700}}>KB</span>
              </div>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"3px 12px 12px 12px",padding:"11px 14px",display:"flex",alignItems:"center",gap:6}}>
                {[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:C.accent,animation:`kbdot 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      </div>

      {!isResolved&&(
        <div style={{padding:"9px 14px 12px",borderTop:`1px solid ${C.border}`,flexShrink:0,background:C.bg}}
          onDragOver={e=>{e.preventDefault();setDragOver(true);}}
          onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false);}}
          onDrop={e=>{e.preventDefault();setDragOver(false);onDrop(e);}}>
          <div style={{maxWidth:640,margin:"0 auto"}}>
            {attErr&&<p style={{fontSize:11,color:C.danger,margin:"0 0 5px"}}>{attErr}</p>}
            <div style={{background:C.surface,border:`1px solid ${dragOver?"rgba(79,110,247,0.6)":isEscalated?"rgba(167,139,250,0.32)":C.borderHi}`,borderRadius:10,overflow:"hidden",transition:"border-color 0.15s",boxShadow:dragOver?"0 0 0 3px rgba(79,110,247,0.12)":"none"}}>
              {/* attachment tray above textarea */}
              <AttachTray attachments={attachments} onRemove={removeAt}/>
              <textarea ref={taRef} value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();isEscalated?reply():send();}}}
                placeholder={attachments.length>0?"Add a message (optional) or press Enter to send…":isEscalated?"Reply to the thread — Loren will see this…":msgs.length===0?"Ask anything, or attach drawings/photos/PDFs for context…":"Follow up or attach files…"}
                disabled={loading} rows={1}
                style={{width:"100%",background:"none",border:"none",outline:"none",color:C.text,fontSize:13,fontFamily:"inherit",resize:"none",lineHeight:1.6,padding:"10px 12px",boxSizing:"border-box",display:"block",minHeight:40,maxHeight:130,overflowY:"auto"}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 8px 7px",borderTop:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {/* paperclip button */}
                  <button onClick={openPicker}
                    title="Attach files — images, PDFs, drawings, docs"
                    style={{background:"none",border:"1px solid transparent",cursor:"pointer",color:C.hint,padding:"4px 5px",display:"flex",borderRadius:6,transition:"all 0.15s",alignItems:"center"}}
                    onMouseEnter={e=>{e.currentTarget.style.color=C.accent;e.currentTarget.style.background="rgba(79,110,247,0.12)";e.currentTarget.style.borderColor="rgba(79,110,247,0.3)";}}
                    onMouseLeave={e=>{e.currentTarget.style.color=C.hint;e.currentTarget.style.background="none";e.currentTarget.style.borderColor="transparent";}}>
                    <span style={{display:"flex",alignItems:"center"}}>{MI.paperclip}</span>
                  </button>
                  <span style={{fontSize:10,color:isEscalated?C.pm:C.hint}}>{dragOver?"Drop files to attach…":isEscalated?"Thread open — reply or mark resolved":"Shift+Enter for new line · drag & drop files"}</span>
                </div>
                <button onClick={isEscalated?reply:send} disabled={loading||(!input.trim()&&!attachments.length)}
                  style={{width:27,height:27,borderRadius:7,background:(!loading&&(input.trim()||attachments.length))?(isEscalated?"rgba(167,139,250,0.55)":C.accent):"rgba(255,255,255,0.05)",border:"none",cursor:(!loading&&(input.trim()||attachments.length))?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:5}}>
              {!isAdmin&&!isEscalated&&hasBot
                ?<p style={{fontSize:10,color:C.hint,margin:0}}>Not satisfied?&nbsp;<button onClick={onEscalate} style={{background:"none",border:"none",cursor:"pointer",color:C.pm,fontSize:10,padding:0,fontFamily:"inherit"}}>Escalate →</button></p>
                :<span/>}
              {!isAdmin&&isEscalated&&(
                <button onClick={onResolve} style={{fontSize:10,padding:"3px 10px",borderRadius:20,background:C.successDim,border:`1px solid rgba(34,197,94,0.3)`,color:C.success,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:3}}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Mark resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {isResolved&&(
        <div style={{padding:"9px 14px",borderTop:`1px solid ${C.border}`,background:C.bg,flexShrink:0,textAlign:"center"}}>
          <p style={{fontSize:11,color:C.muted,margin:0}}>Resolved — logged to knowledge base.&nbsp;
            <button onClick={onUnresolve} style={{background:"none",border:"none",cursor:"pointer",color:C.hint,fontSize:11,padding:0,fontFamily:"inherit",textDecoration:"underline"}}>Unresolve</button>
          </p>
        </div>
      )}
      <style>{`@keyframes kbdot{0%,80%,100%{opacity:.2;transform:scale(.75)}40%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ── Sidebar rows ───────────────────────────────────────────────────────────
function ChatRow({c,active,isAdmin,onSelect,onRename,onEscalate,onResolve,onUnresolve,onDelete}) {
  const [menuOpen,setMenuOpen]=useState(false);
  const showUnread=!isAdmin&&c.unread&&!c.resolved;
  const dotColor=showUnread?C.warning:c.resolved?C.success:c.escalated?C.pm:null;
  const items=[{icon:"rename",label:"Rename",fn:()=>onRename(c.id)}];
  if(!isAdmin&&!c.escalated&&!c.resolved&&c.msgs?.some(m=>m.role==="bot"&&!m.escalationNotice)) items.push({icon:"escalate",label:"Escalate",fn:()=>onEscalate(c.id)});
  if(!isAdmin&&c.escalated&&!c.resolved) items.push({icon:"resolve",label:"Mark resolved",fn:()=>onResolve(c.id)});
  if(c.resolved) items.push({icon:"unresolve",label:"Unresolve",fn:()=>onUnresolve(c.id)});
  items.push("---"); items.push({icon:"delete",danger:true,label:"Delete",fn:()=>onDelete(c.id)});
  return (
    <div style={{position:"relative",marginBottom:1}}>
      <div onClick={()=>onSelect(c.id)} style={{display:"flex",alignItems:"center",borderRadius:6,cursor:"pointer",background:active?"rgba(79,110,247,0.11)":"none",border:`1px solid ${active?"rgba(79,110,247,0.28)":"transparent"}`,padding:"4px 4px 4px 6px",transition:"background 0.1s"}}
        onMouseEnter={e=>{if(!active)e.currentTarget.style.background="rgba(255,255,255,0.04)";}}
        onMouseLeave={e=>{if(!active)e.currentTarget.style.background="none";}}>
        <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,marginRight:5,background:dotColor||"transparent",border:dotColor&&!showUnread?`1.5px solid ${dotColor}`:"none"}}/>
        <div style={{flex:1,minWidth:0}}>
          <span style={{fontSize:14,color:active?C.text:c.resolved?C.hint:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block",lineHeight:1.35,opacity:c.resolved?0.65:1}}>{c.title}</span>
          {!c.resolved&&<span style={{fontSize:12,color:C.hint,display:"block",marginTop:1}}>{fmtRel(c.lastActivity||c.createdAt)}</span>}
        </div>
        <button onClick={e=>{e.stopPropagation();setMenuOpen(o=>!o);}} style={{background:"none",border:"none",cursor:"pointer",color:C.hint,padding:"2px 4px",borderRadius:4,display:"flex",alignItems:"center",flexShrink:0,opacity:menuOpen?1:0.4,transition:"opacity 0.1s"}}
          onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=menuOpen?"1":"0.4"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
        </button>
      </div>
      {menuOpen&&<CtxMenu items={items} onClose={()=>setMenuOpen(false)} style={{right:0,top:"calc(100% + 2px)"}}/>}
    </div>
  );
}

function QueueRow({q,active,onSelect,onRename,onResolve,onUnresolve,onRemove}) {
  const [menuOpen,setMenuOpen]=useState(false);
  const dotColor=q.resolved?C.success:C.danger;
  const items=[
    {icon:"rename",label:"Rename",fn:()=>onRename(q.id)},
    q.resolved?{icon:"unresolve",label:"Unresolve",fn:()=>onUnresolve(q.id)}:{icon:"resolve",label:"Mark resolved",fn:()=>onResolve(q.id)},
    "---",
    {icon:"remove",danger:true,label:"Remove",fn:()=>onRemove(q.id)},
  ];
  return (
    <div style={{position:"relative",marginBottom:1}}>
      <div onClick={()=>onSelect(q.id)} style={{display:"flex",alignItems:"center",borderRadius:6,cursor:"pointer",background:active?"rgba(167,139,250,0.1)":"none",border:`1px solid ${active?"rgba(167,139,250,0.28)":"transparent"}`,padding:"4px 4px 4px 6px",transition:"background 0.1s"}}
        onMouseEnter={e=>{if(!active)e.currentTarget.style.background="rgba(255,255,255,0.04)";}}
        onMouseLeave={e=>{if(!active)e.currentTarget.style.background="none";}}>
        <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,marginRight:5,background:dotColor}}/>
        <div style={{flex:1,minWidth:0}}>
          <span style={{fontSize:14,color:active?C.text:q.resolved?C.hint:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block",lineHeight:1.35,opacity:q.resolved?0.65:1}}>{q.title}</span>
          <span style={{fontSize:12,color:C.hint,display:"block",marginTop:1,fontFamily:"monospace"}}>{q.pmqId}{!q.resolved&&` · ${fmtRel(q.createdAt)}`}</span>
        </div>
        <button onClick={e=>{e.stopPropagation();setMenuOpen(o=>!o);}} style={{background:"none",border:"none",cursor:"pointer",color:C.hint,padding:"2px 4px",borderRadius:4,display:"flex",alignItems:"center",flexShrink:0,opacity:menuOpen?1:0.4,transition:"opacity 0.1s"}}
          onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=menuOpen?"1":"0.4"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
        </button>
      </div>
      {menuOpen&&<CtxMenu items={items} onClose={()=>setMenuOpen(false)} style={{right:0,top:"calc(100% + 2px)"}}/>}
    </div>
  );
}

// ── Login ──────────────────────────────────────────────────────────────────
function LoginScreen({onLogin}) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,-apple-system,sans-serif",padding:"2rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:"2rem"}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#1e2340",border:`1px solid rgba(255,255,255,0.1)`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontWeight:700,fontSize:14}}>KSF</span></div>
        <div><p style={{margin:0,fontWeight:500,fontSize:18,color:C.text}}>Kern Bot</p><p style={{margin:0,fontSize:12,color:C.muted}}>Select your profile to continue</p></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,width:"100%",maxWidth:640}}>
        {USERS_LIST.map(u=>(
          <button key={u.id} onClick={()=>onLogin(u)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 12px",cursor:"pointer",textAlign:"center",fontFamily:"inherit",transition:"border-color 0.15s",outline:"none"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=u.color+"60"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{width:40,height:40,borderRadius:"50%",background:u.color+"28",border:`1px solid ${u.color}40`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}><span style={{fontSize:13,fontWeight:600,color:u.color}}>{u.initials}</span></div>
            <p style={{margin:0,fontWeight:500,fontSize:13,color:C.text}}>{u.name}</p>
            <p style={{margin:"2px 0 0",fontSize:11,color:C.muted}}>{u.position}</p>
            {u.tier==="admin"&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,background:C.pmDim,color:C.pm,display:"inline-block",marginTop:6}}>Admin</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────────────────
function KernBotApp({preloadUser}) {
  useStore();
  const [user,      setUser]      = useState(preloadUser||null);
  const [chatId,    setChatId]    = useState(null);
  const [searchQ,   setSearchQ]   = useState("");
  const [escOpen,   setEscOpen]   = useState(false);
  const [escTarget, setEscTarget] = useState(null);
  const escTargetRef = useRef(null); // always-current ref to avoid stale closure
  const [renameId,  setRenameId]  = useState(null);
  const [renameQId, setRenameQId] = useState(null);
  const [adminView, setAdminView] = useState("chat");
  const [selQ,      setSelQ]      = useState(STORE.queue[0]?.id||null);

  const isAdmin = user?.tier==="admin";
  const myChats = user ? store.chats.filter(c=>c.owner===user.id) : [];

  const handleLogin = useCallback((u)=>{ setUser(u); const mine=store.chats.filter(c=>c.owner===u.id); setChatId(mine[0]?.id||null); setAdminView("chat"); setSearchQ(""); },[]);

  const newChat = () => {
    const id="c"+Date.now(), ts=nowStamp();
    store.addChat({id,owner:user.id,title:"New conversation",createdAt:ts,lastActivity:ts,escalated:false,resolved:false,unread:false,msgs:[]});
    setChatId(id); setAdminView("chat");
  };

  // onSend now accepts attachments array
  const handleSend = useCallback(async(id,text,attachments=[])=>{
    const um={id:nextId(),role:"user",text,attachments};
    const c=store.chats.find(x=>x.id===id); if(!c) return;
    const title=c.title==="New conversation"&&text?text.slice(0,44)+(text.length>44?"…":""):c.title==="New conversation"&&attachments.length?attachments[0].name:c.title;
    store.updateChat(id,{title,lastActivity:nowStamp(),msgs:[...c.msgs,um]});
    // Build conversation history for context (last 10 messages)
    const history=c.msgs.filter(m=>!m.escalationNotice&&(m.role==="user"||m.role==="bot")).slice(-10);
    const resp = await callKernBot(text, history);
    const c2=store.chats.find(x=>x.id===id); if(!c2) return;
    store.updateChat(id,{lastActivity:nowStamp(),msgs:[...c2.msgs,{id:nextId(),role:"bot",...resp}]});
  },[]);

  const handleSendReply = useCallback((cId,text,attachments=[])=>{
    const msg={id:nextId(),role:"user",text,attachments};
    const c=store.chats.find(x=>x.id===cId); if(!c) return;
    store.updateChat(cId,{lastActivity:nowStamp(),msgs:[...c.msgs,msg]});
    if(c.pmqId){ const q=store.queue.find(x=>x.pmqId===c.pmqId); if(!q) return; store.updateQueue(q.id,{thread:[...q.thread,{id:msg.id,role:"issuer",name:user?.name||"",text,attachments}]}); }
  },[user]);

  const handleQSend = useCallback((qId,text,fromName,attachments=[])=>{
    const msg={id:nextId(),role:"pm",name:fromName,text,attachments,unread:true};
    const q=store.queue.find(x=>x.id===qId); if(!q) return;
    store.updateQueue(qId,{thread:[...q.thread,msg]});
    const ic=store.chats.find(x=>x.pmqId===q.pmqId);
    if(ic) store.updateChat(ic.id,{unread:true,lastActivity:nowStamp(),msgs:[...ic.msgs,{...msg}]});
  },[]);

  const handleResolve    = () => { const c=store.chats.find(x=>x.id===chatId); if(c?.pmqId) store.resolveByPMQ(c.pmqId); else if(c) store.updateChat(c.id,{resolved:true,lastActivity:nowStamp()}); };
  const handleUnresolve  = () => { const c=store.chats.find(x=>x.id===chatId); if(c?.pmqId) store.unresolveByPMQ(c.pmqId); else if(c) store.updateChat(c.id,{resolved:false,lastActivity:nowStamp()}); };
  const handleQResolve   = qId => { const q=store.queue.find(x=>x.id===qId); if(q) store.resolveByPMQ(q.pmqId); };
  const handleQUnresolve = qId => { const q=store.queue.find(x=>x.id===qId); if(q) store.unresolveByPMQ(q.pmqId); };

  const openEsc = cId => {
    const target = cId || chatId;
    escTargetRef.current = target;
    setEscTarget(target);
    setEscOpen(true);
  };

  const submitEscalation = ctx => {
    const cId = escTargetRef.current || chatId;
    const pmqId = nextPMQ();
    const chat = store.chats.find(c=>c.id===cId);
    if(!chat) return;
    const newQ = {
      id:"q"+Date.now(), pmqId, title:chat.title||"Untitled",
      from:user.name, fromPos:user.position,
      project:ctx.proj, projectType:ctx.pt, urgency:ctx.urg, psRef:ctx.ps,
      createdAt:nowStamp(), resolved:false, additionalContext:ctx.ctx,
      thread:chat.msgs.filter(m=>!m.escalationNotice).map(m=>({
        id:m.id, role:m.role==="user"?"issuer":"bot",
        name:m.role==="user"?user.name:"Kern Bot",
        text:m.text, confidence:m.confidence??null, attachments:m.attachments||[]
      })),
    };
    store.addQueue(newQ);
    const notice = {id:nextId(),role:"bot",escalationNotice:true,text:`Escalated as ${pmqId}. Loren's replies will appear here.`};
    store.updateChat(cId,{escalated:true,pmqId,lastActivity:nowStamp(),msgs:[...chat.msgs,notice]});
    escTargetRef.current = null;
    setEscOpen(false);
    setEscTarget(null);
  };

  const markRead    = id => { const c=store.chats.find(x=>x.id===id); if(c) store.updateChat(id,{unread:false,msgs:c.msgs.map(m=>({...m,unread:false}))}); };
  const renameChat  = (cId,title) => {
    store.updateChat(cId,{title});
    const c=store.chats.find(x=>x.id===cId);
    if(c?.pmqId){ const q=store.queue.find(x=>x.pmqId===c.pmqId); if(q) store.updateQueue(q.id,{title}); }
  };
  const deleteChat  = cId => { store.removeChat(cId); if(chatId===cId) setChatId(null); };
  const renameQueue = (qId,title) => {
    store.updateQueue(qId,{title});
    const q=store.queue.find(x=>x.id===qId);
    if(q?.pmqId){ const c=store.chats.find(x=>x.pmqId===q.pmqId); if(c) store.updateChat(c.id,{title}); }
  };
  const removeQueue = qId => store.removeQueue(qId);

  const activeChat = store.chats.find(c=>c.id===chatId);
  const qItem      = store.queue.find(q=>q.id===selQ);
  const filtered   = myChats.filter(c=>!searchQ||c.title.toLowerCase().includes(searchQ.toLowerCase()));
  const stdChats   = filtered.filter(c=>!c.escalated&&!c.resolved).sort((a,b)=>new Date(a.lastActivity||a.createdAt)-new Date(b.lastActivity||b.createdAt));
  const escChats   = filtered.filter(c=> c.escalated&&!c.resolved).sort((a,b)=>new Date(a.lastActivity||a.createdAt)-new Date(b.lastActivity||b.createdAt));
  const resChats   = filtered.filter(c=> c.resolved).sort((a,b)=>new Date(b.lastActivity||b.createdAt)-new Date(a.lastActivity||a.createdAt));
  const qUnresolved= store.queue.filter(q=>!q.resolved).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const qResolved  = store.queue.filter(q=> q.resolved);

  const SecHdr = ({label,count,color}) => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"8px 2px 3px"}}>
      <span style={{fontSize:10,color:C.hint,textTransform:"uppercase",letterSpacing:"0.07em"}}>{label}</span>
      {count>0&&<span style={{fontSize:10,fontWeight:600,padding:"1px 6px",borderRadius:10,background:color+"22",color}}>{count}</span>}
    </div>
  );

  const chatRowProps = c => ({
    c, active:c.id===chatId&&adminView==="chat", isAdmin,
    onSelect:  id=>{setChatId(id);setAdminView("chat");markRead(id);},
    onRename:  id=>setRenameId(id),
    onEscalate:id=>openEsc(id),
    onResolve: id=>{ const ch=store.chats.find(x=>x.id===id); if(ch?.pmqId) store.resolveByPMQ(ch.pmqId); else if(ch) store.updateChat(id,{resolved:true,lastActivity:nowStamp()}); },
    onUnresolve:id=>{ const ch=store.chats.find(x=>x.id===id); if(ch?.pmqId) store.unresolveByPMQ(ch.pmqId); else if(ch) store.updateChat(id,{resolved:false,lastActivity:nowStamp()}); },
    onDelete:  id=>deleteChat(id),
  });

  // Login handled by shell — preloadUser is always set
  if(!user) return null;

  const renameSrc  = store.chats.find(c=>c.id===renameId);
  const renameQSrc = store.queue.find(q=>q.id===renameQId);

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:"system-ui,-apple-system,sans-serif",overflow:"hidden",position:"relative"}}>
      {/* ── Sidebar ── */}
      <div style={{width:240,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
        <div style={{padding:"9px 8px 7px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <div style={{width:25,height:25,borderRadius:6,background:"#1e2340",border:`1px solid rgba(255,255,255,0.1)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:10}}>KSF</span>
            </div>
            <span style={{fontWeight:500,fontSize:13,color:C.text,flex:1}}>Kern Bot</span>
            <div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:5,height:5,borderRadius:"50%",background:C.success}}/><span style={{fontSize:10,color:C.success}}>live</span></div>
          </div>
          <button onClick={newChat} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 9px",color:C.text,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",marginBottom:6}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke={C.muted} strokeWidth="2" strokeLinecap="round"/></svg>New conversation
          </button>
          <div style={{position:"relative"}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",opacity:0.4}}><circle cx="11" cy="11" r="8" stroke={C.hint} strokeWidth="1.5"/><path d="M21 21l-4.35-4.35" stroke={C.hint} strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search" style={{width:"100%",paddingLeft:24,paddingRight:7,paddingTop:5,paddingBottom:5,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box",outline:"none"}}/>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"2px 7px 6px"}}>
          {stdChats.length>0&&<><SecHdr label="Conversations" count={0} color={C.accent}/>{stdChats.map(c=><ChatRow key={c.id} {...chatRowProps(c)}/>)}</>}
          {escChats.length>0&&<div style={{marginTop:stdChats.length?6:0}}><SecHdr label="Escalated" count={escChats.length} color={C.pm}/>{escChats.map(c=><ChatRow key={c.id} {...chatRowProps(c)}/>)}</div>}
          {resChats.length>0&&<div style={{marginTop:(stdChats.length+escChats.length)?4:0}}><div style={{height:1,background:C.border,margin:"6px 0 2px"}}/><SecHdr label="Resolved" count={resChats.length} color={C.success}/>{resChats.map(c=><ChatRow key={c.id} {...chatRowProps(c)}/>)}</div>}

          {isAdmin&&(
            <div style={{marginTop:6}}>
              <div style={{height:1,background:C.border,margin:"6px 0 2px"}}/>
              {qUnresolved.length>0&&<><SecHdr label="Queue · Open" count={qUnresolved.length} color={C.danger}/>{qUnresolved.map(q=><QueueRow key={q.id} q={q} active={q.id===selQ&&adminView==="queue"} onSelect={id=>{setSelQ(id);setAdminView("queue");}} onRename={id=>setRenameQId(id)} onResolve={handleQResolve} onUnresolve={handleQUnresolve} onRemove={removeQueue}/>)}</>}
              {qResolved.length>0&&<><SecHdr label="Queue · Resolved" count={qResolved.length} color={C.success}/>{qResolved.map(q=><QueueRow key={q.id} q={q} active={q.id===selQ&&adminView==="queue"} onSelect={id=>{setSelQ(id);setAdminView("queue");}} onRename={id=>setRenameQId(id)} onResolve={handleQResolve} onUnresolve={handleQUnresolve} onRemove={removeQueue}/>)}</>}
              <button onClick={()=>setAdminView("standards")} style={{width:"100%",marginTop:7,background:adminView==="standards"?"rgba(79,110,247,0.1)":"none",border:`1px solid ${adminView==="standards"?"rgba(79,110,247,0.28)":"transparent"}`,borderRadius:6,padding:"5px 7px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={adminView==="standards"?C.accentText:C.hint} strokeWidth="1.5" strokeLinecap="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={adminView==="standards"?C.accentText:C.hint} strokeWidth="1.5"/></svg>
                <span style={{fontSize:11,color:adminView==="standards"?C.accentText:C.hint}}>Standards library</span>
              </button>
            </div>
          )}
        </div>

        <div style={{padding:"8px 9px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:user.color+"30",border:`1px solid ${user.color}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:8,fontWeight:600,color:user.color}}>{user.initials}</span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:0,fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</p>
              <p style={{margin:0,fontSize:11,color:C.hint}}>{user.position}</p>
            </div>
{/* logout handled by shell sidebar */}
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      {adminView==="chat"&&<ChatPane chat={activeChat} user={user} isAdmin={isAdmin} onEscalate={()=>openEsc(chatId)} onResolve={handleResolve} onUnresolve={handleUnresolve} onSend={handleSend} onSendReply={handleSendReply} onMarkRead={markRead}/>}
      {adminView==="queue"&&isAdmin&&<QueueDetail item={qItem} user={user} onSend={handleQSend} onResolve={handleQResolve} onUnresolve={handleQUnresolve}/>}
      {adminView==="standards"&&isAdmin&&<StdList user={user}/>}

      {escOpen&&<EscalateModal msgs={store.chats.find(c=>c.id===(escTargetRef.current||chatId))?.msgs||[]} onSubmit={submitEscalation} onClose={()=>{escTargetRef.current=null;setEscOpen(false);setEscTarget(null);}}/>}
      {renameId&&renameSrc&&<RenameModal current={renameSrc.title} onSave={t=>renameChat(renameId,t)} onClose={()=>setRenameId(null)}/>}
      {renameQId&&renameQSrc&&<RenameModal current={renameQSrc.title} onSave={t=>renameQueue(renameQId,t)} onClose={()=>setRenameQId(null)}/>}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN SHELL
// ─────────────────────────────────────────────────────────────────────────────
export default function KSFCommandCenter() {
  const [shellUser, setShellUser] = useState(null);
  const [tab, setTab] = useState("kernbot");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if(!shellUser) return <ShellLogin onLogin={u=>{ setShellUser(u); setTab("kernbot"); }}/>;

  const kbUser = USERS_LIST.find(u=>u.id===shellUser.id) || USERS_LIST[0];

  const Sidebar = ({mobile=false}) => (
    <aside style={{
      width:230, background:"#000000",
      borderRight:"1px solid rgba(255,255,255,0.06)",
      display:"flex", flexDirection:"column", flexShrink:0,
      ...(mobile ? {
        position:"absolute", inset:"0 auto 0 0", zIndex:200,
        boxShadow:"4px 0 24px rgba(0,0,0,0.5)"
      } : {})
    }}>
      {/* Brand */}
      <div style={{padding:"18px 16px 14px", display:"flex", alignItems:"center", gap:10}}>
        {mobile&&(
          <button onClick={()=>setSidebarOpen(false)}
            style={{background:"none",border:"none",color:"#6b7280",cursor:"pointer",padding:"2px 6px 2px 0",display:"flex",flexShrink:0}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
        <div style={{width:26,height:26,borderRadius:6,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#cccccc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <span style={{fontSize:14,fontWeight:700,color:"#f0f2f8",letterSpacing:"-0.02em",whiteSpace:"nowrap"}}>KSF Command Center</span>
      </div>

      {/* Divider */}
      <div style={{height:1,background:"rgba(255,255,255,0.05)",margin:"0 12px 8px"}}/>

      {/* Nav */}
      <nav style={{flex:1,overflowY:"auto",padding:"2px 8px"}}>
        {NAV_ITEMS.map(item=>{
          const Icon=NAV_ICONS[item.id];
          const active=tab===item.id;
          return (
            <button key={item.id} onClick={()=>{setTab(item.id);if(mobile)setSidebarOpen(false);}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:6,border:"none",background:active?"rgba(255,255,255,0.08)":"transparent",cursor:"pointer",fontFamily:"inherit",marginBottom:1,color:active?"#ffffff":"#666666",fontSize:13,fontWeight:active?500:400,textAlign:"left",transition:"background 0.1s,color 0.1s"}}
              onMouseEnter={e=>{ if(!active){e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.color="#aaaaaa";}}}
              onMouseLeave={e=>{ if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#6b7280";}}}>
              <span style={{flexShrink:0,display:"flex",alignItems:"center",opacity:active?1:0.6,color:active?"#ffffff":"currentColor"}}><Icon/></span>
              <span style={{flex:1}}>{item.label}</span>
              {item.id==="kernbot"&&<span style={{width:6,height:6,borderRadius:"50%",background:"#34d399",flexShrink:0}}/>}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{height:1,background:"rgba(255,255,255,0.05)",margin:"8px 12px 0"}}/>

      {/* User footer */}
      <div style={{padding:"12px 12px 16px",display:"flex",alignItems:"center",gap:9}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:shellUser.color+"22",border:`1px solid ${shellUser.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:10,color:shellUser.color,flexShrink:0,letterSpacing:"0.02em"}}>
          {shellUser.initials}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:12,fontWeight:500,color:"#dddddd",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{shellUser.name}</p>
          <p style={{margin:0,fontSize:11,color:"#555555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{shellUser.role}</p>
        </div>
        <button onClick={()=>setShellUser(null)} title="Sign out"
          style={{width:24,height:24,borderRadius:4,background:"none",border:"none",color:"#555555",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,padding:0}}
          onMouseEnter={e=>{e.currentTarget.style.color="#aaaaaa";e.currentTarget.style.background="rgba(255,255,255,0.06)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="#4b5563";e.currentTarget.style.background="none";}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:SHELL_COLORS.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",overflow:"hidden",position:"relative"}}>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="ksf-sidebar-desktop" style={{display:"flex"}}>
        <Sidebar/>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen&&(
        <>
          <div onClick={()=>setSidebarOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",zIndex:190}}/>
          <Sidebar mobile/>
        </>
      )}

      {/* Main */}
      <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative",minWidth:0}}>
        {/* Mobile top bar */}
        <div className="ksf-mobile-bar" style={{display:"none",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)",flexShrink:0,background:"#000000"}}>
          <button onClick={()=>setSidebarOpen(true)}
            style={{background:"none",border:"none",color:"#6b7280",cursor:"pointer",padding:4,display:"flex",alignItems:"center"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span style={{fontSize:12,fontWeight:600,color:"#dddddd"}}>KSF Command Center</span>
          <span style={{fontSize:11,color:"#6b7280",marginLeft:"auto"}}>{NAV_ITEMS.find(i=>i.id===tab)?.label}</span>
        </div>

        {tab==="kernbot"  && <KernBotApp preloadUser={kbUser}/>}
        {tab==="dashboard"&& <ComingSoon label="Dashboard"/>}
        {tab==="rfi"      && <ComingSoon label="RFI Log"/>}
        {tab==="scope"    && <ComingSoon label="Scope Tracker"/>}
        {tab==="changes"  && <ComingSoon label="Change Orders"/>}
        {tab==="fab"      && <ComingSoon label="Fabrication & Shipping"/>}
        {tab==="field"    && <ComingSoon label="Field Needs"/>}
        {tab==="owner"    && <ComingSoon label="Owner Pending"/>}
        {tab==="detailing"&& <ComingSoon label="Detailing"/>}
      </main>

      <style>{`
        @media (max-width: 640px) {
          .ksf-sidebar-desktop { display: none !important; }
          .ksf-mobile-bar { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
