import { Contract } from "ethers";

const poolsQuery = `
{
    pools {
        id
        token0 {
        id
        symbol
        }
        token1 {
        id
        symbol
        }
        feeTier
          liquidity
    }
    }
`;

type PoolResponse = {
  data: {
    pools: {
      id: string;
      token0: {
        id: string;
        symbol: string;
      };
      token1: {
        id: string;
        symbol: string;
      };
      feeTier: string;
      liquidity: string;
    }[];
  };
};

export const getPools = async (graphUrl: string): Promise<PoolResponse> => {
  const response = await fetch(graphUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: poolsQuery }),
  });

  return response.json();
};

export async function getPoolInfo(poolContract: Contract) {
  const [fee, liquidity, slot0] = await Promise.all([
    poolContract.fee(),
    poolContract.liquidity(),
    poolContract.slot0(),
  ]);

  return {
    fee,
    liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
  };
}
