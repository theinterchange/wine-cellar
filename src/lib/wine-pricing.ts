import { GoogleGenerativeAI } from "@google/generative-ai";

export async function lookupMarketPrice(wine: {
  brand: string;
  varietal: string | null;
  vintage: number | null;
  region: string | null;
}): Promise<{ marketPrice: string | null }> {
  const wineDescription = [wine.brand, wine.varietal, wine.vintage, wine.region]
    .filter(Boolean)
    .join(", ");

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }],
      systemInstruction: `You are a wine pricing expert. Given a wine, search for its current average US retail price.
Return ONLY valid JSON with this field:
- marketPrice: string (e.g. "$45" or "$30-50") — the typical US retail price. Use null if you truly cannot find any pricing information.`,
    });

    const result = await model.generateContent(
      `What is the average US retail price for: ${wineDescription}`
    );

    const content = result.response.text();
    if (!content) return { marketPrice: null };

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { marketPrice: null };

    const parsed = JSON.parse(jsonMatch[0]);
    return { marketPrice: parsed.marketPrice || null };
  } catch (error) {
    console.error("Market price lookup failed:", error);
    return { marketPrice: null };
  }
}
