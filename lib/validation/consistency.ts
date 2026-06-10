import { ConsistencyCheck, CostPlan, ResourcePlan, TimelinePlan, WorkflowState } from "@/lib/types";

/**
 * Runs cross-agent validation checks to flag unrealistic or inconsistent estimates.
 */
export function runConsistencyChecks(state: WorkflowState): ConsistencyCheck[] {
  const checks: ConsistencyCheck[] = [];
  const resource = state.outputs.resourcePlanning?.findings as ResourcePlan | undefined;
  const cost = state.outputs.costEstimation?.findings as CostPlan | undefined;
  const timeline = state.outputs.timeline?.findings as TimelinePlan | undefined;

  if (resource && timeline && timeline.durationWeeks < resource.effortPersonMonths * 1.1) {
    checks.push({
      severity: "warning",
      category: "Timeline",
      message: "Timeline may be unrealistic compared with estimated effort and team capacity."
    });
  }

  if (resource && cost) {
    const costPerPersonMonth = cost.developmentCost / resource.effortPersonMonths;
    if (costPerPersonMonth < 8000) {
      checks.push({
        severity: "critical",
        category: "Budget",
        message: "Development budget appears too low for the estimated person-month effort."
      });
    }
  }

  if (resource && resource.totalFte > 10 && timeline && timeline.durationWeeks < 16) {
    checks.push({
      severity: "warning",
      category: "Resource Plan",
      message: "High FTE count with a short timeline may create onboarding and coordination risk."
    });
  }

  if (checks.length === 0) {
    checks.push({
      severity: "info",
      category: "Validation",
      message: "No major cross-agent consistency conflicts were detected."
    });
  }

  return checks;
}

/**
 * Computes the average confidence score from agent outputs.
 */
export function calculateConfidence(state: WorkflowState): number {
  const outputs = Object.values(state.outputs);
  const total = outputs.reduce((sum, output) => sum + output.confidence, 0);
  return Math.round((total / Math.max(1, outputs.length)) * 100);
}
