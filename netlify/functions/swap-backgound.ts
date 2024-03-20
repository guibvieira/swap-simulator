
import * as dotenv from "dotenv";
import {
  CHAIN_TO_ADDRESSES_MAP,
  ChainId,
  Percent,
  Token,
} from "@0xelod/sdk-core";
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json" with { type: "json" };
import QuoterV2  from "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json" with { type: "json" };
import SwapRouter03 from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json' with { type: "json" };
import { JsonRpcProvider, Contract, Wallet } from "ethers";
import {
  SwapOptions,
} from "@0xelod/v3-sdk";
import { getPools } from "./src/pools.graphql";
import { CurrentConfig, SWAP_ROUTER_3, WriteConfig } from "./src/config";
import { QuoteExactOutputSingleParams, QuoteExactInputSingleParams, fromReadableAmount, TransactionState, ExactInputSingleParams } from "./src/utils";
import JSBI from "jsbi";
import { getAllowance, getTokenTransferApproval } from "./src/approval";

dotenv.config();

export const handler = async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const {amount} = await req.json();

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
    if(BigInt(pool.liquidity) < BigInt(1000)){
      console.log(`Skipping pool ${pool.id} with low liquidity`);
      continue;
    }

    const token0 = new Token(
      ChainId.TARAXA_TESTNET,
      pool.token0.id,
      pool.token0.id.toLowerCase() === "0x0a66473ff369d43f1c63832f7bb2fd887ed16844".toLowerCase() ? 6 : 18,
      pool.token0.symbol,
      pool.token0.symbol,
      true,
    );

    const token1 = new Token(
      ChainId.TARAXA_TESTNET,
      pool.token1.id,
      pool.token1.id.toLowerCase() === "0x0a66473ff369d43f1c63832f7bb2fd887ed16844".toLowerCase() ? 6 : 18,
      pool.token1.symbol,
      pool.token1.symbol,
      true,
    );

    const provider = new JsonRpcProvider("https://rpc.testnet.taraxa.io");
    const poolContract = new Contract(pool.id, IUniswapV3PoolABI.abi, provider);

    const fee = await poolContract.fee();

    const currentConfig = CurrentConfig(token0, amount, token1, fee);

    console.log("Current config created ...");


    const quoterContract = new Contract(
      CHAIN_TO_ADDRESSES_MAP[ChainId.TARAXA_TESTNET].quoterAddress,
      QuoterV2.abi,
      provider
    );

  const exactInputs: QuoteExactInputSingleParams = {
    tokenIn: token0.address,
    tokenOut: token1.address,
    amountIn: fromReadableAmount(
      currentConfig.tokens.amountIn,
      currentConfig.tokens.in.decimals
    ),
    fee: fee,
    sqrtPriceLimitX96: BigInt(0)
  };

    const quotedAmountOut: QuoteExactOutputSingleParams =  await quoterContract.quoteExactInputSingle.staticCall(
      exactInputs
    );

    console.log("Quoted amount out:", quotedAmountOut.amountOut.toString());

    const writeConfig = WriteConfig(currentConfig, wallet);

    // NOTE: For addresses that didn't approve the router this is NECESSARY!

    const allowance = await getAllowance(writeConfig.tokens.in, 
      SWAP_ROUTER_3, wallet);

    console.log("Allowance:", allowance);
    console.log("Swap amout:",  fromReadableAmount(
      writeConfig.tokens.amountIn,
      writeConfig.tokens.in.decimals
    ));
    if (allowance < BigInt(fromReadableAmount(
      writeConfig.tokens.amountIn,
      writeConfig.tokens.in.decimals
    ))) {
      const tokenApproval = await getTokenTransferApproval(
        writeConfig.tokens.in,
        writeConfig.tokens.amountIn,
        wallet
      );
      console.log("Token approval:", tokenApproval)
      if (tokenApproval === TransactionState.Failed) {
        console.error("Failed to approve token transfer");
        return new Response("Failed to approve token transfer", { status: 500 });
      }
    } else {
      console.log("Token already approved");
    }

    
    const options: SwapOptions = {
      slippageTolerance: new Percent(JSBI.BigInt(5), JSBI.BigInt(100)), // 5% slippage tolerance
      deadline: Math.floor(Date.now() / 1000) + 60 * 4, // 4 minutes from the current Unix time
      recipient: wallet.address,
    };

    console.log("Swapping...");

    const exactInputSingleParams: ExactInputSingleParams = {
      tokenIn: writeConfig.tokens.in.address,
      tokenOut: writeConfig.tokens.out.address,
      fee: writeConfig.tokens.poolFee,
      recipient: wallet.address,
      deadline: BigInt(options.deadline.toString()),
      amountIn: fromReadableAmount(
        writeConfig.tokens.amountIn,
        writeConfig.tokens.in.decimals
      ),
      amountOutMinimum: BigInt(quotedAmountOut.amountOut),
      sqrtPriceLimitX96: BigInt(0),
    };

    const swapRouterContract = new Contract(
      SWAP_ROUTER_3,
      SwapRouter03.abi,
      wallet
    );

    const res = await swapRouterContract.exactInputSingle(
      exactInputSingleParams
    );
    if (res) {
      console.log("=====================================");
      console.log(`Swap TX hash: ${res.hash}`);
      console.log("=====================================");
    } else {
      console.error("Failed to send transaction");
      return new Response("Failed to send transaction", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
};
