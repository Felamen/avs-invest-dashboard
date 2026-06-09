import OpenAI from "openai";
import { getProperties, getPipeline, refreshAll } from "./notion.js";

const MODEL =
  process.env.AI_MODEL ||
  (process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : process.env.OPENAI_MODEL || "gpt-4o");

// Vision-capable model (Groq) — used automatically when an image is attached.
const VISION_MODEL = process.env.AI_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

// Extract text from a base64 data-URL PDF. Best-effort — never throws.
async function extractPdfText(dataUrl) {
  try {
    const base64 = String(dataUrl).split(",")[1] || "";
    const buf = Buffer.from(base64, "base64");
    // Import the inner lib to avoid pdf-parse's debug file-read on import.
    const { default: pdf } = await import("pdf-parse/lib/pdf-parse.js");
    const data = await pdf(buf);
    return (data.text || "").slice(0, 12000);
  } catch (e) {
    return `(couldn't read the PDF: ${e.message})`;
  }
}

// Free web search via DuckDuckGo's HTML endpoint (no API key).
function stripTags(s) {
  return (s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .trim();
}
function decodeDdg(href) {
  try {
    const u = new URL(href, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : href.replace(/^\/\//, "https://");
  } catch {
    return href;
  }
}
// Friendly "you hit the limit" message (timer + how to upgrade + speak to owner).
function sendLimitMessage(msg, callbacks) {
  const t = (String(msg).match(/try again in ([0-9hms.]+)/i) || [])[1];
  const upgradeUrl = (String(msg).match(/https?:\/\/[^\s"]+/) || [])[0] || "the AI provider's website";
  callbacks.onText(
    `⏳ We've reached the current free AI limit${t ? ` — it resets in about ${prettyTime(t)}` : ""}. ` +
      `Pop back in a bit and I'll be ready again.\n\n` +
      `Need it sooner? You can upgrade the plan at ${upgradeUrl} — sign in with the same work email you use here. ` +
      `And anything that needs wiring or setup, have a quick word with **Craig** (the dashboard owner).`,
  );
}

// Format a Groq-style "22m58.944s" into a human "23 minutes".
function prettyTime(s) {
  const min = (String(s).match(/(\d+)m/) || [])[1];
  const sec = (String(s).match(/(\d+)(?:\.\d+)?s/) || [])[1];
  if (min) return `${parseInt(min, 10) + (sec && parseInt(sec, 10) > 0 ? 1 : 0)} minutes`;
  if (sec) return `${sec} seconds`;
  return s;
}

async function webSearch(query) {
  try {
    const res = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query || ""), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FikermenpikenBot/1.0)" },
    });
    const html = await res.text();
    const results = [];
    const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && results.length < 6) {
      const title = stripTags(m[2]);
      if (title) results.push({ title, url: decodeDdg(m[1]) });
    }
    const snipRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let i = 0, sm;
    while ((sm = snipRe.exec(html)) && i < results.length) {
      results[i].snippet = stripTags(sm[1]).slice(0, 280);
      i++;
    }
    return results.length ? { results } : { results: [], note: "No results found." };
  } catch (e) {
    return { error: "Web search failed: " + e.message };
  }
}

const SYSTEM_PROMPT = `You are **Fikermenpiken** — the AI co-partner inside the AVS Invest dashboard. AVS is a UK property
management and deal-sourcing company owned by Craig Okungbowa, with Nathan Okungbowa as the AVS admin/partner.

WHO YOU ARE (personality — this matters):
- You're warm, sharp, and genuinely on the user's side — like a brilliant business partner who also happens to be
  great company. Talk naturally and conversationally (like ChatGPT), not robotic or formal. Use the person's
  first name occasionally. A little encouragement and dry wit is good; never waffle.
- You *understand the person* and the business. Remember what they're working on within the conversation, anticipate
  the next step, and make their day easier. You're proactive: if you spot something useful (an overdue deal, a better
  angle for an ad), say it.
- You're a doer. Give finished, ready-to-use work — not "here's how you could…". Be concise but complete.

ALWAYS REPLY + BE GENUINELY USEFUL:
- ALWAYS respond with helpful text — never an empty or silent reply. If you used a tool, explain the result plainly.
- Help with ANYTHING the user asks — work AND life: AVS business tasks, but also general questions, writing,
  planning, learning, day-to-day advice. You're their everyday AI (like ChatGPT) who *also* knows the AVS business.
- For anything current, factual, local, price-related, or that you're not certain about — USE the web_search tool
  and base your answer on what it returns. Don't refuse or guess: search.
- NEVER invent facts, prices, news, or the user's own data. Use web_search for the world, and get_properties /
  get_pipeline_deals for their dashboard data. If a tool returns nothing useful, say so honestly.

DOING THINGS FOR THE USER (not just advising):
- **Contacting a landlord/agent**: first use get_pipeline_deals (search by name/address) to pull their phone/email,
  then draft the message AND give a ONE-TAP link so they can send it instantly:
  - WhatsApp: output a link like https://wa.me/<NUMBER>?text=<URL-ENCODED MESSAGE> — the number must be digits only,
    international format (UK 07… becomes 447…, drop +, spaces, leading 0).
  - Email: output mailto:<email>?subject=<...>&body=<URL-ENCODED MESSAGE>.
  These links render as tap-to-send buttons in the chat, so the message is basically sent for them.
- **Ads (Google / Facebook/Meta)**: you can't log into their account for them (security), but do the next best thing:
  (1) DRAFT everything (headlines, descriptions, keywords, targeting, budget); (2) give a DIRECT markdown link to the
  real Ads Manager so they're one click from posting; (3) WALK THEM STEP-BY-STEP through pasting it in and going live;
  (4) offer to keep optimising it (budget, A/B, audiences) as it runs. Real external links (paste the plain URL, NOT
  navigate_to and NOT markdown brackets): Facebook/Meta Ads Manager https://adsmanager.facebook.com · Google Ads https://ads.google.com.
  Never send them to an internal page like /facebook-ads — it doesn't exist. Fully hands-off auto-posting would need
  an API integration — if they want that, say Craig can wire it later; meanwhile you prepare everything and guide them.
- **Documents**: produce the full draft (proposal, letter, contract clause, summary) ready to copy.
- **Reading uploads**: the user can attach images/screenshots, PDFs and files — read them and help (summarise a
  contract, pull figures from a screenshot, etc.).

WHEN SOMETHING NEEDS WIRING / SETUP (be honest, don't pretend):
- The user (Nathan) is NON-TECHNICAL and must NEVER be asked to add an API key, sign up for a developer account,
  paste credentials, install anything, or do any technical setup himself. His ONLY job is to APPROVE tasks in plain
  language. Never hand him a technical to-do.
- If a request needs technical setup — connecting an API key, WhatsApp Business API, auto-posting to Facebook/Google
  Ads, direct email sending, a new integration — do NOT claim it's done or already wired. Instead:
  1) explain in plain, non-technical terms what it would let him do,
  2) say clearly whether it's FREE or PAID (rough cost if paid),
  3) then tell him: "This part needs setting up by the owner — have a quick word with Craig and he'll get it wired
     for you." Craig (the owner) handles ALL the technical side. You advise, draft, and approve-and-do whatever is
     already wired; anything new is routed to Craig, never to Nathan.

LIVE DATA (Notion, via your tools — use them, never guess):
- **Properties**: managed properties (compliance Green/Amber/Red, Gas/EICR/HMO expiry, Management Model, Status).
- **CE Pipeline**: 45+ sourcing deals (landlord, stage, confidence, next action, source like FB Marketplace/OpenRent).

YOU HELP THE TEAM (especially Nathan) WITH DAILY WORK:
- **Google Ads**: draft full campaigns (copy/headlines/descriptions, keywords, negative keywords, audience, budget),
  link them straight to https://ads.google.com (markdown link), and walk them through launching + optimising it.
- **Facebook / Meta Ads**: draft creative copy, targeting, A/B variations, lead-form questions; link them straight to
  https://adsmanager.facebook.com (markdown link) and guide them through posting it and refining it as it runs.
- **Deal outreach**: draft persuasive but professional messages to landlords/agents (WhatsApp/SMS/email),
  follow-ups, and chase overdue pipeline deals (pull them with the tools first).
- **Promotions & marketing**: offers, social captions, listing blurbs, landing-page copy.
- **Documents**: draft contracts/letters/proposals, summarise uploaded docs (EPCs, contracts, screenshots).
- **Research**: market/area research, competitor checks, supplier options — be concrete and cite what to verify.
- **Property/pipeline questions**: answer from live data; flag overdue actions or amber/red compliance up front.

LINKS — EVERY link you give MUST actually work (a broken link looks unprofessional):
- INTERNAL dashboard pages: ONLY '/', '/properties', '/pipeline', '/map', '/settings' (via navigate_to). Never invent
  an internal path (no '/facebook-ads', '/google-ads', '/leads'…) — those 404.
- EXTERNAL services: paste the service's REAL URL as plain text (Linkify makes it a clickable button that opens in a
  new tab). Use known-good URLs, e.g. Facebook Ads https://adsmanager.facebook.com · Google Ads https://ads.google.com ·
  Rightmove https://www.rightmove.co.uk · OpenRent https://www.openrent.com · Companies House
  https://find-and-update.company-information.service.gov.uk · Gmail https://mail.google.com.
- If you don't know the exact deep URL, link the service's main login/home page — NEVER guess a deep path. When in
  doubt, web_search for the correct official URL first.

STYLE: concise, action-oriented, ready-to-use drafts (not vague advice). Use the tools for live data. When a
task is best done on a dashboard page, use navigate_to to surface a clickable link. Be the genius assistant the
team relies on — quick, smart, and practical.`;

const tools = [
  {
    type: "function",
    function: {
      name: "get_properties",
      description:
        "Get all managed properties from the Notion Properties database. Returns address, status, management model, compliance status (Green/Amber/Red), monthly income, cert expiry dates, and Place (lat/lng + formatted address). Empty rows are filtered out.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_deals",
      description:
        "Get sourcing pipeline deals from the Notion CE Pipeline database. Supports filtering. Returns deal ID, landlord, property address, source (FB Marketplace, OpenRent, etc.), pipeline stage, confidence, next action, and dates.",
      parameters: {
        type: "object",
        properties: {
          stage: {
            type: "string",
            description:
              "Filter by Core Stage (e.g. 'Contacted', 'Viewing / Call Held', 'Negotiating', 'Parked', 'Dropped').",
          },
          confidence: {
            type: "string",
            enum: ["High", "Medium", "Low"],
            description: "Filter by Confidence Level.",
          },
          overdue_only: {
            type: "boolean",
            description:
              "If true, return only deals with a Next Action Date in the past (and not marked Live).",
          },
          search: {
            type: "string",
            description:
              "Optional fuzzy match against deal ID, address, landlord name, or source.",
          },
          limit: {
            type: "number",
            description: "Max results to return. Default 20. Use 100 for 'all'.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "refresh_notion_cache",
      description:
        "Force a refresh of Notion data. Use when the user says they just changed something in Notion and want to see it.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to",
      description:
        "Surface a clickable link to an INTERNAL dashboard page only. ONLY use the real paths listed below — NEVER invent a path (there is no '/facebook-ads', '/google-ads', etc.) and NEVER use this for external websites (Facebook, Google Ads, Rightmove…). For any external site, write a normal markdown link to the real URL instead of calling this tool. The link does NOT auto-navigate; the user clicks it.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "The internal dashboard path. MUST be one of exactly: '/' (dashboard), '/properties', '/pipeline', '/map', '/settings'. No other paths exist.",
          },
          query: {
            type: "object",
            description:
              "Optional query params. Examples: {compliance: 'Red'} for /properties, {confidence: 'High', overdue: '1'} for /pipeline.",
            additionalProperties: { type: "string" },
          },
          label: {
            type: "string",
            description: "Short text for the link button (e.g. 'See overdue deals', 'Open Map').",
          },
        },
        required: ["path", "label"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the WEB for current/up-to-date information — news, facts, market or area data, prices, how-tos, anything you don't already know or that could be recent. Use this whenever the answer isn't in the user's own dashboard data and you're not 100% sure. Returns top results with titles, snippets and links.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The web search query." },
        },
        required: ["query"],
      },
    },
  },
];

async function executeTool(name, input) {
  if (name === "get_properties") {
    const r = await getProperties();
    const filled = r.data.filter((p) => (p.address || "").trim());
    return { count: filled.length, properties: filled };
  }
  if (name === "get_pipeline_deals") {
    const r = await getPipeline();
    let deals = r.data;
    if (input.stage) deals = deals.filter((d) => d.coreStage === input.stage);
    if (input.confidence) deals = deals.filter((d) => d.confidence === input.confidence);
    if (input.overdue_only) {
      const now = Date.now();
      deals = deals.filter(
        (d) => d.nextActionDate && !d.isLive && new Date(d.nextActionDate).getTime() < now
      );
    }
    if (input.search) {
      const q = input.search.toLowerCase();
      deals = deals.filter(
        (d) =>
          (d.dealId || "").toLowerCase().includes(q) ||
          (d.propertyAddress || "").toLowerCase().includes(q) ||
          (d.landlord || "").toLowerCase().includes(q) ||
          (d.source || "").toLowerCase().includes(q)
      );
    }
    const limit = Math.min(input.limit || 12, 30);
    // Return a COMPACT view — full deal objects (notes, coords, URLs) bloat the
    // context and break the follow-up summary call. Keep notes (phone numbers
    // live there) but trimmed.
    const slim = deals.slice(0, limit).map((d) => ({
      dealId: d.dealId,
      landlord: d.landlord,
      address: d.propertyAddress,
      stage: d.coreStage,
      confidence: d.confidence,
      direction: d.direction,
      nextAction: d.nextAction,
      nextActionDate: d.nextActionDate,
      source: d.source,
      isLive: d.isLive,
      notes: (d.notes || "").slice(0, 220),
    }));
    return { total_matching: deals.length, shown: slim.length, deals: slim };
  }
  if (name === "refresh_notion_cache") {
    refreshAll();
    return { ok: true, message: "Cache invalidated; next read will refetch from Notion." };
  }
  if (name === "navigate_to") {
    return {
      ok: true,
      navigation: {
        path: input.path,
        query: input.query || {},
        label: input.label,
      },
    };
  }
  if (name === "web_search") {
    return await webSearch(input.query);
  }
  return { error: `Unknown tool: ${name}` };
}

// Ordered list of providers to try (auto-failover). Cerebras first (high free
// limits, strong tools), then Groq, then Gemini, then OpenAI. Images need a
// vision model → Groq Llama 4 Scout or Gemini. All are OpenAI-compatible.
function providerChain(useVision) {
  const cerebras = process.env.CEREBRAS_API_KEY;
  const groq = process.env.GROQ_API_KEY;
  const groq2 = process.env.GROQ_API_KEY_2; // spare Groq key → 2× free daily capacity
  const gemini = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai/";
  const GROQ_BASE = "https://api.groq.com/openai/v1";
  const chain = [];

  if (useVision) {
    if (groq) chain.push({ name: "groq", client: new OpenAI({ apiKey: groq, baseURL: GROQ_BASE }), model: VISION_MODEL });
    if (groq2) chain.push({ name: "groq-2", client: new OpenAI({ apiKey: groq2, baseURL: GROQ_BASE }), model: VISION_MODEL });
    if (gemini) chain.push({ name: "gemini", client: new OpenAI({ apiKey: gemini, baseURL: GEMINI_BASE }), model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
    return chain;
  }

  // Groq's llama-3.3-70b is the most reliable at tool-calling here; a 2nd Groq
  // key, Cerebras + Gemini are failovers (used when the main Groq is rate-limited).
  if (groq) chain.push({ name: "groq", client: new OpenAI({ apiKey: groq, baseURL: GROQ_BASE }), model: MODEL });
  if (groq2) chain.push({ name: "groq-2", client: new OpenAI({ apiKey: groq2, baseURL: GROQ_BASE }), model: MODEL });
  if (cerebras) chain.push({ name: "cerebras", client: new OpenAI({ apiKey: cerebras, baseURL: "https://api.cerebras.ai/v1" }), model: process.env.CEREBRAS_MODEL || "gpt-oss-120b" });
  if (gemini) chain.push({ name: "gemini", client: new OpenAI({ apiKey: gemini, baseURL: GEMINI_BASE }), model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
  if (openai) chain.push({ name: "openai", client: new OpenAI({ apiKey: openai }), model: process.env.OPENAI_MODEL || "gpt-4o" });
  return chain;
}

const isRateLimit = (m) => /429|rate.?limit|quota|too many requests|tokens per day|insufficient|capacity|overloaded/i.test(m || "");

/**
 * Run a chat turn with streaming. Calls callbacks as events arrive.
 * `messages` is the existing conversation [{role, content}, ...].
 */
export async function streamChat({ messages, attachments = [], callbacks }) {
  // Prepend the system message.
  let conversation = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  // ── Attachments: images → vision model; PDFs/text files → injected as context.
  let useVision = false;
  if (Array.isArray(attachments) && attachments.length) {
    const imageParts = [];
    let extracted = "";
    for (const a of attachments) {
      if (a?.kind === "image" && a.dataUrl) {
        imageParts.push({ type: "image_url", image_url: { url: a.dataUrl } });
        useVision = true;
      } else if (a?.kind === "text" && a.text) {
        extracted += `\n\n--- Attached file: ${a.name || "file"} ---\n${String(a.text).slice(0, 12000)}`;
      } else if (a?.kind === "pdf" && a.dataUrl) {
        extracted += `\n\n--- Attached PDF: ${a.name || "document.pdf"} ---\n${await extractPdfText(a.dataUrl)}`;
      }
    }
    // Find the last user message and enrich it.
    for (let i = conversation.length - 1; i >= 0; i--) {
      if (conversation[i].role === "user") {
        let text = (conversation[i].content || "") + extracted;
        conversation[i].content = imageParts.length
          ? [{ type: "text", text: text || "(see attached image)" }, ...imageParts]
          : text;
        break;
      }
    }
  }

  const chain = providerChain(useVision);
  if (!chain.length) {
    callbacks.onError("No AI key set on the server (CEREBRAS_API_KEY / GROQ_API_KEY / GEMINI_API_KEY).");
    return null;
  }
  let providerIdx = 0;

  let sentAnyText = false;
  for (let iteration = 0; iteration < 8; iteration++) {
    let assistantText = "";
    let toolCalls = [];

    // Run one model turn (streamed), auto-failing-over to the next provider on
    // ANY error that happens before we've shown the user any text.
    inner: for (;;) {
      const p = chain[providerIdx];
      assistantText = "";
      const acc = new Map();
      try {
        const stream = await p.client.chat.completions.create({
          model: p.model,
          messages: conversation,
          ...(useVision ? {} : { tools }),
          stream: true,
        });
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;
          if (delta.content) {
            assistantText += delta.content;
            sentAnyText = true;
            callbacks.onText(delta.content);
          }
          if (delta.tool_calls) {
            for (const tcDelta of delta.tool_calls) {
              const idx = tcDelta.index ?? 0;
              let tc = acc.get(idx);
              if (!tc) {
                tc = { id: "", name: "", arguments: "" };
                acc.set(idx, tc);
              }
              if (tcDelta.id) tc.id = tcDelta.id;
              if (tcDelta.function?.name) {
                tc.name = tcDelta.function.name;
                callbacks.onToolUseStart?.({ id: tc.id || `idx-${idx}`, name: tc.name });
              }
              if (tcDelta.function?.arguments) tc.arguments += tcDelta.function.arguments;
            }
          }
        }
        // Stream consumed OK. Guarantee stable, non-empty tool-call ids.
        toolCalls = Array.from(acc.entries()).map(([idx, tc]) => ({ ...tc, id: tc.id || `call_${idx}` }));
        break inner;
      } catch (err) {
        const m = err?.message || String(err);
        // Fail over to the next provider (rate limit, bad key, tool-call error, outage).
        if (!sentAnyText && providerIdx < chain.length - 1) {
          providerIdx++;
          continue inner;
        }
        if (isRateLimit(m)) {
          if (!sentAnyText) sendLimitMessage(m, callbacks);
          sentAnyText = true;
          return null;
        }
        callbacks.onError(m);
        return null;
      }
    }

    if (toolCalls.length === 0) {
      conversation.push({ role: "assistant", content: assistantText });
      break;
    }

    // Echo the assistant tool-call turn, run the tools, feed results back.
    conversation.push({
      role: "assistant",
      content: assistantText || null,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: tc.arguments || "{}" },
      })),
    });

    for (const tc of toolCalls) {
      let input = {};
      try {
        input = tc.arguments ? JSON.parse(tc.arguments) : {};
      } catch {
        input = {};
      }
      try {
        const result = await executeTool(tc.name, input);
        callbacks.onToolResult?.({ id: tc.id, name: tc.name, input, result });
        conversation.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      } catch (err) {
        callbacks.onToolResult?.({ id: tc.id, name: tc.name, input, error: err.message });
        conversation.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ error: err.message }) });
      }
    }
  }

  // Safety net: never leave the user with an empty reply.
  if (!sentAnyText) {
    callbacks.onText(
      "Sorry — I didn't manage to put that into words. Could you rephrase or give me a little more detail?",
    );
  }
  return null;
}
