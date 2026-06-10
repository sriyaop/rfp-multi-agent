import { AgentOutput, AgentRole, ReviewFinding, WorkflowState } from "@/lib/types";

/**
 * Base contract for every autonomous specialist in the proposal workflow.
 */
export abstract class BaseAgent<TFindings> {
  protected constructor(
    public readonly role: AgentRole,
    public readonly displayName: string
  ) {}

  /**
   * Produces the agent's first-pass specialist output from shared workflow state.
   */
  abstract run(state: WorkflowState): Promise<AgentOutput<TFindings>>;

  /**
   * Reviews peer outputs and returns concrete issues or revision requests.
   */
  async review(_state: WorkflowState): Promise<ReviewFinding[]> {
    return [];
  }

  /**
   * Applies review findings that target this agent's output.
   */
  async revise(output: AgentOutput<TFindings>, findings: ReviewFinding[]): Promise<AgentOutput<TFindings>> {
    if (findings.length === 0) {
      return output;
    }

    return {
      ...output,
      confidence: Math.min(0.98, output.confidence + 0.03),
      reviewNotes: findings.map((item) => `${item.reviewer}: ${item.recommendation}`)
    };
  }
}
