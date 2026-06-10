import { BaseAgent } from "@/lib/agents/base";
import { AgentOutput, ProductPlan, ReviewFinding, WorkflowState } from "@/lib/types";

/**
 * Generates product scope, epics, user stories, milestones, and roadmap.
 */
export class ProductManagerAgent extends BaseAgent<ProductPlan> {
  constructor() {
    super("productManager", "Product Manager Agent");
  }

  async run(state: WorkflowState): Promise<AgentOutput<ProductPlan>> {
    const features = state.rfp.requirements.slice(0, 10);
    const epics = state.rfp.scopeItems.slice(0, 6).map((item) => `Epic: ${item}`);
    const userStories = features.slice(0, 8).map((feature) => `As a user, I want ${feature.toLowerCase()} so that the business objective is met.`);

    return {
      agent: this.role,
      title: this.displayName,
      confidence: 0.82,
      assumptions: ["Detailed acceptance criteria will be confirmed during discovery."],
      findings: {
        features,
        epics,
        userStories,
        milestones: ["Discovery sign-off", "MVP feature complete", "UAT approval", "Production launch"],
        roadmap: ["Discovery and backlog shaping", "Architecture and UX design", "Incremental delivery sprints", "UAT and hardening", "Launch and hypercare"]
      },
      reviewNotes: []
    };
  }

  async review(state: WorkflowState): Promise<ReviewFinding[]> {
    const timeline = state.outputs.timeline?.findings as { durationWeeks?: number } | undefined;
    const featureCount = (state.outputs.productManager?.findings as ProductPlan | undefined)?.features.length ?? 0;

    if (timeline?.durationWeeks && timeline.durationWeeks < Math.max(8, featureCount * 1.2)) {
      return [{
        reviewer: this.role,
        target: "timeline",
        severity: "warning",
        finding: "The proposed timeline appears compressed for the identified feature count.",
        recommendation: "Increase delivery duration or reduce MVP scope."
      }];
    }

    return [];
  }
}
