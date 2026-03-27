import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";

dayjs.extend(duration);

export function computeWorkedHours(clockIn, clockOut, breakStart, breakEnd) {
  if (!clockIn || !clockOut) return 0;

  const inTs = dayjs(clockIn);
  const outTs = dayjs(clockOut);
  let totalMinutes = Math.max(0, outTs.diff(inTs, "minute"));

  if (breakStart && breakEnd) {
    const breakMinutes = Math.max(0, dayjs(breakEnd).diff(dayjs(breakStart), "minute"));
    totalMinutes = Math.max(0, totalMinutes - breakMinutes);
  }

  return Number((totalMinutes / 60).toFixed(2));
}

export function toDateRange(startDate, endDate) {
  const start = dayjs(startDate).startOf("day").toDate();
  const end = dayjs(endDate).endOf("day").toDate();
  return { start, end };
}
