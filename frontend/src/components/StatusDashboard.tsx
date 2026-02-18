import { useEffect, useState } from "react";
import { type BotStatus } from "../api";

interface StatusDashboardProps {
  running: boolean;
  status?: BotStatus;
}

type Tab = "positions" | "orders";

export function StatusDashboard({
  running,
  status,
}: StatusDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("positions");

  useEffect(() => {
    if (!running) {
      setActiveTab("positions");
      return;
    }
  }, [running]);

  const displayStatus = status ?? {
    running: false,
    orders: [],
    positions: [],
    pnl: { accountValue: "0", totalRawUsd: "0", unrealizedPnl: "0" },
    config: undefined,
    error: undefined,
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50">
        <div className="flex border-b border-zinc-700/50">
          <button
            onClick={() => setActiveTab("positions")}
            className={`px-6 py-4 text-sm font-medium transition ${
              activeTab === "positions"
                ? "border-b-2 border-emerald-500 text-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            POSITIONS
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-6 py-4 text-sm font-medium transition ${
              activeTab === "orders"
                ? "border-b-2 border-emerald-500 text-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            OPEN ORDERS
          </button>
        </div>

        <div className="min-h-[200px] p-6">
          {!running && !status ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-zinc-500">
                Bot is stopped. Configure and start the bot to see live status.
              </p>
              <a
                href="https://app.hyperliquid-testnet.xyz/API"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-sm text-emerald-500 hover:underline"
              >
                Create API wallet →
              </a>
            </div>
          ) : activeTab === "positions" ? (
            displayStatus.positions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700 text-left text-xs text-zinc-500">
                      <th className="pb-3 pr-4 font-medium">COIN</th>
                      <th className="pb-3 pr-4 font-medium">SIZE</th>
                      <th className="pb-3 pr-4 font-medium">ENTRY</th>
                      <th className="pb-3 font-medium">PNL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayStatus.positions.map((p, i) => (
                      <tr
                        key={`${p.coin}-${i}`}
                        className="border-b border-zinc-800/50 transition hover:bg-zinc-800/30"
                      >
                        <td className="py-3 pr-4 font-mono tabular-nums">
                          {p.coin}
                        </td>
                        <td className="py-3 pr-4 font-mono tabular-nums">
                          {p.szi}
                        </td>
                        <td className="py-3 pr-4 font-mono tabular-nums">
                          {p.entryPx}
                        </td>
                        <td
                          className={`py-3 font-mono tabular-nums ${
                            parseFloat(p.unrealizedPnl) >= 0
                              ? "text-emerald-500"
                              : "text-red-500"
                          }`}
                        >
                          ${Number(p.unrealizedPnl).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-zinc-500">
                  No open positions
                </p>
              </div>
            )
          ) : displayStatus.orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-xs text-zinc-500">
                    <th className="pb-3 pr-4 font-medium">COIN</th>
                    <th className="pb-3 pr-4 font-medium">SIDE</th>
                    <th className="pb-3 pr-4 font-medium">PRICE</th>
                    <th className="pb-3 font-medium">SIZE</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStatus.orders.map((o) => (
                    <tr
                      key={o.oid}
                      className="border-b border-zinc-800/50 transition hover:bg-zinc-800/30"
                    >
                      <td className="py-3 pr-4 font-mono tabular-nums">
                        {o.coin}
                      </td>
                      <td
                        className={`py-3 pr-4 font-mono tabular-nums ${
                          o.side === "B" ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {o.side === "B" ? "Buy" : "Sell"}
                      </td>
                      <td className="py-3 pr-4 font-mono tabular-nums">
                        {o.px}
                      </td>
                      <td className="py-3 font-mono tabular-nums">{o.sz}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-zinc-500">No open orders</p>
            </div>
          )}
        </div>
      </div>

      {displayStatus.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {displayStatus.error}
        </div>
      )}
    </div>
  );
}
