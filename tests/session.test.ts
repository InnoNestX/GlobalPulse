import { describe, expect, it } from "vitest";
import {
  builtinWindows,
  changeBasisLabel,
  emptyTradingWindows,
  exchangeLocalDay,
  exchangeOffsetMinutes,
  exchangeTzLabel,
  formatExchangeLocal,
  liveQuoteLagMinutes,
  quoteSessionLabel,
  sessionAt,
  sessionLabel,
  usEasternOffsetMinutes,
  windowNew,
  type TradingWindows,
} from "../src/research/sources/session";

function ms(iso: string): number {
  return Date.parse(iso);
}

describe("session windows", () => {
  it("drops zero-width windows", () => {
    expect(windowNew(1_000, 1_000)).toBeNull();
    expect(windowNew(1_000, 999)).toBeNull();
    expect(windowNew(1_000, 1_001)).not.toBeNull();
  });

  it("classifies CN-style windows as regular or closed only", () => {
    const open = ms("2026-08-10T01:30:00Z");
    const close = ms("2026-08-10T07:00:00Z");
    const w: TradingWindows = {
      pre: windowNew(open, open),
      regular: windowNew(open, close),
      post: windowNew(close, close),
    };
    expect(w.pre).toBeNull();
    expect(w.post).toBeNull();
    expect(sessionAt(w, open)).toBe("regular");
    expect(sessionAt(w, close - 1)).toBe("regular");
    expect(sessionAt(w, close)).toBe("closed");
  });

  it("classifies US pre / regular / post / closed", () => {
    const w: TradingWindows = {
      pre: windowNew(ms("2026-08-10T08:00:00Z"), ms("2026-08-10T13:30:00Z")),
      regular: windowNew(ms("2026-08-10T13:30:00Z"), ms("2026-08-10T20:00:00Z")),
      post: windowNew(ms("2026-08-10T20:00:00Z"), ms("2026-08-11T00:00:00Z")),
    };
    expect(sessionAt(w, ms("2026-08-10T07:59:00Z"))).toBe("closed");
    expect(sessionAt(w, ms("2026-08-10T11:25:00Z"))).toBe("pre");
    expect(sessionAt(w, ms("2026-08-10T15:00:00Z"))).toBe("regular");
    expect(sessionAt(w, ms("2026-08-10T21:00:00Z"))).toBe("post");
    expect(sessionAt(w, ms("2026-08-11T00:00:00Z"))).toBe("closed");
  });

  it("follows US DST federal boundaries", () => {
    expect(usEasternOffsetMinutes(ms("2026-01-15T12:00:00Z"))).toBe(-300);
    expect(usEasternOffsetMinutes(ms("2026-03-08T06:59:00Z"))).toBe(-300);
    expect(usEasternOffsetMinutes(ms("2026-03-08T07:00:00Z"))).toBe(-240);
    expect(usEasternOffsetMinutes(ms("2026-08-10T11:25:00Z"))).toBe(-240);
    expect(usEasternOffsetMinutes(ms("2026-11-01T05:59:00Z"))).toBe(-240);
    expect(usEasternOffsetMinutes(ms("2026-11-01T06:00:00Z"))).toBe(-300);
  });

  it("uses fixed offsets for CN/HK", () => {
    expect(exchangeOffsetMinutes("CN", ms("2026-08-10T12:00:00Z"))).toBe(480);
    expect(exchangeOffsetMinutes("HK", ms("2026-01-15T12:00:00Z"))).toBe(480);
    expect(exchangeTzLabel("US", ms("2026-08-10T00:00:00Z"))).toBe("EDT");
    expect(exchangeTzLabel("US", ms("2026-01-10T00:00:00Z"))).toBe("EST");
  });

  it("builds builtin US windows for a weekday pre-market instant", () => {
    const now = ms("2026-08-10T11:25:00Z");
    const w = builtinWindows("US", now);
    expect(sessionAt(w, now)).toBe("pre");
    expect(sessionAt(w, ms("2026-08-10T14:00:00Z"))).toBe("regular");
    expect(sessionAt(w, ms("2026-08-10T22:00:00Z"))).toBe("post");
  });

  it("returns empty builtin windows on weekends", () => {
    expect(builtinWindows("US", ms("2026-08-08T14:00:00Z"))).toEqual(emptyTradingWindows());
    expect(builtinWindows("US", ms("2026-08-09T14:00:00Z"))).toEqual(emptyTradingWindows());
  });

  it("exposes only real Asian sessions", () => {
    const now = ms("2026-08-10T04:00:00Z");
    const hk = builtinWindows("HK", now);
    expect(hk.pre).not.toBeNull();
    expect(hk.post).toBeNull();
    expect(sessionAt(hk, now)).toBe("regular");

    const cn = builtinWindows("CN", now);
    expect(cn.pre).toBeNull();
    expect(cn.post).toBeNull();
    expect(sessionAt(cn, ms("2026-08-10T07:30:00Z"))).toBe("closed");
  });

  it("uses English session and basis labels", () => {
    expect(quoteSessionLabel("pre")).toBe("Pre-market");
    expect(quoteSessionLabel("regular")).toBe("Regular");
    expect(quoteSessionLabel("post")).toBe("After-hours");
    expect(quoteSessionLabel("closed")).toBe("Closed");
    expect(changeBasisLabel("previousClose")).toBe("Previous close");
    expect(changeBasisLabel("regularClose")).toBe("Regular close");

    const now = ms("2026-08-10T11:25:00Z");
    const fridayClose = ms("2026-08-07T20:00:00Z");
    expect(sessionLabel("closed", fridayClose, now, -240)).toBe("Closed (previous session)");
    expect(sessionLabel("pre", now, now, -240)).toBe("Pre-market");
  });

  it("renders exchange-local clocks and day boundaries", () => {
    expect(formatExchangeLocal(ms("2026-08-07T20:00:00Z"), -240, "EDT")).toBe("08-07 16:00 EDT");
    expect(exchangeLocalDay(ms("2026-08-10T20:30:00Z"), 480)).toBe("2026-08-11");
    expect(exchangeLocalDay(ms("2026-08-10T20:30:00Z"), -240)).toBe("2026-08-10");
  });

  it("reports live lag only for open sessions", () => {
    const now = ms("2026-08-10T11:25:00Z");
    const stale = now - 40 * 60_000;
    expect(liveQuoteLagMinutes("pre", now - 60_000, now)).toBeNull();
    expect(liveQuoteLagMinutes("pre", stale, now)).toBe(40);
    expect(liveQuoteLagMinutes("closed", stale, now)).toBeNull();
  });
});
