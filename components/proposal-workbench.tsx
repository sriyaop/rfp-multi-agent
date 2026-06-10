"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Loader2, ShieldCheck, Upload } from "lucide-react";
import { Proposal, RfpAnalysis } from "@/lib/types";
import { usd } from "@/lib/utils";

interface ApiResult {
  rfp: RfpAnalysis;
  proposal: Proposal;
  markdown: string;
  pdfBase64: string;
  fileName: string;
}

/**
 * Interactive upload and review workbench for autonomous proposal generation.
 */
export function ProposalWorkbench() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const markdownUrl = useMemo(() => {
    if (!result) return "";
    return URL.createObjectURL(new Blob([result.markdown], { type: "text/markdown" }));
  }, [result]);

  const pdfUrl = useMemo(() => {
    if (!result) return "";
    const bytes = Uint8Array.from(atob(result.pdfBase64), (char) => char.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  }, [result]);

  /**
   * Sends the uploaded RFP to the proposal generation API.
   */
  async function generateProposal() {
    if (!file) return;
    setIsGenerating(true);
    setError("");
    setResult(null);

    const body = new FormData();
    body.append("file", file);

    const response = await fetch("/api/proposals", { method: "POST", body });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Proposal generation failed.");
      setIsGenerating(false);
      return;
    }

    setResult(data);
    setIsGenerating(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>Autonomous RFP Proposal Generator</h1>
          <p>CEO-led multi-agent proposal planning, validation, and export.</p>
        </div>
        <span className="badge"><ShieldCheck size={14} /> Cross-agent validation enabled</span>
      </header>

      <section className="workspace">
        <aside className="panel stack">
          <h2>Upload RFP</h2>
          <label className="upload-zone">
            <Upload size={34} color="#126a72" />
            <span>{file ? file.name : "Choose a PDF, DOCX, or TXT file"}</span>
            <input
              className="file-input"
              type="file"
              accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button className="button" disabled={!file || isGenerating} onClick={generateProposal}>
            {isGenerating ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
            {isGenerating ? "Generating" : "Generate Proposal"}
          </button>
          <p className={error ? "status error" : "status"}>
            {error || "After upload, the CEO agent delegates work, specialists review each other, and the final proposal is exported."}
          </p>
        </aside>

        <section className="stack">
          {!result && (
            <div className="panel">
              <h2>Proposal Output</h2>
              <p className="status">Upload an RFP to generate scope, FTEs, effort, timeline, cost, architecture, risks, ROI, Markdown, and PDF.</p>
            </div>
          )}

          {result && (
            <>
              <div className="panel stack">
                <h2>{result.rfp.projectName}</h2>
                <div className="metrics">
                  <div className="metric"><span>Confidence</span><strong>{result.proposal.confidenceScore}%</strong></div>
                  <div className="metric"><span>Total Budget</span><strong>{usd(result.proposal.costEstimate.totalBudget)}</strong></div>
                  <div className="metric"><span>Timeline</span><strong>{result.proposal.timeline.durationWeeks} weeks</strong></div>
                  <div className="metric"><span>Efficiency Gain</span><strong>{result.proposal.roi.efficiencyGainPercent}%</strong></div>
                </div>
                <div className="button-row">
                  <a className="button secondary" href={markdownUrl} download="proposal.md"><Download size={16} /> Markdown</a>
                  <a className="button secondary" href={pdfUrl} download="proposal.pdf"><Download size={16} /> PDF</a>
                </div>
              </div>

              <div className="grid-two">
                <div className="panel">
                  <h3>Resource Plan</h3>
                  <ul className="list">
                    {result.proposal.resourcePlan.teamComposition.map((item) => (
                      <li key={item.role}>{item.role}: {item.fte} FTE for {item.months} months</li>
                    ))}
                  </ul>
                </div>
                <div className="panel">
                  <h3>Validation</h3>
                  <ul className="list">
                    {result.proposal.consistencyChecks.map((check) => (
                      <li key={`${check.category}-${check.message}`}>{check.severity.toUpperCase()}: {check.message}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="panel">
                <h3>Generated Markdown</h3>
                <pre className="markdown">{result.markdown}</pre>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
