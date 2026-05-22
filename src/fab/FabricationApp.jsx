import React, { useState, useMemo, useEffect } from "react";
import { C } from "../core/utils.jsx";

// ─── Phase styling ─────────────────────────────────────────────────────────────
const PHASE = {
  Cut:   { color: C.accent,   bg: C.accentDim   },
  Fit:   { color: C.warning,  bg: C.warningDim  },
  Weld:  { color: C.danger,   bg: C.dangerDim   },
  Paint: { color: C.pm,       bg: C.pmDim       },
  Galv:  { color: C.success,  bg: C.successDim  },
  Done:  { color: C.success,  bg: C.successDim  },
  Ship:  { color: C.success,  bg: C.successDim  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const hColor    = p => p >= 80 ? C.success    : p >= 40 ? C.warning    : C.danger;
const hBg       = p => p >= 80 ? C.successDim : p >= 40 ? C.warningDim : C.dangerDim;
const fmt       = iso => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtFull   = iso => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const daysUntil = iso => Math.ceil((new Date(iso) - Date.now()) / 86400000);
const DAY_MS    = 86400000;
const toMs      = iso => new Date(iso).getTime();

// ─── Mock Data: Jobs ───────────────────────────────────────────────────────────
const JOBS = [
  {
    id: "26606", name: "LACCD Math", company: "Kern Steel",
    pct: 62, shipDate: "2026-06-02", fabStart: "2025-11-15",
    projFinish: "2026-05-28", matIn: "2025-11-01",
    assemblyCount: 847, notStarted: false, fabricated: false,
    phases: { Cut: 45, Fit: 78, Weld: 110, Paint: 89, Galv: 0, Ship: 525 },
    assemblies: [
      {
        id: "a1", mark: "BF-1", name: "Brace Frame West",
        partCount: 5, phase: "Weld", pct: 72,
        workOrder: "WO-26606-001", heatNumber: "H-8812",
        parts: [
          { mark: "W10×49-01", profile: "W10×49",        heat: "H-8812", length: "14'-6\"",  weight: "355 lb", status: "Weld"  },
          { mark: "PL-001",    profile: "PL 1×12×18",    heat: "H-8812", length: "1'-6\"",   weight: "14 lb",  status: "Weld"  },
          { mark: "PL-002",    profile: "PL 3/4×10×24",  heat: "H-9143", length: "2'-0\"",   weight: "31 lb",  status: "Paint" },
          { mark: "STF-001",   profile: "PL 1/2×4×8",    heat: "H-8812", length: "0'-8\"",   weight: "5 lb",   status: "Done"  },
          { mark: "ANG-001",   profile: "L3×3×1/4",      heat: "H-7731", length: "2'-6\"",   weight: "12 lb",  status: "Weld"  },
        ],
      },
      {
        id: "a2", mark: "BF-2", name: "Brace Frame East",
        partCount: 4, phase: "Fit", pct: 45,
        workOrder: "WO-26606-002", heatNumber: "H-4422",
        parts: [
          { mark: "HSS-001",   profile: "HSS6×6×3/8",    heat: "H-4422", length: "18'-0\"",  weight: "428 lb", status: "Fit"   },
          { mark: "PL-003",    profile: "PL 1×10×12",    heat: "H-4422", length: "1'-0\"",   weight: "10 lb",  status: "Fit"   },
          { mark: "PL-004",    profile: "PL 1×10×12",    heat: "H-4422", length: "1'-0\"",   weight: "10 lb",  status: "Cut"   },
          { mark: "ANG-002",   profile: "L4×4×3/8",      heat: "H-7731", length: "3'-0\"",   weight: "28 lb",  status: "Cut"   },
        ],
      },
      {
        id: "a3", mark: "COL-A", name: "Column Line A",
        partCount: 6, phase: "Paint", pct: 88,
        workOrder: "WO-26606-003", heatNumber: "H-9143",
        parts: [
          { mark: "W12×65-01", profile: "W12×65",        heat: "H-9143", length: "22'-0\"",  weight: "715 lb", status: "Paint" },
          { mark: "W12×65-02", profile: "W12×65",        heat: "H-9143", length: "22'-0\"",  weight: "715 lb", status: "Paint" },
          { mark: "PL-005",    profile: "PL 1×14×14",    heat: "H-6607", length: "1'-2\"",   weight: "28 lb",  status: "Paint" },
          { mark: "PL-006",    profile: "PL 3/4×12×12",  heat: "H-6607", length: "1'-0\"",   weight: "18 lb",  status: "Done"  },
          { mark: "STF-002",   profile: "PL 1/2×5×10",   heat: "H-9143", length: "0'-10\"",  weight: "8 lb",   status: "Paint" },
          { mark: "ANG-003",   profile: "L3×4×1/4",      heat: "H-7731", length: "1'-6\"",   weight: "8 lb",   status: "Done"  },
        ],
      },
      {
        id: "a4", mark: "COL-B", name: "Column Line B",
        partCount: 5, phase: "Weld", pct: 65,
        workOrder: "WO-26606-004", heatNumber: "H-9143",
        parts: [
          { mark: "W12×65-03", profile: "W12×65",        heat: "H-9143", length: "22'-0\"",  weight: "715 lb", status: "Weld"  },
          { mark: "W12×65-04", profile: "W12×65",        heat: "H-9143", length: "22'-0\"",  weight: "715 lb", status: "Fit"   },
          { mark: "PL-007",    profile: "PL 1×14×14",    heat: "H-6607", length: "1'-2\"",   weight: "28 lb",  status: "Weld"  },
          { mark: "PL-008",    profile: "PL 3/4×12×12",  heat: "H-6607", length: "1'-0\"",   weight: "18 lb",  status: "Fit"   },
          { mark: "STF-003",   profile: "PL 1/2×5×10",   heat: "H-9143", length: "0'-10\"",  weight: "8 lb",   status: "Cut"   },
        ],
      },
      {
        id: "a5", mark: "PL-101", name: "Platform Level 1",
        partCount: 4, phase: "Cut", pct: 30,
        workOrder: "WO-26606-005", heatNumber: "H-3891",
        parts: [
          { mark: "W8×31-01",  profile: "W8×31",          heat: "H-3891", length: "10'-0\"",  weight: "155 lb", status: "Cut"   },
          { mark: "W8×31-02",  profile: "W8×31",          heat: "H-3891", length: "10'-0\"",  weight: "155 lb", status: "Cut"   },
          { mark: "PL-009",    profile: "PL 3/4×8×10",    heat: "H-3891", length: "0'-10\"",  weight: "10 lb",  status: "Cut"   },
          { mark: "PL-010",    profile: "PL 1/2×6×8",     heat: "H-5514", length: "0'-8\"",   weight: "5 lb",   status: "Cut"   },
        ],
      },
    ],
  },
  {
    id: "26741", name: "BC Student Housing", company: "Kern Steel",
    pct: 88, shipDate: "2026-06-10", fabStart: "2026-02-01",
    projFinish: "2026-06-05", matIn: "2026-01-20",
    assemblyCount: 312, notStarted: false, fabricated: false,
    phases: { Cut: 5, Fit: 8, Weld: 12, Paint: 13, Galv: 0, Ship: 274 },
    assemblies: [
      {
        id: "b1", mark: "G-1", name: "Main Girder North",
        partCount: 5, phase: "Paint", pct: 92,
        workOrder: "WO-26741-001", heatNumber: "H-6607",
        parts: [
          { mark: "W14×82-01",  profile: "W14×82",        heat: "H-6607", length: "28'-0\"",  weight: "1148 lb", status: "Paint" },
          { mark: "W14×82-02",  profile: "W14×82",        heat: "H-6607", length: "28'-0\"",  weight: "1148 lb", status: "Done"  },
          { mark: "PL-B01",     profile: "PL 1×16×16",    heat: "H-9143", length: "1'-4\"",   weight: "43 lb",   status: "Paint" },
          { mark: "STF-B01",    profile: "PL 3/4×5×12",   heat: "H-6607", length: "1'-0\"",   weight: "12 lb",   status: "Done"  },
          { mark: "STF-B02",    profile: "PL 3/4×5×12",   heat: "H-6607", length: "1'-0\"",   weight: "12 lb",   status: "Done"  },
        ],
      },
      {
        id: "b2", mark: "G-2", name: "Main Girder South",
        partCount: 5, phase: "Paint", pct: 85,
        workOrder: "WO-26741-002", heatNumber: "H-6607",
        parts: [
          { mark: "W14×82-03",  profile: "W14×82",        heat: "H-6607", length: "28'-0\"",  weight: "1148 lb", status: "Paint" },
          { mark: "W14×82-04",  profile: "W14×82",        heat: "H-6607", length: "28'-0\"",  weight: "1148 lb", status: "Paint" },
          { mark: "W14×82-05",  profile: "W14×82",        heat: "H-6607", length: "28'-0\"",  weight: "1148 lb", status: "Paint" },
          { mark: "PL-B02",     profile: "PL 1×16×16",    heat: "H-9143", length: "1'-4\"",   weight: "43 lb",   status: "Paint" },
          { mark: "STF-B03",    profile: "PL 3/4×5×12",   heat: "H-6607", length: "1'-0\"",   weight: "12 lb",   status: "Weld"  },
        ],
      },
      {
        id: "b3", mark: "COL-1", name: "Ground Floor Column",
        partCount: 4, phase: "Done", pct: 100,
        workOrder: "WO-26741-003", heatNumber: "H-8034",
        parts: [
          { mark: "W10×49-B01", profile: "W10×49",        heat: "H-8034", length: "16'-0\"",  weight: "392 lb",  status: "Done"  },
          { mark: "PL-B03",     profile: "PL 1×12×14",    heat: "H-8034", length: "1'-2\"",   weight: "14 lb",   status: "Done"  },
          { mark: "PL-B04",     profile: "PL 3/4×8×10",   heat: "H-8034", length: "0'-10\"",  weight: "8 lb",    status: "Done"  },
          { mark: "ANG-B01",    profile: "L4×4×3/8",      heat: "H-7731", length: "2'-0\"",   weight: "19 lb",   status: "Done"  },
        ],
      },
      {
        id: "b4", mark: "BR-1", name: "Cross Brace Level 2",
        partCount: 4, phase: "Weld", pct: 70,
        workOrder: "WO-26741-004", heatNumber: "H-4422",
        parts: [
          { mark: "HSS-B01",    profile: "HSS4×4×1/4",    heat: "H-4422", length: "22'-6\"",  weight: "296 lb",  status: "Weld"  },
          { mark: "HSS-B02",    profile: "HSS4×4×1/4",    heat: "H-4422", length: "22'-6\"",  weight: "296 lb",  status: "Weld"  },
          { mark: "PL-B05",     profile: "PL 3/4×10×10",  heat: "H-4422", length: "0'-10\"",  weight: "16 lb",   status: "Fit"   },
          { mark: "PL-B06",     profile: "PL 3/4×10×10",  heat: "H-4422", length: "0'-10\"",  weight: "16 lb",   status: "Fit"   },
        ],
      },
    ],
  },
  {
    id: "27103", name: "Elk Grove Solar", company: "Kern Solar",
    pct: 41, shipDate: "2026-07-18", fabStart: "2026-04-01",
    projFinish: "2026-07-10", matIn: "2026-03-20",
    assemblyCount: 156, notStarted: false, fabricated: false,
    phases: { Cut: 22, Fit: 35, Weld: 28, Paint: 6, Galv: 0, Ship: 65 },
    assemblies: [
      {
        id: "c1", mark: "MF-1", name: "Module Frame Row 1",
        partCount: 5, phase: "Paint", pct: 85,
        workOrder: "WO-27103-001", heatNumber: "H-2276",
        parts: [
          { mark: "HSS-S01",    profile: "HSS3×3×3/16",   heat: "H-2276", length: "12'-0\"",  weight: "88 lb",   status: "Paint" },
          { mark: "HSS-S02",    profile: "HSS3×3×3/16",   heat: "H-2276", length: "12'-0\"",  weight: "88 lb",   status: "Paint" },
          { mark: "HSS-S03",    profile: "HSS3×3×3/16",   heat: "H-2276", length: "8'-0\"",   weight: "59 lb",   status: "Done"  },
          { mark: "PL-S01",     profile: "PL 1/2×6×6",    heat: "H-2276", length: "0'-6\"",   weight: "5 lb",    status: "Done"  },
          { mark: "PL-S02",     profile: "PL 1/2×6×6",    heat: "H-2276", length: "0'-6\"",   weight: "5 lb",    status: "Paint" },
        ],
      },
      {
        id: "c2", mark: "MF-2", name: "Module Frame Row 2",
        partCount: 5, phase: "Weld", pct: 55,
        workOrder: "WO-27103-002", heatNumber: "H-2276",
        parts: [
          { mark: "HSS-S04",    profile: "HSS3×3×3/16",   heat: "H-2276", length: "12'-0\"",  weight: "88 lb",   status: "Weld"  },
          { mark: "HSS-S05",    profile: "HSS3×3×3/16",   heat: "H-2276", length: "12'-0\"",  weight: "88 lb",   status: "Weld"  },
          { mark: "HSS-S06",    profile: "HSS3×3×3/16",   heat: "H-2276", length: "8'-0\"",   weight: "59 lb",   status: "Fit"   },
          { mark: "PL-S03",     profile: "PL 1/2×6×6",    heat: "H-2276", length: "0'-6\"",   weight: "5 lb",    status: "Fit"   },
          { mark: "PL-S04",     profile: "PL 1/2×6×6",    heat: "H-2276", length: "0'-6\"",   weight: "5 lb",    status: "Cut"   },
        ],
      },
      {
        id: "c3", mark: "MF-3", name: "Module Frame Row 3",
        partCount: 5, phase: "Cut", pct: 20,
        workOrder: "WO-27103-003", heatNumber: "H-5514",
        parts: [
          { mark: "HSS-S07",    profile: "HSS3×3×3/16",   heat: "H-5514", length: "12'-0\"",  weight: "88 lb",   status: "Cut"   },
          { mark: "HSS-S08",    profile: "HSS3×3×3/16",   heat: "H-5514", length: "12'-0\"",  weight: "88 lb",   status: "Cut"   },
          { mark: "HSS-S09",    profile: "HSS3×3×3/16",   heat: "H-5514", length: "8'-0\"",   weight: "59 lb",   status: "Cut"   },
          { mark: "PL-S05",     profile: "PL 1/2×6×6",    heat: "H-5514", length: "0'-6\"",   weight: "5 lb",    status: "Cut"   },
          { mark: "PL-S06",     profile: "PL 1/2×6×6",    heat: "H-5514", length: "0'-6\"",   weight: "5 lb",    status: "Cut"   },
        ],
      },
      {
        id: "c4", mark: "PST-N", name: "Post Assembly North",
        partCount: 4, phase: "Paint", pct: 82,
        workOrder: "WO-27103-004", heatNumber: "H-8812",
        parts: [
          { mark: "HSS-P01",    profile: "HSS6×6×3/8",    heat: "H-8812", length: "14'-0\"",  weight: "332 lb",  status: "Paint" },
          { mark: "HSS-P02",    profile: "HSS6×6×3/8",    heat: "H-8812", length: "14'-0\"",  weight: "332 lb",  status: "Paint" },
          { mark: "PL-P01",     profile: "PL 1×12×14",    heat: "H-8812", length: "1'-2\"",   weight: "14 lb",   status: "Done"  },
          { mark: "PL-P02",     profile: "PL 1×12×14",    heat: "H-8812", length: "1'-2\"",   weight: "14 lb",   status: "Paint" },
        ],
      },
      {
        id: "c5", mark: "PST-S", name: "Post Assembly South",
        partCount: 4, phase: "Weld", pct: 50,
        workOrder: "WO-27103-005", heatNumber: "H-8812",
        parts: [
          { mark: "HSS-P03",    profile: "HSS6×6×3/8",    heat: "H-8812", length: "14'-0\"",  weight: "332 lb",  status: "Weld"  },
          { mark: "HSS-P04",    profile: "HSS6×6×3/8",    heat: "H-8812", length: "14'-0\"",  weight: "332 lb",  status: "Fit"   },
          { mark: "PL-P03",     profile: "PL 1×12×14",    heat: "H-8812", length: "1'-2\"",   weight: "14 lb",   status: "Weld"  },
          { mark: "PL-P04",     profile: "PL 1×12×14",    heat: "H-8812", length: "1'-2\"",   weight: "14 lb",   status: "Cut"   },
        ],
      },
    ],
  },
  {
    id: "27290", name: "Fresno Civic", company: "Kern Steel",
    pct: 0, shipDate: "2026-10-15", fabStart: "2026-06-09",
    projFinish: "2026-10-05", matIn: "2026-05-28",
    assemblyCount: 520, notStarted: true, fabricated: false,
    phases: { Cut: 0, Fit: 0, Weld: 0, Paint: 0, Galv: 0, Ship: 0 },
    assemblies: [
      {
        id: "d1", mark: "COL-A", name: "Column Line A",
        partCount: 5, phase: "Cut", pct: 0,
        workOrder: "WO-27290-001", heatNumber: "—",
        parts: [
          { mark: "W14×82-F01", profile: "W14×82",        heat: "—",      length: "30'-0\"",  weight: "1230 lb", status: "Cut"  },
          { mark: "W14×82-F02", profile: "W14×82",        heat: "—",      length: "30'-0\"",  weight: "1230 lb", status: "Cut"  },
          { mark: "PL-F01",     profile: "PL 1×18×18",    heat: "—",      length: "1'-6\"",   weight: "54 lb",   status: "Cut"  },
          { mark: "PL-F02",     profile: "PL 1×18×18",    heat: "—",      length: "1'-6\"",   weight: "54 lb",   status: "Cut"  },
          { mark: "STF-F01",    profile: "PL 3/4×6×12",   heat: "—",      length: "1'-0\"",   weight: "12 lb",   status: "Cut"  },
        ],
      },
      {
        id: "d2", mark: "COL-B", name: "Column Line B",
        partCount: 5, phase: "Cut", pct: 0,
        workOrder: "WO-27290-002", heatNumber: "—",
        parts: [
          { mark: "W14×82-F03", profile: "W14×82",        heat: "—",      length: "30'-0\"",  weight: "1230 lb", status: "Cut"  },
          { mark: "W14×82-F04", profile: "W14×82",        heat: "—",      length: "30'-0\"",  weight: "1230 lb", status: "Cut"  },
          { mark: "PL-F03",     profile: "PL 1×18×18",    heat: "—",      length: "1'-6\"",   weight: "54 lb",   status: "Cut"  },
          { mark: "PL-F04",     profile: "PL 1×18×18",    heat: "—",      length: "1'-6\"",   weight: "54 lb",   status: "Cut"  },
          { mark: "STF-F02",    profile: "PL 3/4×6×12",   heat: "—",      length: "1'-0\"",   weight: "12 lb",   status: "Cut"  },
        ],
      },
      {
        id: "d3", mark: "BM-1", name: "Main Roof Beam",
        partCount: 4, phase: "Cut", pct: 0,
        workOrder: "WO-27290-003", heatNumber: "—",
        parts: [
          { mark: "W21×62-F01", profile: "W21×62",        heat: "—",      length: "40'-0\"",  weight: "1240 lb", status: "Cut"  },
          { mark: "W21×62-F02", profile: "W21×62",        heat: "—",      length: "40'-0\"",  weight: "1240 lb", status: "Cut"  },
          { mark: "PL-F05",     profile: "PL 1×20×20",    heat: "—",      length: "1'-8\"",   weight: "67 lb",   status: "Cut"  },
          { mark: "STF-F03",    profile: "PL 3/4×6×14",   heat: "—",      length: "1'-2\"",   weight: "14 lb",   status: "Cut"  },
        ],
      },
    ],
  },
  {
    id: "27401", name: "Stockton MFR", company: "Kern Steel",
    pct: 0, shipDate: "2026-10-05", fabStart: "2026-06-23",
    projFinish: "2026-09-25", matIn: "2026-06-10",
    assemblyCount: 290, notStarted: true, fabricated: false,
    phases: { Cut: 0, Fit: 0, Weld: 0, Paint: 0, Galv: 0, Ship: 0 },
    assemblies: [
      {
        id: "e1", mark: "FR-1", name: "Main Frame West",
        partCount: 5, phase: "Cut", pct: 0,
        workOrder: "WO-27401-001", heatNumber: "—",
        parts: [
          { mark: "W12×65-M01", profile: "W12×65",        heat: "—",      length: "24'-0\"",  weight: "780 lb",  status: "Cut"  },
          { mark: "W12×65-M02", profile: "W12×65",        heat: "—",      length: "24'-0\"",  weight: "780 lb",  status: "Cut"  },
          { mark: "PL-M01",     profile: "PL 1×14×16",    heat: "—",      length: "1'-4\"",   weight: "30 lb",   status: "Cut"  },
          { mark: "PL-M02",     profile: "PL 1×14×16",    heat: "—",      length: "1'-4\"",   weight: "30 lb",   status: "Cut"  },
          { mark: "ANG-M01",    profile: "L4×4×3/8",      heat: "—",      length: "2'-6\"",   weight: "24 lb",   status: "Cut"  },
        ],
      },
      {
        id: "e2", mark: "FR-2", name: "Main Frame East",
        partCount: 4, phase: "Cut", pct: 0,
        workOrder: "WO-27401-002", heatNumber: "—",
        parts: [
          { mark: "W12×65-M03", profile: "W12×65",        heat: "—",      length: "24'-0\"",  weight: "780 lb",  status: "Cut"  },
          { mark: "W12×65-M04", profile: "W12×65",        heat: "—",      length: "24'-0\"",  weight: "780 lb",  status: "Cut"  },
          { mark: "PL-M03",     profile: "PL 1×14×16",    heat: "—",      length: "1'-4\"",   weight: "30 lb",   status: "Cut"  },
          { mark: "ANG-M02",    profile: "L4×4×3/8",      heat: "—",      length: "2'-6\"",   weight: "24 lb",   status: "Cut"  },
        ],
      },
    ],
  },
  {
    id: "27088", name: "Rosamond Solar", company: "Kern Solar",
    pct: 55, shipDate: "2026-06-28", fabStart: "2026-01-15",
    projFinish: "2026-05-20", matIn: "2026-01-05",
    assemblyCount: 204, notStarted: false, fabricated: true,
    phases: { Cut: 0, Fit: 0, Weld: 0, Paint: 8, Galv: 0, Ship: 196 },
    assemblies: [
      {
        id: "f1", mark: "SF-1", name: "Solar Frame Row 1",
        partCount: 5, phase: "Done", pct: 100,
        workOrder: "WO-27088-001", heatNumber: "H-3891",
        parts: [
          { mark: "HSS-R01",    profile: "HSS4×4×1/4",    heat: "H-3891", length: "16'-0\"",  weight: "193 lb",  status: "Done"  },
          { mark: "HSS-R02",    profile: "HSS4×4×1/4",    heat: "H-3891", length: "16'-0\"",  weight: "193 lb",  status: "Done"  },
          { mark: "HSS-R03",    profile: "HSS3×3×3/16",   heat: "H-3891", length: "10'-0\"",  weight: "74 lb",   status: "Done"  },
          { mark: "PL-R01",     profile: "PL 3/4×8×8",    heat: "H-3891", length: "0'-8\"",   weight: "10 lb",   status: "Done"  },
          { mark: "PL-R02",     profile: "PL 3/4×8×8",    heat: "H-3891", length: "0'-8\"",   weight: "10 lb",   status: "Done"  },
        ],
      },
      {
        id: "f2", mark: "SF-2", name: "Solar Frame Row 2",
        partCount: 5, phase: "Done", pct: 100,
        workOrder: "WO-27088-002", heatNumber: "H-3891",
        parts: [
          { mark: "HSS-R04",    profile: "HSS4×4×1/4",    heat: "H-3891", length: "16'-0\"",  weight: "193 lb",  status: "Done"  },
          { mark: "HSS-R05",    profile: "HSS4×4×1/4",    heat: "H-3891", length: "16'-0\"",  weight: "193 lb",  status: "Done"  },
          { mark: "HSS-R06",    profile: "HSS3×3×3/16",   heat: "H-3891", length: "10'-0\"",  weight: "74 lb",   status: "Done"  },
          { mark: "PL-R03",     profile: "PL 3/4×8×8",    heat: "H-3891", length: "0'-8\"",   weight: "10 lb",   status: "Done"  },
          { mark: "PL-R04",     profile: "PL 3/4×8×8",    heat: "H-3891", length: "0'-8\"",   weight: "10 lb",   status: "Done"  },
        ],
      },
      {
        id: "f3", mark: "PST-N", name: "Post Assembly North",
        partCount: 4, phase: "Done", pct: 100,
        workOrder: "WO-27088-003", heatNumber: "H-5514",
        parts: [
          { mark: "HSS-RP01",   profile: "HSS6×6×3/8",    heat: "H-5514", length: "12'-0\"",  weight: "284 lb",  status: "Done"  },
          { mark: "HSS-RP02",   profile: "HSS6×6×3/8",    heat: "H-5514", length: "12'-0\"",  weight: "284 lb",  status: "Done"  },
          { mark: "PL-RP01",    profile: "PL 1×10×12",    heat: "H-5514", length: "1'-0\"",   weight: "10 lb",   status: "Done"  },
          { mark: "PL-RP02",    profile: "PL 1×10×12",    heat: "H-5514", length: "1'-0\"",   weight: "10 lb",   status: "Done"  },
        ],
      },
      {
        id: "f4", mark: "TRK-1", name: "Tracking Arm Assembly",
        partCount: 6, phase: "Done", pct: 100,
        workOrder: "WO-27088-004", heatNumber: "H-2276",
        parts: [
          { mark: "HSS-RT01",   profile: "HSS3×3×3/16",   heat: "H-2276", length: "8'-0\"",   weight: "59 lb",   status: "Done"  },
          { mark: "HSS-RT02",   profile: "HSS3×3×3/16",   heat: "H-2276", length: "8'-0\"",   weight: "59 lb",   status: "Done"  },
          { mark: "HSS-RT03",   profile: "HSS3×3×3/16",   heat: "H-2276", length: "6'-0\"",   weight: "44 lb",   status: "Done"  },
          { mark: "PL-RT01",    profile: "PL 1/2×6×8",    heat: "H-2276", length: "0'-8\"",   weight: "5 lb",    status: "Done"  },
          { mark: "PL-RT02",    profile: "PL 1/2×6×8",    heat: "H-2276", length: "0'-8\"",   weight: "5 lb",    status: "Done"  },
          { mark: "ANG-RT01",   profile: "L3×3×1/4",      heat: "H-2276", length: "2'-0\"",   weight: "8 lb",    status: "Done"  },
        ],
      },
    ],
  },
];

// ─── Mock Data: Today's Work ───────────────────────────────────────────────────
const TODAY_WORK = {
  Cut: [
    { id: "t1", job: "26606", jobName: "LACCD Math",         asm: "PL-101",  desc: "Platform Level 1 — beams",          marks: "W8×31-01 thru -04",       qty: 4 },
    { id: "t2", job: "26606", jobName: "LACCD Math",         asm: "BF-2",    desc: "Brace Frame East — stiffeners",     marks: "STF-004 thru STF-008",    qty: 5 },
    { id: "t3", job: "27103", jobName: "Elk Grove Solar",    asm: "MF-3",    desc: "Module Frame Row 3 — verticals",    marks: "HSS-S07 thru HSS-S09",    qty: 3 },
    { id: "t4", job: "27103", jobName: "Elk Grove Solar",    asm: "MF-3",    desc: "Module Frame Row 3 — base plates",  marks: "PL-S05, PL-S06",          qty: 2 },
  ],
  Weld: [
    { id: "t5", job: "26606", jobName: "LACCD Math",         asm: "BF-1",    desc: "Brace Frame West — main members",   marks: "W10×49-01, PL-001, ANG-001", qty: 3 },
    { id: "t6", job: "26606", jobName: "LACCD Math",         asm: "COL-B",   desc: "Column Line B — web splices",       marks: "W12×65-03, PL-007",       qty: 2 },
    { id: "t7", job: "27088", jobName: "Rosamond Solar",     asm: "TRK-1",   desc: "Tracking Arm — chord welds",        marks: "HSS-RT01 thru HSS-RT03",  qty: 3 },
  ],
  "Paint/Finish": [
    { id: "t8",  job: "26606", jobName: "LACCD Math",        asm: "COL-A",   desc: "Column Line A — prime coat",        marks: "W12×65-01, -02, STF-002", qty: 3 },
    { id: "t9",  job: "26741", jobName: "BC Student Housing", asm: "G-2",    desc: "Main Girder South — prime coat",    marks: "W14×82-03 thru -05",      qty: 3 },
    { id: "t10", job: "27103", jobName: "Elk Grove Solar",   asm: "PST-N",   desc: "Post Assembly North — prime coat",  marks: "HSS-P01, HSS-P02, PL-P01", qty: 3 },
  ],
};

// ─── Mock Data: Shop Loading ───────────────────────────────────────────────────
const SHOP_WEEKS = [
  { label: "May 18–24",    start: "2026-05-18", cap: 400, comm: 380 },
  { label: "May 25–31",    start: "2026-05-25", cap: 380, comm: 405 },
  { label: "Jun 1–7",      start: "2026-06-01", cap: 400, comm: 385 },
  { label: "Jun 8–14",     start: "2026-06-08", cap: 420, comm: 340 },
  { label: "Jun 15–21",    start: "2026-06-15", cap: 400, comm: 295 },
  { label: "Jun 22–28",    start: "2026-06-22", cap: 380, comm: 260 },
  { label: "Jun 29–Jul 5", start: "2026-06-29", cap: 400, comm: 245 },
  { label: "Jul 6–12",     start: "2026-07-06", cap: 410, comm: 280 },
  { label: "Jul 13–19",    start: "2026-07-13", cap: 395, comm: 305 },
  { label: "Jul 20–26",    start: "2026-07-20", cap: 405, comm: 270 },
  { label: "Jul 27–Aug 2", start: "2026-07-27", cap: 400, comm: 240 },
];

// ─── Shared small components ───────────────────────────────────────────────────

function PhaseBadge({ phase, small = false }) {
  const p = PHASE[phase] || PHASE.Cut;
  return (
    <span style={{
      fontSize: small ? 10 : 11, fontWeight: 600,
      padding: small ? "2px 6px" : "3px 8px",
      borderRadius: 4, background: p.bg, color: p.color,
      border: `1px solid ${p.color}33`, whiteSpace: "nowrap",
    }}>
      {phase}
    </span>
  );
}

function ProgressBar({ pct, height = 4 }) {
  return (
    <div style={{ height, background: C.surface2, borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: hColor(pct), borderRadius: 2 }} />
    </div>
  );
}

// ─── Jobs Tab ──────────────────────────────────────────────────────────────────

function JobCard({ job, selected, onClick }) {
  const du         = daysUntil(job.shipDate);
  const shipWarn   = du >= 0 && du <= 14 && job.pct < 80 && !job.notStarted && !job.fabricated;
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "14px 16px", cursor: "pointer",
        borderBottom: `1px solid ${C.border}`,
        borderLeft: selected ? `2px solid ${C.accent}` : "2px solid transparent",
        background: selected ? C.surface2 : hover ? C.surface : "transparent",
        transition: "background 0.1s",
      }}
    >
      {/* Top row: job number + company + assembly count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, fontFamily: "monospace" }}>
            #{job.id}
          </span>
          <span style={{ fontSize: 11, color: C.hint }}>{job.company}</span>
        </div>
        <span style={{ fontSize: 11, color: C.hint }}>{job.assemblyCount.toLocaleString()} asm</span>
      </div>

      {/* Job name */}
      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: C.text }}>{job.name}</p>

      {/* Progress / special states */}
      {job.notStarted ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
            background: C.accentDim, color: C.accentText, border: `1px solid ${C.accent}33`,
          }}>
            Starts {fmt(job.fabStart)}
          </span>
          <span style={{ fontSize: 11, color: C.hint }}>Not yet in shop</span>
        </div>
      ) : job.fabricated ? (
        <div style={{ marginBottom: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
            background: C.warningDim, color: C.warning, border: `1px solid ${C.warning}33`,
          }}>
            ⦿ Fabricated · awaiting ship
          </span>
        </div>
      ) : (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.muted }}>{job.pct}% complete</span>
            <span style={{ fontSize: 11, color: hColor(job.pct), fontWeight: 600 }}>
              {job.pct >= 80 ? "On track" : job.pct >= 40 ? "At risk" : "Behind"}
            </span>
          </div>
          <ProgressBar pct={job.pct} />
        </div>
      )}

      {/* Phase breakdown badges */}
      {!job.notStarted && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {Object.entries(job.phases).map(([phase, count]) =>
            count > 0 ? (
              <span key={phase} style={{
                fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3,
                background: (PHASE[phase] || PHASE.Cut).bg,
                color: (PHASE[phase] || PHASE.Cut).color,
                border: `1px solid ${(PHASE[phase] || PHASE.Cut).color}22`,
              }}>
                {phase} {count}
              </span>
            ) : null
          )}
        </div>
      )}

      {/* Ship date */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
        {shipWarn && <span style={{ fontSize: 12, color: C.danger }}>⚠</span>}
        <span style={{ fontSize: 11, color: shipWarn ? C.danger : C.hint, fontWeight: shipWarn ? 600 : 400 }}>
          Ships {fmtFull(job.shipDate)}
        </span>
      </div>
    </div>
  );
}

function AssemblyList({ job, search, onSelect }) {
  const filtered = useMemo(() => {
    if (!search.trim()) return job.assemblies;
    const q = search.toLowerCase();
    return job.assemblies.filter(a =>
      a.mark.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    );
  }, [job, search]);

  if (filtered.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: C.hint, fontSize: 13 }}>
        No assemblies match "{search}"
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {filtered.map(a => (
        <div
          key={a.id}
          onClick={() => onSelect(a)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "11px 16px", borderBottom: `1px solid ${C.border}`,
            cursor: "pointer",
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.surface2}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: C.accent }}>{a.mark}</span>
              <span style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
            </div>
            <div style={{ fontSize: 11, color: C.hint }}>{a.partCount} parts · {a.workOrder}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <PhaseBadge phase={a.phase} small />
            <span style={{ fontSize: 11, fontWeight: 600, color: hColor(a.pct), minWidth: 28, textAlign: "right" }}>{a.pct}%</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.hint} strokeWidth="2" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

function PartsTable({ assembly, onBack }) {
  const totalWeight = useMemo(() =>
    assembly.parts.reduce((s, p) => {
      const n = parseFloat(p.weight.replace(/[^\d.]/g, ""));
      return s + (isNaN(n) ? 0 : n);
    }, 0),
    [assembly]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none",
            border: "none", cursor: "pointer", color: C.muted, fontSize: 12,
            fontFamily: "inherit", padding: "0 0 10px", marginBottom: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to assemblies
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: C.text }}>
              <span style={{ fontFamily: "monospace", color: C.accent }}>{assembly.mark}</span>
              {" — "}{assembly.name}
            </p>
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.muted }}>
              <span>WO: <span style={{ fontFamily: "monospace", color: C.text }}>{assembly.workOrder}</span></span>
              <span>Heat: <span style={{ fontFamily: "monospace", color: C.text }}>{assembly.heatNumber}</span></span>
            </div>
          </div>
          <PhaseBadge phase={assembly.phase} />
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.surface2, position: "sticky", top: 0, zIndex: 1 }}>
              {["Part Mark", "Profile", "Heat #", "Length", "Weight", "Status"].map(h => (
                <th key={h} style={{
                  padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.06em", color: C.hint,
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assembly.parts.map((p, i) => (
              <tr
                key={i}
                style={{ borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: C.accent, fontWeight: 600 }}>{p.mark}</td>
                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: C.muted }}>{p.profile}</td>
                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: C.muted }}>{p.heat}</td>
                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: C.text }}>{p.length}</td>
                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: C.text, textAlign: "right" }}>{p.weight}</td>
                <td style={{ padding: "10px 12px" }}><PhaseBadge phase={p.status} small /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 16px", borderTop: `1px solid ${C.border}`,
        background: C.surface, display: "flex", justifyContent: "flex-end", flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: C.muted }}>
          {assembly.partCount} parts · Total:{" "}
          <span style={{ color: C.text, fontFamily: "monospace", fontWeight: 600 }}>
            {totalWeight.toLocaleString()} lb
          </span>
        </span>
      </div>
    </div>
  );
}

function JobDetail({ job }) {
  const [selectedAsm, setSelectedAsm] = useState(null);
  const [search, setSearch]           = useState("");

  useEffect(() => {
    setSelectedAsm(null);
    setSearch("");
  }, [job.id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: `1px solid ${C.border}` }}>
      {/* Detail header */}
      <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <p style={{ margin: "0 0 2px", fontSize: 10, color: C.hint, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
          #{job.id} · {job.company}
        </p>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{job.name}</p>
      </div>

      {!selectedAsm ? (
        <>
          {/* Search bar */}
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke={C.hint} strokeWidth="2" strokeLinecap="round"
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              >
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search assemblies…"
                style={{
                  width: "100%", padding: "7px 10px 7px 30px", boxSizing: "border-box",
                  background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6,
                  color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none",
                }}
              />
            </div>
          </div>
          <AssemblyList job={job} search={search} onSelect={setSelectedAsm} />
        </>
      ) : (
        <PartsTable assembly={selectedAsm} onBack={() => setSelectedAsm(null)} />
      )}
    </div>
  );
}

function JobsTab() {
  const [selectedId, setSelectedId] = useState(JOBS[0].id);
  const selected = JOBS.find(j => j.id === selectedId);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Job list */}
      <div style={{ width: 320, flexShrink: 0, overflowY: "auto", borderRight: `1px solid ${C.border}` }}>
        {JOBS.map(job => (
          <JobCard
            key={job.id}
            job={job}
            selected={job.id === selectedId}
            onClick={() => setSelectedId(job.id)}
          />
        ))}
      </div>

      {/* Detail panel */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {selected
          ? <JobDetail key={selected.id} job={selected} />
          : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.hint, fontSize: 13 }}>Select a job</div>
        }
      </div>
    </div>
  );
}

// ─── Today's Work Tab ─────────────────────────────────────────────────────────

function TodaysWorkTab() {
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {Object.entries(TODAY_WORK).map(([station, batches]) => {
          const phaseKey  = station === "Paint/Finish" ? "Paint" : station;
          const p         = PHASE[phaseKey] || PHASE.Cut;
          const totalPcs  = batches.reduce((s, b) => s + b.qty, 0);

          return (
            <div key={station} style={{ background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              {/* Card header */}
              <div style={{
                padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{station}</span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                  background: p.bg, color: p.color,
                }}>
                  {totalPcs} pcs
                </span>
              </div>

              {/* Batch list */}
              {batches.map(b => (
                <div key={b.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: C.accent, fontWeight: 700 }}>#{b.job}</span>
                        <span style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.jobName}</span>
                      </div>
                      <p style={{ margin: "0 0 3px", fontSize: 12, color: C.text }}>{b.desc}</p>
                      <p style={{ margin: 0, fontSize: 11, fontFamily: "monospace", color: C.hint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Asm: {b.asm} · {b.marks}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: p.color, background: p.bg,
                      padding: "2px 8px", borderRadius: 4, flexShrink: 0,
                    }}>
                      {b.qty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Schedule Tab — Gantt ─────────────────────────────────────────────────────

const WINDOW_DAYS = 77; // 11 weeks

function MilestonePanel({ job, onClose }) {
  const milestones = [
    { label: "Material In",      date: job.matIn       },
    { label: "Fab Start",        date: job.fabStart     },
    { label: "Projected Finish", date: job.projFinish   },
    { label: "Ship to Site",     date: job.shipDate     },
  ];

  const dotColor = iso => {
    const d = daysUntil(iso);
    if (d < 0)   return C.success;
    if (d <= 7)  return C.danger;
    if (d <= 30) return C.warning;
    return C.hint;
  };

  return (
    <div style={{
      width: 272, flexShrink: 0, borderLeft: `1px solid ${C.border}`,
      background: C.surface, display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 10, color: C.hint, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>#{job.id}</p>
          <p style={{ margin: "0 0 1px", fontSize: 14, fontWeight: 700, color: C.text }}>{job.name}</p>
          <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{job.company}</p>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.hint, padding: 2, display: "flex", alignItems: "center" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress or status */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
        {job.notStarted ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: C.accentText }}>Starts {fmt(job.fabStart)}</span>
        ) : job.fabricated ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: C.warning }}>⦿ Fabricated · awaiting ship</span>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: C.muted }}>Progress</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: hColor(job.pct) }}>{job.pct}%</span>
            </div>
            <ProgressBar pct={job.pct} height={5} />
          </>
        )}
      </div>

      {/* Milestone rows */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {milestones.map((m, i) => (
          <div key={i} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor(m.date), flexShrink: 0 }} />
            <div>
              <p style={{ margin: "0 0 1px", fontSize: 11, color: C.muted }}>{m.label}</p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.text, fontFamily: "monospace" }}>{fmtFull(m.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GanttTimeline() {
  const [ganttOffset, setGanttOffset]           = useState(0);
  const [selectedGanttJob, setSelectedGanttJob] = useState(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const windowStartMs = today.getTime() - Math.floor(WINDOW_DAYS / 2) * DAY_MS + ganttOffset * 7 * DAY_MS;
  const windowEndMs   = windowStartMs + WINDOW_DAYS * DAY_MS;

  const posOf = iso => (toMs(iso) - windowStartMs) / (windowEndMs - windowStartMs) * 100;
  const todayPos = (today.getTime() - windowStartMs) / (windowEndMs - windowStartMs) * 100;

  const monthMarkers = useMemo(() => {
    const markers = [];
    const d = new Date(windowStartMs);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    while (d.getTime() < windowEndMs) {
      const p = (d.getTime() - windowStartMs) / (windowEndMs - windowStartMs) * 100;
      if (p >= 1 && p <= 99) {
        markers.push({ pos: p, label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) });
      }
      d.setMonth(d.getMonth() + 1);
    }
    return markers;
  }, [windowStartMs, windowEndMs]);

  const navBtnStyle = {
    background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 5,
    color: C.muted, cursor: "pointer", fontSize: 12, padding: "5px 12px",
    fontFamily: "inherit",
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Navigation bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          <button onClick={() => setGanttOffset(o => o - 4)} style={navBtnStyle}>← Earlier</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: C.muted, fontFamily: "monospace" }}>
              {new Date(windowStartMs).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" – "}
              {new Date(windowEndMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            {ganttOffset !== 0 && (
              <button onClick={() => setGanttOffset(0)} style={{ ...navBtnStyle, color: C.accentText, borderColor: `${C.accent}44` }}>
                Today
              </button>
            )}
          </div>
          <button onClick={() => setGanttOffset(o => o + 4)} style={navBtnStyle}>Later →</button>
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Month header row */}
          <div style={{
            display: "flex", height: 30, borderBottom: `1px solid ${C.border}`,
            position: "sticky", top: 0, background: C.surface, zIndex: 2,
          }}>
            <div style={{ width: 162, flexShrink: 0, borderRight: `1px solid ${C.border}` }} />
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              {monthMarkers.map((m, i) => (
                <div key={i} style={{
                  position: "absolute", left: `${m.pos}%`, transform: "translateX(-50%)",
                  fontSize: 10, fontWeight: 600, color: C.hint, textTransform: "uppercase",
                  letterSpacing: "0.08em", top: 8, pointerEvents: "none",
                }}>
                  {m.label}
                </div>
              ))}
              {/* Today hairline in header */}
              {todayPos >= 0 && todayPos <= 100 && (
                <div style={{
                  position: "absolute", left: `${todayPos}%`, top: 0, height: "100%",
                  width: 1, background: `${C.accent}50`,
                }} />
              )}
            </div>
          </div>

          {/* Job rows */}
          {JOBS.map(job => {
            const startP  = posOf(job.fabStart);
            const endP    = posOf(job.projFinish);
            const shipP   = posOf(job.shipDate);
            const barVisible  = endP > 0 && startP < 100;
            const shipVisible = shipP >= 0 && shipP <= 100;
            const isSelected  = selectedGanttJob?.id === job.id;
            const barLeft     = Math.max(0, Math.min(100, startP));
            const barRight    = Math.max(0, Math.min(100, 100 - endP));

            return (
              <div
                key={job.id}
                onClick={() => setSelectedGanttJob(isSelected ? null : job)}
                style={{
                  display: "flex", alignItems: "center", height: 44,
                  borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                  background: isSelected ? C.surface2 : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.surface; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Label */}
                <div style={{ width: 162, flexShrink: 0, padding: "0 12px 0 16px", borderRight: `1px solid ${C.border}`, overflow: "hidden" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: C.accent, fontWeight: 700, lineHeight: 1.3 }}>#{job.id}</div>
                  <div style={{ fontSize: 11, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>{job.name}</div>
                </div>

                {/* Bar track */}
                <div style={{ flex: 1, position: "relative", height: "100%", overflow: "hidden" }}>
                  {/* Today line */}
                  {todayPos >= 0 && todayPos <= 100 && (
                    <div style={{
                      position: "absolute", left: `${todayPos}%`, top: 0, height: "100%",
                      width: 1, background: `${C.accent}40`, zIndex: 1,
                    }} />
                  )}

                  {/* Job bar */}
                  {barVisible && (
                    <div style={{
                      position: "absolute",
                      left: `${barLeft}%`,
                      right: `${barRight}%`,
                      top: "28%", height: "44%",
                      background: hColor(job.pct),
                      borderRadius: 3,
                      opacity: job.notStarted ? 0.35 : 0.70,
                      zIndex: 0,
                    }} />
                  )}

                  {/* Ship date diamond */}
                  {shipVisible && (
                    <div style={{
                      position: "absolute",
                      left: `${shipP}%`, top: "50%",
                      width: 9, height: 9,
                      background: hColor(job.pct),
                      transform: "translate(-50%, -50%) rotate(45deg)",
                      zIndex: 2,
                      border: `1px solid ${C.bg}`,
                    }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestone side panel */}
      {selectedGanttJob && (
        <MilestonePanel job={selectedGanttJob} onClose={() => setSelectedGanttJob(null)} />
      )}
    </div>
  );
}

// ─── Schedule Tab — Shop Loading ──────────────────────────────────────────────

function ShopLoadingTab() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentWeekIdx = SHOP_WEEKS.findIndex(w => {
    const s = new Date(w.start);
    const e = new Date(s.getTime() + 7 * DAY_MS);
    return today >= s && today < e;
  });
  const cw = SHOP_WEEKS[currentWeekIdx >= 0 ? currentWeekIdx : 0];

  const openWindows = SHOP_WEEKS.filter(w => w.comm < w.cap * 0.70);
  const utilPct     = Math.round(cw.comm / cw.cap * 100);
  const utilColor   = cw.comm > cw.cap ? C.danger : cw.comm < cw.cap * 0.6 ? C.success : C.accent;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      {/* Stat tiles */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Shop Capacity This Week", value: `${cw.cap} hrs`, sub: cw.label, valueColor: C.text },
          { label: "Committed This Week",     value: `${cw.comm} hrs`, sub: `${utilPct}% utilized`, valueColor: utilColor },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 18px" }}>
            <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: C.hint }}>
              {s.label}
            </p>
            <p style={{ margin: "0 0 3px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: s.valueColor }}>
              {s.value}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>11-Week Shop Load</span>
          <span style={{ fontSize: 11, color: C.hint, marginLeft: 8 }}>committed / capacity (hrs)</span>
        </div>
        {SHOP_WEEKS.map((w, i) => {
          const isCurrent = currentWeekIdx === i;
          const fillPct   = Math.min(w.comm / w.cap * 100, 100);
          const overload  = w.comm > w.cap;
          const barColor  = overload ? C.danger : w.comm < w.cap * 0.6 ? C.success : C.accent;

          return (
            <div key={i} style={{
              padding: "9px 16px",
              borderBottom: i < SHOP_WEEKS.length - 1 ? `1px solid ${C.border}` : "none",
              background: isCurrent ? C.surface2 : "transparent",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 108, fontSize: 11, flexShrink: 0, color: isCurrent ? C.text : C.muted, fontWeight: isCurrent ? 600 : 400 }}>
                  {w.label}
                </span>
                <div style={{ flex: 1, height: 10, background: C.bg, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${fillPct}%`, background: barColor, borderRadius: 2 }} />
                  {overload && (
                    <div style={{ height: "100%", width: `${Math.min((w.comm - w.cap) / w.cap * 100, 5)}%`, background: C.dangerDim, borderRadius: 2 }} />
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, fontSize: 11 }}>
                  <span style={{ fontFamily: "monospace", color: overload ? C.danger : C.text, fontWeight: 600, minWidth: 28, textAlign: "right" }}>{w.comm}</span>
                  <span style={{ color: C.border }}>/</span>
                  <span style={{ fontFamily: "monospace", color: C.hint }}>{w.cap}</span>
                  {overload && (
                    <span style={{ fontSize: 10, color: C.danger, fontWeight: 700, marginLeft: 4 }}>OVER</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Open capacity windows */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Open Capacity Windows</span>
          <span style={{ fontSize: 11, color: C.hint }}>weeks with &lt; 70% committed — available for new work</span>
        </div>
        {openWindows.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: C.hint }}>No open windows in this range</div>
        ) : (
          openWindows.map((w, i) => (
            <div key={i} style={{
              padding: "11px 16px",
              borderBottom: i < openWindows.length - 1 ? `1px solid ${C.border}` : "none",
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{w.label}</span>
              <span style={{ fontSize: 11, color: C.hint }}>{Math.round(w.comm / w.cap * 100)}% committed</span>
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: C.success, fontFamily: "monospace" }}>
                +{w.cap - w.comm} hrs available
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

function ScheduleTab() {
  const [schedTab, setSchedTab] = useState("timeline");

  const subTabStyle = active => ({
    padding: "9px 14px", border: "none", background: "none", cursor: "pointer",
    fontSize: 12, fontFamily: "inherit", fontWeight: active ? 600 : 400,
    color: active ? C.text : C.muted,
    borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
    marginBottom: -1,
    transition: "color 0.12s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Sub-tab bar */}
      <div style={{ display: "flex", padding: "0 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={() => setSchedTab("timeline")} style={subTabStyle(schedTab === "timeline")}>Timeline</button>
        <button onClick={() => setSchedTab("loading")}  style={subTabStyle(schedTab === "loading")}>Shop Loading</button>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {schedTab === "timeline" ? <GanttTimeline /> : <ShopLoadingTab />}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function FabricationApp({ user }) {
  const [activeTab, setActiveTab] = useState("jobs");

  const tabStyle = active => ({
    padding: "8px 16px", border: "none", background: "none", cursor: "pointer",
    fontSize: 13, fontFamily: "inherit",
    fontWeight: active ? 600 : 400,
    color: active ? C.text : C.muted,
    borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
    marginBottom: -1,
    transition: "color 0.12s, border-color 0.12s",
  });

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
      background: C.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
    }}>
      {/* Page header + top tab bar */}
      <div style={{ padding: "14px 24px 0", flexShrink: 0, borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.hint }}>
            Fabrication &amp; Shipping
          </p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>
            Shop Status
          </p>
        </div>
        <div style={{ display: "flex" }}>
          <button onClick={() => setActiveTab("jobs")}     style={tabStyle(activeTab === "jobs")}>Jobs</button>
          <button onClick={() => setActiveTab("today")}    style={tabStyle(activeTab === "today")}>Today's Work</button>
          <button onClick={() => setActiveTab("schedule")} style={tabStyle(activeTab === "schedule")}>Schedule</button>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "jobs"     && <JobsTab />}
        {activeTab === "today"    && <TodaysWorkTab />}
        {activeTab === "schedule" && <ScheduleTab />}
      </div>
    </div>
  );
}
