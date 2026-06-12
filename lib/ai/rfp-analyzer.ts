import { GeminiClient } from "@/lib/ai/gemini";

export interface RfpIntelligence {
  projectType: string;
  businessDomain: string;
  complexity: "Low" | "Medium" | "High";

  modules: string[];

  integrations: string[];

  estimatedUsers: string;

  recommendedTeamSize: number;

  recommendedTimelineWeeks: number;

  budgetTier:
    | "Low"
    | "Medium"
    | "High";

  risks: string[];
}

export async function analyzeRfpWithAi(
  text: string
): Promise<RfpIntelligence> {

  const gemini =
    new GeminiClient();

  return gemini.generateJson<RfpIntelligence>(
    `
You are a senior pre-sales consultant.

Analyze the RFP.

Estimate:

- project type
- domain
- complexity
- modules
- integrations
- team size
- timeline
- budget tier
- risks

Return ONLY JSON.
`,
    text.slice(0, 8000)
  );
}