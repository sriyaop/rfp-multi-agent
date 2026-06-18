# Autonomous Multi-Agent RFP Proposal Generator

This project is a Next.js + TypeScript platform that ingests an RFP document and autonomously generates a complete proposal using Gemini-powered RFP analysis and a hierarchical CEO-led multi-agent workflow.

## What It Does

- Upload PDF, DOCX, or TXT RFP files.
- Use Gemini AI to extract requirements, scope, constraints, deliverables, risks, budgets, deadlines, evaluation criteria, resource needs, and business objectives.
- Run a CEO-led agent workflow.
- Generate product scope, user stories, architecture, resource plan, FTEs, person-month effort, estimated hours, cost, timeline, completion deadline, risk assessment, and ROI.
- Perform one cross-agent review/debate cycle.
- Run hallucination controls through confidence scores and consistency checks.
- Export the final proposal as Markdown and PDF.

## Agent Architecture

- CEO Agent: orchestrates, delegates, coordinates reviews, resolves conflicts, and consolidates the proposal.
- Product Manager Agent: features, epics, user stories, milestones, roadmap.
- CTO Agent: tech stack, architecture, integrations, scalability, technical risks.
- Resource Planning Agent: team composition, FTEs, person-month effort, estimated project hours, allocation plan.
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

## Gemini Configuration

Create `.env.local`:

```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
GEMINI_TIMEOUT_MS=20000
GEMINI_MAX_ATTEMPTS=3
```

Gemini performs the primary RFP intelligence extraction. Deterministic extraction is only an emergency fallback if AI analysis fails after the configured attempts.

## Architecture Documentation

The paper-style architecture, event flow, input/output definition, calculations, hallucination controls, and ROI/POC explanation are documented in:

```text
docs/architecture.md
```

## Verification Commands

```bash
npm run typecheck
npm run build
```

## Main Files

- `app/page.tsx`: application entry page.
- `app/api/proposals/route.ts`: upload API and proposal generation endpoint.
- `components/proposal-workbench.tsx`: upload UI, live execution feed, proposal preview, ROI/POC display, exports.
- `lib/document/extractor.ts`: PDF/DOCX/TXT text extraction and RFP schema extraction.
- `lib/document/rfp-analyser.ts`: Gemini AI RFP intelligence extraction and schema normalization.
- `lib/agents/orchestrator.ts`: CEO-led autonomous workflow.
- `lib/agents/*`: specialist agents and registry.
- `lib/agents/rfp-intelligence.ts`: converts AI-extracted RFP fields into domain, complexity, integration, compliance, team, and timeline signals.
- `lib/validation/consistency.ts`: hallucination and consistency controls.
- `lib/proposal/*`: proposal builder, ROI, Markdown, and PDF exporters.

## Notes

The older Python prototype remains in the repository as reference material. The finished application entry point is the Next.js app described above.
