import OpenAI from "openai";

/**
 * Lightweight optional LLM adapter used by future agents when an OpenAI API key is configured.
 */
export class LlmClient {
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor() {
    this.client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    this.model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  /**
   * Returns true when model-backed reasoning is available in this environment.
   */
  isEnabled(): boolean {
    return this.client !== null;
  }

  /**
   * Generates a short model response for specialist agent extensions.
   */
  async complete(system: string, prompt: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });

    return response.choices[0]?.message.content ?? null;
  }
}
