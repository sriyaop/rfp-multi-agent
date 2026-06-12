import { GeminiClient } from "@/lib/ai/gemini";

export interface EnhancedRfpAnalysis {
  clientName: string;
  projectName: string;

  executiveSummary: string;

  businessObjectives: string[];

  functionalRequirements: string[];

  technicalRequirements: string[];

  scopeItems: string[];

  deliverables: string[];

  constraints: string[];

  timelineInformation: string[];

  budgetInformation: string[];

  evaluationCriteria: string[];

  resourceRequirements: string[];

  risks: string[];

  proposalInsights: {
    ceo: string[];
    cto: string[];
    pm: string[];
    finance: string[];
    hr: string[];
  };
}

export async function analyzeRfpWithAI(
  text: string
): Promise<EnhancedRfpAnalysis> {
  const gemini = new GeminiClient();

  return gemini.generateJson<EnhancedRfpAnalysis>(
    `
You are a senior proposal consultant.

Analyze the uploaded RFP analysis document.

Extract ALL useful proposal intelligence.

Focus on:

- business goals
- scope
- architecture
- integrations
- budget
- timeline
- staffing
- evaluation criteria
- proposal strategy

Return the requested JSON structure.
`,
    `
RFP CONTENT:

${text}
`
  );
} 