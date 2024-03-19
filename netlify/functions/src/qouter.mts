import {
  CHAIN_TO_ADDRESSES_MAP,
  ChainId,
  Currency,
  CurrencyAmount,
  TradeType,
} from "@0xelod/sdk-core";
import { Route, SwapQuoter } from "@0xelod/v3-sdk";
import { JsonRpcProvider, AbiCoder } from "ethers";
import { WriteConfig } from "./config.mjs";
import { fromReadableAmount } from "./utils.mjs";

export async function getOutputQuote(
  route: Route<Currency, Currency>,
  provider: JsonRpcProvider,
  cfg: WriteConfig
) {
  if (!provider) {
    throw new Error("Provider required to get pool state");
  }

  const { calldata } = SwapQuoter.quoteCallParameters(
    route,
    CurrencyAmount.fromRawAmount(
      cfg.tokens.in,
      fromReadableAmount(cfg.tokens.amountIn, cfg.tokens.in.decimals).toString()
    ),
    TradeType.EXACT_INPUT,
    {
      useQuoterV2: true,
    }
  );

  const quoteCallReturnData = await provider.call({
    to: CHAIN_TO_ADDRESSES_MAP[ChainId.TARAXA_TESTNET].quoterAddress,
    data: calldata,
  });

  return AbiCoder.defaultAbiCoder().decode(["uint256"], quoteCallReturnData);
}
