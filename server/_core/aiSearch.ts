/**
 * AI-powered search: expands natural language or partial queries into
 * search keywords (Korean + English) for the existing search engine.
 * Uses GEMINI_API_KEY (Google AI Studio) if set, else OPENAI_API_KEY if set.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

const GEMINI_MODEL = "gemini-1.5-flash";

const SYSTEM_PROMPT = `You help users search a photography/printing database. The database has a tree of: cameras, lenses, formats, film types, paper brands, paper types, paper sizes. Names can be in Korean or English.

Interpret the user's search query as ONE whole intent. Consider ALL parts equally: numbers (35mm, 67, 200, 8x10), words (brand/model names, natural language), and mixed phrases (e.g. "코닥 골드 200", "펜탁스 67"). Do not favor numbers over words or vice versa—output terms that cover the full meaning.

Output ONLY a single line of search keywords: comma-separated terms. Include:
- Numbers and formats exactly as used (35mm, 50mm, 67, 120, 4x5, 8x10, 200)
- Korean and English words (일포드, ilford, 펜탁스, pentax, 코닥, kodak, 러스티, lustre)
- Natural language phrases as relevant keywords (e.g. 골드, gold, 인화지)
- No explanation, no quotes, just: term1, term2, term3`;

function normalizeAiTerms(content: string, trimmed: string): string {
  const aiTerms = content
    .split(/[,،\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  const originalTerms = trimmed.split(/\s+/).filter((t) => t.length > 0);
  const combined = new Set<string>([...originalTerms, ...aiTerms]);
  return [...combined].join(" ");
}

async function expandWithGemini(key: string, trimmed: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const prompt = `${SYSTEM_PROMPT}\n\nUser query: ${trimmed}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn("[AI search] Gemini API error:", res.status, err);
    return null;
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text || data.candidates?.[0]?.finishReason === "SAFETY") return null;
  return text;
}

async function expandWithOpenAI(key: string, trimmed: string): Promise<string | null> {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: trimmed },
      ],
      max_tokens: 150,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn("[AI search] OpenAI API error:", res.status, err);
    return null;
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  return content ?? null;
}

export async function expandQueryForSearch(userQuery: string): Promise<string> {
  const trimmed = userQuery.trim();
  if (!trimmed || trimmed.length > 500) return trimmed;

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  try {
    if (geminiKey) {
      const content = await expandWithGemini(geminiKey, trimmed);
      if (content) return normalizeAiTerms(content, trimmed);
    }
    if (openaiKey) {
      const content = await expandWithOpenAI(openaiKey, trimmed);
      if (content) return normalizeAiTerms(content, trimmed);
    }
  } catch (err) {
    console.warn("[AI search] Failed:", err);
  }

  return trimmed;
}
