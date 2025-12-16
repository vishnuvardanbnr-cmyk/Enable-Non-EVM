import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Copy, 
  QrCode,
  Send,
  Shield,
  AlertCircle,
  Coins,
} from "lucide-react";
import { BackButton } from "@/components/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/lib/wallet-context";
import { useToast } from "@/hooks/use-toast";
import { ChainIcon } from "@/components/chain-icon";
import { HardwareStatusCard } from "@/components/hardware-status";
import { clientStorage, type CustomToken } from "@/lib/client-storage";
import { formatCryptoBalance } from "@/lib/price-service";
import { TOKEN_PARENT_CHAIN_SYMBOL } from "@/lib/chain-mappings";
import type { Chain, Wallet } from "@shared/schema";

interface TokenOption {
  id: string;
  symbol: string;
  name: string;
  balance: string;
  isNative: boolean;
  contractAddress?: string;
  decimals?: number;
}

function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

const formatBalance = formatCryptoBalance;

function getAddressPlaceholder(symbol: string | undefined): string {
  if (!symbol) return "Enter address...";
  
  switch (symbol.toUpperCase()) {
    case 'BTC':
      return "bc1... or 1... or 3...";
    case 'SOL':
      return "Base58 address...";
    case 'XRP':
      return "r...";
    case 'ADA':
      return "addr1...";
    case 'DOGE':
      return "D...";
    case 'DOT':
      return "1... (SS58 format)";
    case 'LTC':
      return "L... or M... or ltc1...";
    case 'BCH':
      return "bitcoincash:q...";
    case 'TRX':
      return "T...";
    case 'ATOM':
    case 'OSMO':
      return "cosmos1... or osmo1...";
    case 'ETH':
    case 'BNB':
    case 'MATIC':
    case 'AVAX':
    case 'ARB':
    default:
      return "0x...";
  }
}

interface GasEstimate {
  gasPrice: string;
  gasPriceGwei: string;
  estimatedGas: string;
  estimatedFee: string;
  estimatedFeeUsd: string | null;
  symbol: string;
  error?: string;
}

function SendTab({ chains, wallets, initialChainId, initialTokenId }: { chains: Chain[]; wallets: Wallet[]; initialChainId?: string; initialTokenId?: string }) {
  const { setShowPinModal, setPinAction, setPendingTransaction, topAssets, enabledAssetIds } = useWallet();
  const [selectedChainId, setSelectedChainId] = useState<string>(initialChainId || "");
  const [selectedTokenId, setSelectedTokenId] = useState<string>(initialTokenId || "native");
  const isTokenLocked = !!initialTokenId;
  const [tokenOptions, setTokenOptions] = useState<TokenOption[]>([]);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  console.log("[SendTab] initialChainId:", initialChainId, "selectedChainId:", selectedChainId, "chains.length:", chains.length);

  const selectedChain = chains.find((c) => c.id === selectedChainId);
  const selectedWallet = wallets.find((w) => w.chainId === selectedChainId);
  const selectedToken = tokenOptions.find(t => t.id === selectedTokenId) || tokenOptions[0];

  const { data: gasEstimate, isLoading: gasLoading } = useQuery<GasEstimate>({
    queryKey: ["/api/gas-estimate", selectedChainId],
    queryFn: async () => {
      const response = await fetch(`/api/gas-estimate?chainId=${selectedChainId}`);
      return response.json();
    },
    enabled: !!selectedChainId,
    refetchInterval: 30000,
  });

  // Update selected chain when initialChainId changes (e.g., user clicks different chain's Send button)
  useEffect(() => {
    console.log("[SendTab useEffect] initialChainId:", initialChainId, "chains.length:", chains.length, "current selectedChainId:", selectedChainId);
    if (initialChainId && chains.find(c => c.id === initialChainId)) {
      console.log("[SendTab useEffect] Setting selectedChainId to initialChainId:", initialChainId);
      setSelectedChainId(initialChainId);
    } else if (chains.length > 0 && !selectedChainId) {
      console.log("[SendTab useEffect] Defaulting to first chain:", chains[0].id);
      setSelectedChainId(chains[0].id);
    }
  }, [chains, initialChainId]);

  // Load custom tokens when chain or wallet changes
  useEffect(() => {
    async function loadTokenOptions() {
      if (!selectedChain || !selectedWallet) {
        setTokenOptions([]);
        return;
      }

      // Start with native token
      const options: TokenOption[] = [{
        id: "native",
        symbol: selectedChain.symbol,
        name: selectedChain.name,
        balance: selectedWallet.balance,
        isNative: true,
      }];

      // Add standard tokens from topAssets that match this chain
      const chainSymbol = selectedChain.symbol;
      topAssets.forEach(asset => {
        const parentChainSymbol = TOKEN_PARENT_CHAIN_SYMBOL[asset.id];
        if (parentChainSymbol === chainSymbol && enabledAssetIds.has(asset.id)) {
          options.push({
            id: asset.id,
            symbol: asset.symbol.toUpperCase(),
            name: asset.name,
            balance: "0", // Token balance would need to be fetched
            isNative: false,
          });
        }
      });

      // Load wallet-specific custom tokens
      try {
        const customTokens = await clientStorage.getCustomTokens();
        const walletTokens = customTokens.filter(token => 
          token.chainId === selectedChainId && 
          (token.walletId === selectedWallet.id || !token.walletId)
        );

        for (const token of walletTokens) {
          options.push({
            id: token.id,
            symbol: token.symbol,
            name: token.name,
            balance: "0", // Token balance would need to be fetched
            isNative: false,
            contractAddress: token.contractAddress,
            decimals: token.decimals,
          });
        }
      } catch (err) {
        console.error("Failed to load custom tokens:", err);
      }

      setTokenOptions(options);
      // Only reset to native if no initialTokenId is provided
      if (!initialTokenId) {
        setSelectedTokenId("native");
      }
    }

    loadTokenOptions();
  }, [selectedChainId, selectedChain, selectedWallet, initialTokenId, topAssets, enabledAssetIds]);

  const handleSend = () => {
    setError("");

    if (!toAddress) {
      setError("Please enter a recipient address");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const balance = parseFloat(selectedToken?.balance || "0");
    if (parseFloat(amount) > balance) {
      setError("Insufficient balance");
      return;
    }

    setPendingTransaction({
      toAddress,
      amount,
      chainId: selectedChainId,
      tokenSymbol: selectedToken?.symbol,
      tokenContractAddress: selectedToken?.contractAddress,
      isNativeToken: selectedToken?.isNative ?? true,
    });
    setPinAction("sign");
    setShowPinModal(true);
  };

  const handleMaxAmount = () => {
    if (selectedToken) {
      setAmount(selectedToken.balance);
    }
  };

  const handleChainChange = (chainId: string) => {
    setSelectedChainId(chainId);
    setSelectedTokenId("native");
    setAmount("");
  };

  return (
    <div className="space-y-6">
      {!initialChainId && (
        <div className="space-y-2">
          <Label htmlFor="chain">Network</Label>
          <Select value={selectedChainId} onValueChange={handleChainChange}>
            <SelectTrigger id="chain" data-testid="select-send-chain">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              {chains.map((chain) => {
                const wallet = wallets.find((w) => w.chainId === chain.id);
                return (
                  <SelectItem key={chain.id} value={chain.id}>
                    <div className="flex items-center gap-2">
                      <ChainIcon symbol={chain.symbol} iconColor={chain.iconColor} size="sm" />
                      <span>{chain.name}</span>
                      <span className="text-muted-foreground">
                        ({formatBalance(wallet?.balance || "0")} {chain.symbol})
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="token">Coin / Token {isTokenLocked && <span className="text-xs text-muted-foreground">(locked)</span>}</Label>
        <Select value={selectedTokenId} onValueChange={setSelectedTokenId} disabled={isTokenLocked}>
          <SelectTrigger id="token" data-testid="select-send-token" className={isTokenLocked ? "opacity-70" : ""}>
            <SelectValue placeholder="Select coin or token" />
          </SelectTrigger>
          <SelectContent>
            {tokenOptions.map((token) => (
              <SelectItem key={token.id} value={token.id}>
                <div className="flex items-center gap-2">
                  {token.isNative ? (
                    <ChainIcon symbol={token.symbol} size="sm" />
                  ) : (
                    <Coins className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{token.symbol}</span>
                  <span className="text-muted-foreground">
                    {token.name}
                  </span>
                  {token.isNative && (
                    <span className="text-xs text-muted-foreground">
                      ({formatBalance(token.balance)})
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipient">Recipient Address</Label>
        <Input
          id="recipient"
          placeholder={getAddressPlaceholder(selectedChain?.symbol)}
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          className="font-mono"
          data-testid="input-recipient-address"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="amount">Amount</Label>
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            className="h-auto py-0 text-xs"
            onClick={handleMaxAmount}
            data-testid="button-max-amount"
          >
            Max: {formatBalance(selectedToken?.balance || "0")} {selectedToken?.symbol || selectedChain?.symbol}
          </Button>
        </div>
        <div className="relative">
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pr-16"
            data-testid="input-send-amount"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {selectedToken?.symbol || selectedChain?.symbol}
          </span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Gas Price</span>
          {gasLoading ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            <span data-testid="text-gas-price">
              {gasEstimate?.gasPriceGwei || "20"} Gwei
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Estimated Gas Fee</span>
          {gasLoading ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <span data-testid="text-gas-fee">
              ~{gasEstimate?.estimatedFee || "0.00042"} {selectedChain?.symbol}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Total</span>
          {gasLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <span className="font-medium" data-testid="text-total-amount">
              {amount 
                ? (parseFloat(amount) + parseFloat(gasEstimate?.estimatedFee || "0.00042")).toFixed(6) 
                : "0.00"} {selectedChain?.symbol}
            </span>
          )}
        </div>
        {gasEstimate?.error && (
          <p className="mt-2 text-xs text-muted-foreground">
            Using estimated values (live data unavailable)
          </p>
        )}
      </div>

      <Button 
        type="button"
        className="w-full" 
        size="lg"
        onClick={handleSend}
        disabled={!toAddress || !amount}
        data-testid="button-sign-transaction"
      >
        <Shield className="mr-2 h-4 w-4" />
        Sign & Send Transaction
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        You will need to enter your PIN to authorize this transaction
      </p>
    </div>
  );
}

function ReceiveTab({ chains, wallets, initialChainId }: { chains: Chain[]; wallets: Wallet[]; initialChainId?: string }) {
  const { toast } = useToast();
  const [selectedChainId, setSelectedChainId] = useState<string>(initialChainId || "");

  const selectedChain = chains.find((c) => c.id === selectedChainId);
  const selectedWallet = wallets.find((w) => w.chainId === selectedChainId);

  // Update selected chain when initialChainId changes (e.g., user clicks different chain's Receive button)
  useEffect(() => {
    if (initialChainId && chains.find(c => c.id === initialChainId)) {
      setSelectedChainId(initialChainId);
    } else if (chains.length > 0 && !selectedChainId) {
      setSelectedChainId(chains[0].id);
    }
  }, [chains, initialChainId]);

  const copyAddress = () => {
    if (selectedWallet) {
      navigator.clipboard.writeText(selectedWallet.address);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="receive-chain">Network</Label>
        <Select value={selectedChainId} onValueChange={setSelectedChainId}>
          <SelectTrigger id="receive-chain" data-testid="select-receive-chain">
            <SelectValue placeholder="Select network" />
          </SelectTrigger>
          <SelectContent>
            {chains.map((chain) => (
              <SelectItem key={chain.id} value={chain.id}>
                <div className="flex items-center gap-2">
                  <ChainIcon symbol={chain.symbol} iconColor={chain.iconColor} size="sm" />
                  <span>{chain.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col items-center justify-center py-6">
        <div className="mb-6 flex h-64 w-64 items-center justify-center rounded-xl bg-white p-4">
          {selectedWallet ? (
            <QRCodeSVG 
              value={selectedWallet.address} 
              size={224}
              level="M"
              includeMargin={false}
              data-testid="qr-code-address"
            />
          ) : (
            <div className="text-center">
              <QrCode className="mx-auto h-32 w-32 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">Select a network</p>
            </div>
          )}
        </div>

        {selectedWallet && (
          <>
            <div className="mb-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Your {selectedChain?.name} Address</p>
              <code className="block rounded-lg bg-muted/50 px-4 py-3 font-mono text-sm break-all">
                {selectedWallet.address}
              </code>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={copyAddress} data-testid="button-copy-receive-address">
                <Copy className="mr-2 h-4 w-4" />
                Copy Address
              </Button>
            </div>
          </>
        )}
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Only send {selectedChain?.symbol} and tokens on the {selectedChain?.name} network to this address. Sending other assets may result in permanent loss.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default function Transfer() {
  const { isConnected, isUnlocked, chains, wallets, visibleWallets, walletMode, refreshBalances } = useWallet();
  
  // Use visibleWallets for hard wallet mode to ensure proper data display
  const displayWallets = walletMode === "hard_wallet" ? visibleWallets : wallets;
  
  // Track URL search string reactively using window events
  const [searchString, setSearchString] = useState(() => window.location.search);
  
  // Listen for URL changes (popstate for back/forward, and custom event for Link navigation)
  useEffect(() => {
    const updateSearch = () => {
      setSearchString(window.location.search);
    };
    
    // popstate fires on back/forward navigation
    window.addEventListener('popstate', updateSearch);
    
    // Check for search string changes on every render (handles Link navigation)
    updateSearch();
    
    return () => {
      window.removeEventListener('popstate', updateSearch);
    };
  }, []);
  
  // Also check on any navigation by using an interval briefly or checking regularly
  // This is needed because wouter's Link doesn't fire popstate
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (window.location.search !== searchString) {
        setSearchString(window.location.search);
      }
    }, 100);
    
    return () => clearInterval(checkInterval);
  }, [searchString]);
  
  const queryParams = new URLSearchParams(searchString);
  const defaultTab = queryParams.get("type") === "receive" ? "receive" : "send";
  const chainParam = queryParams.get("chain") || undefined;
  const tokenParam = queryParams.get("token") || undefined;
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Update active tab when query params change
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const typeParam = params.get("type");
    if (typeParam === "receive" || typeParam === "send") {
      setActiveTab(typeParam);
    }
  }, [searchString]);
  
  console.log("[Transfer] chainParam:", chainParam, "search:", searchString);

  // Track if we've already refreshed balances on this page load
  const hasRefreshedRef = useRef(false);
  
  // Refresh balances once when page loads in hard wallet mode
  useEffect(() => {
    if (walletMode === "hard_wallet" && displayWallets.length > 0 && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true;
      refreshBalances();
    }
  }, [walletMode, displayWallets.length, refreshBalances]);

  if (displayWallets.length === 0) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">Send / Receive</h1>
        <HardwareStatusCard />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold">Send / Receive</h1>
      </div>

      <Card className="max-w-lg mx-auto">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="send" data-testid="tab-send">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Send
              </TabsTrigger>
              <TabsTrigger value="receive" data-testid="tab-receive">
                <ArrowDownLeft className="mr-2 h-4 w-4" />
                Receive
              </TabsTrigger>
            </TabsList>

            <TabsContent value="send">
              <SendTab key={`send-${chainParam}-${tokenParam}`} chains={chains} wallets={displayWallets} initialChainId={chainParam} initialTokenId={tokenParam} />
            </TabsContent>

            <TabsContent value="receive">
              <ReceiveTab key={`receive-${chainParam}`} chains={chains} wallets={displayWallets} initialChainId={chainParam} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
