import { useState, useEffect, useRef } from "react";
import { Link2, Link2Off, QrCode, ExternalLink, Loader2, AlertCircle, Check, X, Shield, Globe, RefreshCw, Home, ChevronDown } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/lib/wallet-context";
import { walletConnectService, type DAppSession, type PendingRequest, type SessionProposal } from "@/lib/walletconnect-service";
import { HardwareStatusCard } from "@/components/hardware-status";
import { ChainIcon } from "@/components/chain-icon";
import { DEFAULT_CHAINS } from "@shared/schema";

const EVM_CHAINS = DEFAULT_CHAINS.filter(c => c.chainId > 0);

function truncateAddress(address: string): string {
  if (!address) return "";
  const parts = address.split(":");
  const addr = parts[parts.length - 1];
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function DApps() {
  const { isConnected, isUnlocked, wallets, chains } = useWallet();
  const { toast } = useToast();
  
  const [sessions, setSessions] = useState<DAppSession[]>([]);
  const [wcUri, setWcUri] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [pendingProposal, setPendingProposal] = useState<SessionProposal | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showWcDialog, setShowWcDialog] = useState(false);
  const [showSessionsDialog, setShowSessionsDialog] = useState(false);

  const [url, setUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const userAddress = wallets.length > 0 ? wallets[0].address : null;
  const selectedChain = EVM_CHAINS.find(c => c.chainId === selectedChainId) || EVM_CHAINS[0];
  const currentWallet = wallets.find(w => {
    const chain = chains.find(c => c.id === w.chainId);
    return chain?.chainId === selectedChainId;
  }) || wallets[0];

  const popularDapps = [
    { name: "PancakeSwap", url: "https://pancakeswap.finance/" },
    { name: "Uniswap", url: "https://app.uniswap.org/" },
    { name: "Aave", url: "https://app.aave.com/" },
    { name: "1inch", url: "https://app.1inch.io/" },
  ];

  useEffect(() => {
    if (!isConnected || !isUnlocked) return;

    walletConnectService.init().then(() => {
      setIsInitialized(true);
      setSessions(walletConnectService.getSessions());
    });

    const unsubRequest = walletConnectService.onSessionRequest((request) => {
      setPendingRequest(request);
    });

    const unsubProposal = walletConnectService.onSessionProposal((proposal) => {
      setPendingProposal(proposal);
    });

    const unsubUpdate = walletConnectService.onSessionUpdate(() => {
      setSessions(walletConnectService.getSessions());
    });

    return () => {
      unsubRequest();
      unsubProposal();
      unsubUpdate();
    };
  }, [isConnected, isUnlocked]);

  const handleNavigate = () => {
    if (!url.trim()) return;
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }
    setCurrentUrl(formattedUrl);
    setUrl(formattedUrl);
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

  const handleOpenDapp = (dappUrl: string) => {
    setUrl(dappUrl);
    setCurrentUrl(dappUrl);
    setIframeError(false);
    setIsLoading(true);
  };

  const handleConnect = async () => {
    if (!wcUri.trim()) {
      toast({ title: "Error", description: "Please enter a WalletConnect URI", variant: "destructive" });
      return;
    }

    setIsConnecting(true);
    try {
      await walletConnectService.pair(wcUri);
      setWcUri("");
      setShowWcDialog(false);
      toast({ title: "Connected", description: "Pairing request sent. Check for approval prompt." });
      setTimeout(() => {
        setSessions(walletConnectService.getSessions());
      }, 2000);
    } catch (error: any) {
      toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (topic: string, name: string) => {
    try {
      await walletConnectService.disconnectSession(topic);
      setSessions(walletConnectService.getSessions());
      toast({ title: "Disconnected", description: `Disconnected from ${name}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleApproveRequest = async () => {
    if (!pendingRequest) return;

    setIsProcessing(true);
    try {
      const result = await walletConnectService.handleSignRequest(pendingRequest);
      if (result) {
        await walletConnectService.approveRequest(pendingRequest.topic, pendingRequest.id, result);
        toast({ title: "Approved", description: "Request signed successfully" });
      } else {
        throw new Error("Signing failed");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      await walletConnectService.rejectRequest(pendingRequest.topic, pendingRequest.id);
    } finally {
      setPendingRequest(null);
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!pendingRequest) return;

    try {
      await walletConnectService.rejectRequest(pendingRequest.topic, pendingRequest.id);
      toast({ title: "Rejected", description: "Request rejected" });
    } catch (error: any) {
      console.error("Reject error:", error);
    } finally {
      setPendingRequest(null);
    }
  };

  const handleApproveProposal = async () => {
    if (!pendingProposal || !userAddress) return;

    setIsProcessing(true);
    try {
      const allChains = [...pendingProposal.requiredChains, ...pendingProposal.optionalChains];
      const chainIds = allChains
        .filter(c => c.startsWith("eip155:"))
        .map(c => parseInt(c.split(":")[1]))
        .filter(id => !isNaN(id));
      
      const finalChainIds = chainIds.length > 0 ? chainIds : [1, 56, 137, 43114, 42161];
      
      await walletConnectService.approveSession(
        pendingProposal.rawProposal,
        [userAddress],
        finalChainIds
      );
      setSessions(walletConnectService.getSessions());
      toast({ title: "Connected", description: `Connected to ${pendingProposal.proposer.name}` });
    } catch (error: any) {
      toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
    } finally {
      setPendingProposal(null);
      setIsProcessing(false);
    }
  };

  const handleRejectProposal = async () => {
    if (!pendingProposal) return;

    try {
      await walletConnectService.rejectSession(pendingProposal.id);
      toast({ title: "Rejected", description: "Connection request rejected" });
    } catch (error: any) {
      console.error("Reject proposal error:", error);
    } finally {
      setPendingProposal(null);
    }
  };

  const getMethodDescription = (method: string): string => {
    switch (method) {
      case "personal_sign":
        return "Sign Message";
      case "eth_sign":
        return "Sign Data";
      case "eth_signTypedData":
      case "eth_signTypedData_v4":
        return "Sign Typed Data";
      case "eth_sendTransaction":
        return "Send Transaction";
      case "eth_signTransaction":
        return "Sign Transaction";
      default:
        return method;
    }
  };

  if (!isConnected || !isUnlocked) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">DApps</h1>
        <HardwareStatusCard />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2">
        <div className="flex items-center gap-2">
          <BackButton />
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
            variant="default"
            onClick={() => setShowWcDialog(true)}
            className="gap-2"
            data-testid="button-walletconnect-main"
          >
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">WalletConnect</span>
          </Button>

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
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground px-2">
            <div className="flex items-center gap-2">
              <span>Connected:</span>
              <code className="bg-muted px-2 py-0.5 rounded">
                {currentWallet.address.slice(0, 6)}...{currentWallet.address.slice(-4)}
              </code>
              <span>on {selectedChain.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {sessions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSessionsDialog(true)}
                  className="h-6 text-xs"
                  data-testid="button-sessions"
                >
                  <Link2 className="mr-1 h-3 w-3" />
                  {sessions.length} Active
                </Button>
              )}
            </div>
          </div>
        )}

        {currentUrl && (
          <div className="mt-2 mx-2 p-2 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs flex items-center justify-between gap-2">
            <p className="text-blue-600 dark:text-blue-400">
              <strong>To connect:</strong> Choose "WalletConnect" on the DApp, copy the URI, then paste it using the WalletConnect button above.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={openExternal}
              className="shrink-0 text-xs h-6"
              data-testid="button-open-new-tab"
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Open in New Tab
            </Button>
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
                Browse decentralized applications and connect using WalletConnect.
              </p>
              
              <Card className="mb-4 text-left">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-2">How to connect:</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Open a DApp below or enter a URL</li>
                    <li>Click "Connect Wallet" on the DApp</li>
                    <li>Choose "WalletConnect" option</li>
                    <li>Copy the connection URI</li>
                    <li>Click "WalletConnect" button above and paste</li>
                  </ol>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-2">
                {popularDapps.map((dapp) => (
                  <Button
                    key={dapp.name}
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDapp(dapp.url)}
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
                <Button variant="outline" onClick={() => { setCurrentUrl(""); setUrl(""); }}>
                  Back to Home
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

      <Dialog open={showWcDialog} onOpenChange={setShowWcDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              WalletConnect
            </DialogTitle>
            <DialogDescription>
              Paste a WalletConnect URI to connect to a DApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Paste WalletConnect URI (wc:...)"
              value={wcUri}
              onChange={(e) => setWcUri(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              data-testid="input-wc-uri"
            />
            <p className="text-sm text-muted-foreground">
              Copy the WalletConnect URI from any DApp and paste it here to connect.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !isInitialized}
              data-testid="button-connect-dapp"
            >
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSessionsDialog} onOpenChange={setShowSessionsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Active Sessions ({sessions.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {sessions.map((session) => (
              <div key={session.topic} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  {session.icon ? (
                    <img
                      src={session.icon}
                      alt={session.name}
                      className="h-8 w-8 rounded-lg"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">{session.name}</p>
                    <p className="text-xs text-muted-foreground">{new URL(session.url).hostname}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect(session.topic, session.name)}
                  data-testid={`button-disconnect-${session.topic.slice(0, 8)}`}
                >
                  <Link2Off className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingProposal} onOpenChange={() => setPendingProposal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Connection Request
            </DialogTitle>
            <DialogDescription>
              A DApp wants to connect to your wallet
            </DialogDescription>
          </DialogHeader>

          {pendingProposal && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {pendingProposal.proposer.icons[0] && (
                  <img
                    src={pendingProposal.proposer.icons[0]}
                    alt=""
                    className="h-12 w-12 rounded-lg"
                  />
                )}
                <div>
                  <p className="font-semibold text-lg">{pendingProposal.proposer.name}</p>
                  <a
                    href={pendingProposal.proposer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:underline flex items-center gap-1"
                  >
                    {new URL(pendingProposal.proposer.url).hostname}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {pendingProposal.proposer.description}
              </p>

              <div className="space-y-2">
                <p className="text-sm font-medium">Will be able to:</p>
                <div className="flex flex-wrap gap-1">
                  {pendingProposal.requiredMethods.slice(0, 4).map((method) => (
                    <Badge key={method} variant="secondary" className="text-xs">
                      {method.replace("eth_", "")}
                    </Badge>
                  ))}
                </div>
              </div>

              {userAddress && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">Account to share:</p>
                  <p className="text-sm font-mono">{truncateAddress(userAddress)}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleRejectProposal}
              disabled={isProcessing}
              data-testid="button-reject-proposal"
            >
              <X className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={handleApproveProposal}
              disabled={isProcessing || !userAddress}
              data-testid="button-approve-proposal"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingRequest} onOpenChange={() => setPendingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Signature Request
            </DialogTitle>
            <DialogDescription>
              {pendingRequest?.dappName} is requesting your signature
            </DialogDescription>
          </DialogHeader>

          {pendingRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {pendingRequest.dappIcon && (
                  <img
                    src={pendingRequest.dappIcon}
                    alt=""
                    className="h-10 w-10 rounded-lg"
                  />
                )}
                <div>
                  <p className="font-medium">{pendingRequest.dappName}</p>
                  <p className="text-sm text-muted-foreground">
                    {getMethodDescription(pendingRequest.method)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-mono break-all">
                  {JSON.stringify(pendingRequest.params, null, 2).slice(0, 500)}
                  {JSON.stringify(pendingRequest.params).length > 500 && "..."}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                Chain: {pendingRequest.chainId}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleRejectRequest}
              disabled={isProcessing}
              data-testid="button-reject-request"
            >
              <X className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={handleApproveRequest}
              disabled={isProcessing}
              data-testid="button-approve-request"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
