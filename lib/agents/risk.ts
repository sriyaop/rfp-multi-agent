import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  CostPlan,
  ProductPlan,
  RiskPlan,
  TechnicalPlan,
  TimelinePlan,
  WorkflowState
} from "@/lib/types";

export class RiskAgent extends BaseAgent<RiskPlan> {

  constructor() {
    super(
      "risk",
      "Risk Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<RiskPlan>> {

    const technical =
      state.outputs.cto
        ?.findings as TechnicalPlan;

    const timeline =
      state.outputs.timeline
        ?.findings as TimelinePlan;

    const product =
      state.outputs.productManager
        ?.findings as ProductPlan;

    const cost =
      state.outputs.costEstimation
        ?.findings as CostPlan;

    const deliveryRisks = [
      "Requirement changes",
      "Stakeholder delays"
    ];

    if (
      timeline.durationWeeks < 16 &&
      product.features.length > 10
    ) {
      deliveryRisks.push(
        "Aggressive schedule"
      );
    }

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.95,

      assumptions: [
        "Risk analysis based on scope, timeline and architecture."
      ],

      findings: {
        technicalRisks: [
          "Integration complexity",
          "Production deployment issues"
        ],

        deliveryRisks,

        budgetRisks: [
          "Scope expansion"
        ],

        complianceRisks: [
          "Security review delays"
        ],

        mitigations: [
          "Incremental delivery",
          "Weekly governance review",
          "Architecture validation"
        ],

        riskSummary:
          "Project is achievable with active risk monitoring."
      },

      reviewNotes: []
    };
  }
}