import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  ResourcePlan,
  WorkflowState
} from "@/lib/types";
import { getProjectSignals } from "@/lib/agents/rfp-intelligence";

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

    const signals =
      getProjectSignals(state.rfp);

    let teamComposition;

    if (signals.domain === "erp" || signals.complexity === "High") {

      teamComposition = [
        { role: "Program Manager", fte: 1, months: 10 },
        { role: "Solution Architect", fte: 1, months: 8 },
        { role: signals.domain === "erp" ? "ERP Functional Consultant" : "Senior Business Analyst", fte: 2, months: 8 },
        { role: "Senior Developer", fte: 3, months: 9 },
        { role: "Integration Engineer", fte: Math.max(1, Math.min(2, signals.integrationCount)), months: 7 },
        { role: "QA Engineer", fte: 2, months: 7 },
        { role: "DevOps Engineer", fte: 1, months: 5 }
      ];

    }
    else if (signals.domain === "website" || signals.complexity === "Medium") {

      teamComposition = [
        { role: "Project Manager", fte: 1, months: 8 },
        { role: "UX/UI Lead", fte: 1, months: 5 },
        { role: signals.domain === "website" ? "CMS Developer" : "Senior Developer", fte: 2, months: 7 },
        { role: "Frontend Developer", fte: 2, months: 6 },
        { role: "QA Engineer", fte: 2, months: 6 },
        { role: "DevOps Engineer", fte: 1, months: 3 }
      ];

    }
    else {

      teamComposition = [
        { role: "Project Manager", fte: 1, months: 6 },
        { role: "Developer", fte: signals.suggestedTeamSize - 2, months: 6 },
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

    const estimatedHours =
      effortPersonMonths * 160;

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
        estimatedHours,

        allocationPlan: [
          "Discovery & Design",
          "Implementation",
          "Testing",
          "Deployment"
        ],

        staffingStrategy: [
          `${signals.complexity} complexity team sized from AI-extracted scope.`,
          `Staffing emphasizes ${signals.domain === "erp" ? "functional ERP expertise and integrations" : signals.domain === "website" ? "UX, CMS and accessibility delivery" : "implementation and QA execution"}.`
        ],

        criticalSkills: [
          signals.domain === "erp" ? "ERP implementation" : signals.domain === "website" ? "CMS/web accessibility" : "Full Stack Development",
          "Architecture",
          "QA",
          signals.integrationCount > 0 ? "Integration engineering" : "DevOps"
        ],

        hiringRisks: [
          "Specialized skills availability"
        ]
      },

      reviewNotes: []
    };
  }
}
