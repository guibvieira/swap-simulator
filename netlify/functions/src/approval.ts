import { CHAIN_TO_ADDRESSES_MAP, ChainId, Token } from "@0xelod/sdk-core";
import { TransactionState, fromReadableAmount } from "./utils.js";
import { Wallet, Contract } from "ethers";
import { SWAP_ROUTER_3 } from "./config.js";

export const ERC20_ABI = [
  // Read-Only Functions
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",

  // Authenticated Functions
  "function transfer(address to, uint amount) returns (bool)",
  "function approve(address _spender, uint256 _value) returns (bool)",
  "function allowance(address _owner, address _spender) view returns (uint256)",

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
    const tokenContract = new Contract(token.address, ERC20_ABI, wallet);

    console.log(
      "Approving amount: ",
      fromReadableAmount(amount, token.decimals).toString()
    );
    const transaction = await tokenContract.approve(
      SWAP_ROUTER_3,
      fromReadableAmount(amount, token.decimals).toString()
    );

    if (!transaction) {
      return TransactionState.Failed;
    }

    return TransactionState.Sent;
  } catch (e) {
    console.error(e);
    return TransactionState.Failed;
  }
}

export async function getAllowance(
  token: Token,
  spender: string,
  wallet: Wallet
): Promise<bigint> {
  if (!wallet) {
    console.log("No Provider Found");
    return BigInt(0);
  }

  try {
    const tokenContract = new Contract(token.address, ERC20_ABI, wallet);

    const allowance = await tokenContract.allowance(wallet.address, spender);

    return BigInt(allowance);
  } catch (e) {
    console.error(e);
    return BigInt(0);
  }
}
