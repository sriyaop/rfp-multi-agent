import { Proposal } from "@/lib/types";
import { money } from "@/lib/utils";

/**
 * Renders a complete proposal as Markdown for download and review.
 */
export function renderMarkdown(proposal: Proposal): string {
  return `# RFP Proposal

## Executive Summary
${proposal.executiveSummary}

## Resource Plan
- Total FTE: ${proposal.resourcePlan.totalFte}
- Effort: ${proposal.resourcePlan.effortPersonMonths} person-months
- Estimated hours: ${proposal.resourcePlan.estimatedHours.toLocaleString()} hours
${proposal.resourcePlan.teamComposition.map((item) => `- ${item.role}: ${item.fte} FTE for ${item.months} months`).join("\n")}

### Staffing Rationale
${proposal.resourcePlan.staffingStrategy.map((item) => `- ${item}`).join("\n")}

## Cost Estimate
- Development cost: ${money(proposal.costEstimate.developmentCost, proposal.costEstimate.currency)}
- Infrastructure cost: ${money(proposal.costEstimate.infrastructureCost, proposal.costEstimate.currency)}
- Contingency: ${money(proposal.costEstimate.contingencyCost, proposal.costEstimate.currency)}
- Total budget: ${money(proposal.costEstimate.totalBudget, proposal.costEstimate.currency)}

## Timeline
- Duration: ${proposal.timeline.durationWeeks} weeks
- Estimated completion date: ${proposal.timeline.estimatedCompletionDate}
${proposal.timeline.phases.map((phase) => `- ${phase.name}: ${phase.weeks} weeks - ${phase.output}`).join("\n")}

### Timeline Rationale
${proposal.timeline.rationale.map((item) => `- ${item}`).join("\n")}

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

## Proposal Validation
- Proposal confidence score: ${proposal.confidenceScore}%
${proposal.consistencyChecks.map((check) => `- ${check.severity.toUpperCase()} / ${check.category}: ${check.message}`).join("\n")}

## Agent Review Cycle
${proposal.reviewCycle.length > 0 ? proposal.reviewCycle.map((item) => `- ${item.reviewer} reviewed ${item.target}: ${item.finding} Recommendation: ${item.recommendation}`).join("\n") : "- No revision conflicts were found in the review cycle."}

## ROI Summary
- Manual effort: ${proposal.roi.manualEffortHours} hours
- Automated effort: ${proposal.roi.automatedEffortHours} hours
- Time saved: ${proposal.roi.timeSavedHours} hours
- Efficiency gain: ${proposal.roi.efficiencyGainPercent}%

${proposal.roi.summary}

## POC Comparison
- Manual RFP analysis baseline: document reading, requirement extraction, solution planning, costing, timeline estimation and proposal drafting.
- Automated workflow: document intelligence plus CEO-led specialist agents for scope, architecture, staffing, cost, timeline, risk and proposal assembly.
- Proof-of-concept result: ${proposal.roi.timeSavedHours} estimated hours saved on this RFP with ${proposal.roi.efficiencyGainPercent}% efficiency gain.

## Final Proposal
${proposal.finalProposal}
`;
}
