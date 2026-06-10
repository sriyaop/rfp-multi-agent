import {
  CostPlan,
  ProductPlan,
  Proposal,
  ResourcePlan,
  RiskPlan,
  TechnicalPlan,
  TimelinePlan,
  WorkflowState
} from "@/lib/types";
import { calculateRoi } from "@/lib/proposal/roi";
import { calculateConfidence, runConsistencyChecks } from "@/lib/validation/consistency";
import { usd } from "@/lib/utils";

/**
 * Builds the final executive proposal from all specialist agent outputs.
 */
export function buildProposal(state: WorkflowState): Proposal {
  const product = state.outputs.productManager?.findings as ProductPlan;
  const technical = state.outputs.cto?.findings as TechnicalPlan;
  const resource = state.outputs.resourcePlanning?.findings as ResourcePlan;
  const cost = state.outputs.costEstimation?.findings as CostPlan;
  const timeline = state.outputs.timeline?.findings as TimelinePlan;
  const risk = state.outputs.risk?.findings as RiskPlan;
  const confidenceScore = calculateConfidence(state);
  const consistencyChecks = runConsistencyChecks(state);

  const executiveSummary = `This proposal recommends a structured delivery program for ${state.rfp.projectName} for ${state.rfp.clientName}. The solution addresses the RFP objectives through scoped product delivery, scalable technical architecture, realistic staffing, cost controls, and explicit risk mitigation.`;

  return {
    executiveSummary,
    resourcePlan: resource,
    costEstimate: cost,
    timeline,
    technicalArchitecture: technical,
    riskAssessment: risk,
    userStories: product.userStories,
    finalProposal: [
      executiveSummary,
      `The estimated project duration is ${timeline.durationWeeks} weeks with an expected completion date of ${timeline.estimatedCompletionDate}.`,
      `The proposed budget is ${usd(cost.totalBudget)}, including development, infrastructure, and contingency.`,
      `The recommended team requires approximately ${resource.totalFte} FTE across ${resource.effortPersonMonths} person-months.`,
      `Overall confidence score: ${confidenceScore}%.`
    ].join("\n\n"),
    roi: calculateRoi(state),
    consistencyChecks,
    confidenceScore,
    agentOutputs: Object.values(state.outputs),
    reviewCycle: state.reviews
  };
}
