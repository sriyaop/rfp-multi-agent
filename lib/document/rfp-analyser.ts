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
    RFP_ANALYSIS_PROMPT,
    `
RFP CONTENT:

${text.slice(0, 24000)}
`
  );

  return normalizeAiRfpAnalysis(analysis);
} 

export async function analyzeRfpFileWithAI(
  file: {
    data: Buffer;
    mimeType: string;
    fileName: string;
  }
): Promise<RfpAnalysis> {
  const gemini = new GeminiClient();

  const analysis = await gemini.generateJsonWithInlineData<unknown>(
    `
${RFP_ANALYSIS_PROMPT}

Analyze the attached RFP file directly. If the PDF is scanned or image-based, use visual document understanding to read the pages before extracting requirements.

Uploaded file name: ${file.fileName}
`,
    {
      mimeType: file.mimeType,
      data: file.data.toString("base64")
    }
  );

  return normalizeAiRfpAnalysis(analysis);
}

const RFP_ANALYSIS_PROMPT = `
You are a senior proposal consultant.

Analyze the uploaded RFP document.

Extract ALL useful proposal intelligence.

Focus on:

- business goals
- scope
- architecture
- integrations
- budget
- buyer/client country, region, currency and any pricing instructions
- timeline
- staffing
- evaluation criteria
- proposal strategy

Strict hallucination controls:

- Do not invent client budgets, deadlines, dates, quantities or legal constraints.
- If the RFP does not state a budget, put "Budget not specified in RFP" in budgetInformation.
- If the RFP states currency, country, local procurement rules, or pricing format, include those exact facts in budgetInformation and constraints.
- If the RFP does not state a deadline, put "Deadline not specified in RFP" in timelineInformation.
- Separate facts found in the RFP from proposal recommendations.
- Use concise, auditable phrases that can be traced back to the uploaded document.
- Extract exact named technologies, standards, integrations, compliance requirements and submission requirements when present.

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
`;

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
