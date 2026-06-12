import { BaseAgent } from "@/lib/agents/base";
import { GeminiClient } from "@/lib/ai/gemini";
import { PM_PROMPT } from "@/lib/agents/prompts";

import {
  AgentOutput,
  ProductPlan,
  ReviewFinding,
  WorkflowState
} from "@/lib/types";

export class ProductManagerAgent extends BaseAgent<ProductPlan> {
  private readonly llm = new GeminiClient();

  constructor() {
    super(
      "productManager",
      "Product Manager Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<ProductPlan>> {

    const result =
      await this.llm.generateJson<ProductPlan>(
        PM_PROMPT,
        `
CLIENT:
${state.rfp.clientName}

PROJECT:
${state.rfp.projectName}

EXECUTIVE SUMMARY:
${state.rfp.executiveSummary}

BUSINESS OBJECTIVES:
${JSON.stringify(
  state.rfp.businessObjectives,
  null,
  2
)}

FUNCTIONAL REQUIREMENTS:
${JSON.stringify(
  state.rfp.functionalRequirements,
  null,
  2
)}

TECHNICAL REQUIREMENTS:
${JSON.stringify(
  state.rfp.technicalRequirements,
  null,
  2
)}

SCOPE:
${JSON.stringify(
  state.rfp.scopeItems,
  null,
  2
)}

DELIVERABLES:
${JSON.stringify(
  state.rfp.deliverables,
  null,
  2
)}

CONSTRAINTS:
${JSON.stringify(
  state.rfp.constraints,
  null,
  2
)}

Generate:

{
  "features": [],
  "epics": [],
  "userStories": [],
  "milestones": [],
  "roadmap": []
}

Return JSON only.
`
      );

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.93,

      assumptions: [
        "Generated from complete RFP analysis."
      ],

      findings: result,

      reviewNotes: []
    };
  }

  async review(
    state: WorkflowState
  ): Promise<ReviewFinding[]> {

    const timeline =
      state.outputs.timeline?.findings as
      | { durationWeeks?: number }
      | undefined;

    const product =
      state.outputs.productManager
        ?.findings as ProductPlan;

    if (!timeline || !product) {
      return [];
    }

    if (
      timeline.durationWeeks &&
      product.features.length > 20 &&
      timeline.durationWeeks < 20
    ) {
      return [
        {
          reviewer: this.role,

          target: "timeline",

          severity: "warning",

          finding:
            "Timeline appears insufficient for identified scope.",

          recommendation:
            "Increase duration or reduce MVP scope."
        }
      ];
    }

    return [];
  }
}