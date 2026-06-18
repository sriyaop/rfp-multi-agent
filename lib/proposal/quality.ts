import { Proposal } from "@/lib/types";

const forbiddenClientTerms = [
  /\bAI-derived\b/i,
  /\bAI-extracted\b/i,
  /\bGemini-derived\b/i,
  /\b(?:requirement|integration|compliance|migration|reporting|risk|scope)\s+signal(?:s)?\b/i,
  /\bextraction metrics?\b/i,
  /\bscoped requirement\b/i
];

/**
 * Removes internal implementation wording from proposal text before client-facing export.
 */
export function sanitizeProposalForClient(proposal: Proposal): Proposal {
  return {
    ...proposal,
    executiveSummary: sanitizeText(proposal.executiveSummary),
    clientUnderstanding: sanitizeText(proposal.clientUnderstanding),
    proposedSolution: sanitizeText(proposal.proposedSolution),
    implementationMethodology: sanitizeText(proposal.implementationMethodology),
    bidRecommendation: sanitizeText(proposal.bidRecommendation),
    assumptions: proposal.assumptions.map(sanitizeText),
    conclusion: sanitizeText(proposal.conclusion),
    finalProposal: sanitizeText(proposal.finalProposal),
    technicalArchitecture: {
      ...proposal.technicalArchitecture,
      architectureOverview: sanitizeText(proposal.technicalArchitecture.architectureOverview),
      architectureRationale: proposal.technicalArchitecture.architectureRationale.map(sanitizeText),
      frontendArchitecture: proposal.technicalArchitecture.frontendArchitecture.map(sanitizeText),
      backendArchitecture: proposal.technicalArchitecture.backendArchitecture.map(sanitizeText),
      databaseArchitecture: proposal.technicalArchitecture.databaseArchitecture.map(sanitizeText),
      securityArchitecture: proposal.technicalArchitecture.securityArchitecture.map(sanitizeText),
      deploymentArchitecture: proposal.technicalArchitecture.deploymentArchitecture.map(sanitizeText),
      integrations: proposal.technicalArchitecture.integrations.map(sanitizeText),
      monitoringStrategy: proposal.technicalArchitecture.monitoringStrategy.map(sanitizeText),
      scalabilityStrategy: proposal.technicalArchitecture.scalabilityStrategy.map(sanitizeText),
      technicalRisks: proposal.technicalArchitecture.technicalRisks.map(sanitizeText)
    },
    resourcePlan: {
      ...proposal.resourcePlan,
      allocationPlan: proposal.resourcePlan.allocationPlan.map(sanitizeText),
      staffingStrategy: proposal.resourcePlan.staffingStrategy.map(sanitizeText),
      criticalSkills: proposal.resourcePlan.criticalSkills.map(sanitizeText),
      hiringRisks: proposal.resourcePlan.hiringRisks.map(sanitizeText)
    },
    costEstimate: {
      ...proposal.costEstimate,
      costDrivers: proposal.costEstimate.costDrivers.map(sanitizeText),
      pricingAssumptions: proposal.costEstimate.pricingAssumptions.map(sanitizeText),
      paymentMilestones: proposal.costEstimate.paymentMilestones.map(sanitizeText)
    },
    timeline: {
      ...proposal.timeline,
      rationale: proposal.timeline.rationale.map(sanitizeText),
      milestones: proposal.timeline.milestones.map(sanitizeText),
      phases: proposal.timeline.phases.map((phase) => ({
        ...phase,
        name: sanitizeText(phase.name),
        output: sanitizeText(phase.output)
      }))
    },
    riskAssessment: {
      ...proposal.riskAssessment,
      riskSummary: sanitizeText(proposal.riskAssessment.riskSummary),
      technicalRisks: proposal.riskAssessment.technicalRisks.map(sanitizeText),
      deliveryRisks: proposal.riskAssessment.deliveryRisks.map(sanitizeText),
      budgetRisks: proposal.riskAssessment.budgetRisks.map(sanitizeText),
      complianceRisks: proposal.riskAssessment.complianceRisks.map(sanitizeText),
      mitigations: proposal.riskAssessment.mitigations.map(sanitizeText)
    }
  };
}

/**
 * Fails fast if export-ready proposal content still contains internal implementation terms.
 */
export function assertProposalQuality(proposal: Proposal) {
  const clientText = [
    proposal.executiveSummary,
    proposal.clientUnderstanding,
    proposal.proposedSolution,
    proposal.implementationMethodology,
    proposal.bidRecommendation,
    proposal.conclusion,
    proposal.finalProposal,
    proposal.technicalArchitecture.architectureOverview,
    proposal.riskAssessment.riskSummary,
    ...proposal.technicalArchitecture.architectureRationale,
    ...proposal.resourcePlan.staffingStrategy,
    ...proposal.costEstimate.costDrivers,
    ...proposal.costEstimate.pricingAssumptions,
    ...proposal.timeline.rationale,
    ...proposal.riskAssessment.technicalRisks,
    ...proposal.riskAssessment.deliveryRisks,
    ...proposal.riskAssessment.budgetRisks,
    ...proposal.riskAssessment.complianceRisks,
    ...proposal.riskAssessment.mitigations
  ].join("\n");

  const failedTerm = forbiddenClientTerms.find((pattern) =>
    pattern.test(clientText)
  );

  if (failedTerm) {
    throw new Error(
      `Proposal quality validation failed. Client-facing proposal still contains internal generation language matching ${failedTerm}.`
    );
  }
}

function sanitizeText(value: string): string {
  return value
    .replace(/Gemini-derived\s*/gi, "")
    .replace(/AI-derived\s*/gi, "")
    .replace(/AI-extracted\s*/gi, "")
    .replace(/\b\d+\s+(?:scoped\s+)?requirement signals?\b/gi, "the RFP's stated requirements")
    .replace(/\b\d+\s+integration signals?\b/gi, "the RFP's integration needs")
    .replace(/\b\d+\s+compliance signals?\b/gi, "the RFP's compliance requirements")
    .replace(/\b\d+\s+migration signals?\b/gi, "the RFP's data migration needs")
    .replace(/\b\d+\s+reporting signals?\b/gi, "the RFP's reporting needs")
    .replace(/\bscope signals?\b/gi, "scope requirements")
    .replace(/\brisk signals?\b/gi, "risk areas")
    .replace(/\bextracted scope\b/gi, "RFP scope")
    .replace(/\bextracted technical and operational requirements\b/gi, "technical and operational requirements")
    .replace(/\s{2,}/g, " ")
    .trim();
}
