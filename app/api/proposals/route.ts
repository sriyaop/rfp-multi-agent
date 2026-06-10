import { NextResponse } from "next/server";
import { ProposalOrchestrator } from "@/lib/agents/orchestrator";
import { analyzeRfpText, extractTextFromFile } from "@/lib/document/extractor";
import { renderMarkdown } from "@/lib/proposal/markdown";
import { renderPdf } from "@/lib/proposal/pdf";

export const runtime = "nodejs";

/**
 * Accepts an uploaded RFP, runs autonomous multi-agent proposal generation, and returns exports.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a PDF, DOCX, or TXT RFP file." }, { status: 400 });
    }

    const text = await extractTextFromFile(file);
    const rfp = analyzeRfpText(text);
    const proposal = await new ProposalOrchestrator().run(rfp);
    const markdown = renderMarkdown(proposal);
    const pdf = await renderPdf(proposal);

    return NextResponse.json({
      rfp,
      proposal,
      markdown,
      pdfBase64: pdf.toString("base64"),
      fileName: file.name
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proposal generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
