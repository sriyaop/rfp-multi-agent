import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  ResourcePlan,
  WorkflowState
} from "@/lib/types";
import { getProjectSignals } from "@/lib/agents/rfp-intelligence";
import { roundOne } from "@/lib/utils";

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

    const durationMonths =
      roundOne(
        Math.max(
          3,
          signals.suggestedTimelineWeeks / 4
        )
      );

    const deliveryLoad =
      signals.requirementCount +
      signals.integrationCount * 2 +
      signals.dataMigrationCount * 2 +
      signals.reportingCount +
      signals.workflowCount +
      signals.complianceCount;

    const developerFte =
      roundOne(
        Math.min(
          6,
          Math.max(
            1,
            deliveryLoad / 12
          )
        )
      );

    const qaFte =
      roundOne(
        Math.min(
          3,
          Math.max(
            0.5,
            developerFte * 0.45 + signals.complianceCount * 0.08
          )
        )
      );

    const teamComposition = [
      {
        role:
          signals.complexity === "High"
            ? "Program Manager"
            : "Project Manager",
        fte: signals.complexity === "High" ? 1 : 0.75,
        months: durationMonths
      },
      {
        role: "Business Analyst / Product Owner",
        fte: roundOne(Math.min(2, Math.max(0.5, signals.requirementCount / 18))),
        months: roundOne(Math.max(2.5, durationMonths * 0.55))
      },
      {
        role:
          signals.domain === "erp"
            ? "ERP Solution Architect"
            : signals.domain === "website"
            ? "CMS / Web Architect"
            : signals.domain === "mobile"
            ? "Mobile Solution Architect"
            : "Solution Architect",
        fte: signals.complexity === "Low" ? 0.5 : 1,
        months: roundOne(Math.max(2.5, durationMonths * 0.55))
      },
      {
        role:
          signals.domain === "erp"
            ? "ERP Functional Consultant"
            : signals.domain === "website"
            ? "CMS / Frontend Developer"
            : signals.domain === "mobile"
            ? "Mobile Developer"
            : "Application Developer",
        fte: developerFte,
        months: roundOne(Math.max(3, durationMonths * 0.72))
      },
      ...(signals.integrationCount > 0
        ? [
            {
              role: "Integration Engineer",
              fte: roundOne(Math.min(2.5, Math.max(0.5, signals.integrationCount / 4))),
              months: roundOne(Math.max(2, durationMonths * 0.55))
            }
          ]
        : []),
      ...(signals.dataMigrationCount > 0
        ? [
            {
              role: "Data Migration Specialist",
              fte: roundOne(Math.min(2, Math.max(0.5, signals.dataMigrationCount / 3))),
              months: roundOne(Math.max(2, durationMonths * 0.45))
            }
          ]
        : []),
      ...(signals.reportingCount > 0 || signals.domain === "data"
        ? [
            {
              role: "Reporting / BI Specialist",
              fte: roundOne(Math.min(1.5, Math.max(0.5, signals.reportingCount / 4))),
              months: roundOne(Math.max(2, durationMonths * 0.45))
            }
          ]
        : []),
      ...(signals.userExperienceCount > 0 || signals.domain === "website" || signals.domain === "mobile"
        ? [
            {
              role: "UX/UI Designer",
              fte: roundOne(signals.domain === "website" ? 1 : 0.5),
              months: roundOne(Math.max(2, durationMonths * 0.35))
            }
          ]
        : []),
      {
        role: "QA Engineer",
        fte: qaFte,
        months: roundOne(Math.max(2.5, durationMonths * 0.55))
      },
      {
        role: "DevOps / Release Engineer",
        fte: roundOne(signals.complexity === "Low" ? 0.4 : 0.75),
        months: roundOne(Math.max(1.5, durationMonths * 0.35))
      },
      ...(signals.trainingCount > 0
        ? [
            {
              role: "Training & Change Management Lead",
              fte: 0.5,
              months: roundOne(Math.max(1.5, durationMonths * 0.3))
            }
          ]
        : [])
    ];

    const totalFte =
      roundOne(
      teamComposition.reduce(
        (sum, item) => sum + item.fte,
        0
      )
      );

    const effortPersonMonths =
      roundOne(
      teamComposition.reduce(
        (sum, item) =>
          sum + item.fte * item.months,
        0
      )
      );

    const estimatedHours =
      Math.round(effortPersonMonths * 160);

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.95,

      assumptions: [
        "Resource plan calculated from the RFP's functional modules, integration needs, migration scope, reporting requirements, compliance obligations, training needs and support expectations."
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
          `The team is sized for a ${signals.complexity.toLowerCase()} delivery profile with functional, technical and operational workstreams running in parallel.`,
          `Integration, migration, reporting and compliance requirements drive the need for specialist coverage beyond a basic implementation team.`,
          `Staffing emphasizes ${signals.domain === "erp" ? "ERP functional coverage, data migration and integrations" : signals.domain === "website" ? "UX, CMS, accessibility and content delivery" : signals.domain === "mobile" ? "mobile experience, API integration and release management" : "application delivery, QA and release governance"}.`
        ],

        criticalSkills: [
          signals.domain === "erp" ? "ERP implementation" : signals.domain === "website" ? "CMS/web accessibility" : "Full Stack Development",
          "Architecture",
          "QA",
          signals.integrationCount > 0 ? "Integration engineering" : "DevOps",
          signals.dataMigrationCount > 0 ? "Data migration" : "Release management",
          signals.reportingCount > 0 ? "Reporting/BI" : "Stakeholder communication"
        ],

        hiringRisks: [
          "Specialized skills availability"
        ]
      },

      reviewNotes: []
    };
  }
}
