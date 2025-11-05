// Google Gemini API integration for AI analysis
// ⚠️ WARNING: API keys stored in localStorage are NOT secure for production
// Consider using Lovable Cloud for secure API key management

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export const generateAIAnalysis = async (prompt: string): Promise<string> => {
  const apiKey = localStorage.getItem("gemini_api_key");
  
  if (!apiKey) {
    throw new Error("API key no configurada. Por favor configura tu clave de Google AI en el Dashboard.");
  }

  try {
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Gemini API error:", error);
      throw new Error(`Error de API: ${response.status} - ${error.error?.message || "Error desconocido"}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar análisis";
  } catch (error) {
    console.error("Error generating AI analysis:", error);
    throw error;
  }
};

export const setGeminiApiKey = (key: string) => {
  localStorage.setItem("gemini_api_key", key);
};

export const getGeminiApiKey = (): string | null => {
  return localStorage.getItem("gemini_api_key");
};

export const removeGeminiApiKey = () => {
  localStorage.removeItem("gemini_api_key");
};
