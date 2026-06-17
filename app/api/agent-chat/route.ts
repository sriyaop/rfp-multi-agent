import { NextResponse } from "next/server";

import { GeminiClient } from "@/lib/ai/gemini";
import { renderMarkdown } from "@/lib/proposal/markdown";
import { renderPdf } from "@/lib/proposal/pdf";
import {
  AgentRole,
  ConsistencyCheck,
  Proposal,
  ReviewFinding,
  RfpAnalysis
} from "@/lib/types";

export const runtime = "nodejs";

interface AgentChatRequest {
  agent: AgentRole;
  question: string;
  rfp: RfpAnalysis;
  proposal: Proposal;
}

interface AgentEditResponse {
  answer: string;
  changesApplied: string[];
  proposalPatch: Partial<Proposal>;
}

const agentNames: Record<AgentRole, string> = {
  ceo: "CEO Agent",
  productManager: "Product Manager Agent",
  cto: "CTO Agent",
  resourcePlanning: "Resource Planning Agent",
  costEstimation: "Cost Estimation Agent",
  timeline: "Timeline Agent",
  risk: "Risk Analysis Agent"
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<AgentChatRequest>;

    if (
      !body.agent ||
      !body.question?.trim() ||
      !body.rfp ||
      !body.proposal
    ) {
      return NextResponse.json(
        { error: "Agent, question, RFP analysis and proposal context are required." },
        { status: 400 }
      );
    }

    const question = body.question.trim();
    const context = buildAgentContext(
      body.agent,
      body.rfp,
      body.proposal
    );

    if (isCrossCheckRequest(question)) {
      const updatedProposal = applyCrossCheck(
        body.agent,
        question,
        body.rfp,
        body.proposal
      );

      const artifacts = await renderArtifacts(
        updatedProposal,
        body.rfp
      );

      return NextResponse.json({
        mode: "cross_check",
        answer: buildCrossCheckAnswer(
          body.agent,
          updatedProposal
        ),
        proposal: updatedProposal,
        ...artifacts
      });
    }

    if (isEditRequest(question)) {
      const updated = await reviseProposalWithAgent(
        body.agent,
        question,
        body.rfp,
        body.proposal,
        context
      );

      const artifacts = await renderArtifacts(
        updated.proposal,
        body.rfp
      );

      return NextResponse.json({
        mode: "proposal_updated",
        answer: updated.answer,
        changesApplied: updated.changesApplied,
        proposal: updated.proposal,
        ...artifacts
      });
    }

    try {
      const answer = await new GeminiClient().complete(
        `You are ${agentNames[body.agent]} in a multi-agent RFP proposal system.
Answer as that agent.
Explain decisions using only the provided RFP/proposal context.
If the context does not contain enough evidence, say what is unknown.
Keep the answer concise, specific, and useful for a project demo.`,
        `QUESTION:
${question}

CONTEXT:
${context}`
      );

      return NextResponse.json({
        answer: answer.trim()
      });
    } catch (error) {
      console.error("Agent chat model response failed.");
      console.error(error);

      return NextResponse.json({
        answer: buildFallbackAnswer(
          body.agent,
          body.question,
          body.rfp,
          body.proposal
        )
      });
    }
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Agent chat failed."
      },
      { status: 500 }
    );
  }
}

async function reviseProposalWithAgent(
  agent: AgentRole,
  question: string,
  rfp: RfpAnalysis,
  proposal: Proposal,
  context: string
): Promise<{
  answer: string;
  changesApplied: string[];
  proposal: Proposal;
}> {
  try {
    const result = await new GeminiClient().generateJson<AgentEditResponse>(
      `You are ${agentNames[agent]} and may revise the current RFP proposal when the user explicitly asks for a change.
Use only the provided RFP/proposal context and the user's instruction.
Return a concise answer, a short list of changesApplied, and a proposalPatch containing only fields that should change.
Do not change legal identity, contact details, or pricing unless the user explicitly asks for them.
Prefer focused edits over rewriting the whole proposal.`,
      `USER INSTRUCTION:
${question}

EDITABLE PROPOSAL SHAPE:
Top-level fields may include executiveSummary, clientUnderstanding, proposedSolution, implementationMethodology, bidRecommendation, userStories, assumptions, conclusion, technicalArchitecture, resourcePlan, costEstimate, timeline, riskAssessment, complianceMatrix.

CONTEXT:
${context}`
    );

    const proposalPatch = sanitizePatch(result.proposalPatch ?? {});
    const updatedProposal = finalizeProposalRevision(
      proposal,
      proposalPatch,
      agent,
      question,
      result.changesApplied?.length
        ? result.changesApplied
        : ["Applied requested proposal revision."]
    );

    return {
      answer:
        result.answer?.trim() ||
        `${agentNames[agent]} updated the proposal based on your instruction.`,
      changesApplied: result.changesApplied?.length
        ? result.changesApplied
        : ["Applied requested proposal revision."],
      proposal: updatedProposal
    };
  } catch (error) {
    console.error("Agent proposal revision failed; using deterministic revision.");
    console.error(error);

    const fallback = deterministicRevision(
      agent,
      question,
      proposal
    );

    return {
      answer: `${agentNames[agent]} updated the proposal with a targeted note because the model-backed edit could not complete. Review the updated preview and downloads.`,
      changesApplied: fallback.changesApplied,
      proposal: finalizeProposalRevision(
        proposal,
        fallback.patch,
        agent,
        question,
        fallback.changesApplied
      )
    };
  }
}

function applyCrossCheck(
  agent: AgentRole,
  question: string,
  rfp: RfpAnalysis,
  proposal: Proposal
): Proposal {
  const checks = crossCheckProposal(
    rfp,
    proposal
  );

  const reviewFindings = checks.map<ReviewFinding>((check) => ({
    reviewer: agent,
    target: targetFromCategory(check.category),
    severity:
      check.severity === "critical"
        ? "critical"
        : check.severity === "warning"
          ? "warning"
          : "info",
    finding: check.message,
    recommendation: recommendationForCheck(check)
  }));

  return {
    ...proposal,
    consistencyChecks: checks,
    reviewCycle: [
      ...proposal.reviewCycle,
      ...reviewFindings
    ],
    agentConversation: [
      ...proposal.agentConversation,
      {
        from: agent,
        to: "all",
        content: `Cross-check requested by user: ${question}`,
        createdAt: new Date().toISOString()
      }
    ]
  };
}

function crossCheckProposal(
  rfp: RfpAnalysis,
  proposal: Proposal
): ConsistencyCheck[] {
  const checks: ConsistencyCheck[] = [];

  if (proposal.timeline.durationWeeks < proposal.resourcePlan.effortPersonMonths * 1.1) {
    checks.push({
      severity: "warning",
      category: "Timeline",
      message: "Timeline may be tight compared with estimated person-month effort."
    });
  }

  const costPerPersonMonth =
    proposal.costEstimate.developmentCost /
    Math.max(1, proposal.resourcePlan.effortPersonMonths);

  if (costPerPersonMonth < 8000) {
    checks.push({
      severity: "critical",
      category: "Budget",
      message: "Development budget appears low for the estimated person-month effort."
    });
  }

  const coveredRequirements =
    proposal.complianceMatrix.filter((item) => item.status === "Covered").length;

  if (coveredRequirements < Math.min(5, rfp.functionalRequirements.length)) {
    checks.push({
      severity: "warning",
      category: "Requirements",
      message: "Compliance coverage should be expanded for the extracted functional requirements."
    });
  }

  if (
    rfp.risks.length > 0 &&
    proposal.riskAssessment.mitigations.length < rfp.risks.length
  ) {
    checks.push({
      severity: "warning",
      category: "Risk",
      message: "Risk mitigations are fewer than the risk signals extracted from the RFP."
    });
  }

  if (
    proposal.technicalArchitecture.integrations.length === 0 &&
    rfp.technicalRequirements.some((item) => /integrat|api|interface/i.test(item))
  ) {
    checks.push({
      severity: "warning",
      category: "Architecture",
      message: "The RFP appears to mention integrations, but the technical plan has no explicit integration items."
    });
  }

  if (checks.length === 0) {
    checks.push({
      severity: "info",
      category: "Validation",
      message: "No major cross-agent consistency conflicts were detected in the current proposal."
    });
  }

  return checks;
}

function buildCrossCheckAnswer(
  agent: AgentRole,
  proposal: Proposal
): string {
  const summary = proposal.consistencyChecks
    .map((check) => `${check.severity.toUpperCase()} ${check.category}: ${check.message}`)
    .join(" ");

  return `${agentNames[agent]} completed a cross-agent consistency check and updated the proposal's validation notes. ${summary}`;
}

async function renderArtifacts(
  proposal: Proposal,
  rfp: RfpAnalysis
) {
  const markdown = renderMarkdown(proposal);
  const pdf = await renderPdf(proposal, rfp);

  return {
    markdown,
    pdfBase64: pdf.toString("base64")
  };
}

function finalizeProposalRevision(
  proposal: Proposal,
  patch: Partial<Proposal>,
  agent: AgentRole,
  question: string,
  changesApplied: string[]
): Proposal {
  const updated: Proposal = {
    ...proposal,
    ...patch,
    technicalArchitecture: {
      ...proposal.technicalArchitecture,
      ...patch.technicalArchitecture
    },
    resourcePlan: {
      ...proposal.resourcePlan,
      ...patch.resourcePlan
    },
    costEstimate: {
      ...proposal.costEstimate,
      ...patch.costEstimate
    },
    timeline: {
      ...proposal.timeline,
      ...patch.timeline
    },
    riskAssessment: {
      ...proposal.riskAssessment,
      ...patch.riskAssessment
    },
    agentConversation: [
      ...proposal.agentConversation,
      {
        from: agent,
        to: "all",
        content: `User requested proposal revision: ${question}`,
        createdAt: new Date().toISOString()
      }
    ],
    reviewCycle: [
      ...proposal.reviewCycle,
      {
        reviewer: agent,
        target: "ceo",
        severity: "info",
        finding: "User-directed proposal revision was applied through agent chat.",
        recommendation: changesApplied.join(" ")
      }
    ]
  };

  return {
    ...updated,
    finalProposal: composeFinalProposal(updated)
  };
}

function sanitizePatch(patch: Partial<Proposal>): Partial<Proposal> {
  const allowed: Array<keyof Proposal> = [
    "executiveSummary",
    "clientUnderstanding",
    "proposedSolution",
    "implementationMethodology",
    "bidRecommendation",
    "resourcePlan",
    "costEstimate",
    "timeline",
    "technicalArchitecture",
    "riskAssessment",
    "complianceMatrix",
    "userStories",
    "assumptions",
    "conclusion"
  ];

  return Object.fromEntries(
    Object.entries(patch).filter(([key]) =>
      allowed.includes(key as keyof Proposal)
    )
  ) as Partial<Proposal>;
}

function deterministicRevision(
  agent: AgentRole,
  question: string,
  proposal: Proposal
): {
  patch: Partial<Proposal>;
  changesApplied: string[];
} {
  const note = `User-directed update from ${agentNames[agent]}: ${question}`;

  if (agent === "risk" || /risk|mitigat|compliance/i.test(question)) {
    return {
      patch: {
        riskAssessment: {
          ...proposal.riskAssessment,
          mitigations: [
            note,
            ...proposal.riskAssessment.mitigations
          ]
        }
      },
      changesApplied: ["Added the requested note to risk mitigations."]
    };
  }

  if (agent === "cto" || /technical|architecture|stack|integration/i.test(question)) {
    return {
      patch: {
        technicalArchitecture: {
          ...proposal.technicalArchitecture,
          architectureRationale: [
            note,
            ...proposal.technicalArchitecture.architectureRationale
          ]
        }
      },
      changesApplied: ["Added the requested note to technical architecture rationale."]
    };
  }

  if (agent === "costEstimation" || /cost|budget|price/i.test(question)) {
    return {
      patch: {
        costEstimate: {
          ...proposal.costEstimate,
          pricingAssumptions: [
            note,
            ...proposal.costEstimate.pricingAssumptions
          ]
        }
      },
      changesApplied: ["Added the requested note to pricing assumptions."]
    };
  }

  if (agent === "timeline" || /timeline|schedule|phase|milestone/i.test(question)) {
    return {
      patch: {
        timeline: {
          ...proposal.timeline,
          milestones: [
            note,
            ...proposal.timeline.milestones
          ]
        }
      },
      changesApplied: ["Added the requested note to timeline milestones."]
    };
  }

  return {
    patch: {
      proposedSolution: `${proposal.proposedSolution.trim()}\n\n${note}`,
      assumptions: [
        note,
        ...proposal.assumptions
      ]
    },
    changesApplied: ["Added the requested update to the solution narrative and assumptions."]
  };
}

function composeFinalProposal(proposal: Proposal): string {
  return `
EXECUTIVE SUMMARY

${proposal.executiveSummary}

CLIENT UNDERSTANDING

${proposal.clientUnderstanding}

PROPOSED SOLUTION

${proposal.proposedSolution}

IMPLEMENTATION APPROACH

${proposal.implementationMethodology}

TECHNICAL ARCHITECTURE

${proposal.technicalArchitecture.architectureOverview}

RESOURCE PLAN

${proposal.resourcePlan.totalFte} FTE

${proposal.resourcePlan.effortPersonMonths} Person Months

${proposal.resourcePlan.estimatedHours.toLocaleString()} Estimated Hours

TIMELINE

${proposal.timeline.durationWeeks} Weeks

BUDGET

$${proposal.costEstimate.totalBudget.toLocaleString()}

CONCLUSION

${proposal.conclusion}
`;
}

function isCrossCheckRequest(question: string): boolean {
  return /\b(cross[- ]?check|validate|consistency|review\s+each\s+other|check\s+outputs|compare\s+outputs)\b/i.test(question);
}

function isEditRequest(question: string): boolean {
  return /\b(change|update|revise|edit|modify|add|remove|replace|include|make|increase|decrease|shorten|expand)\b/i.test(question);
}

function targetFromCategory(category: string): AgentRole {
  if (/budget|price|cost/i.test(category)) return "costEstimation";
  if (/timeline|schedule/i.test(category)) return "timeline";
  if (/risk|compliance/i.test(category)) return "risk";
  if (/architecture|technical/i.test(category)) return "cto";
  if (/resource|staff/i.test(category)) return "resourcePlanning";
  if (/requirement|scope/i.test(category)) return "productManager";
  return "ceo";
}

function recommendationForCheck(check: ConsistencyCheck): string {
  if (check.severity === "info") {
    return "No revision required.";
  }

  return "Review the affected proposal section and update scope, assumptions, cost, timeline, or mitigation language before submission.";
}

function buildAgentContext(
  agent: AgentRole,
  rfp: RfpAnalysis,
  proposal: Proposal
): string {
  const agentOutput =
    proposal.agentOutputs.find((output) => output.agent === agent);

  return JSON.stringify(
    {
      selectedAgent: agentNames[agent],
      rfp: {
        clientName: rfp.clientName,
        projectName: rfp.projectName,
        executiveSummary: rfp.executiveSummary,
        businessObjectives: rfp.businessObjectives,
        functionalRequirements: rfp.functionalRequirements,
        technicalRequirements: rfp.technicalRequirements,
        scopeItems: rfp.scopeItems,
        constraints: rfp.constraints,
        timelineInformation: rfp.timelineInformation,
        budgetInformation: rfp.budgetInformation,
        risks: rfp.risks
      },
      agentOutput,
      proposal: {
        executiveSummary: proposal.executiveSummary,
        proposedSolution: proposal.proposedSolution,
        bidRecommendation: proposal.bidRecommendation,
        technicalArchitecture: proposal.technicalArchitecture,
        resourcePlan: proposal.resourcePlan,
        costEstimate: proposal.costEstimate,
        timeline: proposal.timeline,
        riskAssessment: proposal.riskAssessment,
        assumptions: proposal.assumptions,
        consistencyChecks: proposal.consistencyChecks,
        reviewCycle: proposal.reviewCycle.filter(
          (finding) =>
            finding.reviewer === agent ||
            finding.target === agent
        ),
        agentConversation: proposal.agentConversation.filter(
          (message) =>
            message.from === agent ||
            message.to === agent ||
            message.to === "all"
        )
      }
    },
    null,
    2
  );
}

function buildFallbackAnswer(
  agent: AgentRole,
  question: string,
  rfp: RfpAnalysis,
  proposal: Proposal
): string {
  const agentOutput =
    proposal.agentOutputs.find((output) => output.agent === agent);

  const confidence =
    agentOutput
      ? ` My confidence for this part of the analysis is ${Math.round(agentOutput.confidence * 100)}%.`
      : "";

  const assumptions =
    agentOutput?.assumptions.length
      ? ` Key assumptions I used: ${agentOutput.assumptions.slice(0, 3).join("; ")}.`
      : "";

  const answerSeed = getFallbackDecisionSummary(agent, proposal);

  return `${agentNames[agent]}: Based on ${rfp.projectName}, ${answerSeed}${confidence}${assumptions} Your question was: "${question.trim()}".`;
}

function getFallbackDecisionSummary(
  agent: AgentRole,
  proposal: Proposal
): string {
  switch (agent) {
    case "ceo":
      return `I focused on bid strategy, client fit, and the final recommendation: ${proposal.bidRecommendation}.`;
    case "productManager":
      return `I translated the RFP into ${proposal.userStories.length} user stories and ${proposal.complianceMatrix.length} compliance checks.`;
    case "cto":
      return `I selected a stack of ${proposal.technicalArchitecture.techStack.join(", ")} because it matched the architecture and integration needs.`;
    case "resourcePlanning":
      return `I estimated ${proposal.resourcePlan.totalFte} FTE, ${proposal.resourcePlan.effortPersonMonths} person-months, and ${proposal.resourcePlan.estimatedHours.toLocaleString()} delivery hours.`;
    case "costEstimation":
      return `I calculated a total budget of $${proposal.costEstimate.totalBudget.toLocaleString()} from development, infrastructure, licensing, support, and contingency costs.`;
    case "timeline":
      return `I proposed a ${proposal.timeline.durationWeeks}-week delivery plan ending ${proposal.timeline.estimatedCompletionDate}.`;
    case "risk":
      return `I reviewed technical, delivery, budget, and compliance risks and summarized them as: ${proposal.riskAssessment.riskSummary}`;
  }
}
