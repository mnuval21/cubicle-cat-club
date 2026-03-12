/**
 * Server-side internal types (not exported to client)
 */

import type { AgentEvent, Room, AgentInfo } from '@cubicle-cat-club/shared';

export interface ServerOptions {
  port: number;
  mock?: boolean;
  replay?: string;
  speed?: number;
  noOpen?: boolean;
}

export interface SessionFile {
  path: string;
  projectDir: string;
  projectName: string;
  lastModified: number;
  isSubagent?: boolean;
  parentSessionId?: string;  // session UUID of the parent, derived from path
}
