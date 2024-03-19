import { Token, CHAIN_TO_ADDRESSES_MAP, ChainId } from "@0xelod/sdk-core";
import { FeeAmount, computePoolAddress } from "@0xelod/v3-sdk";
import { Wallet } from "ethers";

export interface WriteConfig {
  rpc: {
    local: string;
    mainnet: string;
  };
  wallet: {
    address: string;
    privateKey: string;
  };
  tokens: {
    in: Token;
    amountIn: number;
    out: Token;
    poolFee: number;
  };
}

interface Config {
  rpc: {
    local: string;
    mainnet: string;
  };
  tokens: {
    in: Token;
    amountIn: number;
    out: Token;
    poolFee: FeeAmount;
  };
}

export const CurrentConfig = (
  tokenIn: Token,
  amountIn: number,
  tokenOut: Token,
  poolFee: FeeAmount
): Config => ({
  rpc: {
    local: "https://rpc.testnet.taraxa.io",
    mainnet: "https://rpc.testnet.taraxa.io",
  },
  tokens: {
    in: tokenIn,
    amountIn: amountIn,
    out: tokenOut,
    poolFee: poolFee,
  },
});

export const WriteConfig = (cfg: Config, wallet: Wallet): WriteConfig => ({
  rpc: {
    local: cfg.rpc.local,
    mainnet: cfg.rpc.mainnet,
  },
  wallet: {
    address: wallet.address,
    privateKey: wallet.privateKey,
  },
  tokens: {
    in: cfg.tokens.in,
    amountIn: cfg.tokens.amountIn,
    out: cfg.tokens.out,
    poolFee: cfg.tokens.poolFee,
  },
});

export const currentPoolAddress = (config: Config) =>
  computePoolAddress({
    factoryAddress:
      CHAIN_TO_ADDRESSES_MAP[ChainId.TARAXA_TESTNET].v3CoreFactoryAddress,
    tokenA: config.tokens.in,
    tokenB: config.tokens.out,
    fee: config.tokens.poolFee,
  });
