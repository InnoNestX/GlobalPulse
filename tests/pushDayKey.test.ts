import { describe, expect, it } from "vitest";
import { fireDayKey, pushMark } from "../src/scheduling/pushDayKey";

function ms(iso: string): number {
  return Date.parse(iso);
}

describe("pushDayKey", () => {
  it("uses exchange-local day for CN pre-open", () => {
    // 2026-08-11 08:45 CST = 00:45 UTC
    const cnFire = ms("2026-08-11T00:45:00Z");
    expect(fireDayKey("CN", "pre_open", cnFire)).toBe("CN:2026-08-11");
  });

  it("includes slot for post_close and weekly", () => {
    const noon = ms("2026-08-11T04:00:00Z"); // 12:00 CST
    expect(fireDayKey("CN", "pre_open", noon)).toBe("CN:2026-08-11");
    expect(fireDayKey("CN", "post_close", noon)).toBe("CN:post_close:2026-08-11");
    expect(fireDayKey("CN", "weekly", noon)).toBe("CN:weekly:2026-08-11");
    expect(fireDayKey("CN", "intraday", noon)).toBe("CN:intraday:2026-08-11");
  });

  it("does not confuse US and CN local days near the UTC boundary", () => {
    // 20:00 UTC on 2026-08-11 is still 08-11 in NY (EDT), already 08-12 in CN.
    const late = ms("2026-08-11T20:00:00Z");
    expect(fireDayKey("US", "pre_open", ms("2026-08-11T13:00:00Z"))).toBe("US:2026-08-11");
    expect(fireDayKey("CN", "pre_open", late)).toBe("CN:2026-08-12");
  });

  it("follows US Eastern DST for local day", () => {
    // Winter: 14:00 UTC = 09:00 EST on 2026-12-15
    expect(fireDayKey("US", "pre_open", ms("2026-12-15T14:00:00Z"))).toBe("US:2026-12-15");
    // Summer: 13:00 UTC = 09:00 EDT
    expect(fireDayKey("US", "pre_open", ms("2026-08-11T13:00:00Z"))).toBe("US:2026-08-11");
  });

  it("derives pushMark without the date segment", () => {
    expect(pushMark("CN:2026-08-11")).toBe("CN");
    expect(pushMark("US:post_close:2026-08-11")).toBe("US:post_close");
    expect(pushMark("2026-08-11")).toBe("2026-08-11");
    expect(pushMark("")).toBeNull();
    expect(pushMark(":2026-08-11")).toBeNull();
  });
});
