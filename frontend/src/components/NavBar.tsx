interface NavBarProps {
  running: boolean;
  onStartStop: () => void;
  startStopLoading: boolean;
  canStart: boolean;
}

export function NavBar({
  running,
  onStartStop,
  startStopLoading,
  canStart,
}: NavBarProps) {
  return (
    <nav className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
      <div className="flex items-center gap-8">
        <span className="text-lg font-semibold tracking-tight">KARNOT</span>
        <span className="border-b-2 border-emerald-500 pb-0.5 text-sm font-medium text-zinc-300">
          {"</>"} GRID BOT
        </span>
      </div>
      <div className="flex items-center gap-4">
        <a
          href="https://app.hyperliquid.xyz/API"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-400 hover:text-emerald-500 hover:underline"
        >
          API Wallet Setup
        </a>
        <button
          onClick={onStartStop}
          disabled={startStopLoading || (!running && !canStart)}
          className={`rounded px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
            running
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-white text-zinc-900 hover:bg-zinc-100"
          }`}
        >
          {startStopLoading
            ? running
              ? "Stopping..."
              : "Starting..."
            : running
              ? "STOP BOT"
              : "START BOT"}
        </button>
      </div>
    </nav>
  );
}
