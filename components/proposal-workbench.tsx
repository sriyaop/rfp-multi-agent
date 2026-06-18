"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bot,
  BarChart3,
  CheckCircle2,
  Calculator,
  ChevronDown,
  Clock3,
  Code2,
  Cpu,
  Download,
  FileText,
  GitCompare,
  Info,
  ListChecks,
  Loader2,
  MessageSquareText,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
  Upload
} from "lucide-react";
import { Proposal, RfpAnalysis, AgentMessage, AgentRole } from "@/lib/types";
import { money } from "@/lib/utils";

interface ApiResultItem {
  rfp: RfpAnalysis;
  proposal: Proposal;
  markdown: string;
  pdfBase64: string;
  fileName: string;
  extraction?: {
    pageCount?: number;
    characterCount: number;
    quality: "good" | "weak" | "failed";
    warnings: string[];
    analysisSource: "gemini-text" | "gemini-file" | "deterministic";
  };
}

interface AgentChatResponse {
  mode?: "answer" | "cross_check" | "proposal_updated";
  answer?: string;
  changesApplied?: string[];
  proposal?: Proposal;
  markdown?: string;
  pdfBase64?: string;
}

type ApiResult = ApiResultItem;
type ExecutionState = "idle" | "processing" | "replaying" | "complete";
type AgentEventType = "ai" | "code" | "calculation" | "thinking" | "tool" | "handoff" | "message";
type EventActor = AgentRole | "system" | "gemini" | "api" | "builder" | "pdf";
type ChatMessageStatus = "ready" | "thinking" | "error";
type ProposalSectionId =
  | "executiveSummary"
  | "clientUnderstanding"
  | "proposedSolution"
  | "technicalArchitecture"
  | "resourcePlan"
  | "timeline"
  | "budget"
  | "riskAssessment"
  | "recommendations"
  | "conclusion";

interface ChatMessage {
  id: string;
  from: AgentRole | "user" | "system";
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
  routedAgent?: AgentRole;
  mode?: AgentChatResponse["mode"];
}

interface AgentEvent {
  type: AgentEventType;
  agent: EventActor;
  target: AgentRole | "all";
  content: string;
  createdAt: string;
}

const agentLabels: Record<AgentRole, { name: string; role: string }> = {
  ceo: { name: "CEO Agent", role: "Strategy" },
  productManager: { name: "Product Manager Agent", role: "Scope" },
  cto: { name: "CTO Agent", role: "Architecture" },
  resourcePlanning: { name: "Resource Planning Agent", role: "Staffing" },
  costEstimation: { name: "Cost Estimation Agent", role: "Budget" },
  timeline: { name: "Timeline Agent", role: "Roadmap" },
  risk: { name: "Risk Analysis Agent", role: "Risk" }
};

const proposalSections: Array<{ id: ProposalSectionId; title: string; description: string }> = [
  { id: "executiveSummary", title: "Executive Summary", description: "High-level recommendation and project context." },
  { id: "clientUnderstanding", title: "Client Understanding", description: "Business priorities extracted from the RFP." },
  { id: "proposedSolution", title: "Proposed Solution", description: "Recommended capabilities and delivery approach." },
  { id: "technicalArchitecture", title: "Technical Architecture", description: "Architecture, stack, security, and integrations." },
  { id: "resourcePlan", title: "Resource Plan", description: "Team allocation, effort, and staffing coverage." },
  { id: "timeline", title: "Timeline", description: "Phase roadmap and delivery milestones." },
  { id: "budget", title: "Budget", description: "Cost breakdown and commercial assumptions." },
  { id: "riskAssessment", title: "Risk Assessment", description: "Risk categories, mitigations, and controls." },
  { id: "recommendations", title: "Recommendations", description: "Bid recommendation, validation, and ROI." },
  { id: "conclusion", title: "Conclusion", description: "Closing summary for the generated proposal." }
];

const fallbackMessages: AgentMessage[] = [
  {
    from: "ceo",
    to: "productManager",
    content: "Analyzing client requirements and business objectives...",
    createdAt: new Date().toISOString()
  },
  {
    from: "productManager",
    to: "cto",
    content: "Identified functional and non-functional requirements...",
    createdAt: new Date().toISOString()
  },
  {
    from: "cto",
    to: "resourcePlanning",
    content: "Designing technical architecture and integrations...",
    createdAt: new Date().toISOString()
  },
  {
    from: "resourcePlanning",
    to: "costEstimation",
    content: "Estimating staffing requirements...",
    createdAt: new Date().toISOString()
  },
  {
    from: "costEstimation",
    to: "timeline",
    content: "Calculating implementation budget...",
    createdAt: new Date().toISOString()
  },
  {
    from: "timeline",
    to: "risk",
    content: "Preparing delivery roadmap...",
    createdAt: new Date().toISOString()
  },
  {
    from: "risk",
    to: "ceo",
    content: "Evaluating project risks and mitigation strategies...",
    createdAt: new Date().toISOString()
  },
  {
    from: "ceo",
    to: "all",
    content: "Review completed. Preparing final proposal...",
    createdAt: new Date().toISOString()
  }
];

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getAgentLabel(agent: AgentRole) {
  return agentLabels[agent] ?? { name: agent, role: "Agent" };
}

function getActorLabel(actor: EventActor) {
  if (actor === "system") {
    return { name: "Upload Runtime", role: "Input" };
  }

  if (actor === "gemini") {
    return { name: "Gemini AI", role: "RFP Intelligence" };
  }

  if (actor === "api") {
    return { name: "Proposal API", role: "Route" };
  }

  if (actor === "builder") {
    return { name: "Proposal Builder", role: "Assembly" };
  }

  if (actor === "pdf") {
    return { name: "PDF Renderer", role: "Export" };
  }

  return getAgentLabel(actor);
}

function getToolName(agent: AgentRole) {
  const tools: Record<AgentRole, string> = {
    ceo: "strategy_planner",
    productManager: "requirements_mapper",
    cto: "architecture_designer",
    resourcePlanning: "staffing_estimator",
    costEstimation: "budget_calculator",
    timeline: "roadmap_builder",
    risk: "risk_scanner"
  };

  return tools[agent];
}

function getThinkingText(agent: AgentRole) {
  const text: Record<AgentRole, string> = {
    ceo: "Thinking through bid strategy and delegation order...",
    productManager: "Reading requirements and grouping scope into delivery themes...",
    cto: "Evaluating architecture, integrations, security and platform fit...",
    resourcePlanning: "Estimating roles, capacity and delivery coverage...",
    costEstimation: "Calculating budget drivers and contingency...",
    timeline: "Sequencing milestones and validating delivery duration...",
    risk: "Scanning delivery, technical, budget and compliance risks..."
  };

  return text[agent];
}

function buildAgentEvents(messages: AgentMessage[]): AgentEvent[] {
  return messages.flatMap((message) => [
    {
      type: "thinking" as const,
      agent: message.from,
      target: message.to,
      content: getThinkingText(message.from),
      createdAt: message.createdAt
    },
    {
      type: "tool" as const,
      agent: message.from,
      target: message.to,
      content: `Calling ${getToolName(message.from)}...`,
      createdAt: message.createdAt
    },
    {
      type: "handoff" as const,
      agent: message.from,
      target: message.to,
      content:
        message.to === "all"
          ? "Broadcasting update to all agents."
          : `Handing context to ${getAgentLabel(message.to).name}.`,
      createdAt: message.createdAt
    },
    {
      type: "message" as const,
      agent: message.from,
      target: message.to,
      content: message.content,
      createdAt: message.createdAt
    }
  ]);
}

function buildExecutionEvents(result: ApiResult | null): AgentEvent[] {
  if (!result) {
    return buildAgentEvents(fallbackMessages);
  }

  const now = new Date().toISOString();
  const rfp = result.rfp;
  const proposal = result.proposal;
  const codeEvents: AgentEvent[] = [
    {
      type: "code",
      agent: "system",
      target: "all",
      content: `Upload received: ${result.fileName}. Browser sends FormData to app/api/proposals/route.ts.`,
      createdAt: now
    },
    {
      type: "code",
      agent: "api",
      target: "all",
      content: result.extraction
        ? `Invoking extractDocumentFromFile() in lib/document/extractor.ts. Extracted ${result.extraction.characterCount.toLocaleString()} characters${result.extraction.pageCount ? ` from ${result.extraction.pageCount} pages` : ""}. Quality: ${result.extraction.quality}.`
        : "Invoking extractDocumentFromFile() in lib/document/extractor.ts to read PDF/DOCX/TXT content.",
      createdAt: now
    },
    {
      type: "ai",
      agent: "gemini",
      target: "all",
      content: `${result.extraction?.analysisSource === "gemini-file" ? "Text extraction was weak, so the system used document understanding to read the PDF directly." : "Reading the RFP text and structuring proposal inputs."} The system identified functional requirements, technical requirements, scope items and risk areas for agent review.`,
      createdAt: now
    },
    {
      type: "code",
      agent: "gemini",
      target: "all",
      content: "Normalizing Gemini JSON into the RfpAnalysis schema expected by the agents.",
      createdAt: now
    },
    {
      type: "handoff",
      agent: "api",
      target: "ceo",
      content: "Starting the CEO-led proposal workflow with structured RFP context.",
      createdAt: now
    }
  ];

  const agentEvents = proposal.agentConversation.length
    ? buildAgentEvents(proposal.agentConversation)
    : buildAgentEvents(fallbackMessages);

  const calculationEvents: AgentEvent[] = [
    {
      type: "calculation",
      agent: "productManager",
      target: "cto",
      content: `Product Manager maps ${proposal.userStories.length} user stories and ${proposal.complianceMatrix.length} compliance rows from the RFP requirements.`,
      createdAt: now
    },
    {
      type: "calculation",
      agent: "cto",
      target: "resourcePlanning",
      content: `CTO selects architecture and technology stack: ${proposal.technicalArchitecture.techStack.join(", ")}.`,
      createdAt: now
    },
    {
      type: "calculation",
      agent: "resourcePlanning",
      target: "costEstimation",
      content: `Resource Planning calculates ${proposal.resourcePlan.totalFte} FTE, ${proposal.resourcePlan.effortPersonMonths} person-months and ${proposal.resourcePlan.estimatedHours.toLocaleString()} estimated delivery hours from role allocations.`,
      createdAt: now
    },
    {
      type: "calculation",
      agent: "costEstimation",
      target: "timeline",
      content: `Cost Estimation computes development ${money(proposal.costEstimate.developmentCost, proposal.costEstimate.currency)}, infrastructure ${money(proposal.costEstimate.infrastructureCost, proposal.costEstimate.currency)}, licensing ${money(proposal.costEstimate.licensingCost, proposal.costEstimate.currency)}, contingency ${money(proposal.costEstimate.contingencyCost, proposal.costEstimate.currency)} and total ${money(proposal.costEstimate.totalBudget, proposal.costEstimate.currency)}.`,
      createdAt: now
    },
    {
      type: "calculation",
      agent: "timeline",
      target: "risk",
      content: `Timeline Agent creates a ${proposal.timeline.durationWeeks}-week roadmap ending ${proposal.timeline.estimatedCompletionDate}.`,
      createdAt: now
    },
    {
      type: "calculation",
      agent: "risk",
      target: "ceo",
      content: `Risk Agent evaluates ${proposal.riskAssessment.technicalRisks.length} technical, ${proposal.riskAssessment.deliveryRisks.length} delivery, ${proposal.riskAssessment.budgetRisks.length} budget and ${proposal.riskAssessment.complianceRisks.length} compliance risks.`,
      createdAt: now
    },
    {
      type: "code",
      agent: "builder",
      target: "all",
      content: "buildProposal() in lib/proposal/builder.ts consolidates specialist outputs into executive summary, solution, resource plan, cost, timeline, risks and conclusion.",
      createdAt: now
    },
    {
      type: "code",
      agent: "pdf",
      target: "all",
      content: "renderMarkdown() and renderPdf() generate downloadable proposal artifacts.",
      createdAt: now
    },
    {
      type: "calculation",
      agent: "builder",
      target: "all",
      content: `ROI/POC comparison estimates manual RFP effort at ${proposal.roi.manualEffortHours} hours versus ${proposal.roi.automatedEffortHours} automated hours, saving ${proposal.roi.timeSavedHours} hours (${proposal.roi.efficiencyGainPercent}% gain).`,
      createdAt: now
    }
  ];

  return [
    ...codeEvents,
    ...agentEvents,
    ...calculationEvents
  ];
}

function getEventIcon(type: AgentEventType) {
  switch (type) {
    case "thinking":
      return <Sparkles size={15} />;
    case "tool":
      return <Wrench size={15} />;
    case "handoff":
      return <Send size={15} />;
    case "message":
      return <MessageSquareText size={15} />;
    case "ai":
      return <Cpu size={15} />;
    case "code":
      return <Code2 size={15} />;
    case "calculation":
      return <Calculator size={15} />;
  }
}

function routeQuestionToAgent(question: string): AgentRole {
  const normalized = question.toLowerCase();

  if (/\b(cost|budget|price|pricing|cloud|infrastructure|license|reduce|cheaper|optimi[sz]e)\b/.test(normalized)) {
    return "costEstimation";
  }

  if (/\b(timeline|schedule|deadline|phase|milestone|shorten|delay|weeks|completion)\b/.test(normalized)) {
    return "timeline";
  }

  if (/\b(risk|mitigation|issue|compliance|security concern|probability|impact)\b/.test(normalized)) {
    return "risk";
  }

  if (/\b(architecture|technical|stack|react|next|api|integration|database|security|hosting|cloud)\b/.test(normalized)) {
    return "cto";
  }

  if (/\b(resource|staff|team|fte|capacity|allocation|developer|qa|manager)\b/.test(normalized)) {
    return "resourcePlanning";
  }

  if (/\b(scope|feature|requirement|user story|deliverable|client need|solution)\b/.test(normalized)) {
    return "productManager";
  }

  return "ceo";
}

function compareProposalSections(before: Proposal, after: Proposal): ProposalSectionId[] {
  const changed: ProposalSectionId[] = [];
  const checks: Array<[ProposalSectionId, unknown, unknown]> = [
    ["executiveSummary", before.executiveSummary, after.executiveSummary],
    ["clientUnderstanding", before.clientUnderstanding, after.clientUnderstanding],
    ["proposedSolution", before.proposedSolution, after.proposedSolution],
    ["technicalArchitecture", before.technicalArchitecture, after.technicalArchitecture],
    ["resourcePlan", before.resourcePlan, after.resourcePlan],
    ["timeline", before.timeline, after.timeline],
    ["budget", before.costEstimate, after.costEstimate],
    ["riskAssessment", before.riskAssessment, after.riskAssessment],
    ["recommendations", [before.bidRecommendation, before.consistencyChecks, before.roi], [after.bidRecommendation, after.consistencyChecks, after.roi]],
    ["conclusion", before.conclusion, after.conclusion]
  ];

  checks.forEach(([section, oldValue, newValue]) => {
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changed.push(section);
    }
  });

  return changed;
}

function getBudgetChartData(proposal: Proposal) {
  return [
    { label: "Development", value: proposal.costEstimate.developmentCost, color: "#126a72", currency: proposal.costEstimate.currency },
    { label: "Infrastructure", value: proposal.costEstimate.infrastructureCost, color: "#2f80ed", currency: proposal.costEstimate.currency },
    { label: "Licensing", value: proposal.costEstimate.licensingCost, color: "#b7791f", currency: proposal.costEstimate.currency },
    { label: "Support", value: proposal.costEstimate.supportCost, color: "#6f42c1", currency: proposal.costEstimate.currency },
    { label: "Contingency", value: proposal.costEstimate.contingencyCost, color: "#b42318", currency: proposal.costEstimate.currency }
  ].filter((item) => item.value > 0);
}

function getRiskChartData(proposal: Proposal) {
  return [
    { label: "Technical", value: proposal.riskAssessment.technicalRisks.length, color: "#2f80ed" },
    { label: "Delivery", value: proposal.riskAssessment.deliveryRisks.length, color: "#b7791f" },
    { label: "Budget", value: proposal.riskAssessment.budgetRisks.length, color: "#b42318" },
    { label: "Compliance", value: proposal.riskAssessment.complianceRisks.length, color: "#6f42c1" }
  ].filter((item) => item.value > 0);
}

function getEffortChartData(proposal: Proposal) {
  return proposal.resourcePlan.teamComposition.map((item) => ({
    label: item.role,
    value: roundChartValue(item.fte * item.months),
    color: "#126a72"
  }));
}

function roundChartValue(value: number): number {
  return Math.round(value * 10) / 10;
}

function markdownBlocks(content: string) {
  return content
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

/**
 * Interactive upload and review workbench for autonomous proposal generation.
 */
export function ProposalWorkbench() {
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  const [executionState, setExecutionState] = useState<ExecutionState>("idle");
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [routedAgent, setRoutedAgent] = useState<AgentRole>("ceo");
  const [highlightedSections, setHighlightedSections] = useState<ProposalSectionId[]>([]);
  const [lastProposalUpdate, setLastProposalUpdate] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const isGenerating =
    executionState === "processing" || executionState === "replaying";

  const resultItems = result ? [result] : [];
  const activeResult = resultItems[0];
  const agentEvents = useMemo(
    () => buildExecutionEvents(activeResult ?? null),
    [activeResult]
  );
  const visibleEvents = agentEvents.slice(0, visibleMessages);
  const progress =
    agentEvents.length > 0
      ? Math.min(100, Math.round((visibleMessages / agentEvents.length) * 100))
      : 0;
  const canAskAgents =
    Boolean(activeResult) &&
    (executionState === "replaying" || executionState === "complete");
  const isAgentThinking =
    chatMessages.some((message) => message.status === "thinking");

  const markdownUrls = useMemo(() => {
    return resultItems.map((item) => ({
      fileName: item.fileName,
      url: URL.createObjectURL(new Blob([item.markdown], { type: "text/markdown" }))
    }));
  }, [resultItems]);

  const pdfUrls = useMemo(() => {
    return resultItems.map((item) => ({
      fileName: item.fileName,
      url: URL.createObjectURL(
        new Blob(
          [Uint8Array.from(atob(item.pdfBase64), (char) => char.charCodeAt(0))],
          { type: "application/pdf" }
        )
      )
    }));
  }, [resultItems]);

  /**
   * Sends the uploaded RFP to the proposal generation API.
   */
  async function generateProposal() {
    if (files.length === 0) return;

    setExecutionState("processing");
    setVisibleMessages(0);
    setError("");
    setResult(null);
    setChatMessages([]);
    setHighlightedSections([]);
    setLastProposalUpdate(null);

    const body = new FormData();
    files.forEach((file) => body.append("file", file));

    try {
      const response = await fetch("/api/proposals", { method: "POST", body });
      const data = await response.json();

      if (!response.ok) {
        const detailText =
          data.details?.warnings?.length
            ? ` ${data.details.warnings.join(" ")}`
            : "";

        setError(`${data.error ?? "Proposal generation failed."}${detailText}`);
        setExecutionState("idle");
        return;
      }

      setResult(data);
      setChatMessages([
        {
          id: crypto.randomUUID(),
          from: "system",
          content:
            "Agent chat is ready. Ask specialists to explain decisions, cross-check each other's outputs, or revise the proposal with your instructions.",
          createdAt: new Date().toISOString(),
          status: "ready"
        }
      ]);
      setExecutionState("replaying");
    } catch {
      setError("Proposal generation failed. Please try again.");
      setExecutionState("idle");
    }
  }

  async function askAgent() {
    if (!activeResult || !chatInput.trim() || isAgentThinking) return;

    const question = chatInput.trim();
    const requestedAgent = routeQuestionToAgent(question);
    const pendingId = crypto.randomUUID();
    const now = new Date().toISOString();

    setChatInput("");
    setRoutedAgent(requestedAgent);
    setChatMessages((messages) => [
      ...messages,
      {
        id: crypto.randomUUID(),
        from: "user",
        content: question,
        createdAt: now,
        status: "ready"
      },
      {
        id: pendingId,
        from: requestedAgent,
        content: `${getAgentLabel(requestedAgent).name} is reviewing your request and the generated proposal context...`,
        createdAt: now,
        status: "thinking",
        routedAgent: requestedAgent
      }
    ]);

    try {
      const response = await fetch("/api/agent-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          agent: requestedAgent,
          question,
          rfp: activeResult.rfp,
          proposal: activeResult.proposal
        })
      });

      const data = await response.json() as AgentChatResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Agent chat failed.");
      }

      if (
        data.proposal &&
        data.markdown &&
        data.pdfBase64
      ) {
        const changedSections = compareProposalSections(
          activeResult.proposal,
          data.proposal
        );

        setHighlightedSections(changedSections);
        setLastProposalUpdate(new Date().toISOString());

        setResult((current) =>
          current
            ? {
                ...current,
                proposal: data.proposal as Proposal,
                markdown: data.markdown as string,
                pdfBase64: data.pdfBase64 as string
              }
            : current
        );
      }

      const appliedSuffix =
        data.changesApplied?.length
          ? `\n\nApplied changes:\n${data.changesApplied.map((item) => `- ${item}`).join("\n")}`
          : "";

      setChatMessages((messages) =>
        messages.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                content: `${data.answer ?? "I could not produce an answer from the available context."}${appliedSuffix}`,
                createdAt: new Date().toISOString(),
                status: "ready",
                routedAgent: requestedAgent,
                mode: data.mode ?? "answer"
              }
            : message
        )
      );
    } catch (error) {
      setChatMessages((messages) =>
        messages.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                content:
                  error instanceof Error
                    ? error.message
                    : "Agent chat failed. Please try again.",
                createdAt: new Date().toISOString(),
                status: "error"
              }
            : message
        )
      );
    }
  }

  useEffect(() => {
    if (executionState !== "replaying") return;

    setVisibleMessages(0);
    let count = 0;

    const timer = window.setInterval(() => {
      count += 1;
      setVisibleMessages(count);

      if (count >= agentEvents.length) {
        window.clearInterval(timer);
        window.setTimeout(() => setExecutionState("complete"), 650);
      }
    }, 430);

    return () => window.clearInterval(timer);
  }, [agentEvents.length, executionState]);

  useEffect(() => {
    timelineRef.current?.scrollTo({
      top: timelineRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [visibleMessages]);

  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [chatMessages]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>Autonomous RFP Proposal Generator</h1>
          <p>Upload an RFP, watch the specialist agents collaborate, and export the final proposal.</p>
        </div>
        <span className="badge">
          <ShieldCheck size={14} /> Cross-agent validation enabled
        </span>
      </header>

      <section className="workspace">
        <aside className="panel stack upload-panel">
          <h2>Upload RFP</h2>
          <p className="panel-description">
            Start here. Upload one RFP document and the system will extract requirements, run the agents, and produce a proposal.
          </p>
          <label className="upload-zone">
            <Upload size={34} color="#126a72" />
            <span>
              {files.length > 0
                ? `${files.length} file(s) selected`
                : "Choose one or more PDF, DOCX, or TXT files"}
            </span>
            <input
              className="file-input"
              type="file"
              multiple
              accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
          </label>
          <button className="button" disabled={files.length === 0 || isGenerating} onClick={generateProposal}>
            {isGenerating ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
            {isGenerating ? "Generating" : "Generate Proposal"}
          </button>
          <p className={error ? "status error" : "status"}>
            {error || "The existing multi-agent pipeline remains unchanged; this screen visualizes its execution for the demo."}
          </p>

          <section className="onboarding-card">
            <h3>Welcome</h3>
            <p>This platform helps you:</p>
            <ul className="check-list">
              <li>Upload an RFP</li>
              <li>Generate an AI-powered proposal</li>
              <li>Observe multi-agent collaboration</li>
              <li>Chat with proposal agents</li>
              <li>Refine proposal sections</li>
              <li>Export a professional PDF</li>
            </ul>
          </section>

          <section className="workflow-guide" aria-label="Guided workflow">
            {[
              "Upload your RFP document",
              "Watch AI agents analyze requirements",
              "Review generated proposal",
              "Chat and request changes",
              "See changes reflected instantly",
              "Export final proposal"
            ].map((step, index) => (
              <div className="workflow-step" key={step} title={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </section>
        </aside>

        <section className="stack workspace-main">
          {executionState === "idle" && !result && (
            <div className="panel output-empty">
              <Info size={22} color="#126a72" />
              <h2>Ready When You Are</h2>
              <p className="status">
                Upload an RFP from the left panel. The agent collaboration workspace, proposal reader, and download links will appear here after generation.
              </p>
            </div>
          )}

          {(executionState === "processing" || executionState === "replaying") && (
            <section className="panel execution-panel">
              <div className="section-heading">
                <div>
                  <h2>Agent Collaboration Workspace</h2>
                  <p>Conversation cards showing agent messages, reviews, critiques, approvals, and revisions.</p>
                </div>
                <span className="execution-pill">
                  {executionState === "processing" ? (
                    <>
                      <Loader2 size={14} className="spin" /> Processing RFP
                    </>
                  ) : (
                    <>
                      <Clock3 size={14} /> {progress}% complete
                    </>
                  )}
                </span>
              </div>

              <div className="progress-track" aria-label="Agent execution progress">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>

              <div className="agent-timeline" ref={timelineRef}>
                {executionState === "processing" && (
                  <div className="timeline-message active">
                    <div className="message-meta">
                      <span className="event-icon thinking-icon">
                        <Cpu size={15} />
                      </span>
                      <strong>Orchestrator</strong>
                      <span className="role-badge">Preparing</span>
                      <span>now</span>
                    </div>
                    <p>Extracting the uploaded RFP, calling Gemini analysis, and preparing agent handoffs...</p>
                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}

                {visibleEvents.map((event, index) => {
                  const agent = getActorLabel(event.agent);
                  const isActive =
                    executionState === "replaying" && index === visibleEvents.length - 1;

                  return (
                    <article
                      className={isActive ? `timeline-message event-${event.type} active` : `timeline-message event-${event.type}`}
                      key={`${event.agent}-${event.target}-${event.type}-${index}`}
                    >
                      <div className="message-meta">
                        <span className={`event-icon ${event.type}-icon`}>
                          {getEventIcon(event.type)}
                        </span>
                        <strong>{agent.name}</strong>
                        <span className="role-badge">{agent.role}</span>
                        <span className="event-type">{event.type}</span>
                        <span>{formatTime(event.createdAt)}</span>
                      </div>
                      <p>{event.content}</p>
                      {isActive && event.type !== "message" && (
                        <div className="typing-indicator">
                          <span />
                          <span />
                          <span />
                        </div>
                      )}
                    </article>
                  );
                })}

                {executionState === "replaying" && visibleMessages < agentEvents.length && (
                  <div className="timeline-message thinking">
                    <div className="message-meta">
                      <span className="event-icon thinking-icon">
                        <Sparkles size={15} />
                      </span>
                      <strong>Next Agent</strong>
                      <span className="role-badge">Thinking</span>
                    </div>
                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {executionState !== "idle" && (
            <section className="panel chat-panel">
              <div className="section-heading">
                <div>
                  <h2>Ask The Agents</h2>
                  <p>Question decisions, request cross-checks, or apply proposal revisions.</p>
                </div>
                <span className="execution-pill">
                  <MessageSquareText size={14} />
                  {canAskAgents ? "Live editing" : "Waiting"}
                </span>
              </div>

              <div className="agent-chat" ref={chatRef}>
                {chatMessages.length === 0 && (
                  <div className="chat-message system-message">
                    <div className="chat-avatar">
                      <Bot size={15} />
                    </div>
                    <div>
                      <div className="chat-meta">
                        <strong>Agent Chat</strong>
                        <span>Preparing</span>
                      </div>
                      <RichText content="The agents are extracting and analyzing the RFP. Once the replay starts, you can ask why they chose the scope, request a cross-check, or tell an agent to revise the proposal." />
                    </div>
                  </div>
                )}

                {chatMessages.map((message) => {
                  const label =
                    message.from === "user"
                      ? { name: "You", role: "Question" }
                      : message.from === "system"
                        ? { name: "Agent Chat", role: "Guide" }
                        : getAgentLabel(message.from);

                  return (
                    <article
                      className={`chat-message ${message.from === "user" ? "user-message" : ""} ${message.status === "error" ? "error-message" : ""}`}
                      key={message.id}
                    >
                      <div className="chat-avatar">
                        {message.from === "user" ? <UserRound size={15} /> : <Bot size={15} />}
                      </div>
                      <div>
                        <div className="chat-meta">
                          <strong>{label.name}</strong>
                          <span>{label.role}</span>
                          {message.routedAgent && (
                            <span className="route-badge">
                              <Route size={11} /> Auto-routed
                            </span>
                          )}
                          {message.mode === "proposal_updated" && (
                            <span className="change-badge">Proposal updated</span>
                          )}
                          {message.mode === "cross_check" && (
                            <span className="change-badge">Cross-check complete</span>
                          )}
                          <span>{formatTime(message.createdAt)}</span>
                        </div>
                        <RichText content={message.content} />
                        {message.status === "thinking" && (
                          <div className="typing-indicator">
                            <span />
                            <span />
                            <span />
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="chat-controls">
                <div className="agent-route-preview" title="The system automatically chooses the best specialist agent from your message.">
                  <Route size={16} />
                  <span>{getAgentLabel(routedAgent).name}</span>
                </div>
                <textarea
                  aria-label="Ask an agent a question"
                  value={chatInput}
                  placeholder={
                    canAskAgents
                      ? "Ask a question, request a cross-check, or tell this agent what to change..."
                      : "Agent Q&A will unlock after analysis finishes."
                  }
                  disabled={!canAskAgents || isAgentThinking}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void askAgent();
                    }
                  }}
                />
                <button
                  className="button"
                  disabled={!canAskAgents || !chatInput.trim() || isAgentThinking}
                  onClick={() => void askAgent()}
                >
                  {isAgentThinking ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                  Ask
                </button>
              </div>
            </section>
          )}

          {executionState === "complete" && activeResult && (
            <section className="stack">
              <div className="panel execution-complete">
                <CheckCircle2 size={18} />
                <span>
                  Agent execution complete. Proposal reader is ready.
                  {lastProposalUpdate && ` Last updated ${formatTime(lastProposalUpdate)}.`}
                </span>
              </div>

              <ProposalReader
                proposal={activeResult.proposal}
                rfp={activeResult.rfp}
                highlightedSections={highlightedSections}
                lastUpdated={lastProposalUpdate}
              />

              <div className="button-row download-row">
                <a
                  className="button secondary"
                  href={markdownUrls[0]?.url}
                  download={`${activeResult.fileName}-proposal.md`}
                >
                  <Download size={16} /> Markdown
                </a>
                <a
                  className="button"
                  href={pdfUrls[0]?.url}
                  download={`${activeResult.fileName}-proposal.pdf`}
                >
                  <Download size={16} /> PDF
                </a>
              </div>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}

function RichText({ content }: { content: string }) {
  return (
    <div className="rich-text">
      {markdownBlocks(content).map((block, index) => {
        if (/^\|.+\|$/.test(block.split("\n")[0] ?? "")) {
          const rows = block
            .split("\n")
            .filter((line) => /^\|.+\|$/.test(line))
            .filter((line) => !/^\|[\s:-]+\|?$/.test(line.replace(/\|/g, "|")));

          return (
            <table className="chat-table" key={`table-${index}`}>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={`${row}-${rowIndex}`}>
                    {row
                      .split("|")
                      .map((cell) => cell.trim())
                      .filter(Boolean)
                      .map((cell, cellIndex) =>
                        rowIndex === 0 ? (
                          <th key={`${cell}-${cellIndex}`}>{cell}</th>
                        ) : (
                          <td key={`${cell}-${cellIndex}`}>{cell}</td>
                        )
                      )}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }

        if (/^#{1,4}\s/.test(block)) {
          return <h4 key={block}>{block.replace(/^#{1,4}\s/, "")}</h4>;
        }

        if (/^(\d+\.|-|\*)\s/m.test(block)) {
          const items = block
            .split("\n")
            .map((item) => item.replace(/^(\d+\.|-|\*)\s*/, "").trim())
            .filter(Boolean);

          return (
            <ul key={`list-${index}`}>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }

        return <p key={block}>{block}</p>;
      })}
    </div>
  );
}

function ProposalReader({
  proposal,
  rfp,
  highlightedSections,
  lastUpdated
}: {
  proposal: Proposal;
  rfp: RfpAnalysis;
  highlightedSections: ProposalSectionId[];
  lastUpdated: string | null;
}) {
  const completion = Math.round(
    (proposalSections.filter((section) => hasSectionContent(section.id, proposal)).length /
      proposalSections.length) *
      100
  );

  return (
    <article className="proposal-reader panel">
      <aside className="proposal-toc" aria-label="Proposal table of contents">
        <div className="toc-heading">
          <ListChecks size={16} />
          <span>Contents</span>
        </div>
        <div className="reader-progress">
          <span style={{ width: `${completion}%` }} />
        </div>
        <p>{completion}% proposal coverage</p>
        <nav>
          {proposalSections.map((section) => (
            <a
              className={highlightedSections.includes(section.id) ? "toc-link updated" : "toc-link"}
              href={`#${section.id}`}
              key={section.id}
            >
              {section.title}
            </a>
          ))}
        </nav>
      </aside>

      <div className="proposal-document">
        <header className="reader-title">
          <div>
            <p className="eyebrow">Business Proposal Preview</p>
            <h2>{rfp.projectName}</h2>
            <p>Prepared for {rfp.clientName}</p>
          </div>
          {lastUpdated && (
            <span className="change-badge">
              <GitCompare size={13} /> Updated {formatTime(lastUpdated)}
            </span>
          )}
        </header>

        <PreviewSection
          id="executiveSummary"
          title="Executive Summary"
          description="High-level recommendation and proposal context."
          updated={highlightedSections.includes("executiveSummary")}
        >
          <RichText content={proposal.executiveSummary} />
        </PreviewSection>

        <PreviewSection
          id="clientUnderstanding"
          title="Client Understanding"
          description="The business needs and objectives detected from the RFP."
          updated={highlightedSections.includes("clientUnderstanding")}
        >
          <RichText content={proposal.clientUnderstanding} />
        </PreviewSection>

        <PreviewSection
          id="proposedSolution"
          title="Proposed Solution"
          description="Recommended capabilities and how they map to the RFP."
          updated={highlightedSections.includes("proposedSolution")}
        >
          <RichText content={proposal.proposedSolution} />
        </PreviewSection>

        <PreviewSection
          id="technicalArchitecture"
          title="Technical Architecture"
          description="Architecture, stack, security, integrations, and operating model."
          updated={highlightedSections.includes("technicalArchitecture")}
        >
          <RichText content={proposal.technicalArchitecture.architectureOverview} />
          <div className="tag-grid">
            {proposal.technicalArchitecture.techStack.map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
        </PreviewSection>

        <PreviewSection
          id="resourcePlan"
          title="Resource Plan"
          description="Team allocation and estimated effort."
          updated={highlightedSections.includes("resourcePlan")}
        >
          <MetricGrid
            items={[
              ["Total FTE", String(proposal.resourcePlan.totalFte)],
              ["Person-months", String(proposal.resourcePlan.effortPersonMonths)],
              ["Estimated hours", proposal.resourcePlan.estimatedHours.toLocaleString()]
            ]}
          />
          <BarList
            title="Effort Distribution"
            data={getEffortChartData(proposal)}
            valueFormatter={(value) => `${value} PM`}
          />
          <div className="recommendation-box">
            <strong>Staffing Rationale</strong>
            <ul className="list compact-list">
              {proposal.resourcePlan.staffingStrategy.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </PreviewSection>

        <PreviewSection
          id="timeline"
          title="Timeline"
          description="Phase roadmap and estimated completion."
          updated={highlightedSections.includes("timeline")}
        >
          <MetricGrid
            items={[
              ["Duration", `${proposal.timeline.durationWeeks} weeks`],
              ["Completion", proposal.timeline.estimatedCompletionDate]
            ]}
          />
          <TimelineRoadmap proposal={proposal} />
          <div className="recommendation-box">
            <strong>Timeline Rationale</strong>
            <ul className="list compact-list">
              {proposal.timeline.rationale.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </PreviewSection>

        <PreviewSection
          id="budget"
          title="Budget"
          description="Cost breakdown based on role effort, market-rate assumptions, platform costs and delivery contingency."
          updated={highlightedSections.includes("budget")}
        >
          <MetricGrid
            items={[
              ["Development", money(proposal.costEstimate.developmentCost, proposal.costEstimate.currency)],
              ["Infrastructure", money(proposal.costEstimate.infrastructureCost, proposal.costEstimate.currency)],
              ["Licensing", money(proposal.costEstimate.licensingCost, proposal.costEstimate.currency)],
              ["Support", money(proposal.costEstimate.supportCost, proposal.costEstimate.currency)],
              ["Contingency", money(proposal.costEstimate.contingencyCost, proposal.costEstimate.currency)],
              ["Total", money(proposal.costEstimate.totalBudget, proposal.costEstimate.currency)]
            ]}
          />
          <DonutChart data={getBudgetChartData(proposal)} total={proposal.costEstimate.totalBudget} />
          <div className="recommendation-box">
            <strong>Budget Assumptions</strong>
            <ul className="list compact-list">
              {proposal.costEstimate.pricingAssumptions.slice(0, 8).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </PreviewSection>

        <PreviewSection
          id="riskAssessment"
          title="Risk Assessment"
          description="Risk categories, operational impact areas and mitigations."
          updated={highlightedSections.includes("riskAssessment")}
        >
          <RichText content={proposal.riskAssessment.riskSummary} />
          <BarList
            title="Risk Exposure Matrix"
            data={getRiskChartData(proposal)}
            valueFormatter={(value) => `${value} risks`}
          />
        </PreviewSection>

        <PreviewSection
          id="recommendations"
          title="Recommendations"
          description="Bid recommendation, validation and POC/ROI summary."
          updated={highlightedSections.includes("recommendations")}
        >
          <RichText content={proposal.bidRecommendation} />
          <div className="recommendation-box">
            <strong>ROI / POC Comparison</strong>
            <p>{proposal.roi.summary}</p>
          </div>
          <ul className="list compact-list">
            {proposal.consistencyChecks.map((check) => (
              <li key={`${check.category}-${check.message}`}>
                {check.severity.toUpperCase()} / {check.category}: {check.message}
              </li>
            ))}
          </ul>
        </PreviewSection>

        <PreviewSection
          id="conclusion"
          title="Conclusion"
          description="Closing summary."
          updated={highlightedSections.includes("conclusion")}
        >
          <RichText content={proposal.conclusion} />
        </PreviewSection>
      </div>
    </article>
  );
}

function PreviewSection({
  id,
  title,
  description,
  updated,
  children
}: {
  id: ProposalSectionId;
  title: string;
  description: string;
  updated: boolean;
  children: ReactNode;
}) {
  return (
    <details className={updated ? "preview-section updated" : "preview-section"} id={id} open>
      <summary>
        <span>
          <ChevronDown size={16} />
          <strong>{title}</strong>
        </span>
        {updated && <span className="change-badge">Section updated</span>}
      </summary>
      <p className="section-description">{description}</p>
      <div className="section-body">{children}</div>
    </details>
  );
}

function MetricGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="metric-grid">
      {items.map(([label, value]) => (
        <div className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function BarList({
  title,
  data,
  valueFormatter
}: {
  title: string;
  data: Array<{ label: string; value: number; color: string }>;
  valueFormatter: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <div className="chart-card">
      <div className="chart-title">
        <BarChart3 size={16} />
        <strong>{title}</strong>
      </div>
      <div className="bar-list">
        {data.map((item) => (
          <div className="bar-row" key={item.label}>
            <span>{item.label}</span>
            <div className="bar-track">
              <span style={{ width: `${Math.max(6, (item.value / max) * 100)}%`, background: item.color }} />
            </div>
            <strong>{valueFormatter(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({
  data,
  total
}: {
  data: Array<{ label: string; value: number; color: string; currency?: string }>;
  total: number;
}) {
  let offset = 0;
  const gradient = data
    .map((item) => {
      const start = offset;
      const end = offset + (item.value / Math.max(1, total)) * 100;
      offset = end;
      return `${item.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="chart-card donut-layout">
      <div className="donut" style={{ background: `conic-gradient(${gradient})` }}>
        <span>{money(total, data[0]?.currency ?? "USD")}</span>
      </div>
      <div className="chart-legend">
        {data.map((item) => (
          <span key={item.label}>
            <i style={{ background: item.color }} />
            {item.label}: {money(item.value, item.currency ?? "USD")}
          </span>
        ))}
      </div>
    </div>
  );
}

function TimelineRoadmap({ proposal }: { proposal: Proposal }) {
  const total = Math.max(1, proposal.timeline.phases.reduce((sum, phase) => sum + phase.weeks, 0));

  return (
    <div className="chart-card">
      <div className="chart-title">
        <Clock3 size={16} />
        <strong>Phase Timeline</strong>
      </div>
      <div className="phase-roadmap">
        {proposal.timeline.phases.map((phase) => (
          <div className="phase-item" key={phase.name} style={{ flexGrow: phase.weeks / total }}>
            <strong>{phase.name}</strong>
            <span>{phase.weeks} weeks</span>
            <p>{phase.output}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function hasSectionContent(section: ProposalSectionId, proposal: Proposal): boolean {
  switch (section) {
    case "executiveSummary":
      return Boolean(proposal.executiveSummary.trim());
    case "clientUnderstanding":
      return Boolean(proposal.clientUnderstanding.trim());
    case "proposedSolution":
      return Boolean(proposal.proposedSolution.trim());
    case "technicalArchitecture":
      return Boolean(proposal.technicalArchitecture.architectureOverview.trim());
    case "resourcePlan":
      return proposal.resourcePlan.teamComposition.length > 0;
    case "timeline":
      return proposal.timeline.phases.length > 0;
    case "budget":
      return proposal.costEstimate.totalBudget > 0;
    case "riskAssessment":
      return Boolean(proposal.riskAssessment.riskSummary.trim());
    case "recommendations":
      return Boolean(proposal.bidRecommendation.trim());
    case "conclusion":
      return Boolean(proposal.conclusion.trim());
  }
}
