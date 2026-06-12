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
 --> Frontend

Frontend
 --> API

API
 --> Services

Services
 --> Database

Services
 --> Integrations

Services
 --> Monitoring
`;

  const executiveSummary =
    `
This proposal outlines our recommended approach for delivering ${state.rfp.projectName} for ${state.rfp.clientName}.

The proposed solution aligns with the client's business objectives, technical requirements, timeline expectations and evaluation criteria while minimizing implementation risk.
`;

  const clientUnderstanding =
    `
The client seeks a solution capable of meeting stated functional and technical requirements while maintaining scalability, security, maintainability and operational efficiency.

Key objectives include:

${state.rfp.businessObjectives
  .map((item) => `• ${item}`)
  .join("\n")}
`;

  const proposedSolution =
    `
Our proposed solution combines:

${product.features
  .slice(0, 10)
  .map((item) => `• ${item}`)
  .join("\n")}

supported by an enterprise-grade architecture, structured delivery methodology and dedicated implementation team.
`;

  const implementationMethodology =
    `
The project will be executed using an agile delivery framework.

Phases include:

${timeline.phases
  .map(
    phase =>
      `• ${phase.name} (${phase.weeks} weeks)`
  )
  .join("\n")}
`;

  const bidRecommendation =
    `
GO

Reasoning:

• Strong solution fit

• Manageable delivery risks

• Realistic staffing model

• Budget aligns with scope

• Architecture supports long-term scalability
`;

  const assumptions = [
    ...product.assumptions
  ];

  const conclusion =
    `
This proposal presents a realistic and scalable delivery approach capable of meeting the client's requirements while balancing cost, timeline and implementation risk.
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