# Autonomous Multi-Agent RFP Proposal Generator

This project is a Next.js + TypeScript platform that ingests an RFP document and autonomously generates a complete proposal using a hierarchical multi-agent workflow.

## What It Does

- Upload PDF, DOCX, or TXT RFP files.
- Extract requirements, scope, constraints, deliverables, risks, and business objectives.
- Run a CEO-led agent workflow.
- Generate product scope, user stories, architecture, resource plan, FTEs, effort, cost, timeline, risk assessment, and ROI.
- Perform one cross-agent review/debate cycle.
- Run hallucination controls through confidence scores and consistency checks.
- Export the final proposal as Markdown and PDF.

## Agent Architecture

- CEO Agent: orchestrates, delegates, coordinates reviews, resolves conflicts, and consolidates the proposal.
- Product Manager Agent: features, epics, user stories, milestones, roadmap.
- CTO Agent: tech stack, architecture, integrations, scalability, technical risks.
- Resource Planning Agent: team composition, FTEs, effort, allocation plan.
- Cost Estimation Agent: development cost, infrastructure cost, contingency, total budget.
- Timeline Agent: phases, milestones, duration, completion date.
- Risk Agent: technical, delivery, and budget risks with mitigations.

The registry in `lib/agents/registry.ts` is designed for adding CFO, HR, Legal, Security, and Compliance agents later.

## How To Run

```bash
cd "D:\Capstone Project\rfp-multi-agent"
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Upload a `.pdf`, `.docx`, or `.txt` RFP and click **Generate Proposal**.

## Optional OpenAI Configuration

The app runs in deterministic demo mode without an API key. To enable future model-backed agent extensions, create `.env.local`:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

## Verification Commands

```bash
npm run typecheck
npm run build
```

## Main Files

- `app/page.tsx`: application entry page.
- `app/api/proposals/route.ts`: upload API and proposal generation endpoint.
- `components/proposal-workbench.tsx`: upload UI, metrics, validation, exports.
- `lib/document/extractor.ts`: PDF/DOCX/TXT text extraction and RFP schema extraction.
- `lib/agents/orchestrator.ts`: CEO-led autonomous workflow.
- `lib/agents/*`: specialist agents and registry.
- `lib/validation/consistency.ts`: hallucination and consistency controls.
- `lib/proposal/*`: proposal builder, ROI, Markdown, and PDF exporters.

## Notes

The older Python prototype remains in the repository as reference material. The finished application entry point is the Next.js app described above.
