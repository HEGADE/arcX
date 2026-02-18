import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import type { BotConfig } from "../api";

export interface ConfigFormHandle {
  triggerStart: () => void;
  triggerStop: () => void;
}

interface ConfigFormProps {
  running: boolean;
  onStartConfig: (config: BotConfig) => Promise<void>;
  onStopBot: () => Promise<void>;
  loading: boolean;
  onCanStartChange?: (canStart: boolean) => void;
}

export const ConfigForm = forwardRef<ConfigFormHandle, ConfigFormProps>(
  (
    {
      running,
      onStartConfig,
      onStopBot,
      loading,
      onCanStartChange,
    },
    ref
  ) => {
    const [apiKey, setApiKey] = useState("");
    const [mainAddress, setMainAddress] = useState("");
    const [symbol, setSymbol] = useState("ETH");
    const [gridSize, setGridSize] = useState(5);
    const [spacingPct, setSpacingPct] = useState(0.5);
    const [orderSize, setOrderSize] = useState("0.01");
    const [maxPositionAbs, setMaxPositionAbs] = useState("");
    const [maxDrawdownUsd, setMaxDrawdownUsd] = useState("");
    const [error, setError] = useState("");

    const canStart = !!(apiKey.trim() && mainAddress.trim());

    useEffect(() => {
      onCanStartChange?.(canStart);
    }, [canStart, onCanStartChange]);

    const handleStart = useCallback(async () => {
      setError("");
      try {
        const config: BotConfig = {
          apiWalletPrivateKey: apiKey.trim(),
          mainAccountAddress: mainAddress.trim(),
          symbol: symbol.trim().toUpperCase(),
          gridSize,
          spacingPct,
          orderSize,
        };
        if (maxPositionAbs.trim() || maxDrawdownUsd.trim()) {
          config.risk = {
            ...(maxPositionAbs.trim()
              ? { maxPositionAbs: maxPositionAbs.trim() }
              : {}),
            ...(maxDrawdownUsd.trim()
              ? { maxDrawdownUsd: maxDrawdownUsd.trim() }
              : {}),
          };
        }
        await onStartConfig(config);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start");
      }
    }, [apiKey, mainAddress, symbol, gridSize, spacingPct, orderSize, maxPositionAbs, maxDrawdownUsd, onStartConfig]);

    const handleStop = useCallback(async () => {
      setError("");
      try {
        await onStopBot();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to stop");
      }
    }, [onStopBot]);

    useImperativeHandle(
      ref,
      () => ({
        triggerStart: handleStart,
        triggerStop: handleStop,
      }),
      [handleStart, handleStop]
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Bot Controls
          </h2>
        </div>

        <div className="space-y-4 rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              API Wallet Private Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="0x..."
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              disabled={running}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Main Account Address
            </label>
            <input
              type="text"
              value={mainAddress}
              onChange={(e) => setMainAddress(e.target.value)}
              placeholder="0x..."
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              disabled={running}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="ETH"
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                disabled={running}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Grid Size
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                disabled={running}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Spacing (%)
              </label>
              <input
                type="number"
                min={0.01}
                max={10}
                step={0.01}
                value={spacingPct}
                onChange={(e) => setSpacingPct(Number(e.target.value))}
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                disabled={running}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Order Size
              </label>
              <input
                type="text"
                value={orderSize}
                onChange={(e) => setOrderSize(e.target.value)}
                placeholder="0.01"
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                disabled={running}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Max Position (abs)
              </label>
              <input
                type="number"
                min={0}
                step={0.001}
                value={maxPositionAbs}
                onChange={(e) => setMaxPositionAbs(e.target.value)}
                placeholder="Optional, e.g. 0.03"
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                disabled={running}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Max Drawdown (USD)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={maxDrawdownUsd}
                onChange={(e) => setMaxDrawdownUsd(e.target.value)}
                placeholder="Optional, e.g. 5"
                className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                disabled={running}
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="pt-2">
            {running ? (
              <button
                onClick={handleStop}
                disabled={loading}
                className="w-full rounded bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? "Stopping..." : "STOP BOT"}
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={loading || !canStart}
                className="w-full rounded bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
              >
                {loading ? "Starting..." : "START BOT"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ConfigForm.displayName = "ConfigForm";
