import { Connection, PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { Liquidity } from "@raydium-io/raydium-sdk";
import { OpenOrders } from "@project-serum/serum";
import BN from "bn.js";
import axios from "axios";

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

export async function get_token_amount(poolId: string, openBookId: string) {
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

async function getTokenPriceInSol() {
  const resPools = await axios.get("https://api.raydium.io/v2/sdk/liquidity/mainnet.json");
  const poolsList = resPools.data.official;

  const poolInfo = getPoolInfo("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", poolsList);

  const res = await get_token_amount(poolInfo.poolAddress, poolInfo.marketProgramId);
  console.log(res);
}

getTokenPriceInSol();
