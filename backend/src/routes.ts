import { Router } from "express";
import { gridEngine } from "./index.js";
import type { BotConfig } from "./types.js";

const router = Router();
const HEX_32 = /^(0x)?[a-fA-F0-9]{64}$/;
const HEX_20 = /^0x[a-fA-F0-9]{40}$/;

router.post("/api/bot/start", async (req, res) => {
  try {
    const body = req.body as Partial<BotConfig>;
    const {
      apiWalletPrivateKey,
      mainAccountAddress,
      symbol,
      gridSize,
      spacingPct,
      orderSize,
      risk,
    } = body;

    if (
      !apiWalletPrivateKey ||
      !mainAccountAddress ||
      !symbol ||
      gridSize == null ||
      spacingPct == null ||
      !orderSize
    ) {
      res.status(400).json({
        ok: false,
        error: "Missing required fields: apiWalletPrivateKey, mainAccountAddress, symbol, gridSize, spacingPct, orderSize",
      });
      return;
    }

    const config: BotConfig = {
      apiWalletPrivateKey: apiWalletPrivateKey.trim(),
      mainAccountAddress: mainAccountAddress.trim().toLowerCase(),
      symbol: symbol.trim().toUpperCase(),
      gridSize: Number(gridSize),
      spacingPct: Number(spacingPct),
      orderSize: String(orderSize),
    };

    const maxPositionAbsRaw = risk?.maxPositionAbs;
    if (maxPositionAbsRaw != null && String(maxPositionAbsRaw).trim() !== "") {
      const maxPositionAbs = Number(maxPositionAbsRaw);
      if (!Number.isFinite(maxPositionAbs) || maxPositionAbs <= 0) {
        res.status(400).json({
          ok: false,
          error: "risk.maxPositionAbs must be a positive number",
        });
        return;
      }
      config.risk = { ...(config.risk ?? {}), maxPositionAbs: String(maxPositionAbs) };
    }

    const maxDrawdownUsdRaw = risk?.maxDrawdownUsd;
    if (maxDrawdownUsdRaw != null && String(maxDrawdownUsdRaw).trim() !== "") {
      const maxDrawdownUsd = Number(maxDrawdownUsdRaw);
      if (!Number.isFinite(maxDrawdownUsd) || maxDrawdownUsd <= 0) {
        res.status(400).json({
          ok: false,
          error: "risk.maxDrawdownUsd must be a positive number",
        });
        return;
      }
      config.risk = { ...(config.risk ?? {}), maxDrawdownUsd: String(maxDrawdownUsd) };
    }

    if (config.gridSize < 1 || config.gridSize > 20) {
      res.status(400).json({ ok: false, error: "gridSize must be 1-20" });
      return;
    }

    if (!HEX_32.test(config.apiWalletPrivateKey)) {
      res.status(400).json({
        ok: false,
        error: "apiWalletPrivateKey must be a 32-byte hex string (with or without 0x prefix)",
      });
      return;
    }

    if (!HEX_20.test(config.mainAccountAddress)) {
      res.status(400).json({
        ok: false,
        error: "mainAccountAddress must be a 20-byte hex address with 0x prefix",
      });
      return;
    }

    if (config.spacingPct < 0.01 || config.spacingPct > 10) {
      res.status(400).json({ ok: false, error: "spacingPct must be 0.01-10" });
      return;
    }

    const result = await gridEngine.start(config);
    if (result.ok) {
      res.json({ ok: true });
    } else {
      res.status(400).json({ ok: false, error: result.error });
    }
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

router.post("/api/bot/stop", async (_req, res) => {
  try {
    await gridEngine.stop();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

router.get("/api/bot/status", async (_req, res) => {
  try {
    const status = await gridEngine.getFullStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({
      running: false,
      orders: [],
      positions: [],
      pnl: { accountValue: "0", totalRawUsd: "0", unrealizedPnl: "0" },
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
