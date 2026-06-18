import { BaseAgent } from "@/lib/agents/base";

import {
  AgentOutput,
  CostPlan,
  ResourcePlan,
  ReviewFinding,
  WorkflowState
} from "@/lib/types";
import { getProjectSignals } from "@/lib/agents/rfp-intelligence";
import { money } from "@/lib/utils";

export class CostEstimationAgent extends BaseAgent<CostPlan> {

  constructor() {
    super(
      "costEstimation",
      "Cost Estimation Agent"
    );
  }

  async run(
    state: WorkflowState
  ): Promise<AgentOutput<CostPlan>> {

    const resource =
      state.outputs.resourcePlanning
        ?.findings as ResourcePlan;

    const signals =
      getProjectSignals(state.rfp);

    const rates =
      getMarketRates(signals.currency);

    const roleCosts =
      resource.teamComposition.map((item) => {
        const monthlyRate = rateForRole(item.role, rates);

        return {
          role: item.role,
          effort: item.fte * item.months,
          monthlyRate,
          amount: Math.round(item.fte * item.months * monthlyRate)
        };
      });

    const developmentCost =
      roleCosts.reduce(
        (sum, item) => sum + item.amount,
        0
      );

    const infrastructureCost =
      Math.max(
        rates.infrastructureMinimum[signals.domain],
        Math.round(
          developmentCost *
            (0.06 +
              Math.min(0.08, signals.integrationCount * 0.01) +
              Math.min(0.04, signals.securityCount * 0.008))
        )
      );

    const licensingCost =
      Math.max(
        rates.licensingMinimum[signals.domain],
        Math.round(
          developmentCost *
            (signals.domain === "erp"
              ? 0.10
              : signals.domain === "website"
              ? 0.04
              : 0.05)
        )
      );

    const contingencyCost =
      Math.round(
        developmentCost *
          (signals.complexity === "High"
            ? 0.18
            : signals.complexity === "Medium"
            ? 0.14
            : 0.10)
      );

    const supportCost =
      Math.round(
        developmentCost * (signals.supportCount > 0 ? 0.10 : 0.06)
      );

    const calculatedBudget =
      developmentCost +
      infrastructureCost +
      licensingCost +
      contingencyCost +
      supportCost;

    const explicitBudget =
      extractExplicitBudget(
        state.rfp.budgetInformation.join(" "),
        signals.currency
      );

    const totalBudget =
      explicitBudget && explicitBudget > calculatedBudget
        ? explicitBudget
        : calculatedBudget;

    const explicitBudgetNote =
      explicitBudget
        ? `RFP budget guidance detected: ${money(explicitBudget, signals.currency)}. Estimate ${explicitBudget > calculatedBudget ? "uses the stated budget ceiling because it is above calculated delivery cost." : "keeps the calculated delivery cost because it exceeds or matches the stated guidance."}`
        : "No explicit usable budget amount was stated in the RFP; estimate is calculated bottom-up from role effort, platform assumptions and delivery scope.";

    return {
      agent: this.role,

      title: this.displayName,

      confidence: 0.94,

      assumptions: [
        "Industry consulting rate model."
      ],

      findings: {
        developmentCost,
        infrastructureCost,
        licensingCost,
        contingencyCost,
        supportCost,
        totalBudget,

        currency: signals.currency,

        costDrivers: [
          `${signals.complexity} delivery profile based on the RFP scope`,
          `${resource.effortPersonMonths} person-month delivery effort across ${resource.teamComposition.length} roles`,
          `Integration, migration, reporting and compliance requirements influence specialist effort and contingency`,
          `${signals.market} market / ${signals.currency} currency inferred from RFP/company geography and budget language`,
          `${signals.domain} delivery profile`
        ],

        pricingAssumptions: [
          ...roleCosts
            .slice(0, 8)
            .map(
              (item) =>
                `${item.role}: ${money(item.monthlyRate, signals.currency)} per person-month x ${item.effort.toFixed(1)} PM = ${money(item.amount, signals.currency)}`
            ),
          explicitBudgetNote,
          "Final price should be validated during discovery against exact procurement scope, vendor pricing, hosting choices, and contractual SLA obligations."
        ],

        paymentMilestones: [
          "20% Kickoff",
          "30% Design Approval",
          "30% UAT",
          "20% Go Live"
        ]
      },

      reviewNotes: []
    };
  }

  async review(
    state: WorkflowState
  ): Promise<ReviewFinding[]> {

    const resource =
      state.outputs.resourcePlanning
        ?.findings as ResourcePlan;

    const cost =
      state.outputs.costEstimation
        ?.findings as CostPlan;

    if (
      cost.totalBudget < 50000 &&
      resource.totalFte > 5
    ) {
      return [
        {
          reviewer: this.role,
          target: "resourcePlanning",
          severity: "warning",
          finding:
            "Budget appears low for staffing model.",
          recommendation:
            "Review staffing assumptions."
        }
      ];
    }

    return [];
  }
}

type DeliveryDomain =
  | "erp"
  | "website"
  | "mobile"
  | "data"
  | "general";

interface MarketRates {
  manager: number;
  architect: number;
  analyst: number;
  developer: number;
  integration: number;
  data: number;
  ux: number;
  qa: number;
  devops: number;
  training: number;
  infrastructureMinimum: Record<DeliveryDomain, number>;
  licensingMinimum: Record<DeliveryDomain, number>;
}

function getMarketRates(currency: string): MarketRates {
  const rates: Record<string, MarketRates> = {
    INR: {
      manager: 450000,
      architect: 650000,
      analyst: 320000,
      developer: 380000,
      integration: 480000,
      data: 450000,
      ux: 300000,
      qa: 260000,
      devops: 420000,
      training: 260000,
      infrastructureMinimum: {
        erp: 2500000,
        website: 900000,
        mobile: 800000,
        data: 1200000,
        general: 700000
      },
      licensingMinimum: {
        erp: 3000000,
        website: 600000,
        mobile: 500000,
        data: 1000000,
        general: 500000
      }
    },
    GBP: scaleRates(0.78),
    EUR: scaleRates(0.92),
    CAD: scaleRates(1.35),
    AUD: scaleRates(1.5),
    USD: scaleRates(1)
  };

  return rates[currency] ?? rates.USD;
}

function scaleRates(multiplier: number): MarketRates {
  const round = (value: number) => Math.round(value * multiplier);

  return {
    manager: round(16000),
    architect: round(21000),
    analyst: round(13000),
    developer: round(15000),
    integration: round(18000),
    data: round(17500),
    ux: round(12000),
    qa: round(10500),
    devops: round(16500),
    training: round(10500),
    infrastructureMinimum: {
      erp: round(35000),
      website: round(18000),
      mobile: round(15000),
      data: round(22000),
      general: round(10000)
    },
    licensingMinimum: {
      erp: round(45000),
      website: round(12000),
      mobile: round(10000),
      data: round(18000),
      general: round(5000)
    }
  };
}

function rateForRole(role: string, rates: MarketRates): number {
  if (/program|project manager/i.test(role)) return rates.manager;
  if (/architect/i.test(role)) return rates.architect;
  if (/analyst|product owner|functional/i.test(role)) return rates.analyst;
  if (/integration/i.test(role)) return rates.integration;
  if (/data|migration|reporting|bi/i.test(role)) return rates.data;
  if (/ux|ui|designer/i.test(role)) return rates.ux;
  if (/qa|test/i.test(role)) return rates.qa;
  if (/devops|release/i.test(role)) return rates.devops;
  if (/training|change/i.test(role)) return rates.training;
  return rates.developer;
}

function extractExplicitBudget(
  value: string,
  currency: string
): number | undefined {
  const text = value.toLowerCase();

  if (!text || /not specified|not provided|unknown/.test(text)) {
    return undefined;
  }

  const amountMatch =
    text.match(/(?:₹|rs\.?|inr|\$|usd|gbp|£|eur|€|cad|aud)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac|k|m|million)?/i);

  if (!amountMatch) {
    return undefined;
  }

  const rawAmount =
    Number(amountMatch[1].replace(/,/g, ""));

  if (!Number.isFinite(rawAmount)) {
    return undefined;
  }

  const unit =
    amountMatch[2]?.toLowerCase();

  if (currency === "INR") {
    if (unit === "crore" || unit === "cr") return Math.round(rawAmount * 10000000);
    if (unit === "lakh" || unit === "lac") return Math.round(rawAmount * 100000);
  }

  if (unit === "m" || unit === "million") return Math.round(rawAmount * 1000000);
  if (unit === "k") return Math.round(rawAmount * 1000);

  return Math.round(rawAmount);
}
