import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  TimelinePlan,
  WorkflowState
} from "@/lib/types";

import { dateAfterWeeks } from "@/lib/utils";
import { getProjectSignals } from "@/lib/agents/rfp-intelligence";

export class TimelineAgent extends BaseAgent<TimelinePlan> {

  constructor() {
    super(
      "timeline",
      "Timeline Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<TimelinePlan>> {

    let durationWeeks =
      getProjectSignals(state.rfp)
        .suggestedTimelineWeeks;

    durationWeeks =
      Math.max(
        12,
        durationWeeks
      );


    const signals =
      getProjectSignals(state.rfp);

    const phases = signals.domain === "erp"
      ? [
        { name: "Discovery & Process Mapping", weeks: 5, output: "Current/future-state process design for finance, HR, payroll, reporting and approval workflows" },
        { name: "ERP Configuration & Integrations", weeks: Math.max(10, durationWeeks - 20), output: "Configured ERP modules, identity access, workflow rules and external interfaces" },
        { name: "Data Migration & Reporting", weeks: 5, output: "Validated migrated financial/HR data, reconciliations, dashboards and reports" },
        { name: "UAT, Training & Go Live", weeks: 10, output: "Scenario testing, role-based training, cutover planning and production enablement" }
      ]
      : signals.domain === "website"
      ? [
        { name: "Discovery, Content Audit & UX", weeks: 5, output: "Validated information architecture and design system" },
        { name: "CMS Implementation", weeks: Math.max(8, durationWeeks - 18), output: "Authoring workflows, templates and integrations" },
        { name: "Accessibility, Search & QA", weeks: 6, output: "WCAG validation, content QA and search tuning" },
        { name: "Launch Readiness", weeks: 7, output: "Deployment, training and production launch" }
      ]
      : [
      {
        name: "Discovery",
        weeks: 2,
        output: "Requirements Baseline"
      },
      {
        name: "Architecture",
        weeks: 3,
        output: "Solution Design"
      },
      {
        name: "Implementation",
        weeks:
          durationWeeks - 8,
        output: "Working Product"
      },
      {
        name: "Testing & Go Live",
        weeks: 3,
        output: "Production Release"
      }
    ];

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.94,

      assumptions: [
        "Timeline derived from RFP workload categories: discovery, configuration/build, integrations, migration/reporting, testing, training and go-live readiness."
      ],

      findings: {
        durationWeeks,

        estimatedCompletionDate:
          dateAfterWeeks(
            durationWeeks
          ),

        phases,

        milestones: [
          signals.domain === "erp" ? "Process Design Approved" : "Requirements Approved",
          signals.domain === "website" ? "UX and CMS Design Approved" : "Architecture Approved",
          "Build Complete",
          "Go Live"
        ],

        rationale:
          buildTimelineRationale(signals)
      },

      reviewNotes: []
    };
  }
}

function buildTimelineRationale(
  signals: ReturnType<typeof getProjectSignals>
): string[] {
  if (signals.domain === "erp") {
    return [
      "Discovery includes process mapping because ERP success depends on confirming current and future-state finance, HR, payroll, purchasing and reporting workflows.",
      "Configuration receives the largest allocation because ERP modules, approval routing, security roles and integrations must be configured and validated together.",
      "Data migration and reporting require a dedicated phase so legacy accounting, spreadsheet and HR data can be cleansed, reconciled and validated.",
      "UAT, training and go-live require meaningful time because business users must validate payroll, finance, reporting and mobile/field workflows before production cutover."
    ];
  }

  if (signals.domain === "website") {
    return [
      "Discovery includes content audit and UX validation because website redesign work depends on content ownership, navigation and accessibility decisions.",
      "Implementation includes CMS templates, authoring workflows, search and integrations.",
      "Accessibility, content QA and launch readiness are separated to reduce compliance and production-launch risk."
    ];
  }

  return [
    "Discovery establishes requirements and acceptance criteria before build begins.",
    "Implementation duration reflects functional scope, integrations, security needs and testing effort.",
    "Testing and go-live include acceptance, release readiness and operational handover."
  ];
}
