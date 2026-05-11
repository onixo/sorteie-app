export function HexBackground() {
  return (
    <div className="fixed inset-0 opacity-5 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex-bg-pattern" x="0" y="0" width="50" height="43.4" patternUnits="userSpaceOnUse">
            <path d="M25 0L50 14.43V28.86L25 43.3L0 28.86V14.43L25 0z" fill="none" stroke="#1E8FD5" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-bg-pattern)" />
      </svg>
    </div>
  );
}
