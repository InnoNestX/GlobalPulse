import type { ReportType } from "../../config";

export function dedupeSymbols(symbols: string[]): string[] {
  return Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)));
}

export function normalizeTicker(symbol: string, reportType: ReportType): string {
  const upper = symbol.trim().toUpperCase().replace(/\s+/g, "");
  if (!upper) return "";
  if (reportType === "crypto") return upper.replace(/USDT$/, "");
  if (reportType === "a_share") return normalizeAShareCode(upper) ?? upper;
  return upper.replace(/^US/, "").split(".")[0] ?? upper;
}

export function normalizeAShareCode(code: string): string | undefined {
  const cleaned = code.trim().toLowerCase();
  if (!cleaned) return undefined;
  if (cleaned.startsWith("sh") || cleaned.startsWith("sz")) return cleaned.toUpperCase();
  if (/^\d{6}$/.test(cleaned)) return (cleaned.startsWith("6") ? `sh${cleaned}` : `sz${cleaned}`).toUpperCase();
  return undefined;
}

export function toCryptoPair(symbol: string): string {
  const normalized = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) return "BTCUSDT";
  return normalized.endsWith("USDT") ? normalized : `${normalized}USDT`;
}

export function displayTicker(symbol: string, reportType: ReportType): string {
  if (reportType === "crypto") return normalizeTicker(symbol, reportType);
  if (reportType === "a_share") return normalizeAShareCode(symbol) ?? symbol.toUpperCase();
  return normalizeTicker(symbol, reportType);
}

