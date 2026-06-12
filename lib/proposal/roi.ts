import { RoiSummary, WorkflowState } from "@/lib/types";

/**
 * Estimates the time and efficiency gain of autonomous proposal generation versus manual analysis.
 */
export function calculateRoi(state: WorkflowState, processingMinutes = 5): RoiSummary {
const requirementFactor =
  Math.max(
    1,
    (
      state.rfp.functionalRequirements.length +
      state.rfp.technicalRequirements.length
    ) / 15
  );  const manualEffortHours = Math.round(48 * requirementFactor);
  const automatedEffortHours = Math.max(1, Math.round((processingMinutes / 60) * 10) / 10);
  const timeSavedHours = Math.max(0, manualEffortHours - automatedEffortHours);
  const efficiencyGainPercent = Math.round((timeSavedHours / manualEffortHours) * 100);

  return {
    manualEffortHours,
    automatedEffortHours,
    timeSavedHours,
    efficiencyGainPercent,
    summary: `The autonomous workflow reduces estimated proposal analysis effort from ${manualEffortHours} hours to about ${automatedEffortHours} hours, saving ${timeSavedHours} hours.`
  };
}
