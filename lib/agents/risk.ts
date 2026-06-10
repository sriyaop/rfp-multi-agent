import { BaseAgent } from "@/lib/agents/base";
import { AgentOutput, RiskPlan, WorkflowState } from "@/lib/types";

/**
 * Generates technical, delivery, and budget risks with mitigation plans.
 */
export class RiskAgent extends BaseAgent<RiskPlan> {
  constructor() {
    super("risk", "Risk Agent");
  }

  async run(state: WorkflowState): Promise<AgentOutput<RiskPlan>> {
    return {
      agent: this.role,
      title: this.displayName,
      confidence: 0.83,
      assumptions: ["Risk severity should be recalibrated after vendor Q&A and stakeholder interviews."],
      findings: {
        technicalRisks: ["Incomplete integration details", "Security and data privacy obligations", "Performance expectations under load"],
        deliveryRisks: ["Slow feedback cycles", "Scope growth after award", "Dependency on third-party approvals"],
        budgetRisks: ["Unpriced change requests", "Infrastructure usage variance", "Compliance remediation effort"],
        mitigations: [
          "Run discovery workshops before final baseline",
          "Maintain a change-control process",
          "Add contingency to budget and timeline",
          "Validate integrations early with technical spikes",
          "Use cross-agent consistency checks before proposal release"
        ]
      },
      reviewNotes: []
    };
  }
}
