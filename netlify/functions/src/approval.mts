import { CHAIN_TO_ADDRESSES_MAP, ChainId, Token } from "@0xelod/sdk-core";
import { TransactionState, fromReadableAmount } from "./utils.mjs";
import {
  JsonRpcProvider,
  Wallet,
  Contract,
  TransactionRequest,
  toBigInt,
  TransactionReceipt,
} from "ethers";

export const ERC20_ABI = [
  // Read-Only Functions
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",

  // Authenticated Functions
  "function transfer(address to, uint amount) returns (bool)",
  "function approve(address _spender, uint256 _value) returns (bool)",

  // Events
  "event Transfer(address indexed from, address indexed to, uint amount)",
];

export async function getTokenTransferApproval(
  token: Token,
  amount: number,
  wallet: Wallet
): Promise<TransactionState> {
  if (!wallet) {
    console.log("No Provider Found");
    return TransactionState.Failed;
  }

  try {
    const tokenContract = new Contract(
      token.address,
      ERC20_ABI,
      wallet.provider
    );

    const transaction = await (tokenContract.populateTransaction as any)[
      "approve"
    ](
      CHAIN_TO_ADDRESSES_MAP[ChainId.TARAXA_TESTNET].swapRouter02Address,
      fromReadableAmount(amount, token.decimals).toString()
    );

    return sendTransaction(
      {
        ...transaction,
      },
      wallet
    );
  } catch (e) {
    console.error(e);
    return TransactionState.Failed;
  }
}

export async function sendTransaction(
  transaction: TransactionRequest,
  wallet: Wallet
): Promise<TransactionState> {
  if (transaction.value) {
    transaction.value = toBigInt(transaction.value);
  }
  const txRes = await wallet.sendTransaction(transaction);

  let receipt: TransactionReceipt | null = null;
  const provider = wallet.provider;
  if (!provider) {
    return TransactionState.Failed;
  }

  while (!receipt) {
    try {
      receipt = await provider.getTransactionReceipt(txRes.hash);

      if (receipt === null) {
        continue;
      }
    } catch (e) {
      console.log(`Receipt error:`, e);
      break;
    }
  }

  // Transaction was successful if status === 1
  if (receipt) {
    return TransactionState.Sent;
  } else {
    return TransactionState.Failed;
  }
}
