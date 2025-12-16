import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Chain RPC endpoints for gas estimation
const CHAIN_RPC_ENDPOINTS: Record<string, string> = {
  'chain-0': 'https://eth.llamarpc.com', // Ethereum
  'chain-1': 'https://bitcoin.drpc.org', // Bitcoin (not used for gas)
  'chain-2': 'https://api.mainnet-beta.solana.com', // Solana
  'chain-3': 'https://bsc-dataseed1.binance.org', // BNB Chain
  'chain-8': 'https://api.trongrid.io', // TRON
};

// Default gas limits for different chain types
const DEFAULT_GAS_LIMITS: Record<string, number> = {
  'chain-0': 21000, // ETH
  'chain-3': 21000, // BNB
};

async function fetchGasPrice(chainId: string): Promise<{ gasPriceWei: bigint; gasPriceGwei: string } | null> {
  const rpcUrl = CHAIN_RPC_ENDPOINTS[chainId];
  if (!rpcUrl) return null;

  try {
    // Only EVM chains support eth_gasPrice
    if (chainId === 'chain-0' || chainId === 'chain-3') {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 1,
        }),
      });
      
      const data = await response.json();
      if (data.result) {
        const gasPriceWei = BigInt(data.result);
        const gasPriceGwei = (Number(gasPriceWei) / 1e9).toFixed(2);
        return { gasPriceWei, gasPriceGwei };
      }
    }
  } catch (error) {
    console.error(`Failed to fetch gas price for ${chainId}:`, error);
  }
  
  return null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Gas estimate endpoint
  app.get('/api/gas-estimate', async (req, res) => {
    const chainId = req.query.chainId as string;
    
    if (!chainId) {
      return res.json({
        gasPrice: '0',
        gasPriceGwei: '20',
        estimatedGas: '21000',
        estimatedFee: '0.00042',
        estimatedFeeUsd: null,
        symbol: 'ETH',
        error: 'No chain specified',
      });
    }

    // Determine chain symbol
    const chainSymbols: Record<string, string> = {
      'chain-0': 'ETH',
      'chain-1': 'BTC',
      'chain-2': 'SOL',
      'chain-3': 'BNB',
      'chain-8': 'TRX',
    };
    const symbol = chainSymbols[chainId] || 'ETH';

    // Fetch real gas price for EVM chains
    const gasData = await fetchGasPrice(chainId);
    
    if (gasData) {
      const gasLimit = DEFAULT_GAS_LIMITS[chainId] || 21000;
      const estimatedFeeWei = gasData.gasPriceWei * BigInt(gasLimit);
      const estimatedFee = (Number(estimatedFeeWei) / 1e18).toFixed(6);
      
      return res.json({
        gasPrice: gasData.gasPriceWei.toString(),
        gasPriceGwei: gasData.gasPriceGwei,
        estimatedGas: gasLimit.toString(),
        estimatedFee,
        estimatedFeeUsd: null, // Would need price data to calculate
        symbol,
      });
    }

    // Fallback for non-EVM chains or errors
    const fallbackFees: Record<string, { fee: string; unit: string }> = {
      'chain-1': { fee: '0.00001', unit: 'BTC' }, // Bitcoin
      'chain-2': { fee: '0.000005', unit: 'SOL' }, // Solana
      'chain-8': { fee: '0', unit: 'TRX' }, // TRON (free for most transfers)
    };

    const fallback = fallbackFees[chainId] || { fee: '0.0001', unit: symbol };
    
    return res.json({
      gasPrice: '0',
      gasPriceGwei: chainId === 'chain-0' || chainId === 'chain-3' ? '20' : 'N/A',
      estimatedGas: DEFAULT_GAS_LIMITS[chainId]?.toString() || 'N/A',
      estimatedFee: fallback.fee,
      estimatedFeeUsd: null,
      symbol: fallback.unit,
      error: 'Using estimated values',
    });
  });

  return httpServer;
}
