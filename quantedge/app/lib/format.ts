export const fmtNum = (n: number, d = 2) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

export const fmtPct = (n: number, d = 2) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`;

export const fmtInt = (n: number) => n.toLocaleString("en-US");

export const fmtClock = (d = new Date()) =>
  d
    .toISOString()
    .slice(11, 19);

export const utcDate = (d = new Date()) => d.toISOString().slice(0, 10);
