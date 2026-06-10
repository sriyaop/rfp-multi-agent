import { BaseAgent } from "@/lib/agents/base";
import { AgentOutput, ResourcePlan, TimelinePlan, WorkflowState } from "@/lib/types";
import { dateAfterWeeks } from "@/lib/utils";

/**
 * Generates delivery schedule, phases, milestones, and completion date.
 */
export class TimelineAgent extends BaseAgent<TimelinePlan> {
  constructor() {
    super("timeline", "Timeline Agent");
  }

  async run(state: WorkflowState): Promise<AgentOutput<TimelinePlan>> {
    const resource = state.outputs.resourcePlanning?.findings as ResourcePlan | undefined;
    const baseWeeks = Math.max(12, Math.ceil((resource?.effortPersonMonths ?? 12) * 1.7));
    const durationWeeks = Math.min(52, baseWeeks);

    return {
      agent: this.role,
      title: this.displayName,
      confidence: 0.8,
      assumptions: ["Timeline assumes two-week agile sprints and timely client feedback."],
      findings: {
        durationWeeks,
        estimatedCompletionDate: dateAfterWeeks(durationWeeks),
        phases: [
          { name: "Discovery", weeks: 2, output: "Validated scope, requirements, and backlog" },
          { name: "Architecture and Design", weeks: 3, output: "Architecture, UX flows, and release plan" },
          { name: "Build Sprints", weeks: Math.max(5, durationWeeks - 9), output: "Working increments and demos" },
          { name: "Testing and UAT", weeks: 3, output: "Defect closure and client acceptance" },
          { name: "Deployment and Hypercare", weeks: 1, output: "Production launch and handover" }
        ],
        milestones: ["Kickoff", "Requirements baseline", "Architecture approval", "MVP demo", "UAT sign-off", "Go-live"]
      },
      reviewNotes: []
    };
  }
}
