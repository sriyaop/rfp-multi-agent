export type ConfidenceLevel = "low" | "medium" | "high";

export type AgentRole =
  | "ceo"
  | "productManager"
  | "cto"
  | "resourcePlanning"
  | "costEstimation"
  | "timeline"
  | "risk";

export interface RfpAnalysis {
  clientName: string;

  projectName: string;

  executiveSummary: string;

  businessObjectives: string[];

  functionalRequirements: string[];

  technicalRequirements: string[];

  scopeItems: string[];

  constraints: string[];

  deliverables: string[];

  timelineInformation: string[];

  budgetInformation: string[];

  evaluationCriteria: string[];

  resourceRequirements: string[];

  risks: string[];

  proposalInsights: {
    ceo: string[];
    cto: string[];
    pm: string[];
    finance: string[];
    hr: string[];
  };
}

export interface AgentMessage {
  from: AgentRole;
  to: AgentRole | "all";
  content: string;
  createdAt: string;
}

export interface AgentOutput<T = unknown> {
  agent: AgentRole;
  title: string;
  confidence: number;
  assumptions: string[];
  findings: T;
  reviewNotes: string[];
}

export interface ReviewFinding {
  reviewer: AgentRole;
  target: AgentRole;
  severity: "info" | "warning" | "critical";
  finding: string;
  recommendation: string;
}

export interface ProductPlan {
  executiveScopeSummary: string;

  features: string[];

  epics: string[];

  userStories: string[];

  deliverables: string[];

  milestones: string[];

  roadmap: string[];

  assumptions: string[];

  successCriteria: string[];
}

export interface TechnicalPlan {

  architectureOverview: string;

  frontendArchitecture: string[];

  backendArchitecture: string[];

  databaseArchitecture: string[];

  securityArchitecture: string[];

  deploymentArchitecture: string[];

  integrations: string[];

  monitoringStrategy: string[];

  techStack: string[];

  scalabilityStrategy: string[];

  technicalRisks: string[];

  architectureRationale: string[];
}

export interface ResourcePlan {

  teamComposition: Array<{
    role: string;
    fte: number;
    months: number;
  }>;

  totalFte: number;

  effortPersonMonths: number;

  allocationPlan: string[];

  staffingStrategy: string[];

  criticalSkills: string[];

  hiringRisks: string[];
}

export interface CostPlan {

  developmentCost: number;

  infrastructureCost: number;

  licensingCost: number;

  contingencyCost: number;

  supportCost: number;

  totalBudget: number;

  currency: "USD";

  costDrivers: string[];

  pricingAssumptions: string[];

  paymentMilestones: string[];
}

export interface TimelinePlan {
  durationWeeks: number;
  estimatedCompletionDate: string;
  phases: Array<{ name: string; weeks: number; output: string }>;
  milestones: string[];
}

export interface RiskPlan {

  technicalRisks: string[];

  deliveryRisks: string[];

  budgetRisks: string[];

  complianceRisks: string[];

  mitigations: string[];

  riskSummary: string;
}

export interface ComplianceItem {
  requirement: string;
  status: "Covered" | "Partial" | "Gap";
  owner: string;
  notes: string;
}

export interface ConsistencyCheck {
  severity: "info" | "warning" | "critical";
  category: string;
  message: string;
}

export interface RoiSummary {
  manualEffortHours: number;
  automatedEffortHours: number;
  timeSavedHours: number;
  efficiencyGainPercent: number;
  summary: string;
}

export interface Proposal {

  executiveSummary: string;

  clientUnderstanding: string;

  proposedSolution: string;

  implementationMethodology: string;

  bidRecommendation: string;

  resourcePlan: ResourcePlan;

  costEstimate: CostPlan;

  timeline: TimelinePlan;

  technicalArchitecture: TechnicalPlan;

  riskAssessment: RiskPlan;

  complianceMatrix: ComplianceItem[];

  userStories: string[];

  architectureDiagram: string;

  assumptions: string[];

  conclusion: string;

  finalProposal: string;

  roi: RoiSummary;

  consistencyChecks: ConsistencyCheck[];

  confidenceScore: number;

  agentOutputs: AgentOutput[];

  reviewCycle: ReviewFinding[];

  agentConversation: AgentMessage[];
}
export interface WorkflowState {
  rfp: RfpAnalysis;
  messages: AgentMessage[];
  outputs: Partial<Record<AgentRole, AgentOutput>>;
  reviews: ReviewFinding[];
}
