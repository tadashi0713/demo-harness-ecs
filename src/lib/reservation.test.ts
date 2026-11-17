import { describe, expect, it } from "vitest";
import { dayRange, formatDate, formatTime, overlaps, toDateTime, validateReservation } from "./reservation";

const at = (time: string, date = "2026-11-17") => toDateTime(date, time);
const range = (start: string, end: string) => ({ startAt: at(start), endAt: at(end) });

describe("overlaps", () => {
  it("detects partial overlap", () => {
    expect(overlaps(range("10:00", "11:00"), range("10:30", "11:30"))).toBe(true);
  });

  it("detects containment", () => {
    expect(overlaps(range("10:00", "12:00"), range("10:30", "11:00"))).toBe(true);
  });

  it("treats adjacent ranges as non-overlapping", () => {
    expect(overlaps(range("10:00", "11:00"), range("11:00", "12:00"))).toBe(false);
    expect(overlaps(range("11:00", "12:00"), range("10:00", "11:00"))).toBe(false);
  });
});

describe("validateReservation", () => {
  const existing = [range("10:00", "11:00")];

  it("accepts a valid reservation", () => {
    expect(validateReservation(range("11:00", "12:00"), existing)).toBeNull();
  });

  it("accepts the full business day", () => {
    expect(validateReservation(range("09:00", "18:00"), [])).toBeNull();
  });

  it("rejects overlapping reservations", () => {
    expect(validateReservation(range("10:30", "11:30"), existing)).toBe("OVERLAP");
  });

  it("rejects end before or equal to start", () => {
    expect(validateReservation(range("12:00", "11:00"), [])).toBe("INVALID_RANGE");
    expect(validateReservation(range("12:00", "12:00"), [])).toBe("INVALID_RANGE");
  });

  it("rejects times outside business hours", () => {
    expect(validateReservation(range("08:45", "09:30"), [])).toBe("OUTSIDE_BUSINESS_HOURS");
    expect(validateReservation(range("17:30", "18:15"), [])).toBe("OUTSIDE_BUSINESS_HOURS");
  });

  it("rejects reservations spanning multiple days", () => {
    const input = { startAt: at("10:00", "2026-11-17"), endAt: at("10:00", "2026-11-18") };
    expect(validateReservation(input, [])).toBe("OUTSIDE_BUSINESS_HOURS");
  });

  it("rejects times not aligned to 15 minutes", () => {
    expect(validateReservation(range("10:10", "11:00"), [])).toBe("NOT_ALIGNED");
    expect(validateReservation(range("11:00", "11:20"), [])).toBe("NOT_ALIGNED");
  });
});

describe("date helpers", () => {
  it("dayRange covers exactly one local day", () => {
    const { startAt, endAt } = dayRange("2026-11-17");
    expect(formatDate(startAt)).toBe("2026-11-17");
    expect(formatDate(endAt)).toBe("2026-11-18");
    expect(formatTime(startAt)).toBe("00:00");
  });

  it("toDateTime and formatTime round-trip", () => {
    expect(formatTime(at("09:45"))).toBe("09:45");
  });
});
