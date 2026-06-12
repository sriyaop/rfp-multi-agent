import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  ProductPlan,
  ResourcePlan,
  TimelinePlan,
  WorkflowState
} from "@/lib/types";

import { dateAfterWeeks } from "@/lib/utils";

export class TimelineAgent extends BaseAgent<TimelinePlan> {

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

    const featureCount =
      product.features.length;

    let durationWeeks = 12;

    if (featureCount > 10) {
      durationWeeks = 20;
    }

    if (featureCount > 15) {
      durationWeeks = 28;
    }

    const phases = [
      {
        name: "Discovery",
        weeks: 2,
        output: "Requirements Baseline"
      },
      {
        name: "Architecture",
        weeks: 3,
        output: "Solution Design"
      },
      {
        name: "Implementation",
        weeks:
          durationWeeks - 8,
        output: "Working Product"
      },
      {
        name: "Testing & Go Live",
        weeks: 3,
        output: "Production Release"
      }
    ];

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.94,

      assumptions: [
        "Timeline based on feature count."
      ],

      findings: {
        durationWeeks,

        estimatedCompletionDate:
          dateAfterWeeks(
            durationWeeks
          ),

        phases,

        milestones: [
          "Requirements Approved",
          "Architecture Approved",
          "Build Complete",
          "Go Live"
        ]
      },

      reviewNotes: []
    };
  }
}