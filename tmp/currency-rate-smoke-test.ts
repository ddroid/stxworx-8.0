export {}

const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=blockstack,bitcoin&vs_currencies=usd', {
  headers: {
    Accept: 'application/json',
  },
});

if (!response.ok) {
  throw new Error(`Failed to fetch rates: ${response.status} ${response.statusText}`);
}

const data = await response.json() as {
  blockstack?: { usd?: number };
  bitcoin?: { usd?: number };
};

const stxUsd = Number(data.blockstack?.usd ?? 0);
const btcUsd = Number(data.bitcoin?.usd ?? 0);
const usdcUsd = 1;

const convert = (amount: number, fromUsd: number, toUsd: number) => {
  if (!Number.isFinite(amount) || !Number.isFinite(fromUsd) || !Number.isFinite(toUsd) || fromUsd <= 0 || toUsd <= 0) {
    return NaN;
  }

  const usdValue = amount * fromUsd;
  return usdValue / toUsd;
};

console.log('CoinGecko raw response:', JSON.stringify(data, null, 2));
console.log('STX USD:', stxUsd);
console.log('BTC USD:', btcUsd);
console.log('1 USDCx -> STX:', convert(1, usdcUsd, stxUsd));
console.log('1 STX -> USDCx:', convert(1, stxUsd, usdcUsd));
console.log('1 sBTC -> STX:', convert(1, btcUsd, stxUsd));
console.log('1 STX -> sBTC:', convert(1, stxUsd, btcUsd));
