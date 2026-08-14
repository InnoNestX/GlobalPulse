import { describe, expect, it } from "vitest";
import {
  ANCHOR_MAX,
  composeDigest,
  DIGEST_FOLD_NOTE,
} from "../src/providers/composeDigest";

describe("composeDigest", () => {
  it("keeps the full base when everything fits", () => {
    const base = "line1\nline2\ndisclaimer";
    const out = composeDigest(base, ["section"], ["09:00 update"]);
    expect(out).toContain("line1");
    expect(out).toContain("line2");
    expect(out).toContain("disclaimer");
    expect(out).toContain("section");
    expect(out).toContain("Today's updates");
    expect(out).toContain("<i>09:00 update</i>");
    expect(out).not.toContain(DIGEST_FOLD_NOTE);
  });

  it("folds base from the top and always keeps the footer", () => {
    const lines = Array.from({ length: 80 }, (_, i) => `base-line-${i} ${"x".repeat(40)}`);
    const footer = "Not investment advice.";
    const base = [...lines, footer].join("\n");
    const section = Array.from({ length: 20 }, (_, i) => `<b>Update ${i}</b> ${"y".repeat(60)}`);
    const out = composeDigest(base, section, ["11:30 CST · steady"]);

    expect([...out].length).toBeLessThanOrEqual(ANCHOR_MAX);
    expect(out).toContain(footer);
    expect(out).toContain(DIGEST_FOLD_NOTE);
    expect(out).toContain("11:30 CST · steady");
    // Newest section preserved; earliest base lines are what get dropped.
    expect(out).toContain("Update 19");
  });

  it("never splits an HTML tag across lines when folding", () => {
    const base = [
      "<b>Title</b>",
      "<i>Long body " + "z".repeat(200) + "</i>",
      "<code>AAPL</code>",
      "Disclaimer",
    ].join("\n");
    const section = Array.from({ length: 30 }, () => "<b>S</b> " + "w".repeat(100));
    const out = composeDigest(base, section, []);
    // Every remaining line that opens a tag still closes on the same line.
    for (const line of out.split("\n")) {
      const opens = (line.match(/<[a-z]+(?:\s|>)/gi) ?? []).length;
      const closes = (line.match(/<\/[a-z]+>/gi) ?? []).length;
      if (line.includes("<") && !line.startsWith(DIGEST_FOLD_NOTE)) {
        // Self-contained brief lines: open count equals close count when tags present.
        if (opens > 0) expect(opens).toBe(closes);
      }
    }
  });

  it("escapes timeline text for HTML", () => {
    const out = composeDigest("base\nfooter", [], ["A < B & C > D"]);
    expect(out).toContain("<i>A &lt; B &amp; C &gt; D</i>");
  });

  it("clips an oversized tail rather than exceeding the limit", () => {
    const section = Array.from({ length: 80 }, () => "x".repeat(100));
    const out = composeDigest("base\nfooter", section, []);
    expect([...out].length).toBeLessThanOrEqual(ANCHOR_MAX);
  });
});
