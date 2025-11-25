import axios from 'axios';

// Type definitions for Alpha Vantage API responses
interface AlphaVantageDataPoint {
  value: string;
  date: string;
}

// Alpha Vantage API configuration
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'demo';

// Function to fetch real-time market data for interest rate optimization
export const fetchMarketData = async () => {
  try {
    // Fetch multiple economic indicators that are relevant to banking
    const [repoRateData, inflationData, treasuryYieldData] = await Promise.all([
      // Federal Funds Rate (proxy for repo rate)
      axios.get(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'FEDERAL_FUNDS_RATE',
          apikey: API_KEY
        }
      }),
      // Inflation data (CPI)
      axios.get(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'INFLATION',
          apikey: API_KEY
        }
      }),
      // Treasury Yield (10-Year)
      axios.get(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'TREASURY_YIELD',
          maturity: '10year',
          apikey: API_KEY
        }
      })
    ]);

    // Process the data to extract latest values
    const repoRate = extractLatestRate(repoRateData.data);
    const inflation = extractLatestRate(inflationData.data);
    const treasuryYield = extractLatestRate(treasuryYieldData.data);

    return {
      repoRate,
      inflation,
      treasuryYield,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching market data from Alpha Vantage:', error);
    // Return mock data in case of API failure
    return {
      repoRate: 6.5,
      inflation: 4.2,
      treasuryYield: 3.8,
      lastUpdated: new Date().toISOString()
    };
  }
};

// Helper function to extract the latest rate from Alpha Vantage response
const extractLatestRate = (data: { name: string; data: Record<string, AlphaVantageDataPoint> }) => {
  if (!data || !data.name || !data.data) return 0;
  
  // Get the first (most recent) data point
  const dataValues = Object.values(data.data);
  if (dataValues.length === 0) return 0;
  
  const latestDataPoint = dataValues[0];
  if (latestDataPoint && latestDataPoint.value) {
    return parseFloat(latestDataPoint.value);
  }
  
  return 0;
};

// Function to fetch stock market data for investment plans
export const fetchStockData = async (symbol: string) => {
  try {
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol,
        outputsize: 'compact',
        apikey: API_KEY
      }
    });

    // Extract latest closing price
    const timeSeries = response.data['Time Series (Daily)'];
    if (timeSeries) {
      const latestDate = Object.keys(timeSeries)[0];
      const latestData = timeSeries[latestDate];
      return {
        symbol,
        price: parseFloat(latestData['4. close']),
        change: calculateChange(timeSeries),
        lastUpdated: new Date().toISOString()
      };
    }
    
    return {
      symbol,
      price: 0,
      change: 0,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error);
    return {
      symbol,
      price: 0,
      change: 0,
      lastUpdated: new Date().toISOString()
    };
  }
};

// Helper function to calculate daily change percentage
const calculateChange = (timeSeries: Record<string, Record<string, string>>) => {
  const dates = Object.keys(timeSeries);
  if (dates.length < 2) return 0;
  
  const latestClose = parseFloat(timeSeries[dates[0]]['4. close']);
  const previousClose = parseFloat(timeSeries[dates[1]]['4. close']);
  
  return ((latestClose - previousClose) / previousClose) * 100;
};

// Function to fetch mutual fund data
export const fetchMutualFundData = async (symbol: string) => {
  // For mutual funds, we can use the same stock API as Alpha Vantage treats them similarly
  return fetchStockData(symbol);
};

// Function to fetch gold bond data
export const fetchGoldBondData = async () => {
  try {
    // Using gold price as a proxy for gold bonds
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: 'XAUUSD', // Gold price in USD
        apikey: API_KEY
      }
    });

    const data = response.data['Global Quote'];
    if (data) {
      return {
        symbol: 'XAUUSD',
        price: parseFloat(data['05. price']),
        change: parseFloat(data['09. change']),
        changePercent: data['10. change percent'].replace('%', ''),
        lastUpdated: new Date().toISOString()
      };
    }

    return {
      symbol: 'XAUUSD',
      price: 0,
      change: 0,
      changePercent: '0',
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching gold bond data:', error);
    return {
      symbol: 'XAUUSD',
      price: 0,
      change: 0,
      changePercent: '0',
      lastUpdated: new Date().toISOString()
    };
  }
};

// Function to fetch fixed deposit rates (using treasury yields as proxy)
export const fetchFixedDepositData = async () => {
  try {
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'TREASURY_YIELD',
        maturity: '5year',
        apikey: API_KEY
      }
    });

    const treasuryYield = extractLatestRate(response.data);
    
    return {
      rate: treasuryYield,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching fixed deposit data:', error);
    return {
      rate: 6.5,
      lastUpdated: new Date().toISOString()
    };
  }
};

// Function to fetch live market data for investment plans
export const fetchLiveMarketData = async () => {
  try {
    // Fetch all data in parallel
    const [mutualFundsData, goldBondsData, stocksData, fixedDepositsData] = await Promise.all([
      // Mock mutual fund data - in a real implementation, you would fetch actual mutual fund symbols
      Promise.resolve([
        { id: 1, name: "Nifty 50 Index Fund", nav: 145.20, change: 1.2 },
        { id: 2, name: "ELSS Tax Saver", nav: 89.45, change: 2.1 }
      ]),
      fetchGoldBondData(),
      // Mock stock data - in a real implementation, you would fetch actual stock symbols
      Promise.resolve([
        { id: 1, name: "RELIANCE", price: 2450, change: 1.5 },
        { id: 2, name: "INFY", price: 1650, change: -0.8 }
      ]),
      fetchFixedDepositData()
    ]);

    return {
      mutualFunds: mutualFundsData,
      goldBonds: [goldBondsData],
      stocks: stocksData,
      fixedDeposits: [fixedDepositsData],
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching live market data:', error);
    // Return mock data in case of API failure
    return {
      mutualFunds: [
        { id: 1, name: "Nifty 50 Index Fund", nav: 145.20, change: 1.2 },
        { id: 2, name: "ELSS Tax Saver", nav: 89.45, change: 2.1 }
      ],
      goldBonds: [
        { id: 1, name: "SGB 2024", price: 6250, change: 0.8 }
      ],
      stocks: [
        { id: 1, name: "RELIANCE", price: 2450, change: 1.5 },
        { id: 2, name: "INFY", price: 1650, change: -0.8 }
      ],
      fixedDeposits: [
        { id: 1, name: "SBI FD", rate: 6.5, change: 0 }
      ],
      lastUpdated: new Date().toISOString()
    };
  }
};