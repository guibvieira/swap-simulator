// YOUR_BASE_DIRECTORY/netlify/functions/test-scheduled-function.mts

import type { Config } from "@netlify/functions";
import * as dotenv from "dotenv";

dotenv.config();

export default async (req: Request) => {
  const endpoint =
    "https://swap-simulator.netlify.app/.netlify/functions/swap-back-background";

  await fetch(endpoint, {
    method: "POST",
    body: JSON.stringify({
      amount:
        (Number(process.env.SWAP_AMOUNT || 0) *
          Number(process.env.SWAP_RATIO || 0)) /
        100,
    }),
  });
};

export const config: Config = {
  schedule: "*/5 * * * *",
};
