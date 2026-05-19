import React, { useState, useMemo } from "react";
import { C } from "../core/utils.jsx";

// ── Territory filter map ──────────────────────────────────────────────────────
const TERRITORY_MAP = {
  loren:   null,
  lanze:   null,
  jacob:   null,
  tony:    'Tony',
  luis:    null,
  jillian: null,
  adam:    'Adam',
};

// ── Mock data (replace with getChangeOrders() API call when ready) ────────────
const MOCK_PROJECTS = [
  { id:'p1', job:'26606', name:'Bakersfield Civic Auditorium — Phase 2', meta:'Structural · Loren Castro',  territory:'Loren' },
  { id:'p2', job:'26541', name:'Kern County Solar Carport — Lot 7',      meta:'Solar · Tony Sanabria',      territory:'Tony'  },
  { id:'p3', job:'26588', name:'USAF Hangar Stand — Edwards AFB',         meta:'Aerospace · Adam Kneale',    territory:'Adam'  },
  { id:'p4', job:'26512', name:'Valley Republic Bank — Fresno',           meta:'Structural · Adam Kneale',   territory:'Adam'  },
];

const MOCK_COS = [
  { proj:'p1', job:'26606', co:'CO-014', desc:'Misc. angle revisions per arch RFI-22',          amt:12400, sub:'Apr 28', age:21,  status:'Proposed' },
  { proj:'p1', job:'26606', co:'CO-013', desc:'Base plate additions — column line D',            amt:8750,  sub:'May 1',  age:18,  status:'Proposed' },
  { proj:'p1', job:'26606', co:'CO-012', desc:'Embed plate revisions per structural rev.3',      amt:4200,  sub:'May 10', age:9,   status:'Approved' },
  { proj:'p1', job:'26606', co:'CO-011', desc:'Moment frame weld upgrade — grid A',              amt:9100,  sub:'Mar 10', age:null,status:'Executed' },
  { proj:'p2', job:'26541', co:'CO-007', desc:'Additional anchor bolts — wind zone uplift',      amt:6300,  sub:'May 5',  age:14,  status:'Proposed' },
  { proj:'p2', job:'26541', co:'CO-006', desc:'Footing depth increase — geotech report rev.',    amt:11100, sub:'May 12', age:7,   status:'Proposed' },
  { proj:'p2', job:'26541', co:'CO-005', desc:'Column base plate re-design',                     amt:5400,  sub:'Feb 20', age:null,status:'Executed' },
  { proj:'p3', job:'26588', co:'CO-003', desc:'Gusset plate material upgrade per EO-2204',       amt:18900, sub:'May 8',  age:11,  status:'Proposed' },
  { proj:'p3', job:'26588', co:'CO-002', desc:'Alternate bolt pattern — customer rejected',      amt:3200,  sub:'Apr 20', age:null,status:'Rejected' },
  { proj:'p4', job:'26512', co:'CO-009', desc:'HSS column addition — grid 4 revision',           amt:7800,  sub:'Mar 5',  age:null,status:'Executed' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const isOpen  = c => c.status !== 'Executed';
const fmtAmt  = n => '$' + n.toLocaleString();

function urgencyScore(cos) {
  const open       = cos.filter(isOpen);
  const staleCount = open.filter(c => (c.age ?? 0) >= 14).length;
  return (staleCount * 50) + (open.length * 10) + open.reduce((s, c) => s + (c.age ?? 0), 0);
}

// ── Micro-components ──────────────────────────────────────────────────────────

function AgeCell({ age }) {
  if (age == null) return <span style={{ color: C.hint }}>—</span>;
  if (age >= 21)   return <span style={{ color: C.danger,  fontWeight: 700 }}>⚠ {age}d</span>;
  if (age >= 14)   return <span style={{ color: C.warning, fontWeight: 700 }}>{age}d</span>;
  return <span style={{ color: C.muted }}>{age}d</span>;
}

function StatusChip({ status }) {
  const s = {
    Proposed: { color: C.accentText, bg: C.accentDim },
    Approved: { color: C.success,    bg: 'rgba(52,211,153,0.12)' },
    Rejected: { color: C.danger,     bg: 'rgba(248,113,113,0.12)' },
    Executed: { color: C.muted,      bg: C.surface2 },
  }[status] || { color: C.muted, bg: C.surface2 };
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
      background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

function SummaryCard({ label, value, color, onClick, active }) {
  return (
    <div onClick={onClick}
      style={{ background: C.surface, border: `1px solid ${active ? C.accent : C.border}`,
        borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 130,
        cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = active ? C.accent : C.borderHi; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = active ? C.accent : C.border; }}>
      <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: C.hint }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: color || C.text,
        letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
    </div>
  );
}

// ── Flat table (filter + search results) ──────────────────────────────────────

function FlatTable({ cos, projects, onBack, backLabel }) {
  const projMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const total   = cos.reduce((s, c) => s + c.amt, 0);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={onBack}
          style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6,
            border: `1px solid ${C.border}`, background: C.surface2,
            color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Back
        </button>
        <span style={{ fontSize: 12, color: C.hint }}>{backLabel}</span>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Job #','CO #','Description','Project','Amount','Submitted','Age','Status'].map(h => (
                  <th key={h} style={{ padding: '8px 12px',
                    textAlign: h === 'Amount' ? 'right' : 'left',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: C.hint, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cos.map((c, i) => {
                const proj = projMap[c.proj];
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', color: C.muted, whiteSpace: 'nowrap' }}>{c.job}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <a href="#" onClick={e => e.preventDefault()}
                        style={{ color: C.accentText, fontWeight: 600, textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>{c.co}</a>
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 240, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text }} title={c.desc}>
                      {c.desc}
                    </td>
                    <td style={{ padding: '10px 12px', color: C.muted, whiteSpace: 'nowrap', fontSize: 11 }}>
                      {proj ? proj.name : c.proj}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: C.text,
                      whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtAmt(c.amt)}</td>
                    <td style={{ padding: '10px 12px', color: C.muted, whiteSpace: 'nowrap' }}>{c.sub}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}><AgeCell age={c.age} /></td>
                    <td style={{ padding: '10px 12px' }}><StatusChip status={c.status} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `1px solid ${C.borderHi}` }}>
                <td colSpan={4} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: C.hint }}>
                  Total
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: C.text }}>
                  {fmtAmt(total)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, cos }) {
  const [expanded, setExpanded] = useState(false);
  const [tab,      setTab]      = useState('open');

  const open        = cos.filter(isOpen);
  const executed    = cos.filter(c => c.status === 'Executed');
  const proposed    = cos.filter(c => c.status === 'Proposed');
  const rejected    = cos.filter(c => c.status === 'Rejected');

  const staleCount21 = open.filter(c => (c.age ?? 0) >= 21).length;
  const staleCount14 = open.filter(c => (c.age ?? 0) >= 14).length;
  const hasVeryStale = staleCount21 > 0;
  const hasStale     = !hasVeryStale && staleCount14 > 0;

  const borderAccent = hasVeryStale ? C.danger : hasStale ? C.warning : C.border;
  const openTotal    = open.reduce((s, c) => s + c.amt, 0);

  const pills = [];
  if (staleCount21 > 0) pills.push({ label: `${staleCount21} stale`, color: C.danger,     bg: 'rgba(248,113,113,0.12)' });
  else if (staleCount14 > 0) pills.push({ label: `${staleCount14} stale`, color: C.warning, bg: 'rgba(251,191,36,0.12)' });
  if (proposed.length > 0)   pills.push({ label: `${proposed.length} proposed`, color: C.accentText, bg: C.accentDim });
  if (rejected.length > 0)   pills.push({ label: `${rejected.length} rejected`, color: C.hint, bg: C.surface2 });

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${borderAccent}`, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>

      {/* Card header */}
      <div onClick={() => setExpanded(v => !v)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
        onMouseEnter={e => e.currentTarget.style.background = C.surface2}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </div>
          <div style={{ fontSize: 11, color: C.hint }}>{project.job} · {project.meta}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {pills.map((p, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: p.bg, color: p.color, border: `1px solid ${p.color}33`, whiteSpace: 'nowrap' }}>
              {p.label}
            </span>
          ))}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.hint} strokeWidth="2"
            strokeLinecap="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Card body */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 2, padding: '10px 16px 0',
            borderBottom: `1px solid ${C.border}` }}>
            {[
              { id: 'open',     label: `Open (${open.length})` },
              { id: 'executed', label: 'Executed (last 180 days)' },
            ].map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: '6px 14px', borderRadius: '6px 6px 0 0',
                    border: `1px solid ${active ? C.border : 'transparent'}`,
                    borderBottom: active ? `1px solid ${C.surface}` : 'none',
                    background: active ? C.surface : 'transparent',
                    color: active ? C.text : C.hint,
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'inherit',
                    marginBottom: active ? -1 : 0, position: 'relative', zIndex: active ? 1 : 0 }}>
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Open tab */}
          {tab === 'open' && (
            open.length === 0 ? (
              <p style={{ margin: 0, padding: '16px', fontSize: 12, color: C.muted }}>No open change orders.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {['CO #','Description','Amount','Submitted','Age','Status'].map(h => (
                        <th key={h} style={{ padding: '8px 12px',
                          textAlign: h === 'Amount' ? 'right' : 'left',
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                          textTransform: 'uppercase', color: C.hint, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {open.map((c, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          <a href="#" onClick={e => e.preventDefault()}
                            style={{ color: C.accentText, fontWeight: 600, textDecoration: 'none' }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>{c.co}</a>
                        </td>
                        <td style={{ padding: '8px 12px', color: C.text, maxWidth: 300,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={c.desc}>{c.desc}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: C.text,
                          whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtAmt(c.amt)}</td>
                        <td style={{ padding: '8px 12px', color: C.muted, whiteSpace: 'nowrap' }}>{c.sub}</td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}><AgeCell age={c.age} /></td>
                        <td style={{ padding: '8px 12px' }}><StatusChip status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: `1px solid ${C.borderHi}` }}>
                      <td colSpan={2} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: C.hint }}>
                        Project total
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12,
                        fontWeight: 700, color: C.text }}>
                        {fmtAmt(openTotal)}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          )}

          {/* Executed tab */}
          {tab === 'executed' && (
            <div>
              <p style={{ margin: 0, padding: '8px 16px 4px', fontSize: 11, color: C.hint }}>
                Showing executed COs (last 180 days)
              </p>
              {executed.length === 0 ? (
                <p style={{ margin: 0, padding: '4px 16px 16px', fontSize: 12, color: C.muted }}>No executed change orders.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {['CO #','Description','Amount','Submitted'].map(h => (
                          <th key={h} style={{ padding: '8px 12px',
                            textAlign: h === 'Amount' ? 'right' : 'left',
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                            textTransform: 'uppercase', color: C.hint, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {executed.map((c, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}
                          onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                            <a href="#" onClick={e => e.preventDefault()}
                              style={{ color: C.accentText, fontWeight: 600, textDecoration: 'none' }}
                              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>{c.co}</a>
                          </td>
                          <td style={{ padding: '8px 12px', color: C.text, maxWidth: 300,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={c.desc}>{c.desc}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: C.text,
                            whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtAmt(c.amt)}</td>
                          <td style={{ padding: '8px 12px', color: C.muted, whiteSpace: 'nowrap' }}>{c.sub}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChangeOrdersApp({ user }) {
  const [activeFilter, setActiveFilter] = useState(null); // null | 'total' | 'proposed' | 'stale'
  const [search,       setSearch]       = useState('');

  const visibleProjects = useMemo(() => {
    const territory = TERRITORY_MAP[user?.id];
    if (territory == null) return MOCK_PROJECTS;
    return MOCK_PROJECTS.filter(p => p.territory === territory);
  }, [user]);

  const projectIds = useMemo(() => new Set(visibleProjects.map(p => p.id)), [visibleProjects]);

  const allCOs = useMemo(() =>
    MOCK_COS.filter(c => projectIds.has(c.proj)),
    [projectIds]
  );

  const stats = useMemo(() => {
    const open     = allCOs.filter(isOpen);
    const proposed = allCOs.filter(c => c.status === 'Proposed');
    const stale    = allCOs.filter(c => isOpen(c) && (c.age ?? 0) >= 14);
    const propVal  = proposed.reduce((s, c) => s + c.amt, 0);
    return { openCount: open.length, proposedCount: proposed.length, staleCount: stale.length, propVal };
  }, [allCOs]);

  const sortedProjects = useMemo(() =>
    [...visibleProjects].sort((a, b) =>
      urgencyScore(allCOs.filter(c => c.proj === b.id)) -
      urgencyScore(allCOs.filter(c => c.proj === a.id))
    ),
    [visibleProjects, allCOs]
  );

  const filterCOs = useMemo(() => {
    if (activeFilter === 'total')    return allCOs.filter(isOpen);
    if (activeFilter === 'proposed') return allCOs.filter(c => c.status === 'Proposed');
    if (activeFilter === 'stale')    return [...allCOs.filter(c => isOpen(c) && (c.age ?? 0) >= 14)]
                                             .sort((a, b) => (b.age ?? 0) - (a.age ?? 0));
    return [];
  }, [activeFilter, allCOs]);

  const searchCOs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allCOs.filter(c =>
      c.job.toLowerCase().includes(q) ||
      c.co.toLowerCase().includes(q)  ||
      c.desc.toLowerCase().includes(q)
    );
  }, [search, allCOs]);

  const showFlat = !!activeFilter || !!search.trim();
  const flatCOs  = search.trim() ? searchCOs : filterCOs;

  const backLabel = search.trim()
    ? `${searchCOs.length} result${searchCOs.length !== 1 ? 's' : ''} for "${search}"`
    : activeFilter === 'total'    ? 'All Open Change Orders'
    : activeFilter === 'proposed' ? 'Proposed Change Orders'
    : activeFilter === 'stale'    ? 'Stale Change Orders (≥ 14 days)'
    : '';

  const handleStatClick = key => {
    setSearch('');
    setActiveFilter(prev => prev === key ? null : key);
  };

  const handleBack = () => { setActiveFilter(null); setSearch(''); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.bg, overflowY: 'auto',
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', padding: '20px 20px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.03em' }}>
            Change Orders
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: C.hint }}>
            {visibleProjects.length} project{visibleProjects.length !== 1 ? 's' : ''} · {allCOs.length} change orders
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <SummaryCard
            label="Total Open COs"
            value={stats.openCount}
            active={activeFilter === 'total'}
            onClick={() => handleStatClick('total')}
          />
          <SummaryCard
            label="Proposed"
            value={stats.proposedCount}
            active={activeFilter === 'proposed'}
            onClick={() => handleStatClick('proposed')}
          />
          <SummaryCard
            label="Stale > 14 Days"
            value={stats.staleCount}
            color={stats.staleCount > 0 ? C.warning : undefined}
            active={activeFilter === 'stale'}
            onClick={() => handleStatClick('stale')}
          />
          <SummaryCard
            label="$ Proposed Value"
            value={fmtAmt(stats.propVal)}
            color={C.success}
          />
        </div>

        {/* Search bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ position: 'relative', width: '33%', minWidth: 160 }}>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveFilter(null); }}
              placeholder="Search CO #, job, description…"
              style={{ display: 'block', width: '100%', padding: '7px 28px 7px 12px',
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7,
                color: C.text, fontSize: 12, fontFamily: 'inherit',
                boxSizing: 'border-box', outline: 'none' }}
            />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: C.hint, cursor: 'pointer',
                  fontSize: 16, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }}>
                ×
              </button>
            )}
          </div>
          {search.trim() && (
            <span style={{ fontSize: 11, color: C.hint }}>
              {searchCOs.length} result{searchCOs.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Main content */}
        {showFlat ? (
          <FlatTable
            cos={flatCOs}
            projects={visibleProjects}
            onBack={handleBack}
            backLabel={backLabel}
          />
        ) : (
          <div>
            {sortedProjects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                cos={allCOs.filter(c => c.proj === p.id)}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
