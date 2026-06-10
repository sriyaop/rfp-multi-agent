import { AgentMessage, AgentOutput, AgentRole, RfpAnalysis, ReviewFinding, WorkflowState } from "@/lib/types";

/**
 * In-memory workflow state shared across agents during one autonomous proposal run.
 */
export class WorkflowMemory {
  private readonly state: WorkflowState;

  constructor(rfp: RfpAnalysis) {
    this.state = {
      rfp,
      messages: [],
      outputs: {},
      reviews: []
    };
  }

  /**
   * Stores a coordination or debate message between agents.
   */
  addMessage(from: AgentRole, to: AgentRole | "all", content: string): void {
    const message: AgentMessage = { from, to, content, createdAt: new Date().toISOString() };
    this.state.messages.push(message);
  }

  /**
   * Stores the latest structured output for an agent.
   */
  setOutput(output: AgentOutput): void {
    this.state.outputs[output.agent] = output;
  }

  /**
   * Adds review findings from the debate cycle.
   */
  addReviews(findings: ReviewFinding[]): void {
    this.state.reviews.push(...findings);
  }

  /**
   * Returns the mutable state object used by the active workflow.
   */
  snapshot(): WorkflowState {
    return this.state;
  }
}
