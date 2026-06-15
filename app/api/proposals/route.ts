import { NextResponse } from "next/server";

import { ProposalOrchestrator } from "@/lib/agents/orchestrator";

import { extractTextFromFile } from "@/lib/document/extractor";
import { analyzeRfpText } from "@/lib/document/extractor";
import { analyzeRfpWithAI } from "@/lib/document/rfp-analyser";
import { renderMarkdown } from "@/lib/proposal/markdown";
import { renderPdf } from "@/lib/proposal/pdf";

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

    const rawText = await extractTextFromFile(file);
    let rfp;

    try {

      rfp =
        await analyzeRfpWithAI(
          rawText
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

      console.error(
        "AI RFP analysis failed after all configured attempts. Using emergency deterministic fallback."
      );

      console.error(error);

      rfp =
        analyzeRfpText(
          rawText
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
        status: 500
      }
    );
  }
}
