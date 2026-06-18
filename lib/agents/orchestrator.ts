import { AgentRegistry } from "@/lib/agents/registry";
import { CEOAgent } from "@/lib/agents/ceo";
import { WorkflowMemory } from "@/lib/agents/workflow-memory";

import {
  CostPlan,
  ProductPlan,
  Proposal,
  ResourcePlan,
  ReviewFinding,
  RfpAnalysis,
  TimelinePlan
} from "@/lib/types";
import { money } from "@/lib/utils";

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
      `Initiating proposal strategy for ${rfp.projectName}.`
    );

    const ceoOutput =
      await this.ceo.run(state);

    memory.setOutput(
      ceoOutput
    );

    memory.addMessage(
      "ceo",
      "productManager",
      "Identify functional scope, business priorities and delivery objectives."
    );

    for (
      const role of
      ceoOutput.findings.delegationOrder
    ) {

      const output =
        await this.registry
          .get(role)
          .run(state);

      memory.setOutput(
        output
      );

      switch (role) {

        case "productManager": {

          const product =
            output.findings as ProductPlan;

          memory.addMessage(
            "productManager",
            "cto",
            `Detected ${product.features.length} primary requirements requiring architecture review.`
          );

          memory.addMessage(
            "productManager",
            "ceo",
            `Functional scope established across ${product.features.length} feature areas.`
          );

          break;
        }

        case "cto": {

          const tech =
            output.findings as any;

          memory.addMessage(
            "cto",
            "ceo",
            "Recommended layered enterprise architecture with API integration layer."
          );

          memory.addMessage(
            "cto",
            "resourcePlanning",
            `Architecture requires ${tech.techStack.length} core technology components.`
          );

          break;
        }

        case "resourcePlanning": {

          const resource =
            output.findings as ResourcePlan;

          memory.addMessage(
            "resourcePlanning",
            "ceo",
            `Estimated staffing requirement of ${resource.totalFte} FTE and ${resource.effortPersonMonths} person-months.`
          );

          memory.addMessage(
            "resourcePlanning",
            "costEstimation",
            "Resource allocation finalized for cost modelling."
          );

          break;
        }

        case "costEstimation": {

          const cost =
            output.findings as CostPlan;

          memory.addMessage(
            "costEstimation",
            "ceo",
            `Estimated project budget of ${money(cost.totalBudget, cost.currency)}.`
          );

          break;
        }

        case "timeline": {

          const timeline =
            output.findings as TimelinePlan;

          memory.addMessage(
            "timeline",
            "ceo",
            `Initial schedule estimated at ${timeline.durationWeeks} weeks.`
          );

          break;
        }

        case "risk": {

          memory.addMessage(
            "risk",
            "ceo",
            "Reviewing delivery, technical and commercial risks."
          );

          break;
        }
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
        finding => {

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

    const timeline =
      state.outputs.timeline
        ?.findings as TimelinePlan;

    const product =
      state.outputs.productManager
        ?.findings as ProductPlan;

    if (
      timeline &&
      product &&
      product.features.length > 10 &&
      timeline.durationWeeks < 24
    ) {

      memory.addMessage(
        "risk",
        "timeline",
        "Timeline appears aggressive given implementation complexity."
      );

      memory.addMessage(
        "ceo",
        "timeline",
        "Please revise delivery assumptions and include contingency."
      );

      timeline.durationWeeks += 4;

      timeline.estimatedCompletionDate =
        new Date(
          Date.now() +
          timeline.durationWeeks *
          7 *
          24 *
          60 *
          60 *
          1000
        )
          .toISOString()
          .slice(0, 10);

      memory.addMessage(
        "timeline",
        "ceo",
        `Timeline revised to ${timeline.durationWeeks} weeks after risk review.`
      );
    }

    memory.addReviews(
      reviewFindings
    );

    const ceoDecisions =
      this.ceo.resolveConflicts(
        reviewFindings
      );

    ceoDecisions.forEach(
      decision =>
        memory.addMessage(
          "ceo",
          "all",
          decision
        )
    );

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
          `Updated analysis after review cycle (${targeted.length} findings addressed).`
        );
      }
    }

    memory.addMessage(
      "ceo",
      "all",
      "Proposal approved for final compilation."
    );

    memory.addMessage(
      "ceo",
      "all",
      "Generating executive proposal package."
    );

    return this.ceo.consolidate(
      state
    );
  }
}
