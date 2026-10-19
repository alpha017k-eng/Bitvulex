/* ============================================================
   BITVULEX — SEO Assistant
   Turns a plain sentence/paragraph the admin types into
   SEO-shaped output: title, meta description, URL slug, focus
   keywords, and a Google-style result preview — plus a 0-100
   score with concrete fix-it tips. Pure client-side heuristics,
   no external API, so it works offline in the admin panel.
   ============================================================ */

const SEO_STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","so","of","in","on","for","to","with",
  "is","are","was","were","be","been","being","it","its","this","that","these","those",
  "we","our","you","your","they","their","i","he","she","him","her","them","as","at",
  "by","from","up","down","out","about","into","over","after","before","also","just",
  "not","no","can","will","would","should","could","do","does","did","have","has","had",
  "us","get","got","who","what","which","when","where","how","all","any","some"
]);

const SEO_POWER_WORDS = ["best","free","new","proven","affordable","custom","fast","easy","expert","top","get","boost","grow","trusted","professional"];

function seoTitleCase(str) {
  const small = new Set(["a","an","and","the","of","in","on","for","to","with","or","at","by"]);
  return str.split(/\s+/).map((w, i) => {
    const lower = w.toLowerCase();
    if (i !== 0 && small.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

function seoTokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function seoExtractKeywords(text, n) {
  const freq = {};
  seoTokenize(text).forEach(w => {
    if (w.length < 3 || SEO_STOPWORDS.has(w)) return;
    freq[w] = (freq[w] || 0) + 1;
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n || 6)
    .map(([word]) => word);
}

function seoTruncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  const cut = str.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim().replace(/[,;:.\-–]+$/, "");
}

function seoFirstSentence(text) {
  const trimmed = String(text || "").trim();
  const match = trimmed.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : trimmed).trim();
}

function seoBuildTitle(text, brand) {
  const keywords = seoExtractKeywords(text, 4);
  const base = keywords.length ? seoTitleCase(keywords.slice(0, 5).join(" ")) : seoTitleCase(seoFirstSentence(text));
  const suffix = brand ? ` | ${brand}` : "";
  let title = base + suffix;
  if (title.length > 60) title = seoTruncate(base, 60 - suffix.length) + suffix;
  return title;
}

function seoBuildDescription(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  let desc = clean;
  // Build up sentence-by-sentence until we're close to the ideal length,
  // rather than always keying off just the first sentence.
  const sentences = clean.split(/(?<=[.!?])\s+/);
  let acc = "";
  for (const s of sentences) {
    if ((acc + " " + s).trim().length > 158) break;
    acc = (acc + " " + s).trim();
  }
  desc = acc || clean;
  if (desc.length < 70 && !/[.!?]$/.test(desc)) {
    // short input — pad with a natural call-to-action instead of truncating oddly
    desc = desc.replace(/[.\s]+$/, "") + ". Get a free quote today.";
  }
  return seoTruncate(desc, 160);
}

function seoBuildSlug(text) {
  const keywords = seoExtractKeywords(text, 6);
  const base = keywords.length ? keywords.join("-") : slugify(text);
  return slugify(base).slice(0, 60).replace(/-$/, "");
}

function seoScore({ title, description, keywords, text }) {
  const tips = [];
  let score = 0;
  const add = (points, ok, goodMsg, badMsg) => {
    score += ok ? points : 0;
    tips.push({ good: ok, text: ok ? goodMsg : badMsg });
  };

  add(20, title.length >= 30 && title.length <= 60,
    `Title length is ${title.length} chars — solid for search results.`,
    `Title is ${title.length} chars — aim for 30–60 so it isn't cut off in Google.`);

  add(20, description.length >= 120 && description.length <= 160,
    `Meta description is ${description.length} chars — in the sweet spot.`,
    `Meta description is ${description.length} chars — aim for 120–160 for full visibility.`);

  add(15, keywords.length >= 3,
    `Found ${keywords.length} focus keywords to target.`,
    `Only ${keywords.length} usable keyword(s) — write a bit more detail so real terms surface.`);

  const hasPowerWord = SEO_POWER_WORDS.some(p => (title + " " + description).toLowerCase().includes(p));
  add(15, hasPowerWord,
    `Uses a persuasive word (e.g. "free", "best", "get") to lift click-through.`,
    `No persuasive/action word yet — try adding "free", "get", "best" or similar.`);

  const wordCount = seoTokenize(text).length;
  add(15, wordCount >= 12,
    `Input has enough detail (${wordCount} words) to work with.`,
    `Input is short (${wordCount} words) — a sentence or two more gives richer keywords.`);

  const keywordInTitle = keywords.length && title.toLowerCase().includes(keywords[0]);
  add(15, !!keywordInTitle,
    `Top keyword "${keywords[0] || ""}" appears in the title.`,
    `Top keyword isn't in the title yet — search engines weigh title keywords heavily.`);

  return { score: Math.min(100, score), tips };
}

function runSeoOptimizer(inputText, brand) {
  const text = String(inputText || "").trim();
  if (!text) return null;
  const title = seoBuildTitle(text, brand);
  const description = seoBuildDescription(text);
  const slug = seoBuildSlug(text);
  const keywords = seoExtractKeywords(text, 8);
  const { score, tips } = seoScore({ title, description, keywords, text });
  return { title, description, slug, keywords, score, tips };
}
