export default function Logo({ size = 28 }: { size?: number }) {
  return (<span className="inline-flex items-center gap-2 font-bold tracking-wider text-xl">
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#101C2C" stroke="#72E6BB" strokeWidth="2" />
      <path d="M8 23 C 12 8, 20 24, 24 9" fill="none" stroke="#72E6BB" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 4.5" />
      <circle cx="8" cy="23" r="2.5" fill="#B8F5DC" /><circle cx="24" cy="9" r="2.5" fill="#72E6BB" />
    </svg>RYDORA</span>);
}
