import { useState, useMemo } from "react";
import { 
  Shield, 
  Lock, 
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  Smartphone,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { BackButton } from "@/components/back-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWallet } from "@/lib/wallet-context";
import { useToast } from "@/hooks/use-toast";
import { HardwareStatusCard } from "@/components/hardware-status";
import { hardwareWallet } from "@/lib/hardware-wallet";
import { softWallet } from "@/lib/soft-wallet";
import { clientStorage } from "@/lib/client-storage";

export default function Settings() {
  const { isUnlocked, hardwareState, walletMode, setShowPinModal, setPinAction, lockWallet, disconnectDevice } = useWallet();
  const { toast } = useToast();
  
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [seedPhraseConfirmed, setSeedPhraseConfirmed] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetPin, setResetPin] = useState("");
  const [resetPinError, setResetPinError] = useState("");
  const currentTimeoutMs = hardwareWallet.getSessionTimeoutMs();
  const [autoLockTime, setAutoLockTime] = useState(() => {
    if (currentTimeoutMs >= 30 * 60 * 1000) return "30";
    if (currentTimeoutMs >= 15 * 60 * 1000) return "15";
    if (currentTimeoutMs >= 5 * 60 * 1000) return "5";
    if (currentTimeoutMs >= 1 * 60 * 1000) return "1";
    return "5";
  });

  const handleAutoLockChange = (value: string) => {
    setAutoLockTime(value);
    if (value === "never") {
      hardwareWallet.setSessionTimeoutMs(24 * 60 * 60 * 1000); // 24 hours
    } else {
      hardwareWallet.setSessionTimeoutMs(parseInt(value) * 60 * 1000);
    }
    toast({
      title: "Auto-Lock Updated",
      description: value === "never" ? "Auto-lock disabled" : `Wallet will lock after ${value} minute${value === "1" ? "" : "s"} of inactivity`,
    });
  };
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verifyWordIndexes, setVerifyWordIndexes] = useState<number[]>([]);
  const [verifyInputs, setVerifyInputs] = useState<string[]>(["", "", ""]);
  const [verifyError, setVerifyError] = useState("");
  const [backupVerified, setBackupVerified] = useState(false);

  const seedPhrase: string = "";
  const seedWords: string[] = useMemo(() => seedPhrase ? seedPhrase.split(" ") : [], [seedPhrase]);

  const handleChangePin = () => {
    toast({
      title: "Change PIN",
      description: "This feature will be available in the next update.",
    });
  };

  const handleShowSeedPhrase = () => {
    if (!seedPhraseConfirmed) {
      setSeedPhraseConfirmed(true);
      return;
    }
    setShowSeedPhrase(true);
  };

  const handleResetWallet = async () => {
    if (!resetPin || resetPin.length < 4) {
      setResetPinError("Please enter your PIN to confirm deletion");
      return;
    }
    
    try {
      let unlocked = false;
      
      if (walletMode === "soft_wallet") {
        unlocked = await softWallet.unlock(resetPin);
      } else {
        unlocked = await hardwareWallet.unlock(resetPin);
      }
      
      if (!unlocked) {
        setResetPinError("Incorrect PIN. Please try again.");
        return;
      }
    } catch (err: any) {
      setResetPinError(err.message || "Failed to verify PIN");
      return;
    }
    
    if (walletMode === "soft_wallet") {
      await clientStorage.clearSoftWallet();
      await clientStorage.clearEncryptedSeed();
      await clientStorage.clearAllWalletSeeds();
      softWallet.lock();
    } else {
      await clientStorage.clearHardWallet();
      await disconnectDevice();
    }
    
    setShowResetDialog(false);
    setResetPin("");
    setResetPinError("");
    toast({
      title: "Wallet Deleted",
      description: "Your wallet has been deleted. Please set up a new wallet.",
    });
    
    window.location.reload();
  };

  const startVerifyBackup = () => {
    const indexes: number[] = [];
    while (indexes.length < 3) {
      const idx = Math.floor(Math.random() * seedWords.length);
      if (!indexes.includes(idx)) {
        indexes.push(idx);
      }
    }
    indexes.sort((a, b) => a - b);
    setVerifyWordIndexes(indexes);
    setVerifyInputs(["", "", ""]);
    setVerifyError("");
    setShowVerifyDialog(true);
  };

  const handleVerifySubmit = () => {
    const isCorrect = verifyWordIndexes.every((wordIndex, i) => 
      verifyInputs[i].trim().toLowerCase() === seedWords[wordIndex].toLowerCase()
    );
    
    if (isCorrect) {
      setBackupVerified(true);
      setShowVerifyDialog(false);
      toast({
        title: "Backup Verified",
        description: "Your recovery phrase backup has been confirmed.",
      });
    } else {
      setVerifyError("One or more words are incorrect. Please try again.");
    }
  };

  if (!isUnlocked) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">Settings</h1>
        <HardwareStatusCard />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Device Information
            </CardTitle>
            <CardDescription>Details about your connected hardware wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Device Name</span>
              <span className="font-medium">{hardwareState.deviceName || "Hardware Wallet"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <Badge variant="secondary">
                {hardwareState.type === "ledger" ? "Ledger" : 
                 hardwareState.type === "raspberry_pi" ? "Raspberry Pi" : "Simulated"}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                {hardwareState.status === "unlocked" ? "Unlocked" : "Connected"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your wallet security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Change PIN</p>
                <p className="text-sm text-muted-foreground">Update your security PIN</p>
              </div>
              <Button variant="outline" onClick={handleChangePin} data-testid="button-change-pin">
                <Key className="mr-2 h-4 w-4" />
                Change
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-Lock Timer</p>
                <p className="text-sm text-muted-foreground">Automatically lock wallet after inactivity</p>
              </div>
              <Select value={autoLockTime} onValueChange={handleAutoLockChange}>
                <SelectTrigger className="w-[140px]" data-testid="select-auto-lock">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Lock Wallet Now</p>
                <p className="text-sm text-muted-foreground">Require PIN to access wallet again</p>
              </div>
              <Button variant="outline" onClick={lockWallet} data-testid="button-lock-now">
                <Lock className="mr-2 h-4 w-4" />
                Lock
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Recovery Phrase
            </CardTitle>
            <CardDescription>Your secret recovery phrase for wallet backup</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Never share your recovery phrase with anyone. Anyone with this phrase can access your funds.
              </AlertDescription>
            </Alert>

            {!showSeedPhrase ? (
              <div className="space-y-4">
                {!seedPhraseConfirmed ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Your recovery phrase is stored securely in your hardware wallet. 
                      Make sure you are in a private location before viewing.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={handleShowSeedPhrase}
                      data-testid="button-show-seed-phrase"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      I understand, show recovery phrase
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Are you absolutely sure? This should only be viewed for backup purposes.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setSeedPhraseConfirmed(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleShowSeedPhrase}
                        data-testid="button-confirm-show-seed"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Show Recovery Phrase
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-4">
                  {seedWords.map((word, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-md bg-background p-2">
                      <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                      <span className="font-mono text-sm">{word}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowSeedPhrase(false);
                      setSeedPhraseConfirmed(false);
                    }}
                    data-testid="button-hide-seed-phrase"
                  >
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide Recovery Phrase
                  </Button>
                  {!backupVerified && (
                    <Button 
                      onClick={startVerifyBackup}
                      data-testid="button-verify-backup"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Verify Backup
                    </Button>
                  )}
                  {backupVerified && (
                    <Badge className="gap-1.5 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                      <CheckCircle className="h-3 w-3" />
                      Backup Verified
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions that affect your wallet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Wallet</p>
                <p className="text-sm text-muted-foreground">
                  Remove all wallet data. Requires PIN confirmation.
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => setShowResetDialog(true)}
                data-testid="button-delete-wallet"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showResetDialog} onOpenChange={(open) => {
        setShowResetDialog(open);
        if (!open) {
          setResetPin("");
          setResetPinError("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Wallet?</DialogTitle>
            <DialogDescription>
              This will remove all wallet data from this device. You will need your recovery phrase to restore your wallet.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. Make sure you have saved your recovery phrase before proceeding.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="reset-pin">Enter your PIN to confirm</Label>
            <Input
              id="reset-pin"
              type="password"
              placeholder="Enter PIN"
              value={resetPin}
              onChange={(e) => {
                setResetPin(e.target.value);
                setResetPinError("");
              }}
              maxLength={6}
              data-testid="input-reset-pin"
            />
            {resetPinError && (
              <p className="text-sm text-destructive">{resetPinError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleResetWallet} 
              disabled={!resetPin}
              data-testid="button-confirm-reset"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Your Backup</DialogTitle>
            <DialogDescription>
              Enter the following words from your recovery phrase to confirm you have backed it up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {verifyWordIndexes.map((wordIndex, i) => (
              <div key={wordIndex} className="space-y-2">
                <Label htmlFor={`verify-word-${i}`}>Word #{wordIndex + 1}</Label>
                <Input
                  id={`verify-word-${i}`}
                  placeholder={`Enter word #${wordIndex + 1}`}
                  value={verifyInputs[i]}
                  onChange={(e) => {
                    const newInputs = [...verifyInputs];
                    newInputs[i] = e.target.value;
                    setVerifyInputs(newInputs);
                    setVerifyError("");
                  }}
                  data-testid={`input-verify-word-${i}`}
                />
              </div>
            ))}
            {verifyError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{verifyError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleVerifySubmit}
              disabled={verifyInputs.some(input => !input.trim())}
              data-testid="button-confirm-verify"
            >
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
