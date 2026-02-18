interface MarketBarProps {
  symbol?: string;
  accountValue?: string;
  unrealizedPnl?: string;
  running?: boolean;
}

export function MarketBar({
  symbol = "—",
  accountValue = "0",
  unrealizedPnl = "0",
  running = false,
}: MarketBarProps) {
  const pnlNum = parseFloat(unrealizedPnl);
  const pnlPositive = pnlNum >= 0;

  return (
    <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/30 px-6 py-3">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-300">
            {symbol}-PERP
          </span>
          {running && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          )}
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div>
          <p className="text-xs text-zinc-500">ACCOUNT VALUE</p>
          <p className="font-mono text-sm font-medium tabular-nums">
            ${Number(accountValue).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">UNREALIZED PNL</p>
          <p
            className={`font-mono text-sm font-medium tabular-nums ${
              pnlPositive ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {pnlPositive ? "+" : ""}${pnlNum.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">STATUS</p>
          <p
            className={`text-sm font-medium ${
              running ? "text-emerald-500" : "text-zinc-500"
            }`}
          >
            {running ? "Running" : "Stopped"}
          </p>
        </div>
      </div>
    </div>
  );
}
