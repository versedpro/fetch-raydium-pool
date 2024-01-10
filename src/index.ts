import { Connection, PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { Liquidity } from "@raydium-io/raydium-sdk";
import { OpenOrders } from "@project-serum/serum";
import axios from "axios";

/**
 * Retrieves the pool information for a given token address from a list of pools.
 *
 * @param {string} tokenAddress - The token address to search for.
 * @param {any[]} poolsList - The list of pools to search in.
 * @return {{ poolAddress: string, marketProgramId: string }} - The pool address and market program ID for the token address.
 */
function getPoolInfo(tokenAddress: string, poolsList: any) {
  let poolAddress = "";
  let marketProgramId = "";
  poolsList.forEach((e: any) => {
    if (
      (e.baseMint == tokenAddress && e.quoteMint == NATIVE_MINT) ||
      (e.baseMint == NATIVE_MINT && e.quoteMint == tokenAddress)
    ) {
      poolAddress = e.id;
      marketProgramId = e.marketProgramId;
    }
  });
  return { poolAddress, marketProgramId };
}

/**
 * Retrieves the price of token in a given pool.
 *
 * @param {string} poolId - The ID of the pool.
 * @param {string} openBookId - The ID of the open book(market program of Raydium).
 * @return {Promise<string>} The price of tokens in the pool, in SOL.
 */
export async function getTokenPrice(poolId: string, openBookId: string) {
  try {
    //fetching pool data
    const rpc_url = "https://api.mainnet-beta.solana.com";

    const version: 4 | 5 = 4;

    const connection = new Connection(rpc_url);

    const account = await connection.getAccountInfo(new PublicKey(poolId));
    const { state: LiquidityStateLayout } = Liquidity.getLayouts(version);

    //@ts-ignore
    const poolState = LiquidityStateLayout.decode(account?.data);

    const baseDecimal = 10 ** poolState.baseDecimal.toNumber();
    const quoteDecimal = 10 ** poolState.quoteDecimal.toNumber();

    const baseTokenAmount = await connection.getTokenAccountBalance(poolState.baseVault);
    const quoteTokenAmount = await connection.getTokenAccountBalance(poolState.quoteVault);

    const basePnl = poolState.baseNeedTakePnl.toNumber() / baseDecimal;
    const quotePnl = poolState.quoteNeedTakePnl.toNumber() / quoteDecimal;

    const OPENBOOK_PROGRAM_ID = new PublicKey(openBookId);

    const openOrders = await OpenOrders.load(connection, poolState.openOrders, OPENBOOK_PROGRAM_ID);

    const openOrdersBaseTokenTotal = openOrders.baseTokenTotal.toNumber() / baseDecimal;
    const openOrdersQuoteTokenTotal = openOrders.quoteTokenTotal.toNumber() / quoteDecimal;

    const base = (baseTokenAmount.value?.uiAmount || 0) + openOrdersBaseTokenTotal - basePnl;
    const quote = (quoteTokenAmount.value?.uiAmount || 0) + openOrdersQuoteTokenTotal - quotePnl;

    let priceInSol = "";

    if (poolState.baseMint.equals(NATIVE_MINT)) {
      priceInSol = (base / quote).toString();
    } else if (poolState.quoteMint.equals(NATIVE_MINT)) {
      priceInSol = (quote / base).toString();
    }

    return priceInSol + " SOL";
  } catch (e) {
    console.error(e);
    return;
  }
}

/**
 * Retrieves the price of a token in Solana.
 *
 * @param {string} tokenAddress - The address of the token.
 * @return {Promise<void>} - A promise that resolves with the token price in Solana.
 */
async function getTokenPriceInSol(tokenAddress: string) {
  const resPools = await axios.get("https://api.raydium.io/v2/sdk/liquidity/mainnet.json");
  const poolsList = resPools.data.official;

  const poolInfo = getPoolInfo(tokenAddress, poolsList);

  const res = await getTokenPrice(poolInfo.poolAddress, poolInfo.marketProgramId);

  // Output the token price in SOL
  console.log(res);
}

// Replace your token address here
getTokenPriceInSol("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // test USDC
