import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  Copy,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/wallet-context";
import { useToast } from "@/hooks/use-toast";
import { ChainIcon } from "@/components/chain-icon";
import { fetchPrices, formatUSD, formatCryptoBalance, type PriceData } from "@/lib/price-service";
import type { ParsedTransaction } from "@/lib/explorer-service";
import { TOKEN_PARENT_CHAIN } from "@/lib/chain-mappings";

const COINGECKO_ID_BY_SYMBOL: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'TRX': 'tron',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2',
  'ARB': 'arbitrum',
};

const formatBalance = formatCryptoBalance;

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function TokenDetail() {
  const params = useParams<{ chainId: string; tokenId: string }>();
  const { chainId, tokenId } = params;
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { chains, visibleWallets, customTokens, topAssets, refreshWalletBalance } = useWallet();
  
  const [prices, setPrices] = useState<PriceData>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);

  const chain = chains.find(c => c.id === chainId);
  const wallet = visibleWallets.find(w => w.chainId === chainId);
  
  const isNativeToken = tokenId === "native" || tokenId === chain?.symbol;
  
  // Check if it's a standard token from topAssets (like USDT, USDC)
  const standardToken = !isNativeToken ? topAssets.find(a => a.id === tokenId) : null;
  const isStandardToken = !!standardToken && !!TOKEN_PARENT_CHAIN[standardToken.id];
  
  const customToken = !isNativeToken && !isStandardToken ? customTokens.find(t => 
    t.id === tokenId || t.contractAddress.toLowerCase() === tokenId?.toLowerCase()
  ) : null;

  const tokenSymbol = isNativeToken ? chain?.symbol : (standardToken?.symbol?.toUpperCase() || customToken?.symbol);
  const tokenName = isNativeToken ? chain?.name : (standardToken?.name || customToken?.name);
  const tokenBalance = isNativeToken ? wallet?.balance || "0" : "0";
  const tokenContractAddress = customToken?.contractAddress;

  const coingeckoId = tokenSymbol ? COINGECKO_ID_BY_SYMBOL[tokenSymbol] : undefined;
  const topAsset = standardToken || (coingeckoId ? topAssets.find(a => a.id === coingeckoId) : undefined);
  const price = topAsset?.currentPrice || (tokenSymbol ? prices[tokenSymbol] : 0) || 0;
  const priceChange24h = topAsset?.priceChangePercentage24h || 0;
  const usdValue = parseFloat(tokenBalance) * price;

  useEffect(() => {
    fetchPrices().then(setPrices).catch(console.error);
  }, [tokenSymbol]);

  const handleRefresh = async () => {
    if (!wallet) return;
    setIsRefreshing(true);
    try {
      await refreshWalletBalance(wallet.id);
      const newPrices = await fetchPrices();
      setPrices(newPrices);
      toast({ title: "Refreshed", description: "Balance updated successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to refresh", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  };

  if (!chain || !wallet) {
    return (
      <div className="p-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <p className="text-center text-muted-foreground mt-8">Token not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/?chain=${chainId}&wallet=${wallet?.id || ''}`)}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <ChainIcon symbol={tokenSymbol || ""} size="md" />
              <div>
                <h1 className="text-lg font-semibold">{tokenName}</h1>
                <p className="text-xs text-muted-foreground">{tokenSymbol}</p>
              </div>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="text-center py-4">
          <div className="flex justify-center mb-4">
            <ChainIcon symbol={tokenSymbol || ""} size="lg" />
          </div>
          <h2 className="text-3xl font-bold" data-testid="text-token-balance">
            {formatBalance(tokenBalance)} {tokenSymbol}
          </h2>
          <p className="text-xl text-muted-foreground" data-testid="text-token-value">
            {formatUSD(usdValue)}
          </p>
          {price > 0 && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">
                {formatUSD(price)}
              </span>
              <Badge 
                variant={priceChange24h >= 0 ? "default" : "destructive"}
                className="text-xs"
              >
                {priceChange24h >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(2)}%
              </Badge>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href={`/transfer?type=send&chain=${chainId}&token=${isNativeToken ? 'native' : customToken?.id || tokenId}`}>
            <Button className="w-full h-12 rounded-xl" data-testid="button-send-token">
              <ArrowUpRight className="h-5 w-5 mr-2" />
              Send
            </Button>
          </Link>
          <Link href={`/transfer?type=receive&chain=${chainId}`}>
            <Button className="w-full h-12 rounded-xl" variant="outline" data-testid="button-receive-token">
              <ArrowDownLeft className="h-5 w-5 mr-2" />
              Receive
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold">Token Info</h3>
            
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Network</span>
              <div className="flex items-center gap-2">
                <ChainIcon symbol={chain.symbol} size="sm" />
                <span>{chain.name}</span>
              </div>
            </div>

            {tokenContractAddress && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Contract</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{shortenAddress(tokenContractAddress)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(tokenContractAddress, "Contract address")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {wallet.address && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Your Address</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{shortenAddress(wallet.address)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(wallet.address, "Address")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {customToken && (
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Decimals</span>
                <span>{customToken.decimals}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <h3 className="font-semibold mb-3">Recent Activity</h3>
          <Card>
            <CardContent className="p-4">
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  No transactions yet
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.txHash} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          tx.type === 'receive' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                        }`}>
                          {tx.type === 'receive' ? (
                            <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{tx.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(tx.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${tx.type === 'receive' ? 'text-green-600' : ''}`}>
                          {tx.type === 'receive' ? '+' : '-'}{formatBalance(tx.amount)} {tx.tokenSymbol}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
