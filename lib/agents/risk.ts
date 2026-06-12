import { BaseAgent } from "@/lib/agents/base";
import { GeminiClient } from "@/lib/ai/gemini";
import { RISK_PROMPT } from "@/lib/agents/prompts";

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

  private readonly llm = new GeminiClient();

  constructor() {
    super(
      "risk",
      "Risk Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<RiskPlan>> {

    const product =
      state.outputs.productManager
        ?.findings as ProductPlan;

    const technical =
      state.outputs.cto
        ?.findings as TechnicalPlan;

    const cost =
      state.outputs.costEstimation
        ?.findings as CostPlan;

    const timeline =
      state.outputs.timeline
        ?.findings as TimelinePlan;

    const result =
      await this.llm.generateJson<RiskPlan>(
        RISK_PROMPT,
        `
PROJECT:
${state.rfp.projectName}

KNOWN RISKS:
${JSON.stringify(
  state.rfp.risks,
  null,
  2
)}

PRODUCT:
${JSON.stringify(
  product,
  null,
  2
)}

TECHNICAL:
${JSON.stringify(
  technical,
  null,
  2
)}

COST:
${JSON.stringify(
  cost,
  null,
  2
)}

TIMELINE:
${JSON.stringify(
  timeline,
  null,
  2
)}

Generate:

{
  "technicalRisks": [],
  "deliveryRisks": [],
  "budgetRisks": [],
  "complianceRisks": [],
  "mitigations": [],
  "riskSummary": ""
}

Return JSON only.
`
      );

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.93,

      assumptions: [
        "Generated from cross-agent analysis."
      ],

      findings: result,

      reviewNotes: []
    };
  }
}