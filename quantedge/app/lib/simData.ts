export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export const genCandles = (
  seed: number,
  count = 120,
  start = 140
): Candle[] => {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: Candle[] = [];
  let price = start;
  const t0 = Date.now() - count * 60_000;
  for (let i = 0; i < count; i++) {
    const drift = (rnd() - 0.5) * 1.6;
    const o = price;
    const c = Math.max(1, price + drift);
    const h = Math.max(o, c) + rnd() * 0.9;
    const l = Math.min(o, c) - rnd() * 0.9;
    const v = Math.floor(50_000 + rnd() * 250_000);
    out.push({ t: t0 + i * 60_000, o, h, l, c, v });
    price = c;
  }
  return out;
};

export const sma = (c: Candle[], n: number): (number | null)[] => {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < c.length; i++) {
    sum += c[i].c;
    if (i >= n) sum -= c[i - n].c;
    out.push(i >= n - 1 ? sum / n : null);
  }
  return out;
};

export const rsi = (c: Candle[], n = 14): (number | null)[] => {
  const out: (number | null)[] = [null];
  let g = 0,
    l = 0;
  for (let i = 1; i < c.length; i++) {
    const d = c[i].c - c[i - 1].c;
    const gi = Math.max(d, 0);
    const li = Math.max(-d, 0);
    if (i <= n) {
      g += gi;
      l += li;
      if (i === n) {
        const rs = g / n / (l / n || 1e-9);
        out.push(100 - 100 / (1 + rs));
      } else out.push(null);
    } else {
      g = (g * (n - 1) + gi) / n;
      l = (l * (n - 1) + li) / n;
      const rs = g / (l || 1e-9);
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
};

export const macd = (c: Candle[]) => {
  const ema = (arr: number[], n: number) => {
    const k = 2 / (n + 1);
    const out: number[] = [];
    let prev = arr[0];
    for (let i = 0; i < arr.length; i++) {
      prev = i === 0 ? arr[0] : arr[i] * k + prev * (1 - k);
      out.push(prev);
    }
    return out;
  };
  const close = c.map((x) => x.c);
  const e12 = ema(close, 12);
  const e26 = ema(close, 26);
  const line = e12.map((v, i) => v - e26[i]);
  const signal = ema(line, 9);
  const hist = line.map((v, i) => v - signal[i]);
  return { line, signal, hist };
};
