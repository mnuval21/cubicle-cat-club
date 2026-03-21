/**
 * File watcher utility for discovering and monitoring Claude Code sessions.
 * Uses chokidar for reliable file watching across platforms.
 */

import { watch } from 'chokidar';
import { readdir, stat } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { SCAN_WINDOW_MS } from '@cubicle-cat-club/shared';
import type { SessionFile } from './types.js';

/**
 * Derive a clean project name from a Claude Code hashed directory name.
 *
 * Claude Code stores projects at ~/.claude/projects/<hashed-path>
 * where <hashed-path> is the absolute path with slashes replaced by dashes:
 *   -Users-melissanuval-cubicle-club  →  cubicle-club
 *   -Users-bob-Desktop-my-app         →  my-app
 *
 * We take the last segment of the original path.
 */
function deriveProjectName(dirName: string): string {
  // The directory name is a path with / replaced by -
  // But project names themselves can contain dashes, so we can't just split on -
  // Heuristic: look for common path prefixes and strip them
  const cleaned = dirName
    .replace(/^-/, '')  // Remove leading dash
    .replace(/^Users-[^-]+-/, '')  // Strip /Users/<username>/
    .replace(/^home-[^-]+-/, '')   // Strip /home/<username>/
    .replace(/^sessions-[^-]+-/, '') // Strip /sessions/<id>/
    .replace(/^Desktop-/, '')       // Strip Desktop/
    .replace(/^Documents-/, '')     // Strip Documents/
    .replace(/^Projects-/, '')      // Strip Projects/
    .replace(/^repos-/, '')         // Strip repos/
    .replace(/^src-/, '');          // Strip src/

  return cleaned || dirName;
}

/**
 * Recursively scan a directory for JSONL files modified within the scan window.
 */
export async function scanForSessions(
  basePath: string
): Promise<SessionFile[]> {
  const sessions: SessionFile[] = [];
  const now = Date.now();
  const windowMs = SCAN_WINDOW_MS;

  async function walkDir(dir: string, depth = 0): Promise<void> {
    // Prevent infinite recursion
    if (depth > 10) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip hidden directories and node_modules
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'venv'
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await walkDir(fullPath, depth + 1);
        } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
          try {
            const stats = await stat(fullPath);
            const age = now - stats.mtimeMs;

            if (age < windowMs) {
              const meta = resolveSessionMeta(fullPath);
              sessions.push({
                path: fullPath,
                projectDir: meta.projectDir,
                projectName: meta.projectName,
                lastModified: stats.mtimeMs,
                isSubagent: meta.isSubagent,
                parentSessionId: meta.parentSessionId,
              });
            }
          } catch {
            // Ignore stat errors
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  try {
    await walkDir(basePath);
  } catch {
    // Silently handle if basePath doesn't exist
  }

  return sessions;
}

/**
 * Resolve the real project directory and sub-agent info from a JSONL file path.
 *
 * Sub-agent files land at:
 *   <project-hash>/<parent-session-id>/subagents/agent-<id>.jsonl
 *
 * Regular sessions land at:
 *   <project-hash>/<session-id>.jsonl
 */
function resolveSessionMeta(
  filePath: string
): { projectDir: string; projectName: string; isSubagent: boolean; parentSessionId?: string } {
  const parts = filePath.split('/');
  const subagentsIdx = parts.lastIndexOf('subagents');

  if (subagentsIdx !== -1) {
    // Sub-agent: walk up past <parent-session-id>/subagents/ to the project dir
    const projectDir = parts.slice(0, subagentsIdx - 1).join('/');
    const parentSessionId = parts[subagentsIdx - 1]; // directory before subagents/
    const projectName = deriveProjectName(basename(projectDir));
    return { projectDir, projectName, isSubagent: true, parentSessionId };
  }

  const projectDir = dirname(filePath);
  return { projectDir, projectName: deriveProjectName(basename(projectDir)), isSubagent: false };
}

/**
 * Watch a directory for new JSONL files and call callback when found.
 */
export function watchForNewSessions(
  basePath: string,
  callback: (session: SessionFile) => void
): ReturnType<typeof watch> {
  const watcher = watch(basePath, {
    persistent: true,
    ignoreInitial: true,
    // Only ignore node_modules and venv — NOT dot-dirs, since basePath
    // is inside ~/.claude/ and chokidar tests the full absolute path.
    ignored: /node_modules|venv/,
  });

  watcher.on('add', async (filePath: string) => {
    if (filePath.endsWith('.jsonl')) {
      try {
        const stats = await stat(filePath);
        const meta = resolveSessionMeta(filePath);

        callback({
          path: filePath,
          projectDir: meta.projectDir,
          projectName: meta.projectName,
          lastModified: stats.mtimeMs,
          isSubagent: meta.isSubagent,
          parentSessionId: meta.parentSessionId,
        });
      } catch {
        // Ignore errors
      }
    }
  });

  return watcher;
}
