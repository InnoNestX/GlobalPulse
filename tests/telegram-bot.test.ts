import { describe, expect, it } from "vitest";
import { extractCommand, isChatAllowed } from "../src/telegram/api";
import { resolveOpenRouterModel } from "../src/telegram/openrouter";

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

  it("defaults openrouter free model", () => {
    expect(resolveOpenRouterModel()).toBe("openrouter/free");
    expect(resolveOpenRouterModel(" meta-llama/llama-3.3-70b-instruct:free ")).toBe("meta-llama/llama-3.3-70b-instruct:free");
  });
});
