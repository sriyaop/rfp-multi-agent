import { RfpAnalysis } from "@/lib/types";

export type ProjectComplexity = "Low" | "Medium" | "High";

export interface ProjectSignals {
  text: string;
  requirementCount: number;
  complexity: ProjectComplexity;
  domain: "erp" | "website" | "mobile" | "data" | "general";
  integrationCount: number;
  complianceCount: number;
  suggestedTeamSize: number;
  suggestedTimelineWeeks: number;
}

export function getProjectSignals(rfp: RfpAnalysis): ProjectSignals {
  const allItems = [
    rfp.projectName,
    rfp.executiveSummary,
    ...rfp.businessObjectives,
    ...rfp.functionalRequirements,
    ...rfp.technicalRequirements,
    ...rfp.scopeItems,
    ...rfp.constraints,
    ...rfp.timelineInformation,
    ...rfp.budgetInformation,
    ...rfp.evaluationCriteria,
    ...rfp.resourceRequirements,
    ...rfp.risks
  ];

  const text = allItems.join(" ").toLowerCase();
  const requirementCount =
    rfp.functionalRequirements.length +
    rfp.technicalRequirements.length +
    rfp.scopeItems.length;
  const integrationCount = countMatches(text, [
    "integration",
    "api",
    "interface",
    "migration",
    "third-party",
    "legacy",
    "sso",
    "payment",
    "erp"
  ]);
  const complianceCount = countMatches(text, [
    "security",
    "accessibility",
    "compliance",
    "audit",
    "privacy",
    "ada",
    "wcag",
    "soc",
    "hipaa"
  ]);

  const domain = inferDomain(text);
  const explicitWeeks = extractWeeks(rfp.timelineInformation.join(" "));
  const complexityScore =
    requirementCount +
    integrationCount * 3 +
    complianceCount * 2 +
    (domain === "erp" ? 12 : 0) +
    (domain === "data" ? 6 : 0);

  const complexity: ProjectComplexity =
    complexityScore >= 42 ? "High" : complexityScore >= 20 ? "Medium" : "Low";
  const suggestedTeamSize =
    complexity === "High" ? 10 : complexity === "Medium" ? 7 : 4;
  const baseTimeline =
    complexity === "High" ? 40 : complexity === "Medium" ? 28 : 18;
  const suggestedTimelineWeeks =
    explicitWeeks ?? baseTimeline + Math.min(10, Math.floor(integrationCount / 2));

  return {
    text,
    requirementCount,
    complexity,
    domain,
    integrationCount,
    complianceCount,
    suggestedTeamSize,
    suggestedTimelineWeeks
  };
}

export function pickRelevantItems(items: string[], fallback: string[], limit = 6): string[] {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  return (cleaned.length > 0 ? cleaned : fallback).slice(0, limit);
}

function inferDomain(text: string): ProjectSignals["domain"] {
  if (/\berp\b|accounting|finance|procurement|payroll|asset management|grant/.test(text)) {
    return "erp";
  }

  if (/website|cms|content management|search|web redesign|accessibility/.test(text)) {
    return "website";
  }

  if (/mobile|ios|android/.test(text)) {
    return "mobile";
  }

  if (/analytics|dashboard|data warehouse|reporting|business intelligence/.test(text)) {
    return "data";
  }

  return "general";
}

function countMatches(text: string, terms: string[]): number {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

function extractWeeks(text: string): number | undefined {
  const weekMatch = text.match(/(\d{2,3})\s*(?:week|weeks)/i);

  if (weekMatch) {
    return Number(weekMatch[1]);
  }

  const monthMatch = text.match(/(\d{1,2})\s*(?:month|months)/i);

  if (monthMatch) {
    return Number(monthMatch[1]) * 4;
  }

  return undefined;
}
