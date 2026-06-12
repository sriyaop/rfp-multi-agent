import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  TechnicalPlan,
  WorkflowState
} from "@/lib/types";

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

    const requirementsText =
      JSON.stringify(
        state.rfp.technicalRequirements
      ).toLowerCase();

    const mobile =
      requirementsText.includes("mobile");

    const integrations =
      state.rfp.technicalRequirements.filter(
        item =>
          item.toLowerCase().includes("api") ||
          item.toLowerCase().includes("integration")
      );

    const techStack = [
      "Next.js",
      "TypeScript",
      "Node.js",
      "PostgreSQL"
    ];

    if (mobile) {
      techStack.push("React Native");
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
          "Layered enterprise architecture with frontend, backend APIs, database and integrations.",

        frontendArchitecture: [
          "Next.js Application",
          "Responsive UI",
          "Role Based Access"
        ],

        backendArchitecture: [
          "REST APIs",
          "Business Services Layer",
          "Validation Layer"
        ],

        databaseArchitecture: [
          "PostgreSQL",
          "Relational Data Model",
          "Backup Strategy"
        ],

        securityArchitecture: [
          "Authentication",
          "Authorization",
          "Audit Logging"
        ],

        deploymentArchitecture: [
          "Cloud Hosting",
          "CI/CD Pipeline"
        ],

        integrations,

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

        technicalRisks: [
          "Integration complexity",
          "Requirement volatility"
        ],

        architectureRationale: [
          "Supports future growth",
          "Reduces operational risk",
          "Improves maintainability"
        ]
      },

      reviewNotes: []
    };
  }
}