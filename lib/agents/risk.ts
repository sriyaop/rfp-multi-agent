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
      ["Requirement changes", "Stakeholder delays"]
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
          signals.domain === "erp"
            ? ["ERP data migration complexity", "Legacy system integration risk"]
            : signals.domain === "website"
            ? ["CMS migration and search tuning risk", "Accessibility compliance risk"]
            : ["Integration complexity", "Production deployment issues"]
        ),

        deliveryRisks,

        budgetRisks: pickRelevantItems(
          state.rfp.risks.filter((item) => /budget|cost|license|procurement|scope/i.test(item)),
          ["Scope expansion"]
        ),

        complianceRisks: pickRelevantItems(
          state.rfp.constraints.filter((item) => /security|compliance|privacy|wcag|ada|audit|legal/i.test(item)),
          signals.complianceCount > 0 ? ["Compliance validation delays"] : ["Security review delays"]
        ),

        mitigations: [
          signals.domain === "erp" ? "Pilot migration with reconciliation checkpoints" : "Incremental delivery",
          "Weekly governance review",
          signals.domain === "website" ? "Accessibility and content QA gates" : "Architecture validation"
        ],

        riskSummary:
          `${state.rfp.projectName} is achievable with active management of ${signals.domain} delivery risks, ${signals.integrationCount} integration signals and ${signals.complianceCount} compliance signals.`
      },

      reviewNotes: []
    };
  }
}
