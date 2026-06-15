import {
  ComplianceItem,
  CostPlan,
  ProductPlan,
  Proposal,
  ResourcePlan,
  RiskPlan,
  TechnicalPlan,
  TimelinePlan,
  WorkflowState
} from "@/lib/types";

import {
  getProjectSignals,
  pickRelevantItems
} from "@/lib/agents/rfp-intelligence";
import { calculateRoi } from "@/lib/proposal/roi";
import {
  calculateConfidence,
  runConsistencyChecks
} from "@/lib/validation/consistency";

import { usd } from "@/lib/utils";

export function buildProposal(
  state: WorkflowState
): Proposal {

  const product =
    state.outputs.productManager
      ?.findings as ProductPlan;

  const technical =
    state.outputs.cto
      ?.findings as TechnicalPlan;

  const resource =
    state.outputs.resourcePlanning
      ?.findings as ResourcePlan;

  const cost =
    state.outputs.costEstimation
      ?.findings as CostPlan;

  const timeline =
    state.outputs.timeline
      ?.findings as TimelinePlan;

  const risk =
    state.outputs.risk
      ?.findings as RiskPlan;

  const signals =
    getProjectSignals(state.rfp);

  const confidenceScore =
    calculateConfidence(state);

  const consistencyChecks =
    runConsistencyChecks(state);

  const complianceMatrix: ComplianceItem[] =
    state.rfp.functionalRequirements
      .slice(0, 15)
      .map((requirement) => ({
        requirement,
        status: "Covered",
        owner: "Delivery Team",
        notes:
          "Addressed through proposed solution."
      }));

  const architectureDiagram = `
graph TD

Client
 --> Experience

Experience
 --> Services

Services
 --> Data

Services
 --> Integrations

Services
 --> Monitoring
`;

  const objectiveBullets =
    pickRelevantItems(
      state.rfp.businessObjectives,
      [state.rfp.executiveSummary],
      8
    );

  const solutionBullets =
    pickRelevantItems(
      product.features,
      state.rfp.scopeItems,
      10
    );

  const executiveSummary =
    `
This proposal outlines our recommended approach for delivering ${state.rfp.projectName} for ${state.rfp.clientName}. Gemini-derived RFP analysis identified a ${signals.complexity.toLowerCase()} complexity ${signals.domain} initiative with ${signals.requirementCount} scoped requirement signals.

The proposed solution aligns the client's objectives, technical requirements, timeline expectations and evaluation criteria with a delivery model sized specifically for the extracted scope.
`;

  const clientUnderstanding =
    `
The client seeks a solution capable of meeting the following AI-extracted business priorities while maintaining scalability, security, maintainability and operational efficiency.

Key objectives include:

${objectiveBullets
  .map((item) => `- ${item}`)
  .join("\n")}
`;

  const proposedSolution =
    `
Our proposed solution combines:

${solutionBullets
  .map((item) => `- ${item}`)
  .join("\n")}

This is supported by a ${signals.domain}-specific architecture, a ${resource.totalFte} FTE delivery team, and a ${timeline.durationWeeks}-week roadmap calibrated to the RFP's complexity.
`;

  const implementationMethodology =
    `
The project will be executed using a delivery framework tailored to the RFP scope rather than a generic implementation plan.

Phases include:

${timeline.phases
  .map(
    phase =>
      `- ${phase.name} (${phase.weeks} weeks): ${phase.output}`
  )
  .join("\n")}
`;

  const bidRecommendation =
    `
GO

Reasoning:

- Strong solution fit for a ${signals.complexity.toLowerCase()} complexity ${signals.domain} initiative
- Delivery risks identified from the RFP and reflected in mitigations
- Staffing model sized at ${resource.totalFte} FTE / ${resource.effortPersonMonths} person-months
- Effort estimate includes ${resource.estimatedHours.toLocaleString()} delivery hours
- Budget aligns with AI-derived scope, integration and compliance signals
- Architecture supports the extracted technical and operational requirements
`;

  const assumptions = [
    ...product.assumptions
  ];

  const conclusion =
    `
This proposal presents a realistic and scalable delivery approach for ${state.rfp.projectName}, with scope, architecture, staffing, budget, timeline and risk controls derived from the uploaded RFP analysis.
`;

  const finalProposal = `
EXECUTIVE SUMMARY

${executiveSummary}

CLIENT UNDERSTANDING

${clientUnderstanding}

PROPOSED SOLUTION

${proposedSolution}

IMPLEMENTATION APPROACH

${implementationMethodology}

TECHNICAL ARCHITECTURE

${technical.architectureOverview}

RESOURCE PLAN

${resource.totalFte} FTE

${resource.effortPersonMonths} Person Months

${resource.estimatedHours.toLocaleString()} Estimated Hours

TIMELINE

${timeline.durationWeeks} Weeks

BUDGET

${usd(cost.totalBudget)}

CONCLUSION

${conclusion}
`;

  return {
    executiveSummary,

    clientUnderstanding,

    proposedSolution,

    implementationMethodology,

    bidRecommendation,

    resourcePlan: resource,

    costEstimate: cost,

    timeline,

    technicalArchitecture: technical,

    riskAssessment: risk,

    complianceMatrix,

    userStories:
      product.userStories,

    architectureDiagram,

    assumptions,

    conclusion,

    finalProposal,

    roi: calculateRoi(state),

    consistencyChecks,

    confidenceScore,

    agentOutputs:
      Object.values(
        state.outputs
      ),

    reviewCycle:
      state.reviews,

    agentConversation:
      state.messages
  };
}
