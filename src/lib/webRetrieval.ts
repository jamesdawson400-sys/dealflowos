// ──────────────────────────────────────────────
// Web Retrieval — YC Directory (Algolia API)
// Real companies only. No generation. No fallback.
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
  launchedAt: number; // unix timestamp
  teamSize: number;
  tags: string[];
  ycStatus: string;
  ycStage: string;
  isTopCompany: boolean;
  logoUrl: string;
}

const YC_APP_ID = "45BWZJ1SGC";
const YC_API_KEY =
  "NzllNTY5MzJiZGM2OTY2ZTQwMDEzOTNhYWZiZGRjODlhYzVkNjBmOGRjNzJiMWM4ZTU0ZDlhYTZjOTJiMjlhMWFuYWx5dGljc1RhZ3M9eWNkYyZyZXN0cmljdEluZGljZXM9WUNDb21wYW55X3Byb2R1Y3Rpb24lMkNZQ0NvbXBhbnlfQnlfTGF1bmNoX0RhdGVfcHJvZHVjdGlvbiZ0YWdGaWx0ZXJzPSU1QiUyMnljZGNfcHVibGljJTIyJTVE";
const YC_URL = `https://${YC_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/YCCompany_production/query`;

async function fetchYCCompanies(theme: string, signal: AbortSignal): Promise<WebDeal[]> {
  const res = await fetch(YC_URL, {
    method: "POST",
    signal,
    headers: {
      "X-Algolia-Application-Id": YC_APP_ID,
      "X-Algolia-API-Key": YC_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: theme, hitsPerPage: 24 }),
  });

  if (!res.ok) {
    console.log(`[YC] API error: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const hits = data.hits ?? [];
  console.log(`[YC] Raw hits: ${hits.length} (${data.nbHits} total matches)`);

  const deals: WebDeal[] = [];
  for (const hit of hits) {
    const name: string = hit.name ?? "";
    const website: string = hit.website ?? "";
    const oneLiner: string = hit.one_liner ?? "";
    const longDesc: string = hit.long_description ?? "";

    if (!website || website.length < 5 || !name) continue;
    if (!oneLiner && !longDesc) continue;

    const description = longDesc
      ? longDesc.replace(/\r\n/g, " ").replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 400)
      : oneLiner;

    const slug: string = hit.slug ?? name.toLowerCase().replace(/\s+/g, "-");

    deals.push({
      name,
      description,
      oneLiner: oneLiner || name,
      website,
      sourceUrl: `https://www.ycombinator.com/companies/${slug}`,
      sourceName: "YC Directory",
      industry: hit.industry ?? "",
      subindustry: hit.subindustry ?? "",
      location: hit.all_locations?.split(";")[0]?.trim() ?? "",
      batch: hit.batch ?? "",
      launchedAt: hit.launched_at ?? 0,
      teamSize: hit.team_size ?? 0,
      tags: hit.tags ?? [],
      ycStatus: hit.status ?? "Active",
      ycStage: hit.stage ?? "Early",
      isTopCompany: hit.top_company ?? false,
      logoUrl: hit.small_logo_thumb_url ?? "",
    });

    console.log(`[YC] ✓ ${name} (${hit.batch}) team:${hit.team_size} top:${hit.top_company}`);
  }

  return deals;
}

// ── Differentiated scoring ──
export function scoreWebDeal(
  deal: WebDeal,
  keywords: string[],
): { growth: number; momentum: number; volatility: number; thematicFit: number; total: number } {

  // Growth — log scale team size + top company + YC stage
  const logTeam = deal.teamSize > 0 ? Math.log10(deal.teamSize) * 22 : 0;
  let growth = Math.min(92, Math.round(28 + logTeam));
  if (deal.isTopCompany) growth = Math.min(96, growth + 18);
  if (deal.ycStage === "Growth") growth = Math.min(94, growth + 8);

  // Momentum — batch recency + status + top company
  const batchYear = parseInt(deal.batch.match(/\d{4}/)?.[0] ?? "0");
  const currentYear = new Date().getFullYear();
  const batchAge = currentYear - batchYear;
  let momentum = 35;
  if (deal.ycStatus === "Active") momentum += 22;
  else if (deal.ycStatus === "Acquired") momentum += 10;
  else if (deal.ycStatus === "Inactive") momentum -= 15;
  if (batchAge <= 1) momentum += 22;
  else if (batchAge <= 2) momentum += 16;
  else if (batchAge <= 3) momentum += 10;
  else if (batchAge <= 5) momentum += 5;
  if (deal.isTopCompany) momentum = Math.min(96, momentum + 12);
  momentum = Math.max(10, Math.min(96, momentum));

  // Volatility/Risk — inverse of quality signals
  let volatility = 28;
  if (deal.teamSize === 0) volatility += 18;
  else if (deal.teamSize < 5) volatility += 14;
  else if (deal.teamSize < 10) volatility += 8;
  if (deal.ycStatus === "Inactive") volatility += 22;
  if (deal.ycStatus === "Acquired") volatility += 12;
  if (batchAge > 6) volatility += 8;
  if (!deal.description || deal.description.length < 40) volatility += 10;
  if (deal.isTopCompany) volatility = Math.max(10, volatility - 12);
  volatility = Math.min(88, volatility);

  // Thematic fit — keyword match across all text
  const corpus = [deal.name, deal.oneLiner, deal.description, ...deal.tags, deal.industry, deal.subindustry]
    .join(" ")
    .toLowerCase();
  const kws = keywords.map((k) => k.toLowerCase()).filter((k) => k.length > 1);
  const matchCount = kws.filter((kw) => corpus.includes(kw)).length;
  const thematicFit = Math.min(96, Math.round(25 + (matchCount / Math.max(1, kws.length)) * 70));

  // Final score — top companies get a flat bonus so they visibly outrank others
  const topBonus = deal.isTopCompany ? 18 : 0;
  const raw = 0.38 * growth + 0.28 * momentum - 0.18 * volatility + 0.16 * thematicFit + topBonus;
  const total = Math.max(15, Math.min(98, Math.round(raw)));

  return { growth, momentum, volatility, thematicFit, total };
}

export async function fetchRealDeals(theme: string): Promise<WebDeal[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  console.log(`\n[WebRetrieval] Scanning YC Directory for: "${theme}"`);
  try {
    const deals = await fetchYCCompanies(theme, controller.signal);
    console.log(`[WebRetrieval] Returning ${deals.length} companies\n`);
    return deals;
  } finally {
    clearTimeout(timeout);
  }
}
