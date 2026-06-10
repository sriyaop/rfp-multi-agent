import { BaseAgent } from "@/lib/agents/base";
import { AgentOutput, AgentRole, Proposal, ReviewFinding, WorkflowState } from "@/lib/types";
import { buildProposal } from "@/lib/proposal/builder";

export interface CEOPlan {
  delegationOrder: AgentRole[];
  coordinationNotes: string[];
  finalDecisionRules: string[];
}

/**
 * Master agent that delegates, coordinates reviews, resolves conflicts, and consolidates the proposal.
 */
export class CEOAgent extends BaseAgent<CEOPlan> {
  constructor() {
    super("ceo", "CEO Agent");
  }

  async run(state: WorkflowState): Promise<AgentOutput<CEOPlan>> {
    return {
      agent: this.role,
      title: this.displayName,
      confidence: 0.88,
      assumptions: ["Specialist agents own their domains; CEO only coordinates and consolidates."],
      findings: {
        delegationOrder: ["productManager", "cto", "resourcePlanning", "costEstimation", "timeline", "risk"],
        coordinationNotes: [
          "Product scope informs architecture, resources, cost, and timeline.",
          "Resource planning must feed cost and schedule estimates.",
          "Risk review must validate budget, FTE, and timeline realism."
        ],
        finalDecisionRules: [
          "Prefer conservative delivery estimates when agents disagree.",
          "Flag unresolved conflicts instead of hiding them.",
          "Include confidence scores and assumptions in the final output."
        ]
      },
      reviewNotes: []
    };
  }

  /**
   * Consolidates specialist artifacts into the final executive proposal.
   */
  consolidate(state: WorkflowState): Proposal {
    return buildProposal(state);
  }

  /**
   * Resolves debate findings into concise coordination messages.
   */
  resolveConflicts(findings: ReviewFinding[]): string[] {
    return findings.map((finding) => `${finding.target} revision requested: ${finding.recommendation}`);
  }
}
