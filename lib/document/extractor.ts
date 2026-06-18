import { RfpAnalysis } from "@/lib/types";
import { toUniqueItems } from "@/lib/utils";

export interface DocumentExtractionResult {
  text: string;
  pageCount?: number;
  characterCount: number;
  quality: "good" | "weak" | "failed";
  warnings: string[];
}

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
  const result = await extractDocumentFromFile(file);
  return result.text;
}

/**
 * Extracts document text together with quality metadata used to prevent empty-RFP hallucinations.
 */
export async function extractDocumentFromFile(file: File): Promise<DocumentExtractionResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let text = "";
  let pageCount: number | undefined;

  if (name.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    text = result.text;
    pageCount = result.numpages;
  } else if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    text = buffer.toString("utf-8");
  } else {
    throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT RFP.");
  }

  return assessExtraction(text, pageCount);
}

function assessExtraction(text: string, pageCount?: number): DocumentExtractionResult {
  const normalized = text.replace(/\s+/g, " ").trim();
  const characterCount = normalized.length;
  const minimumCharacters = pageCount && pageCount > 5 ? 1000 : 400;
  const warnings: string[] = [];

  if (characterCount < minimumCharacters) {
    warnings.push(
      `Only ${characterCount} characters were extracted${pageCount ? ` from ${pageCount} page(s)` : ""}. The file may be scanned, image-based, protected, or unreadable by text extraction.`
    );
  }

  if (pageCount && pageCount >= 10 && characterCount / pageCount < 150) {
    warnings.push(
      "Average extracted text per page is too low for reliable RFP analysis."
    );
  }

  const quality =
    characterCount < 100
      ? "failed"
      : warnings.length > 0
      ? "weak"
      : "good";

  return {
    text,
    pageCount,
    characterCount,
    quality,
    warnings
  };
}

/**
 * Converts raw RFP text into a compact structured analysis for agent planning.
 */
export function analyzeRfpText(
  text: string
): RfpAnalysis {

  const normalized =
    text
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const lines =
    normalized
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 20);

  const title =
    lines.find(
      line =>
        /rfp|request for proposal|proposal/i.test(
          line
        )
    ) ??
    lines[0] ??
    "RFP Project";

  const client =
    inferClientName(
      normalized
    );

  const meaningfulLines =
    lines.filter(line => {

      if (line.length < 25) {
        return false;
      }

      if (line.length > 250) {
        return false;
      }

      if (
        /^[0-9.]+$/.test(line)
      ) {
        return false;
      }

      if (
        /^[A-Z\s]{4,}$/.test(line)
      ) {
        return false;
      }

      if (
        /(requirements?|deliverables?|scope|technical requirements|functional requirements)$/i.test(
          line
        )
      ) {
        return false;
      }

      return true;
    });

  const requirements =
    meaningfulLines
      .filter(line =>
        /must|shall|should|required|support|provide|allow|enable/i.test(
          line
        )
      )
      .slice(0, 25);

  const objectives =
    meaningfulLines
      .filter(line =>
        /objective|goal|business|outcome|purpose/i.test(
          line
        )
      )
      .slice(0, 10);

  const deliverables =
    meaningfulLines
      .filter(line =>
        /deliver|documentation|training|deployment|handover/i.test(
          line
        )
      )
      .slice(0, 12);

  const risks =
    meaningfulLines
      .filter(line =>
        /risk|challenge|dependency|delay|security|compliance/i.test(
          line
        )
      )
      .slice(0, 10);

  const scope =
    meaningfulLines
      .filter(line =>
        /application|platform|system|mobile|portal|dashboard|integration|backend|frontend/i.test(
          line
        )
      )
      .slice(0, 15);

  return {
    clientName: client,

    projectName:
      cleanTitle(title),

    executiveSummary:
      summarize(normalized),

    businessObjectives:
      toUniqueItems(
        objectives,
        [
          "Deliver a business solution aligned with organizational objectives."
        ]
      ),

    functionalRequirements:
      toUniqueItems(
        requirements,
        [
          "Implement required business capabilities."
        ]
      ),

    technicalRequirements:
      toUniqueItems(
        requirements,
        [
          "Provide secure and scalable architecture."
        ]
      ),

    scopeItems:
      toUniqueItems(
        scope,
        [
          "Design, development, testing and deployment."
        ]
      ),

    constraints:
      toUniqueItems(
        meaningfulLines
          .filter(line =>
            /timeline|budget|compliance|security|deadline/i.test(
              line
            )
          )
          .slice(0, 10),
        [
          "Timeline and compliance constraints."
        ]
      ),

    deliverables:
      toUniqueItems(
        deliverables,
        [
          "Production deployment",
          "Documentation",
          "Knowledge transfer"
        ]
      ),

    risks:
      toUniqueItems(
        risks,
        [
          "Schedule risk",
          "Integration risk"
        ]
      ),

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
    }
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
