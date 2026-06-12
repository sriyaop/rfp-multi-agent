import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  ProductPlan,
  ResourcePlan,
  TechnicalPlan,
  WorkflowState
} from "@/lib/types";

export class ResourcePlanningAgent extends BaseAgent<ResourcePlan> {

  constructor() {
    super(
      "resourcePlanning",
      "Resource Planning Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<ResourcePlan>> {

    const product =
      state.outputs.productManager
        ?.findings as ProductPlan;

    const technical =
      state.outputs.cto
        ?.findings as TechnicalPlan;

    const featureCount =
      product.features.length;

    const integrationCount =
      technical.integrations.length;

    let teamComposition;

    if (
      featureCount > 15 ||
      integrationCount > 3
    ) {
      teamComposition = [
        { role: "Project Manager", fte: 1, months: 8 },
        { role: "Solution Architect", fte: 1, months: 6 },
        { role: "Senior Developer", fte: 3, months: 8 },
        { role: "QA Engineer", fte: 2, months: 6 },
        { role: "DevOps Engineer", fte: 1, months: 4 }
      ];
    } else {
      teamComposition = [
        { role: "Project Manager", fte: 1, months: 6 },
        { role: "Developer", fte: 2, months: 6 },
        { role: "QA Engineer", fte: 1, months: 4 }
      ];
    }

    const totalFte =
      teamComposition.reduce(
        (sum, item) => sum + item.fte,
        0
      );

    const effortPersonMonths =
      teamComposition.reduce(
        (sum, item) =>
          sum + item.fte * item.months,
        0
      );

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.95,

      assumptions: [
        "Resource plan based on scope and architecture complexity."
      ],

      findings: {
        teamComposition,
        totalFte,
        effortPersonMonths,

        allocationPlan: [
          "Discovery & Design",
          "Implementation",
          "Testing",
          "Deployment"
        ],

        staffingStrategy: [
          "Dedicated project team",
          "Shared governance model"
        ],

        criticalSkills: [
          "Full Stack Development",
          "Architecture",
          "QA",
          "DevOps"
        ],

        hiringRisks: [
          "Specialized skills availability"
        ]
      },

      reviewNotes: []
    };
  }
}