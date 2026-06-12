import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  CostPlan,
  ResourcePlan,
  ReviewFinding,
  WorkflowState
} from "@/lib/types";

export class CostEstimationAgent extends BaseAgent<CostPlan> {

  constructor() {
    super(
      "costEstimation",
      "Cost Estimation Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<CostPlan>> {

    const resource =
      state.outputs.resourcePlanning
        ?.findings as ResourcePlan;

    const intelligence =
      (state.rfp as any)
        .intelligence;

    const complexity =
      intelligence?.complexity;

    const rate =
      complexity === "High"
        ? 18000
        : complexity === "Medium"
        ? 14000
        : 10000;

    const developmentCost =
      resource.effortPersonMonths * rate;

    const infrastructureCost =
      Math.max(
        10000,
        Math.round(developmentCost * 0.10)
      );

    const licensingCost =
      Math.max(
        5000,
        Math.round(developmentCost * 0.05)
      );

    const contingencyCost =
      Math.round(
        developmentCost * 0.15
      );

    const supportCost =
      Math.round(
        developmentCost * 0.08
      );

    const totalBudget =
      developmentCost +
      infrastructureCost +
      licensingCost +
      contingencyCost +
      supportCost;

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.94,

      assumptions: [
        "Industry consulting rate model."
      ],

      findings: {
        developmentCost,
        infrastructureCost,
        licensingCost,
        contingencyCost,
        supportCost,
        totalBudget,

        currency: "USD",

        costDrivers: [
          "Development effort",
          "Infrastructure",
          "QA effort"
        ],

        pricingAssumptions: [
          `$${rate.toLocaleString()} per person-month`
        ],

        paymentMilestones: [
          "20% Kickoff",
          "30% Design Approval",
          "30% UAT",
          "20% Go Live"
        ]
      },

      reviewNotes: []
    };
  }

  async review(
    state: WorkflowState
  ): Promise<ReviewFinding[]> {

    const resource =
      state.outputs.resourcePlanning
        ?.findings as ResourcePlan;

    const cost =
      state.outputs.costEstimation
        ?.findings as CostPlan;

    if (
      cost.totalBudget < 50000 &&
      resource.totalFte > 5
    ) {
      return [
        {
          reviewer: this.role,
          target: "resourcePlanning",
          severity: "warning",
          finding:
            "Budget appears low for staffing model.",
          recommendation:
            "Review staffing assumptions."
        }
      ];
    }

    return [];
  }
}