/**
 * JSONL transcript parser for Claude Code session files.
 *
 * Real Claude Code JSONL format:
 *   - type: "human" | "assistant" | "system"
 *   - message.role: "user" | "assistant"
 *   - message.content: array of { type: "text" | "tool_use" | "tool_result", ... }
 *   - message.stop_reason: "tool_use" | "end_turn"
 *   - System lines may have subtype: "turn_end", turn_duration_ms, etc.
 */

import type { AgentEvent } from '@cubicle-cat-club/shared';

/**
 * Content block inside a message.
 */
interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  is_error?: boolean;
  content?: string | Array<{ type: string; text?: string }>;
}

/**
 * A single line from a Claude Code transcript JSONL file.
 * Handles both the real nested format and simplified format.
 */
interface TranscriptLine {
  // Real Claude Code format
  type: 'human' | 'assistant' | 'system' | 'user'; // 'user' for compat
  uuid?: string;
  parentUuid?: string;
  timestamp?: string;
  message?: {
    role: string;
    content: ContentBlock[] | string;
    stop_reason?: string;
  };

  // System line fields
  subtype?: string;
  turn_duration_ms?: number;
  turn_duration?: number;

  // Simplified format fields (for backwards compat)
  content?: string;
  tool_use?: ContentBlock[];
  tool_result?: ContentBlock[];
}

/**
 * Format tool names nicely for display.
 * "mcp__c1c393f5__read_page" → "Read Page"
 * "Bash" → "Bash"
 * "TodoWrite" → "Todo Write"
 */
export function formatToolName(raw: string): string {
  // Handle MCP tool format: mcp__<uuid>__<name>
  const mcpMatch = raw.match(/mcp__[^_]+__(.+)/);
  if (mcpMatch) {
    return humanize(mcpMatch[1]);
  }

  // Handle camelCase or PascalCase: "TodoWrite" → "Todo Write"
  const spaced = raw.replace(/([a-z])([A-Z])/g, '$1 $2');
  return humanize(spaced);
}

function humanize(str: string): string {
  return str
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Parse a single JSONL line from a Claude Code transcript.
 * Handles both real Claude Code format and simplified format.
 *
 * Returns an AgentEvent if the line contains relevant information, null otherwise.
 */
export function parseTranscriptLine(
  line: string,
  agentId: string
): AgentEvent | null {
  try {
    const parsed = JSON.parse(line) as TranscriptLine;
    return interpretLine(parsed, agentId);
  } catch {
    // Ignore parse errors (blank lines, malformed JSON)
    return null;
  }
}

function interpretLine(
  line: TranscriptLine,
  agentId: string
): AgentEvent | null {
  // --- System messages ---
  if (line.type === 'system') {
    // Turn ended → agent goes idle
    if (
      line.subtype === 'turn_end' ||
      line.turn_duration_ms !== undefined ||
      line.turn_duration !== undefined
    ) {
      return { type: 'agent:idle', id: agentId };
    }
    return null;
  }

  // --- Assistant messages (the agent doing things) ---
  if (line.type === 'assistant') {
    const content = extractContentBlocks(line);
    if (!content) return null;

    // Look for tool_use blocks
    const toolUse = content.find((b) => b.type === 'tool_use');
    if (toolUse && toolUse.name) {
      const toolName = formatToolName(toolUse.name);

      // Special case: Agent/Task tool = subagent spawn
      if (
        toolUse.name === 'Agent' ||
        toolUse.name === 'Task' ||
        toolUse.name === 'dispatch_agent'
      ) {
        return {
          type: 'agent:subagent:spawn',
          id: `${agentId}-sub-${toolUse.id || Date.now()}`,
          parentId: agentId,
        };
      }

      return {
        type: 'agent:tool:start',
        id: agentId,
        toolName,
        toolStatus: 'running',
      };
    }

    // Assistant message with only text and stop_reason: "end_turn" → agent finishing
    if (line.message?.stop_reason === 'end_turn') {
      return { type: 'agent:idle', id: agentId };
    }

    // Assistant message with text but no tool → agent is "thinking"/active
    const hasText = content.some((b) => b.type === 'text' && b.text);
    if (hasText) {
      return { type: 'agent:active', id: agentId };
    }

    return null;
  }

  // --- Human/User messages (tool results coming back) ---
  if (line.type === 'human' || line.type === 'user') {
    const content = extractContentBlocks(line);
    if (!content) return null;

    // Tool result → tool completed (with optional error flag)
    const toolResult = content.find((b) => b.type === 'tool_result');
    if (toolResult && toolResult.tool_use_id) {
      return {
        type: 'agent:tool:done',
        id: agentId,
        toolId: toolResult.tool_use_id,
        ...(toolResult.is_error ? { isError: true } : {}),
      };
    }

    // Regular human message (user typed something) → agent becomes active
    const hasText = content.some((b) => b.type === 'text' && b.text);
    if (hasText) {
      return { type: 'agent:active', id: agentId };
    }

    return null;
  }

  return null;
}

/**
 * Extract content blocks from a transcript line.
 * Handles both nested (message.content) and flat (content/tool_use) formats.
 */
function extractContentBlocks(line: TranscriptLine): ContentBlock[] | null {
  // Real format: message.content is an array
  if (line.message?.content) {
    if (Array.isArray(line.message.content)) {
      return line.message.content;
    }
    // message.content is a string → wrap it
    if (typeof line.message.content === 'string') {
      return [{ type: 'text', text: line.message.content }];
    }
  }

  // Simplified format: tool_use / tool_result at top level
  if (line.tool_use?.length) return line.tool_use;
  if (line.tool_result?.length) return line.tool_result;

  return null;
}

/**
 * Parse multiple JSONL lines.
 * Useful for batch processing transcript files.
 */
export function parseTranscript(
  content: string,
  agentId: string
): AgentEvent[] {
  const events: AgentEvent[] = [];

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;

    const event = parseTranscriptLine(line, agentId);
    if (event) {
      events.push(event);
    }
  }

  return events;
}
