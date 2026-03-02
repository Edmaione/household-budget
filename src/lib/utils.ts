export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function getMonthLabel(monthKey: string): string {
  const date = new Date(monthKey + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function prevMonth(monthKey: string): string {
  const d = new Date(monthKey + "T00:00:00");
  d.setMonth(d.getMonth() - 1);
  return getMonthKey(d);
}

export function nextMonth(monthKey: string): string {
  const d = new Date(monthKey + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  return getMonthKey(d);
}

export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getShortMonthLabel(monthKey: string): string {
  const date = new Date(monthKey + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short" });
}
