import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface WineEnrichment {
  drinkWindowStart: number;
  drinkWindowEnd: number;
  estimatedRating: number;
  ratingNotes: string;
  foodPairings: string | null;
  varietal: string | null;
}

export async function enrichWineData(wine: {
  brand: string;
  varietal: string | null;
  vintage: number | null;
  region: string | null;
  designation: string | null;
}): Promise<WineEnrichment> {
  const wineDescription = [
    wine.brand,
    wine.varietal,
    wine.vintage,
    wine.region,
    wine.designation,
  ]
    .filter(Boolean)
    .join(", ");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are a wine expert. Given a wine, estimate its optimal drinking window and quality rating.
Return ONLY valid JSON with these fields:
- drinkWindowStart: number (year to start drinking)
- drinkWindowEnd: number (year by which it should be consumed)
- estimatedRating: number (0-100 scale, your best estimate of critic-style rating)
- ratingNotes: string (brief 1-2 sentence explanation of the rating and drinking window)
- foodPairings: string or null (3-5 specific food pairings that complement this wine's flavor profile, body, and tannin structure. Match pairings to the varietal and region — e.g. pair bold Cabernet with rich meats, pair crisp Sauvignon Blanc with seafood. Be specific: "pan-seared duck breast" not just "duck". Comma-separated.)
- varietal: string or null (if the varietal/grape variety was not provided in the input, use your wine knowledge to infer it — e.g. "Opus One" is a "Bordeaux Blend", "Cloudy Bay" from Marlborough is "Sauvignon Blanc". If it was already provided, return the same value. If you truly cannot determine it, return null.)

Base your estimates on typical aging curves for the varietal, region, and producer quality.
If a designation is included (e.g. Reserve, Grand Cru), factor it into your rating — designated bottlings typically score higher than standard bottlings from the same producer.
If vintage is unknown, assume a recent vintage and give a general estimate.`,
      },
      {
        role: "user",
        content: `Estimate the drinking window and rating for: ${wineDescription}`,
      },
    ],
    max_tokens: 300,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");

  return JSON.parse(content) as WineEnrichment;
}
