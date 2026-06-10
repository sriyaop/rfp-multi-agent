import { Proposal } from "@/lib/types";
import { renderMarkdown } from "@/lib/proposal/markdown";

/**
 * Renders the proposal into a lightweight PDF buffer without external font assets.
 */
export async function renderPdf(proposal: Proposal): Promise<Buffer> {
  const lines = wrapLines(renderMarkdown(proposal).replace(/#/g, ""), 92).slice(0, 240);
  const content = [
    "BT",
    "/F1 10 Tf",
    "50 790 Td",
    "14 TL",
    ...lines.flatMap((line, index) => [
      index === 0 ? "" : "T*",
      `(${escapePdfText(line)}) Tj`
    ]).filter(Boolean),
    "ET"
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf-8")} >>\nstream\n${content}\nendstream`
  ];

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(chunks.join(""), "utf-8"));
    chunks.push(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(""), "utf-8");
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  for (const offset of offsets.slice(1)) {
    chunks.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(chunks.join(""), "utf-8");
}

/**
 * Wraps text into fixed-width lines suitable for a simple PDF text stream.
 */
function wrapLines(text: string, width: number): string[] {
  const output: string[] = [];
  for (const rawLine of text.split("\n")) {
    const words = rawLine.trim().split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      if (`${line} ${word}`.trim().length > width) {
        output.push(line);
        line = word;
      } else {
        line = `${line} ${word}`.trim();
      }
    }
    output.push(line);
  }
  return output;
}

/**
 * Escapes PDF text operators so generated content remains valid.
 */
function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
