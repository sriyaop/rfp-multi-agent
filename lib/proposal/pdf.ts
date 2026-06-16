import { Proposal, RfpAnalysis } from "@/lib/types";
import { usd } from "@/lib/utils";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const LINE_HEIGHT = 14;
const BODY_WIDTH = 88;

interface PdfPage {
  lines: string[];
}

interface PdfWriter {
  pages: PdfPage[];
  current: PdfPage;
}

/**
 * Renders the proposal in the response-form structure used by the supplied RFP template.
 * This intentionally avoids pdfkit so Next.js does not need runtime font metric files.
 */
export async function renderPdf(
  proposal: Proposal,
  rfp?: RfpAnalysis
): Promise<Buffer> {
  const writer = createWriter();

  cover(writer, proposal, rfp);
  section(writer, "1. About the Respondent");
  paragraph(writer, "Our profile");
  rows(writer, [
    ["Trading name", "[insert trading name]"],
    ["Full legal name", "[insert full legal name]"],
    ["Physical address", "[insert head office address]"],
    ["Postal address", "[insert postal address]"],
    ["Business website", "[insert website]"],
    ["Type of entity", "[insert legal status]"],
    ["Country of residence", "[insert country]"]
  ]);
  paragraph(writer, "Our Point of Contact");
  rows(writer, [
    ["Contact person", "[insert contact person]"],
    ["Position", "[insert title]"],
    ["Phone number", "[insert phone]"],
    ["Mobile number", "[insert mobile]"],
    ["Email address", "[insert email]"]
  ]);

  section(writer, "2. Response to the Requirements");
  heading(writer, "Overview of our solution");
  paragraph(writer, proposal.proposedSolution);
  heading(writer, "Questions relating to the evaluation criteria");
  heading(writer, "1. Fit for purpose / proposed solution - Weighting 40%");
  question(writer, "Explain how your goods and services meet or exceed our Requirements.");
  paragraph(writer, proposal.clientUnderstanding);
  bullets(writer, proposal.complianceMatrix.slice(0, 8).map((item) => `${item.requirement} - ${item.status}. ${item.notes}`));
  question(writer, "Describe how you measure quality in meeting or exceeding our Requirements.");
  bullets(writer, [
    `Cross-agent consistency checks: ${proposal.consistencyChecks.length} validation checks recorded.`,
    `Proposal confidence score: ${proposal.confidenceScore}%.`,
    "Agent review cycle validates scope, architecture, budget, timeline and risk alignment before proposal compilation."
  ]);
  question(writer, "Describe any new ideas or processes you offer which are innovative.");
  bullets(writer, [
    "AI-assisted RFP analysis converts unstructured RFP content into structured requirement, risk, timeline and budget signals.",
    "CEO-led specialist agents collaborate across product, architecture, resource planning, cost, timeline and risk.",
    proposal.roi.summary
  ]);
  question(writer, "Describe all significant risks associated with your solution and how you propose to mitigate them.");
  paragraph(writer, proposal.riskAssessment.riskSummary);
  bullets(writer, [
    ...proposal.riskAssessment.technicalRisks.slice(0, 3).map((risk) => `Technical: ${risk}`),
    ...proposal.riskAssessment.deliveryRisks.slice(0, 3).map((risk) => `Delivery: ${risk}`),
    ...proposal.riskAssessment.mitigations.slice(0, 5).map((risk) => `Mitigation: ${risk}`)
  ]);

  heading(writer, "2. Capability of the Respondent to deliver - Weighting 30%");
  question(writer, "Describe how you will plan to deliver the Requirements.");
  paragraph(writer, proposal.implementationMethodology);
  bullets(writer, proposal.timeline.phases.map((phase) => `${phase.name}: ${phase.weeks} weeks - ${phase.output}`));
  question(writer, "List the relevant qualifications and experience of named personnel to deliver the Requirements.");
  bullets(writer, proposal.resourcePlan.teamComposition.map((item) => `${item.role}: ${item.fte} FTE for ${item.months} months`));
  question(writer, "Describe the track record of the named personnel in delivering similar goods/services.");
  paragraph(writer, "Named personnel and case references should be inserted by the respondent before submission. The proposed delivery model is sized to the RFP complexity and required delivery coverage.");

  heading(writer, "3. Capacity of the Respondent to deliver - Weighting 30%");
  question(writer, "Describe your organisation's size, structure and annual turnover.");
  rows(writer, [
    ["Total FTE", `${proposal.resourcePlan.totalFte}`],
    ["Effort", `${proposal.resourcePlan.effortPersonMonths} person-months`],
    ["Estimated hours", proposal.resourcePlan.estimatedHours.toLocaleString()],
    ["Delivery duration", `${proposal.timeline.durationWeeks} weeks`]
  ]);
  question(writer, "How will you manage this account if successful?");
  bullets(writer, [
    "Single accountable point of contact for buyer communications.",
    "Phase-based governance aligned to milestones, deliverables and acceptance checkpoints.",
    "Regular reporting against schedule, risks, budget and compliance coverage."
  ]);
  question(writer, "Please explain your reporting tools and attach relevant reports.");
  bullets(writer, [
    "Milestone status report",
    "Risk and issue register",
    "Budget and effort tracking report",
    "Compliance coverage matrix"
  ]);
  heading(writer, "Assumptions");
  bullets(writer, [
    ...proposal.assumptions.slice(0, 8),
    ...(rfp?.constraints.slice(0, 4).map((constraint) => `RFP constraint: ${constraint}`) ?? [])
  ]);

  section(writer, "3. Price");
  heading(writer, "Pricing schedule");
  rows(writer, [
    ["Development cost", usd(proposal.costEstimate.developmentCost)],
    ["Infrastructure cost", usd(proposal.costEstimate.infrastructureCost)],
    ["Licensing cost", usd(proposal.costEstimate.licensingCost)],
    ["Support cost", usd(proposal.costEstimate.supportCost)],
    ["Contingency", usd(proposal.costEstimate.contingencyCost)],
    ["Total budget", usd(proposal.costEstimate.totalBudget)]
  ]);
  heading(writer, "Assumptions");
  bullets(writer, proposal.costEstimate.pricingAssumptions);
  heading(writer, "Payment milestones");
  bullets(writer, proposal.costEstimate.paymentMilestones);

  section(writer, "4. Proposed Contract");
  paragraph(writer, "Having read and understood the Proposed Contract, the respondent confirms that the terms and conditions are acceptable, subject to any negotiated clarifications recorded below.");
  rows(writer, [
    ["Clause", "Concern", "Proposed solution"],
    ["[insert number]", "[insert concern or not applicable]", "[insert proposed wording or not applicable]"]
  ]);

  section(writer, "5. Referees");
  paragraph(writer, "Please supply the details of two work-related referees for the respondent organisation.");
  rows(writer, [
    ["First referee", ""],
    ["Name of referee", "[insert name]"],
    ["Name of organisation", "[insert organisation]"],
    ["Goods/services provided", "[insert description]"],
    ["Date of provision", "[insert date]"],
    ["Telephone", "[insert phone]"],
    ["Email", "[insert email]"],
    ["Second referee", ""],
    ["Name of referee", "[insert name]"],
    ["Name of organisation", "[insert organisation]"],
    ["Goods/services provided", "[insert description]"],
    ["Date of provision", "[insert date]"],
    ["Telephone", "[insert phone]"],
    ["Email", "[insert email]"]
  ]);

  section(writer, "6. Our Declaration");
  rows(writer, [
    ["RFP Process, Terms and Conditions", "[acknowledged]"],
    ["Collection of further information", "[agree / disagree]"],
    ["Requirements", "[agree / disagree]"],
    ["Ethics", "[agree / disagree]"],
    ["Offer Validity Period", "[agree / disagree]"],
    ["Conflict of Interest declaration", "[agree / disagree]"],
    ["Details of conflict of interest", "[not applicable / insert details]"]
  ]);
  heading(writer, "Declaration");
  paragraph(writer, "The respondent declares that the information provided is true, accurate, complete and not misleading in any material respect, and that appropriate authorisations have been secured to submit this proposal.");
  rows(writer, [
    ["Signature", ""],
    ["Full name", ""],
    ["Title / position", ""],
    ["Name of organisation", ""],
    ["Date", ""]
  ]);

  section(writer, "Appendix 1: Health & Safety");
  rows(writer, [
    ["Written health and safety policy", "[Yes / No - attach policy if applicable]"],
    ["Policy signed by managing director or equivalent", "[Yes / No]"],
    ["Health and safety certifications", "[insert details]"],
    ["Senior manager in charge of health and safety", "[insert name]"],
    ["Formal health and safety training", "[insert training approach]"],
    ["Accident register maintained", "[Yes / No]"],
    ["Hazard register maintained", "[Yes / No]"],
    ["Emergency procedures plan", "[Yes / No]"],
    ["Formal risk/hazard assessments", "[Yes / No]"]
  ]);
  heading(writer, "Project-specific health and safety considerations");
  bullets(writer, [
    ...proposal.riskAssessment.complianceRisks.slice(0, 5),
    ...proposal.riskAssessment.mitigations.slice(0, 5)
  ]);
  rows(writer, [
    ["Completed by", ""],
    ["Position", ""],
    ["Date", ""],
    ["Signature", ""]
  ]);

  addPageFooters(writer);

  return Buffer.from(buildPdf(writer.pages), "utf-8");
}

function createWriter(): PdfWriter {
  const firstPage = { lines: [] };
  return {
    pages: [firstPage],
    current: firstPage
  };
}

function cover(
  writer: PdfWriter,
  proposal: Proposal,
  rfp?: RfpAnalysis
) {
  line(writer, "[insert your organisation name and logo or branding]");
  blank(writer, 3);
  line(writer, "Response Form");
  line(writer, "In response to Request for Proposals");
  blank(writer, 2);
  line(writer, `By: ${rfp?.clientName ?? "Buyer identified in the uploaded RFP"}`);
  line(writer, `For: ${rfp?.projectName ?? "Project identified in the uploaded RFP"}`);
  line(writer, `Reference: ${rfp?.evaluationCriteria[0] ?? "Refer to RFP reference"}`);
  line(writer, `Date of this Proposal: ${new Date().toLocaleDateString()}`);
  line(writer, `Confidence Score: ${proposal.confidenceScore}%`);
  blank(writer);
  paragraph(writer, "This response follows the supplied RFP response form sequence: respondent profile, requirements response, price, proposed contract, referees, declaration, and health and safety appendix.");
}

function section(writer: PdfWriter, title: string) {
  newPage(writer);
  line(writer, title.toUpperCase());
  blank(writer);
}

function heading(writer: PdfWriter, title: string) {
  blank(writer);
  line(writer, title);
}

function question(writer: PdfWriter, text: string) {
  blank(writer);
  paragraph(writer, text);
}

function paragraph(writer: PdfWriter, text: string) {
  for (const part of clean(text).split("\n")) {
    const trimmed = part.trim();
    if (!trimmed) {
      blank(writer);
      continue;
    }

    wrap(trimmed, BODY_WIDTH).forEach((wrapped) => line(writer, wrapped));
  }
  blank(writer);
}

function bullets(writer: PdfWriter, items: string[]) {
  const cleanItems = items.map(clean).filter(Boolean);

  if (cleanItems.length === 0) {
    paragraph(writer, "Not specified in the generated proposal.");
    return;
  }

  for (const item of cleanItems) {
    wrap(`- ${item}`, BODY_WIDTH).forEach((wrapped) => line(writer, wrapped));
  }
  blank(writer);
}

function rows(writer: PdfWriter, data: string[][]) {
  for (const row of data) {
    const text = row
      .map((cell) => clean(cell))
      .join(" | ");

    wrap(text, BODY_WIDTH).forEach((wrapped) => line(writer, wrapped));
  }
  blank(writer);
}

function line(writer: PdfWriter, text: string) {
  if (writer.current.lines.length >= 52) {
    newPage(writer);
  }

  writer.current.lines.push(text);
}

function blank(writer: PdfWriter, count = 1) {
  for (let index = 0; index < count; index += 1) {
    line(writer, "");
  }
}

function newPage(writer: PdfWriter) {
  const page = { lines: [] };
  writer.pages.push(page);
  writer.current = page;
}

function addPageFooters(writer: PdfWriter) {
  writer.pages.forEach((page, index) => {
    while (page.lines.length < 54) {
      page.lines.push("");
    }
    page.lines.push(`Page ${index + 1} of ${writer.pages.length}`);
  });
}

function buildPdf(pages: PdfPage[]): string {
  const pageObjectStart = 4;
  const contentObjectStart = pageObjectStart + pages.length;
  const pageObjectNumbers = pages.map((_, index) => pageObjectStart + index);
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];

  pages.forEach((_, index) => {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectStart + index} 0 R >>`);
  });

  pages.forEach((page) => {
    objects.push(streamObject(renderPageText(page)));
  });

  return serializePdf(objects);
}

function renderPageText(page: PdfPage): string {
  const commands = [
    "BT",
    "/F1 10 Tf",
    `${MARGIN} ${PAGE_HEIGHT - MARGIN} Td`,
    `${LINE_HEIGHT} TL`
  ];

  page.lines.forEach((text, index) => {
    if (index > 0) {
      commands.push("T*");
    }
    commands.push(`(${escapePdfText(text)}) Tj`);
  });

  commands.push("ET");
  return commands.join("\n");
}

function streamObject(content: string): string {
  return `<< /Length ${Buffer.byteLength(content, "utf-8")} >>\nstream\n${content}\nendstream`;
}

function serializePdf(objects: string[]): string {
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(chunks.join(""), "utf-8"));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(chunks.join(""), "utf-8");
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");

  offsets.slice(1).forEach((offset) => {
    chunks.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  });

  chunks.push(`trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return chunks.join("");
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (`${current} ${word}`.trim().length > width) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
}

function clean(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
