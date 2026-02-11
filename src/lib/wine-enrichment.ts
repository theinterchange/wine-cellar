import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface WineEnrichment {
  drinkWindowStart: number;
  drinkWindowEnd: number;
  estimatedRating: number;
  ratingNotes: string;
}

export async function enrichWineData(wine: {
  brand: string;
  varietal: string | null;
  vintage: number | null;
  region: string | null;
}): Promise<WineEnrichment> {
  const wineDescription = [
    wine.brand,
    wine.varietal,
    wine.vintage,
    wine.region,
  ]
    .filter(Boolean)
    .join(", ");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a wine expert. Given a wine, estimate its optimal drinking window and quality rating.
Return ONLY valid JSON with these fields:
- drinkWindowStart: number (year to start drinking)
- drinkWindowEnd: number (year by which it should be consumed)
- estimatedRating: number (0-100 scale, your best estimate of critic-style rating)
- ratingNotes: string (brief 1-2 sentence explanation of the rating and drinking window)

Base your estimates on typical aging curves for the varietal, region, and producer quality.
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
