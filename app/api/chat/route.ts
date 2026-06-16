import { GoogleGenAI } from "@google/genai";
import type { Content } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AgentWorkspaceSession,
  InteractiveChatMessage,
  buildAgentSystemPrompt,
  createChatMessage,
  mapChatHistoryForGemini
} from "@/lib/agents/chat-context";
import { getPrismaClient } from "@/lib/db/prisma";

export const runtime = "nodejs";

const chatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  targetAgent: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const parsed = chatRequestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "sessionId, message and targetAgent are required.",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const { sessionId, message, targetAgent } = parsed.data;
    const prisma = await getPrismaClient();
    const session = await prisma.workspaceSession.findUnique({
      where: { id: sessionId }
    }) as AgentWorkspaceSession | null;

    if (!session) {
      return NextResponse.json(
        { error: "Workspace session not found." },
        { status: 404 }
      );
    }

    const userMessage = createChatMessage(
      "user",
      targetAgent,
      message
    );
    const chatHistory = normalizeChatHistory(session.chatHistory);
    const prompt = buildAgentSystemPrompt(
      targetAgent,
      {
        ...session,
        chatHistory
      }
    );
    const contents: Content[] = [
      ...mapChatHistoryForGemini(chatHistory, targetAgent),
      {
        role: "user",
        parts: [{ text: message }]
      }
    ];

    await appendChatMessages(
      sessionId,
      [userMessage]
    );

    return streamAgentResponse({
      contents,
      prompt,
      sessionId,
      targetAgent
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Agent chat failed."
      },
      { status: 500 }
    );
  }
}

function streamAgentResponse({
  contents,
  prompt,
  sessionId,
  targetAgent
}: {
  contents: Content[];
  prompt: string;
  sessionId: string;
  targetAgent: string;
}) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let finalResponse = "";

      try {
        const apiKey = process.env.GEMINI_API_KEY?.trim();

        if (!apiKey) {
          throw new Error("GEMINI_API_KEY is missing.");
        }

        const ai = new GoogleGenAI({
          apiKey
        });

        const response = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction: prompt,
            temperature: 0.3
          }
        });

        for await (const chunk of response) {
          const text = chunk.text ?? "";

          if (!text) {
            continue;
          }

          finalResponse += text;
          controller.enqueue(
            encoder.encode(text)
          );
        }

        if (finalResponse.trim()) {
          await appendChatMessages(
            sessionId,
            [
              createChatMessage(
                "model",
                targetAgent,
                finalResponse.trim()
              )
            ]
          );
        }

        controller.close();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Agent response stream failed.";

        controller.enqueue(
          encoder.encode(`\n[Agent chat error] ${message}`)
        );
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no"
    }
  });
}

async function appendChatMessages(
  sessionId: string,
  messages: InteractiveChatMessage[]
): Promise<void> {
  const prisma = await getPrismaClient();
  const session = await prisma.workspaceSession.findUnique({
    where: { id: sessionId }
  }) as Pick<AgentWorkspaceSession, "chatHistory"> | null;

  if (!session) {
    throw new Error("Workspace session not found while saving chat history.");
  }

  await prisma.workspaceSession.update({
    where: { id: sessionId },
    data: {
      chatHistory: [
        ...normalizeChatHistory(session.chatHistory),
        ...messages
      ]
    }
  });
}

function normalizeChatHistory(
  value: unknown
): InteractiveChatMessage[] {
  return Array.isArray(value)
    ? value.filter(isInteractiveChatMessage)
    : [];
}

function isInteractiveChatMessage(
  value: unknown
): value is InteractiveChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<InteractiveChatMessage>;

  return (
    (candidate.role === "user" || candidate.role === "model") &&
    typeof candidate.targetAgent === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.createdAt === "string"
  );
}
