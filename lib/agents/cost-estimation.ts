import { BaseAgent } from "@/lib/agents/base";
import { GeminiClient } from "@/lib/ai/gemini";
import { FINANCE_PROMPT } from "@/lib/agents/prompts";

import {
  AgentOutput,
  CostPlan,
  ResourcePlan,
  TechnicalPlan,
  ProductPlan,
  ReviewFinding,
  WorkflowState
} from "@/lib/types";

export class CostEstimationAgent extends BaseAgent<CostPlan> {

  private readonly llm = new GeminiClient();

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

    const technical =
      state.outputs.cto
        ?.findings as TechnicalPlan;

    const product =
      state.outputs.productManager
        ?.findings as ProductPlan;

    const result =
      await this.llm.generateJson<CostPlan>(
        FINANCE_PROMPT,
        `
CLIENT:
${state.rfp.clientName}

PROJECT:
${state.rfp.projectName}

EXECUTIVE SUMMARY:
${state.rfp.executiveSummary}

BUDGET INFORMATION:
${JSON.stringify(
  state.rfp.budgetInformation,
  null,
  2
)}

RESOURCE PLAN:
${JSON.stringify(
  resource,
  null,
  2
)}

TECHNICAL PLAN:
${JSON.stringify(
  technical,
  null,
  2
)}

PRODUCT PLAN:
${JSON.stringify(
  product,
  null,
  2
)}

Generate:

{
  "developmentCost": 0,
  "infrastructureCost": 0,
  "licensingCost": 0,
  "contingencyCost": 0,
  "supportCost": 0,
  "totalBudget": 0,
  "currency": "USD",
  "costDrivers": [],
  "pricingAssumptions": [],
  "paymentMilestones": []
}

IMPORTANT:

Use realistic consulting estimates.

Consider:

- Team size
- Timeline
- Cloud hosting
- Compliance
- Security
- Licensing
- Maintenance

Return JSON only.
`
      );

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.92,

      assumptions: [
        "Generated from staffing, architecture and project scope."
      ],

      findings: result,

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

    if (!resource || !cost) {
      return [];
    }

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
            "Budget appears inconsistent with staffing levels.",

          recommendation:
            "Review resource allocation or revise budget assumptions."
        }
      ];
    }

    return [];
  }
}