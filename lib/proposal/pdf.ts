import PDFDocument from "pdfkit/js/pdfkit.standalone";

import { Proposal, RfpAnalysis } from "@/lib/types";
import { usd } from "@/lib/utils";

const COLORS = {
  ink: "#1f2937",
  muted: "#5b677a",
  navy: "#17324d",
  teal: "#0f766e",
  gold: "#b7791f",
  line: "#d8dee8",
  softTeal: "#edf7f6",
  softGold: "#fff7e6",
  softGray: "#f5f7fb",
  white: "#ffffff"
};

const PAGE = {
  marginX: 48,
  top: 64,
  bottom: 58,
  width: 595.28,
  height: 841.89
};

type PdfDoc = PDFKit.PDFDocument;

interface TableColumn {
  label: string;
  width: number;
}

interface StatCard {
  label: string;
  value: string;
  accent: string;
}

/**
 * Renders a polished, submission-oriented proposal PDF.
 */
export async function renderPdf(
  proposal: Proposal,
  rfp?: RfpAnalysis
): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE.marginX,
      bufferPages: true,
      info: {
        Title: `${rfp?.projectName ?? "RFP"} Proposal`,
        Author: "Autonomous RFP Proposal Generator",
        Subject: "Generated proposal response"
      }
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("pageAdded", () => {
      drawPageHeader(doc, rfp);
      doc.y = PAGE.top + 28;
    });

    cover(doc, proposal, rfp);
    doc.addPage();
    executiveSnapshot(doc, proposal, rfp);
    respondentProfile(doc, rfp);
    requirementsResponse(doc, proposal, rfp);
    deliveryPlan(doc, proposal);
    technicalPlan(doc, proposal);
    riskPlan(doc, proposal);
    pricing(doc, proposal);
    governanceAndContract(doc, proposal, rfp);
    appendices(doc, proposal);

    addFooters(doc, rfp);
    doc.end();
  });
}

function cover(doc: PdfDoc, proposal: Proposal, rfp?: RfpAnalysis) {
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLORS.white);
  doc.rect(0, 0, PAGE.width, 190).fill(COLORS.navy);
  doc.rect(0, 190, PAGE.width, 6).fill(COLORS.teal);
  doc.rect(0, 196, PAGE.width, 3).fill(COLORS.gold);

  doc
    .fillColor(COLORS.white)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("PROPOSAL RESPONSE", PAGE.marginX, 54, { characterSpacing: 0.4 });

  doc
    .fontSize(25)
    .text(rfp?.projectName ?? "Generated RFP Proposal", PAGE.marginX, 88, {
      width: 430,
      lineGap: 4
    });

  doc
    .font("Helvetica")
    .fontSize(12)
    .fillColor("#dfeaf3")
    .text(`Prepared for ${rfp?.clientName ?? "the requesting organization"}`, PAGE.marginX, 152, {
      width: 430
    });

  doc.y = 238;
  callout(
    doc,
    "Submission Overview",
    "This proposal consolidates RFP-derived requirements, solution design, implementation approach, timeline, cost, risk controls, and governance into a response-ready document. Administrative items that require legal confirmation are marked clearly for final sign-off rather than left blank.",
    COLORS.softTeal
  );

  stats(doc, [
    {
      label: "Confidence",
      value: `${proposal.confidenceScore}%`,
      accent: COLORS.teal
    },
    {
      label: "Delivery",
      value: `${proposal.timeline.durationWeeks} weeks`,
      accent: COLORS.gold
    },
    {
      label: "Budget",
      value: usd(proposal.costEstimate.totalBudget),
      accent: COLORS.navy
    }
  ]);

  doc.moveDown(1.2);
  table(doc, [
    { label: "Field", width: 150 },
    { label: "Response", width: 340 }
  ], [
    ["Client", cleanText(rfp?.clientName, "Requesting organization identified in the RFP")],
    ["Project", cleanText(rfp?.projectName, "Project identified in the uploaded RFP")],
    ["Proposal date", new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })],
    ["Evaluation focus", first(rfp?.evaluationCriteria, "Solution quality, delivery capability, capacity, and price")],
    ["Bid recommendation", firstLine(proposal.bidRecommendation, "Proceed")]
  ]);
}

function executiveSnapshot(doc: PdfDoc, proposal: Proposal, rfp?: RfpAnalysis) {
  section(doc, "1. Executive Summary", "Grounded response derived from the uploaded RFP");
  paragraph(doc, proposal.executiveSummary);

  subheading(doc, "Client Priorities");
  bullets(doc, rfp?.businessObjectives.slice(0, 6) ?? []);

  subheading(doc, "Recommended Solution");
  paragraph(doc, proposal.proposedSolution);

  subheading(doc, "Proof-of-Concept Productivity Signal");
  callout(doc, "ROI Summary", proposal.roi.summary, COLORS.softGold);
}

function respondentProfile(doc: PdfDoc, rfp?: RfpAnalysis) {
  section(doc, "2. Respondent Profile", "Administrative details for final submission review");
  paragraph(
    doc,
    "The generated proposal is prepared by the response team for final review by the authorized respondent organization. Corporate identifiers, officer names, and signature authority should be confirmed before formal submission."
  );

  table(doc, [
    { label: "Profile Item", width: 170 },
    { label: "Proposal Response", width: 320 }
  ], [
    ["Trading name", "Response team organization - confirm legal display name before submission"],
    ["Full legal name", "To be finalized by authorized signatory"],
    ["Address", "Registered/head office address to be confirmed"],
    ["Website", "Corporate website to be confirmed"],
    ["Entity type", "Legal entity status to be confirmed"],
    ["Primary contact", "Proposal owner / account lead to be assigned"],
    ["Email", "Commercial contact email to be confirmed"],
    ["Buyer organization", cleanText(rfp?.clientName, "Requesting organization")]
  ]);
}

function requirementsResponse(doc: PdfDoc, proposal: Proposal, rfp?: RfpAnalysis) {
  section(doc, "3. Response To Requirements", "Fit for purpose, quality, innovation, and compliance coverage");

  subheading(doc, "Understanding Of Need");
  paragraph(doc, proposal.clientUnderstanding);

  subheading(doc, "Compliance Matrix");
  const complianceRows = proposal.complianceMatrix.slice(0, 12).map((item) => [
    item.requirement,
    item.status,
    item.notes
  ]);
  table(doc, [
    { label: "Requirement", width: 285 },
    { label: "Status", width: 70 },
    { label: "Response Notes", width: 135 }
  ], complianceRows.length ? complianceRows : [["No extracted requirement", "Review", "Confirm scope with buyer"]]);

  subheading(doc, "Innovation And Quality Controls");
  bullets(doc, [
    "AI-assisted RFP analysis transforms unstructured RFP content into structured requirement, scope, timeline, budget, and risk signals.",
    "Specialist agents validate solution, delivery, resource, cost, timeline, and risk alignment before final proposal assembly.",
    `Cross-agent validation recorded ${proposal.consistencyChecks.length} consistency checks with a ${proposal.confidenceScore}% confidence score.`,
    proposal.roi.summary
  ]);

  subheading(doc, "RFP Constraints Addressed");
  bullets(doc, rfp?.constraints.slice(0, 6) ?? []);
}

function deliveryPlan(doc: PdfDoc, proposal: Proposal) {
  section(doc, "4. Delivery Capability And Capacity", "Implementation model, team structure, and milestones");

  subheading(doc, "Implementation Methodology");
  paragraph(doc, proposal.implementationMethodology);

  subheading(doc, "Timeline");
  table(doc, [
    { label: "Phase", width: 170 },
    { label: "Duration", width: 80 },
    { label: "Output", width: 240 }
  ], proposal.timeline.phases.map((phase) => [
    phase.name,
    `${phase.weeks} weeks`,
    phase.output
  ]));

  subheading(doc, "Resource Plan");
  table(doc, [
    { label: "Role", width: 250 },
    { label: "FTE", width: 80 },
    { label: "Months", width: 80 },
    { label: "Coverage", width: 80 }
  ], proposal.resourcePlan.teamComposition.map((item) => [
    item.role,
    String(item.fte),
    String(item.months),
    "Planned"
  ]));

  stats(doc, [
    { label: "Total FTE", value: String(proposal.resourcePlan.totalFte), accent: COLORS.teal },
    { label: "Person Months", value: String(proposal.resourcePlan.effortPersonMonths), accent: COLORS.gold },
    { label: "Estimated Hours", value: proposal.resourcePlan.estimatedHours.toLocaleString(), accent: COLORS.navy }
  ]);
}

function technicalPlan(doc: PdfDoc, proposal: Proposal) {
  section(doc, "5. Technical Solution", "Architecture, platform choices, and operating model");

  paragraph(doc, proposal.technicalArchitecture.architectureOverview);

  twoColumnLists(doc, "Technology Stack", proposal.technicalArchitecture.techStack, "Security And Operations", [
    ...proposal.technicalArchitecture.securityArchitecture.slice(0, 5),
    ...proposal.technicalArchitecture.monitoringStrategy.slice(0, 4)
  ]);

  subheading(doc, "Architecture Rationale");
  bullets(doc, proposal.technicalArchitecture.architectureRationale.slice(0, 8));
}

function riskPlan(doc: PdfDoc, proposal: Proposal) {
  section(doc, "6. Risk Management", "Significant risks and proposed mitigations");

  callout(doc, "Risk Summary", proposal.riskAssessment.riskSummary, COLORS.softGray);

  twoColumnLists(doc, "Key Risks", [
    ...proposal.riskAssessment.technicalRisks.slice(0, 4),
    ...proposal.riskAssessment.deliveryRisks.slice(0, 4),
    ...proposal.riskAssessment.budgetRisks.slice(0, 3)
  ], "Mitigations", proposal.riskAssessment.mitigations.slice(0, 8));
}

function pricing(doc: PdfDoc, proposal: Proposal) {
  section(doc, "7. Price", "Budget estimate and commercial assumptions");

  table(doc, [
    { label: "Cost Item", width: 300 },
    { label: "Amount", width: 190 }
  ], [
    ["Development cost", usd(proposal.costEstimate.developmentCost)],
    ["Infrastructure cost", usd(proposal.costEstimate.infrastructureCost)],
    ["Licensing cost", usd(proposal.costEstimate.licensingCost)],
    ["Support cost", usd(proposal.costEstimate.supportCost)],
    ["Contingency", usd(proposal.costEstimate.contingencyCost)],
    ["Total budget", usd(proposal.costEstimate.totalBudget)]
  ], { emphasizeLastRow: true });

  subheading(doc, "Pricing Assumptions");
  bullets(doc, proposal.costEstimate.pricingAssumptions);

  subheading(doc, "Payment Milestones");
  bullets(doc, proposal.costEstimate.paymentMilestones);
}

function governanceAndContract(doc: PdfDoc, proposal: Proposal, rfp?: RfpAnalysis) {
  section(doc, "8. Governance, Contract, And Declaration", "Account management and final confirmations");

  subheading(doc, "Account Management");
  bullets(doc, [
    "Single accountable point of contact for buyer communications and commercial coordination.",
    "Phase-based governance aligned to milestones, deliverables, risks, acceptance criteria, and budget tracking.",
    "Regular progress reporting through milestone status, risk/issue register, budget tracking, and compliance coverage updates."
  ]);

  subheading(doc, "Contract Position");
  table(doc, [
    { label: "Area", width: 170 },
    { label: "Response", width: 320 }
  ], [
    ["Proposed contract", "Acceptable subject to legal review and agreed clarifications before signature"],
    ["Conflicts of interest", "No conflict identified from the generated RFP context; final respondent to confirm"],
    ["Offer validity", "To align with RFP conditions and final commercial approval"],
    ["Buyer", cleanText(rfp?.clientName, "Requesting organization")],
    ["Declaration", "Information to be reviewed and certified by authorized signatory before submission"]
  ]);

  subheading(doc, "Assumptions");
  bullets(doc, proposal.assumptions.slice(0, 10));
}

function appendices(doc: PdfDoc, proposal: Proposal) {
  section(doc, "9. Appendices", "Supporting references for final submission");

  subheading(doc, "Referees");
  table(doc, [
    { label: "Referee Item", width: 170 },
    { label: "Response", width: 320 }
  ], [
    ["Reference 1", "Relevant work-related referee to be selected by respondent"],
    ["Reference 2", "Relevant work-related referee to be selected by respondent"],
    ["Services provided", "Comparable services and project evidence to be attached where permitted"],
    ["Contact details", "To be confirmed before formal submission"]
  ]);

  subheading(doc, "Health And Safety");
  table(doc, [
    { label: "Item", width: 250 },
    { label: "Response", width: 240 }
  ], [
    ["Written health and safety policy", "Final respondent to attach current policy if required"],
    ["Senior manager responsible", "To be confirmed by respondent"],
    ["Risk and hazard assessment", "Project risks addressed through risk register and delivery governance"],
    ["Emergency procedures", "To follow respondent policy and buyer site requirements"],
    ["Project-specific considerations", "Compliance risks and mitigations listed below"]
  ]);

  bullets(doc, [
    ...proposal.riskAssessment.complianceRisks.slice(0, 5),
    ...proposal.riskAssessment.mitigations.slice(0, 5)
  ]);
}

function section(doc: PdfDoc, title: string, subtitle: string) {
  ensureSpace(doc, 92);
  const y = doc.y;
  doc
    .roundedRect(PAGE.marginX, y, 499, 54, 5)
    .fill(COLORS.navy);
  doc
    .rect(PAGE.marginX, y + 50, 499, 4)
    .fill(COLORS.teal);
  doc
    .fillColor(COLORS.white)
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(title.toUpperCase(), PAGE.marginX + 16, y + 11, { width: 467 });
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#dce8f2")
    .text(subtitle, PAGE.marginX + 16, y + 32, { width: 467 });
  doc.y = y + 72;
}

function subheading(doc: PdfDoc, title: string) {
  ensureSpace(doc, 36);
  doc.moveDown(0.5);
  const y = doc.y;
  doc
    .rect(PAGE.marginX, y + 3, 4, 15)
    .fill(COLORS.gold);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.navy)
    .text(title, PAGE.marginX + 12, y, { width: 480 });
  doc.y = y + 23;
}

function paragraph(doc: PdfDoc, value: string) {
  const text = normalize(value);
  if (!text) {
    return;
  }

  ensureSpace(doc, Math.min(130, doc.heightOfString(text, { width: 490 }) + 12));
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(COLORS.ink)
    .text(text, PAGE.marginX, doc.y, {
      width: 490,
      lineGap: 3
    });
  doc.moveDown(0.8);
}

function bullets(doc: PdfDoc, items: string[]) {
  const cleanItems = items.map(normalize).filter(Boolean);
  const displayItems = cleanItems.length
    ? cleanItems
    : ["No specific item was extracted from the uploaded RFP; confirm during final review."];

  displayItems.forEach((item) => {
    const height = Math.max(18, doc.heightOfString(item, { width: 464 }) + 6);
    ensureSpace(doc, height + 2);
    const y = doc.y + 4;
    doc.circle(PAGE.marginX + 4, y + 3, 2.4).fill(COLORS.teal);
    doc
      .font("Helvetica")
      .fontSize(9.2)
      .fillColor(COLORS.ink)
      .text(item, PAGE.marginX + 16, doc.y, {
        width: 464,
        lineGap: 2
      });
    doc.moveDown(0.45);
  });
  doc.moveDown(0.3);
}

function table(
  doc: PdfDoc,
  columns: TableColumn[],
  rows: string[][],
  options: { emphasizeLastRow?: boolean } = {}
) {
  const x = PAGE.marginX;
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const rowPadding = 8;
  const headerHeight = 24;

  ensureSpace(doc, headerHeight + 24);
  let y = doc.y;

  doc.roundedRect(x, y, tableWidth, headerHeight, 4).fill(COLORS.navy);
  let cursorX = x;
  columns.forEach((column) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(COLORS.white)
      .text(column.label.toUpperCase(), cursorX + rowPadding, y + 8, {
        width: column.width - rowPadding * 2
      });
    cursorX += column.width;
  });
  y += headerHeight;

  const safeRows = rows.length ? rows : [["No data available"]];
  safeRows.forEach((row, rowIndex) => {
    const rowHeight = Math.max(
      30,
      ...columns.map((column, columnIndex) =>
        doc.heightOfString(normalize(row[columnIndex] ?? ""), {
          width: column.width - rowPadding * 2
        }) + rowPadding * 2
      )
    );

    if (y + rowHeight > PAGE.height - PAGE.bottom) {
      doc.addPage();
      y = doc.y;
      doc.roundedRect(x, y, tableWidth, headerHeight, 4).fill(COLORS.navy);
      let headerX = x;
      columns.forEach((column) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(COLORS.white)
          .text(column.label.toUpperCase(), headerX + rowPadding, y + 8, {
            width: column.width - rowPadding * 2
          });
        headerX += column.width;
      });
      y += headerHeight;
    }

    const isEmphasized = options.emphasizeLastRow && rowIndex === safeRows.length - 1;
    doc.rect(x, y, tableWidth, rowHeight).fill(isEmphasized ? COLORS.softGold : rowIndex % 2 === 0 ? COLORS.white : COLORS.softGray);
    doc.rect(x, y, tableWidth, rowHeight).strokeColor(COLORS.line).lineWidth(0.5).stroke();

    cursorX = x;
    columns.forEach((column, columnIndex) => {
      doc
        .font(isEmphasized ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8.8)
        .fillColor(isEmphasized ? COLORS.navy : COLORS.ink)
        .text(normalize(row[columnIndex] ?? ""), cursorX + rowPadding, y + rowPadding, {
          width: column.width - rowPadding * 2,
          lineGap: 2
        });
      cursorX += column.width;
    });

    y += rowHeight;
  });

  doc.y = y + 14;
}

function twoColumnLists(
  doc: PdfDoc,
  leftTitle: string,
  leftItems: string[],
  rightTitle: string,
  rightItems: string[]
) {
  const gap = 18;
  const width = 236;
  const leftHeight = panelHeight(doc, width, leftItems);
  const rightHeight = panelHeight(doc, width, rightItems);
  ensureSpace(doc, Math.max(leftHeight, rightHeight) + 12);
  const startY = doc.y;
  panelList(doc, PAGE.marginX, startY, width, leftTitle, leftItems);
  panelList(doc, PAGE.marginX + width + gap, startY, width, rightTitle, rightItems);
  doc.y = startY + Math.max(leftHeight, rightHeight) + 14;
}

function panelList(doc: PdfDoc, x: number, y: number, width: number, title: string, items: string[]) {
  const cleanItems = items.map(normalize).filter(Boolean).slice(0, 8);
  const height = panelHeight(doc, width, items);
  doc.roundedRect(x, y, width, height, 5).fill(COLORS.softGray);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.navy)
    .text(title, x + 14, y + 14, { width: width - 28 });

  let itemY = y + 38;
  (cleanItems.length ? cleanItems : ["Confirm during final review."]).forEach((item) => {
    doc.circle(x + 17, itemY + 5, 2.1).fill(COLORS.teal);
    doc
      .font("Helvetica")
      .fontSize(8.6)
      .fillColor(COLORS.ink)
      .text(item, x + 27, itemY, {
        width: width - 40,
        lineGap: 1.5
      });
    itemY = doc.y + 8;
  });
}

function panelHeight(doc: PdfDoc, width: number, items: string[]) {
  const cleanItems = items.map(normalize).filter(Boolean).slice(0, 8);
  return Math.max(
    136,
    48 +
      cleanItems.reduce(
        (sum, item) => sum + doc.heightOfString(item, { width: width - 34 }) + 10,
        0
      )
  );
}

function callout(doc: PdfDoc, title: string, text: string, fill: string) {
  const body = normalize(text);
  const height = Math.max(78, doc.heightOfString(body, { width: 458 }) + 46);
  ensureSpace(doc, height + 8);

  const y = doc.y;
  doc.roundedRect(PAGE.marginX, y, 499, height, 6).fill(fill);
  doc.rect(PAGE.marginX, y, 5, height).fill(COLORS.teal);
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(COLORS.navy)
    .text(title, PAGE.marginX + 18, y + 14, { width: 465 });
  doc
    .font("Helvetica")
    .fontSize(9.2)
    .fillColor(COLORS.ink)
    .text(body, PAGE.marginX + 18, y + 34, {
      width: 458,
      lineGap: 2
    });
  doc.y = y + height + 16;
}

function stats(doc: PdfDoc, cards: StatCard[]) {
  ensureSpace(doc, 92);
  const gap = 12;
  const width = (499 - gap * 2) / 3;
  const y = doc.y;

  cards.forEach((card, index) => {
    const x = PAGE.marginX + index * (width + gap);
    doc.roundedRect(x, y, width, 70, 6).fill(COLORS.softGray);
    doc.rect(x, y, width, 5).fill(card.accent);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(card.label.toUpperCase(), x + 12, y + 18, {
        width: width - 24
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(card.value.length > 15 ? 12 : 16)
      .fillColor(COLORS.navy)
      .text(card.value, x + 12, y + 36, {
        width: width - 24
      });
  });

  doc.y = y + 86;
}

function drawPageHeader(doc: PdfDoc, rfp?: RfpAnalysis) {
  doc
    .rect(0, 0, PAGE.width, 34)
    .fill(COLORS.navy);
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(COLORS.white)
    .text("RFP PROPOSAL RESPONSE", PAGE.marginX, 12, { width: 180 });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#dce8f2")
    .text(cleanText(rfp?.projectName, "Generated proposal"), PAGE.marginX + 210, 12, {
      width: 285,
      align: "right"
    });
}

function addFooters(doc: PdfDoc, rfp?: RfpAnalysis) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc
      .strokeColor(COLORS.line)
      .lineWidth(0.6)
      .moveTo(PAGE.marginX, PAGE.height - 42)
      .lineTo(PAGE.width - PAGE.marginX, PAGE.height - 42)
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(cleanText(rfp?.clientName, "Generated proposal"), PAGE.marginX, PAGE.height - 31, {
        width: 250
      });
    doc
      .text(`Page ${index + 1} of ${range.count}`, PAGE.width - PAGE.marginX - 120, PAGE.height - 31, {
        width: 120,
        align: "right"
      });
  }
}

function ensureSpace(doc: PdfDoc, height: number) {
  if (doc.y + height > PAGE.height - PAGE.bottom) {
    doc.addPage();
  }
}

function normalize(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[-*]\s+/gm, "")
    .trim();
}

function cleanText(value: string | undefined, fallback: string): string {
  const cleaned = value?.trim();
  return cleaned ? cleaned : fallback;
}

function first(items: string[] | undefined, fallback: string): string {
  return items?.find((item) => item.trim())?.trim() ?? fallback;
}

function firstLine(value: string, fallback: string): string {
  return normalize(value).split("\n").find(Boolean) ?? fallback;
}
