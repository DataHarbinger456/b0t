import { NextRequest } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { postgresDb } from '@/lib/db';
import { workflowsTablePostgres } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { executeWorkflowConfig } from '@/lib/workflows/executor';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    const { messages } = await request.json();

    if (!postgresDb) {
      throw new Error('Database not initialized');
    }

    logger.info({ workflowId }, 'Chat request received');

    // Fetch workflow
    const workflows = await postgresDb
      .select()
      .from(workflowsTablePostgres)
      .where(eq(workflowsTablePostgres.id, workflowId))
      .limit(1);

    if (workflows.length === 0) {
      logger.warn({ workflowId }, 'Workflow not found');
      return new Response('Workflow not found', { status: 404 });
    }

    const workflow = workflows[0];
    const config = typeof workflow.config === 'string'
      ? JSON.parse(workflow.config)
      : workflow.config;

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

Be friendly, concise, and helpful. If the workflow produces data, explain it clearly to the user.`;

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

    // Log the formatted messages for debugging
    logger.info({ workflowId, formattedMessages }, 'Formatted messages for AI');

    // Stream the AI response using AI SDK
    // Note: This uses the AI SDK directly (not the module system) because:
    // - It's UI-specific streaming (not a workflow action)
    // - It requires special streaming format for React components
    // - The actual workflow execution uses the module system via executeWorkflowConfig
    const result = streamText({
      model: openai('gpt-4-turbo'),
      system: systemPrompt,
      messages: formattedMessages,
      async onFinish({ text }) {
        logger.info({ workflowId, responseLength: text.length, text }, 'AI response completed, executing workflow');

        // Execute the workflow using the workflow execution engine
        // This properly uses the module system and all workflow infrastructure
        try {
          await executeWorkflowConfig(config, workflow.userId, {
            workflowId: workflow.id,
            userInput,
          });
          logger.info({ workflowId }, 'Workflow executed successfully');
        } catch (error) {
          logger.error({ workflowId, error }, 'Error executing workflow');
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error({ workflowId, error: errorMessage, stack: errorStack }, 'Chat error');
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
