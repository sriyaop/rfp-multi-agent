import { BaseAgent } from "@/lib/agents/base";
import { AgentOutput, TechnicalPlan, WorkflowState } from "@/lib/types";

/**
 * Generates technology stack, architecture, integrations, scalability, and technical risks.
 */
export class CTOAgent extends BaseAgent<TechnicalPlan> {
  constructor() {
    super("cto", "CTO Agent");
  }

  async run(state: WorkflowState): Promise<AgentOutput<TechnicalPlan>> {
    const joined = `${state.rfp.requirements.join(" ")} ${state.rfp.constraints.join(" ")}`.toLowerCase();
    const isMobile = /mobile|android|ios|app/.test(joined);
    const isAi = /ai|machine learning|llm|automation|agent/.test(joined);

    return {
      agent: this.role,
      title: this.displayName,
      confidence: 0.84,
      assumptions: ["Cloud-native deployment is acceptable unless the RFP mandates on-premise hosting."],
      findings: {
        techStack: [
          isMobile ? "React Native or Flutter" : "Next.js and TypeScript",
          "Node.js API layer",
          "PostgreSQL",
          isAi ? "OpenAI-compatible LLM provider" : "REST/GraphQL integrations",
          "Docker and CI/CD"
        ],
        architecture: [
          "Modular web application with API routes for orchestration",
          "Agent registry for pluggable specialist agents",
          "Document ingestion service for PDF, DOCX, and text RFPs",
          "Stateful workflow memory for messages, artifacts, review findings, and validation results",
          "Markdown and PDF proposal exporters"
        ],
        integrations: ["Identity provider", "Email/notification service", "Analytics/logging", "Client systems listed in the RFP"],
        scalability: ["Stateless application tier", "Queue-ready background processing", "Database indexing for proposal history", "Horizontal scaling behind a load balancer"],
        technicalRisks: ["Ambiguous integration requirements", "Data security obligations", "LLM output quality and traceability"]
      },
      reviewNotes: []
    };
  }
}
