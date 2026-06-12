import { Proposal } from "@/lib/types";
import { usd } from "@/lib/utils";

/**
 * Renders a complete proposal as Markdown for download and review.
 */
export function renderMarkdown(proposal: Proposal): string {
  return `# Autonomous RFP Proposal

## Executive Summary
${proposal.executiveSummary}

## Resource Plan
- Total FTE: ${proposal.resourcePlan.totalFte}
- Effort: ${proposal.resourcePlan.effortPersonMonths} person-months
${proposal.resourcePlan.teamComposition.map((item) => `- ${item.role}: ${item.fte} FTE for ${item.months} months`).join("\n")}

## Cost Estimate
- Development cost: ${usd(proposal.costEstimate.developmentCost)}
- Infrastructure cost: ${usd(proposal.costEstimate.infrastructureCost)}
- Contingency: ${usd(proposal.costEstimate.contingencyCost)}
- Total budget: ${usd(proposal.costEstimate.totalBudget)}

## Timeline
- Duration: ${proposal.timeline.durationWeeks} weeks
- Estimated completion date: ${proposal.timeline.estimatedCompletionDate}
${proposal.timeline.phases.map((phase) => `- ${phase.name}: ${phase.weeks} weeks - ${phase.output}`).join("\n")}

### Technology Stack
${proposal.technicalArchitecture.techStack.map((item) => `- ${item}`).join("\n")}

## Risk Assessment
${proposal.riskAssessment.technicalRisks.map((item) => `- Technical: ${item}`).join("\n")}
${proposal.riskAssessment.deliveryRisks.map((item) => `- Delivery: ${item}`).join("\n")}
${proposal.riskAssessment.budgetRisks.map((item) => `- Budget: ${item}`).join("\n")}

### Mitigations
${proposal.riskAssessment.mitigations.map((item) => `- ${item}`).join("\n")}

## User Stories
${proposal.userStories.map((story) => `- ${story}`).join("\n")}

## Hallucination Controls
- Confidence score: ${proposal.confidenceScore}%
${proposal.consistencyChecks.map((check) => `- ${check.severity.toUpperCase()} / ${check.category}: ${check.message}`).join("\n")}

## Agent Review Cycle
${proposal.reviewCycle.length > 0 ? proposal.reviewCycle.map((item) => `- ${item.reviewer} reviewed ${item.target}: ${item.finding} Recommendation: ${item.recommendation}`).join("\n") : "- No revision conflicts were found in the review cycle."}

## ROI Summary
- Manual effort: ${proposal.roi.manualEffortHours} hours
- Automated effort: ${proposal.roi.automatedEffortHours} hours
- Time saved: ${proposal.roi.timeSavedHours} hours
- Efficiency gain: ${proposal.roi.efficiencyGainPercent}%

${proposal.roi.summary}

## Final Proposal
${proposal.finalProposal}
`;
}
