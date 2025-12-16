import { useState, useEffect, useMemo } from "react";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Copy, 
  ExternalLink,
  RefreshCw,
  Settings,
  Wallet,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useWallet } from "@/lib/wallet-context";
import { useToast } from "@/hooks/use-toast";
import { ChainIcon } from "@/components/chain-icon";
import { HardwareStatusCard, WalletModeSelector } from "@/components/hardware-status";
import { fetchPrices, formatUSD, calculateUSDValue, formatCryptoBalance, type PriceData } from "@/lib/price-service";
import type { Chain, Wallet as WalletType } from "@shared/schema";
import type { TopAsset } from "@/lib/price-service";
import { Link, useLocation } from "wouter";
import { getTokenBalanceForAsset, isTokenAsset, getCustomTokenBalance } from "@/lib/blockchain";
import { clientStorage, type CustomToken } from "@/lib/client-storage";

const formatBalance = formatCryptoBalance;

function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const COINGECKO_ID_TO_CHAIN_SYMBOL: Record<string, string> = {
  'ethereum': 'ETH',
  'matic-network': 'MATIC',
  'binancecoin': 'BNB',
  'avalanche-2': 'AVAX',
  'arbitrum': 'ARB',
  'bitcoin': 'BTC',
  'solana': 'SOL',
  'ripple': 'XRP',
  'dogecoin': 'DOGE',
  'cardano': 'ADA',
  'tron': 'TRX',
  'polkadot': 'DOT',
  'litecoin': 'LTC',
  'bitcoin-cash': 'BCH',
  'cosmos': 'ATOM',
  'osmosis': 'OSMO',
  'tether': 'ETH',
  'usd-coin': 'ETH',
  'staked-ether': 'ETH',
  'chainlink': 'ETH',
  'wrapped-bitcoin': 'ETH',
  'uniswap': 'ETH',
  'shiba-inu': 'ETH',
  'aave': 'ETH',
  'maker': 'ETH',
  'the-graph': 'ETH',
  'compound-governance-token': 'ETH',
  'yearn-finance': 'ETH',
  'sushi': 'ETH',
  'curve-dao-token': 'ETH',
  '1inch': 'ETH',
  'ens': 'ETH',
  'lido-dao': 'ETH',
  'rocket-pool': 'ETH',
  'frax': 'ETH',
  'dai': 'ETH',
  'pancakeswap-token': 'BNB',
  'venus': 'BNB',
  'baby-doge-coin': 'BNB',
  'trust-wallet-token': 'BNB',
  'raydium': 'SOL',
  'bonk': 'SOL',
  'jupiter-exchange-solana': 'SOL',
  'jito-governance-token': 'SOL',
  'trader-joe': 'AVAX',
  'benqi': 'AVAX',
  'gmx': 'ARB',
  'magic': 'ARB',
  'optimism': 'OP',
};

const TOKEN_PARENT_CHAIN: Record<string, string> = {
  'tether': 'Ethereum',
  'tether-bsc': 'BNB Smart Chain',
  'tether-tron': 'TRON',
  'usd-coin': 'Ethereum',
  'usd-coin-bsc': 'BNB Smart Chain',
  'usd-coin-tron': 'TRON',
  'staked-ether': 'Ethereum',
  'chainlink': 'Ethereum',
  'wrapped-bitcoin': 'Ethereum',
  'uniswap': 'Ethereum',
  'shiba-inu': 'Ethereum',
  'aave': 'Ethereum',
  'maker': 'Ethereum',
  'the-graph': 'Ethereum',
  'dai': 'Ethereum',
  'pancakeswap-token': 'BNB Smart Chain',
  'venus': 'BNB Smart Chain',
  'trust-wallet-token': 'BNB Smart Chain',
  'raydium': 'Solana',
  'bonk': 'Solana',
  'jupiter-exchange-solana': 'Solana',
  'jito-governance-token': 'Solana',
  'trader-joe': 'Avalanche',
  'benqi': 'Avalanche',
  'gmx': 'Arbitrum',
  'magic': 'Arbitrum',
  'optimism': 'Optimism',
};

const JSDELIVR_CDN = 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.16.1/128/color';
const COINGECKO_CDN = 'https://assets.coingecko.com/coins/images';

const CRYPTO_ICONS: Record<string, string> = {
  'bitcoin': `${JSDELIVR_CDN}/btc.png`,
  'ethereum': `${JSDELIVR_CDN}/eth.png`,
  'tether': `${JSDELIVR_CDN}/usdt.png`,
  'binancecoin': `${JSDELIVR_CDN}/bnb.png`,
  'solana': `${COINGECKO_CDN}/4128/small/solana.png`,
  'usd-coin': `${JSDELIVR_CDN}/usdc.png`,
  'ripple': `${JSDELIVR_CDN}/xrp.png`,
  'staked-ether': `${COINGECKO_CDN}/13442/small/steth_logo.png`,
  'dogecoin': `${JSDELIVR_CDN}/doge.png`,
  'cardano': `${JSDELIVR_CDN}/ada.png`,
  'tron': `${JSDELIVR_CDN}/trx.png`,
  'avalanche-2': `${COINGECKO_CDN}/12559/small/Avalanche_Circle_RedWhite_Trans.png`,
  'shiba-inu': `${COINGECKO_CDN}/11939/small/shiba.png`,
  'chainlink': `${COINGECKO_CDN}/877/small/chainlink-new-logo.png`,
  'wrapped-bitcoin': `${COINGECKO_CDN}/7598/small/wrapped_bitcoin_wbtc.png`,
  'polkadot': `${COINGECKO_CDN}/12171/small/polkadot.png`,
  'bitcoin-cash': `${JSDELIVR_CDN}/bch.png`,
  'matic-network': `${JSDELIVR_CDN}/matic.png`,
  'litecoin': `${JSDELIVR_CDN}/ltc.png`,
  'uniswap': `${COINGECKO_CDN}/12504/small/uniswap.png`,
  'cosmos': `${JSDELIVR_CDN}/atom.png`,
  'osmosis': `${COINGECKO_CDN}/16724/small/osmo.png`,
};

// View state for hierarchical navigation: chains -> wallets -> tokens
type ViewLevel = 'chains' | 'wallets' | 'tokens';

interface CombinedAssetCardProps {
  asset: TopAsset;
  wallet?: WalletType;
  chain?: Chain;
  prices: PriceData;
  tokenBalance?: string;
}

function CombinedAssetCard({ asset, wallet, chain, prices, tokenBalance }: CombinedAssetCardProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const hasWallet = wallet && chain;
  
  const parentChain = TOKEN_PARENT_CHAIN[asset.id];
  const isToken = !!parentChain;
  const displaySymbol = isToken ? asset.symbol.toUpperCase() : chain?.symbol || asset.symbol.toUpperCase();
  
  const effectiveBalance = isToken && tokenBalance ? tokenBalance : (hasWallet ? wallet.balance : "0");
  const balance = parseFloat(effectiveBalance);
  const usdValue = balance * (asset.currentPrice || 0);

  const copyAddress = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wallet) {
      navigator.clipboard.writeText(wallet.address);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard.",
      });
    }
  };

  const openExplorer = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (chain && wallet) {
      window.open(`${chain.blockExplorer}/address/${wallet.address}`, "_blank");
    }
  };

  const cardContent = (
    <Card className="hover-elevate cursor-pointer transition-all h-full" data-testid={`card-asset-${asset.id}`}>
      <CardContent className="p-3 sm:p-4 flex flex-col h-full">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {(asset.image || CRYPTO_ICONS[asset.id]) ? (
              <img
                src={asset.image || CRYPTO_ICONS[asset.id] || ''}
                alt={asset.name}
                className="h-10 w-10 rounded-full bg-muted shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : chain ? (
              <ChainIcon symbol={chain.symbol} iconColor={chain.iconColor} size="md" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{asset.name}</h3>
                <span
                  className={`text-xs font-medium shrink-0 ${
                    asset.priceChangePercentage24h >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {asset.priceChangePercentage24h >= 0 ? "+" : ""}{asset.priceChangePercentage24h.toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {asset.symbol.toUpperCase()}
                {parentChain && <span className="ml-1 opacity-70">on {parentChain}</span>}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            {hasWallet ? (
              <>
                <p className="font-semibold" data-testid={`text-value-${asset.id}`}>{formatUSD(usdValue)}</p>
                <p className="text-sm text-muted-foreground">{formatBalance(effectiveBalance)} {displaySymbol}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{formatUSD(asset.currentPrice)}</p>
            )}
          </div>
        </div>

        {hasWallet && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <code className="text-xs font-mono text-muted-foreground">
              {truncateAddress(wallet.address)}
            </code>
            <div className="flex gap-1">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={copyAddress}
                data-testid={`button-copy-${asset.id}`}
              >
                <Copy className="h-3 w-3" />
              </Button>
              {chain.blockExplorer && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={openExplorer}
                  data-testid={`button-explorer-${asset.id}`}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (hasWallet) {
    return (
      <Link href={`/wallet/${chain.id}/token/native`}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-12 w-48" />
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
              <Skeleton className="h-4 w-24 mt-4" />
              <Skeleton className="h-6 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isConnected, isUnlocked, chains, wallets, refreshBalances, refreshWalletBalance, topAssets, enabledAssetIds, isLoadingAssets, refreshTopAssets, createAdditionalWallet, createWalletWithNewSeed, walletMode, isLoading, selectedAccountIndex, setSelectedAccountIndex, availableAccounts, visibleWallets, customTokens, balanceCacheStatus, hasSoftWalletSetup, hasHardWalletSetup } = useWallet();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Read URL params for restoring navigation state
  const searchParams = new URLSearchParams(window.location.search);
  const chainParam = searchParams.get('chain');
  const walletParam = searchParams.get('wallet');
  
  const [prices, setPrices] = useState<PriceData>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [showCreateWalletDialog, setShowCreateWalletDialog] = useState(false);
  const [newWalletLabel, setNewWalletLabel] = useState("");
  const [walletCreationType, setWalletCreationType] = useState<"derive" | "new-seed">("derive");
  const [seedPinInput, setSeedPinInput] = useState("");
  const [showSeedRevealDialog, setShowSeedRevealDialog] = useState(false);
  const [newSeedPhrase, setNewSeedPhrase] = useState("");
  const [seedConfirmed, setSeedConfirmed] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [customTokenBalances, setCustomTokenBalances] = useState<Record<string, string>>({});
  
  // Hierarchical navigation state
  const [viewLevel, setViewLevel] = useState<ViewLevel>('chains');
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [stateInitialized, setStateInitialized] = useState(false);
  
  // Restore navigation state from URL params
  useEffect(() => {
    if (stateInitialized || chains.length === 0 || visibleWallets.length === 0) return;
    
    if (chainParam) {
      const chain = chains.find(c => c.id === chainParam);
      if (chain) {
        setSelectedChain(chain);
        if (walletParam) {
          const wallet = visibleWallets.find(w => w.id === walletParam);
          if (wallet) {
            setSelectedWallet(wallet);
            setViewLevel('tokens');
          } else {
            setViewLevel('wallets');
          }
        } else {
          setViewLevel('wallets');
        }
      }
    }
    setStateInitialized(true);
  }, [chainParam, walletParam, chains, visibleWallets, stateInitialized]);
  
  // Chain selection view state
  const [showAllAddedChains, setShowAllAddedChains] = useState(false);
  const [addingChainId, setAddingChainId] = useState<string | null>(null);
  const [showAddCustomChainDialog, setShowAddCustomChainDialog] = useState(false);
  
  // Multi-select chain state
  const [selectedChainIds, setSelectedChainIds] = useState<Set<string>>(new Set());
  const [isConfirmingChains, setIsConfirmingChains] = useState(false);
  const [customChainForm, setCustomChainForm] = useState({
    name: '',
    rpcUrl: '',
    chainId: '',
    symbol: '',
    explorerUrl: ''
  });

  useEffect(() => {
    fetchPrices().then(setPrices);
    const priceInterval = setInterval(() => {
      fetchPrices().then(setPrices);
    }, 5000);
    return () => clearInterval(priceInterval);
  }, []);

  useEffect(() => {
    if (wallets.length === 0) return;
    
    const walletAddresses: Record<string, string> = {};
    wallets.forEach(w => {
      const chain = chains.find(c => c.id === w.chainId);
      if (chain) {
        walletAddresses[chain.symbol] = w.address;
      }
    });

    const fetchTokenBalances = async () => {
      const tokenAssetIds = topAssets
        .filter(a => enabledAssetIds.has(a.id) && isTokenAsset(a.id))
        .map(a => a.id);
      
      const balancePromises = tokenAssetIds.map(async (assetId) => {
        try {
          const balance = await getTokenBalanceForAsset(assetId, walletAddresses);
          return [assetId, balance] as [string, string];
        } catch {
          return [assetId, "0"] as [string, string];
        }
      });
      
      const results = await Promise.all(balancePromises);
      const newBalances: Record<string, string> = {};
      results.forEach(([id, bal]) => {
        newBalances[id] = bal;
      });
      setTokenBalances(newBalances);
    };

    fetchTokenBalances();
    const tokenBalanceInterval = setInterval(fetchTokenBalances, 30000);
    return () => clearInterval(tokenBalanceInterval);
  }, [wallets.length, topAssets.length, enabledAssetIds.size, chains]);

  useEffect(() => {
    if (wallets.length === 0 || customTokens.length === 0) return;
    
    const walletAddresses: Record<string, string> = {};
    wallets.forEach(w => {
      const chain = chains.find(c => c.id === w.chainId);
      if (chain) {
        walletAddresses[chain.symbol] = w.address;
      }
    });

    const fetchCustomTokenBalances = async () => {
      const balancePromises = customTokens.map(async (token) => {
        const walletAddress = walletAddresses[token.chainId];
        if (!walletAddress) return [token.id, "0"] as [string, string];
        
        try {
          const balance = await getCustomTokenBalance(
            walletAddress,
            token.contractAddress,
            token.chainType,
            token.evmChainId || 0,
            token.rpcUrl || "",
            token.decimals
          );
          return [token.id, balance] as [string, string];
        } catch {
          return [token.id, "0"] as [string, string];
        }
      });
      
      const results = await Promise.all(balancePromises);
      const newBalances: Record<string, string> = {};
      results.forEach(([id, bal]) => {
        newBalances[id] = bal;
      });
      setCustomTokenBalances(newBalances);
    };

    fetchCustomTokenBalances();
    const customTokenBalanceInterval = setInterval(fetchCustomTokenBalances, 30000);
    return () => clearInterval(customTokenBalanceInterval);
  }, [wallets.length, customTokens.length, chains]);

  useEffect(() => {
    if (wallets.length === 0) return;
    const balanceInterval = setInterval(() => {
      // Only refresh selected wallet when viewing tokens, otherwise refresh all
      if (selectedWallet && viewLevel === 'tokens') {
        refreshWalletBalance(selectedWallet.id);
      } else {
        refreshBalances();
      }
    }, 5000);
    return () => clearInterval(balanceInterval);
  }, [wallets.length, refreshBalances, refreshWalletBalance, selectedWallet, viewLevel]);
  
  const displayChains = chains;
  const displayWallets = visibleWallets;

  const enabledAssets = topAssets.filter(asset => enabledAssetIds.has(asset.id));

  const getWalletForAsset = (asset: TopAsset): { wallet?: WalletType; chain?: Chain } => {
    // Check if this is a token - if so, look up by parent chain name
    const parentChainName = TOKEN_PARENT_CHAIN[asset.id];
    if (parentChainName) {
      // For tokens, find the parent chain by name
      const chain = displayChains.find(c => c.name === parentChainName);
      if (!chain) return {};
      const wallet = displayWallets.find(w => w.chainId === chain.id);
      return { wallet, chain };
    }
    
    // For native assets, use the symbol mapping
    const chainSymbol = COINGECKO_ID_TO_CHAIN_SYMBOL[asset.id];
    if (!chainSymbol) return {};
    
    const chain = displayChains.find(c => c.symbol === chainSymbol);
    if (!chain) return {};
    
    const wallet = displayWallets.find(w => w.chainId === chain.id);
    return { wallet, chain };
  };

  // Check if an asset has a wallet (either directly or via parent chain for tokens)
  const hasWalletForAsset = (asset: TopAsset): boolean => {
    const parentChainName = TOKEN_PARENT_CHAIN[asset.id];
    if (parentChainName) {
      // For tokens, check if parent chain has a wallet
      const parentChain = displayChains.find(c => c.name === parentChainName);
      if (!parentChain) return false;
      return displayWallets.some(w => w.chainId === parentChain.id);
    } else {
      // For native assets, check if the chain has a wallet
      const { wallet } = getWalletForAsset(asset);
      return !!wallet;
    }
  };

  // Filter and sort enabled assets
  // Only filter by wallet existence when wallet is unlocked and has wallets
  const filteredAssets = enabledAssets.filter(asset => {
    // Only filter by wallet if we have wallets (i.e., unlocked state)
    if (isUnlocked && displayWallets.length > 0) {
      if (!hasWalletForAsset(asset)) return false;
    }
    
    // Then apply search filter
    if (!assetSearch.trim()) return true;
    const searchLower = assetSearch.toLowerCase();
    return (
      asset.name.toLowerCase().includes(searchLower) ||
      asset.symbol.toLowerCase().includes(searchLower)
    );
  });

  // Sort enabled assets by USD value (highest first)
  const sortedEnabledAssets = [...filteredAssets].sort((a, b) => {
    const aData = getWalletForAsset(a);
    const bData = getWalletForAsset(b);
    
    const aIsToken = isTokenAsset(a.id);
    const bIsToken = isTokenAsset(b.id);
    
    const aValue = aIsToken && tokenBalances[a.id]
      ? parseFloat(tokenBalances[a.id]) * (a.currentPrice || 0)
      : (aData.wallet && aData.chain 
        ? calculateUSDValue(aData.wallet.balance, aData.chain.symbol, prices) 
        : 0);
    const bValue = bIsToken && tokenBalances[b.id]
      ? parseFloat(tokenBalances[b.id]) * (b.currentPrice || 0)
      : (bData.wallet && bData.chain 
        ? calculateUSDValue(bData.wallet.balance, bData.chain.symbol, prices) 
        : 0);
    
    if (bValue !== aValue) {
      return bValue - aValue;
    }
    return (a.marketCapRank || 999) - (b.marketCapRank || 999);
  });

  // Calculate total value from native coin wallets
  const nativeUSDValue = displayWallets.reduce((sum, w) => {
    const chain = displayChains.find(c => c.id === w.chainId);
    if (!chain) return sum;
    return sum + calculateUSDValue(w.balance, chain.symbol, prices);
  }, 0);

  // Calculate total value from token balances
  const tokenUSDValue = Object.entries(tokenBalances).reduce((sum, [assetId, balance]) => {
    const asset = topAssets.find(a => a.id === assetId);
    if (!asset) return sum;
    return sum + (parseFloat(balance) * (asset.currentPrice || 0));
  }, 0);

  const totalUSDValue = nativeUSDValue + tokenUSDValue;

  const hasWallets = displayWallets.length > 0;

  // Get chains that have wallets - for the chain selection view (use all wallets, not filtered by account)
  const chainsWithWallets = useMemo(() => {
    const chainIds = new Set(wallets.map(w => w.chainId));
    return displayChains.filter(c => chainIds.has(c.id));
  }, [displayChains, wallets]);

  // Get chains that don't have wallets yet - for "Add New Chain" section
  const chainsWithoutWallets = useMemo(() => {
    const chainIds = new Set(wallets.map(w => w.chainId));
    return displayChains.filter(c => !chainIds.has(c.id));
  }, [displayChains, wallets]);

  // Calculate balance per chain (across all wallets for the chain)
  const getChainBalance = (chain: Chain) => {
    const walletsForChain = wallets.filter(w => w.chainId === chain.id);
    return walletsForChain.reduce((sum, w) => sum + parseFloat(w.balance), 0);
  };

  const getChainUSDValue = (chain: Chain) => {
    const walletsForChain = wallets.filter(w => w.chainId === chain.id);
    return walletsForChain.reduce((sum, w) => {
      return sum + calculateUSDValue(w.balance, chain.symbol, prices);
    }, 0);
  };

  // Get ALL wallets for selected chain (not filtered by account index)
  const walletsForSelectedChain = useMemo(() => {
    if (!selectedChain) return [];
    return wallets.filter(w => w.chainId === selectedChain.id);
  }, [selectedChain, wallets]);

  // Get tokens for selected wallet (native + ERC20 tokens on that chain)
  const tokensForSelectedWallet = useMemo(() => {
    if (!selectedWallet || !selectedChain) return [];
    
    // Get native asset for this chain
    const nativeAsset = topAssets.find(a => {
      const chainSymbol = COINGECKO_ID_TO_CHAIN_SYMBOL[a.id];
      return chainSymbol === selectedChain.symbol && !TOKEN_PARENT_CHAIN[a.id];
    });
    
    // Get ERC20 tokens for this chain
    const tokenAssets = topAssets.filter(a => {
      const chainSymbol = COINGECKO_ID_TO_CHAIN_SYMBOL[a.id];
      return chainSymbol === selectedChain.symbol && TOKEN_PARENT_CHAIN[a.id] && enabledAssetIds.has(a.id);
    });
    
    const assets: TopAsset[] = [];
    if (nativeAsset) assets.push(nativeAsset);
    assets.push(...tokenAssets);
    
    return assets;
  }, [selectedWallet, selectedChain, topAssets, enabledAssetIds]);

  // Calculate selected wallet's total USD value (native + tokens)
  const selectedWalletUSDValue = useMemo(() => {
    if (!selectedWallet || !selectedChain) return 0;
    
    // Native balance USD value
    const nativeValue = calculateUSDValue(selectedWallet.balance, selectedChain.symbol, prices);
    
    // Token balances USD value for this chain
    const chainTokenValue = Object.entries(tokenBalances).reduce((sum, [assetId, balance]) => {
      const asset = topAssets.find(a => a.id === assetId);
      if (!asset) return sum;
      // Only count tokens on this chain
      const chainSymbol = COINGECKO_ID_TO_CHAIN_SYMBOL[assetId];
      if (chainSymbol !== selectedChain.symbol) return sum;
      return sum + (parseFloat(balance) * (asset.currentPrice || 0));
    }, 0);
    
    return nativeValue + chainTokenValue;
  }, [selectedWallet, selectedChain, prices, tokenBalances, topAssets]);

  // Calculate selected chain's total USD value (native + tokens across all wallets on this chain)
  const selectedChainUSDValue = useMemo(() => {
    if (!selectedChain) return 0;
    
    // Native balance USD value for all wallets on this chain
    const nativeValue = getChainUSDValue(selectedChain);
    
    // Token balances USD value for this chain
    const chainTokenValue = Object.entries(tokenBalances).reduce((sum, [assetId, balance]) => {
      const asset = topAssets.find(a => a.id === assetId);
      if (!asset) return sum;
      // Only count tokens on this chain
      const chainSymbol = COINGECKO_ID_TO_CHAIN_SYMBOL[assetId];
      if (chainSymbol !== selectedChain.symbol) return sum;
      return sum + (parseFloat(balance) * (asset.currentPrice || 0));
    }, 0);
    
    return nativeValue + chainTokenValue;
  }, [selectedChain, prices, tokenBalances, topAssets, wallets]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshBalances(),
        refreshTopAssets(),
        fetchPrices().then(setPrices)
      ]);
      toast({ title: "Refreshed", description: "Balances and prices updated" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateWallet = async () => {
    try {
      if (walletCreationType === "derive") {
        await createAdditionalWallet(newWalletLabel || undefined, selectedChain?.id);
        setShowCreateWalletDialog(false);
        setNewWalletLabel("");
        setWalletCreationType("derive");
        toast({ title: "Wallet Created", description: `New ${selectedChain?.name || ''} wallet has been created successfully` });
      } else {
        if (!seedPinInput || seedPinInput.length < 4) {
          toast({ title: "Error", description: "Please enter a PIN with at least 4 characters", variant: "destructive" });
          return;
        }
        const result = await createWalletWithNewSeed(newWalletLabel || undefined, seedPinInput);
        setNewSeedPhrase(result.seedPhrase);
        setShowCreateWalletDialog(false);
        setShowSeedRevealDialog(true);
        setNewWalletLabel("");
        setSeedPinInput("");
        setWalletCreationType("derive");
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to create new wallet";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
  };

  // Navigation handlers
  const handleSelectChain = (chain: Chain) => {
    setSelectedChain(chain);
    setSelectedWallet(null);
    setViewLevel('wallets');
  };

  const handleSelectWallet = (wallet: WalletType) => {
    setSelectedWallet(wallet);
    setViewLevel('tokens');
  };

  const handleBack = () => {
    if (viewLevel === 'tokens') {
      setSelectedWallet(null);
      setViewLevel('wallets');
    } else if (viewLevel === 'wallets') {
      setSelectedChain(null);
      setSelectedWallet(null);
      setViewLevel('chains');
    }
  };

  // Handle adding a new chain (create wallet for that chain)
  const handleAddChain = async (chain: Chain) => {
    // Haptic feedback on tap
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    try {
      setAddingChainId(chain.id);
      await createAdditionalWallet(undefined, chain.id);
      
      // Success haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
      
      toast({ 
        title: "Chain Added", 
        description: `${chain.name} has been added to your wallet.` 
      });
      // Automatically select the new chain
      setSelectedChain(chain);
      setViewLevel('wallets');
    } catch (err: any) {
      // Error haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      toast({ 
        title: "Error", 
        description: err?.message || "Failed to add chain", 
        variant: "destructive" 
      });
    } finally {
      setAddingChainId(null);
    }
  };

  // Toggle chain selection for multi-select
  const handleToggleChainSelection = (chainId: string) => {
    if (isConfirmingChains) return;
    
    setSelectedChainIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chainId)) {
        newSet.delete(chainId);
      } else {
        newSet.add(chainId);
      }
      return newSet;
    });
  };

  // Confirm and add all selected chains
  const handleConfirmSelectedChains = async () => {
    if (selectedChainIds.size === 0) return;
    
    // Check if wallet is unlocked before attempting to add chains
    if (!isUnlocked) {
      toast({
        title: "Wallet Locked",
        description: "Please unlock your wallet first to add new networks.",
        variant: "destructive"
      });
      return;
    }
    
    setIsConfirmingChains(true);
    
    try {
      const chainIdsArray = Array.from(selectedChainIds);
      
      // Add chains sequentially to avoid race conditions with wallet state
      const successfulChainIds: string[] = [];
      const failedChainIds: string[] = [];
      
      for (const chainId of chainIdsArray) {
        try {
          await createAdditionalWallet(undefined, chainId);
          successfulChainIds.push(chainId);
        } catch {
          failedChainIds.push(chainId);
        }
      }
      
      // Clear only successfully added chains from selection
      if (successfulChainIds.length > 0) {
        setSelectedChainIds(prev => {
          const newSet = new Set(prev);
          successfulChainIds.forEach(id => newSet.delete(id));
          return newSet;
        });
        
        // Success haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([50, 30, 50]);
        }
        
        toast({ 
          title: "Chains Added", 
          description: `${successfulChainIds.length} chain${successfulChainIds.length > 1 ? 's have' : ' has'} been added to your wallet.` 
        });
      }
      
      // Show error for failed chains
      if (failedChainIds.length > 0) {
        const failedNames = failedChainIds
          .map(id => displayChains.find(c => c.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        
        // Error haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        
        toast({ 
          title: "Some Chains Failed", 
          description: `Failed to add: ${failedNames}. They remain selected for retry.`, 
          variant: "destructive" 
        });
      }
    } catch (err: any) {
      // Error haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      toast({ 
        title: "Error", 
        description: err?.message || "Failed to add chains", 
        variant: "destructive" 
      });
    } finally {
      setIsConfirmingChains(false);
    }
  };

  // Handle adding a custom chain
  const handleAddCustomChain = async () => {
    try {
      // For now, just show a message - actual custom chain implementation would require backend support
      toast({ 
        title: "Coming Soon", 
        description: "Custom chain support will be available in a future update." 
      });
      setShowAddCustomChainDialog(false);
      setCustomChainForm({ name: '', rpcUrl: '', chainId: '', symbol: '', explorerUrl: '' });
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err?.message || "Failed to add custom chain", 
        variant: "destructive" 
      });
    }
  };
  
  // Check if wallet is set up based on mode
  const isWalletSetUp = walletMode === "soft_wallet" ? hasSoftWalletSetup : hasHardWalletSetup;
  
  // Only show setup screen if wallet is NOT set up
  // If wallet is set up but has no chains, we still show the chain selection UI
  if (!hasWallets && !isWalletSetUp) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="mb-4 md:mb-6 text-2xl md:text-3xl font-bold">Dashboard</h1>
        <HardwareStatusCard />
      </div>
    );
  }

  // Soft Wallet - Hierarchical Flow: Chains -> Wallets -> Tokens
  if (walletMode === "soft_wallet") {
    return (
      <div className="h-screen bg-background flex flex-col">
        {/* Header - Only show full header when chain is selected */}
        {viewLevel !== 'chains' && (
          <div className="shrink-0 bg-background">
            {/* Title Row */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid="button-back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="font-semibold">
                  {viewLevel === 'wallets' && `${selectedChain?.name}`}
                  {viewLevel === 'tokens' && `${selectedChain?.name} Wallet`}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing || balanceCacheStatus.isRefreshing}
                data-testid="button-refresh-portfolio"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing || balanceCacheStatus.isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
            
            {/* Balance Display */}
            <div className="text-center py-4 px-4">
              <p className="text-sm text-muted-foreground mb-1">
                {viewLevel === 'tokens' && selectedWallet ? 'Wallet Balance' : 
                 viewLevel === 'wallets' && selectedChain ? `${selectedChain.name} Balance` : 'Total Balance'}
              </p>
              <h2 className="text-3xl font-bold" data-testid="text-portfolio-value">
                {formatUSD(
                  viewLevel === 'tokens' && selectedWallet ? selectedWalletUSDValue : 
                  viewLevel === 'wallets' && selectedChain ? selectedChainUSDValue : totalUSDValue
                )}
              </h2>
            </div>

            {/* Action Buttons - Blue Pill Style */}
            <div className="flex gap-3 px-4 pb-4">
              <Link href={`/transfer?type=send${selectedChain ? `&chain=${selectedChain.id}` : ''}`} className="flex-1">
                <Button className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium" data-testid="button-send">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </Link>
              <Link href={`/transfer?type=receive${selectedChain ? `&chain=${selectedChain.id}` : ''}`} className="flex-1">
                <Button className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium" data-testid="button-receive">
                  <ArrowDownLeft className="h-4 w-4 mr-2" />
                  Receive
                </Button>
              </Link>
            </div>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 text-sm border-y">
              <button 
                onClick={() => { setViewLevel('chains'); setSelectedChain(null); setSelectedWallet(null); }}
                className="text-muted-foreground hover:text-foreground"
                data-testid="breadcrumb-chains"
              >
                Chains
              </button>
              {selectedChain && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  {viewLevel === 'tokens' ? (
                    <Select
                      value={selectedChain.id}
                      onValueChange={(chainId) => {
                        const chain = chainsWithWallets.find(c => c.id === chainId);
                        if (chain) {
                          setSelectedChain(chain);
                          setSelectedWallet(null);
                          setViewLevel('wallets');
                        }
                      }}
                    >
                      <SelectTrigger className="h-auto text-sm border-0 bg-transparent px-0 py-0 gap-1 w-auto" data-testid="select-chain-dropdown">
                        <div className="flex items-center gap-2">
                          <ChainIcon symbol={selectedChain.symbol} iconColor={selectedChain.iconColor} size="sm" />
                          <span>{selectedChain.name}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {chainsWithWallets.map((chain) => (
                          <SelectItem key={chain.id} value={chain.id} data-testid={`select-chain-option-${chain.symbol}`}>
                            <div className="flex items-center gap-2">
                              <ChainIcon symbol={chain.symbol} iconColor={chain.iconColor} size="sm" />
                              <span>{chain.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <button 
                      onClick={() => { setViewLevel('wallets'); setSelectedWallet(null); }}
                      className={`flex items-center gap-2 ${viewLevel === 'wallets' ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      data-testid="breadcrumb-wallets"
                    >
                      <ChainIcon symbol={selectedChain.symbol} iconColor={selectedChain.iconColor} size="sm" />
                      {selectedChain.name}
                    </button>
                  )}
                </>
              )}
              {selectedWallet && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground" data-testid="breadcrumb-tokens">
                    Tokens
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Main Content - Side by Side Layout */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Column: Chain List (hidden on mobile and when wallet selected) */}
          {viewLevel !== 'tokens' && (
            <div className="hidden md:flex w-20 flex-col min-h-0">
              <div className="flex-1 overflow-y-auto py-2 scrollbar-hide" style={{ overscrollBehavior: 'contain', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {chainsWithWallets.map((chain) => (
                  <div
                    key={chain.id}
                    className={`p-3 cursor-pointer flex justify-center hover-elevate ${selectedChain?.id === chain.id ? 'bg-muted border-r-2 border-primary' : ''}`}
                    onClick={() => {
                      setSelectedChain(chain);
                      setSelectedWallet(null);
                      setViewLevel('wallets');
                    }}
                    data-testid={`chain-icon-${chain.symbol}`}
                  >
                    <ChainIcon symbol={chain.symbol} iconColor={chain.iconColor} size="lg" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right Column: Wallet List for Selected Chain */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-4" style={{ overscrollBehavior: 'contain' }}>
            {!selectedChain ? (
              <div className="flex flex-col h-full relative">
                <div className="flex-1 overflow-y-auto space-y-6 pb-20">
                  {/* Loading shimmer when fetching chains */}
                  {isLoading && chains.length === 0 && (
                    <div>
                      <div className="h-6 w-32 bg-muted rounded animate-pulse mb-3" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <Card key={i} data-testid={`skeleton-chain-${i}`}>
                            <CardContent className="p-3 flex flex-col items-center gap-2">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <Skeleton className="h-3 w-16" />
                              <Skeleton className="h-3 w-12" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 1: Previously Added Chains */}
                  {!isLoading && chainsWithWallets.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 border-b mb-4">
                        <h3 className="font-bold text-base tracking-tight" data-testid="text-your-chains">Your Chains</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{chainsWithWallets.length} network{chainsWithWallets.length !== 1 ? 's' : ''} active</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {chainsWithWallets.slice(0, showAllAddedChains ? undefined : 6).map((chain, index) => (
                          <Card
                            key={chain.id}
                            className="hover-elevate cursor-pointer relative transition-all duration-200 active:scale-[0.98]"
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              setSelectedChain(chain);
                              setSelectedWallet(null);
                              setViewLevel('wallets');
                            }}
                            data-testid={`card-chain-${chain.symbol}`}
                          >
                            <CardContent className="p-4 flex flex-col items-center gap-3">
                              <div className="relative">
                                <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center">
                                  <ChainIcon symbol={chain.symbol} iconColor={chain.iconColor} size="lg" />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-green-500 dark:bg-green-500 flex items-center justify-center ring-2 ring-background">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              </div>
                              <div className="text-center w-full">
                                <span className="text-sm font-semibold block truncate">{chain.name}</span>
                                <span className="text-sm font-medium text-foreground mt-1 block" data-testid={`text-balance-${chain.symbol}`}>{formatUSD(getChainUSDValue(chain))}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {chainsWithWallets.length > 6 && (
                        <Button
                          variant="ghost"
                          className="w-full mt-3"
                          onClick={() => setShowAllAddedChains(!showAllAddedChains)}
                          data-testid="button-view-all-chains"
                        >
                          {showAllAddedChains ? 'Show Less' : `View All ${chainsWithWallets.length} Chains`}
                          <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showAllAddedChains ? 'rotate-90' : ''}`} />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Empty state when no chains added yet */}
                  {!isLoading && chainsWithWallets.length === 0 && chainsWithoutWallets.length > 0 && (
                    <div className="text-center py-10 px-6 bg-gradient-to-b from-primary/5 to-transparent rounded-xl border border-dashed border-primary/20" data-testid="empty-state-no-chains">
                      <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-8 w-8 text-primary" />
                      </div>
                      <p className="font-semibold text-lg text-foreground mb-1">Get Started</p>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">Select the blockchain networks you want to add to your wallet</p>
                    </div>
                  )}

                  {/* Section 2: Add New Chains - Multi-select */}
                  {!isLoading && chainsWithoutWallets.length > 0 && (
                    <div className="mt-2">
                      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 border-b mb-4">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-base tracking-tight" data-testid="text-add-new-chain">Add Networks</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{chainsWithoutWallets.length} available</p>
                          </div>
                          {selectedChainIds.size > 0 && (
                            <Badge 
                              variant="secondary" 
                              className="cursor-pointer"
                              onClick={() => !isConfirmingChains && setSelectedChainIds(new Set())}
                              data-testid="button-clear-selection"
                            >
                              {selectedChainIds.size} selected
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {chainsWithoutWallets.map((chain) => {
                          const isSelected = selectedChainIds.has(chain.id);
                          return (
                            <Card
                              key={chain.id}
                              className={`cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                                isSelected 
                                  ? 'ring-2 ring-primary shadow-md shadow-primary/10' 
                                  : 'hover-elevate'
                              } ${isConfirmingChains ? 'opacity-50 pointer-events-none' : ''}`}
                              onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                handleToggleChainSelection(chain.id);
                              }}
                              data-testid={`card-add-chain-${chain.symbol}`}
                            >
                              <CardContent className="p-4 flex flex-col items-center gap-3">
                                <div className="relative">
                                  <div className={`h-14 w-14 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-primary/10' : 'bg-muted/50'}`}>
                                    <ChainIcon 
                                      symbol={chain.symbol} 
                                      iconColor={chain.iconColor} 
                                      size="lg" 
                                    />
                                  </div>
                                  {isSelected && (
                                    <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
                                      <Check className="h-3 w-3 text-primary-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="text-center w-full">
                                  <span className="text-sm font-semibold block truncate">{chain.name}</span>
                                  <span className={`text-xs mt-1 block ${isSelected ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                    {isSelected ? 'Selected' : 'Tap to add'}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Empty state if no chains at all (shouldn't happen normally) */}
                  {!isLoading && chainsWithWallets.length === 0 && chainsWithoutWallets.length === 0 && (
                    <div className="text-center py-12" data-testid="empty-state-no-available">
                      <Wallet className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No chains available</p>
                    </div>
                  )}
                </div>

                {/* Sticky Footer - Confirm Button or Add Custom Chain */}
                <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t pb-[env(safe-area-inset-bottom)]">
                  <div className="p-4 space-y-2">
                    {/* Confirm Selection Button - shows when chains are selected */}
                    {selectedChainIds.size > 0 && (
                      <Button 
                        className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20" 
                        onClick={handleConfirmSelectedChains}
                        disabled={isConfirmingChains}
                        data-testid="button-confirm-chains"
                      >
                        {isConfirmingChains ? (
                          <>
                            <div className="h-5 w-5 mr-2 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                            Adding {selectedChainIds.size} Network{selectedChainIds.size > 1 ? 's' : ''}...
                          </>
                        ) : (
                          <>
                            <Check className="h-5 w-5 mr-2" />
                            Add {selectedChainIds.size} Network{selectedChainIds.size > 1 ? 's' : ''}
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Add Custom Chain Button */}
                    <Dialog open={showAddCustomChainDialog} onOpenChange={setShowAddCustomChainDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          className={`w-full ${selectedChainIds.size > 0 ? 'h-10' : 'h-12 text-base font-semibold rounded-xl'}`}
                          variant={selectedChainIds.size > 0 ? "ghost" : "outline"}
                          data-testid="button-add-custom-chain"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Custom Network
                        </Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Custom Chain</DialogTitle>
                        <DialogDescription>
                          Enter the details for your custom blockchain network.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="custom-chain-name">Chain Name</Label>
                          <Input
                            id="custom-chain-name"
                            placeholder="e.g., My Network"
                            value={customChainForm.name}
                            onChange={(e) => setCustomChainForm({ ...customChainForm, name: e.target.value })}
                            className="mt-1"
                            data-testid="input-custom-chain-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="custom-chain-rpc">RPC URL</Label>
                          <Input
                            id="custom-chain-rpc"
                            placeholder="https://rpc.example.com"
                            value={customChainForm.rpcUrl}
                            onChange={(e) => setCustomChainForm({ ...customChainForm, rpcUrl: e.target.value })}
                            className="mt-1"
                            data-testid="input-custom-chain-rpc"
                          />
                        </div>
                        <div>
                          <Label htmlFor="custom-chain-id">Chain ID</Label>
                          <Input
                            id="custom-chain-id"
                            placeholder="e.g., 1"
                            type="number"
                            value={customChainForm.chainId}
                            onChange={(e) => setCustomChainForm({ ...customChainForm, chainId: e.target.value })}
                            className="mt-1"
                            data-testid="input-custom-chain-id"
                          />
                        </div>
                        <div>
                          <Label htmlFor="custom-chain-symbol">Currency Symbol</Label>
                          <Input
                            id="custom-chain-symbol"
                            placeholder="e.g., ETH"
                            value={customChainForm.symbol}
                            onChange={(e) => setCustomChainForm({ ...customChainForm, symbol: e.target.value })}
                            className="mt-1"
                            data-testid="input-custom-chain-symbol"
                          />
                        </div>
                        <div>
                          <Label htmlFor="custom-chain-explorer">Block Explorer URL (optional)</Label>
                          <Input
                            id="custom-chain-explorer"
                            placeholder="https://explorer.example.com"
                            value={customChainForm.explorerUrl}
                            onChange={(e) => setCustomChainForm({ ...customChainForm, explorerUrl: e.target.value })}
                            className="mt-1"
                            data-testid="input-custom-chain-explorer"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {
                          setShowAddCustomChainDialog(false);
                          setCustomChainForm({ name: '', rpcUrl: '', chainId: '', symbol: '', explorerUrl: '' });
                        }}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddCustomChain} 
                          disabled={!customChainForm.name || !customChainForm.rpcUrl || !customChainForm.chainId || !customChainForm.symbol}
                          data-testid="button-save-custom-chain"
                        >
                          Add Chain
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ) : viewLevel === 'wallets' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">
                    {selectedChain.name} Wallets
                  </h3>
                  <div className="flex items-center gap-1">
                    <Dialog open={showCreateWalletDialog} onOpenChange={setShowCreateWalletDialog}>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" data-testid="button-create-chain-wallet">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create {selectedChain.name} Wallet</DialogTitle>
                          <DialogDescription>
                            Create a new wallet for {selectedChain.name}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <div>
                            <Label htmlFor="wallet-label">Wallet Label (optional)</Label>
                            <Input
                              id="wallet-label"
                              placeholder="e.g., Savings, Trading, DeFi"
                              value={newWalletLabel}
                              onChange={(e) => setNewWalletLabel(e.target.value)}
                              className="mt-2"
                              data-testid="input-wallet-label"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label>Wallet Type</Label>
                            <RadioGroup 
                              value={walletCreationType} 
                              onValueChange={(val) => setWalletCreationType(val as "derive" | "new-seed")}
                              className="space-y-2"
                            >
                              <div className="flex items-start gap-3 p-3 rounded-md border">
                                <RadioGroupItem value="derive" id="derive" className="mt-0.5" data-testid="radio-derive" />
                                <div className="flex-1">
                                  <Label htmlFor="derive" className="font-medium cursor-pointer">Derive from existing seed</Label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Uses your main seed phrase with a new account index.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3 p-3 rounded-md border">
                                <RadioGroupItem value="new-seed" id="new-seed" className="mt-0.5" data-testid="radio-new-seed" />
                                <div className="flex-1">
                                  <Label htmlFor="new-seed" className="font-medium cursor-pointer">Generate new seed phrase</Label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Creates a completely independent wallet with its own seed phrase.
                                  </p>
                                </div>
                              </div>
                            </RadioGroup>
                            {walletCreationType === "new-seed" && (
                              <div className="pt-2">
                                <Label htmlFor="seed-pin">PIN for new seed (min 4 characters)</Label>
                                <Input
                                  id="seed-pin"
                                  type="password"
                                  placeholder="Enter PIN to encrypt new seed"
                                  value={seedPinInput}
                                  onChange={(e) => setSeedPinInput(e.target.value)}
                                  className="mt-2"
                                  data-testid="input-seed-pin"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => {
                            setShowCreateWalletDialog(false);
                            setWalletCreationType("derive");
                            setSeedPinInput("");
                          }}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateWallet} disabled={isLoading} data-testid="button-confirm-create-wallet">
                            {isLoading ? "Creating..." : "Create Wallet"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href="/manage-crypto">
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {walletsForSelectedChain.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Wallet className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No wallets for {selectedChain.name}</p>
                    </CardContent>
                  </Card>
                ) : (
                  walletsForSelectedChain.map((wallet, index) => {
                    const usdValue = calculateUSDValue(wallet.balance, selectedChain.symbol, prices);

                    return (
                      <Card 
                        key={wallet.id}
                        className="hover-elevate cursor-pointer"
                        onClick={() => handleSelectWallet(wallet)}
                        data-testid={`card-wallet-${wallet.id}`}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-2 sm:gap-4">
                            <ChainIcon symbol={selectedChain.symbol} iconColor={selectedChain.iconColor} size="lg" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold">
                                {wallet.label || `Wallet ${index + 1}`}
                              </h3>
                              <p className="text-sm text-muted-foreground font-mono">
                                {truncateAddress(wallet.address)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatUSD(usdValue)}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatBalance(wallet.balance)} {selectedChain.symbol}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            ) : viewLevel === 'tokens' && selectedWallet ? (
            <div className="space-y-3">
              {/* Wallet Holdings Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Wallet Holdings</h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    {truncateAddress(selectedWallet.address)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedWallet.address);
                      toast({ title: "Copied", description: "Address copied to clipboard" });
                    }}
                    data-testid="button-copy-address"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {selectedChain.blockExplorer && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => window.open(`${selectedChain.blockExplorer}/address/${selectedWallet.address}`, "_blank")}
                      data-testid="button-open-explorer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Native Token Card */}
              <Card 
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate(`/wallet/${selectedChain.id}/token/native`)}
                data-testid={`card-token-native`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <ChainIcon symbol={selectedChain.symbol} iconColor={selectedChain.iconColor} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{selectedChain.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedChain.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatUSD(calculateUSDValue(selectedWallet.balance, selectedChain.symbol, prices))}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBalance(selectedWallet.balance)} {selectedChain.symbol}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ERC20 Tokens */}
              {tokensForSelectedWallet
                .filter(a => TOKEN_PARENT_CHAIN[a.id])
                .map((token) => {
                  const balance = tokenBalances[token.id] || "0";
                  const balanceNum = parseFloat(balance);
                  const usdValue = balanceNum * (token.currentPrice || 0);

                  return (
                    <Card key={token.id} data-testid={`card-token-${token.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {(token.image || CRYPTO_ICONS[token.id]) ? (
                            <img
                              src={token.image || CRYPTO_ICONS[token.id] || ''}
                              alt={token.name}
                              className="h-10 w-10 rounded-full bg-muted"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                              {token.symbol.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold">{token.name}</h3>
                            <p className="text-sm text-muted-foreground">{token.symbol.toUpperCase()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatUSD(usdValue)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatBalance(balance)} {token.symbol.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

              {/* Custom Tokens for this wallet */}
              {customTokens
                .filter(t => t.chainId === selectedChain.symbol && (!t.walletId || t.walletId === selectedWallet.id))
                .map((token) => {
                  const balance = customTokenBalances[token.id] || "0";
                  
                  return (
                    <Card 
                      key={token.id} 
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => navigate(`/wallet/${selectedChain.id}/token/${token.id}`)}
                      data-testid={`card-custom-token-${token.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                            {token.symbol.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{token.name}</h3>
                              <Badge variant="outline" className="text-xs">Custom</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{token.symbol}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatBalance(balance)} {token.symbol}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

              {/* Add Custom Token Button */}
              <Card className="hover-elevate cursor-pointer" data-testid="card-add-custom-token">
                <Link href={`/manage-crypto?chain=${selectedChain.symbol}&wallet=${selectedWallet.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">Add Custom Token</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedChain.symbol === 'ETH' ? 'Import ERC-20 tokens' :
                           selectedChain.symbol === 'BNB' ? 'Import BEP-20 tokens' :
                           selectedChain.symbol === 'MATIC' ? 'Import Polygon tokens' :
                           selectedChain.symbol === 'ARB' ? 'Import Arbitrum tokens' :
                           selectedChain.symbol === 'TRX' ? 'Import TRC-20 tokens' :
                           `Import ${selectedChain.name} tokens`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </div>
            ) : null}
          </div>
        </div>

        {/* Seed Reveal Dialog */}
        <Dialog open={showSeedRevealDialog} onOpenChange={(open) => {
          if (!open && !seedConfirmed) return;
          setShowSeedRevealDialog(open);
          if (!open) {
            setNewSeedPhrase("");
            setSeedConfirmed(false);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Your New Seed Phrase</DialogTitle>
              <DialogDescription>
                Write down these 12 words and store them securely.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-muted rounded-md font-mono text-sm break-words" data-testid="text-seed-phrase">
              {newSeedPhrase}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Checkbox 
                id="seed-confirmed" 
                checked={seedConfirmed} 
                onCheckedChange={(checked) => setSeedConfirmed(!!checked)} 
                data-testid="checkbox-seed-confirmed"
              />
              <Label htmlFor="seed-confirmed" className="cursor-pointer">I have written down my seed phrase</Label>
            </div>
            <DialogFooter>
              <Button disabled={!seedConfirmed} onClick={() => {
                setShowSeedRevealDialog(false);
                setNewSeedPhrase("");
                setSeedConfirmed(false);
                toast({ title: "Wallet Created", description: "New wallet with independent seed created" });
              }} data-testid="button-seed-done">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Original card-based layout for Hard Wallet mode
  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 md:mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <WalletModeSelector />
        </div>
      </div>

      <Card className="mb-4 md:mb-6">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <p className="text-xs md:text-sm text-muted-foreground">
                Hard Wallet Portfolio
              </p>
            </div>
            <div className="flex items-center gap-2">
              {balanceCacheStatus.isStale && balanceCacheStatus.lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {clientStorage.getCacheAge(balanceCacheStatus.lastUpdated)}
                </span>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing || balanceCacheStatus.isRefreshing}
                data-testid="button-refresh-portfolio"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing || balanceCacheStatus.isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-baseline gap-4">
            <h2 className="text-2xl md:text-4xl font-bold" data-testid="text-portfolio-value">
              {formatUSD(totalUSDValue)}
            </h2>
            {balanceCacheStatus.isRefreshing && (
              <span className="text-xs text-muted-foreground animate-pulse">
                Refreshing...
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Your Assets</h2>
            <Dialog open={showCreateWalletDialog} onOpenChange={setShowCreateWalletDialog}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" data-testid="button-create-wallet">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Wallet</DialogTitle>
                  <DialogDescription>
                    Create an additional wallet for your portfolio.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div>
                    <Label htmlFor="wallet-label">Wallet Label (optional)</Label>
                    <Input
                      id="wallet-label"
                      placeholder="e.g., Savings, Trading, DeFi"
                      value={newWalletLabel}
                      onChange={(e) => setNewWalletLabel(e.target.value)}
                      className="mt-2"
                      data-testid="input-wallet-label"
                    />
                  </div>
                  
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setShowCreateWalletDialog(false);
                    setWalletCreationType("derive");
                    setSeedPinInput("");
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWallet} disabled={isLoading} data-testid="button-confirm-create-wallet">
                    {isLoading ? "Creating..." : "Create Wallet"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showSeedRevealDialog} onOpenChange={(open) => {
              if (!open && !seedConfirmed) return;
              setShowSeedRevealDialog(open);
              if (!open) {
                setNewSeedPhrase("");
                setSeedConfirmed(false);
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Your New Seed Phrase</DialogTitle>
                  <DialogDescription>
                    Write down these 12 words and store them securely. You will need them to recover this wallet.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-4 bg-muted rounded-md font-mono text-sm break-words" data-testid="text-seed-phrase">
                  {newSeedPhrase}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Checkbox 
                    id="seed-confirmed" 
                    checked={seedConfirmed} 
                    onCheckedChange={(checked) => setSeedConfirmed(!!checked)} 
                    data-testid="checkbox-seed-confirmed"
                  />
                  <Label htmlFor="seed-confirmed" className="cursor-pointer">I have written down my seed phrase</Label>
                </div>
                <DialogFooter>
                  <Button disabled={!seedConfirmed} onClick={() => {
                    setShowSeedRevealDialog(false);
                    setNewSeedPhrase("");
                    setSeedConfirmed(false);
                    toast({ title: "Wallet Created", description: "New wallet with independent seed created" });
                  }} data-testid="button-seed-done">
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                className="pl-8 h-8 w-40 sm:w-48"
                data-testid="input-search-assets"
              />
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/manage-crypto">
                <Settings className="mr-1 h-4 w-4" />
                Manage
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/chains">
                View All
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {isLoadingAssets ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-24 mt-4" />
                  <Skeleton className="h-6 w-32 mt-2" />
                  <Skeleton className="h-10 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedEnabledAssets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No assets enabled</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Enable assets to track in Manage Crypto
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/manage-crypto">Manage Crypto</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedEnabledAssets.map((asset) => {
              const { wallet, chain } = getWalletForAsset(asset);
              return (
                <CombinedAssetCard
                  key={asset.id}
                  asset={asset}
                  wallet={wallet}
                  chain={chain}
                  prices={prices}
                  tokenBalance={tokenBalances[asset.id]}
                />
              );
            })}
            {customTokens.map((token) => {
              const balance = customTokenBalances[token.id] || "0";
              return (
                <Card key={token.id} className="hover-elevate transition-all h-full" data-testid={`card-custom-token-${token.id}`}>
                  <CardContent className="p-3 sm:p-4 flex flex-col h-full">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold shrink-0">
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate text-sm">{token.name}</h3>
                            <Badge variant="outline" className="text-xs shrink-0">Custom</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {token.symbol} on {token.chainId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm">{formatBalance(balance)}</p>
                        <p className="text-xs text-muted-foreground">{token.symbol}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
