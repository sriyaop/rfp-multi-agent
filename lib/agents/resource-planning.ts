import { BaseAgent } from "@/lib/agents/base";
import { GeminiClient } from "@/lib/ai/gemini";
import { RESOURCE_PROMPT } from "@/lib/agents/prompts";

import {
  AgentOutput,
  ProductPlan,
  ResourcePlan,
  TechnicalPlan,
  WorkflowState
} from "@/lib/types";

export class ResourcePlanningAgent extends BaseAgent<ResourcePlan> {

  private readonly llm = new GeminiClient();

  constructor() {
    super(
      "resourcePlanning",
      "Resource Planning Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<ResourcePlan>> {

    const product =
      state.outputs.productManager
        ?.findings as ProductPlan;

    const technical =
      state.outputs.cto
        ?.findings as TechnicalPlan;

    const result =
      await this.llm.generateJson<ResourcePlan>(
        RESOURCE_PROMPT,
        `
CLIENT:
${state.rfp.clientName}

PROJECT:
${state.rfp.projectName}

EXECUTIVE SUMMARY:
${state.rfp.executiveSummary}

RESOURCE REQUIREMENTS:
${JSON.stringify(
  state.rfp.resourceRequirements,
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

PRODUCT PLAN:
${JSON.stringify(
  product,
  null,
  2
)}

TECHNICAL PLAN:
${JSON.stringify(
  technical,
  null,
  2
)}

Generate:

{
  "teamComposition": [
    {
      "role": "",
      "fte": 0,
      "months": 0
    }
  ],

  "totalFte": 0,

  "effortPersonMonths": 0,

  "allocationPlan": [],

  "staffingStrategy": [],

  "criticalSkills": [],

  "hiringRisks": []
}

IMPORTANT:

Think like a delivery director.

Staff realistically.

Consider:

- Solution complexity
- Integrations
- Security requirements
- Compliance
- Testing effort
- Deployment effort

Return JSON only.
`
      );

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.93,

      assumptions: [
        "Generated from architecture, scope and resource requirements."
      ],

      findings: result,

      reviewNotes: []
    };
  }
}