import { BaseAgent } from "@/lib/agents/base";
import { GeminiClient } from "@/lib/ai/gemini";
import { CTO_PROMPT } from "@/lib/agents/prompts";

import {
  AgentOutput,
  TechnicalPlan,
  WorkflowState
} from "@/lib/types";

export class CTOAgent extends BaseAgent<TechnicalPlan> {

  private readonly llm = new GeminiClient();

  constructor() {
    super(
      "cto",
      "CTO Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<TechnicalPlan>> {

    const productOutput =
      state.outputs.productManager?.findings;

    const result =
      await this.llm.generateJson<TechnicalPlan>(
        CTO_PROMPT,
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

DELIVERABLES:
${JSON.stringify(
  state.rfp.deliverables,
  null,
  2
)}

RISKS:
${JSON.stringify(
  state.rfp.risks,
  null,
  2
)}

PM OUTPUT:
${JSON.stringify(
  productOutput,
  null,
  2
)}

Generate:

{
  "techStack": [],
  "architecture": [],
  "integrations": [],
  "scalability": [],
  "technicalRisks": []
}

IMPORTANT:

Architecture must be enterprise-grade.

Include:

- frontend
- backend
- database
- security
- hosting
- integrations
- monitoring

Return JSON only.
`
      );

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.94,

      assumptions: [
        "Architecture generated from complete RFP analysis."
      ],

      findings: result,

      reviewNotes: []
    };
  }
}