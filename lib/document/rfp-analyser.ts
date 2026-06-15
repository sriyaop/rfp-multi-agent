import { GeminiClient } from "@/lib/ai/gemini";
import { RfpAnalysis } from "@/lib/types";

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
): Promise<RfpAnalysis> {
  const gemini = new GeminiClient();

  const analysis = await gemini.generateJson<unknown>(
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

Return ONLY valid JSON with this exact top-level structure:

{
  "clientName": "string",
  "projectName": "string",
  "executiveSummary": "string",
  "businessObjectives": ["string"],
  "functionalRequirements": ["string"],
  "technicalRequirements": ["string"],
  "scopeItems": ["string"],
  "deliverables": ["string"],
  "constraints": ["string"],
  "timelineInformation": ["string"],
  "budgetInformation": ["string"],
  "evaluationCriteria": ["string"],
  "resourceRequirements": ["string"],
  "risks": ["string"],
  "proposalInsights": {
    "ceo": ["string"],
    "cto": ["string"],
    "pm": ["string"],
    "finance": ["string"],
    "hr": ["string"]
  }
}

Every array must exist. Use an empty array only when the RFP genuinely has no relevant information.
`,
    `
RFP CONTENT:

${text.slice(0, 24000)}
`
  );

  return normalizeAiRfpAnalysis(analysis);
} 

function normalizeAiRfpAnalysis(
  value: unknown
): RfpAnalysis {
  const record = isRecord(value) ? value : {};

  const functionalRequirements = getStringArray(record, [
    "functionalRequirements",
    "functional_requirements",
    "requirements",
    "functional"
  ]);

  const technicalRequirements = getStringArray(record, [
    "technicalRequirements",
    "technical_requirements",
    "technical",
    "architectureRequirements"
  ]);

  const scopeItems = getStringArray(record, [
    "scopeItems",
    "scope_items",
    "scope",
    "modules",
    "features"
  ]);

  return {
    clientName: getString(record, ["clientName", "client_name", "client", "organization"], "Client"),
    projectName: getString(record, ["projectName", "project_name", "project", "title"], "RFP Project"),
    executiveSummary: getString(record, ["executiveSummary", "executive_summary", "summary"], "AI analysis completed for the uploaded RFP."),
    businessObjectives: getStringArray(record, ["businessObjectives", "business_objectives", "objectives", "goals"]),
    functionalRequirements,
    technicalRequirements,
    scopeItems,
    deliverables: getStringArray(record, ["deliverables", "outputs"]),
    constraints: getStringArray(record, ["constraints", "limitations"]),
    timelineInformation: getStringArray(record, ["timelineInformation", "timeline_information", "timeline", "schedule"]),
    budgetInformation: getStringArray(record, ["budgetInformation", "budget_information", "budget", "pricing"]),
    evaluationCriteria: getStringArray(record, ["evaluationCriteria", "evaluation_criteria", "criteria"]),
    resourceRequirements: getStringArray(record, ["resourceRequirements", "resource_requirements", "staffing", "resources"]),
    risks: getStringArray(record, ["risks", "riskItems", "risk_items"]),
    proposalInsights: normalizeProposalInsights(record.proposalInsights ?? record.proposal_insights)
  };
}

function normalizeProposalInsights(value: unknown): RfpAnalysis["proposalInsights"] {
  const record = isRecord(value) ? value : {};

  return {
    ceo: getStringArray(record, ["ceo", "strategy", "executive"]),
    cto: getStringArray(record, ["cto", "architecture", "technical"]),
    pm: getStringArray(record, ["pm", "product", "productManager"]),
    finance: getStringArray(record, ["finance", "cost", "budget"]),
    hr: getStringArray(record, ["hr", "resource", "staffing"])
  };
}

function getString(
  record: Record<string, unknown>,
  keys: string[],
  fallback: string
): string {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

function getStringArray(
  record: Record<string, unknown>,
  keys: string[]
): string[] {
  for (const key of keys) {
    const value = record[key];
    const items = toStringArray(value);

    if (items.length > 0) {
      return items;
    }
  }

  return [];
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") {
          return [item];
        }

        if (isRecord(item)) {
          return Object.values(item).filter((entry): entry is string => typeof entry === "string");
        }

        return [];
      })
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
