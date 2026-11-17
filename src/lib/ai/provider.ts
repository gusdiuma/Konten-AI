import { GoogleGenAI, type Schema } from "@google/genai";
import type { ErrorCode } from "@/lib/errors";

export const DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen";

export class AiProviderError extends Error {
  readonly code: ErrorCode;
  readonly stage: string;

  constructor(code: ErrorCode, stage: string, internalMessage: string) {
    super(internalMessage);
    this.code = code;
    this.stage = stage;
  }
}

export interface AiUsageMetrics {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  durationMs: number;
}

export interface GenerateStructuredParams {
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
  stage: string;
}

export interface GenerateStructuredResult {
  rawText: string;
  usage: AiUsageMetrics;
  provider: string;
  model: string;
}

export interface AiProviderAdapter {
  readonly providerName: string;
  readonly modelName: string;
  generateStructuredJson(
    params: GenerateStructuredParams
  ): Promise<GenerateStructuredResult>;
}

export function isAiProviderConfigured(): boolean {
  const provider = (process.env.AI_PROVIDER?.trim() || "gemini").toLowerCase();
  if (provider !== "gemini") return false;
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getConfiguredAiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("timeout") ||
    msg.includes("network") ||
    msg.includes("fetch failed")
  );
}

class GeminiProviderAdapter implements AiProviderAdapter {
  readonly providerName = "gemini";
  readonly modelName: string;
  private readonly client: GoogleGenAI;

  constructor(apiKey: string, modelName: string) {
    this.modelName = modelName;
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  async generateStructuredJson(
    params: GenerateStructuredParams
  ): Promise<GenerateStructuredResult> {
    const startedAt = Date.now();
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 650));
      }

      try {
        const response = await this.client.models.generateContent({
          model: this.modelName,
          contents: params.prompt,
          config: {
            systemInstruction: params.systemInstruction,
            responseMimeType: "application/json",
            responseSchema: params.responseSchema,
          },
        });

        const rawText = (response.text ?? "").trim();
        if (!rawText) {
          throw new AiProviderError(
            "ACS-AI-02",
            params.stage,
            "Empty structured response from model"
          );
        }

        const meta = response.usageMetadata;
        const usage: AiUsageMetrics = {
          promptTokens: meta?.promptTokenCount ?? 0,
          candidatesTokens: meta?.candidatesTokenCount ?? 0,
          totalTokens: meta?.totalTokenCount ?? 0,
          durationMs: Date.now() - startedAt,
        };

        return {
          rawText,
          usage,
          provider: this.providerName,
          model: this.modelName,
        };
      } catch (err) {
        lastError = err;
        if (err instanceof AiProviderError) {
          throw err;
        }
        if (attempt === 0 && isTransientError(err)) {
          continue;
        }
        break;
      }
    }

    if (lastError instanceof AiProviderError) {
      throw lastError;
    }

    throw new AiProviderError(
      "ACS-AI-01",
      params.stage,
      lastError instanceof Error ? lastError.message : "Gemini request failed"
    );
  }
}

export function getAiProvider(): AiProviderAdapter {
  if (typeof window !== "undefined") {
    throw new Error("AI provider must only run on the server");
  }

  const provider = (process.env.AI_PROVIDER?.trim() || "gemini").toLowerCase();
  if (provider !== "gemini") {
    throw new AiProviderError(
      "ACS-CFG-01",
      "provider_init",
      `Unsupported AI provider: ${provider}`
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiProviderError(
      "ACS-CFG-01",
      "provider_init",
      "GEMINI_API_KEY is not configured"
    );
  }

  return new GeminiProviderAdapter(apiKey, getConfiguredAiModel());
}
