export function parseDecimalAmount(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const trimmed = String(raw).trim();
  if (trimmed === '') return undefined;
  const normalized = trimmed.replace(',', '.');
  const num = Number(normalized);
  if (!Number.isFinite(num)) return undefined;
  return Math.round(num * 100) / 100;
}
