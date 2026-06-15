"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Cpu,
  Download,
  FileText,
  Loader2,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
  Upload
} from "lucide-react";
import { Proposal, RfpAnalysis, AgentMessage, AgentRole } from "@/lib/types";
import { usd } from "@/lib/utils";

interface ApiResultItem {
  rfp: RfpAnalysis;
  proposal: Proposal;
  markdown: string;
  pdfBase64: string;
  fileName: string;
}

type ApiResult = ApiResultItem;
type ExecutionState = "idle" | "processing" | "replaying" | "complete";
type AgentEventType = "thinking" | "tool" | "handoff" | "message";

interface AgentEvent {
  type: AgentEventType;
  agent: AgentRole;
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
  }
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
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const isGenerating =
    executionState === "processing" || executionState === "replaying";

  const resultItems = result ? [result] : [];
  const activeResult = resultItems[0];
  const conversation =
    activeResult?.proposal.agentConversation.length
      ? activeResult.proposal.agentConversation
      : fallbackMessages;
  const agentEvents = useMemo(
    () => buildAgentEvents(conversation),
    [conversation]
  );
  const visibleEvents = agentEvents.slice(0, visibleMessages);
  const progress =
    agentEvents.length > 0
      ? Math.min(100, Math.round((visibleMessages / agentEvents.length) * 100))
      : 0;

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

    const body = new FormData();
    files.forEach((file) => body.append("file", file));

    try {
      const response = await fetch("/api/proposals", { method: "POST", body });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Proposal generation failed.");
        setExecutionState("idle");
        return;
      }

      setResult(data);
      setExecutionState("replaying");
    } catch {
      setError("Proposal generation failed. Please try again.");
      setExecutionState("idle");
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
        <aside className="panel stack">
          <h2>Upload RFP</h2>
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
        </aside>

        <section className="stack">
          {executionState === "idle" && !result && (
            <div className="panel output-empty">
              <h2>Generate Proposal</h2>
              <p className="status">
                The proposal preview and download links will appear after the live agent execution finishes.
              </p>
            </div>
          )}

          {(executionState === "processing" || executionState === "replaying") && (
            <section className="panel execution-panel">
              <div className="section-heading">
                <div>
                  <h2>Live Agent Execution</h2>
                  <p>Replay of the CEO-led multi-agent workflow.</p>
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
                  const agent = getAgentLabel(event.agent);
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

          {executionState === "complete" && activeResult && (
            <section className="stack">
              <div className="panel execution-complete">
                <CheckCircle2 size={18} />
                <span>Agent execution complete. Proposal preview is ready.</span>
              </div>

              <article className="panel proposal-preview">
                <div className="section-heading">
                  <div>
                    <h2>{activeResult.rfp.projectName}</h2>
                    <p>Business Proposal Preview</p>
                  </div>
                </div>

                <section className="preview-section">
                  <h3>Executive Summary</h3>
                  <p>{activeResult.proposal.executiveSummary}</p>
                </section>

                <section className="preview-section">
                  <h3>Client Understanding</h3>
                  <p>{activeResult.proposal.clientUnderstanding}</p>
                </section>

                <section className="preview-section">
                  <h3>Proposed Solution</h3>
                  <p>{activeResult.proposal.proposedSolution}</p>
                </section>

                <section className="preview-section">
                  <h3>Technical Architecture</h3>
                  <p>{activeResult.proposal.technicalArchitecture.architectureOverview}</p>
                  <ul className="list compact-list">
                    {activeResult.proposal.technicalArchitecture.techStack.map((tech) => (
                      <li key={tech}>{tech}</li>
                    ))}
                  </ul>
                </section>

                <section className="preview-section">
                  <h3>Resource Plan</h3>
                  <ul className="list compact-list">
                    {activeResult.proposal.resourcePlan.teamComposition.map((row) => (
                      <li key={row.role}>
                        {row.role}: {row.fte} FTE for {row.months} months
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="preview-section">
                  <h3>Project Timeline</h3>
                  <p>{activeResult.proposal.timeline.durationWeeks} weeks total delivery duration.</p>
                  <ul className="list compact-list">
                    {activeResult.proposal.timeline.phases.map((phase) => (
                      <li key={phase.name}>
                        {phase.name}: {phase.weeks} weeks, {phase.output}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="preview-section">
                  <h3>Cost Breakdown</h3>
                  <ul className="list compact-list">
                    <li>Development: {usd(activeResult.proposal.costEstimate.developmentCost)}</li>
                    <li>Infrastructure: {usd(activeResult.proposal.costEstimate.infrastructureCost)}</li>
                    <li>Licensing: {usd(activeResult.proposal.costEstimate.licensingCost)}</li>
                    <li>Contingency: {usd(activeResult.proposal.costEstimate.contingencyCost)}</li>
                    <li>Support: {usd(activeResult.proposal.costEstimate.supportCost)}</li>
                    <li>Total: {usd(activeResult.proposal.costEstimate.totalBudget)}</li>
                  </ul>
                </section>

                <section className="preview-section">
                  <h3>Risk Assessment</h3>
                  <p>{activeResult.proposal.riskAssessment.riskSummary}</p>
                  <ul className="list compact-list">
                    {activeResult.proposal.riskAssessment.deliveryRisks.map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                </section>

                <section className="preview-section">
                  <h3>Conclusion</h3>
                  <p>{activeResult.proposal.conclusion}</p>
                </section>
              </article>

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
