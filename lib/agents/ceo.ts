import { BaseAgent } from "@/lib/agents/base";
import { GeminiClient } from "@/lib/ai/gemini";

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

  private readonly llm =
    new GeminiClient();

  constructor() {
    super(
      "ceo",
      "CEO Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<CEOPlan>> {

    const result =
      await this.llm.generateJson<CEOPlan>(
        `
You are a CEO leading a proposal response team.

Your responsibilities:

- Evaluate opportunity attractiveness
- Define proposal strategy
- Coordinate specialists
- Identify executive concerns
- Establish decision rules

Return JSON only.
`,
        `
CLIENT:
${state.rfp.clientName}

PROJECT:
${state.rfp.projectName}

EXECUTIVE SUMMARY:
${state.rfp.executiveSummary}

BUSINESS OBJECTIVES:
${JSON.stringify(
  state.rfp.businessObjectives,
  null,
  2
)}

EVALUATION CRITERIA:
${JSON.stringify(
  state.rfp.evaluationCriteria,
  null,
  2
)}

PROPOSAL INSIGHTS:
${JSON.stringify(
  state.rfp.proposalInsights,
  null,
  2
)}

Generate:

{
  "delegationOrder": [
    "productManager",
    "cto",
    "resourcePlanning",
    "costEstimation",
    "timeline",
    "risk"
  ],

  "coordinationNotes": [],

  "finalDecisionRules": [],

  "bidStrategy": [],

  "executiveObservations": []
}
`
      );

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.95,

      assumptions: [
        "Executive strategy generated from RFP analysis."
      ],

      findings: {
        ...result,

        delegationOrder: [
          "productManager",
          "cto",
          "resourcePlanning",
          "costEstimation",
          "timeline",
          "risk"
        ]
      },

      reviewNotes: []
    };
  }

  consolidate(
    state: WorkflowState
  ): Proposal {

    return buildProposal(
      state
    );
  }

  resolveConflicts(
    findings: ReviewFinding[]
  ): string[] {

    if (
      findings.length === 0
    ) {
      return [
        "Cross-agent review completed with no critical conflicts."
      ];
    }

    return findings.map(
      finding =>
        `Executive review: ${finding.target} requires revision. ${finding.recommendation}`
    );
  }
}