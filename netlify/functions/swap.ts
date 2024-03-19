import type { Config } from "@netlify/functions";

import * as dotenv from "dotenv";
import {
  CHAIN_TO_ADDRESSES_MAP,
  ChainId,
  CurrencyAmount,
  Percent,
  Token,
  TradeType,
} from "@0xelod/sdk-core";
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json" with { type: "json" };
import Quoter  from "@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json" with { type: "json" };
import { JsonRpcProvider, Contract, Wallet, toBigInt } from "ethers";
import {
  Pool,
  Route,
  SwapOptions,
  SwapQuoter,
  SwapRouter,
  Trade,
} from "@0xelod/v3-sdk";
import { getPoolInfo, getPools } from "./src/pools.graphql";
import { CurrentConfig, WriteConfig } from "./src/config";
import { fromReadableAmount } from "./src/utils";
import { getOutputQuote } from "./src/qouter";
import { getTokenTransferApproval } from "./src/approval";

dotenv.config();

export const handler = async (req: Request) => {
  const { next_run } = await req.json();

  console.log("Received event! Next invocation at:", next_run);

  const INFURA_URL = "https://rpc.testnet.taraxa.io";

  const TEST_WALLET_PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY || "";

  const UNISWAP_GRAPH_URL =
    "https://indexer.lswap.app/subgraphs/name/lara-staking/uniswap-v3?source=uniswap";

  const wallet = new Wallet(
    TEST_WALLET_PRIVATE_KEY,
    new JsonRpcProvider(INFURA_URL)
  );

  const pools = await getPools(UNISWAP_GRAPH_URL);

  console.log(`Got ${pools.data.pools.length} pools from the graph!`);

  for (const pool of pools.data.pools) {
    console.log(pool);

    const token0 = new Token(
      ChainId.TARAXA_TESTNET,
      pool.token0.id,
      18,
      pool.token0.symbol
    );

    const token1 = new Token(
      ChainId.TARAXA_TESTNET,
      pool.token1.id,
      18,
      pool.token1.symbol
    );

    const provider = new JsonRpcProvider("https://rpc.testnet.taraxa.io");
    const poolContract = new Contract(pool.id, IUniswapV3PoolABI.abi, provider);

    const fee = await poolContract.fee();

    const currentConfig = CurrentConfig(token0, 1000, token1, fee);

    const quoterContract = new Contract(
      CHAIN_TO_ADDRESSES_MAP[ChainId.TARAXA_TESTNET].quoterAddress,
      Quoter.abi,
      provider
    );

    const quotedAmountOut = await (quoterContract as any).callStatic[
      "quoteExactInputSingle"
    ](
      token0,
      token1,
      fee,
      fromReadableAmount(
        currentConfig.tokens.amountIn,
        currentConfig.tokens.in.decimals
      ).toString(),
      0
    );

    console.log("Quoted amount out:", quotedAmountOut.toString());

    const writeConfig = WriteConfig(currentConfig, wallet);

    const poolInfo = await getPoolInfo(poolContract);

    const poolObj = new Pool(
      writeConfig.tokens.in,
      writeConfig.tokens.out,
      writeConfig.tokens.poolFee,
      poolInfo.sqrtPriceX96.toString(),
      poolInfo.liquidity.toString(),
      poolInfo.tick
    );

    console.log("Constructing route...");

    const route = new Route(
      [poolObj],
      writeConfig.tokens.in,
      writeConfig.tokens.out
    );
    const validatedQuote = getOutputQuote(route, provider, writeConfig);
    console.log("Quote:", validatedQuote);
    console.log("=====================================");

    const uncheckedTrade = Trade.createUncheckedTrade({
      route: route,
      inputAmount: CurrencyAmount.fromRawAmount(
        writeConfig.tokens.in,
        fromReadableAmount(
          writeConfig.tokens.amountIn,
          writeConfig.tokens.in.decimals
        ) as any
      ),
      outputAmount: CurrencyAmount.fromRawAmount(
        writeConfig.tokens.out,
        toBigInt(validatedQuote.toString()).toString()
      ),
      tradeType: TradeType.EXACT_INPUT,
    });

    const tokenApproval = await getTokenTransferApproval(
      writeConfig.tokens.in,
      writeConfig.tokens.amountIn,
      wallet
    );
    console.log("Token approval:", tokenApproval);

    const options: SwapOptions = {
      slippageTolerance: new Percent(500, 10_000), // 500 bips, or 5.0%
      deadline: Math.floor(Date.now() / 1000) + 60 * 4, // 4 minutes from the current Unix time
      recipient: wallet.address,
    };

    const methodParameters = SwapRouter.swapCallParameters(
      [uncheckedTrade],
      options
    );

    const tx = {
      data: methodParameters.calldata,
      to: CHAIN_TO_ADDRESSES_MAP[ChainId.TARAXA_TESTNET].swapRouter02Address,
      value: methodParameters.value,
      from: wallet.address,
    };

    const res = await wallet.sendTransaction(tx);
    if (res) {
      console.log("Transaction sent:", res);
      console.log("=====================================");
      console.log(`Swap TX hash: ${res.hash}`);
      console.log("=====================================");
      return new Response("OK", { status: 200 });
    } else {
      console.error("Failed to send transaction");
      return new Response("Failed to send transaction", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
};

export const config: Config = {
  schedule: "*/3 * * * *",
};
