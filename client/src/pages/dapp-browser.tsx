import { useState, useEffect, useRef } from "react";
import { RefreshCw, ExternalLink, ChevronDown, Globe, X, Home } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet } from "@/lib/wallet-context";
import { useToast } from "@/hooks/use-toast";
import { ChainIcon } from "@/components/chain-icon";
import { useLocation, Link } from "wouter";
import { DEFAULT_CHAINS } from "@shared/schema";

const EVM_CHAINS = DEFAULT_CHAINS.filter(c => c.chainId > 0);

export default function DAppBrowser() {
  const { isConnected, isUnlocked, wallets, chains } = useWallet();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [url, setUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const initialUrl = urlParams.get("url");

  useEffect(() => {
    if (initialUrl) {
      const decodedUrl = decodeURIComponent(initialUrl);
      setUrl(decodedUrl);
      setCurrentUrl(decodedUrl);
    }
  }, [initialUrl]);

  const selectedChain = EVM_CHAINS.find(c => c.chainId === selectedChainId) || EVM_CHAINS[0];
  const currentWallet = wallets.find(w => {
    const chain = chains.find(c => c.id === w.chainId);
    return chain?.chainId === selectedChainId;
  }) || wallets[0];

  const handleNavigate = () => {
    if (!url.trim()) return;
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }
    setCurrentUrl(formattedUrl);
    setIframeError(false);
    setIsLoading(true);
  };

  const handleRefresh = () => {
    if (iframeRef.current && currentUrl) {
      setIsLoading(true);
      setIframeError(false);
      iframeRef.current.src = currentUrl;
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIframeError(true);
  };

  const handleChainSwitch = (chainId: number) => {
    setSelectedChainId(chainId);
    toast({
      title: "Chain Switched",
      description: `Switched to ${EVM_CHAINS.find(c => c.chainId === chainId)?.name}`,
    });
  };

  const openExternal = () => {
    if (currentUrl) {
      window.open(currentUrl, "_blank");
    }
  };

  if (!isConnected || !isUnlocked) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">DApp Browser</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Connect your wallet to use the DApp browser</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2">
        <div className="flex items-center gap-2">
          <BackButton fallbackPath="/dapps" />

          <Button
            size="icon"
            variant="ghost"
            onClick={() => { setCurrentUrl(""); setUrl(""); }}
            data-testid="button-home"
          >
            <Home className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleRefresh}
            disabled={!currentUrl}
            data-testid="button-refresh-browser"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <div className="flex-1 flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNavigate()}
              placeholder="Enter DApp URL (e.g., pancakeswap.finance)"
              className="flex-1"
              data-testid="input-browser-url"
            />
            <Button onClick={handleNavigate} data-testid="button-go">
              Go
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-chain-selector">
                <ChainIcon symbol={selectedChain.symbol} iconColor={selectedChain.iconColor} size="sm" />
                <span className="hidden sm:inline">{selectedChain.name}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {EVM_CHAINS.map((chain) => (
                <DropdownMenuItem
                  key={chain.chainId}
                  onClick={() => handleChainSwitch(chain.chainId)}
                  className="gap-2"
                  data-testid={`menu-chain-${chain.symbol.toLowerCase()}`}
                >
                  <ChainIcon symbol={chain.symbol} iconColor={chain.iconColor} size="sm" />
                  {chain.name}
                  {chain.chainId === selectedChainId && (
                    <span className="ml-auto text-primary">•</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="icon"
            variant="ghost"
            onClick={openExternal}
            disabled={!currentUrl}
            data-testid="button-open-external"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        {currentWallet && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground px-2">
            <span>Connected:</span>
            <code className="bg-muted px-2 py-0.5 rounded">
              {currentWallet.address.slice(0, 6)}...{currentWallet.address.slice(-4)}
            </code>
            <span>on {selectedChain.name}</span>
          </div>
        )}
      </div>

      <div className="flex-1 relative bg-muted/30">
        {!currentUrl ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md p-6">
              <Globe className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold mb-2">DApp Browser</h2>
              <p className="text-muted-foreground mb-4">
                Enter a DApp URL above to browse decentralized applications with your connected wallet.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: "PancakeSwap", url: "pancakeswap.finance" },
                  { name: "Uniswap", url: "app.uniswap.org" },
                  { name: "Aave", url: "app.aave.com" },
                  { name: "1inch", url: "app.1inch.io" },
                ].map((dapp) => (
                  <Button
                    key={dapp.name}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUrl("https://" + dapp.url);
                      setCurrentUrl("https://" + dapp.url);
                      setIsLoading(true);
                    }}
                    data-testid={`quick-${dapp.name.toLowerCase()}`}
                  >
                    {dapp.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : iframeError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md p-6">
              <X className="mx-auto h-16 w-16 text-destructive/50 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Cannot Load DApp</h2>
              <p className="text-muted-foreground mb-4">
                This DApp cannot be embedded due to security restrictions. 
                Please open it in a new tab and use WalletConnect to connect.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={openExternal}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dapps">
                    Back to DApps
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={currentUrl}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              data-testid="iframe-dapp"
            />
          </>
        )}
      </div>
    </div>
  );
}
