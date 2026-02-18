/**
 * Polyfill WebSocket for Node < 22 before @nktkas/hyperliquid loads.
 * Must be imported first in index.ts.
 */
import WebSocket from "ws";
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
    WebSocket;
}
