import { describe, expect, it } from "vitest";
import { mergeSettingsTexts } from "../src/state-store";

describe("mergeSettingsTexts", () => {
  it("keeps durable provider secrets that incomplete KV is missing", () => {
    const kv = JSON.stringify({
      appName: "GlobalPulse",
      providerSettings: {
        telegramBotToken: "bot",
        telegramChatId: "1",
      },
      schedules: [{ id: "a" }],
    });
    const durable = JSON.stringify({
      appName: "XuXuClassMate GlobalPulse",
      providerSettings: {
        telegramBotToken: "old-bot",
        brevoApiKey: "brevo",
        emailFrom: "from@example.com",
        geminiApiKey: "gem",
      },
      schedules: [{ id: "a" }, { id: "b" }],
      emailRecipients: [{ id: "1", address: "a@b.c" }],
    });

    const merged = JSON.parse(mergeSettingsTexts(kv, durable) || "{}") as {
      appName: string;
      providerSettings: Record<string, string>;
      schedules: unknown[];
      emailRecipients: unknown[];
    };

    expect(merged.appName).toBe("XuXuClassMate GlobalPulse");
    expect(merged.providerSettings.telegramBotToken).toBe("bot");
    expect(merged.providerSettings.brevoApiKey).toBe("brevo");
    expect(merged.providerSettings.emailFrom).toBe("from@example.com");
    expect(merged.providerSettings.geminiApiKey).toBe("gem");
    expect(merged.schedules).toHaveLength(1);
    expect(merged.emailRecipients).toHaveLength(1);
  });
});
