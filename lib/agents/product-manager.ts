import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  ProductPlan,
  ReviewFinding,
  WorkflowState
} from "@/lib/types";

export class ProductManagerAgent extends BaseAgent<ProductPlan> {

  constructor() {
    super(
      "productManager",
      "Product Manager Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<ProductPlan>> {

    const requirements =
      state.rfp.functionalRequirements;

    const scope =
      state.rfp.scopeItems;

    const features =
      requirements.slice(0, 15);

    const epics =
      features.map(
        (_, index) =>
          `Epic ${index + 1}`
      );

    const userStories =
      features.map(
        feature =>
          `As a user, I want ${feature.toLowerCase()} so that business objectives can be achieved.`
      );

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.95,

      assumptions: [
        "Requirements extracted from RFP."
      ],

      findings: {
        executiveScopeSummary:
          `Solution includes ${features.length} major functional capabilities.`,

        features,

        epics,

        userStories,

        deliverables:
          state.rfp.deliverables,

        milestones: [
          "Requirements Finalized",
          "Solution Design Approved",
          "Development Complete",
          "UAT Complete",
          "Production Go-Live"
        ],

        roadmap: [
          "Discovery",
          "Design",
          "Build",
          "Testing",
          "Deployment"
        ],

        assumptions: [
          "Requirements remain stable during delivery."
        ],

        successCriteria: [
          "Solution deployed successfully.",
          "Business objectives achieved.",
          "User acceptance completed."
        ]
      },

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
      product.features.length > 15 &&
      (timeline.durationWeeks ?? 0) < 16
    ) {
      return [
        {
          reviewer: this.role,
          target: "timeline",
          severity: "warning",
          finding:
            "Timeline appears aggressive for identified scope.",
          recommendation:
            "Increase timeline duration."
        }
      ];
    }

    return [];
  }
}