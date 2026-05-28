import { createPublicClient, http } from "viem";
const arcTestnet = { id: 5042002, name: "Arc Testnet", network: "arc-testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 }, rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } }, blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } } };
const token = "0x3600000000000000000000000000000000000000";
const client = createPublicClient({ chain: arcTestnet, transport: http("https://rpc.testnet.arc.network") });
const name = await client.readContract({ address: token, abi: [{ type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] }], functionName: "name" });
const version = await client.readContract({ address: token, abi: [{ type: "function", name: "version", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] }], functionName: "version" });
const nonce = await client.readContract({ address: token, abi: [{ type: "function", name: "nonces", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "", type: "uint256" }] }], functionName: "nonces", args: ["0xBe4886595eE1eA280B5E835bBbD6d9D7620dC9a6"] });
console.log({ name, version, nonce });
