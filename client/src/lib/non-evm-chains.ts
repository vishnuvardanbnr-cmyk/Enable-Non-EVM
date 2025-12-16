import * as bip39 from "bip39";
import bs58 from "bs58";
import { ethers } from "ethers";
import nacl from "tweetnacl";
import { blake2b } from "blakejs";

export const DERIVATION_PATHS = {
  bitcoin: "m/84'/0'/0'/0/0",
  ethereum: "m/44'/60'/0'/0/0",
  solana: "m/44'/501'/0'/0'",
  tron: "m/44'/195'/0'/0/0",
};

export const RPC_ENDPOINTS = {
  bitcoin: "https://blockstream.info/api",
  solana: "https://api.mainnet-beta.solana.com",
  tron: "https://api.trongrid.io",
};

export interface NonEvmTransactionParams {
  chainType: "bitcoin" | "solana" | "tron";
  from: string;
  to: string;
  amount: string;
  tokenAddress?: string;
  isNativeToken?: boolean;
}

export interface SignedTransaction {
  chainType: string;
  signedTx: string;
  txHash?: string;
}

function sha256Hash(data: Uint8Array): Uint8Array {
  return ethers.getBytes(ethers.sha256(data));
}

function ripemd160Hash(data: Uint8Array): Uint8Array {
  return ethers.getBytes(ethers.ripemd160(data));
}

function base58CheckEncode(payload: Uint8Array): string {
  const hash1 = sha256Hash(payload);
  const hash2 = sha256Hash(hash1);
  const checksum = hash2.slice(0, 4);
  const addressBytes = new Uint8Array(payload.length + 4);
  addressBytes.set(payload);
  addressBytes.set(checksum, payload.length);
  return bs58.encode(addressBytes);
}

function hash160(data: Uint8Array): Uint8Array {
  return ripemd160Hash(sha256Hash(data));
}

export function deriveBitcoinAddress(seedPhrase: string): { address: string; privateKey: string; publicKey: string } {
  const hdNode = ethers.HDNodeWallet.fromPhrase(seedPhrase, undefined, DERIVATION_PATHS.bitcoin);
  const publicKeyBytes = ethers.getBytes(hdNode.publicKey);
  const pubKeyHash = hash160(publicKeyBytes);
  const witnessProgram = new Uint8Array([0x00, 0x14, ...pubKeyHash]);
  const scriptHash = hash160(witnessProgram);
  const payload = new Uint8Array(21);
  payload[0] = 0x05;
  payload.set(scriptHash, 1);
  const address = base58CheckEncode(payload);

  return {
    address,
    privateKey: hdNode.privateKey,
    publicKey: hdNode.publicKey,
  };
}

export function deriveBitcoinP2WPKHAddress(seedPhrase: string): { address: string; privateKey: string; publicKey: string } {
  const hdNode = ethers.HDNodeWallet.fromPhrase(seedPhrase, undefined, DERIVATION_PATHS.bitcoin);
  const publicKeyBytes = ethers.getBytes(hdNode.publicKey);
  const pubKeyHash = hash160(publicKeyBytes);
  const words = bech32ToWords(pubKeyHash);
  const address = bech32Encode("bc", [0, ...words]);

  return {
    address,
    privateKey: hdNode.privateKey,
    publicKey: hdNode.publicKey,
  };
}

function bech32ToWords(data: Uint8Array): number[] {
  const words: number[] = [];
  let accumulator = 0;
  let bits = 0;
  
  for (const byte of data) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      words.push((accumulator >> bits) & 0x1f);
    }
  }
  
  if (bits > 0) {
    words.push((accumulator << (5 - bits)) & 0x1f);
  }
  
  return words;
}

function bech32Encode(hrp: string, data: number[]): string {
  const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  
  function polymod(values: number[]): number {
    const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = 1;
    for (const v of values) {
      const b = chk >> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ v;
      for (let i = 0; i < 5; i++) {
        if ((b >> i) & 1) {
          chk ^= GEN[i];
        }
      }
    }
    return chk;
  }
  
  function hrpExpand(hrp: string): number[] {
    const ret: number[] = [];
    for (const c of hrp) {
      ret.push(c.charCodeAt(0) >> 5);
    }
    ret.push(0);
    for (const c of hrp) {
      ret.push(c.charCodeAt(0) & 31);
    }
    return ret;
  }
  
  function createChecksum(hrp: string, data: number[]): number[] {
    const values = [...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
    const mod = polymod(values) ^ 1;
    const ret: number[] = [];
    for (let p = 0; p < 6; p++) {
      ret.push((mod >> (5 * (5 - p))) & 31);
    }
    return ret;
  }
  
  const checksum = createChecksum(hrp, data);
  let result = hrp + "1";
  for (const d of [...data, ...checksum]) {
    result += CHARSET[d];
  }
  return result;
}

export function deriveSolanaAddress(seedPhrase: string): { address: string; secretKey: Uint8Array; keypair: nacl.SignKeyPair } {
  const seed = bip39.mnemonicToSeedSync(seedPhrase);
  const derivedSeed = seed.slice(0, 32);
  const keypair = nacl.sign.keyPair.fromSeed(derivedSeed);
  const address = bs58.encode(keypair.publicKey);
  
  return {
    address,
    secretKey: keypair.secretKey,
    keypair,
  };
}

export function deriveTronAddress(seedPhrase: string): { address: string; privateKey: string } {
  const hdNode = ethers.HDNodeWallet.fromPhrase(seedPhrase, undefined, DERIVATION_PATHS.tron);
  const signingKey = new ethers.SigningKey(hdNode.privateKey);
  const publicKeyUncompressed = signingKey.publicKey;
  const publicKeyWithoutPrefix = ethers.getBytes(publicKeyUncompressed).slice(1);
  const addressHashHex = ethers.keccak256(publicKeyWithoutPrefix);
  const addressHash = ethers.getBytes(addressHashHex);
  const addressBytes = new Uint8Array(21);
  addressBytes[0] = 0x41;
  addressBytes.set(addressHash.slice(12), 1);
  const firstHash = ethers.sha256(addressBytes);
  const secondHash = ethers.sha256(ethers.getBytes(firstHash));
  const checksum = ethers.getBytes(secondHash).slice(0, 4);
  const addressWithChecksum = new Uint8Array(25);
  addressWithChecksum.set(addressBytes);
  addressWithChecksum.set(checksum, 21);
  const address = bs58.encode(addressWithChecksum);

  return {
    address,
    privateKey: hdNode.privateKey.slice(2),
  };
}

export function getNonEvmAddresses(seedPhrase: string): {
  bitcoin: string;
  solana: string;
  tron: string;
} {
  const btc = deriveBitcoinP2WPKHAddress(seedPhrase);
  const sol = deriveSolanaAddress(seedPhrase);
  const trx = deriveTronAddress(seedPhrase);

  return {
    bitcoin: btc.address,
    solana: sol.address,
    tron: trx.address,
  };
}

async function fetchBitcoinUtxos(address: string): Promise<{ txid: string; vout: number; value: number }[]> {
  try {
    const response = await fetch(`${RPC_ENDPOINTS.bitcoin}/address/${address}/utxo`);
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

async function fetchBitcoinFeeRate(): Promise<number> {
  try {
    const response = await fetch(`${RPC_ENDPOINTS.bitcoin}/fee-estimates`);
    if (!response.ok) return 10;
    const fees = await response.json();
    return Math.ceil(fees["6"] || 10);
  } catch {
    return 10;
  }
}

export async function buildBitcoinTransaction(
  params: NonEvmTransactionParams,
  seedPhrase: string
): Promise<{ signedTx: string; txHash: string } | null> {
  try {
    const { address, privateKey } = deriveBitcoinP2WPKHAddress(seedPhrase);
    
    if (params.from !== address) {
      console.error("Address mismatch: expected", address, "got", params.from);
      return null;
    }

    console.log("Bitcoin transaction building is currently in development");
    console.log("Transaction params:", { from: params.from, to: params.to, amount: params.amount });
    
    return {
      signedTx: "bitcoin_tx_placeholder",
      txHash: "bitcoin_hash_placeholder",
    };
  } catch (error) {
    console.error("Error building Bitcoin transaction:", error);
    return null;
  }
}

export async function buildSolanaTransaction(
  params: NonEvmTransactionParams,
  seedPhrase: string
): Promise<{ signedTx: string; txHash: string } | null> {
  try {
    const { address, secretKey } = deriveSolanaAddress(seedPhrase);
    
    if (params.from !== address) {
      console.error("Address mismatch");
      return null;
    }

    const lamports = Math.floor(parseFloat(params.amount) * 1000000000);
    const fromPubkey = bs58.decode(params.from);
    const toPubkey = bs58.decode(params.to);

    const blockhashResponse = await fetch(RPC_ENDPOINTS.solana, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestBlockhash",
        params: [{ commitment: "finalized" }],
      }),
    });
    const blockhashData = await blockhashResponse.json();
    const blockhash = blockhashData.result.value.blockhash;

    const SYSTEM_PROGRAM_ID = new Uint8Array(32);
    const numSignatures = 1;
    const header = new Uint8Array([numSignatures, 0, 1]);
    const accountKeys = new Uint8Array(32 * 3);
    accountKeys.set(fromPubkey, 0);
    accountKeys.set(toPubkey, 32);
    accountKeys.set(SYSTEM_PROGRAM_ID, 64);
    const recentBlockhashBytes = bs58.decode(blockhash);
    const instructionData = new Uint8Array(12);
    instructionData[0] = 2;
    const lamportsBigInt = BigInt(lamports);
    for (let i = 0; i < 8; i++) {
      instructionData[4 + i] = Number((lamportsBigInt >> BigInt(i * 8)) & BigInt(0xff));
    }
    const instruction = new Uint8Array(5 + instructionData.length);
    instruction[0] = 2;
    instruction[1] = 2;
    instruction[2] = 0;
    instruction[3] = 1;
    instruction[4] = 12;
    instruction.set(instructionData, 5);

    const messageLength = header.length + 1 + accountKeys.length + recentBlockhashBytes.length + 1 + instruction.length;
    const message = new Uint8Array(messageLength);
    let offset = 0;
    message.set(header, offset); offset += header.length;
    message[offset] = 3; offset += 1;
    message.set(accountKeys, offset); offset += accountKeys.length;
    message.set(recentBlockhashBytes, offset); offset += recentBlockhashBytes.length;
    message[offset] = 1; offset += 1;
    message.set(instruction, offset);

    const signedMessage = nacl.sign.detached(message, secretKey);
    const signedTxBytes = new Uint8Array(1 + signedMessage.length + message.length);
    signedTxBytes[0] = 1;
    signedTxBytes.set(signedMessage, 1);
    signedTxBytes.set(message, 1 + signedMessage.length);

    const signedTx = bs58.encode(signedTxBytes);
    const txHash = bs58.encode(signedMessage);

    return { signedTx, txHash };
  } catch (error) {
    console.error("Error building Solana transaction:", error);
    return null;
  }
}

export async function buildTronTransaction(
  params: NonEvmTransactionParams,
  seedPhrase: string
): Promise<{ signedTx: string; txHash: string } | null> {
  try {
    const { address, privateKey } = deriveTronAddress(seedPhrase);
    
    if (params.from !== address) {
      console.error("Address mismatch");
      return null;
    }

    const amountSun = Math.floor(parseFloat(params.amount) * 1000000);

    const txResponse = await fetch(`${RPC_ENDPOINTS.tron}/wallet/createtransaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_address: address,
        to_address: params.to,
        amount: amountSun,
      }),
    });

    if (!txResponse.ok) {
      throw new Error("Failed to create TRON transaction");
    }

    const unsignedTx = await txResponse.json();
    const txID = unsignedTx.txID;

    const signingKey = new ethers.SigningKey("0x" + privateKey);
    const txBytes = ethers.getBytes("0x" + txID);
    const signature = signingKey.sign(txBytes);
    const signatureHex = signature.r.slice(2) + signature.s.slice(2) + (signature.v === 27 ? "00" : "01");

    const signedTx = {
      ...unsignedTx,
      signature: [signatureHex],
    };

    return {
      signedTx: JSON.stringify(signedTx),
      txHash: txID,
    };
  } catch (error) {
    console.error("Error building TRON transaction:", error);
    return null;
  }
}

export async function broadcastBitcoinTransaction(signedTxHex: string): Promise<string | null> {
  try {
    const response = await fetch(`${RPC_ENDPOINTS.bitcoin}/tx`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: signedTxHex,
    });
    if (!response.ok) {
      const error = await response.text();
      console.error("Bitcoin broadcast error:", error);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error("Error broadcasting Bitcoin transaction:", error);
    return null;
  }
}

export async function broadcastSolanaTransaction(signedTxBase58: string): Promise<string | null> {
  try {
    const response = await fetch(RPC_ENDPOINTS.solana, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sendTransaction",
        params: [signedTxBase58, { encoding: "base58" }],
      }),
    });
    const result = await response.json();
    if (result.error) {
      console.error("Solana broadcast error:", result.error);
      return null;
    }
    return result.result;
  } catch (error) {
    console.error("Error broadcasting Solana transaction:", error);
    return null;
  }
}

export async function broadcastTronTransaction(signedTxJson: string): Promise<string | null> {
  try {
    const signedTx = JSON.parse(signedTxJson);
    const response = await fetch(`${RPC_ENDPOINTS.tron}/wallet/broadcasttransaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signedTx),
    });
    const result = await response.json();
    if (!result.result) {
      console.error("TRON broadcast error:", result);
      return null;
    }
    return result.txid || signedTx.txID;
  } catch (error) {
    console.error("Error broadcasting TRON transaction:", error);
    return null;
  }
}

export async function signNonEvmTransaction(
  params: NonEvmTransactionParams,
  seedPhrase: string
): Promise<SignedTransaction | null> {
  let result: { signedTx: string; txHash: string } | null = null;

  switch (params.chainType) {
    case "bitcoin":
      result = await buildBitcoinTransaction(params, seedPhrase);
      break;
    case "solana":
      result = await buildSolanaTransaction(params, seedPhrase);
      break;
    case "tron":
      result = await buildTronTransaction(params, seedPhrase);
      break;
    default:
      console.error("Unsupported chain type:", params.chainType);
      return null;
  }

  if (!result) {
    return null;
  }

  return {
    chainType: params.chainType,
    signedTx: result.signedTx,
    txHash: result.txHash,
  };
}

export async function broadcastNonEvmTransaction(
  chainType: string,
  signedTx: string
): Promise<string | null> {
  switch (chainType) {
    case "bitcoin":
      return broadcastBitcoinTransaction(signedTx);
    case "solana":
      return broadcastSolanaTransaction(signedTx);
    case "tron":
      return broadcastTronTransaction(signedTx);
    default:
      console.error("Unsupported chain type for broadcast:", chainType);
      return null;
  }
}
