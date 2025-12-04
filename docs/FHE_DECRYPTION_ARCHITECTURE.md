# FHE Decryption Architecture - Production Guide

## Overview

BioMesh uses Zama's Fully Homomorphic Encryption (FHE) to keep health data encrypted even during computation. This document explains how decryption works in production.

## Decryption Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Researcher    │     │  ResearchOracle  │     │  Zama Gateway   │
│   (Frontend)    │     │    (Contract)    │     │   (Off-chain)   │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │ 1. requestDecryption()│                        │
         │──────────────────────>│                        │
         │                       │                        │
         │                       │ 2. makePubliclyDecryptable()
         │                       │───────────────────────>│
         │                       │                        │
         │                       │     3. Gateway decrypts│
         │                       │        off-chain       │
         │                       │                        │
         │                       │ 4. publicDecryptionResponse()
         │                       │<───────────────────────│
         │                       │                        │
         │                       │ 5. Verify KMS signatures
         │                       │    Store decrypted values
         │                       │                        │
         │ 6. getDecryptedResult()                        │
         │<──────────────────────│                        │
         │                       │                        │
```

## Components

### 1. Smart Contract (ResearchOracle.sol)

**Key Functions:**
- `requestDecryption(queryId)` - Marks encrypted values for public decryption
- `submitDecryptedResult(...)` - Receives decrypted values from Gateway/relayer
- `getDecryptedResult(queryId)` - Returns decrypted values to researcher

**Security:**
- KMS signature verification ensures only authentic decryptions are accepted
- Only the query owner can request decryption

### 2. Zama Gateway

The Gateway is Zama's off-chain service that:
1. Monitors for `makePubliclyDecryptable()` calls
2. Decrypts ciphertexts using KMS (Key Management Service)
3. Signs results with KMS keys
4. Calls back to contract with decrypted values

### 3. Relayer Service (Required for Production)

A relayer is needed to:
1. Listen for `DecryptionRequested` events
2. Forward requests to Zama Gateway
3. Submit decrypted results back to the contract

## Production Options

### Option A: Use Zama's Hosted Relayer (Recommended)

For Sepolia testnet, Zama provides infrastructure. Check:
- https://docs.zama.ai/fhevm
- Gateway address on Sepolia

### Option B: Run Your Own Relayer

```javascript
// Example relayer pseudocode
const relayer = {
  async onDecryptionRequested(event) {
    const { queryId, handles } = event;
    
    // 1. Request decryption from Gateway
    const decryptedValues = await gateway.publicDecrypt(handles);
    
    // 2. Get KMS signatures
    const proof = await kms.sign(handles, decryptedValues);
    
    // 3. Submit to contract
    await oracle.submitDecryptedResult(
      queryId,
      decryptedValues.sum,
      decryptedValues.count,
      proof
    );
  }
};
```

### Option C: Client-Side Decryption (Alternative)

For user-specific data, use the SDK's `userDecrypt`:

```javascript
import { createInstance } from '@fhevm/fhevmjs';

const instance = await createInstance({
  chainId: 11155111,
  publicKey: GATEWAY_PUBLIC_KEY,
});

// Generate keypair for user decryption
const { publicKey, privateKey } = instance.generateKeypair();

// Create EIP-712 signature
const eip712 = instance.createEIP712(publicKey, [contractAddress], startTime, days);
const signature = await signer.signTypedData(eip712.domain, eip712.types, eip712.message);

// Decrypt
const decryptedValue = await instance.userDecrypt(
  handleContractPairs,
  privateKey,
  publicKey,
  signature,
  [contractAddress],
  signerAddress,
  startTime,
  days
);
```

## Current Implementation Status

### What's Implemented ✅
- `requestDecryption()` marks values for public decryption
- `submitDecryptedResult()` accepts decrypted values with proof
- `getDecryptedResult()` returns results
- Frontend UI shows decryption status

### What's Needed for Production ⚠️
1. **Relayer Service** - Either use Zama's or deploy your own
2. **KMS Verification** - Uncomment proof verification in contract
3. **Gateway Configuration** - Set correct Gateway address

## Contract Configuration

```solidity
// In ResearchOracle constructor or init
// Set the KMS verifier address for signature verification
kmsVerifierAddress = ZAMA_KMS_VERIFIER_ADDRESS;
```

## Security Considerations

1. **KMS Signatures** - Always verify in production
2. **Access Control** - Only query owner can request decryption
3. **Rate Limiting** - Consider limiting decryption requests
4. **Audit** - Get contract audited before mainnet

## Testnet vs Mainnet

| Aspect | Testnet (Sepolia) | Mainnet |
|--------|-------------------|---------|
| KMS Verification | Optional | Required |
| Relayer | Zama hosted | Self-hosted or paid service |
| Decryption Time | ~30s - 2min | ~30s - 2min |
| Cost | Free (testnet ETH) | Real ETH for gas |

## Troubleshooting

### "Pending Decryption" stuck
- Check if relayer is running
- Verify Gateway address is correct
- Check contract has proper permissions

### "Invalid KMS Signatures"
- KMS signers may have changed
- Update signer addresses in KMSVerifier

### Decryption takes too long
- Gateway may be under load
- Check Zama status page

## References

- [Zama FHEVM Docs](https://docs.zama.ai/fhevm)
- [Gateway Contracts](https://github.com/zama-ai/fhevm/tree/main/gateway-contracts)
- [KMS Verifier](https://github.com/zama-ai/fhevm/tree/main/host-contracts)
