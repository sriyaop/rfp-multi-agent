import { BaseAgent } from "@/lib/agents/base";
import { CostEstimationAgent } from "@/lib/agents/cost-estimation";
import { CTOAgent } from "@/lib/agents/cto";
import { ProductManagerAgent } from "@/lib/agents/product-manager";
import { ResourcePlanningAgent } from "@/lib/agents/resource-planning";
import { RiskAgent } from "@/lib/agents/risk";
import { TimelineAgent } from "@/lib/agents/timeline";
import { AgentRole } from "@/lib/types";

/**
 * Extensible specialist registry for current and future proposal agents.
 */
export class AgentRegistry {
  private readonly agents = new Map<AgentRole, BaseAgent<unknown>>();

  constructor() {
    this.register(new ProductManagerAgent());
    this.register(new CTOAgent());
    this.register(new ResourcePlanningAgent());
    this.register(new CostEstimationAgent());
    this.register(new TimelineAgent());
    this.register(new RiskAgent());
  }

  /**
   * Adds or replaces a specialist agent by role.
   */
  register(agent: BaseAgent<unknown>): void {
    this.agents.set(agent.role, agent);
  }

  /**
   * Returns a specialist by role or throws for unknown roles.
   */
  get(role: AgentRole): BaseAgent<unknown> {
    const agent = this.agents.get(role);
    if (!agent) {
      throw new Error(`No agent registered for role: ${role}`);
    }
    return agent;
  }
}
