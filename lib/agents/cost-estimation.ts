import { BaseAgent } from "@/lib/agents/base";
import { AgentOutput, CostPlan, ResourcePlan, ReviewFinding, WorkflowState } from "@/lib/types";

/**
 * Estimates development cost, infrastructure cost, contingency, and total budget.
 */
export class CostEstimationAgent extends BaseAgent<CostPlan> {
  constructor() {
    super("costEstimation", "Cost Estimation Agent");
  }

  async run(state: WorkflowState): Promise<AgentOutput<CostPlan>> {
    const resource = state.outputs.resourcePlanning?.findings as ResourcePlan | undefined;
    const effort = resource?.effortPersonMonths ?? Math.max(8, state.rfp.requirements.length * 1.5);
    const developmentCost = Math.round(effort * 15000);
    const infrastructureCost = Math.round(Math.max(12000, developmentCost * 0.08));
    const contingencyCost = Math.round((developmentCost + infrastructureCost) * 0.15);

    return {
      agent: this.role,
      title: this.displayName,
      confidence: 0.78,
      assumptions: ["Uses a blended delivery rate of USD 15,000 per person-month."],
      findings: {
        developmentCost,
        infrastructureCost,
        contingencyCost,
        totalBudget: developmentCost + infrastructureCost + contingencyCost,
        currency: "USD",
        costDrivers: ["Engineering effort", "Cloud infrastructure", "Security and compliance", "QA/UAT support", "Project management"]
      },
      reviewNotes: []
    };
  }

  async review(state: WorkflowState): Promise<ReviewFinding[]> {
    const resource = state.outputs.resourcePlanning?.findings as ResourcePlan | undefined;
    const cost = state.outputs.costEstimation?.findings as CostPlan | undefined;
    if (!resource || !cost) return [];

    const costPerPersonMonth = cost.developmentCost / resource.effortPersonMonths;
    if (costPerPersonMonth < 8000) {
      return [{
        reviewer: this.role,
        target: "resourcePlanning",
        severity: "warning",
        finding: "Resource effort is high compared with the development budget.",
        recommendation: "Recheck FTE allocation or increase development budget."
      }];
    }

    return [];
  }
}
