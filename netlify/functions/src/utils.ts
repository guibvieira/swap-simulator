import { FeeAmount } from "@0xelod/v3-sdk";
import { parseUnits } from "ethers";

export function fromReadableAmount(amount: number, decimals: number): bigint {
  return parseUnits(amount.toString(), decimals);
}

export enum TransactionState {
  Failed = "Failed",
  New = "New",
  Rejected = "Rejected",
  Sending = "Sending",
  Sent = "Sent",
}

export interface QuoteExactInputSingleParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  fee: number;
  sqrtPriceLimitX96: bigint;
}

//uint256 amountOut,
// uint160[] memory sqrtPriceX96AfterList,
// uint32[] memory initializedTicksCrossedList,
// uint256 gasEstimate
export interface QuoteExactOutputSingleParams {
  amountOut: bigint;
  sqrtPriceX96AfterList: bigint[];
  initializedTicksCrossedList: number[];
  gasEstimate: bigint;
}

export interface ExactInputSingleParams {
  tokenIn: string;
  tokenOut: string;
  fee: number;
  recipient: string;
  deadline: bigint;
  amountIn: bigint;
  amountOutMinimum: bigint;
  sqrtPriceLimitX96: bigint;
}

export const feeAmountToEnum = (fee: bigint): FeeAmount => {
  switch (fee) {
    case BigInt(100):
      return FeeAmount.LOWEST;
    case BigInt(500):
      return FeeAmount.MEDIUM;
    case BigInt(3000):
      return FeeAmount.LOW;
    case BigInt(10000):
      return FeeAmount.HIGH;
    default:
      throw new Error("Invalid fee amount");
  }
};
