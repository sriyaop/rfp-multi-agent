import { RfpAnalysis } from "@/lib/types";

export type ProjectComplexity = "Low" | "Medium" | "High";

export interface ProjectSignals {
  text: string;
  requirementCount: number;
  complexity: ProjectComplexity;
  domain: "erp" | "website" | "mobile" | "data" | "general";
  integrationCount: number;
  complianceCount: number;
  dataMigrationCount: number;
  reportingCount: number;
  securityCount: number;
  trainingCount: number;
  supportCount: number;
  paymentCount: number;
  workflowCount: number;
  userExperienceCount: number;
  currency: string;
  market: "india" | "us" | "uk" | "europe" | "canada" | "australia" | "global";
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
  const dataMigrationCount = countMatches(text, [
    "migration",
    "data conversion",
    "data import",
    "legacy data",
    "etl",
    "data migration"
  ]);
  const reportingCount = countMatches(text, [
    "reporting",
    "dashboard",
    "analytics",
    "business intelligence",
    "bi",
    "reports"
  ]);
  const securityCount = countMatches(text, [
    "security",
    "sso",
    "authentication",
    "authorization",
    "audit",
    "privacy",
    "encryption",
    "access control"
  ]);
  const trainingCount = countMatches(text, [
    "training",
    "knowledge transfer",
    "documentation",
    "user enablement",
    "change management"
  ]);
  const supportCount = countMatches(text, [
    "support",
    "maintenance",
    "sla",
    "warranty",
    "post go-live",
    "managed services"
  ]);
  const paymentCount = countMatches(text, [
    "payment",
    "billing",
    "invoice",
    "fee",
    "procurement",
    "purchase order"
  ]);
  const workflowCount = countMatches(text, [
    "workflow",
    "approval",
    "routing",
    "case management",
    "process"
  ]);
  const userExperienceCount = countMatches(text, [
    "ux",
    "ui",
    "accessibility",
    "responsive",
    "content",
    "mobile friendly"
  ]);

  const domain = inferDomain(text);
  const market = inferMarket(text);
  const currency = inferCurrency(text, market);
  const explicitWeeks = extractWeeks(rfp.timelineInformation.join(" "));
  const complexityScore =
    requirementCount +
    integrationCount * 3 +
    complianceCount * 2 +
    dataMigrationCount * 3 +
    reportingCount * 2 +
    securityCount * 2 +
    workflowCount * 2 +
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
    dataMigrationCount,
    reportingCount,
    securityCount,
    trainingCount,
    supportCount,
    paymentCount,
    workflowCount,
    userExperienceCount,
    currency,
    market,
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
  return terms.reduce((count, term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = text.match(new RegExp(`\\b${escaped}\\b`, "gi"));
    return count + (matches?.length ?? 0);
  }, 0);
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

function inferMarket(text: string): ProjectSignals["market"] {
  if (/india|indian|inr|rupees?|₹|mumbai|delhi|bengaluru|bangalore|chennai|hyderabad|pune/.test(text)) {
    return "india";
  }

  if (/united states|usa|u\.s\.|usd|\$|california|new york|texas|florida|washington|oregon/.test(text)) {
    return "us";
  }

  if (/united kingdom|uk|gbp|pounds?|£|london|england|scotland|wales/.test(text)) {
    return "uk";
  }

  if (/european union|europe|eur|€|germany|france|ireland|netherlands|spain/.test(text)) {
    return "europe";
  }

  if (/canada|cad|toronto|ontario|vancouver|british columbia/.test(text)) {
    return "canada";
  }

  if (/australia|aud|sydney|melbourne|queensland/.test(text)) {
    return "australia";
  }

  return "global";
}

function inferCurrency(text: string, market: ProjectSignals["market"]): string {
  if (/₹|inr|rupees?/.test(text) || market === "india") return "INR";
  if (/£|gbp|pounds?/.test(text) || market === "uk") return "GBP";
  if (/€|eur|euro/.test(text) || market === "europe") return "EUR";
  if (/cad|canadian dollars?/.test(text) || market === "canada") return "CAD";
  if (/aud|australian dollars?/.test(text) || market === "australia") return "AUD";
  return "USD";
}
