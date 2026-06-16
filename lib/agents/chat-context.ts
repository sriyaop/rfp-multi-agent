export type ChatRole = "user" | "model";

export interface AgentTraceEntry {
  agent?: string;
  role?: string;
  targetAgent?: string;
  name?: string;
  displayName?: string;
  title?: string;
  thought?: string;
  reasoning?: string;
  generated?: unknown;
  output?: unknown;
  findings?: unknown;
  assumptions?: unknown;
  reviewNotes?: unknown;
  [key: string]: unknown;
}

export interface InteractiveChatMessage {
  id?: string;
  role: ChatRole;
  targetAgent: string;
  content: string;
  createdAt: string;
}

export interface AgentWorkspaceSession {
  id: string;
  rawAnalysis: unknown;
  finalProposal: unknown;
  autonomousTrace: AgentTraceEntry[];
  chatHistory: InteractiveChatMessage[];
}

const agentAliases: Record<string, string[]> = {
  CEO: ["ceo", "chief executive", "strategy"],
  CTO: ["cto", "chief technology", "technical", "architecture"],
  ProductManager: ["productmanager", "product manager", "pm", "scope"],
  ResourcePlanning: ["resourceplanning", "resource planning", "resource", "staffing", "hr"],
  CostEstimation: ["costestimation", "cost estimation", "cost", "cfo", "budget", "finance"],
  Timeline: ["timeline", "roadmap", "schedule"],
  Risk: ["risk", "risk analysis", "compliance"]
};

export function buildAgentSystemPrompt(
  targetAgent: string,
  session: AgentWorkspaceSession
): string {
  const trace = Array.isArray(session.autonomousTrace)
    ? session.autonomousTrace
    : [];

  if (trace.length === 0) {
    throw new Error("This workspace session has no autonomous agent trace.");
  }

  const agentTrace = trace.find((entry) =>
    traceEntryMatchesAgent(entry, targetAgent)
  );

  if (!agentTrace) {
    throw new Error(`No autonomous trace was found for agent "${targetAgent}".`);
  }

  return `
You are the ${targetAgent} specialist agent from an autonomous RFP proposal system.

PERSONA:
- Stay in character as ${targetAgent}.
- Explain your decisions as the agent who originally participated in the autonomous proposal workflow.
- Be specific about what evidence came from the RFP analysis, what you inferred, and what trade-offs you considered.
- If the user asks for a modification, propose the exact change and explain its downstream impact on scope, cost, timeline, risk, or architecture.
- Do not invent facts outside the provided session context. If something is not present, say what is missing.
- Keep answers concise enough for an interactive chat panel, but include concrete reasoning.

SESSION ID:
${session.id}

RAW RFP ANALYSIS:
${stringifyForPrompt(session.rawAnalysis)}

YOUR ORIGINAL AUTONOMOUS TRACE:
${stringifyForPrompt(agentTrace)}

FINAL CONSOLIDATED PROPOSAL:
${stringifyForPrompt(session.finalProposal)}
`.trim();
}

export function mapChatHistoryForGemini(
  chatHistory: InteractiveChatMessage[],
  targetAgent: string
) {
  return chatHistory
    .filter((message) =>
      normalizeAgentName(message.targetAgent) === normalizeAgentName(targetAgent)
    )
    .map((message) => ({
      role: message.role,
      parts: [{ text: message.content }]
    }));
}

export function createChatMessage(
  role: ChatRole,
  targetAgent: string,
  content: string
): InteractiveChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    targetAgent,
    content,
    createdAt: new Date().toISOString()
  };
}

function traceEntryMatchesAgent(
  entry: AgentTraceEntry,
  targetAgent: string
): boolean {
  const normalizedTarget = normalizeAgentName(targetAgent);
  const aliases = getAgentAliases(targetAgent);
  const candidates = [
    entry.agent,
    entry.role,
    entry.targetAgent,
    entry.name,
    entry.displayName,
    entry.title
  ]
    .filter((value): value is string => typeof value === "string")
    .map(normalizeAgentName);

  return candidates.some((candidate) =>
    candidate === normalizedTarget ||
    aliases.includes(candidate) ||
    candidate.includes(normalizedTarget) ||
    normalizedTarget.includes(candidate)
  );
}

function getAgentAliases(targetAgent: string): string[] {
  const normalizedTarget = normalizeAgentName(targetAgent);
  const matched = Object.entries(agentAliases).find(([canonical, aliases]) =>
    normalizeAgentName(canonical) === normalizedTarget ||
    aliases.map(normalizeAgentName).includes(normalizedTarget)
  );

  if (!matched) {
    return [normalizedTarget];
  }

  return [
    normalizeAgentName(matched[0]),
    ...matched[1].map(normalizeAgentName)
  ];
}

function normalizeAgentName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]/g, "");
}

function stringifyForPrompt(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "null";
}
