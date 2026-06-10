import { AgentRegistry } from "@/lib/agents/registry";
import { CEOAgent } from "@/lib/agents/ceo";
import { WorkflowMemory } from "@/lib/agents/workflow-memory";
import { Proposal, RfpAnalysis } from "@/lib/types";

/**
 * Runs the hierarchical multi-agent proposal generation process end to end.
 */
export class ProposalOrchestrator {
  private readonly ceo = new CEOAgent();
  private readonly registry = new AgentRegistry();

  /**
   * Executes CEO planning, delegation, review/debate, revision, and consolidation.
   */
  async run(rfp: RfpAnalysis): Promise<Proposal> {
    const memory = new WorkflowMemory(rfp);
    const state = memory.snapshot();

    const ceoOutput = await this.ceo.run(state);
    memory.setOutput(ceoOutput);
    memory.addMessage("ceo", "all", "Delegating RFP analysis to specialist agents.");

    for (const role of ceoOutput.findings.delegationOrder) {
      const output = await this.registry.get(role).run(state);
      memory.setOutput(output);
      memory.addMessage(role, "ceo", `${output.title} completed first-pass analysis with ${Math.round(output.confidence * 100)}% confidence.`);
    }

    const reviewFindings = [];
    for (const role of ceoOutput.findings.delegationOrder) {
      reviewFindings.push(...await this.registry.get(role).review(state));
    }
    memory.addReviews(reviewFindings);

    for (const message of this.ceo.resolveConflicts(reviewFindings)) {
      memory.addMessage("ceo", "all", message);
    }

    for (const role of ceoOutput.findings.delegationOrder) {
      const current = state.outputs[role];
      if (!current) continue;
      const targeted = reviewFindings.filter((finding) => finding.target === role);
      const revised = await this.registry.get(role).revise(current, targeted);
      memory.setOutput(revised);
    }

    return this.ceo.consolidate(state);
  }
}
