export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 18;
export const SLOT_MINUTES = 15;

export type TimeRange = { startAt: Date; endAt: Date };

export type ValidationError =
  | "INVALID_RANGE"
  | "OUTSIDE_BUSINESS_HOURS"
  | "NOT_ALIGNED"
  | "OVERLAP";

export const errorMessages: Record<ValidationError, string> = {
  INVALID_RANGE: "終了時刻は開始時刻より後にしてください",
  OUTSIDE_BUSINESS_HOURS: `予約は ${OPEN_HOUR}:00〜${CLOSE_HOUR}:00 の同日内で指定してください`,
  NOT_ALIGNED: `時刻は ${SLOT_MINUTES} 分単位で指定してください`,
  OVERLAP: "指定した時間帯は既に予約されています",
};

/** Half-open interval check: [start, end). Adjacent ranges do not overlap. */
export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function validateReservation(input: TimeRange, existing: TimeRange[]): ValidationError | null {
  const { startAt, endAt } = input;

  if (!(startAt < endAt)) return "INVALID_RANGE";

  const isAligned = (d: Date) => d.getMinutes() % SLOT_MINUTES === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;
  if (!isAligned(startAt) || !isAligned(endAt)) return "NOT_ALIGNED";

  if (
    !sameDay(startAt, endAt) ||
    minutesOfDay(startAt) < OPEN_HOUR * 60 ||
    minutesOfDay(endAt) > CLOSE_HOUR * 60
  ) {
    return "OUTSIDE_BUSINESS_HOURS";
  }

  if (existing.some((r) => overlaps(input, r))) return "OVERLAP";

  return null;
}

/** Returns [start, end) of the local calendar day for a YYYY-MM-DD string. */
export function dayRange(date: string): TimeRange {
  const [y, m, d] = date.split("-").map(Number);
  return { startAt: new Date(y, m - 1, d), endAt: new Date(y, m - 1, d + 1) };
}

/** Builds a local Date from YYYY-MM-DD and HH:mm. */
export function toDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
