#!/usr/bin/env node

/**
 * CLI entry point for Cubicle Club server.
 * Handles command-line arguments and server startup.
 */

import { Command } from 'commander';
import open from 'open';
import { startServer } from './index.js';
import { MockAdapter } from './adapters/mock-adapter.js';
import { ClaudeAdapter } from './adapters/claude-adapter.js';

const packageJson = {
  name: '@cubicle-cat-club/server',
  version: '0.1.0',
};

/**
 * Print the Cubicle Club banner.
 */
function printBanner(port: number, adapter: string): void {
  const banner = `
╔═══════════════════════════════════════════╗
║                                           ║
║       🐱 CUBICLE CAT CLUB 🐱            ║
║                                           ║
║       Your AI agents as cats.            ║
║                                           ║
╚═══════════════════════════════════════════╝

Server started! 🚀

  Adapter:     ${adapter}
  URL:         http://localhost:${port}
  Health:      http://localhost:${port}/health

Press Ctrl+C to stop.
`;
  console.log(banner);
}

/**
 * Main CLI handler.
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('cubicle-cat-club')
    .description('Your AI agents as cats.')
    .version(packageJson.version)
    .option('--port <number>', 'Port to listen on (0 = random)', '5175')
    .option('--mock', 'Use mock adapter (simulated agents)', false)
    .option('--live', 'Use real Claude Code adapter (watches ~/.claude/projects/)', false)
    .option('--claude-path <path>', 'Custom path to Claude Code projects directory', undefined)
    .option('--no-open', 'Do not auto-open browser', false)
    .parse();

  const opts = program.opts();
  const port = parseInt(opts.port, 10);
  const shouldOpen = opts.open !== false;
  const claudePath = opts.claudePath || process.env.CLAUDE_PROJECTS;

  // Determine adapter: explicit flags win, otherwise auto-detect
  const useMock = opts.mock;
  const useLive = opts.live || !!claudePath;

  // Select adapter
  let adapter;
  if (useMock) {
    adapter = new MockAdapter();
    console.log('[Adapter] Using MockAdapter for demo mode\n');
  } else if (useLive || !useMock) {
    adapter = new ClaudeAdapter(claudePath);
    console.log('[Adapter] Using ClaudeAdapter (real Claude Code sessions)\n');
  } else {
    adapter = new MockAdapter();
    console.log('[Adapter] Using MockAdapter (default)\n');
  }

  try {
    // Start the adapter
    await adapter.start();

    // Start the server
    const { port: actualPort, broadcast } = await startServer(adapter, port);

    // Print banner
    printBanner(actualPort, adapter.displayName);

    // Auto-open browser if requested
    if (shouldOpen) {
      try {
        await open(`http://localhost:${actualPort}`);
      } catch (error) {
        console.log(
          `[Browser] Could not auto-open. Please visit http://localhost:${actualPort}\n`
        );
      }
    }
  } catch (error) {
    console.error('[Error] Failed to start server:', error);
    process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error('[Error]', error);
  process.exit(1);
});
