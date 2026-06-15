import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  CostPlan,
  ResourcePlan,
  ReviewFinding,
  WorkflowState
} from "@/lib/types";
import { getProjectSignals } from "@/lib/agents/rfp-intelligence";

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

    const signals =
      getProjectSignals(state.rfp);

    const rate =
      signals.complexity === "High"
        ? 18000
        : signals.complexity === "Medium"
        ? 14000
        : 10000;

    const developmentCost =
      resource.effortPersonMonths * rate;

    const infrastructureCost =
      Math.max(
        signals.domain === "erp" ? 35000 : signals.domain === "website" ? 18000 : 10000,
        Math.round(developmentCost * (signals.integrationCount > 2 ? 0.14 : 0.10))
      );

    const licensingCost =
      Math.max(
        signals.domain === "erp" ? 45000 : signals.domain === "website" ? 12000 : 5000,
        Math.round(developmentCost * (signals.domain === "erp" ? 0.10 : 0.05))
      );

    const contingencyCost =
      Math.round(
        developmentCost * (signals.complexity === "High" ? 0.20 : 0.15)
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
          `${signals.complexity} AI-derived scope complexity`,
          `${resource.effortPersonMonths} person-month delivery effort`,
          signals.integrationCount > 0 ? `${signals.integrationCount} integration/compliance signals` : "Limited integration scope",
          `${signals.domain} delivery profile`
        ],

        pricingAssumptions: [
          `$${rate.toLocaleString()} per person-month`,
          `Rate selected from AI-inferred ${signals.complexity.toLowerCase()} complexity.`,
          "Final price subject to discovery validation and procurement scope confirmation."
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
