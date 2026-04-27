import React, { useState, useRef, useCallback, useEffect } from "react";
import { C, MI, isImage, isPDF, fmtBytes, readFileAsDataURL, MAX_FILE_SIZE, MAX_ATTACHMENTS } from "../core/utils.jsx";

// ── useAttachments hook ───────────────────────────────────────────────────────
export function useAttachments() {
  const [attachments, setAttachments] = useState([]);
  const [error,       setError]       = useState("");
  const fileRef = useRef();

  const openPicker = () => fileRef.current?.click();

  const handleFiles = useCallback(async (files) => {
    const arr = [...files];
    if (attachments.length + arr.length > MAX_ATTACHMENTS) {
      setError(`Max ${MAX_ATTACHMENTS} attachments`); return;
    }
    const tooBig = arr.find(f => f.size > MAX_FILE_SIZE);
    if (tooBig) { setError(`${tooBig.name} exceeds 8 MB limit`); return; }
    setError("");
    const loaded = await Promise.all(
      arr.map(async f => ({ name: f.name, size: f.size, mimeType: f.type, dataUrl: await readFileAsDataURL(f) }))
    );
    setAttachments(p => [...p, ...loaded]);
  }, [attachments.length]);

  const removeAt = i => setAttachments(p => p.filter((_, j) => j !== i));
  const clear    = () => setAttachments([]);

  const fileInput = (
    <input ref={fileRef} type="file" multiple
      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.dwg"
      style={{ display: "none" }}
      onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
    />
  );

  return { attachments, error, openPicker, handleFiles, removeAt, clear, fileInput };
}

// ── Attachment tray (shown above the textarea while composing) ────────────────
export function AttachTray({ attachments, onRemove }) {
  if (!attachments.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px 0", borderTop: `1px solid ${C.border}` }}>
      {attachments.map((f, i) => (
        <div key={i} style={{ position: "relative", borderRadius: 7, overflow: "visible" }}>
          {isImage({ type: f.mimeType }) ? (
            <div style={{ position: "relative", width: 56, height: 56, borderRadius: 7, overflow: "hidden", border: `1px solid ${C.border}`, flexShrink: 0 }}>
              <img src={f.dataUrl} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 9px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, maxWidth: 160 }}>
              <span style={{ color: f.mimeType === "application/pdf" ? C.danger : C.muted, flexShrink: 0, display: "flex" }}>
                {f.mimeType === "application/pdf" ? MI.pdf : MI.file}
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                <p style={{ margin: 0, fontSize: 10, color: C.hint }}>{fmtBytes(f.size)}</p>
              </div>
            </div>
          )}
          <button onClick={() => onRemove(i)}
            style={{ position: "absolute", top: -6, right: -6, width: 16, height: 16, borderRadius: "50%", background: "#e74c3c", border: "1.5px solid #0d0f16", color: "#fff", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0, zIndex: 1 }}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Attachment display inside a message bubble ────────────────────────────────
export function AttachDisplay({ attachments, onView }) {
  if (!attachments?.length) return null;
  const images = attachments.filter(f => isImage({ type: f.mimeType }));
  const others = attachments.filter(f => !isImage({ type: f.mimeType }));
  const download = f => { const a = document.createElement("a"); a.href = f.dataUrl; a.download = f.name; a.click(); };

  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: images.length === 1 ? "1fr" : "1fr 1fr", gap: 4 }}>
          {images.map((f, i) => (
            <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", cursor: "pointer", aspectRatio: "16/9", background: C.surface2 }} onClick={() => onView(f)}>
              <img src={f.dataUrl} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.45)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0)"}>
                <button onClick={e => { e.stopPropagation(); onView(f); }} style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                  {MI.expand}<span>View</span>
                </button>
                <button onClick={e => { e.stopPropagation(); download(f); }} style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                  {MI.download}<span>Save</span>
                </button>
              </div>
              <div style={{ position: "absolute", bottom: 4, left: 5, right: 5, fontSize: 10, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pointerEvents: "none" }}>
                {f.name}
              </div>
            </div>
          ))}
        </div>
      )}
      {others.map((f, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8 }}>
          <span style={{ color: f.mimeType === "application/pdf" ? C.danger : C.accentText, flexShrink: 0, display: "flex" }}>
            {f.mimeType === "application/pdf" ? MI.pdf : MI.file}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
            <p style={{ margin: 0, fontSize: 10, color: C.hint }}>{fmtBytes(f.size)}</p>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {isPDF({ type: f.mimeType }) && (
              <button onClick={() => onView(f)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                {MI.expand}<span>View</span>
              </button>
            )}
            <button onClick={() => download(f)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              {MI.download}<span>Save</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PDF renderer (uses pdf.js from CDN) ──────────────────────────────────────
function PDFViewer({ dataUrl }) {
  const [pages,   setPages]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setPages([]); setError(false);
    const render = async () => {
      try {
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
        const base64 = dataUrl.split(",")[1];
        const binary = atob(base64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        const rendered = [];
        for (let p = 1; p <= pdf.numPages; p++) {
          const page     = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas   = document.createElement("canvas");
          canvas.width   = viewport.width;
          canvas.height  = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          if (cancelled) return;
          rendered.push(canvas.toDataURL("image/png"));
        }
        setPages(rendered); setLoading(false);
      } catch { if (!cancelled) { setError(true); setLoading(false); } }
    };
    render();
    return () => { cancelled = true; };
  }, [dataUrl]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${C.accent}`, borderTopColor: "transparent", animation: "kbspin 0.8s linear infinite" }} />
      <span style={{ color: C.muted, fontSize: 13 }}>Rendering PDF…</span>
      <style>{`@keyframes kbspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40 }}>
      <span style={{ color: C.muted, fontSize: 13 }}>Could not render PDF in this environment.</span>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 0", alignItems: "center", width: "100%" }}>
      {pages.map((src, i) => (
        <img key={i} src={src} alt={`Page ${i + 1}`}
          style={{ width: "min(860px,96%)", borderRadius: 4, boxShadow: "0 2px 16px rgba(0,0,0,0.5)", background: "#fff", display: "block" }} />
      ))}
    </div>
  );
}

// ── Full-screen file viewer ───────────────────────────────────────────────────
export function Viewer({ file, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const download = () => { const a = document.createElement("a"); a.href = file.dataUrl; a.download = file.name; a.click(); };

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", zIndex: 500 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{file.name}</span>
          <span style={{ fontSize: 11, color: C.hint }}>{fmtBytes(file.size)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={download} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ color: C.hint, display: "flex" }}>{MI.download}</span>Download
          </button>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, background: C.surface, border: `1px solid ${C.border}`, cursor: "pointer", color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {MI.close}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {isImage({ type: file.mimeType }) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100%" }}>
            <img src={file.dataUrl} alt={file.name} style={{ maxWidth: "100%", objectFit: "contain", borderRadius: 4, boxShadow: "0 4px 40px rgba(0,0,0,0.5)" }} />
          </div>
        )}
        {file.mimeType === "application/pdf" && <PDFViewer dataUrl={file.dataUrl} />}
      </div>
    </div>
  );
}
