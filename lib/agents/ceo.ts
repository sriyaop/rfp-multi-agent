import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  AgentRole,
  Proposal,
  ReviewFinding,
  WorkflowState
} from "@/lib/types";

import { buildProposal } from "@/lib/proposal/builder";

export interface CEOPlan {
  delegationOrder: AgentRole[];
  coordinationNotes: string[];
  finalDecisionRules: string[];
  bidStrategy: string[];
  executiveObservations: string[];
}

export class CEOAgent extends BaseAgent<CEOPlan> {
  constructor() {
    super(
      "ceo",
      "CEO Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<CEOPlan>> {

    const requirementCount =
      state.rfp.functionalRequirements.length;

    const strategy =
      requirementCount > 15
        ? "Enterprise Delivery"
        : "Accelerated Delivery";

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.98,

      assumptions: [
        "RFP analysis completed successfully."
      ],

      findings: {
        delegationOrder: [
          "productManager",
          "cto",
          "resourcePlanning",
          "costEstimation",
          "timeline",
          "risk"
        ],

        coordinationNotes: [
          "Product scope must be validated first.",
          "Architecture should align with business objectives.",
          "Timeline must reflect implementation complexity."
        ],

        finalDecisionRules: [
          "Prioritize delivery realism over optimism.",
          "Address review findings before proposal finalization."
        ],

        bidStrategy: [
          strategy,
          "Risk-managed delivery",
          "Scalable architecture"
        ],

        executiveObservations: [
          `Detected ${requirementCount} functional requirements.`,
          `Project identified as ${strategy}.`
        ]
      },

      reviewNotes: []
    };
  }

  consolidate(
    state: WorkflowState
  ): Proposal {
    return buildProposal(state);
  }

  resolveConflicts(
    findings: ReviewFinding[]
  ): string[] {

    if (findings.length === 0) {
      return [
        "Cross-agent review completed. No major conflicts detected."
      ];
    }

    return findings.map(
      finding =>
        `Executive Decision: ${finding.target} must address ${finding.severity} issue. ${finding.recommendation}`
    );
  }
}