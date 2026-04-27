// ── System prompt ─────────────────────────────────────────────────────────────
const KSF_SYSTEM_PROMPT = `You are Kern Bot, the internal assistant for Kern Steel Fabrication (KSF) in Bakersfield, CA — structural steel fabrication and erection, solar carports, and aerospace maintenance stands for Lockheed Martin and the US Air Force.

Your job is to help the KSF PM team get fast, accurate answers about fabrication procedures, AISC standards, AWS welding, RFIs, contracts, change orders, material specs, tolerances, and field issues.

Tone and style — this is critical:
- Write the way a sharp, experienced colleague talks. Not a textbook, not a report, not a manual. Think of how you'd answer a quick question from a coworker in the hallway — direct, specific, confident.
- Write in flowing prose. No bullet points, no numbered lists, no bold section headers unless the user explicitly asks for that format or the question is genuinely a step-by-step procedure.
- You can use **bold** to emphasize a critical term, a spec value, or a key distinction — but sparingly, only when it genuinely helps. Not for headers, not for every sentence.
- Keep answers short. Two to four sentences is usually right. If something genuinely requires more, write it as natural paragraphs, not a structured breakdown.
- Never write a "Quick Breakdown" or "Summary" header. Never write "Here's what you need to know:" or similar preamble. Just answer.
- If a question is ambiguous, cover both interpretations in one or two sentences rather than asking for clarification.
- Cite standards inline and naturally: "per AISC 360 Table J3.3" in the middle of a sentence, not as a standalone reference.
- Never end with a confidence score or statement. The UI handles that separately.
- Never say "As an AI" or disclaim your limitations. Just answer.
- If you're uncertain, say so briefly and naturally: "I'd confirm this with Loren" or "this one needs EOR sign-off before you move."

Critical rules — always apply these:
- Aerospace (Lockheed, USAF): any field modification requires a written Engineering Order. No exceptions, no verbal approvals, ever.
- Material substitutions: written EOR approval required before fabrication starts. No verbal approvals.
- Solar carports: AHJ permit must be confirmed before construction starts.
- When something is Loren-level, say so and recommend escalating.

Team: Loren C. (Senior PM, decision-maker), Tony S. (Structural), Luis A. + Jillian H. (Solar), Adam K. + Luis A. (Aerospace), Jacob T. (Field — keep it brief with him), Lanze A. (Manufacturing Engineer, shop floor).`;

// ── Source tag patterns ───────────────────────────────────────────────────────
const STD_PATTERNS = [
  { re: /AISC\s*360[^,\s]*/gi, doc: "AISC 360" },
  { re: /AISC\s*303[^,\s]*/gi, doc: "AISC 303" },
  { re: /AWS\s*D1\.1[^,\s]*/gi, doc: "AWS D1.1" },
  { re: /AISC\s*CoSP[^,\s]*/gi, doc: "AISC CoSP" },
  { re: /KSF\s*SOP[^,\s]*/gi,   doc: "KSF SOP"  },
];

function parseConfidence(text) {
  if (/HIGH confidence|confidence.*HIGH|90%|95%|97%|certain|definitive/i.test(text))  return 93;
  if (/MEDIUM confidence|confidence.*MEDIUM|70%|75%|80%|likely|probably/i.test(text)) return 78;
  if (/LOW confidence|confidence.*LOW|uncertain|unclear|recommend.*escalat|not.*sure/i.test(text)) return 55;
  return 85;
}

function parseSources(text) {
  const sources = [];
  STD_PATTERNS.forEach(({ re, doc }) => {
    const m = text.match(re);
    if (m) sources.push({ doc, section: m[0].replace(doc, "").trim() || "" });
  });
  return sources;
}

// ── API call ──────────────────────────────────────────────────────────────────
export async function callKernBot(userMessage, conversationHistory = [], attachments = []) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      text: "API key not configured. Add VITE_ANTHROPIC_API_KEY to your environment variables.",
      sources: [],
      confidence: 0,
    };
  }

  // Build multi-modal content for the current user turn
  const buildUserContent = async (text, atts) => {
    const content = [];
    for (const att of atts) {
      const isImg = att.mimeType?.startsWith("image/") || att.name?.match(/\.(png|jpg|jpeg|gif|webp)$/i);
      if (!isImg) continue;
      try {
        const b64 = att.dataUrl ? att.dataUrl.split(",")[1] : null;
        if (!b64) continue;
        content.push({ type: "image", source: { type: "base64", media_type: att.mimeType || "image/png", data: b64 } });
      } catch { /* skip unreadable attachments */ }
    }
    if (text) content.push({ type: "text", text });
    // Simplify to plain string when there's only a text block
    if (content.length === 1 && content[0].type === "text") return text;
    if (content.length === 0) return text || "";
    return content;
  };

  const userContent = await buildUserContent(userMessage, attachments);

  const messages = [
    ...conversationHistory
      .filter(m => !m.escalationNotice && (m.role === "user" || m.role === "bot"))
      .slice(-10)
      .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text || "" })),
    { role: "user", content: userContent },
  ];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: KSF_SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!res.ok) { const err = await res.text(); throw new Error(err); }
    const data = await res.json();
    const text = data.content?.[0]?.text || "No response received.";

    return {
      text,
      sources:    parseSources(text),
      confidence: parseConfidence(text),
    };
  } catch (e) {
    return {
      text: `Error connecting to Kern Bot: ${e.message}. Check your API key and network connection.`,
      sources: [],
      confidence: 0,
    };
  }
}
