/**
 * FHEVM v0.9 Integration Utilities
 * Using @zama-fhe/relayer-sdk for User Decryption
 * 
 * Based on Cerebrum's proven implementation:
 * - User Decryption via EIP-712 signatures (2-5 seconds, 90% success rate)
 * - Signature caching for 365 days
 * - No Gateway callback required
 */

import { BrowserProvider } from 'ethers';

// FHEVM instance singleton
let fhevmInstance = null;

// Sepolia configuration for Zama FHE
const SEPOLIA_CONFIG = {
  chainId: 11155111,
  relayerUrl: 'https://relayer.sepolia.zama.ai',
  gatewayUrl: 'https://gateway.sepolia.zama.ai',
};

/**
 * Initialize FHEVM v0.9 instance
 * @param {BrowserProvider} provider - Ethers BrowserProvider
 * @returns {Promise<any>} FHEVM instance
 */
export async function initializeFhevm(provider) {
  if (fhevmInstance) {
    console.log('✅ FHEVM already initialized');
    return fhevmInstance;
  }

  try {
    console.log('🔄 Initializing FHEVM v0.9...');
    
    // Dynamic import of the relayer SDK (web version for browser)
    const { initSDK, createInstance, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/web');
    
    // IMPORTANT: Initialize the WASM modules first
    console.log('📦 Initializing SDK (WASM modules)...');
    await initSDK();
    console.log('✅ SDK initialized');
    
    // Now create the instance with SepoliaConfig
    console.log('🔗 Creating FHEVM instance with SepoliaConfig...');
    console.log('   Chain ID:', SepoliaConfig.chainId);
    
    fhevmInstance = await createInstance(SepoliaConfig);
    console.log('✅ FHEVM v0.9 initialized successfully');
    
    return fhevmInstance;
  } catch (error) {
    console.error('❌ Failed to initialize FHEVM:', error);
    throw error;
  }
}

/**
 * Get or create FHEVM instance
 * @param {BrowserProvider} provider - Ethers BrowserProvider
 * @returns {Promise<any>} FHEVM instance
 */
export async function getFhevmInstance(provider) {
  if (!fhevmInstance) {
    return await initializeFhevm(provider);
  }
  return fhevmInstance;
}

/**
 * Local storage wrapper for signature caching
 */
export class SignatureStorage {
  constructor(prefix = 'biomesh_decrypt_') {
    this.prefix = prefix;
  }

  getItem(key) {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.prefix + key);
  }

  setItem(key, value) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.prefix + key, value);
  }

  removeItem(key) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.prefix + key);
  }
}

/**
 * Load or create decryption signature (cached for 365 days)
 * @param {SignatureStorage} storage - Storage instance
 * @param {any} fhe - FHEVM instance
 * @param {string[]} contractAddresses - Contract addresses
 * @param {string} userAddress - User's wallet address
 * @param {any} signer - Ethers signer
 * @returns {Promise<object>} Signature data
 */
export async function loadOrSignDecryptionSignature(
  storage,
  fhe,
  contractAddresses,
  userAddress,
  signer
) {
  const cacheKey = `sig_${userAddress}_${contractAddresses.join('_')}`;
  const cached = storage.getItem(cacheKey);
  
  if (cached) {
    try {
      const sigData = JSON.parse(cached);
      // Check if signature is still valid (within 365 days)
      const now = Math.floor(Date.now() / 1000);
      const expiry = parseInt(sigData.startTimestamp) + (parseInt(sigData.durationDays) * 86400);
      
      if (now < expiry) {
        console.log('✅ Using cached signature (valid until', new Date(expiry * 1000).toISOString(), ')');
        return sigData;
      } else {
        console.log('⚠️ Cached signature expired, requesting new one...');
        storage.removeItem(cacheKey);
      }
    } catch (e) {
      console.warn('Failed to parse cached signature:', e);
      storage.removeItem(cacheKey);
    }
  }

  // Generate new keypair and signature
  console.log('🔑 Generating new decryption keypair...');
  const keypair = fhe.generateKeypair();
  
  const startTimestamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = "365"; // Valid for 1 year
  
  console.log('📝 Creating EIP-712 signature request...');
  const eip712 = fhe.createEIP712(
    keypair.publicKey,
    contractAddresses,
    startTimestamp,
    durationDays
  );
  
  console.log('✍️ Requesting user signature (one-time, valid for 365 days)...');
  const signature = await signer.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message
  );
  
  const sigData = {
    privateKey: keypair.privateKey,
    publicKey: keypair.publicKey,
    signature: signature.replace('0x', ''),
    contractAddresses,
    userAddress,
    startTimestamp,
    durationDays,
  };
  
  // Cache the signature
  storage.setItem(cacheKey, JSON.stringify(sigData));
  console.log('✅ Signature created and cached for 365 days');
  
  return sigData;
}

/**
 * Decrypt euint64 value using User Decryption
 * @param {BrowserProvider} provider - Ethers provider
 * @param {string} contractAddress - Contract address
 * @param {string} handle - Encrypted handle (hex string)
 * @param {any} signer - Ethers signer
 * @returns {Promise<bigint>} Decrypted value
 */
export async function decryptUint64(provider, contractAddress, handle, signer) {
  console.log('🔓 Starting User Decryption (euint64)...');
  console.log('📍 Contract:', contractAddress);
  console.log('🔑 Handle:', handle);
  
  const userAddress = await signer.getAddress();
  console.log('👤 User:', userAddress);
  
  try {
    const fhe = await getFhevmInstance(provider);
    const storage = new SignatureStorage();
    
    // Get or create cached signature
    const sigData = await loadOrSignDecryptionSignature(
      storage,
      fhe,
      [contractAddress],
      userAddress,
      signer
    );
    
    const handleContractPairs = [{
      handle: handle,
      contractAddress: contractAddress,
    }];
    
    console.log('⏳ Waiting 3s for ACL propagation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔓 Performing user decryption via Gateway...');
    const result = await fhe.userDecrypt(
      handleContractPairs,
      sigData.privateKey,
      sigData.publicKey,
      sigData.signature,
      sigData.contractAddresses,
      sigData.userAddress,
      sigData.startTimestamp,
      sigData.durationDays
    );
    
    const decrypted = BigInt(result[handle]);
    console.log('✅ Decrypted value:', decrypted.toString());
    return decrypted;
    
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    throw error;
  }
}

/**
 * Decrypt euint32 value using User Decryption
 * @param {BrowserProvider} provider - Ethers provider
 * @param {string} contractAddress - Contract address
 * @param {string} handle - Encrypted handle (hex string)
 * @param {any} signer - Ethers signer
 * @returns {Promise<number>} Decrypted value
 */
export async function decryptUint32(provider, contractAddress, handle, signer) {
  const result = await decryptUint64(provider, contractAddress, handle, signer);
  return Number(result);
}

/**
 * Batch decrypt multiple values
 * @param {BrowserProvider} provider - Ethers provider
 * @param {string} contractAddress - Contract address
 * @param {string[]} handles - Array of encrypted handles
 * @param {any} signer - Ethers signer
 * @returns {Promise<object>} Map of handle -> decrypted value
 */
export async function batchDecrypt(provider, contractAddress, handles, signer) {
  console.log('🔓 Starting batch User Decryption...');
  console.log('📍 Contract:', contractAddress);
  console.log('🔑 Handles:', handles.length);
  
  const userAddress = await signer.getAddress();
  
  try {
    const fhe = await getFhevmInstance(provider);
    const storage = new SignatureStorage();
    
    const sigData = await loadOrSignDecryptionSignature(
      storage,
      fhe,
      [contractAddress],
      userAddress,
      signer
    );
    
    const handleContractPairs = handles.map(handle => ({
      handle,
      contractAddress,
    }));
    
    console.log('⏳ Waiting 3s for ACL propagation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔓 Performing batch user decryption...');
    const result = await fhe.userDecrypt(
      handleContractPairs,
      sigData.privateKey,
      sigData.publicKey,
      sigData.signature,
      sigData.contractAddresses,
      sigData.userAddress,
      sigData.startTimestamp,
      sigData.durationDays
    );
    
    console.log('✅ Batch decryption complete');
    return result;
    
  } catch (error) {
    console.error('❌ Batch decryption failed:', error);
    throw error;
  }
}

/**
 * Convert handle (bytes32 from contract) to hex string for SDK
 * @param {string|bigint} handle - Handle from contract
 * @returns {string} Hex string handle
 */
export function handleToHex(handle) {
  if (typeof handle === 'bigint') {
    return '0x' + handle.toString(16).padStart(64, '0');
  }
  if (typeof handle === 'string' && handle.startsWith('0x')) {
    return handle;
  }
  return '0x' + BigInt(handle).toString(16).padStart(64, '0');
}

/**
 * Convert wagmi WalletClient to ethers BrowserProvider
 * @param {any} walletClient - Wagmi wallet client
 * @returns {BrowserProvider} Ethers provider
 */
export function walletClientToProvider(walletClient) {
  const { chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
  };
  return new BrowserProvider(transport, network);
}
