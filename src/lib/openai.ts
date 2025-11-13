// OpenAI API integration for AI analysis
// La API key se configura mediante variables de entorno

const OPENAI_API_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export interface APIUsageStats {
  totalCalls: number;
  totalTokens: number;
  successfulCalls: number;
  failedCalls: number;
  lastCallDate?: string;
}

// Obtener API key desde variables de entorno o configuración global
export const getOpenAIApiKey = (): string | null => {
  // Primero intentar desde variables de entorno
  const envKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (envKey) return envKey;
  
  // Fallback: desde localStorage (para desarrollo, será configurada por el desarrollador)
  const localKey = localStorage.getItem("openai_api_key_global");
  return localKey;
};

// Guardar API key globalmente (solo para desarrollo, en producción usar variables de entorno)
export const setOpenAIApiKey = (key: string) => {
  localStorage.setItem("openai_api_key_global", key);
};

/**
 * Genera análisis usando OpenAI con system prompt y user prompt separados
 * @param systemPrompt - Contexto estático (no se cuenta en tokens de entrada en cada request)
 * @param userPrompt - Datos dinámicos específicos
 * @param options - Opciones adicionales (modelo, temperatura, maxTokens, etc.)
 */
export const generateAIAnalysis = async (
  systemPrompt: string,
  userPrompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "text" | "json_object";
  }
): Promise<string> => {
  const apiKey = getOpenAIApiKey();
  
  if (!apiKey) {
    throw new Error("API key no configurada. Contacte al administrador del sistema.");
  }

  // Registrar uso de API
  recordAPIUsage("call");

  const model = options?.model || "gpt-4o-mini";
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens || 8000;
  const responseFormat = options?.responseFormat || "text";

  try {
    const response = await fetch(OPENAI_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature,
        max_tokens: maxTokens,
        ...(responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {})
      }),
    });

    if (!response.ok) {
      recordAPIUsage("failed");
      const error = await response.json();
      console.error("OpenAI API error:", error);
      throw new Error(`Error de API: ${response.status} - ${error.error?.message || "Error desconocido"}`);
    }

    recordAPIUsage("success");
    
    const data = await response.json();
    
    // Registrar tokens reales de la respuesta
    if (data.usage) {
      const totalTokens = data.usage.total_tokens || 0;
      if (totalTokens > 0) {
        recordAPIUsage("tokens", totalTokens);
      }
    }

    return data.choices?.[0]?.message?.content || "No se pudo generar análisis";
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
    localStorage.setItem("openai_api_usage_stats", JSON.stringify(stats));
  } catch (error) {
    console.error("Error recording API usage:", error);
  }
};

// Obtener estadísticas de uso de API
export const getAPIUsageStats = (): APIUsageStats => {
  try {
    const stored = localStorage.getItem("openai_api_usage_stats");
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
  localStorage.removeItem("openai_api_usage_stats");
};
