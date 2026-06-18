import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  ProductPlan,
  RiskPlan,
  TimelinePlan,
  WorkflowState
} from "@/lib/types";
import {
  getProjectSignals,
  pickRelevantItems
} from "@/lib/agents/rfp-intelligence";

export class RiskAgent extends BaseAgent<RiskPlan> {

  constructor() {
    super(
      "risk",
      "Risk Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<RiskPlan>> {

    const timeline =
      state.outputs.timeline
        ?.findings as TimelinePlan;

    const product =
      state.outputs.productManager
        ?.findings as ProductPlan;

    const signals =
      getProjectSignals(state.rfp);

    const deliveryRisks = pickRelevantItems(
      state.rfp.risks.filter((item) => /schedule|timeline|stakeholder|approval|delay|training|adoption|cutover/i.test(item)),
      deliveryRiskFallback(signals.domain)
    );

    if (
      timeline.durationWeeks < 16 &&
      product.features.length > 10
    ) {
      deliveryRisks.push(
        "Aggressive schedule"
      );
    }

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.95,

      assumptions: [
        "Risk analysis based on scope, timeline and architecture."
      ],

      findings: {
        technicalRisks: pickRelevantItems(
          state.rfp.risks.filter((item) => /technical|integration|security|data|migration|legacy|cms|erp/i.test(item)),
          technicalRiskFallback(signals.domain)
        ),

        deliveryRisks,

        budgetRisks: pickRelevantItems(
          state.rfp.risks.filter((item) => /budget|cost|license|procurement|scope/i.test(item)),
          budgetRiskFallback(signals.domain)
        ),

        complianceRisks: pickRelevantItems(
          state.rfp.constraints.filter((item) => /security|compliance|privacy|wcag|ada|audit|legal/i.test(item)),
          complianceRiskFallback(signals.domain)
        ),

        mitigations: mitigationFallback(signals.domain),

        riskSummary:
          riskSummaryForDomain(state.rfp.projectName, signals.domain)
      },

      reviewNotes: []
    };
  }
}

function technicalRiskFallback(domain: string): string[] {
  if (domain === "erp") {
    return [
      "Legacy accounting and spreadsheet data may require cleansing before conversion.",
      "Payroll, finance and grant-accounting configuration errors could affect operational accuracy.",
      "Identity, SSO and role-based permissions must be configured carefully to protect sensitive financial and HR data."
    ];
  }

  if (domain === "website") {
    return [
      "Content migration may create broken links, missing metadata or search-quality issues.",
      "Accessibility compliance may require remediation across templates, media and editorial workflows."
    ];
  }

  if (domain === "mobile") {
    return [
      "Mobile device compatibility and offline/error handling may affect field adoption.",
      "API availability and authentication flows may affect mobile reliability."
    ];
  }

  return [
    "Integration complexity may affect design and testing effort.",
    "Production deployment issues may arise without environment and release controls."
  ];
}

function deliveryRiskFallback(domain: string): string[] {
  if (domain === "erp") {
    return [
      "User adoption may be difficult because finance, HR and field staff will be moving away from familiar manual tools.",
      "Decision delays on process design, approval routing and reporting layouts may affect configuration progress."
    ];
  }

  if (domain === "website") {
    return [
      "Stakeholder review cycles for content, design and accessibility may extend launch readiness.",
      "Content ownership and migration decisions may delay implementation."
    ];
  }

  return [
    "Requirement changes may affect delivery sequencing.",
    "Stakeholder review delays may affect milestone completion."
  ];
}

function budgetRiskFallback(domain: string): string[] {
  if (domain === "erp") {
    return [
      "ERP licensing, implementation services and support costs may change after final module selection.",
      "Data migration and reporting remediation can expand if legacy data quality is poor."
    ];
  }

  return [
    "Scope expansion may increase delivery cost.",
    "Vendor or hosting costs may change after final platform selection."
  ];
}

function complianceRiskFallback(domain: string): string[] {
  if (domain === "erp") {
    return [
      "Financial, payroll and grant-management controls must satisfy audit and public-sector compliance expectations.",
      "Accessibility and security requirements must be validated before go-live."
    ];
  }

  if (domain === "website") {
    return [
      "WCAG/accessibility compliance must be validated across templates and content.",
      "Privacy, security and content governance requirements must be confirmed before launch."
    ];
  }

  return [
    "Security review delays may affect launch readiness.",
    "Compliance evidence should be gathered before production approval."
  ];
}

function mitigationFallback(domain: string): string[] {
  if (domain === "erp") {
    return [
      "Run a pilot migration with reconciliation checkpoints before full conversion.",
      "Validate payroll, finance and grant-accounting scenarios with named business owners.",
      "Use role-based security workshops to confirm permissions before user acceptance testing.",
      "Plan training by user group so finance, HR and field staff can adopt the new workflows."
    ];
  }

  if (domain === "website") {
    return [
      "Use content migration sampling and link validation before launch.",
      "Apply accessibility checkpoints during design, build and QA.",
      "Run launch-readiness reviews for redirects, analytics, search and governance."
    ];
  }

  return [
    "Use incremental delivery with milestone acceptance checkpoints.",
    "Hold weekly governance reviews for risks, decisions and dependencies.",
    "Validate architecture and release readiness before production deployment."
  ];
}

function riskSummaryForDomain(projectName: string, domain: string): string {
  if (domain === "erp") {
    return `${projectName} is achievable with disciplined management of data conversion, payroll and finance configuration, user adoption, reporting accuracy, access control and go-live readiness.`;
  }

  if (domain === "website") {
    return `${projectName} is achievable with active management of content migration, accessibility validation, stakeholder approvals, search quality and launch readiness.`;
  }

  return `${projectName} is achievable with active management of integration, delivery, security, budget and operational-readiness risks.`;
}
