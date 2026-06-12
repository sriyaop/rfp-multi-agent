import { GoogleGenAI } from "@google/genai";

export class GeminiClient {

  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor() {

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is missing."
      );
    }

    this.client =
      new GoogleGenAI({
        apiKey
      });

    this.model =
      process.env.GEMINI_MODEL ??
      "gemini-2.5-flash";
  }

  async complete(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {

    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= 3;
      attempt++
    ) {
      try {

        const response =
          await this.client.models.generateContent({
            model: this.model,

            contents: `
SYSTEM:

${systemPrompt}

USER:

${userPrompt}
`
          });

        return (
          response.text ?? ""
        );

      } catch (error) {

        lastError = error;

        console.error(
          `Gemini attempt ${attempt} failed`
        );

        console.error(error);

        if (attempt < 3) {

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