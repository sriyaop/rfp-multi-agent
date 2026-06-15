import { NextResponse } from "next/server";

import { ProposalOrchestrator } from "@/lib/agents/orchestrator";

import { extractDocumentFromFile } from "@/lib/document/extractor";
import { analyzeRfpText } from "@/lib/document/extractor";
import {
  analyzeRfpFileWithAI,
  analyzeRfpWithAI
} from "@/lib/document/rfp-analyser";
import { renderMarkdown } from "@/lib/proposal/markdown";
import { renderPdf } from "@/lib/proposal/pdf";
import { RfpAnalysis } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Upload a PDF, DOCX, or TXT file."
        },
        {
          status: 400
        }
      );
    }

    const extraction = await extractDocumentFromFile(file);

    const rawText = extraction.text;
    let rfp: RfpAnalysis;
    let analysisSource: "gemini-text" | "gemini-file" | "deterministic" = "gemini-text";

    try {

      if (extraction.quality === "good") {
        rfp =
          await analyzeRfpWithAI(
            rawText
          );
      } else {
        const fileBuffer =
          Buffer.from(
            await file.arrayBuffer()
          );

        rfp =
          await analyzeRfpFileWithAI({
            data: fileBuffer,
            mimeType: inferMimeType(file),
            fileName: file.name
          });

        analysisSource = "gemini-file";
      }

      validateRfpAnalysis(
        rfp,
        analysisSource === "gemini-file"
          ? "Gemini document analysis"
          : "Gemini text analysis"
      );

      console.log(
        "AI RFP ANALYSIS SUCCESS"
      );

      console.log(
        "AI RFP ANALYSIS COUNTS",
        {
          functionalRequirements: rfp.functionalRequirements.length,
          technicalRequirements: rfp.technicalRequirements.length,
          scopeItems: rfp.scopeItems.length,
          risks: rfp.risks.length
        }
      );
    }
    catch (error) {

      if (
        error instanceof Error &&
        error.message.includes("Proposal generation stopped to prevent hallucination")
      ) {
        throw error;
      }

      console.error(
        "AI RFP analysis failed after all configured attempts."
      );

      console.error(error);

      if (extraction.quality !== "good") {
        return NextResponse.json(
          {
            error:
              "The system tried both normal text extraction and Gemini document understanding, but could not reliably read this RFP. Please upload a clearer PDF/DOCX/TXT file.",
            details: {
              pages: extraction.pageCount,
              extractedCharacters: extraction.characterCount,
              warnings: extraction.warnings
            }
          },
          {
            status: 422
          }
        );
      }

      rfp =
        analyzeRfpText(
          rawText
        );

      analysisSource = "deterministic";

      validateRfpAnalysis(
        rfp,
        "Emergency deterministic analysis"
      );
    }

    const proposal = await new ProposalOrchestrator().run(
      rfp
    );

    const markdown = renderMarkdown(
      proposal
    );

    const pdf = await renderPdf(
      proposal
    );

    return NextResponse.json({
      fileName: file.name,
      extraction: {
        pageCount: extraction.pageCount,
        characterCount: extraction.characterCount,
        quality: extraction.quality,
        warnings: extraction.warnings,
        analysisSource
      },
      rfp,
      proposal,
      markdown,
      pdfBase64: pdf.toString("base64")
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Proposal generation failed"
      },
      {
        status:
          error instanceof Error &&
          error.message.includes("Proposal generation stopped to prevent hallucination")
            ? 422
            : 500
      }
    );
  }
}

function inferMimeType(file: File): string {
  if (file.type) {
    return file.type;
  }

  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (name.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "text/plain";
}

function validateRfpAnalysis(
  rfp: RfpAnalysis,
  source: string
) {
  const requirementSignals =
    rfp.functionalRequirements.length +
    rfp.technicalRequirements.length +
    rfp.scopeItems.length +
    rfp.deliverables.length;

  const emptyContentMarkers = [
    rfp.executiveSummary,
    ...rfp.businessObjectives,
    ...rfp.functionalRequirements,
    ...rfp.scopeItems
  ]
    .join(" ")
    .toLowerCase();

  if (
    requirementSignals < 5 ||
    emptyContentMarkers.includes("no rfp content") ||
    emptyContentMarkers.includes("no content was provided")
  ) {
    throw new Error(
      `${source} produced too little grounded RFP content (${requirementSignals} requirement/scope/deliverable signals). Proposal generation stopped to prevent hallucination.`
    );
  }
}
