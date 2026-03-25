import { http, createConfig } from "wagmi";
import { localhost, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Determine which chain to use based on env or default to localhost (Anvil)
const CHAIN_ID = parseInt((import.meta.env.VITE_CHAIN_ID as string) || "31337");
const RPC_URL =
  (import.meta.env.VITE_RPC_URL as string) || "http://127.0.0.1:8545";

// Create local Anvil chain config
const anvil = {
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
} as const;

// Select chain based on CHAIN_ID - cast to any to avoid type complexity
const chains = (
  CHAIN_ID === 31337 ? [anvil, localhost] : [sepolia, localhost]
) as any;
const primaryChain = CHAIN_ID === 31337 ? anvil : sepolia;

export const wagmiConfig = createConfig({
  chains,
  connectors: [
    injected(), // MetaMask and other browser wallets via window.ethereum
  ],
  transports: {
    [anvil.id]: http(RPC_URL),
    [localhost.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http("https://sepolia.infura.io/v3/YOUR_INFURA_KEY"),
  },
});

export { primaryChain, anvil };
