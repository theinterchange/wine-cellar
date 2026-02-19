import { GoogleGenerativeAI } from "@google/generative-ai";

export interface LabelAnalysis {
  brand: string;
  varietal: string | null;
  vintage: number | null;
  region: string | null;
  designation: string | null;
}

export async function analyzeWineLabel(base64Image: string): Promise<LabelAnalysis> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" },
    systemInstruction: `You are a wine label reader. Extract ONLY the information that is explicitly visible on the label image.
Return ONLY valid JSON with these fields:
- brand: string (winery/producer name — must be printed on the label)
- varietal: string or null (grape variety, e.g. "Cabernet Sauvignon" — ONLY if printed on the label)
- vintage: number or null (year — ONLY if printed on the label)
- region: string or null (wine region/appellation — ONLY if printed on the label)
- designation: string or null (e.g. "Reserve", "Grand Cru", "Estate" — ONLY if printed on the label)

CRITICAL RULES:
- Do NOT guess, infer, or use your knowledge of wines to fill in fields.
- If a field is not clearly visible on the label, you MUST set it to null.
- Do NOT recognize a wine and fill in details from memory — only read what is printed.
- When in doubt, return null.`,
  });

  const result = await model.generateContent([
    { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
    "Extract the wine details from this label.",
  ]);

  const content = result.response.text();
  if (!content) throw new Error("No response from Gemini");

  return JSON.parse(content) as LabelAnalysis;
}
