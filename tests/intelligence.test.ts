import { describe, expect, it } from "vitest";
import { coerceProviderName, providerNames } from "../src/messages";
import { createDefaultAutopilotSettings } from "../src/autopilot";
import { normalizeSettings } from "../src/config";
import { handleRequest } from "../src/http";

describe("intelligence modules wiring", () => {
  it("registers discord and slack providers", () => {
    expect(providerNames).toContain("discord");
    expect(providerNames).toContain("slack");
    expect(coerceProviderName("discord")).toBe("discord");
    expect(coerceProviderName("slack")).toBe("slack");
  });

  it("normalizes autopilot defaults into settings", () => {
    const settings = normalizeSettings({});
    expect(settings.autopilot.enabled).toBe(true);
    expect(settings.autopilot.rules.length).toBeGreaterThanOrEqual(3);
    expect(createDefaultAutopilotSettings().rules[0]?.kind).toBe("symbol_move");
  });

  it("defaults continuityEnabled for market schedules", () => {
    const settings = normalizeSettings({
      schedules: [{
        id: "m1",
        name: "Market",
        reportMode: "market",
        reportType: "us_stock",
        targets: ["telegram"],
      }],
    });
    expect(settings.schedules[0]?.continuityEnabled).toBe(true);
  });

  it("serves continuity and autopilot panels", async () => {
    const response = await handleRequest(new Request("https://worker.example/admin"), {});
    const html = await response.text();
    expect(html).toContain("section-intelligence");
    expect(html).toContain("Pulse Continuity");
    expect(html).toContain("Autopilot Radar");
    expect(html).toContain("/api/admin/autopilot");
    expect(html).toContain("discord");
  });
});
