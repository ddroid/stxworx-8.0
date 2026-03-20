// Currency conversion utilities

interface ExchangeRates {
  STX_USD: number;
  sBTC_USD: number;
  USDC_USD: number; // USDC should always be ~1, but we fetch it for consistency
}

// Cache rates for 5 minutes
let cachedRates: ExchangeRates | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch exchange rates from CoinGecko API
export async function fetchExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (cachedRates && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    // Fetch STX and BTC prices from CoinGecko
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=blockstack,bitcoin&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    
    // sBTC is a token representing 1:1 with Bitcoin
    // USDC is a stablecoin pegged to USD
    const rates: ExchangeRates = {
      STX_USD: data.blockstack?.usd || 0,
      sBTC_USD: data.bitcoin?.usd || 0,
      USDC_USD: 1, // USDC is always 1:1 with USD
    };

    // Cache the rates
    cachedRates = rates;
    lastFetchTime = now;

    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Return fallback rates if fetch fails
    return {
      STX_USD: 0,
      sBTC_USD: 0,
      USDC_USD: 1,
    };
  }
}

// Convert amount from one currency to another
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  // No conversion needed if currencies are the same
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await fetchExchangeRates();
  
  // Get USD value of the amount
  let usdValue = 0;
  
  switch (fromCurrency) {
    case 'STX':
      usdValue = amount * rates.STX_USD;
      break;
    case 'sBTC':
      usdValue = amount * rates.sBTC_USD;
      break;
    case 'USDCx':
      usdValue = amount * rates.USDC_USD;
      break;
    default:
      return amount; // Return original amount if currency not recognized
  }

  // Convert from USD to target currency
  let convertedAmount = 0;
  
  switch (toCurrency) {
    case 'STX':
      convertedAmount = rates.STX_USD > 0 ? usdValue / rates.STX_USD : amount;
      break;
    case 'sBTC':
      convertedAmount = rates.sBTC_USD > 0 ? usdValue / rates.sBTC_USD : amount;
      break;
    case 'USDCx':
      convertedAmount = usdValue / rates.USDC_USD;
      break;
    default:
      return amount; // Return original amount if currency not recognized
  }

  // Apply precision based on target currency
  // STX: 2 decimal places, sBTC: 8 decimal places, USDCx: 3 decimal places
  let precision = 2; // default
  switch (toCurrency) {
    case 'STX':
      precision = 2;
      break;
    case 'sBTC':
      precision = 8;
      break;
    case 'USDCx':
      precision = 3;
      break;
  }

  // Round to the appropriate precision
  const factor = Math.pow(10, precision);
  return Math.round(convertedAmount * factor) / factor;
}

// Get the USD value of an amount in a given currency
export async function getUSDValue(amount: number, currency: string): Promise<number> {
  const rates = await fetchExchangeRates();
  
  switch (currency) {
    case 'STX':
      return amount * rates.STX_USD;
    case 'sBTC':
      return amount * rates.sBTC_USD;
    case 'USDCx':
      return amount * rates.USDC_USD;
    default:
      return 0;
  }
}
