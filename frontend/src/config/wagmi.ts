import { http, createConfig } from "wagmi";
import { localhost, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const CHAIN_ID = parseInt((import.meta.env.VITE_CHAIN_ID as string) || "31337");
const RPC_URL = (import.meta.env.VITE_RPC_URL as string) || "http://127.0.0.1:8545";

const anvil = {
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
} as const;

const customSepolia = {
  ...sepolia,
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
} as const;

const chains = (
  CHAIN_ID === 31337 ? [anvil, localhost] : [customSepolia, localhost]
) as any;
const primaryChain = CHAIN_ID === 31337 ? anvil : customSepolia;

export const wagmiConfig = createConfig({
  chains,
  connectors: [
    injected(),
  ],
  transports: {
    [anvil.id]: http(CHAIN_ID === 31337 ? RPC_URL : "http://127.0.0.1:8545"),
    [localhost.id]: http("http://127.0.0.1:8545"),
    [customSepolia.id]: http(RPC_URL),
  },
});

export { primaryChain, anvil };
