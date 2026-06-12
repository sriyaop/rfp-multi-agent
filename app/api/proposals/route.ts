import { NextResponse } from "next/server";

import { ProposalOrchestrator } from "@/lib/agents/orchestrator";

import { extractTextFromFile } from "@/lib/document/extractor";
import { analyzeRfpText } from "@/lib/document/extractor";
import { renderMarkdown } from "@/lib/proposal/markdown";
import { renderPdf } from "@/lib/proposal/pdf";
import {
  analyzeRfpWithAi
} from "@/lib/ai/rfp-analyzer";

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
    const text = await extractTextFromFile(file);
    const rfp =
      analyzeRfpText(text);

    try {

      const intelligence =
        await analyzeRfpWithAi(
          rawText
        );

      console.log(
          "AI INTELLIGENCE SUCCESS",
          intelligence
      );

      (rfp as any).intelligence =
        intelligence;

    }
    catch (error) {

      console.log(
        "Gemini unavailable. Falling back."
      );
    }

    const proposal = await new ProposalOrchestrator().run(
      rfp as any
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