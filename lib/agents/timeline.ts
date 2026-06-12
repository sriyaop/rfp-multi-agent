import { BaseAgent } from "@/lib/agents/base";
import { GeminiClient } from "@/lib/ai/gemini";

import {
  AgentOutput,
  ProductPlan,
  ResourcePlan,
  TimelinePlan,
  WorkflowState
} from "@/lib/types";

import { dateAfterWeeks } from "@/lib/utils";

export class TimelineAgent extends BaseAgent<TimelinePlan> {

  private readonly llm = new GeminiClient();

  constructor() {
    super(
      "timeline",
      "Timeline Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<TimelinePlan>> {

    const product =
      state.outputs.productManager
        ?.findings as ProductPlan;

    const resource =
      state.outputs.resourcePlanning
        ?.findings as ResourcePlan;

    const result =
      await this.llm.generateJson<{
        durationWeeks: number;
        phases: Array<{
          name: string;
          weeks: number;
          output: string;
        }>;
        milestones: string[];
      }>(
        `
You are a Senior Program Manager.

Create a realistic delivery timeline.

Return JSON only.
`,
        `
PROJECT:
${state.rfp.projectName}

TIMELINE INFORMATION:
${JSON.stringify(
  state.rfp.timelineInformation,
  null,
  2
)}

PRODUCT PLAN:
${JSON.stringify(
  product,
  null,
  2
)}

RESOURCE PLAN:
${JSON.stringify(
  resource,
  null,
  2
)}

Generate:

{
 "durationWeeks": 0,
 "phases": [],
 "milestones": []
}
`
      );

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.92,

      assumptions: [
        "Generated from staffing and scope analysis."
      ],

      findings: {
        ...result,

        estimatedCompletionDate:
          dateAfterWeeks(
            result.durationWeeks
          )
      },

      reviewNotes: []
    };
  }
}