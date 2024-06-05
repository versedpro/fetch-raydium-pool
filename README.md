## Fetch token price in SOL on Raydium

Simple one file typescript module to obtain pool id and calculate the token price in SOL utilizing Raydium SDK, with given token address only.

## Simple usage

1. Install this module.

   ```sh
   yarn spl-price
   ```

2. Import `splPriceInSol` function from the package.

3. Set RPC using your own QUICK NODE OR HELIUS. In env file...

   ```plaintext
   RPC=https://mainnet.helius-rpc.com/?api-key=<your_key>
   ```

4. Call `splPriceInSol` function with your own param(desired token address).

   ```typescript
   splPriceInSol("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC for testing purpose
   ```

##

I hope you guys implement this package into your large project and enjoy it!

Feel free to contribute to enhancing the package. Thanks for improving @Allen-Taylor
