import { AgentRegistry } from "@/lib/agents/registry";
import { CEOAgent } from "@/lib/agents/ceo";
import { WorkflowMemory } from "@/lib/agents/workflow-memory";

import {
  Proposal,
  RfpAnalysis,
  ReviewFinding
} from "@/lib/types";

export class ProposalOrchestrator {

  private readonly ceo =
    new CEOAgent();

  private readonly registry =
    new AgentRegistry();

  async run(
    rfp: RfpAnalysis
  ): Promise<Proposal> {

    const memory =
      new WorkflowMemory(rfp);

    const state =
      memory.snapshot();

    memory.addMessage(
      "ceo",
      "all",
      `Initiating proposal analysis for ${rfp.projectName}.`
    );

    const ceoOutput =
      await this.ceo.run(state);

    memory.setOutput(
      ceoOutput
    );

    memory.addMessage(
      "ceo",
      "all",
      "Reviewing project objectives, scope and delivery strategy."
    );

    memory.addMessage(
      "ceo",
      "all",
      "Delegating analysis to specialist agents."
    );

    for (
      const role of
      ceoOutput.findings.delegationOrder
    ) {

      memory.addMessage(
        "ceo",
        role,
        `Please analyze your assigned domain and provide recommendations.`
      );

      const output =
        await this.registry
          .get(role)
          .run(state);

      memory.setOutput(
        output
      );

      memory.addMessage(
        role,
        "ceo",
        `${output.title} completed analysis with ${Math.round(output.confidence * 100)}% confidence.`
      );

      if (
        Array.isArray(
          (output.findings as any).features
        )
      ) {
        memory.addMessage(
          role,
          "all",
          `Identified ${
            (output.findings as any).features.length
          } primary features.`
        );
      }

      if (
        Array.isArray(
          (output.findings as any).techStack
        )
      ) {
        memory.addMessage(
          role,
          "all",
          `Recommended ${
            (output.findings as any).techStack.length
          } technology components.`
        );
      }

      if (
        (output.findings as any).totalBudget
      ) {
        memory.addMessage(
          role,
          "all",
          `Estimated project budget: $${(
            output.findings as any
          ).totalBudget.toLocaleString()}.`
        );
      }

      if (
        (output.findings as any)
          .durationWeeks
      ) {
        memory.addMessage(
          role,
          "all",
          `Estimated delivery duration: ${
            (output.findings as any)
              .durationWeeks
          } weeks.`
        );
      }

      if (
        (output.findings as any)
          .effortPersonMonths
      ) {
        memory.addMessage(
          role,
          "all",
          `Estimated effort: ${
            (output.findings as any)
              .effortPersonMonths
          } person months.`
        );
      }
    }

    const reviewFindings:
      ReviewFinding[] = [];

    memory.addMessage(
      "ceo",
      "all",
      "Initiating cross-agent review cycle."
    );

    for (
      const role of
      ceoOutput.findings.delegationOrder
    ) {

      const findings =
        await this.registry
          .get(role)
          .review(state);

      reviewFindings.push(
        ...findings
      );

      findings.forEach(
        (finding) => {

          memory.addMessage(
            finding.reviewer,
            finding.target,
            finding.finding
          );

          memory.addMessage(
            finding.reviewer,
            finding.target,
            `Recommendation: ${finding.recommendation}`
          );
        }
      );
    }

    memory.addReviews(
      reviewFindings
    );

    const ceoDecisions =
      this.ceo.resolveConflicts(
        reviewFindings
      );

    for (
      const decision of ceoDecisions
    ) {
      memory.addMessage(
        "ceo",
        "all",
        decision
      );
    }

    for (
      const role of
      ceoOutput.findings.delegationOrder
    ) {

      const current =
        state.outputs[role];

      if (!current) {
        continue;
      }

      const targeted =
        reviewFindings.filter(
          finding =>
            finding.target === role
        );

      const revised =
        await this.registry
          .get(role)
          .revise(
            current,
            targeted
          );

      memory.setOutput(
        revised
      );

      if (
        targeted.length > 0
      ) {
        memory.addMessage(
          role,
          "ceo",
          `Updated output after review cycle (${targeted.length} revisions).`
        );
      }
    }

    memory.addMessage(
      "ceo",
      "all",
      "Proposal generation completed."
    );

    memory.addMessage(
      "ceo",
      "all",
      "Consolidating final proposal."
    );

    return this.ceo.consolidate(
      state
    );
  }
}