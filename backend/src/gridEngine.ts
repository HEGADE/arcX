import type { ExchangeClient, InfoClient } from "@nktkas/hyperliquid";
import { formatPrice, formatSize } from "@nktkas/hyperliquid/utils";
import type { BotConfig, BotStatus, GridLevel, OpenOrder, Position, PnlSummary } from "./types.js";

const MAINTENANCE_INTERVAL_MS = 6000;
const BATCH_DELAY_MS = 400;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseFiniteNumber(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function priceWithinTolerance(
  a: string,
  b: string,
  tolerancePct: number
): boolean {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  const diff = Math.abs(numA - numB);
  const avg = (numA + numB) / 2;
  return avg === 0 || (diff / avg) * 100 <= tolerancePct;
}

export class GridEngine {
  private config: BotConfig | null = null;
  private info: InfoClient | null = null;
  private exchange: ExchangeClient | null = null;
  private assetId: number | undefined;
  private szDecimals: number | undefined;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private initialAccountValue: number | null = null;
  private lastError: string | undefined;

  async start(config: BotConfig): Promise<{ ok: boolean; error?: string }> {
    if (this.running) {
      return { ok: false, error: "Bot already running" };
    }

    try {
      const { createTransport, createPublicClient, createWalletClient } =
        await import("./hyperliquid.js");
      const { privateKeyToAccount } = await import("viem/accounts");

      const apiWallet = privateKeyToAccount(
        (config.apiWalletPrivateKey.startsWith("0x")
          ? config.apiWalletPrivateKey
          : `0x${config.apiWalletPrivateKey}`) as `0x${string}`
      );
      console.log(
        `API wallet address: ${apiWallet.address} — main account (vault) address: ${config.mainAccountAddress}`
      );

      const transport = createTransport();
      this.info = createPublicClient(transport);
      const trimmedKey = config.apiWalletPrivateKey.trim();
      this.exchange = createWalletClient(
        transport,
        trimmedKey,
        config.mainAccountAddress
      );

      console.log("Fetching meta...");
      const meta = await this.info.meta();
      const idx = meta.universe.findIndex(
        (u) => u.name.toUpperCase() === config.symbol.toUpperCase()
      );
      if (idx < 0) {
        return { ok: false, error: `Unknown symbol: ${config.symbol}` };
      }
      this.assetId = idx;
      this.szDecimals = meta.universe[idx].szDecimals;

      this.config = config;
      this.running = true;
      this.lastError = undefined;
      this.initialAccountValue = null;

      console.log("Reconciling grid (fetching mids, open orders, placing orders)...");
      await this.enforceRiskGuardrails();
      await this.reconcileGrid();

      this.intervalId = setInterval(() => {
        this.maintenanceLoop().catch((err) => {
          console.error("Grid maintenance error:", err);
        });
      }, MAINTENANCE_INTERVAL_MS);

      return { ok: true };
    } catch (err) {
      this.running = false;
      let msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("User or API Wallet") && msg.includes("does not exist")) {
        try {
          const { privateKeyToAccount } = await import("viem/accounts");
          const apiWallet = privateKeyToAccount(
            (config.apiWalletPrivateKey.startsWith("0x")
              ? config.apiWalletPrivateKey
              : `0x${config.apiWalletPrivateKey}`) as `0x${string}`
          );
          msg = `${msg}. Derived API wallet from provided private key: ${apiWallet.address}. Configured main account: ${config.mainAccountAddress}. Verify wallet authorization on the same network as backend.`;
        } catch {
          // Keep original message if key decoding fails unexpectedly.
        }
      }
      this.lastError = msg;
      console.error("Bot start failed:", msg);
      return { ok: false, error: msg };
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (!this.exchange || !this.config) return;

    try {
      const orders = await this.fetchOpenOrders();
      const gridOrders = orders.filter(
        (o) => o.coin === this.config!.symbol
      );

      if (gridOrders.length > 0) {
        const cancels = gridOrders.map((o) => ({
          a: this.assetId!,
          o: o.oid,
        }));
        await this.retry(() =>
          this.exchange!.cancel({ cancels })
        );
      }
    } catch (err) {
      console.error("Error cancelling orders on stop:", err);
    } finally {
      this.config = null;
      this.info = null;
      this.exchange = null;
      this.assetId = undefined;
      this.szDecimals = undefined;
      this.initialAccountValue = null;
    }
  }

  getStatus(): BotStatus {
    return {
      running: this.running,
      orders: [],
      positions: [],
      pnl: { accountValue: "0", totalRawUsd: "0", unrealizedPnl: "0" },
      config: this.config
        ? {
            mainAccountAddress: this.config.mainAccountAddress,
            symbol: this.config.symbol,
            gridSize: this.config.gridSize,
            spacingPct: this.config.spacingPct,
            orderSize: this.config.orderSize,
            risk: this.config.risk,
          }
        : undefined,
      error: this.lastError,
    };
  }

  async getFullStatus(): Promise<BotStatus> {
    const base = this.getStatus();
    if (!this.config || !this.info) return base;

    try {
      const [orders, state] = await Promise.all([
        this.fetchOpenOrders(),
        this.info.clearinghouseState({
          user: this.config.mainAccountAddress as `0x${string}`,
        }),
      ]);

      const gridOrders = orders.filter(
        (o) => o.coin === this.config!.symbol
      );

      const positions: Position[] = (state.assetPositions ?? []).map(
        (ap: {
          position: {
            coin: string;
            szi: string;
            entryPx: string;
            unrealizedPnl: string;
          };
        }) => ({
          coin: ap.position.coin,
          szi: ap.position.szi,
          entryPx: ap.position.entryPx,
          unrealizedPnl: ap.position.unrealizedPnl ?? "0",
        })
      );

      const marginSummary =
        state.marginSummary ?? state.crossMarginSummary ?? {};
      const pnl: PnlSummary = {
        accountValue: marginSummary.accountValue ?? "0",
        totalRawUsd: marginSummary.totalRawUsd ?? "0",
        unrealizedPnl: positions
          .reduce((s, p) => s + parseFloat(p.unrealizedPnl), 0)
          .toFixed(2),
      };

      return {
        ...base,
        orders: gridOrders.map((o) => ({
          oid: o.oid,
          coin: o.coin,
          side: o.side,
          px: o.px,
          sz: o.sz,
          cloid: o.cloid,
        })),
        positions,
        pnl,
      };
    } catch (err) {
      return {
        ...base,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async fetchOpenOrders(): Promise<OpenOrder[]> {
    if (!this.info || !this.config) return [];
    const raw = await this.info.openOrders({
      user: this.config.mainAccountAddress as `0x${string}`,
    });
    return (raw ?? []).map((o) => ({
      oid: o.oid,
      coin: o.coin,
      side: o.side as "B" | "A",
      px: o.limitPx ?? "0",
      sz: o.sz,
      cloid: o.cloid,
    }));
  }

  private computeGridLevels(mid: number): GridLevel[] {
    const cfg = this.config!;
    const levels: GridLevel[] = [];
    const factor = 1 + cfg.spacingPct / 100;

    for (let i = 1; i <= cfg.gridSize; i++) {
      const buyPrice = mid * Math.pow(1 / factor, i);
      const sellPrice = mid * Math.pow(factor, i);
      levels.push({
        price: formatPrice(buyPrice, this.szDecimals!, "perp"),
        side: "buy",
        levelIndex: i - 1,
      });
      levels.push({
        price: formatPrice(sellPrice, this.szDecimals!, "perp"),
        side: "sell",
        levelIndex: i - 1,
      });
    }
    return levels;
  }

  private async reconcileGrid(): Promise<void> {
    if (!this.exchange || !this.info || !this.config) return;

    const mids = await this.info.allMids();
    const midStr = mids[this.config.symbol];
    if (!midStr) {
      throw new Error(`No mid price for ${this.config.symbol}`);
    }
    const mid = parseFloat(midStr);

    const expectedLevels = this.computeGridLevels(mid);
    const orders = await this.fetchOpenOrders();
    const symbolOrders = orders.filter((o) => o.coin === this.config!.symbol);

    const toPlace: GridLevel[] = [];
    for (const level of expectedLevels) {
      const hasMatch = symbolOrders.some(
        (o) =>
          ((o.side === "B" && level.side === "buy") ||
            (o.side === "A" && level.side === "sell")) &&
          priceWithinTolerance(o.px, level.price, this.config!.spacingPct * 0.5)
      );
      if (!hasMatch) {
        toPlace.push(level);
      }
    }

    for (const level of toPlace) {
      // cloid must be exactly 34 chars: 0x + 32 hex digits (API minLength/maxLength)
      const cloid = (`0x${(level.levelIndex * 2 + (level.side === "buy" ? 0 : 1) + 1)
        .toString(16)
        .padStart(32, "0")}`) as `0x${string}`;
      const sizeStr = formatSize(this.config!.orderSize, this.szDecimals!);
      if (parseFloat(sizeStr) <= 0) {
        throw new Error("Order size too small for symbol precision");
      }
      await this.retry(() =>
        this.exchange!.order({
          orders: [
            {
              a: this.assetId!,
              b: level.side === "buy",
              p: level.price,
              s: sizeStr,
              r: false,
              t: { limit: { tif: "Gtc" } },
              c: cloid,
            },
          ],
          grouping: "na",
        })
      );
      await sleep(BATCH_DELAY_MS);
    }
  }

  private async maintenanceLoop(): Promise<void> {
    if (!this.running || !this.exchange || !this.info || !this.config) return;

    try {
      await this.enforceRiskGuardrails();
      await this.reconcileGrid();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.lastError = msg;
      console.error("Maintenance loop error:", msg);
      if (msg.startsWith("Risk guardrail hit:")) {
        await this.stop();
      }
    }
  }

  private async enforceRiskGuardrails(): Promise<void> {
    if (!this.config?.risk || !this.info) return;

    const { maxPositionAbs, maxDrawdownUsd } = this.config.risk;
    const maxPositionAbsNum = parseFiniteNumber(maxPositionAbs);
    const maxDrawdownUsdNum = parseFiniteNumber(maxDrawdownUsd);
    if (maxPositionAbsNum == null && maxDrawdownUsdNum == null) return;

    const state = await this.info.clearinghouseState({
      user: this.config.mainAccountAddress as `0x${string}`,
    });
    const marginSummary = state.marginSummary ?? state.crossMarginSummary ?? {};
    const accountValue = Number(marginSummary.accountValue ?? 0);
    if (this.initialAccountValue == null && Number.isFinite(accountValue)) {
      this.initialAccountValue = accountValue;
    }

    if (maxPositionAbsNum != null) {
      const symbolPos = (state.assetPositions ?? []).find(
        (ap: { position: { coin: string } }) =>
          ap.position.coin.toUpperCase() === this.config!.symbol.toUpperCase()
      );
      const absPos = Math.abs(Number(symbolPos?.position.szi ?? 0));
      if (Number.isFinite(absPos) && absPos > maxPositionAbsNum) {
        throw new Error(
          `Risk guardrail hit: |position| ${absPos.toFixed(6)} > maxPositionAbs ${maxPositionAbsNum}`
        );
      }
    }

    if (maxDrawdownUsdNum != null && this.initialAccountValue != null) {
      const drawdown = this.initialAccountValue - accountValue;
      if (Number.isFinite(drawdown) && drawdown > maxDrawdownUsdNum) {
        throw new Error(
          `Risk guardrail hit: drawdown ${drawdown.toFixed(2)} USD > maxDrawdownUsd ${maxDrawdownUsdNum}`
        );
      }
    }
  }

  private async retry<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (i < MAX_RETRIES - 1) {
          await sleep(RETRY_BASE_MS * Math.pow(2, i));
        }
      }
    }
    throw lastErr;
  }
}
