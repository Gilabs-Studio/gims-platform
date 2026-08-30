export function formatGxpTimestamp(isoString?: string, locale: string = "en"): { date: string; timeWithMs: string } {
  if (!isoString) return { date: "-", timeWithMs: "-" };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: isoString, timeWithMs: "" };

    const date = d.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    return {
      date,
      timeWithMs: `${hours}:${minutes}:${seconds}`,
    };
  } catch {
    return { date: isoString, timeWithMs: "" };
  }
}
