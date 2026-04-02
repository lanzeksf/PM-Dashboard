// ── KSF COMMAND CENTER — DATA ──────────────────────────────────────────────
// All static seed data lives here. When a database is connected, this file
// gets replaced by API calls. Until then, data resets on page refresh.

const D = {

  users: [
    { id: "loren",   name: "Loren C.",   ini: "LC", role: "Admin",            desc: "Admin · All verticals",  color: "#533AB7", vert: null },
    { id: "tony",    name: "Tony S.",    ini: "TS", role: "Structural Coord.", desc: "Structural Coord.",       color: "#185FA5", vert: "structural" },
    { id: "luis",    name: "Luis A.",    ini: "LA", role: "Solar APM",         desc: "Solar APM",              color: "#854F0B", vert: "solar" },
    { id: "jillian", name: "Jillian H.", ini: "JH", role: "Solar Coord.",      desc: "Solar Coord.",           color: "#854F0B", vert: "solar" },
    { id: "adam",    name: "Adam K.",    ini: "AK", role: "Aerospace Eng.",    desc: "Aerospace Eng.",         color: "#185FA5", vert: "aerospace" },
    { id: "jake",    name: "Jacob T.",   ini: "JT", role: "Field Coord.",      desc: "Field Coord. · All",     color: "#3B6D11", vert: null },
    { id: "lanze",   name: "Lanze A.",   ini: "LA", role: "Efficiency & Ops",  desc: "Efficiency & Ops",       color: "#533AB7", vert: null },
  ],

  projects: [
    { id: 1, name: "Fresno Civic Center",      vert: "structural", risk: "High",   phase: "Detailing",      rfi: 3, co: 2 },
    { id: 2, name: "Bakersfield Admin Bldg",   vert: "structural", risk: "Medium", phase: "Fabrication",    rfi: 1, co: 1 },
    { id: 3, name: "Clovis School District",   vert: "structural", risk: "Low",    phase: "Erection",       rfi: 0, co: 0 },
    { id: 4, name: "Kern County Carports Ph2", vert: "solar",      risk: "High",   phase: "Permit Pending", rfi: 2, co: 3 },
    { id: 5, name: "Ridgecrest Solar Canopy",  vert: "solar",      risk: "Medium", phase: "Fabrication",    rfi: 1, co: 0 },
    { id: 6, name: "USAF Hangar Stand #7",     vert: "aerospace",  risk: "High",   phase: "EO Review",      rfi: 0, co: 1 },
    { id: 7, name: "Lockheed Maint. Stand B3", vert: "aerospace",  risk: "Medium", phase: "Fabrication",    rfi: 2, co: 0 },
  ],

  field: [
    { id: 1, proj: "Fresno Civic Center",      issue: "Anchor bolt misalignment — Col. B4",         urg: "High",   vert: "structural" },
    { id: 2, proj: "Kern County Carports Ph2", issue: "Footing pour blocked — no permit clearance", urg: "High",   vert: "solar" },
    { id: 3, proj: "USAF Hangar Stand #7",     issue: "Weld inspection hold — AWS D1.1 NCR",        urg: "High",   vert: "aerospace" },
    { id: 4, proj: "Bakersfield Admin Bldg",   issue: "Missing connection plates — needs expedite", urg: "Medium", vert: "structural" },
  ],

  owner: [
    { id: 1, proj: "Fresno Civic Center",      item: "Approved shop drawings Rev C",  days: 7, status: "Overdue" },
    { id: 2, proj: "Kern County Carports Ph2", item: "AHJ permit confirmation",        days: 9, status: "Overdue" },
    { id: 3, proj: "Lockheed Maint. Stand B3", item: "Customer EO sign-off",           days: 3, status: "Pending" },
  ],

  rfis: [
    { id: 1, proj: "Fresno Civic Center",      ref: "DET-RFI-041", issue: "Col splice elevation conflict",    status: "Pending Loren", vert: "structural" },
    { id: 2, proj: "Bakersfield Admin Bldg",   ref: "DET-RFI-039", issue: "Embed plate orientation missing", status: "Pending Loren", vert: "structural" },
    { id: 3, proj: "Kern County Carports Ph2", ref: "DET-RFI-022", issue: "Purlin spacing per AHJ",          status: "Logged",        vert: "solar" },
  ],

  tips: {
    loren:   "3 RFIs need your review before EOD. Fresno Civic Center anchor bolt issue is holding erection — get shop drawings approved today.",
    tony:    "DET-RFI-041 on Fresno is a splice elevation conflict — flag the EOR now before it hits the field.",
    luis:    "Kern County Carports Ph2 permit is 9 days overdue on client response. Send a follow-up notice today to protect your schedule.",
    jillian: "Ridgecrest Solar Canopy submittals are in review — confirm AHJ receipt before end of week.",
    adam:    "USAF Stand #7 has an open NCR under AWS D1.1. Any field modification requires a written EO — do not proceed without it.",
    jake:    "3 high-urgency field issues open. Fresno anchor bolts, Kern carport permit hold, and USAF weld NCR. Notify each PM now.",
    lanze:   "RFI pipeline aging on Structural — 2 items >3 days with Loren. Kern carport permit bottleneck is the top schedule risk this week.",
  },

  focus: {
    loren: [
      { c: "#e24b4a", t: "Approve DET-RFI-041 and DET-RFI-039",          s: "Fresno + Bakersfield — holding detailer response" },
      { c: "#e24b4a", t: "Kern County Carports Ph2 — permit overdue 9d",  s: "Client has not confirmed AHJ clearance" },
      { c: "#e24b4a", t: "USAF Hangar Stand #7 — EO required",            s: "Field weld NCR cannot proceed without Engineering Order" },
      { c: "#ba7517", t: "Review 3 owner-pending items flagged red",       s: "Fresno shop drawings + carport permit + Lockheed EO" },
    ],
    tony: [
      { c: "#e24b4a", t: "DET-RFI-041: Splice elevation conflict — Fresno", s: "Pending Loren review · logged today" },
      { c: "#e24b4a", t: "Anchor bolt misalignment at Col. B4",             s: "Field hold — coordinate with Jake" },
      { c: "#ba7517", t: "Bakersfield Admin Bldg — connection plates",      s: "Shop expedite needed · field flagged" },
    ],
    solar: [
      { c: "#e24b4a", t: "Kern County Carports Ph2 — permit still pending", s: "AHJ confirmation 9d overdue from client" },
      { c: "#ba7517", t: "Ridgecrest Solar — submittals in review",          s: "Confirm AHJ receipt this week" },
    ],
    adam: [
      { c: "#e24b4a", t: "USAF Stand #7 — Weld NCR open (AWS D1.1)",       s: "Field hold · EO required for any modification" },
      { c: "#ba7517", t: "Lockheed B3 — customer EO sign-off pending",      s: "3 days open · follow up today" },
    ],
    jake: [
      { c: "#e24b4a", t: "Fresno Civic — anchor bolt misalignment B4",      s: "Notify Tony S. · structural hold" },
      { c: "#e24b4a", t: "Kern Carports Ph2 — footing pour blocked",        s: "Notify Luis A. · no permit clearance" },
      { c: "#e24b4a", t: "USAF Stand #7 — weld inspection hold",            s: "Notify Adam K. · AWS D1.1 NCR" },
    ],
    lanze: [
      { c: "#e24b4a", t: "RFI pipeline: 2 items >3 days aging",             s: "DET-RFI-041 + DET-RFI-039 awaiting Loren" },
      { c: "#e24b4a", t: "Kern carport permit — top schedule risk",         s: "9 days no response · notify Loren" },
      { c: "#ba7517", t: "3 owner-pending items flagged red",               s: "Run aging report for Loren review" },
    ],
  },

};