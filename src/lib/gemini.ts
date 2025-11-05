// Google Gemini API integration for AI analysis
// La API key se configura mediante variables de entorno

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface APIUsageStats {
  totalCalls: number;
  totalTokens: number;
  successfulCalls: number;
  failedCalls: number;
  lastCallDate?: string;
}

// Obtener API key desde variables de entorno o configuración global
export const getGeminiApiKey = (): string | null => {
  // Primero intentar desde variables de entorno
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) return envKey;
  
  // Fallback: desde localStorage (para desarrollo, será configurada por el desarrollador)
  const localKey = localStorage.getItem("gemini_api_key_global");
  return localKey;
};

// Guardar API key globalmente (solo para desarrollo, en producción usar variables de entorno)
export const setGeminiApiKey = (key: string) => {
  localStorage.setItem("gemini_api_key_global", key);
};

export const generateAIAnalysis = async (prompt: string): Promise<string> => {
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    throw new Error("API key no configurada. Contacte al administrador del sistema.");
  }

  // Registrar uso de API
  recordAPIUsage("call");

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
      recordAPIUsage("failed");
      const error = await response.json();
      console.error("Gemini API error:", error);
      throw new Error(`Error de API: ${response.status} - ${error.error?.message || "Error desconocido"}`);
    }

    recordAPIUsage("success");
    
    // Estimar tokens (aproximación: 1 token ≈ 4 caracteres)
    const estimatedTokens = Math.ceil(prompt.length / 4);
    recordAPIUsage("tokens", estimatedTokens);

    const data = await response.json();
    
    // Intentar obtener tokens reales de la respuesta si están disponibles
    const usageMetadata = data.usageMetadata;
    if (usageMetadata) {
      const actualTokens = (usageMetadata.promptTokenCount || 0) + (usageMetadata.candidatesTokenCount || 0);
      if (actualTokens > 0) {
        recordAPIUsage("tokens", actualTokens);
      }
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar análisis";
  } catch (error) {
    console.error("Error generating AI analysis:", error);
    throw error;
  }
};

// Registrar uso de API
const recordAPIUsage = (type: "call" | "success" | "failed" | "tokens", tokens?: number) => {
  try {
    const stats = getAPIUsageStats();
    
    if (type === "call") {
      stats.totalCalls++;
    } else if (type === "success") {
      stats.successfulCalls++;
    } else if (type === "failed") {
      stats.failedCalls++;
    } else if (type === "tokens" && tokens) {
      stats.totalTokens += tokens;
    }
    
    stats.lastCallDate = new Date().toISOString();
    localStorage.setItem("gemini_api_usage_stats", JSON.stringify(stats));
  } catch (error) {
    console.error("Error recording API usage:", error);
  }
};

// Obtener estadísticas de uso de API
export const getAPIUsageStats = (): APIUsageStats => {
  try {
    const stored = localStorage.getItem("gemini_api_usage_stats");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading API usage stats:", error);
  }
  
  return {
    totalCalls: 0,
    totalTokens: 0,
    successfulCalls: 0,
    failedCalls: 0,
  };
};

// Resetear estadísticas de uso
export const resetAPIUsageStats = () => {
  localStorage.removeItem("gemini_api_usage_stats");
};
