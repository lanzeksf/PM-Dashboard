import React, { useState, useEffect } from "react";
import { C, fmtRel, daysAgo, hoursAgo } from "../core/utils.jsx";

const PROJECTS = [
  { id: "p1", name: "Stockdale Tower",        client: "Bolthouse Properties",  vertical: "Structural", contractValue: 1420000, pm: "tony",    status: "active" },
  { id: "p2", name: "CSUB Science Building",  client: "Cal State Bakersfield", vertical: "Structural", contractValue: 2850000, pm: "loren",   status: "active" },
  { id: "p3", name: "Ming Ave Retail Center", client: "Pacific Coast Dev.",    vertical: "Structural", contractValue: 680000,  pm: "tony",    status: "active" },
  { id: "p4", name: "Kern High Carports",     client: "KHSD Facilities",       vertical: "Solar",      contractValue: 940000,  pm: "luis",    status: "active" },
  { id: "p5", name: "Dignity Health Parking", client: "Dignity Health",        vertical: "Solar",      contractValue: 1150000, pm: "jillian", status: "active" },
  { id: "p6", name: "F-35 Stand – Lot 4",     client: "Lockheed Martin",       vertical: "Aero",       contractValue: 3200000, pm: "adam",    status: "active" },
  { id: "p7", name: "USAF Ground Support",    client: "US Air Force",          vertical: "Aero",       contractValue: 875000,  pm: "adam",    status: "active" },
];
const OWNER_PENDING = [
  { id: "op1", projectId: "p1", project: "Stockdale Tower",        subject: "Approve grid line revision — Column D4 relocation",  createdAt: daysAgo(7),  source: "email" },
  { id: "op2", projectId: "p2", project: "CSUB Science Building",  subject: "Confirm anchor bolt pattern — Grid B / Level 2",     createdAt: daysAgo(3),  source: "manual" },
  { id: "op3", projectId: "p4", project: "Kern High Carports",     subject: "AHJ permit approval — Lot C expansion",              createdAt: daysAgo(9),  source: "email" },
  { id: "op4", projectId: "p5", project: "Dignity Health Parking", subject: "Owner sign-off on revised bay spacing",              createdAt: daysAgo(2),  source: "manual" },
  { id: "op5", projectId: "p6", project: "F-35 Stand – Lot 4",     subject: "EO approval pending — field weld mod at Sta. 14",    createdAt: daysAgo(6),  source: "projectsight" },
];
const FIELD_NEEDS = [
  { id: "fn1", projectId: "p1", project: "Stockdale Tower",        issue: "Missing anchor bolts at grid C3 — erection halted",  urgency: "High",   submittedBy: "jacob", assignedTo: "tony",  createdAt: hoursAgo(4), status: "Open", source: "manual" },
  { id: "fn2", projectId: "p2", project: "CSUB Science Building",  issue: "Beam camber on W18x97 exceeds tolerance — hold fab", urgency: "High",   submittedBy: "jacob", assignedTo: "loren", createdAt: daysAgo(1),  status: "Open", source: "email" },
  { id: "fn3", projectId: "p3", project: "Ming Ave Retail Center", issue: "Column base plate elevation off 3/8in at grid A1",   urgency: "Medium", submittedBy: "jacob", assignedTo: "tony",  createdAt: daysAgo(2),  status: "Open", source: "manual" },
  { id: "fn4", projectId: "p4", project: "Kern High Carports",     issue: "Purlin spacing inconsistency vs. approved drawings", urgency: "Medium", submittedBy: "jacob", assignedTo: "luis",  createdAt: daysAgo(3),  status: "Open", source: "manual" },
];
const SCOPE_ITEMS = [
  { id: "sc1", projectId: "p1", project: "Stockdale Tower",        description: "Added beam reinforcement — grid D4 per RFI-014",       amount: 18400, noticeDeadlineDays: 14, createdAt: daysAgo(16), notified: false, source: "manual" },
  { id: "sc2", projectId: "p2", project: "CSUB Science Building",  description: "Lateral brace addition — seismic upgrade Level 3",     amount: 34200, noticeDeadlineDays: 14, createdAt: daysAgo(5),  notified: false, source: "email" },
  { id: "sc3", projectId: "p3", project: "Ming Ave Retail",        description: "Owner-directed connection change — Col. A1 base plate", amount: 6800,  noticeDeadlineDays: 7,  createdAt: daysAgo(8),  notified: false, source: "manual" },
  { id: "sc4", projectId: "p5", project: "Dignity Health Parking", description: "Additional canopy bay added — south end",               amount: 52000, noticeDeadlineDays: 14, createdAt: daysAgo(3),  notified: true,  source: "email" },
];
// status: "Proposed" | "Approved" | "Executed"
// Dashboard shows only Proposed + overdue. Approved = in progress. Executed = done (never shown).
// TODO: Replace with Spectrum API — map Spectrum CO status values to Proposed/Approved/Executed here.
const CHANGE_ORDERS = [
  { id: "co1", projectId: "p1", project: "Stockdale Tower",        coNumber: "CO-007", description: "Grid D4 beam reinforcement + RFI-014 work",          amount: 18400, sentDate: daysAgo(12), dueDate: daysAgo(2),  status: "Proposed" },
  { id: "co2", projectId: "p2", project: "CSUB Science Building",  coNumber: "CO-003", description: "Seismic lateral brace upgrade — Level 3",            amount: 34200, sentDate: daysAgo(4),  dueDate: daysAgo(-3), status: "Proposed" },
  { id: "co3", projectId: "p3", project: "Ming Ave Retail",        coNumber: "CO-002", description: "Base plate connection change at Col. A1",             amount: 6800,  sentDate: daysAgo(9),  dueDate: daysAgo(-1), status: "Approved" },
  { id: "co4", projectId: "p4", project: "Kern High Carports",     coNumber: "CO-005", description: "Lot C canopy extension — additional structural steel", amount: 41500, sentDate: daysAgo(6),  dueDate: daysAgo(-5), status: "Proposed" },
  { id: "co5", projectId: "p6", project: "F-35 Stand – Lot 4",     coNumber: "CO-011", description: "Station 14 weld mod per EO-2026-044",                 amount: 28700, sentDate: daysAgo(3),  dueDate: daysAgo(-7), status: "Executed" },
  { id: "co6", projectId: "p2", project: "CSUB Science Building",  coNumber: "CO-004", description: "Additional shear tabs — stair framing Level 2",       amount: 9100,  sentDate: daysAgo(14), dueDate: daysAgo(3),  status: "Proposed" },
];
const FAB_JOBS = [
  { id: "fj1", projectId: "p1", project: "Stockdale Tower",        vertical: "Structural", totalPieces: 214, shipped: 48,  inFab: 80,  queued: 86,  phase: "Active Fab"    },
  { id: "fj2", projectId: "p2", project: "CSUB Science Building",  vertical: "Structural", totalPieces: 388, shipped: 0,   inFab: 40,  queued: 348, phase: "Starting"      },
  { id: "fj3", projectId: "p3", project: "Ming Ave Retail",        vertical: "Structural", totalPieces: 96,  shipped: 96,  inFab: 0,   queued: 0,   phase: "Complete"      },
  { id: "fj4", projectId: "p4", project: "Kern High Carports",     vertical: "Solar",      totalPieces: 160, shipped: 120, inFab: 30,  queued: 10,  phase: "Near Complete" },
  { id: "fj5", projectId: "p5", project: "Dignity Health Parking", vertical: "Solar",      totalPieces: 204, shipped: 0,   inFab: 0,   queued: 204, phase: "Not Started"   },
  { id: "fj6", projectId: "p6", project: "F-35 Stand – Lot 4",     vertical: "Aero",       totalPieces: 72,  shipped: 22,  inFab: 35,  queued: 15,  phase: "Active Fab"    },
  { id: "fj7", projectId: "p7", project: "USAF Ground Support",    vertical: "Aero",       totalPieces: 54,  shipped: 54,  inFab: 0,   queued: 0,   phase: "Complete"      },
];
// TODO: Replace with live store.queue once wired to this component
const KB_QUEUE_SEED = [
  { id: "q1", pmqId: "PMQ-2026-0001", title: "Seismic brace connection — CSUB Level 3", from: "Tony S.",  project: "CSUB Science Building", projectType: "Structural", urgency: "High",   createdAt: daysAgo(3),  resolved: false },
  { id: "q2", pmqId: "PMQ-2026-0002", title: "AHJ comment response — Kern High solar",  from: "Luis A.",  project: "Kern High Carports",    projectType: "Solar",      urgency: "Medium", createdAt: daysAgo(1),  resolved: false },
  { id: "q3", pmqId: "PMQ-2026-0003", title: "EO process for F-35 field weld mod",      from: "Adam K.",  project: "F-35 Stand – Lot 4",    projectType: "Aero",       urgency: "High",   createdAt: hoursAgo(5), resolved: false },
  { id: "q4", pmqId: "PMQ-2026-0004", title: "Anchor rod jam nut spec — Stockdale",     from: "Tony S.",  project: "Stockdale Tower",       projectType: "Structural", urgency: "Low",    createdAt: daysAgo(5),  resolved: false },
];

const WIDGET_META = {
  project_health: { label: "Project Health",       size: "wide" },
  fab_snapshot:   { label: "Fabrication Snapshot", size: "wide" },
  field_needs:    { label: "Field Needs",           size: "half" },
  owner_pending:  { label: "Owner Pending",         size: "half" },
  scope_items:    { label: "Unnotified Scope",      size: "half" },
  change_orders:  { label: "Change Orders",         size: "half" },
  kb_inquiries:   { label: "KernBot Inquiries",     size: "half" },
};
const ROLE_LAYOUTS = {
  admin:       ["project_health","fab_snapshot","kb_inquiries","field_needs","owner_pending","scope_items","change_orders"],
  sr_pm:       ["project_health","fab_snapshot","kb_inquiries","field_needs","owner_pending","scope_items","change_orders"],
  apm:         ["project_health","field_needs","owner_pending","change_orders","fab_snapshot","scope_items"],
  coordinator: ["project_health","field_needs","owner_pending","change_orders","fab_snapshot","scope_items"],
  mfg_eng:     ["fab_snapshot","project_health","field_needs"],
  field:       ["field_needs","fab_snapshot"],
};

const firstName = name => name.split(" ")[0];
const daysSince = iso  => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const daysUntil = iso  => Math.floor((new Date(iso).getTime() - Date.now()) / 86400000);
const fmtMoney  = n    => "$" + n.toLocaleString();
const greeting  = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const vcol      = v => ({ Structural:{color:"#38bdf8",bg:"rgba(56,189,248,0.12)"},Solar:{color:"#fbbf24",bg:"rgba(251,191,36,0.12)"},Aero:{color:"#a78bfa",bg:"rgba(167,139,250,0.12)"} }[v]||{color:C.muted,bg:C.surface2});
const VertBadge = ({v}) => { const vc=vcol(v); return <span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,background:vc.bg,color:vc.color,border:`1px solid ${vc.color}33`,whiteSpace:"nowrap"}}>{v}</span>; };
const SourcePill = ({source}) => { if(!source||source==="manual") return null; const m={email:{color:"#38bdf8",label:"EMAIL"},projectsight:{color:"#a78bfa",label:"PS"}}; const s=m[source]; if(!s) return null; return <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:s.color+"20",color:s.color,letterSpacing:"0.04em"}}>{s.label}</span>; };
const ageColor  = (iso,r=5,y=3) => { const d=daysSince(iso); return d>=r?C.danger:d>=y?C.warning:C.muted; };
const ddColor   = iso => { const d=daysUntil(iso); return d<0?C.danger:d<=3?C.warning:C.success; };
const ddLabel   = iso => { const d=daysUntil(iso); if(d<0) return `${Math.abs(d)}d overdue`; if(d===0) return "Due today"; return d===1?"Due tomorrow":`Due in ${d}d`; };
const scColor   = item => { const r=item.noticeDeadlineDays-daysSince(item.createdAt); return r<=0?C.danger:r<=3?C.warning:C.muted; };
const scLabel   = item => { const r=item.noticeDeadlineDays-daysSince(item.createdAt); if(r<=0) return `${Math.abs(r)}d past window`; return r<=3?`${r}d left`:`${r}d remaining`; };
const urgColor  = u => u==="High"?C.danger:u==="Medium"?C.warning:C.muted;
const coStColor = s => ({Proposed:C.warning,Approved:C.success,Executed:C.hint}[s]||C.muted);

const filterByUser = user => {
  const isAdmin = user.tier==="admin"||user.tier==="sr_pm";
  const dept    = user.department?.label;
  const myP     = isAdmin?PROJECTS:dept?PROJECTS.filter(p=>p.vertical===dept||p.pm===user.id):PROJECTS.filter(p=>p.pm===user.id);
  const ids     = new Set(myP.map(p=>p.id));
  return {
    projects:     myP,
    ownerPending: OWNER_PENDING.filter(x=>ids.has(x.projectId)),
    fieldNeeds:   user.role==="field"?FIELD_NEEDS.filter(x=>x.submittedBy===user.id):FIELD_NEEDS.filter(x=>ids.has(x.projectId)),
    scopeItems:   SCOPE_ITEMS.filter(x=>ids.has(x.projectId)&&!x.notified),
    changeOrders: CHANGE_ORDERS.filter(x=>ids.has(x.projectId)&&x.status==="Proposed"&&daysUntil(x.dueDate)<0),
    fabJobs:      FAB_JOBS.filter(x=>ids.has(x.projectId)),
    kbQueue:      isAdmin?KB_QUEUE_SEED.filter(x=>!x.resolved):[],
  };
};

function EmptyState({text}){ return <p style={{margin:0,fontSize:12,color:C.hint,textAlign:"center",padding:"16px 0"}}>{text}</p>; }

function ItemRow({dotColor,onClick,children}){
  return (
    <div onClick={onClick} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 10px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,marginBottom:6,cursor:"pointer",transition:"border-color 0.12s"}}
      onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderHi} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
      <div style={{width:6,height:6,borderRadius:"50%",background:dotColor,marginTop:4,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>{children}</div>
    </div>
  );
}

function Widget({title,count,countColor,editMode,onHide,onDragStart,onDragOver,onDrop,onDragEnd,isDragOver,children}){
  return (
    <div draggable={editMode} onDragStart={editMode?onDragStart:undefined}
      onDragOver={editMode?e=>{e.preventDefault();onDragOver();}:undefined}
      onDrop={editMode?e=>{e.preventDefault();onDrop();}:undefined}
      onDragEnd={editMode?onDragEnd:undefined}
      style={{background:C.surface,border:`1px solid ${isDragOver?C.accent:editMode?C.accent+"44":C.border}`,borderRadius:12,display:"flex",flexDirection:"column",overflow:"hidden",transition:"border-color 0.15s",cursor:editMode?"grab":"default",opacity:isDragOver?0.55:1,outline:isDragOver?`2px dashed ${C.accent}`:"none"}}>
      <div style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8,background:C.surface2,flexShrink:0}}>
        {editMode&&(
          <div style={{display:"flex",flexDirection:"column",gap:2,opacity:0.35,flexShrink:0,marginRight:2}}>
            {[0,1,2].map(i=><div key={i} style={{display:"flex",gap:2}}><div style={{width:3,height:3,borderRadius:"50%",background:C.muted}}/><div style={{width:3,height:3,borderRadius:"50%",background:C.muted}}/></div>)}
          </div>
        )}
        <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:C.muted,flex:1}}>{title}</span>
        {count!==undefined&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:(countColor||C.accent)+"22",color:countColor||C.accentText}}>{count}</span>}
        {editMode&&<button onClick={onHide} style={{width:22,height:22,borderRadius:4,border:`1px solid ${C.danger}44`,background:C.dangerDim,color:C.danger,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,marginLeft:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>}
      </div>
      <div style={{padding:"12px 14px",flex:1,overflowY:"auto",maxHeight:340}}>{children}</div>
    </div>
  );
}

function ProjectHealthContent({data,setTab}){
  const {projects,ownerPending,fieldNeeds,scopeItems,changeOrders}=data;
  const risk=proj=>{
    if(fieldNeeds.some(x=>x.projectId===proj.id&&x.urgency==="High"&&x.status==="Open")) return "High";
    if(scopeItems.some(x=>x.projectId===proj.id&&daysSince(x.createdAt)>x.noticeDeadlineDays)) return "High";
    if(changeOrders.some(x=>x.projectId===proj.id)) return "High";
    if(ownerPending.some(x=>x.projectId===proj.id&&daysSince(x.createdAt)>=3)) return "Medium";
    return "Low";
  };
  const rc=r=>r==="High"?C.danger:r==="Medium"?C.warning:C.success;
  const cnt=proj=>ownerPending.filter(x=>x.projectId===proj.id).length+fieldNeeds.filter(x=>x.projectId===proj.id&&x.status==="Open").length+scopeItems.filter(x=>x.projectId===proj.id).length+CHANGE_ORDERS.filter(x=>x.projectId===proj.id&&x.status!=="Executed").length;
  const top=proj=>{
    const fn=fieldNeeds.find(x=>x.projectId===proj.id&&x.urgency==="High"&&x.status==="Open"); if(fn) return{text:fn.issue,tab:"field",color:C.danger};
    const sc=scopeItems.find(x=>x.projectId===proj.id&&daysSince(x.createdAt)>x.noticeDeadlineDays); if(sc) return{text:`Scope past window: ${sc.description}`,tab:"scope",color:C.danger};
    const co=changeOrders.find(x=>x.projectId===proj.id); if(co) return{text:`${co.coNumber} proposed & ${Math.abs(daysUntil(co.dueDate))}d overdue`,tab:"changes",color:C.warning};
    const op=ownerPending.find(x=>x.projectId===proj.id); if(op) return{text:`Owner item ${daysSince(op.createdAt)}d waiting`,tab:"owner",color:ageColor(op.createdAt)};
    return null;
  };
  if(projects.length===0) return <EmptyState text="No active projects"/>;
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(250px,1fr))",gap:10}}>
      {projects.map(proj=>{
        const r=risk(proj),color=rc(r),count=cnt(proj),issue=top(proj);
        return (
          <div key={proj.id} onClick={()=>issue&&setTab(issue.tab)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",borderLeft:`3px solid ${color}`,cursor:issue?"pointer":"default",transition:"border-color 0.12s"}}
            onMouseEnter={e=>{if(issue){e.currentTarget.style.borderColor=C.borderHi;e.currentTarget.style.borderLeftColor=color;}}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.borderLeftColor=color;}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
              <span style={{fontSize:12,fontWeight:700,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{proj.name}</span>
              <VertBadge v={proj.vertical}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:issue?7:0}}>
              <span style={{fontSize:10,color:C.hint,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{proj.client} · {fmtMoney(proj.contractValue)}</span>
              <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:4,background:color+"20",color}}>{r}</span>
              {count>0&&<span style={{fontSize:10,color:C.muted,whiteSpace:"nowrap"}}>{count} open</span>}
            </div>
            {issue&&<div style={{background:issue.color+"0d",border:`1px solid ${issue.color}22`,borderRadius:5,padding:"5px 8px"}}><span style={{fontSize:10,color:issue.color,lineHeight:1.4}}>{issue.text}</span></div>}
          </div>
        );
      })}
    </div>
  );
}

function FabContent({jobs}){
  if(jobs.length===0) return <EmptyState text="No active fab jobs"/>;
  const pc=p=>({Complete:C.success,"Near Complete":"#34d399","Active Fab":C.accent,Starting:C.warning,"Not Started":C.hint}[p]||C.muted);
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:10}}>
      {jobs.map(job=>{
        const pct=Math.round((job.shipped/job.totalPieces)*100),fpct=Math.round(((job.shipped+job.inFab)/job.totalPieces)*100),c=pc(job.phase);
        return (
          <div key={job.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><span style={{fontSize:12,fontWeight:600,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.project}</span><VertBadge v={job.vertical}/></div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4,background:c+"20",color:c}}>{job.phase}</span><span style={{fontSize:12,fontWeight:700,color:C.muted}}>{pct}%</span></div>
            <div style={{height:5,borderRadius:3,background:C.surface2,overflow:"hidden",position:"relative",marginBottom:5}}>
              <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${fpct}%`,background:C.accentDim,borderRadius:3}}/>
              <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pct}%`,background:pct===100?C.success:C.accent,borderRadius:3}}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <span style={{fontSize:10,color:C.hint}}><span style={{color:C.success,fontWeight:600}}>{job.shipped}</span> shipped</span>
              <span style={{fontSize:10,color:C.hint}}><span style={{color:C.accentText,fontWeight:600}}>{job.inFab}</span> in fab</span>
              <span style={{fontSize:10,color:C.hint}}><span style={{color:C.muted,fontWeight:600}}>{job.queued}</span> queued</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldNeedsContent({items,setTab,isField}){
  const open=items.filter(i=>i.status==="Open");
  if(open.length===0) return <EmptyState text="No open field needs"/>;
  return open.map(item=>{
    const uc=urgColor(item.urgency);
    return (
      <ItemRow key={item.id} dotColor={uc} onClick={()=>setTab("field")}>
        <p style={{margin:0,fontSize:12,color:C.text,lineHeight:1.4}}>{item.issue}</p>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:C.muted}}>{item.project}</span>
          <span style={{fontSize:10,fontWeight:600,padding:"1px 5px",borderRadius:3,background:uc+"20",color:uc}}>{item.urgency}</span>
          <span style={{fontSize:10,color:C.hint}}>{fmtRel(item.createdAt)}</span>
          <SourcePill source={item.source}/>
          {isField&&<span style={{fontSize:10,color:C.muted}}>PM: {item.assignedTo}</span>}
        </div>
      </ItemRow>
    );
  });
}

function OwnerPendingContent({items,setTab}){
  if(items.length===0) return <EmptyState text="No items waiting on owner"/>;
  return items.map(item=>{
    const age=daysSince(item.createdAt),color=ageColor(item.createdAt,5,3);
    return (
      <ItemRow key={item.id} dotColor={color} onClick={()=>setTab("owner")}>
        <p style={{margin:0,fontSize:12,color:C.text,lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.subject}</p>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
          <span style={{fontSize:10,color:C.muted}}>{item.project}</span>
          <span style={{fontSize:10,fontWeight:600,color}}>{age}d waiting</span>
          <SourcePill source={item.source}/>
        </div>
      </ItemRow>
    );
  });
}

function ScopeContent({items,setTab}){
  if(items.length===0) return <EmptyState text="No unnotified scope items"/>;
  return items.map(item=>{
    const color=scColor(item);
    return (
      <ItemRow key={item.id} dotColor={color} onClick={()=>setTab("scope")}>
        <p style={{margin:0,fontSize:12,color:C.text,lineHeight:1.4}}>{item.description}</p>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:C.muted}}>{item.project}</span>
          <span style={{fontSize:10,fontWeight:700,color}}>{scLabel(item)}</span>
          <span style={{fontSize:10,color:C.success,fontWeight:600}}>{fmtMoney(item.amount)}</span>
          <SourcePill source={item.source}/>
        </div>
      </ItemRow>
    );
  });
}

function ChangeOrdersContent({items,setTab}){
  if(items.length===0) return <EmptyState text="No overdue proposed change orders"/>;
  return items.map(co=>{
    const dc=ddColor(co.dueDate),sc=coStColor(co.status);
    return (
      <ItemRow key={co.id} dotColor={dc} onClick={()=>setTab("changes")}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
          <span style={{fontSize:11,fontWeight:700,color:C.accentText}}>{co.coNumber}</span>
          <span style={{fontSize:11,fontWeight:700,color:C.success}}>{fmtMoney(co.amount)}</span>
          <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:sc+"20",color:sc,letterSpacing:"0.04em"}}>{co.status.toUpperCase()}</span>
        </div>
        <p style={{margin:0,fontSize:12,color:C.text,lineHeight:1.4}}>{co.description}</p>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:C.muted}}>{co.project}</span>
          <span style={{fontSize:10,fontWeight:700,color:dc}}>{ddLabel(co.dueDate)}</span>
          <span style={{fontSize:10,color:C.hint}}>Sent {fmtRel(co.sentDate)}</span>
        </div>
      </ItemRow>
    );
  });
}

function KBInquiriesContent({items,setTab}){
  if(items.length===0) return <EmptyState text="No open KernBot inquiries"/>;
  return items.map(item=>{
    const uc=urgColor(item.urgency);
    return (
      <ItemRow key={item.id} dotColor={uc} onClick={()=>setTab("kernbot")}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
          <span style={{fontSize:10,fontWeight:700,color:C.pm}}>{item.pmqId}</span>
          <span style={{fontSize:10,fontWeight:600,padding:"1px 5px",borderRadius:3,background:uc+"20",color:uc}}>{item.urgency}</span>
        </div>
        <p style={{margin:0,fontSize:12,color:C.text,lineHeight:1.4}}>{item.title}</p>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:C.muted}}>{item.project}</span>
          <span style={{fontSize:10,color:C.hint}}>from {item.from}</span>
          <span style={{fontSize:10,color:ageColor(item.createdAt,3,1)}}>{fmtRel(item.createdAt)}</span>
        </div>
      </ItemRow>
    );
  });
}

function AlertBar({data,setTab}){
  const alerts=[];
  data.scopeItems.forEach(item=>{ if(daysSince(item.createdAt)>item.noticeDeadlineDays) alerts.push({text:`${item.project} — scope ${daysSince(item.createdAt)-item.noticeDeadlineDays}d past notice window`,tab:"scope"}); });
  data.ownerPending.forEach(op=>{ if(daysSince(op.createdAt)>=5) alerts.push({text:`${op.project} — owner item waiting ${daysSince(op.createdAt)} days`,tab:"owner"}); });
  data.fieldNeeds.forEach(fn=>{ if(fn.urgency==="High"&&fn.status==="Open") alerts.push({text:`${fn.project} — HIGH field need: ${fn.issue}`,tab:"field"}); });
  data.changeOrders.forEach(co=>{ alerts.push({text:`${co.project} — ${co.coNumber} proposed & ${Math.abs(daysUntil(co.dueDate))}d overdue (${fmtMoney(co.amount)})`,tab:"changes"}); });
  if(alerts.length===0) return null;
  return (
    <div style={{background:"rgba(248,113,113,0.07)",border:`1px solid ${C.danger}44`,borderRadius:10,padding:"10px 16px",marginBottom:16}}>
      <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:C.danger}}>⚠ {alerts.length} Critical Item{alerts.length!==1?"s":""}</p>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {alerts.map((a,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:C.danger,lineHeight:1.4,flex:1}}>{a.text}</span>
            <button onClick={()=>setTab(a.tab)} style={{fontSize:11,fontWeight:600,padding:"2px 10px",borderRadius:5,border:`1px solid ${C.danger}44`,background:C.dangerDim,color:C.danger,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>Go →</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function HiddenTray({hidden,onRestore}){
  if(hidden.length===0) return null;
  return (
    <div style={{marginTop:16,padding:"12px 16px",background:C.surface,border:`1px dashed ${C.border}`,borderRadius:10}}>
      <p style={{margin:"0 0 8px",fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",color:C.hint}}>Hidden Widgets</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {hidden.map(id=><button key={id} onClick={()=>onRestore(id)} style={{fontSize:11,fontWeight:600,padding:"5px 12px",borderRadius:6,border:`1px solid ${C.accent}44`,background:C.accentDim,color:C.accentText,cursor:"pointer",fontFamily:"inherit"}}>+ {WIDGET_META[id]?.label}</button>)}
      </div>
    </div>
  );
}

export default function DashboardApp({user,setTab}){
  const data=filterByUser(user);
  const isField=user.role==="field";
  const lk=`ksf-dash-${user.id}`,hk=`ksf-dash-hidden-${user.id}`;

  const [widgetOrder,setWidgetOrder]=useState(()=>{ try{const s=localStorage.getItem(lk);if(s)return JSON.parse(s);}catch{} return ROLE_LAYOUTS[user.role]||ROLE_LAYOUTS.apm; });
  const [hiddenWidgets,setHiddenWidgets]=useState(()=>{ try{const s=localStorage.getItem(hk);if(s)return JSON.parse(s);}catch{} return []; });
  const [editMode,setEditMode]=useState(false);
  const [dragId,setDragId]=useState(null);
  const [dragOverId,setDragOverId]=useState(null);

  useEffect(()=>{ try{localStorage.setItem(lk,JSON.stringify(widgetOrder));localStorage.setItem(hk,JSON.stringify(hiddenWidgets));}catch{} },[widgetOrder,hiddenWidgets]);

  const hideWidget=id=>{setWidgetOrder(p=>p.filter(w=>w!==id));setHiddenWidgets(p=>[...p,id]);};
  const restoreWidget=id=>{setHiddenWidgets(p=>p.filter(w=>w!==id));setWidgetOrder(p=>[...p,id]);};
  const handleDrop=toId=>{
    if(!dragId||dragId===toId) return;
    setWidgetOrder(prev=>{const arr=[...prev],from=arr.indexOf(dragId),to=arr.indexOf(toId);if(from===-1||to===-1)return arr;arr.splice(from,1);arr.splice(to,0,dragId);return arr;});
  };

  const today=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  const totalOpen=data.ownerPending.length+data.fieldNeeds.filter(f=>f.status==="Open").length+data.scopeItems.length+data.changeOrders.length+data.kbQueue.length;

  const renderWidget=id=>{
    const size=WIDGET_META[id]?.size||"half";
    const shared={editMode,onHide:()=>hideWidget(id),onDragStart:()=>setDragId(id),onDragOver:()=>setDragOverId(id),onDrop:()=>handleDrop(id),onDragEnd:()=>{setDragId(null);setDragOverId(null);},isDragOver:dragOverId===id&&dragId!==id};
    const ws={gridColumn:size==="wide"?"1 / -1":"span 1"};
    switch(id){
      case "project_health": return <div key={id} style={ws}><Widget {...shared} title="Project Health" count={data.projects.length}><ProjectHealthContent data={data} setTab={setTab}/></Widget></div>;
      case "fab_snapshot":   return <div key={id} style={ws}><Widget {...shared} title="Fabrication Snapshot" count={data.fabJobs.length}><FabContent jobs={data.fabJobs}/></Widget></div>;
      case "field_needs":    { const n=data.fieldNeeds.filter(f=>f.status==="Open").length; return <div key={id} style={ws}><Widget {...shared} title="Field Needs" count={n} countColor={n>0?C.danger:undefined}><FieldNeedsContent items={data.fieldNeeds} setTab={setTab} isField={isField}/></Widget></div>; }
      case "owner_pending":  { const n=data.ownerPending.length; return <div key={id} style={ws}><Widget {...shared} title="Owner Pending" count={n} countColor={n>0?C.warning:undefined}><OwnerPendingContent items={data.ownerPending} setTab={setTab}/></Widget></div>; }
      case "scope_items":    { const n=data.scopeItems.length; return <div key={id} style={ws}><Widget {...shared} title="Unnotified Scope" count={n} countColor={n>0?C.danger:undefined}><ScopeContent items={data.scopeItems} setTab={setTab}/></Widget></div>; }
      case "change_orders":  { const n=data.changeOrders.length; return <div key={id} style={ws}><Widget {...shared} title="Change Orders" count={n} countColor={n>0?C.warning:undefined}><ChangeOrdersContent items={data.changeOrders} setTab={setTab}/></Widget></div>; }
      case "kb_inquiries":   { const n=data.kbQueue.length; return <div key={id} style={ws}><Widget {...shared} title="KernBot Inquiries" count={n} countColor={n>0?C.pm:undefined}><KBInquiriesContent items={data.kbQueue} setTab={setTab}/></Widget></div>; }
      default: return null;
    }
  };

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",background:C.bg,overflowY:"auto",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif"}}>
      <div style={{maxWidth:1400,width:"100%",margin:"0 auto",padding:"20px 20px 48px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:16}}>
          <div>
            <h1 style={{margin:0,fontSize:22,fontWeight:700,color:C.text,letterSpacing:"-0.03em"}}>{greeting()}, {firstName(user.name)}.</h1>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
              <span style={{fontSize:12,color:C.hint}}>{today}</span>
              {totalOpen>0&&<><span style={{fontSize:12,color:C.hint}}>·</span><span style={{fontSize:12,fontWeight:600,color:C.danger}}>{totalOpen} item{totalOpen!==1?"s":""} need attention</span></>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {user.department&&(()=>{const vc=vcol(user.department.label);return <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:vc.bg,color:vc.color,border:`1px solid ${vc.color}33`}}>{user.department.label}</span>;})()}
            {user.badge&&<span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:user.badge.bg,color:user.badge.color,border:`1px solid ${user.badge.color}33`}}>{user.badge.label}</span>}
            <button onClick={()=>setEditMode(e=>!e)} style={{fontSize:12,fontWeight:600,padding:"5px 14px",borderRadius:7,border:`1px solid ${editMode?C.accent:C.border}`,background:editMode?C.accentDim:C.surface,color:editMode?C.accentText:C.muted,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>
              {editMode?"✓ Done":"⠿ Edit Dashboard"}
            </button>
          </div>
        </div>
        {editMode&&<div style={{marginBottom:14,padding:"8px 14px",background:C.accentDim,border:`1px solid ${C.accent}33`,borderRadius:8}}><span style={{fontSize:12,color:C.accentText}}>Drag widgets to reorder · Click × to hide · Scroll down to restore hidden widgets</span></div>}
        <AlertBar data={data} setTab={setTab}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}} className="ksf-widget-grid">
          {widgetOrder.map(id=>renderWidget(id))}
        </div>
        {editMode&&<HiddenTray hidden={hiddenWidgets} onRestore={restoreWidget}/>}
      </div>
      <style>{`@media(max-width:768px){.ksf-widget-grid{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}