import { RfpAnalysis } from "@/lib/types";
import { toUniqueItems } from "@/lib/utils";

const SECTION_PATTERNS = {
  requirements: /(?:requirements?|shall|must|should|needs? to|functional|technical)/i,
  scope: /(?:scope|deliverables?|services?|implementation|migration|support)/i,
  constraints: /(?:constraint|deadline|budget|compliance|security|accessibility|timeline|submission)/i,
  objectives: /(?:objective|goal|purpose|business|outcome|vision)/i,
  risks: /(?:risk|dependency|assumption|challenge|delay|penalty)/i
};

/**
 * Extracts normalized text from supported RFP upload formats.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT RFP.");
}

/**
 * Converts raw RFP text into a compact structured analysis for agent planning.
 */
export function analyzeRfpText(text: string): RfpAnalysis {
  const normalized = text.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const lines = normalized
    .split(/\n|(?<=\.)\s+(?=[A-Z])/)
    .map((line) => line.trim())
    .filter((line) => line.length > 12);

  const pick = (pattern: RegExp, limit: number) =>
    lines.filter((line) => pattern.test(line)).slice(0, limit);

  const title = lines.find((line) => /rfp|request for proposal|proposal/i.test(line)) ?? lines[0] ?? "RFP Project";
  const client = inferClientName(normalized);

  return {
    clientName: client,
    projectName: cleanTitle(title),
    executiveSummary: summarize(normalized), 
    businessObjectives: toUniqueItems(pick(SECTION_PATTERNS.objectives, 8), [
      "Deliver a solution aligned with the stated business objectives."
    ]),
    functionalRequirements: toUniqueItems(
      pick(SECTION_PATTERNS.requirements, 18),
      [
        "Implement required functionality described in the RFP."
      ]
    ),
    technicalRequirements: toUniqueItems(
      pick(SECTION_PATTERNS.requirements, 18),
      [
        "Provide enterprise-grade architecture and integrations."
      ]
    ),
    scopeItems: toUniqueItems(pick(SECTION_PATTERNS.scope, 12), [
      "Discovery, design, development, testing, deployment, and operational handover."
    ]),
    constraints: toUniqueItems(pick(SECTION_PATTERNS.constraints, 10), [
      "Timeline, budget, compliance, and stakeholder availability constraints."
    ]),
    deliverables: toUniqueItems(pick(/deliverables?|submission|documentation|training|deployment/i, 10), [
      "Production-ready solution",
      "Technical documentation",
      "Deployment and handover package"
    ]),
    risks: toUniqueItems(pick(SECTION_PATTERNS.risks, 8), [
      "Requirements ambiguity",
      "Integration dependencies",
      "Schedule compression"
    ]),
    timelineInformation: [],

    budgetInformation: [],

    evaluationCriteria: [],

    resourceRequirements: [],

    proposalInsights: {
      ceo: [],
      cto: [],
      pm: [],
      finance: [],
      hr: []
    }, 
  };
}

/**
 * Creates a short source summary from the highest-signal opening content.
 */
function summarize(text: string): string {
  const sentences = text.split(/(?<=\.)\s+/).filter((sentence) => sentence.length > 30);
  return sentences.slice(0, 4).join(" ").slice(0, 1200);
}

/**
 * Infers a likely client name from common RFP language.
 */
function inferClientName(text: string): string {
  const match = text.match(/(?:prepared for|client|issued by|organization|agency)[:\s]+([A-Z][A-Za-z0-9&,\-. ]{2,80})/i);
  return match?.[1]?.split(/\n/)[0].trim() ?? "Client";
}

/**
 * Normalizes a title-like string for display in the final proposal.
 */
function cleanTitle(title: string): string {
  return title.replace(/\s+/g, " ").replace(/^request for proposal[:\s-]*/i, "").slice(0, 120);
}
