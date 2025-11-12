import { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { db } from '@/lib/db';
import { workflowsTable, chatConversationsTable, chatMessagesTable } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { executeWorkflowConfig } from '@/lib/workflows/executor';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Chat AI configuration (can be overridden via env vars)
const CHAT_AI_PROVIDER = (process.env.CHAT_AI_PROVIDER || 'openai') as 'openai' | 'anthropic';
const CHAT_AI_MODEL = process.env.CHAT_AI_MODEL || (CHAT_AI_PROVIDER === 'openai' ? 'gpt-4-turbo' : 'claude-3-5-sonnet-20241022');

/**
 * GET /api/workflows/[id]/chat?conversationId=xxx
 * Get messages for a specific conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workflowId } = await params;
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  try {
    if (!conversationId) {
      return new Response('conversationId is required', { status: 400 });
    }

    // Fetch conversation
    const conversations = await db
      .select()
      .from(chatConversationsTable)
      .where(
        and(
          eq(chatConversationsTable.id, conversationId),
          eq(chatConversationsTable.workflowId, workflowId)
        )
      )
      .limit(1);

    if (conversations.length === 0) {
      return new Response('Conversation not found', { status: 404 });
    }

    // Fetch messages
    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.conversationId, conversationId))
      .orderBy(chatMessagesTable.createdAt)
      .limit(20); // Last 20 messages per user requirement

    return Response.json({
      conversation: conversations[0],
      messages,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ workflowId, conversationId, error: errorMessage }, 'Failed to fetch conversation');
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * POST /api/workflows/[id]/chat
 * Chat with AI to execute workflow with natural language
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workflowId } = await params;
  try {
    const { messages, conversationId } = await request.json();

    logger.info({ workflowId, conversationId }, 'Chat request received');

    // Fetch workflow
    const workflows = await db
      .select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, workflowId))
      .limit(1);

    if (workflows.length === 0) {
      logger.warn({ workflowId }, 'Workflow not found');
      return new Response('Workflow not found', { status: 404 });
    }

    const workflow = workflows[0];

    // Get or create conversation
    let conversation;
    if (conversationId) {
      const existingConv = await db
        .select()
        .from(chatConversationsTable)
        .where(
          and(
            eq(chatConversationsTable.id, conversationId),
            eq(chatConversationsTable.workflowId, workflowId)
          )
        )
        .limit(1);

      conversation = existingConv[0];
    }

    if (!conversation) {
      // Create new conversation
      const convId = nanoid();
      await db.insert(chatConversationsTable).values({
        id: convId,
        workflowId,
        userId: workflow.userId,
        organizationId: workflow.organizationId,
        title: null,
        status: 'active',
        messageCount: 0,
      });

      const newConv = await db
        .select()
        .from(chatConversationsTable)
        .where(eq(chatConversationsTable.id, convId))
        .limit(1);

      conversation = newConv[0];
      logger.info({ conversationId: convId, workflowId }, 'Created new conversation');
    }
    const config = typeof workflow.config === 'string'
      ? JSON.parse(workflow.config)
      : workflow.config;

    // Extract model and provider from workflow config (if available in first step)
    const workflowModel = config.steps?.[0]?.inputs?.model || CHAT_AI_MODEL;
    const workflowProvider = config.steps?.[0]?.inputs?.provider || CHAT_AI_PROVIDER;

    // Get the last user message - handle both content and parts format
    const lastMessage = messages[messages.length - 1];
    let userInput = '';
    if (lastMessage?.content) {
      userInput = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);
    } else if (lastMessage?.parts) {
      // Handle parts format
      const textParts = (lastMessage.parts as Array<{ type: string; text?: string }>)
        .filter((part) => part.type === 'text')
        .map((part) => part.text || '');
      userInput = textParts.join(' ');
    }

    logger.info({ workflowId, messageCount: messages.length }, 'Starting chat stream');

    // System prompt for the AI
    const systemPrompt = `You are a helpful AI assistant that executes workflows based on user input.

Workflow: ${workflow.name}
Description: ${workflow.description || 'No description'}

Your job is to:
1. Understand the user's request
2. Execute the workflow with appropriate parameters
3. Present the results in a clear, conversational way

Be friendly, concise, and helpful. If the workflow produces data, explain it clearly to the user.

IMPORTANT: When formatting tables, always use proper markdown table syntax:
| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

Never use ASCII art tables with + and - characters. Always use the | and - markdown table format.`;

    // Convert messages from parts format to standard format and filter
    type MessageLike = { role: string; content?: unknown; parts?: Array<{ type: string; text?: string }> };
    const formattedMessages = (messages as MessageLike[])
      .filter((msg) => msg.role === 'user') // Only keep user messages
      .map((msg) => {
        // If already has content field, use it
        if (msg.content) {
          return {
            role: 'user' as const,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          };
        }

        // Convert from parts format to content format
        if (msg.parts) {
          const textContent = msg.parts
            .filter((part) => part.type === 'text')
            .map((part) => part.text || '')
            .join('\n');

          return {
            role: 'user' as const,
            content: textContent
          };
        }

        // Fallback
        return {
          role: 'user' as const,
          content: ''
        };
      })
      .filter((msg) => msg.content); // Remove empty messages

    // Get the AI model instance based on provider
    const modelInstance = workflowProvider === 'openai'
      ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(workflowModel)
      : createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(workflowModel);

    // Stream the AI response using AI SDK
    const result = streamText({
      model: modelInstance,
      system: systemPrompt,
      messages: formattedMessages,
      async onFinish({ text }) {
        logger.info({ workflowId, conversationId: conversation.id, responseLength: text.length }, 'AI response completed');

        // Save user message
        await db.insert(chatMessagesTable).values({
          id: nanoid(),
          conversationId: conversation.id,
          role: 'user',
          content: userInput,
        });

        // Save assistant message
        await db.insert(chatMessagesTable).values({
          id: nanoid(),
          conversationId: conversation.id,
          role: 'assistant',
          content: text,
        });

        // Generate title from first user message if not set
        let title = conversation.title;
        if (!title && userInput) {
          title = userInput.slice(0, 100);
        }

        // Update conversation metadata
        await db
          .update(chatConversationsTable)
          .set({
            messageCount: conversation.messageCount + 2,
            title,
            updatedAt: new Date(),
          })
          .where(eq(chatConversationsTable.id, conversation.id));

        // Execute the workflow using the workflow execution engine
        // Pass trigger data correctly - userMessage should be in the trigger object
        try {
          await executeWorkflowConfig(config, workflow.userId, {
            userMessage: userInput,
          });

          logger.info({ workflowId, conversationId: conversation.id }, 'Workflow executed successfully');
        } catch (error) {
          logger.error({ workflowId, conversationId: conversation.id, error }, 'Error executing workflow');
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      {
        workflowId,
        error: errorMessage,
        action: 'workflow_chat_failed'
      },
      'Chat API error'
    );
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
