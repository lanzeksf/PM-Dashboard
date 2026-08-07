import React, { useState, useEffect, useMemo } from "react";
import { C, F, MI, fmtRel, viewingAsTooltip } from "../core/utils.jsx";
import { getProjects, getAllRFIs } from "../projectsight/projectsightApi.js";
import { KSF_LEAD_MAP, TEAM_MEMBER_OPTS, isOpenRFI, isActiveProject } from "../rfi/RFIApp.jsx";

// Widgets below (Project Health, Fab Snapshot, Field Needs, Owner Pending,
// Unnotified Scope, Change Orders) have no real backend yet — each of these
// source arrays is intentionally empty (not seed/demo data) so every user
// sees an honest empty state instead of fabricated numbers. The filtering
// logic in filterByUser/*Content below is left in place since it encodes
// the real business rules to apply once each is wired to a live source
// (Spectrum for change orders, a field-needs intake form, etc.) — swap the
// empty array for a real fetch when that happens, nothing else should need
// to change.
const PROJECTS      = [];
const OWNER_PENDING  = [];
const FIELD_NEEDS    = [];
const SCOPE_ITEMS    = [];
// status: "Proposed" | "Approved" | "Executed"
// Dashboard shows only Proposed + overdue. Approved = in progress. Executed = done (never shown).
// TODO: Replace with Spectrum API — map Spectrum CO status values to Proposed/Approved/Executed here.
const CHANGE_ORDERS = [];
const FAB_JOBS       = [];
// TODO: Replace with live store.queue once wired to this component
const KB_QUEUE_SEED  = [];

const WIDGET_META = {
  project_health: { label: "Project Health",       size: "wide" },
  rfi_snapshot:   { label: "Open RFIs",             size: "wide" },
  fab_snapshot:   { label: "Fabrication Snapshot", size: "wide" },
  field_needs:    { label: "Field Needs",           size: "half" },
  owner_pending:  { label: "Owner Pending",         size: "half" },
  scope_items:    { label: "Unnotified Scope",      size: "half" },
  change_orders:  { label: "Change Orders",         size: "half" },
  kb_inquiries:   { label: "KernBot Inquiries",     size: "half" },
};
// rfi_snapshot only appears for roles that actually have the RFI Dashboard
// module (see ROLE_MODULES in core/utils.jsx) — mfg_eng/field don't, so it's
// left out of their layouts below, same as owner_pending/change_orders/etc.
const ROLE_LAYOUTS = {
  admin:       ["project_health","rfi_snapshot","fab_snapshot","kb_inquiries","field_needs","owner_pending","scope_items","change_orders"],
  sr_pm:       ["project_health","rfi_snapshot","fab_snapshot","kb_inquiries","field_needs","owner_pending","scope_items","change_orders"],
  apm:         ["project_health","rfi_snapshot","field_needs","owner_pending","change_orders","fab_snapshot","scope_items"],
  coordinator: ["project_health","rfi_snapshot","field_needs","owner_pending","change_orders","fab_snapshot","scope_items"],
  mfg_eng:     ["fab_snapshot","project_health","field_needs"],
  field:       ["field_needs","fab_snapshot"],
};

// Small rotating line under the greeting — add lines here whenever. Picked
// deterministically from the local calendar date (not stored anywhere, not
// randomized on refresh), so it's the same for everyone all day and changes
// at local midnight. Guaranteed not to repeat yesterday's line as long as
// there are 2+ lines — see pickDailyLine below.
const DAILY_GREETINGS = [
  // "Add lines here, one string each.",
];

// Days since a fixed epoch, counted off the *local* Y/M/D via Date.UTC (not
// a real elapsed-time subtraction) so a DST transition can't shift the count
// by an hour and land two different calendar days on the same integer —
// which would break the "never twice in a row" guarantee below.
const localDayNumber = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
function pickDailyLine(lines) {
  if (!lines || lines.length === 0) return null;
  // Straight rotation, one line per calendar day. Adjacent days always
  // differ by exactly 1 in localDayNumber, so two consecutive days can only
  // land on the same line if there's only one line to begin with.
  const idx = localDayNumber(new Date()) % lines.length;
  return lines[idx];
}

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
// ProjectSight sends "0001-01-01..." as its sentinel for "no due date set"
// (same quirk RFIApp.jsx's rfiDue/issDue accessors guard against) — treat it
// as null rather than a real date 2000+ years overdue.
const rfiDueDate = r => (r.DateDue && !String(r.DateDue).startsWith("0001")) ? r.DateDue : null;
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

// ── Open RFIs widget — the one real (non-mock) widget in this grid, backed
// by the same ProjectSight-synced data as the RFI Dashboard. Overseers
// (admin/sr_pm) get a per-PM open-count table; everyone else gets their own
// open RFIs, soonest-due first. Mirrors RFIApp.jsx's TeamBreakdownTable/
// visibleProjects logic exactly (same ownership rule: a project "belongs"
// to whoever's name matches its TypeOfBuilding field) so the numbers here
// always agree with the RFI Dashboard — see KSF_LEAD_MAP/TEAM_MEMBER_OPTS,
// imported from there rather than redefined, to avoid the two drifting.
function myVisibleProjects(user, projects) {
  const lead = KSF_LEAD_MAP[user.id];
  if (lead === null || lead === undefined) return projects;
  const firstName = lead.split(" ")[0].toLowerCase();
  return projects.filter(p => {
    const tob = (p.TypeOfBuilding ?? "").trim();
    return tob === lead || tob.toLowerCase().includes(firstName);
  });
}

function teamRfiBreakdown(projects, rfisByProject) {
  // Same caveat as RFIApp.jsx's TeamBreakdownTable: only Tony/Luis/Adam
  // "own" jobs via TypeOfBuilding — JR/Josh/Lisbet/Jacob will show 0 here
  // until CC'd-based visibility is built, same known gap, not new to this widget.
  return TEAM_MEMBER_OPTS.filter(o => o !== "All").map(name => {
    const projIds = new Set(projects.filter(p => (p.TypeOfBuilding ?? "").trim() === name)
      .map(p => `${p.portfolioId}-${p.ProjectID}`));
    const openCount = projects.filter(p => projIds.has(`${p.portfolioId}-${p.ProjectID}`))
      .reduce((sum, p) => sum + (rfisByProject[`${p.portfolioId}-${p.ProjectID}`] || []).filter(isOpenRFI).length, 0);
    return { name, openCount };
  }).sort((a, b) => b.openCount - a.openCount);
}

function RfiSnapshotContent({ user, isAdmin, snapshot, setTab }) {
  const breakdown = useMemo(
    () => isAdmin ? teamRfiBreakdown(snapshot.projects, snapshot.rfisByProject) : null,
    [isAdmin, snapshot]
  );
  const myOpenRfis = useMemo(() => {
    if (isAdmin) return null;
    const visible = myVisibleProjects(user, snapshot.projects);
    return visible
      .flatMap(p => (snapshot.rfisByProject[`${p.portfolioId}-${p.ProjectID}`] || []).map(r => ({ ...r, _project: p })))
      .filter(isOpenRFI);
  }, [isAdmin, user, snapshot]);

  if (snapshot.loading) return <p style={{ margin: 0, fontSize: 12, color: C.hint, textAlign: "center", padding: "16px 0" }}>Loading…</p>;
  if (snapshot.error)   return <p style={{ margin: 0, fontSize: 12, color: C.danger, textAlign: "center", padding: "16px 0" }}>{snapshot.error}</p>;

  if (isAdmin) {
    if (breakdown.every(r => r.openCount === 0)) return <EmptyState text="No open RFIs across the team"/>;
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <th style={{ textAlign: "left", padding: "4px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.hint }}>PM</th>
            <th style={{ textAlign: "right", padding: "4px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.hint }}>Open RFIs</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map(row => (
            <tr key={row.name} onClick={() => setTab("rfi")}
              style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
              <td style={{ padding: "6px 8px", color: C.text }}>{row.name}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: row.openCount > 0 ? C.accentText : C.hint }}>{row.openCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (myOpenRfis.length === 0) return <EmptyState text="No open RFIs on your projects"/>;
  const top = [...myOpenRfis].sort((a, b) => {
    const ad = rfiDueDate(a), bd = rfiDueDate(b);
    if (!ad && !bd) return 0; if (!ad) return 1; if (!bd) return -1;
    return new Date(ad) - new Date(bd);
  }).slice(0, 5);
  return top.map(r => {
    const due = rfiDueDate(r);
    return (
      <ItemRow key={r.RFI_ID ?? r.Number} dotColor={due ? ddColor(due) : C.hint} onClick={() => setTab("rfi")}>
        <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.Subject || "(No subject)"}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: C.muted }}>{r._project.Name}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: due ? ddColor(due) : C.hint }}>{due ? ddLabel(due) : "No due date"}</span>
        </div>
      </ItemRow>
    );
  });
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
  if(items.length===0) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px 16px",gap:10}}>
      <div style={{width:48,height:48,borderRadius:"50%",background:C.successDim,border:`1.5px solid ${C.success}44`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>
      <div style={{textAlign:"center"}}>
        <p style={{margin:0,fontSize:13,fontWeight:600,color:C.success}}>Queue is clear</p>
        <p style={{margin:"4px 0 0",fontSize:11,color:C.hint,lineHeight:1.5}}>No open KernBot inquiries.<br/>Escalations from the team will appear here.</p>
      </div>
    </div>
  );
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

// ── Feedback triage (admin-only) + Updates (everyone) ──────────────────────
// Real, DB-backed, permanent features — kept separate from the mock-data
// widget grid above (WIDGET_META/ROLE_LAYOUTS/renderWidget), which is stub
// data slated for full replacement whenever the real Dashboard build
// happens. Not draggable/hideable like the mock widgets — just two fixed
// cards above the grid.

const FEEDBACK_TYPE_LABELS = { bug: "Bugs", thought: "Thoughts" };

function FeedbackRow({ f, isOpen, onToggle, onMarkDone, isViewingAs, viewingAsName }) {
  const isDone = f.status === "done";
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, padding: "9px 0", opacity: isDone ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <button onClick={e => { e.stopPropagation(); onMarkDone(f.id, isDone ? "open" : "done"); }}
          disabled={isViewingAs} title={isViewingAs ? viewingAsTooltip(viewingAsName) : (isDone ? "Reopen" : "Mark done")}
          style={{ flexShrink: 0, marginTop: 1, width: 16, height: 16, borderRadius: 4, padding: 0,
            border: `1.5px solid ${isDone ? C.success : C.border}`, background: isDone ? C.success : "none",
            cursor: isViewingAs ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isDone && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          )}
        </button>
        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={onToggle}>
          <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.4, textDecoration: isDone ? "line-through" : "none",
            overflow: isOpen ? "visible" : "hidden", textOverflow: "ellipsis", whiteSpace: isOpen ? "normal" : "nowrap" }}>{f.message}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: C.muted }}>{f.submittedByName}</span>
            {f.pageContext && <span style={{ fontSize: 10, color: C.hint }}>· {f.pageContext}</span>}
            <span style={{ fontSize: 10, color: C.hint }}>· {fmtRel(f.createdAt)}</span>
          </div>
        </div>
      </div>
      {isOpen && f.attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, marginLeft: 24 }}>
          {f.attachments.map(a => (
            <a key={a.id} href={`/api/feedback/attachment?attachmentId=${a.id}`} target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10.5, color: C.muted, textDecoration: "none" }}>
              <span style={{ display: "flex" }}>{a.mimeType === "application/pdf" ? MI.pdf : MI.file}</span>{a.fileName}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackSection({ typeKey, items, expandedId, setExpandedId, onMarkDone, isViewingAs, viewingAsName }) {
  const openCount = items.filter(f => f.status !== "done").length;
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ color: C.muted, display: "flex" }}>{MI[typeKey]}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: C.muted }}>{FEEDBACK_TYPE_LABELS[typeKey]}</span>
        {openCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: C.dangerDim, color: C.danger }}>{openCount} open</span>}
      </div>
      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: C.hint, padding: "6px 0" }}>Nothing here.</p>
      ) : items.map(f => (
        <FeedbackRow key={f.id} f={f} isOpen={expandedId === f.id}
          onToggle={() => setExpandedId(expandedId === f.id ? null : f.id)}
          onMarkDone={onMarkDone} isViewingAs={isViewingAs} viewingAsName={viewingAsName} />
      ))}
    </div>
  );
}

function FeedbackTriageCard({ isViewingAs, viewingAsName }) {
  const [items,      setItems]      = useState(null);
  const [error,      setError]      = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetch("/api/feedback", { credentials: "include" })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load feedback");
        return data.feedback;
      })
      .then(setItems)
      .catch(e => setError(e.message));
  }, []);

  async function setStatus(id, status) {
    setItems(list => list.map(f => (f.id === id ? { ...f, status } : f)));
    try {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("Could not update status");
    }
  }

  if (error) return (
    <div style={{ background: C.dangerDim, border: `1px solid ${C.danger}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
      <span style={{ fontSize: 12, color: C.danger }}>{error}</span>
    </div>
  );
  if (!items) return null;

  const openCount = items.filter(f => f.status !== "done").length;
  const bugs     = items.filter(f => f.type === "bug");
  const thoughts = items.filter(f => f.type === "thought");

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "11px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, background: C.surface2 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.muted, flex: 1 }}>Feedback Triage</span>
        {openCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: C.dangerDim, color: C.danger }}>{openCount} open</span>}
      </div>
      <div style={{ padding: items.length ? "8px 14px 10px" : "12px 14px" }}>
        {items.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: C.hint, textAlign: "center", padding: "10px 0" }}>No feedback yet.</p>
        ) : (
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <FeedbackSection typeKey="bug" items={bugs} expandedId={expandedId} setExpandedId={setExpandedId}
              onMarkDone={setStatus} isViewingAs={isViewingAs} viewingAsName={viewingAsName} />
            <FeedbackSection typeKey="thought" items={thoughts} expandedId={expandedId} setExpandedId={setExpandedId}
              onMarkDone={setStatus} isViewingAs={isViewingAs} viewingAsName={viewingAsName} />
          </div>
        )}
      </div>
    </div>
  );
}

function UpdatesCard({ isAdmin, isViewingAs, viewingAsName }) {
  const [posts,     setPosts]     = useState(null);
  const [dismissed,  setDismissed] = useState(false);
  const [composing, setComposing] = useState(false);
  const [title,     setTitle]     = useState("");
  const [body,      setBody]      = useState("");
  const [posting,   setPosting]   = useState(false);
  const [error,     setError]     = useState("");

  const load = () => {
    fetch("/api/updates", { credentials: "include" })
      .then(res => (res.ok ? res.json() : { posts: [] }))
      .then(data => { setPosts(data.posts || []); setDismissed(false); })
      .catch(() => setPosts([]));
  };

  useEffect(load, []);

  async function dismiss() {
    setDismissed(true);
    try { await fetch("/api/updates/seen", { method: "PATCH", credentials: "include" }); } catch {}
  }

  async function post() {
    if (!title.trim() || !body.trim() || posting || isViewingAs) return;
    setPosting(true); setError("");
    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Failed to post"); }
      setTitle(""); setBody(""); setComposing(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  }

  const showCard = posts !== null && posts.length > 0 && !dismissed;
  const postDisabled = !title.trim() || !body.trim() || posting || isViewingAs;

  return (
    <>
      {showCard && (
        <div style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.accentText }}>What's new</span>
            <button onClick={dismiss} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 5, border: `1px solid ${C.accent}`, background: "none", color: C.accentText, cursor: "pointer", fontFamily: "inherit" }}>Dismiss</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {posts.map(p => (
              <div key={p.id}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{p.title}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: C.muted, lineHeight: 1.5, whiteSpace: "pre-line" }}>{p.body}</p>
                <p style={{ margin: "3px 0 0", fontSize: 10, color: C.hint }}>{p.authorName} · {fmtRel(p.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div style={{ marginBottom: 14 }}>
          {!composing ? (
            <button onClick={() => setComposing(true)} style={{ fontSize: 12, fontWeight: 600, color: C.accentText, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
              + Post an update
            </button>
          ) : (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
                style={{ padding: "6px 9px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12.5, fontFamily: "inherit", outline: "none" }}/>
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="What changed?" rows={3}
                style={{ padding: "6px 9px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12.5, fontFamily: "inherit", outline: "none", resize: "vertical" }}/>
              {error && <p style={{ margin: 0, fontSize: 11, color: C.danger }}>{error}</p>}
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={post} disabled={postDisabled} title={isViewingAs ? viewingAsTooltip(viewingAsName) : undefined}
                  style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, border: "none", background: C.accent, color: C.accentText, cursor: postDisabled ? "not-allowed" : "pointer", opacity: postDisabled ? 0.5 : 1, fontFamily: "inherit" }}>
                  {posting ? "Posting…" : "Post"}
                </button>
                <button onClick={() => { setComposing(false); setTitle(""); setBody(""); setError(""); }}
                  style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
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

export default function DashboardApp({user,setTab,isViewingAs=false}){
  const data=filterByUser(user);
  const isField=user.role==="field";
  const isAdmin=user.tier==="admin"||user.tier==="sr_pm";
  const lk=`ksf-dash-${user.id}`,hk=`ksf-dash-hidden-${user.id}`;

  const [widgetOrder,setWidgetOrder]=useState(()=>{
    try{
      const s=localStorage.getItem(lk);
      if(s){
        const saved=JSON.parse(s);
        // Safety: append any widgets in the role default that aren't in the saved layout.
        // Handles the case where a new widget was added after the user's layout was already saved.
        const roleDefault=ROLE_LAYOUTS[user.role]||ROLE_LAYOUTS.apm;
        const missing=roleDefault.filter(id=>!saved.includes(id));
        return missing.length>0?[...saved,...missing]:saved;
      }
    }catch{}
    return ROLE_LAYOUTS[user.role]||ROLE_LAYOUTS.apm;
  });
  const [hiddenWidgets,setHiddenWidgets]=useState(()=>{ try{const s=localStorage.getItem(hk);if(s)return JSON.parse(s);}catch{} return []; });
  const [editMode,setEditMode]=useState(false);
  const [dragId,setDragId]=useState(null);
  const [dragOverId,setDragOverId]=useState(null);

  // Backs the Open RFIs widget — real ProjectSight-synced data, fetched once
  // on mount (cached 4min TTL at the projectsightApi.js layer, same as the
  // RFI Dashboard, so this doesn't add a new hit against ProjectSight).
  const [rfiSnapshot, setRfiSnapshot] = useState({ loading: true, error: null, projects: [], rfisByProject: {} });
  useEffect(() => {
    let cancelled = false;
    Promise.all([getProjects(), getAllRFIs()])
      .then(([projects, rfisByProject]) => {
        if (cancelled) return;
        setRfiSnapshot({ loading: false, error: null, projects: projects.filter(isActiveProject), rfisByProject });
      })
      .catch(e => { if (!cancelled) setRfiSnapshot(s => ({ ...s, loading: false, error: e.message })); });
    return () => { cancelled = true; };
  }, []);

  useEffect(()=>{ try{localStorage.setItem(lk,JSON.stringify(widgetOrder));localStorage.setItem(hk,JSON.stringify(hiddenWidgets));}catch{} },[widgetOrder,hiddenWidgets]);

  const hideWidget=id=>{setWidgetOrder(p=>p.filter(w=>w!==id));setHiddenWidgets(p=>[...p,id]);};
  const restoreWidget=id=>{setHiddenWidgets(p=>p.filter(w=>w!==id));setWidgetOrder(p=>[...p,id]);};
  const handleDrop=toId=>{
    if(!dragId||dragId===toId) return;
    setWidgetOrder(prev=>{const arr=[...prev],from=arr.indexOf(dragId),to=arr.indexOf(toId);if(from===-1||to===-1)return arr;arr.splice(from,1);arr.splice(to,0,dragId);return arr;});
  };

  const today=new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  const totalOpen=data.ownerPending.length+data.fieldNeeds.filter(f=>f.status==="Open").length+data.scopeItems.length+data.changeOrders.length+data.kbQueue.length;
  const dailyLine=pickDailyLine(DAILY_GREETINGS);

  const renderWidget=id=>{
    const size=WIDGET_META[id]?.size||"half";
    const shared={editMode,onHide:()=>hideWidget(id),onDragStart:()=>setDragId(id),onDragOver:()=>setDragOverId(id),onDrop:()=>handleDrop(id),onDragEnd:()=>{setDragId(null);setDragOverId(null);},isDragOver:dragOverId===id&&dragId!==id};
    const ws={gridColumn:size==="wide"?"1 / -1":"span 1"};
    switch(id){
      case "project_health": return <div key={id} style={ws}><Widget {...shared} title="Project Health" count={data.projects.length}><ProjectHealthContent data={data} setTab={setTab}/></Widget></div>;
      case "rfi_snapshot": {
        const n = rfiSnapshot.loading || rfiSnapshot.error ? undefined : isAdmin
          ? teamRfiBreakdown(rfiSnapshot.projects, rfiSnapshot.rfisByProject).reduce((s, r) => s + r.openCount, 0)
          : myVisibleProjects(user, rfiSnapshot.projects)
              .flatMap(p => rfiSnapshot.rfisByProject[`${p.portfolioId}-${p.ProjectID}`] || [])
              .filter(isOpenRFI).length;
        return <div key={id} style={ws}><Widget {...shared} title="Open RFIs" count={n} countColor={n > 0 ? C.danger : undefined}><RfiSnapshotContent user={user} isAdmin={isAdmin} snapshot={rfiSnapshot} setTab={setTab}/></Widget></div>;
      }
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
            {dailyLine && <p style={{margin:"4px 0 0",fontSize:12,color:C.hint,fontStyle:"italic"}}>{dailyLine}</p>}
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
        {isAdmin && <FeedbackTriageCard isViewingAs={isViewingAs} viewingAsName={user.name}/>}
        <UpdatesCard isAdmin={isAdmin} isViewingAs={isViewingAs} viewingAsName={user.name}/>
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