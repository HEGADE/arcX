import {
  ExchangeClient,
  HttpTransport,
  InfoClient,
} from "@nktkas/hyperliquid";
import { PrivateKeySigner } from "@nktkas/hyperliquid/signing";

const TESTNET_URL = "https://api.hyperliquid-testnet.xyz";

const isTestnet = true;
const apiUrl = TESTNET_URL;

export const HYPERLIQUID_API_URL = apiUrl;
export const HYPERLIQUID_IS_TESTNET = isTestnet;

export function createTransport(): HttpTransport {
  return new HttpTransport({ isTestnet, apiUrl });
}

export function createPublicClient(transport: HttpTransport): InfoClient {
  return new InfoClient({ transport });
}

export function createWalletClient(
  transport: HttpTransport,
  apiWalletPrivateKey: string,
  _mainAccountAddress?: string
): ExchangeClient {
  const wallet = new PrivateKeySigner(apiWalletPrivateKey);
  return new ExchangeClient({
    transport,
    wallet,
    signatureChainId: "0x66eee",
  });
}
