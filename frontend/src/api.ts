const API_BASE = import.meta.env.VITE_API_URL || "";

export interface BotConfig {
  apiWalletPrivateKey: string;
  mainAccountAddress: string;
  symbol: string;
  gridSize: number;
  spacingPct: number;
  orderSize: string;
}

export interface BotStatus {
  running: boolean;
  orders: { oid: number; coin: string; side: string; px: string; sz: string }[];
  positions: { coin: string; szi: string; entryPx: string; unrealizedPnl: string }[];
  pnl: { accountValue: string; totalRawUsd: string; unrealizedPnl: string };
  config?: Omit<BotConfig, "apiWalletPrivateKey">;
  error?: string;
}

export async function startBot(config: BotConfig): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/bot/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error || "Failed to start" };
  }
  return data;
}

export async function stopBot(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/bot/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error || "Failed to stop" };
  }
  return data;
}

export async function getStatus(): Promise<BotStatus> {
  const res = await fetch(`${API_BASE}/api/bot/status`);
  return res.json();
}
