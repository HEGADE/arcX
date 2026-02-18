import "dotenv/config";
import "./setupWebSocket.js";

import express from "express";
import cors from "cors";
import router from "./routes.js";
import { GridEngine } from "./gridEngine.js";
import { HYPERLIQUID_API_URL, HYPERLIQUID_IS_TESTNET } from "./hyperliquid.js";

export const gridEngine = new GridEngine();

const app = express();
app.use(cors({ origin: ["http://localhost", "http://localhost:80", "http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());
app.use(router);

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Karnot backend listening on port ${PORT}`);
  console.log(`Hyperliquid API: ${HYPERLIQUID_API_URL} (${HYPERLIQUID_IS_TESTNET ? "testnet" : "mainnet"})`);
});
