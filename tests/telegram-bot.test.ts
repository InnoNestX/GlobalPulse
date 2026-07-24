import { describe, expect, it } from "vitest";
import { extractCommand, isChatAllowed } from "../src/telegram/api";
import {
  heuristicIntent,
  resolveOpenRouterModel,
  resolveOpenRouterModelCandidates,
} from "../src/telegram/openrouter";

describe("telegram bot helpers", () => {
  it("parses slash commands with bot mention", () => {
    expect(extractCommand("/help@GlobalPulseBot")).toEqual({ command: "help", args: "" });
    expect(extractCommand("/us 详情")).toEqual({ command: "us", args: "详情" });
    expect(extractCommand("给我看美股")).toBeNull();
  });

  it("allows configured chat ids", () => {
    const env = { TELEGRAM_CHAT_ID: "-100123,456" } as const;
    expect(isChatAllowed(env as never, -100123)).toBe(true);
    expect(isChatAllowed(env as never, 456)).toBe(true);
    expect(isChatAllowed(env as never, 999)).toBe(false);
  });

  it("defaults openrouter free model and builds failover list", () => {
    expect(resolveOpenRouterModel()).toBe("openrouter/free");
    const candidates = resolveOpenRouterModelCandidates(undefined, [
      "google/gemma-4-31b-it:free",
      "nvidia/nemotron-nano-12b-v2-vl:free",
      "google/lyria-3-pro-preview",
    ]);
    expect(candidates[0]).toBe("openrouter/free");
    expect(candidates).toContain("google/gemma-4-31b-it:free");
    expect(candidates.some((model) => model.includes("lyria"))).toBe(false);
    expect(candidates.some((model) => model.includes("-vl"))).toBe(false);
  });

  it("understands Chinese natural-language market asks", () => {
    expect(heuristicIntent("给我看美股")).toBe("us");
    expect(heuristicIntent("A股怎么样")).toBe("ashare");
    expect(heuristicIntent("加密行情如何")).toBe("crypto");
    expect(heuristicIntent("今天有什么热点")).toBe("hot");
    expect(heuristicIntent("发一份简报")).toBe("brief");
    expect(heuristicIntent("下次什么时候推送")).toBe("status");
  });
});
