import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface LabelAnalysis {
  brand: string;
  varietal: string | null;
  vintage: number | null;
  region: string | null;
}

export async function analyzeWineLabel(base64Image: string): Promise<LabelAnalysis> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a wine label reader. Extract wine details from the label image.
Return ONLY valid JSON with these fields:
- brand: string (winery/producer name)
- varietal: string or null (grape variety, e.g. "Cabernet Sauvignon")
- vintage: number or null (year)
- region: string or null (wine region/appellation)

If you cannot determine a field, set it to null.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
          { type: "text", text: "Extract the wine details from this label." },
        ],
      },
    ],
    max_tokens: 300,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");

  return JSON.parse(content) as LabelAnalysis;
}
