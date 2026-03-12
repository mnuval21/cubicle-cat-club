/**
 * Quick integration test for the Claude adapter.
 *
 * Sets up a fake ~/.claude/projects/ directory structure,
 * starts the adapter, and verifies events flow correctly.
 * Also tests live tailing by appending lines after startup.
 */

import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ClaudeAdapter } from './adapters/claude-adapter.js';
import type { AgentEvent } from '@cubicle-cat-club/shared';

const TEST_DIR = '/tmp/cubicle-club-test-claude';
const PROJECT_DIR = join(TEST_DIR, 'my-cool-project');

// Fixture data: a mini session
const INITIAL_LINES = [
  JSON.stringify({
    type: 'human', uuid: 'msg-001', parentUuid: 'root',
    message: { role: 'user', content: [{ type: 'text', text: 'Fix the bug' }] },
  }),
  JSON.stringify({
    type: 'assistant', uuid: 'msg-002', parentUuid: 'msg-001',
    message: {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me look at the code.' },
        { type: 'tool_use', id: 'tu-001', name: 'Read', input: { file_path: '/src/app.ts' } },
      ],
      stop_reason: 'tool_use',
    },
  }),
].join('\n') + '\n';

// Lines to append AFTER startup (simulating live activity)
const LIVE_LINES = [
  JSON.stringify({
    type: 'human', uuid: 'msg-003', parentUuid: 'msg-002',
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu-001', content: 'file contents...' }] },
  }),
  JSON.stringify({
    type: 'assistant', uuid: 'msg-004', parentUuid: 'msg-003',
    message: {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Now editing.' },
        { type: 'tool_use', id: 'tu-002', name: 'Edit', input: {} },
      ],
      stop_reason: 'tool_use',
    },
  }),
  JSON.stringify({
    type: 'human', uuid: 'msg-005', parentUuid: 'msg-004',
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu-002', content: 'edited!' }] },
  }),
  JSON.stringify({
    type: 'assistant', uuid: 'msg-006', parentUuid: 'msg-005',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: 'All done!' }],
      stop_reason: 'end_turn',
    },
  }),
  JSON.stringify({
    type: 'system', subtype: 'turn_end', turn_duration_ms: 15000,
  }),
].join('\n') + '\n';

async function main() {
  console.log('=== Cubicle Cat Club: Claude Adapter Test ===\n');

  // Setup fake directory structure
  console.log('1. Setting up fake session files...');
  mkdirSync(PROJECT_DIR, { recursive: true });
  const sessionFile = join(PROJECT_DIR, 'test-session-001.jsonl');
  writeFileSync(sessionFile, INITIAL_LINES);
  console.log(`   Created: ${sessionFile}`);

  // Create adapter pointed at our test dir
  const adapter = new ClaudeAdapter(TEST_DIR);
  const events: AgentEvent[] = [];

  adapter.onEvent((event) => {
    events.push(event);
    const emoji =
      event.type === 'room:discovered' ? '🏢' :
      event.type === 'agent:created' ? '🐱' :
      event.type === 'agent:tool:start' ? '🔧' :
      event.type === 'agent:tool:done' ? '✅' :
      event.type === 'agent:active' ? '💪' :
      event.type === 'agent:idle' ? '😴' :
      event.type === 'agent:closed' ? '👋' :
      event.type === 'agent:subagent:spawn' ? '🐣' : '❓';

    console.log(`   ${emoji} Event: ${event.type}`, JSON.stringify(event));
  });

  // Start the adapter
  console.log('\n2. Starting adapter (catch-up phase)...');
  await adapter.start();

  // Wait for initial scan to process
  await sleep(2000);

  console.log(`\n   Events so far: ${events.length}`);
  console.log('   Rooms:', JSON.stringify(adapter.getRooms()));
  console.log('   Agents:', JSON.stringify(adapter.getAgents()));

  // Now simulate live activity — append new lines
  console.log('\n3. Appending live activity to session file...');
  appendFileSync(sessionFile, LIVE_LINES);

  // Wait for the poll to pick up new content
  await sleep(2000);

  console.log(`\n   Total events: ${events.length}`);

  // Verify we got the expected events
  console.log('\n4. Event summary:');
  const typeCounts: Record<string, number> = {};
  for (const e of events) {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(typeCounts).sort()) {
    console.log(`   ${type}: ${count}`);
  }

  // Check specific things
  const hasRoom = events.some((e) => e.type === 'room:discovered');
  const hasAgent = events.some((e) => e.type === 'agent:created');
  const hasToolStart = events.some((e) => e.type === 'agent:tool:start');
  const hasToolDone = events.some((e) => e.type === 'agent:tool:done');
  const hasIdle = events.some((e) => e.type === 'agent:idle');

  console.log('\n5. Assertions:');
  assert('Room discovered', hasRoom);
  assert('Agent created', hasAgent);
  assert('Tool started', hasToolStart);
  assert('Tool completed', hasToolDone);
  assert('Agent went idle', hasIdle);

  // Check that the agent has a cat name
  const createdEvent = events.find((e) => e.type === 'agent:created') as any;
  assert('Agent has a name', !!createdEvent?.name);
  console.log(`   Cat name: ${createdEvent?.name} 🐱`);

  // Stop
  await adapter.stop();
  console.log('\n=== Test complete! ===');
}

function assert(label: string, condition: boolean): void {
  console.log(`   ${condition ? '✅' : '❌'} ${label}`);
  if (!condition) {
    process.exitCode = 1;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
