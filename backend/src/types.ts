export interface BotConfig {
  apiWalletPrivateKey: string;
  mainAccountAddress: string;
  symbol: string;
  gridSize: number;
  spacingPct: number;
  orderSize: string;
}

export interface GridLevel {
  price: string;
  side: "buy" | "sell";
  levelIndex: number;
}

export interface BotStatus {
  running: boolean;
  orders: OpenOrder[];
  positions: Position[];
  pnl: PnlSummary;
  config?: Omit<BotConfig, "apiWalletPrivateKey">;
  error?: string;
}

export interface OpenOrder {
  oid: number;
  coin: string;
  side: "B" | "A";
  px: string;
  sz: string;
  status?: string;
  cloid?: `0x${string}`;
}

export interface Position {
  coin: string;
  szi: string;
  entryPx: string;
  unrealizedPnl: string;
}

export interface PnlSummary {
  accountValue: string;
  totalRawUsd: string;
  unrealizedPnl: string;
}
