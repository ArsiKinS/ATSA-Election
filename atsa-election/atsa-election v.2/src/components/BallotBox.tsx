// One vote = one paper slip dropping into the box. Decorative: no numbers, no percentages.
export default function BallotBox({ mode = 'loop' }: { mode?: 'loop' | 'once' | 'none' }) {
  const slip = (delay: string, k: string) => (
    <g key={k} clipPath="url(#slot-clip)"><g className={`slip ${mode}`} style={{ animationDelay: delay }}>
      <rect x="165" y="14" width="70" height="46" rx="4" fill="#fff" stroke="#283040" strokeWidth="4" />
      <path d="M177 30h46M177 40h46M177 50h28" stroke="#9aa3b5" strokeWidth="4" strokeLinecap="round" />
    </g></g>);
  return (
    <svg className="box" viewBox="0 0 400 340" role="img" aria-label="Ballot box">
      <defs><clipPath id="slot-clip"><rect x="0" y="0" width="400" height="92" /></clipPath></defs>
      <ellipse cx="200" cy="330" rx="170" ry="9" fill="rgba(40,48,64,.12)" />
      <rect x="10" y="118" width="380" height="205" rx="14" fill="#fff" stroke="#283040" strokeWidth="12" />
      <path d="M10 118 L70 62 H330 L390 118 Z" fill="#fff" stroke="#283040" strokeWidth="12" strokeLinejoin="round" />
      <rect x="125" y="80" width="150" height="16" rx="8" fill="#283040" />
      <image href="/api/logo" x="160" y="132" width="80" height="80" preserveAspectRatio="xMidYMid meet" />
      <text x="200" y="285" textAnchor="middle" fontSize="76" fontWeight="800" style={{ fill: 'var(--red)' }} fontFamily="system-ui,sans-serif">VOTE</text>
      {mode !== 'none' && slip('0s', 'a')}{mode === 'loop' && slip('1.8s', 'b')}
    </svg>
  );
}
