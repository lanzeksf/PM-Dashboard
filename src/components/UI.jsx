import React, { useRef, useEffect } from "react";
import { C, MI } from "../core/utils.jsx";

// ── Confidence badge ──────────────────────────────────────────────────────────
export function ConfBadge({ s }) {
  if (s == null) return null;
  const c   = s >= 90 ? C.success : s >= 80 ? C.warning : C.danger;
  const lbl = s >= 90 ? "High"    : s >= 80 ? "Medium"  : "Low";
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 9px", borderRadius: 20, background: `${c}18`, color: c, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontFamily: "monospace" }}>{s}%</span> · {lbl}
    </span>
  );
}

// ── Urgency badge ─────────────────────────────────────────────────────────────
export function UrgBadge({ u }) {
  const map = { High: [C.danger, C.dangerDim], Medium: [C.warning, C.warningDim], Low: [C.success, C.successDim] };
  const [c, b] = map[u] || map.Low;
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 9px", borderRadius: 20, background: b, color: c }}>
      {u}
    </span>
  );
}

// ── Vertical badge ────────────────────────────────────────────────────────────
export function VerBadge({ v }) {
  const map = { All: "#94a3b8", Structural: "#38bdf8", Solar: "#facc15", Aero: "#a78bfa" };
  const c = map[v] || map.All;
  return (
    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: `${c}18`, color: c, fontWeight: 500 }}>
      {v}
    </span>
  );
}

// ── Context menu ──────────────────────────────────────────────────────────────
// items: Array of { icon, label, fn, danger? } or "---" (divider)
export function CtxMenu({ items, onClose, style }) {
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={ref} style={{ position: "absolute", background: "#1e2235", border: `1px solid ${C.borderHi}`, borderRadius: 9, padding: 4, zIndex: 300, minWidth: 164, boxShadow: "0 6px 28px rgba(0,0,0,0.65)", ...style }}>
      {items.map((it, i) =>
        it === "---"
          ? <div key={i} style={{ height: 1, background: C.border, margin: "3px 0" }} />
          : (
            <button key={i} onClick={() => { it.fn(); onClose(); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", background: "none", border: "none", cursor: "pointer", color: it.danger ? C.danger : C.text, fontSize: 12, fontFamily: "inherit", borderRadius: 6, textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <span style={{ width: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: it.danger ? 1 : 0.6 }}>
                {MI[it.icon] || null}
              </span>
              {it.label}
            </button>
          )
      )}
    </div>
  );
}

// ── Source citation slide-in panel ────────────────────────────────────────────
export function SourcePanel({ source, onClose }) {
  return (
    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 320, background: C.surface, borderLeft: `1px solid ${C.borderHi}`, display: "flex", flexDirection: "column", zIndex: 100, boxShadow: "-8px 0 32px rgba(0,0,0,0.4)" }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: C.text }}>{source.doc}</p>
          {source.section && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{source.section}</p>}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.hint, fontSize: 18, lineHeight: 1, padding: 4 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <div style={{ background: C.surface2, borderRadius: 10, padding: "14px", border: `1px solid ${C.border}` }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: C.hint, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Reference</p>
          <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            Full document content will appear here once the KSF knowledge base is connected. For now this confirms the source cited by Kern Bot.
          </p>
        </div>
        <div style={{ marginTop: 12, padding: "10px 12px", background: C.accentDim, border: `1px solid rgba(91,124,250,0.2)`, borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 11, color: C.accentText, lineHeight: 1.65 }}>
            📚 Knowledge base integration coming soon. Sources will display full text, page references, and revision history.
          </p>
        </div>
      </div>
    </div>
  );
}
