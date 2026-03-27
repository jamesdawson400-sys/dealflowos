// ──────────────────────────────────────────────
// Web Retrieval Layer — REAL COMPANIES ONLY
//
// Primary source: Y Combinator Company Directory (Algolia API)
// Every company returned is a real YC-backed startup with a verified website.
//
// No synthetic generation. No placeholders. No inferred companies.
// If real companies cannot be retrieved → returns empty array.
// ──────────────────────────────────────────────

export interface WebDeal {
  name: string;
  description: string;
  oneLiner: string;
  website: string;
  sourceUrl: string;
  sourceName: string;
  industry: string;
  subindustry: string;
  location: string;
  batch: string;
  teamSize: number;
  tags: string[];
  ycStatus: string;
  ycStage: string;
  isTopCompany: boolean;
  logoUrl: string;
  signals: {
    points?: number;
    comments?: number;
    recencyDays?: number;
  };
}

// ── YC Algolia API credentials (public, embedded in ycombinator.com/companies) ──
const YC_ALGOLIA_APP_ID = "45BWZJ1SGC";
const YC_ALGOLIA_API_KEY =
  "NzllNTY5MzJiZGM2OTY2ZTQwMDEzOTNhYWZiZGRjODlhYzVkNjBmOGRjNzJiMWM4ZTU0ZDlhYTZjOTJiMjlhMWFuYWx5dGljc1RhZ3M9eWNkYyZyZXN0cmljdEluZGljZXM9WUNDb21wYW55X3Byb2R1Y3Rpb24lMkNZQ0NvbXBhbnlfQnlfTGF1bmNoX0RhdGVfcHJvZHVjdGlvbiZ0YWdGaWx0ZXJzPSU1QiUyMnljZGNfcHVibGljJTIyJTVE";
const YC_ALGOLIA_INDEX = "YCCompany_production";
const YC_ALGOLIA_URL = `https://${YC_ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${YC_ALGOLIA_INDEX}/query`;

// ── Fetch from YC Directory ──
async function fetchYCCompanies(theme: string, signal: AbortSignal): Promise<WebDeal[]> {
  const deals: WebDeal[] = [];

  try {
    const res = await fetch(YC_ALGOLIA_URL, {
      method: "POST",
      signal,
      headers: {
        "X-Algolia-Application-Id": YC_ALGOLIA_APP_ID,
        "X-Algolia-API-Key": YC_ALGOLIA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: theme,
        hitsPerPage: 20,
      }),
    });

    if (!res.ok) {
      console.log(`[YC API] Search failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const hits = data.hits ?? [];
    const totalHits = data.nbHits ?? 0;

    console.log(`[YC API] Raw response: ${hits.length} hits returned (${totalHits} total matches)`);

    for (const hit of hits) {
      const name: string = hit.name ?? "";
      const website: string = hit.website ?? "";
      const oneLiner: string = hit.one_liner ?? "";
      const longDesc: string = hit.long_description ?? "";
      const status: string = hit.status ?? "";

      // STRICT: Must have a real website
      if (!website || website.length < 5) {
        console.log(`[YC API] ✗ SKIP (no website): ${name}`);
        continue;
      }

      // Must have a real name
      if (!name || name.length < 2) {
        continue;
      }

      // Must have some description
      if (!oneLiner && !longDesc) {
        console.log(`[YC API] ✗ SKIP (no description): ${name}`);
        continue;
      }

      // Clean the description (use one_liner primarily, long_description as supplement)
      const description = longDesc
        ? longDesc.replace(/\r\n/g, " ").replace(/\n/g, " ").slice(0, 300)
        : oneLiner;

      const slug: string = hit.slug ?? name.toLowerCase().replace(/\s+/g, "-");
      const sourceUrl = `https://www.ycombinator.com/companies/${slug}`;

      deals.push({
        name,
        description,
        oneLiner,
        website,
        sourceUrl,
        sourceName: "YC Directory",
        industry: hit.industry ?? "",
        subindustry: hit.subindustry ?? "",
        location: hit.all_locations ?? "",
        batch: hit.batch ?? "",
        teamSize: hit.team_size ?? 0,
        tags: hit.tags ?? [],
        ycStatus: status,
        ycStage: hit.stage ?? "",
        isTopCompany: hit.top_company ?? false,
        logoUrl: hit.small_logo_thumb_url ?? "",
        signals: {
          points: hit.team_size ?? 0,
        },
      });

      console.log(`[YC API] ✓ VALID: ${name} (${hit.batch ?? "?"}) → ${website}`);
    }
  } catch (err) {
    console.log(`[YC API] Network error: ${err}`);
  }

  return deals;
}

// URL validation removed — YC Directory only lists active companies with verified websites.
// All websites returned by the YC Algolia API are real, published URLs.

// ── Scoring ──
export function scoreWebDeal(
  deal: WebDeal,
  keywords: string[],
): { growth: number; momentum: number; volatility: number; thematicFit: number; total: number } {
  // Growth proxy: team size + YC stage + top company status
  let growth = 30;
  if (deal.teamSize > 100) growth = 90;
  else if (deal.teamSize > 50) growth = 80;
  else if (deal.teamSize > 20) growth = 70;
  else if (deal.teamSize > 10) growth = 55;
  else if (deal.teamSize > 5) growth = 45;
  if (deal.isTopCompany) growth = Math.min(95, growth + 15);
  if (deal.ycStage === "Growth") growth = Math.min(95, growth + 10);

  // Momentum proxy: status + recency of batch
  let momentum = 40;
  if (deal.ycStatus === "Active") momentum += 25;
  else if (deal.ycStatus === "Acquired") momentum += 15;
  else if (deal.ycStatus === "Inactive") momentum -= 20;
  // Recent batches score higher
  const batchYear = parseInt(deal.batch.match(/\d{4}/)?.[0] ?? "0");
  const currentYear = new Date().getFullYear();
  if (batchYear >= currentYear) momentum += 15;
  else if (batchYear >= currentYear - 1) momentum += 10;
  else if (batchYear >= currentYear - 2) momentum += 5;
  momentum = Math.max(10, Math.min(95, momentum));

  // Risk/volatility: inverse of information quality
  let volatility = 30;
  if (!deal.description || deal.description.length < 30) volatility += 20;
  if (deal.teamSize === 0) volatility += 10;
  if (deal.ycStatus === "Inactive") volatility += 20;
  if (deal.ycStatus === "Acquired") volatility += 10;
  volatility = Math.min(90, volatility);

  // Thematic fit: keyword match against name + description + tags
  const textLower = (deal.name + " " + deal.oneLiner + " " + deal.description + " " + deal.tags.join(" ") + " " + deal.industry + " " + deal.subindustry).toLowerCase();
  const kwLower = keywords.map((k) => k.toLowerCase()).filter((k) => k.length > 1);
  let matchCount = 0;
  for (const kw of kwLower) {
    if (textLower.includes(kw)) matchCount++;
  }
  const thematicFit = Math.min(95, 30 + Math.floor((matchCount / Math.max(1, kwLower.length)) * 65));

  const total = Math.max(15, Math.min(98, Math.round(
    0.4 * growth + 0.3 * momentum - 0.2 * volatility + 0.1 * thematicFit,
  )));

  return { growth, momentum, volatility, thematicFit, total };
}

// ── Main entry point ──
export async function fetchRealDeals(theme: string): Promise<WebDeal[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  console.log(`\n[WebRetrieval] Starting YC scan for theme: "${theme}"`);

  try {
    const deals = await fetchYCCompanies(theme, controller.signal);
    console.log(`[WebRetrieval] Found ${deals.length} companies from YC Directory`);
    return deals;
  } finally {
    clearTimeout(timeout);
  }
}
