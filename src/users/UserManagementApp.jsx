import React, { useState, useEffect } from "react";
import { C, F, fmtRel, viewingAsTooltip } from "../core/utils.jsx";

const ROLE_LABELS = {
  admin: "Admin", sr_pm: "Senior PM", apm: "Assistant PM", coordinator: "Coordinator",
  superintendent: "Superintendent", mfg_eng: "Manufacturing Engineer", field: "Field",
};
const ROLE_OPTS = Object.keys(ROLE_LABELS);

const firstName = name => name.split(" ")[0];

function StatusChips({ u }) {
  if (!u.mustChangePassword && !u.passwordResetRequested) {
    return <span style={{ fontSize: 11, color: C.hint }}>—</span>;
  }
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {u.mustChangePassword && (
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: C.warningDim, color: C.warning, whiteSpace: "nowrap" }}>
          Temp password active
        </span>
      )}
      {u.passwordResetRequested && (
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: C.dangerDim, color: C.danger, whiteSpace: "nowrap" }}>
          Reset requested
        </span>
      )}
    </div>
  );
}

export default function UserManagementApp({ user, isViewingAs = false }) {
  const [users,   setUsers]   = useState(null);
  const [error,   setError]   = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [reveals, setReveals] = useState({}); // userId -> tempPassword
  const [editId,  setEditId]  = useState(null);
  const [editDraft, setEditDraft] = useState({ position: "", role: "" });
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    fetch("/api/users", { credentials: "include" })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load users");
        return data.users;
      })
      .then(setUsers)
      .catch(e => setError(e.message));
  }, []);

  async function confirmReset(userId) {
    setResetting(userId);
    try {
      const res = await fetch("/api/auth/admin-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setReveals(r => ({ ...r, [userId]: data.tempPassword }));
      setUsers(list => list.map(u => u.id === userId ? { ...u, mustChangePassword: true, passwordResetRequested: false } : u));
    } catch (e) {
      setError(e.message);
    } finally {
      setResetting(null);
      setConfirmId(null);
    }
  }

  function startEdit(u) {
    setEditId(u.id);
    setEditDraft({ position: u.position, role: u.role });
    setError("");
  }

  async function saveEdit(userId) {
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, position: editDraft.position, role: editDraft.role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");
      setUsers(list => list.map(u => u.id === userId ? { ...u, ...data.user } : u));
      setEditId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "20px 20px 48px" }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.03em" }}>User Management</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.hint }}>
            {users ? `${users.length} team member${users.length !== 1 ? "s" : ""}` : "Loading…"} · Visible to Admin and Senior PM only
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: "10px 14px", background: C.dangerDim, border: `1px solid ${C.danger}44`, borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: C.danger }}>{error}</span>
          </div>
        )}

        {!users && !error && (
          <p style={{ fontSize: 13, color: C.hint }}>Loading users…</p>
        )}

        {users && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                    {["Name", "Position", "Role", "Department", "Last Login", "Status", ""].map((h, i) => (
                      <th key={i} style={{ textAlign: "left", padding: "9px 14px", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "10px 14px" }}>
                        <p style={{ margin: 0, fontWeight: 600, color: C.text }}>{u.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: C.hint }}>{u.email}</p>
                      </td>
                      <td style={{ padding: "10px 14px", color: C.text, whiteSpace: "nowrap" }}>
                        {editId === u.id ? (
                          <input value={editDraft.position} onChange={e => setEditDraft(d => ({ ...d, position: e.target.value }))}
                            style={{ width: "100%", fontSize: 12.5, padding: "4px 7px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontFamily: "inherit" }} />
                        ) : u.position}
                      </td>
                      <td style={{ padding: "10px 14px", color: C.muted, whiteSpace: "nowrap" }}>
                        {editId === u.id ? (
                          <select value={editDraft.role} onChange={e => setEditDraft(d => ({ ...d, role: e.target.value }))}
                            style={{ fontSize: 12.5, padding: "4px 7px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontFamily: "inherit" }}>
                            {ROLE_OPTS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        ) : (ROLE_LABELS[u.role] || u.role)}
                      </td>
                      <td style={{ padding: "10px 14px", color: C.muted, whiteSpace: "nowrap" }}>{u.department?.label || "—"}</td>
                      <td style={{ padding: "10px 14px", color: C.muted, whiteSpace: "nowrap" }}>{u.lastLoginAt ? fmtRel(u.lastLoginAt) : "Never"}</td>
                      <td style={{ padding: "10px 14px" }}><StatusChips u={u} /></td>
                      <td style={{ padding: "10px 14px", minWidth: 220 }}>
                        {editId === u.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <button onClick={() => saveEdit(u.id)} disabled={saving || !editDraft.position.trim()} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 5, border: `1px solid ${C.accent}`, background: C.accent, color: C.accentText, cursor: saving ? "default" : "pointer", fontFamily: "inherit", opacity: !editDraft.position.trim() ? 0.5 : 1 }}>
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button onClick={() => setEditId(null)} disabled={saving} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>
                              Cancel
                            </button>
                          </div>
                        ) : reveals[u.id] ? (
                          <div style={{ background: C.successDim, border: `1px solid ${C.success}44`, borderRadius: 6, padding: "6px 10px" }}>
                            <p style={{ margin: 0, fontSize: 11, color: C.text, lineHeight: 1.5 }}>
                              New temp password for {firstName(u.name)}: <span style={{ fontFamily: F.mono, fontWeight: 700 }}>{reveals[u.id]}</span> — copy this and send it to them now, it won't be shown again.
                            </p>
                          </div>
                        ) : confirmId === u.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, color: C.danger }}>Reset {firstName(u.name)}'s password? Signs them out everywhere.</span>
                            <button onClick={() => confirmReset(u.id)} disabled={resetting === u.id} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 5, border: `1px solid ${C.danger}`, background: C.danger, color: "#fff", cursor: resetting === u.id ? "default" : "pointer", fontFamily: "inherit" }}>
                              {resetting === u.id ? "Resetting…" : "Confirm"}
                            </button>
                            <button onClick={() => setConfirmId(null)} disabled={resetting === u.id} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <button onClick={() => startEdit(u)} disabled={isViewingAs} title={isViewingAs ? viewingAsTooltip(user.name) : undefined} style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: isViewingAs ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: isViewingAs ? 0.5 : 1 }}>
                              Edit
                            </button>
                            <button onClick={() => setConfirmId(u.id)} disabled={isViewingAs} title={isViewingAs ? viewingAsTooltip(user.name) : undefined} style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 11px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: isViewingAs ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: isViewingAs ? 0.5 : 1 }}>
                              Reset Password
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
