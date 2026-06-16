import { NextResponse } from "next/server";

import { GeminiClient } from "@/lib/ai/gemini";
import { AgentRole, Proposal, RfpAnalysis } from "@/lib/types";

export const runtime = "nodejs";

interface AgentChatRequest {
  agent: AgentRole;
  question: string;
  rfp: RfpAnalysis;
  proposal: Proposal;
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

    const context = buildAgentContext(
      body.agent,
      body.rfp,
      body.proposal
    );

    try {
      const answer = await new GeminiClient().complete(
        `You are ${agentNames[body.agent]} in a multi-agent RFP proposal system.
Answer as that agent.
Explain decisions using only the provided RFP/proposal context.
If the context does not contain enough evidence, say what is unknown.
Keep the answer concise, specific, and useful for a project demo.`,
        `QUESTION:
${body.question.trim()}

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
