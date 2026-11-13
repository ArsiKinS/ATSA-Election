'use client';
// Dropdowns instead of a calendar popup: identical on iPhone, Android and desktop, and always in Malaysia time (MYT, UTC+8).
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], p2 = (n: number) => String(n).padStart(2, '0');
const rg = (a: number, b: number, s = 1) => Array.from({ length: Math.floor((b - a) / s) + 1 }, (_, i) => a + i * s);
function parts(iso: string) {
  const o = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(iso)).map(x => [x.type, x.value]));
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, i: Math.floor(+o.minute / 5) * 5 };
}
type P = ReturnType<typeof parts>;
export default function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  const v = parts(value), dim = new Date(Date.UTC(v.y, v.m, 0)).getUTCDate();
  const set = (k: keyof P, x: number) => { const n = { ...v, [k]: x }; n.d = Math.min(n.d, new Date(Date.UTC(n.y, n.m, 0)).getUTCDate()); onChange(`${n.y}-${p2(n.m)}-${p2(n.d)}T${p2(n.h)}:${p2(n.i)}:00+08:00`); };
  const S = (k: keyof P, opts: number[], l?: (n: number) => string) => <select aria-label={`${label} ${k}`} value={v[k]} onChange={e => set(k, +e.target.value)}>{opts.map(o => <option key={o} value={o}>{l ? l(o) : o}</option>)}</select>;
  return <div className="dt"><b>{label}</b><div className="row">{S('d', rg(1, dim))}{S('m', rg(1, 12), n => MO[n - 1])}{S('y', rg(2026, 2030))}{S('h', rg(0, 23), p2)}<span>:</span>{S('i', rg(0, 55, 5), p2)}</div></div>;
}
