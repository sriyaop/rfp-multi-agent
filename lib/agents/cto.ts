import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  TechnicalPlan,
  WorkflowState
} from "@/lib/types";
import {
  getProjectSignals,
  pickRelevantItems
} from "@/lib/agents/rfp-intelligence";

export class CTOAgent extends BaseAgent<TechnicalPlan> {

  constructor() {
    super(
      "cto",
      "CTO Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<TechnicalPlan>> {

    const signals =
      getProjectSignals(state.rfp);

    const integrations =
      [...state.rfp.technicalRequirements, ...state.rfp.scopeItems].filter(
        item =>
          item.toLowerCase().includes("api") ||
          item.toLowerCase().includes("integration") ||
          item.toLowerCase().includes("migration") ||
          item.toLowerCase().includes("interface")
      );

    const techStack =
      signals.domain === "erp"
        ? ["ERP Platform", "Workflow Engine", "Integration Middleware", "PostgreSQL", "Reporting/BI Layer"]
        : signals.domain === "website"
        ? ["Enterprise CMS", "Next.js", "TypeScript", "Search Platform", "CDN/WAF"]
        : signals.domain === "mobile"
        ? ["React Native", "API Gateway", "Node.js", "PostgreSQL", "Push Notification Service"]
        : ["Next.js", "TypeScript", "Node.js", "PostgreSQL"];

    if (signals.complianceCount > 0) {
      techStack.push("IAM/SSO", "Audit Logging");
    }

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.96,

      assumptions: [
        "Architecture generated from RFP requirements."
      ],

      findings: {
        architectureOverview:
          `AI-derived ${signals.domain} architecture for ${state.rfp.projectName}, with ${signals.integrationCount} integration/compliance signals and a ${signals.complexity.toLowerCase()} complexity profile.`,

        frontendArchitecture:
          signals.domain === "erp"
            ? ["Role-based operational workspaces", "Approval dashboards", "Financial reporting views"]
            : signals.domain === "website"
            ? ["Accessible responsive website", "CMS authoring workflows", "Site search and content templates"]
            : ["Responsive UI", "Role Based Access", "User workflow screens"],

        backendArchitecture: pickRelevantItems(
          state.rfp.technicalRequirements,
          ["API services", "Business workflow services", "Validation and rules layer"]
        ),

        databaseArchitecture: [
          signals.domain === "erp" ? "Financial and operational data model" : "Relational data model",
          "Reporting-ready schema",
          "Backup and recovery strategy"
        ],

        securityArchitecture: pickRelevantItems(
          state.rfp.constraints.filter((item) => /security|audit|access|privacy|compliance|wcag|ada/i.test(item)),
          ["Authentication", "Authorization", "Audit Logging"]
        ),

        deploymentArchitecture: [
          "Cloud Hosting",
          "CI/CD Pipeline"
        ],

        integrations: pickRelevantItems(
          integrations,
          ["Integration scope to be confirmed during discovery"]
        ),

        monitoringStrategy: [
          "Application Monitoring",
          "Error Tracking",
          "Audit Logs"
        ],

        techStack,

        scalabilityStrategy: [
          "Horizontal Scaling",
          "API Layer Separation"
        ],

        technicalRisks: pickRelevantItems(
          state.rfp.risks.filter((item) => /technical|integration|security|data|migration|legacy/i.test(item)),
          ["Integration complexity", "Requirement volatility"]
        ),

        architectureRationale: [
          `Matches the AI-identified ${signals.domain} project profile.`,
          "Addresses the highest-signal technical and compliance requirements.",
          "Keeps integration, reporting and operational risk visible from design onward."
        ]
      },

      reviewNotes: []
    };
  }
}
