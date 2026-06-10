import { BaseAgent } from "@/lib/agents/base";
import { AgentOutput, ResourcePlan, WorkflowState } from "@/lib/types";
import { roundOne } from "@/lib/utils";

/**
 * Estimates team composition, FTEs, effort, and allocation plan.
 */
export class ResourcePlanningAgent extends BaseAgent<ResourcePlan> {
  constructor() {
    super("resourcePlanning", "Resource Planning Agent");
  }

  async run(state: WorkflowState): Promise<AgentOutput<ResourcePlan>> {
    const complexity = Math.min(3, Math.max(1, Math.ceil(state.rfp.requirements.length / 7)));
    const months = complexity === 1 ? 3 : complexity === 2 ? 5 : 7;
    const teamComposition = [
      { role: "Project Manager", fte: 0.5, months },
      { role: "Business Analyst", fte: 0.5, months: Math.max(2, months - 1) },
      { role: "Solution Architect", fte: 0.4, months: Math.max(2, months - 2) },
      { role: "Full-stack Engineers", fte: complexity + 1, months },
      { role: "QA Engineer", fte: 0.75, months: Math.max(2, months - 1) },
      { role: "DevOps Engineer", fte: 0.3, months: Math.max(2, months - 2) }
    ];
    const effortPersonMonths = roundOne(teamComposition.reduce((sum, item) => sum + item.fte * item.months, 0));

    return {
      agent: this.role,
      title: this.displayName,
      confidence: 0.8,
      assumptions: ["Estimates assume a blended agile delivery model and stable stakeholder availability."],
      findings: {
        teamComposition,
        totalFte: roundOne(teamComposition.reduce((sum, item) => sum + item.fte, 0)),
        effortPersonMonths,
        allocationPlan: ["Discovery team ramps first", "Engineering peaks during build sprints", "QA and DevOps increase during hardening and release", "PM remains active through closure"]
      },
      reviewNotes: []
    };
  }
}
