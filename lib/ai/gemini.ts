import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-1.5-flash";
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_MAX_ATTEMPTS = 3;
const BACKUP_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b"
];

export class GeminiClient {

  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly modelCandidates: string[];
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;

  constructor() {

    const apiKey =
      process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is missing."
      );
    }

    process.env.GOOGLE_API_KEY = apiKey;

    this.client =
      new GoogleGenAI({
        apiKey
      });

    this.model =
      process.env.GEMINI_MODEL?.trim() ||
      DEFAULT_MODEL;

    this.modelCandidates =
      Array.from(
        new Set([
          this.model,
          ...BACKUP_MODELS
        ])
      );

    this.timeoutMs =
      Number(process.env.GEMINI_TIMEOUT_MS) ||
      DEFAULT_TIMEOUT_MS;

    this.maxAttempts =
      Number(process.env.GEMINI_MAX_ATTEMPTS) ||
      DEFAULT_MAX_ATTEMPTS;
  }

  async complete(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {

    let lastError: unknown;

    for (const model of this.modelCandidates) {
      for (
        let attempt = 1;
        attempt <= this.maxAttempts;
        attempt++
      ) {
        try {

          const response =
            await Promise.race([
              this.client.models.generateContent({
                model,

                contents: `
SYSTEM:

${systemPrompt}

USER:

${userPrompt}
`
              }),
              new Promise<never>((_, reject) => {
                setTimeout(
                  () => reject(new Error("Gemini request timed out.")),
                  this.timeoutMs
                );
              })
            ]);

          return (
            response.text ?? ""
          );

        } catch (error) {

          lastError = error;

          console.error(
            `Gemini attempt ${attempt} failed for model ${model}`
          );

          console.error(error);

          if (attempt < this.maxAttempts) {

            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  attempt * 3000
                )
            );

          }
        }
      }
    }

    throw lastError;
  }

  async generateJson<T>(
    systemPrompt: string,
    userPrompt: string
  ): Promise<T> {

    const response =
      await this.complete(
        `
${systemPrompt}

IMPORTANT:

Return ONLY valid JSON.

No markdown.

No code fences.

No explanations.
`,
        userPrompt
      );

    const cleaned =
      response
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    try {

      return JSON.parse(
        cleaned
      ) as T;

    } catch (error) {

      console.error(
        "Failed Gemini JSON:"
      );

      console.error(
        cleaned
      );

      throw error;
    }
  }
}
