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
  businessObjectives: string[];
  requirements: string[];
  scopeItems: string[];
  constraints: string[];
  deliverables: string[];
  risks: string[];
  sourceSummary: string;
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
  features: string[];
  epics: string[];
  userStories: string[];
  milestones: string[];
  roadmap: string[];
}

export interface TechnicalPlan {
  techStack: string[];
  architecture: string[];
  integrations: string[];
  scalability: string[];
  technicalRisks: string[];
}

export interface ResourcePlan {
  teamComposition: Array<{ role: string; fte: number; months: number }>;
  totalFte: number;
  effortPersonMonths: number;
  allocationPlan: string[];
}

export interface CostPlan {
  developmentCost: number;
  infrastructureCost: number;
  contingencyCost: number;
  totalBudget: number;
  currency: "USD";
  costDrivers: string[];
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
  mitigations: string[];
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
  resourcePlan: ResourcePlan;
  costEstimate: CostPlan;
  timeline: TimelinePlan;
  technicalArchitecture: TechnicalPlan;
  riskAssessment: RiskPlan;
  userStories: string[];
  finalProposal: string;
  roi: RoiSummary;
  consistencyChecks: ConsistencyCheck[];
  confidenceScore: number;
  agentOutputs: AgentOutput[];
  reviewCycle: ReviewFinding[];
}

export interface WorkflowState {
  rfp: RfpAnalysis;
  messages: AgentMessage[];
  outputs: Partial<Record<AgentRole, AgentOutput>>;
  reviews: ReviewFinding[];
}
