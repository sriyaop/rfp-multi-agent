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

import { money } from "@/lib/utils";

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
This proposal outlines our recommended approach for delivering ${state.rfp.projectName} for ${state.rfp.clientName}. The RFP describes a ${describeInitiative(signals.domain)} involving ${describeScopeThemes(state.rfp)}.

The proposed solution aligns the client's objectives, technical requirements, timeline expectations and evaluation criteria with a delivery model designed for the operational realities described in the RFP.
`;

  const clientUnderstanding =
    `
The client seeks a solution capable of meeting the following business priorities while maintaining scalability, security, maintainability and operational efficiency.

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

This is supported by a solution architecture, delivery team and implementation roadmap shaped around the RFP's functional modules, integration needs, data conversion considerations, reporting expectations and compliance obligations.
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
- Staffing model includes business analysis, solution architecture, implementation, integration, QA, release and change-management coverage
- Budget is built from role effort, market-rate assumptions, infrastructure, licensing, support and contingency
- Architecture supports the functional, integration, security, reporting and operational requirements described in the RFP
`;

  const assumptions = [
    ...product.assumptions
  ];

  const conclusion =
    `
This proposal presents a realistic and scalable delivery approach for ${state.rfp.projectName}, with scope, architecture, staffing, budget, timeline and risk controls aligned to the RFP's stated business and operational objectives.
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

${money(cost.totalBudget, cost.currency)}

CONCLUSION

${conclusion}
`;

  const proposal: Proposal = {
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

  return translateProposalForClient(proposal);
}

function describeInitiative(domain: string): string {
  if (domain === "erp") {
    return "business systems modernization effort spanning finance, human resources, workflow, reporting and operational enablement";
  }

  if (domain === "website") {
    return "digital experience modernization effort involving content, accessibility, search, governance and launch readiness";
  }

  if (domain === "mobile") {
    return "mobile solution initiative involving user workflows, secure access, integrations and release management";
  }

  if (domain === "data") {
    return "data and reporting initiative involving structured information management, analytics and decision support";
  }

  return "technology delivery initiative involving business process improvement, secure implementation and operational adoption";
}

function describeScopeThemes(rfp: WorkflowState["rfp"]): string {
  const text = [
    ...rfp.functionalRequirements,
    ...rfp.technicalRequirements,
    ...rfp.scopeItems
  ].join(" ").toLowerCase();

  const themes = [
    /finance|general ledger|accounting|budget|payroll|accounts payable|accounts receivable/.test(text) ? "financial management" : "",
    /human resources|hr|benefits|time|attendance/.test(text) ? "human resources and payroll" : "",
    /report|dashboard|analytics/.test(text) ? "reporting and dashboards" : "",
    /workflow|approval|routing/.test(text) ? "workflow automation" : "",
    /mobile|tablet|field/.test(text) ? "mobile workforce access" : "",
    /integration|api|interface|legacy/.test(text) ? "system integrations" : "",
    /migration|data conversion|legacy data/.test(text) ? "data migration" : "",
    /security|sso|mfa|active directory|entra/.test(text) ? "secure identity and access management" : "",
    /wcag|accessibility|ada/.test(text) ? "accessibility compliance" : ""
  ].filter(Boolean);

  return themes.length > 0
    ? themes.slice(0, 6).join(", ")
    : "business process improvement, secure implementation and operational reporting";
}

function translateProposalForClient(proposal: Proposal): Proposal {
  return {
    ...proposal,
    executiveSummary: clientFacingText(proposal.executiveSummary),
    clientUnderstanding: clientFacingText(proposal.clientUnderstanding),
    proposedSolution: clientFacingText(proposal.proposedSolution),
    implementationMethodology: clientFacingText(proposal.implementationMethodology),
    bidRecommendation: clientFacingText(proposal.bidRecommendation),
    conclusion: clientFacingText(proposal.conclusion),
    finalProposal: clientFacingText(proposal.finalProposal),
    technicalArchitecture: {
      ...proposal.technicalArchitecture,
      architectureOverview: clientFacingText(proposal.technicalArchitecture.architectureOverview),
      architectureRationale: proposal.technicalArchitecture.architectureRationale.map(clientFacingText)
    },
    riskAssessment: {
      ...proposal.riskAssessment,
      riskSummary: clientFacingText(proposal.riskAssessment.riskSummary)
    }
  };
}

function clientFacingText(value: string): string {
  return value
    .replace(/Gemini-derived\s*/gi, "")
    .replace(/AI-derived\s*/gi, "")
    .replace(/AI-extracted\s*/gi, "")
    .replace(/\b\d+\s+(?:scoped\s+)?requirement signals?\b/gi, "the RFP's stated requirements")
    .replace(/\b\d+\s+integration signals?\b/gi, "the RFP's integration needs")
    .replace(/\b\d+\s+compliance signals?\b/gi, "the RFP's compliance requirements")
    .replace(/\b\d+\s+migration signals?\b/gi, "the RFP's data migration needs")
    .replace(/\b\d+\s+reporting signals?\b/gi, "the RFP's reporting needs")
    .replace(/\bextracted scope\b/gi, "RFP scope")
    .replace(/\bextracted technical and operational requirements\b/gi, "technical and operational requirements")
    .replace(/\s{2,}/g, " ")
    .trim();
}
