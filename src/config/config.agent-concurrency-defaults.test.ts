import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_AGENT_MAX_CONCURRENT,
  DEFAULT_SUBAGENT_MAX_CONCURRENT,
  resolveAgentMaxConcurrent,
  resolveSubagentMaxConcurrent,
} from "./agent-limits.js";
import { loadConfig } from "./config.js";
import { withTempHome } from "./test-helpers.js";
import { OpenClawSchema } from "./zod-schema.js";

describe("agent concurrency defaults", () => {
  it("resolves defaults when unset", () => {
    expect(resolveAgentMaxConcurrent({})).toBe(DEFAULT_AGENT_MAX_CONCURRENT);
    expect(resolveSubagentMaxConcurrent({})).toBe(DEFAULT_SUBAGENT_MAX_CONCURRENT);
  });

  it("clamps invalid values to at least 1", () => {
    const cfg = {
      agents: {
        defaults: {
          maxConcurrent: 0,
          subagents: { maxConcurrent: -3 },
        },
      },
    };
    expect(resolveAgentMaxConcurrent(cfg)).toBe(1);
    expect(resolveSubagentMaxConcurrent(cfg)).toBe(1);
  });

  it("accepts subagent spawn depth and per-agent child limits", () => {
    const parsed = OpenClawSchema.parse({
      agents: {
        defaults: {
          subagents: {
            maxSpawnDepth: 2,
            maxChildrenPerAgent: 7,
          },
        },
      },
    });

    expect(parsed.agents?.defaults?.subagents?.maxSpawnDepth).toBe(2);
    expect(parsed.agents?.defaults?.subagents?.maxChildrenPerAgent).toBe(7);
  });

  it("injects defaults on load", async () => {
    await withTempHome(async (home) => {
      const configDir = path.join(home, ".openclaw");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "openclaw.json"),
        JSON.stringify({}, null, 2),
        "utf-8",
      );

      const cfg = loadConfig();

      expect(cfg.agents?.defaults?.maxConcurrent).toBe(DEFAULT_AGENT_MAX_CONCURRENT);
      expect(cfg.agents?.defaults?.subagents?.maxConcurrent).toBe(DEFAULT_SUBAGENT_MAX_CONCURRENT);
    });
  });

  describe("env-var overrides (OPENCLAW_AGENT_MAX_CONCURRENT / OPENCLAW_SUBAGENT_MAX_CONCURRENT)", () => {
    let savedAgent: string | undefined;
    let savedSubagent: string | undefined;

    beforeEach(() => {
      savedAgent = process.env.OPENCLAW_AGENT_MAX_CONCURRENT;
      savedSubagent = process.env.OPENCLAW_SUBAGENT_MAX_CONCURRENT;
    });

    afterEach(() => {
      if (savedAgent === undefined) {
        delete process.env.OPENCLAW_AGENT_MAX_CONCURRENT;
      } else {
        process.env.OPENCLAW_AGENT_MAX_CONCURRENT = savedAgent;
      }
      if (savedSubagent === undefined) {
        delete process.env.OPENCLAW_SUBAGENT_MAX_CONCURRENT;
      } else {
        process.env.OPENCLAW_SUBAGENT_MAX_CONCURRENT = savedSubagent;
      }
    });

    it("uses env var when config is not set", () => {
      process.env.OPENCLAW_AGENT_MAX_CONCURRENT = "2";
      process.env.OPENCLAW_SUBAGENT_MAX_CONCURRENT = "4";
      expect(resolveAgentMaxConcurrent({})).toBe(2);
      expect(resolveSubagentMaxConcurrent({})).toBe(4);
    });

    it("config value takes precedence over env var", () => {
      process.env.OPENCLAW_AGENT_MAX_CONCURRENT = "2";
      process.env.OPENCLAW_SUBAGENT_MAX_CONCURRENT = "4";
      const cfg = {
        agents: {
          defaults: {
            maxConcurrent: 6,
            subagents: { maxConcurrent: 10 },
          },
        },
      };
      expect(resolveAgentMaxConcurrent(cfg)).toBe(6);
      expect(resolveSubagentMaxConcurrent(cfg)).toBe(10);
    });

    it("ignores invalid env var values and falls back to defaults", () => {
      process.env.OPENCLAW_AGENT_MAX_CONCURRENT = "0";
      process.env.OPENCLAW_SUBAGENT_MAX_CONCURRENT = "not-a-number";
      expect(resolveAgentMaxConcurrent({})).toBe(DEFAULT_AGENT_MAX_CONCURRENT);
      expect(resolveSubagentMaxConcurrent({})).toBe(DEFAULT_SUBAGENT_MAX_CONCURRENT);
    });

    it("floors fractional env var values", () => {
      process.env.OPENCLAW_AGENT_MAX_CONCURRENT = "3.9";
      expect(resolveAgentMaxConcurrent({})).toBe(3);
    });
  });
});
