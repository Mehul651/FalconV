export function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3efe6]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 18% 22%, rgba(176, 141, 87, 0.12), transparent 32%), radial-gradient(circle at 88% 78%, rgba(176, 141, 87, 0.1), transparent 36%)',
        }}
      />
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        fill="none"
      >
        <path
          d="M-80 210C180 40 420 80 620 220C860 390 1080 430 1520 240"
          stroke="#c4a574"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
        <path
          d="M-40 720C260 560 540 620 760 740C980 850 1220 820 1500 640"
          stroke="#c4a574"
          strokeOpacity="0.28"
          strokeWidth="1.2"
        />
        <circle cx="180" cy="160" r="4" fill="#c4a574" fillOpacity="0.45" />
        <circle cx="1280" cy="730" r="4" fill="#c4a574" fillOpacity="0.4" />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/falconv-logo.png"
        alt=""
        className="pointer-events-none absolute top-1/2 left-[58%] w-[92vw] max-w-5xl -translate-x-1/2 -translate-y-[46%] opacity-[0.12] select-none"
      />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/falconv-logo.png"
          alt="FalconV"
          className="mb-5 h-28 w-auto object-contain"
        />
        {children}
      </div>
    </div>
  );
}
