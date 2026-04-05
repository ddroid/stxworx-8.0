type GenerateTextInput = {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  model?: string;
};

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite-preview";

function extractText(payload: any) {
  const parts = payload?.candidates?.flatMap((candidate: any) => candidate?.content?.parts || []) || [];
  return parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

export const aiService = {
  async generateText(input: GenerateTextInput) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey || apiKey === "replace-with-your-gemini-api-key") {
      const error = new Error("Gemini is not configured on the server. Set a valid GEMINI_API_KEY.");
      (error as Error & { status?: number }).status = 503;
      throw error;
    }

    const model = input.model?.trim() || DEFAULT_GEMINI_MODEL;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: input.prompt }],
            },
          ],
          ...(input.systemInstruction
            ? {
                systemInstruction: {
                  parts: [{ text: input.systemInstruction }],
                },
              }
            : {}),
          ...(typeof input.temperature === "number"
            ? {
                generationConfig: {
                  temperature: input.temperature,
                },
              }
            : {}),
        }),
      },
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const upstreamMessage = payload?.error?.message || "Gemini request failed.";
      const errorMessage = upstreamMessage.includes("API key not valid")
        ? "Server GEMINI_API_KEY is invalid. Please replace it with a valid Gemini API key."
        : `Gemini request failed: ${upstreamMessage}`;
      const error = new Error(errorMessage);
      (error as Error & { status?: number }).status = response.status >= 400 && response.status < 600 ? response.status : 502;
      throw error;
    }

    const text = extractText(payload);

    if (!text) {
      const error = new Error("Gemini returned an empty response.");
      (error as Error & { status?: number }).status = 502;
      throw error;
    }

    return {
      model,
      text,
    };
  },
};
