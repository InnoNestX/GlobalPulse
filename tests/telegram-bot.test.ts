import { describe, expect, it } from "vitest";
import { buildCommandInlineKeyboard, extractCommand, isChatAllowed, TELEGRAM_COMMAND_MENU } from "../src/telegram/api";
import {
  heuristicIntent,
  matchHeuristicIntent,
  resolveOpenRouterModel,
  resolveOpenRouterModelCandidates,
} from "../src/telegram/openrouter";

describe("telegram bot helpers", () => {
  it("parses slash commands with bot mention", () => {
    expect(extractCommand("/help@GlobalPulseBot")).toEqual({ command: "help", args: "" });
    expect(extractCommand("/us 详情")).toEqual({ command: "us", args: "详情" });
    expect(extractCommand("／ashare")).toEqual({ command: "ashare", args: "" });
    expect(extractCommand("给我看美股")).toBeNull();
  });

  it("exposes menu commands and inline shortcuts", () => {
    expect(TELEGRAM_COMMAND_MENU.map((entry) => entry.command)).toEqual([
      "start", "help", "brief", "ashare", "us", "crypto", "hot", "status",
    ]);
    const keyboard = buildCommandInlineKeyboard();
    const callbacks = keyboard.inline_keyboard.flat().map((button) => button.callback_data);
    expect(callbacks).toContain("cmd:ashare");
    expect(callbacks).toContain("cmd:us");
    expect(callbacks).toContain("cmd:brief");
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

  it("marks vague phrases as low-confidence so AI can refine them", () => {
    expect(matchHeuristicIntent("给我看美股")).toMatchObject({ intent: "us", confidence: "high" });
    expect(matchHeuristicIntent("帮我看看盘")).toMatchObject({ intent: "brief", confidence: "low" });
    expect(matchHeuristicIntent("午饭吃什么")).toMatchObject({ intent: "unknown", confidence: "none" });
  });
});
