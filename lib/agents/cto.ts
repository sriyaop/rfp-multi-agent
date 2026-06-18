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
      buildTechStack(
        signals.text,
        signals.domain
      );

    if (signals.complianceCount > 0) {
      techStack.push("IAM/SSO", "Audit Logging", "Policy-based Access Controls");
    }

    if (signals.dataMigrationCount > 0) {
      techStack.push("ETL / Data Migration Tooling");
    }

    if (signals.reportingCount > 0) {
      techStack.push("Reporting / BI Layer");
    }

    if (signals.integrationCount > 0) {
      techStack.push("API Gateway", "Integration Middleware");
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
          `RFP-specific ${signals.domain} architecture for ${state.rfp.projectName}, organized around the required business modules, integration points, data migration needs, reporting expectations and compliance obligations.`,

        frontendArchitecture:
          frontendArchitecture(
            signals.text,
            signals.domain
          ),

        backendArchitecture: pickRelevantItems(
          [
            ...state.rfp.technicalRequirements,
            ...state.rfp.functionalRequirements.filter((item) => /workflow|approval|api|integration|report|data|migration|security|portal|dashboard/i.test(item))
          ],
          backendFallback(
            signals.domain,
            signals
          )
        ),

        databaseArchitecture:
          databaseArchitecture(
            signals.text,
            signals.domain
          ),

        securityArchitecture: pickRelevantItems(
          [
            ...state.rfp.constraints,
            ...state.rfp.technicalRequirements
          ].filter((item) => /security|audit|access|privacy|compliance|wcag|ada|sso|authentication|authorization|encryption/i.test(item)),
          securityFallback(signals)
        ),

        deploymentArchitecture:
          deploymentArchitecture(
            signals.text,
            signals.domain
          ),

        integrations: pickRelevantItems(
          integrations,
          signals.integrationCount > 0
            ? ["API/interface integration scope to be confirmed during discovery"]
            : ["No explicit integration requirement extracted; confirm during discovery"]
        ),

        monitoringStrategy:
          monitoringStrategy(signals),

        techStack,

        scalabilityStrategy: [
          signals.domain === "website" ? "CDN-backed content delivery" : "Horizontal scaling for application services",
          signals.integrationCount > 0 ? "API layer separation for integrations" : "Modular service boundaries",
          signals.reportingCount > 0 ? "Read-optimized reporting path" : "Capacity monitoring and autoscaling triggers"
        ],

        technicalRisks: pickRelevantItems(
          state.rfp.risks.filter((item) => /technical|integration|security|data|migration|legacy/i.test(item)),
          ["Integration complexity", "Requirement volatility"]
        ),

        architectureRationale: [
          `Matches the ${signals.domain} project profile and the specific RFP requirement mix.`,
          `Integration, migration, reporting, security and compliance requirements directly shaped the architecture.`,
          "Keeps integration, reporting, security and operational risk visible from design onward."
        ]
      },

      reviewNotes: []
    };
  }
}

function buildTechStack(
  text: string,
  domain: "erp" | "website" | "mobile" | "data" | "general"
): string[] {
  const stack =
    domain === "erp"
      ? ["ERP Platform", "Workflow Engine", "Relational Database"]
      : domain === "website"
      ? ["Enterprise CMS", "TypeScript", "Search Platform", "CDN/WAF"]
      : domain === "mobile"
      ? ["React Native", "API Gateway", "Push Notification Service"]
      : domain === "data"
      ? ["Data Warehouse", "ETL Pipeline", "BI Dashboard Layer"]
      : ["Web Application Framework", "API Services", "Relational Database"];

  if (/next\.?js|react/.test(text)) stack.push("Next.js / React");
  if (/node\.?js/.test(text)) stack.push("Node.js");
  if (/postgres|postgresql/.test(text)) stack.push("PostgreSQL");
  if (/sql server|mssql/.test(text)) stack.push("SQL Server");
  if (/salesforce/.test(text)) stack.push("Salesforce Integration");
  if (/sharepoint/.test(text)) stack.push("SharePoint Integration");
  if (/azure/.test(text)) stack.push("Azure Cloud");
  if (/aws|amazon web services/.test(text)) stack.push("AWS Cloud");
  if (/google cloud|gcp/.test(text)) stack.push("Google Cloud");

  return Array.from(new Set(stack));
}

function frontendArchitecture(
  text: string,
  domain: "erp" | "website" | "mobile" | "data" | "general"
): string[] {
  const items =
    domain === "erp"
      ? ["Role-based operational workspaces", "Approval dashboards", "Financial and operational reporting views"]
      : domain === "website"
      ? ["Accessible responsive website", "CMS authoring workflows", "Site search and reusable content templates"]
      : domain === "mobile"
      ? ["Mobile-first user journeys", "Offline/error-tolerant interaction states", "Push notification workflows"]
      : domain === "data"
      ? ["Dashboard and analytics views", "Filterable reporting workspaces", "Export-ready data views"]
      : ["Responsive UI", "Role-based access screens", "User workflow screens"];

  if (/wcag|ada|accessibility/.test(text)) items.push("WCAG/accessibility-compliant component patterns");
  if (/dashboard|report/.test(text)) items.push("Dashboard and reporting experience");
  if (/portal/.test(text)) items.push("Self-service portal experience");

  return Array.from(new Set(items));
}

function backendFallback(
  domain: "erp" | "website" | "mobile" | "data" | "general",
  signals: ReturnType<typeof getProjectSignals>
): string[] {
  const items =
    domain === "erp"
      ? ["ERP workflow services", "Financial/operational rules layer", "Integration services"]
      : domain === "website"
      ? ["CMS content APIs", "Search indexing service", "Form and workflow services"]
      : domain === "mobile"
      ? ["Mobile API services", "Notification service", "Identity/session services"]
      : domain === "data"
      ? ["Data ingestion services", "Transformation pipeline", "Analytics API layer"]
      : ["API services", "Business workflow services", "Validation and rules layer"];

  if (signals.paymentCount > 0) items.push("Payment/billing integration service");
  if (signals.dataMigrationCount > 0) items.push("Data migration and reconciliation service");
  if (signals.reportingCount > 0) items.push("Reporting aggregation service");

  return items;
}

function databaseArchitecture(
  text: string,
  domain: "erp" | "website" | "mobile" | "data" | "general"
): string[] {
  const items =
    domain === "erp"
      ? ["Financial and operational data model", "Audit-ready transaction records", "Reporting-ready schema"]
      : domain === "data"
      ? ["Analytical warehouse model", "Source-to-target mapping", "Data quality checks"]
      : ["Relational data model", "Reporting-ready schema", "Backup and recovery strategy"];

  if (/migration|legacy|import/.test(text)) items.push("Staged migration schema and reconciliation checkpoints");
  if (/audit|compliance/.test(text)) items.push("Immutable audit fields and retention controls");
  if (/report|dashboard|analytics/.test(text)) items.push("Read-optimized reporting views");

  return Array.from(new Set(items));
}

function securityFallback(
  signals: ReturnType<typeof getProjectSignals>
): string[] {
  const items = [
    "Authentication",
    "Authorization",
    "Audit Logging"
  ];

  if (signals.securityCount > 0) items.push("Encryption and access control review");
  if (signals.complianceCount > 0) items.push("Compliance evidence and traceability controls");
  if (signals.domain === "website") items.push("Accessibility and content governance checks");

  return items;
}

function deploymentArchitecture(
  text: string,
  domain: "erp" | "website" | "mobile" | "data" | "general"
): string[] {
  const items = [
    /on[- ]prem|on premise/.test(text) ? "Hybrid/on-premises deployment option" : "Cloud hosting",
    "CI/CD pipeline",
    "Environment promotion path"
  ];

  if (domain === "website") items.push("CDN and WAF edge protection");
  if (domain === "mobile") items.push("App store release pipeline");
  if (/disaster recovery|backup|dr/.test(text)) items.push("Backup and disaster recovery plan");

  return items;
}

function monitoringStrategy(
  signals: ReturnType<typeof getProjectSignals>
): string[] {
  return [
    "Application monitoring",
    signals.integrationCount > 0 ? "Integration/API health monitoring" : "Error tracking",
    signals.complianceCount > 0 ? "Audit log review and compliance reporting" : "Operational log review",
    signals.reportingCount > 0 ? "Report freshness and data quality checks" : "Release health dashboard"
  ];
}
