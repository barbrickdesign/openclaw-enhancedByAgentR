import type { OpenClawConfig } from "./types.js";

export const DEFAULT_AGENT_MAX_CONCURRENT = 4;
export const DEFAULT_SUBAGENT_MAX_CONCURRENT = 8;

/** Parse a positive number from an environment variable, floor it to integer, returning undefined if invalid. */
function parseEnvInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : undefined;
}

export function resolveAgentMaxConcurrent(cfg?: OpenClawConfig): number {
  const raw = cfg?.agents?.defaults?.maxConcurrent;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(1, Math.floor(raw));
  }
  // Allow VM operators to tune concurrency without changing the config file.
  const fromEnv = parseEnvInt(process.env.OPENCLAW_AGENT_MAX_CONCURRENT);
  if (fromEnv !== undefined) {
    return fromEnv;
  }
  return DEFAULT_AGENT_MAX_CONCURRENT;
}

export function resolveSubagentMaxConcurrent(cfg?: OpenClawConfig): number {
  const raw = cfg?.agents?.defaults?.subagents?.maxConcurrent;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(1, Math.floor(raw));
  }
  // Allow VM operators to tune concurrency without changing the config file.
  const fromEnv = parseEnvInt(process.env.OPENCLAW_SUBAGENT_MAX_CONCURRENT);
  if (fromEnv !== undefined) {
    return fromEnv;
  }
  return DEFAULT_SUBAGENT_MAX_CONCURRENT;
}
