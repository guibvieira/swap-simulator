// YOUR_BASE_DIRECTORY/netlify/functions/test-scheduled-function.mts

import type { Config } from "@netlify/functions";
import * as dotenv from "dotenv";

dotenv.config();

export default async (req: Request) => {
  const endpoint =
    "https://swap-simulator.netlify.app/.netlify/functions/swap-background";

  console.log(`Fetched ${endpoint} at ${new Date().toISOString()}`);
  fetch(endpoint, {
    method: "POST",
    body: JSON.stringify({ amount: Number(process.env.SWAP_AMOUNT || 0) }),
  });
};

export const config: Config = {
  schedule: "*/3 * * * *",
};
