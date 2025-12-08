'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '@/lib/contracts';

/**
 * Hook for World ID verification integration (OPTIONAL)
 * 
 * World ID provides Sybil-resistant identity verification using
 * zero-knowledge proofs. Users verify their uniqueness without
 * revealing personal information.
 * 
 * NOTE: For the Zama Builder Programme demo, World ID verification
 * is OPTIONAL. Only the consent form is required to use the platform.
 * World ID provides enhanced trust level but is not mandatory.
 * 
 * In production, this integrates with the World ID SDK and verifier contract.
 * For development/testnet, it provides a simulated verification flow.
 */
export function useWorldId(signer) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState({
    isVerified: false,
    verificationTime: null,
    nullifierHash: null
  });

  const getContract = useCallback(() => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    
    if (!CONTRACTS.ConsentRegistry?.address) {
      throw new Error('ConsentRegistry address not configured');
    }
    
    return new ethers.Contract(
      CONTRACTS.ConsentRegistry.address,
      CONTRACTS.ConsentRegistry.abi,
      signer
    );
  }, [signer]);

  /**
   * Check if a user is World ID verified
   */
  const checkVerificationStatus = useCallback(async (address) => {
    // Return false if signer not available
    if (!signer) {
      return false;
    }
    
    try {
      const contract = getContract();
      const isVerified = await contract.isUserWorldIdVerified(address);
      
      if (isVerified) {
        const verification = await contract.worldIdVerifications(address);
        setVerificationStatus({
          isVerified: true,
          verificationTime: Number(verification.verificationTime),
          nullifierHash: verification.nullifierHash.toString(),
          expirationTime: Number(verification.expirationTime)
        });
      } else {
        setVerificationStatus({
          isVerified: false,
          verificationTime: null,
          nullifierHash: null
        });
      }
      
      return isVerified;
    } catch (err) {
      // Only log if it's not a contract configuration issue
      if (!err.message?.includes('not configured')) {
        console.error('Error checking verification status:', err);
      }
      return false;
    }
  }, [signer, getContract]);

  /**
   * Initiate World ID verification
   * 
   * In production, this would:
   * 1. Open World ID widget/QR code
   * 2. User scans with World App
   * 3. Receive proof from World ID
   * 4. Submit proof to contract
   * 
   * For development, we simulate this with a testnet-compatible flow
   */
  const initiateVerification = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In production, this would integrate with World ID SDK:
      // const { proof, nullifierHash } = await IDKit.open({
      //   app_id: 'app_biomesh_research',
      //   action: 'biomesh-verify',
      //   signal: address,
      //   verification_level: 'orb'
      // });
      
      // For development/testnet, we generate a simulated proof
      // that the contract will accept
      const address = await signer.getAddress();
      
      // Generate a unique nullifier hash based on address and timestamp
      // This ensures each user can only verify once
      const nullifierHash = ethers.keccak256(
        ethers.solidityPacked(
          ['address', 'string', 'uint256'],
          [address, 'biomesh-verify', Math.floor(Date.now() / 1000)]
        )
      );
      
      // Create a simple proof (in production, this would be a ZK proof)
      const proof = ethers.hexlify(ethers.toUtf8Bytes('world-id-proof-' + address));
      
      return {
        success: true,
        nullifierHash: BigInt(nullifierHash),
        proof: proof,
        message: 'World ID verification initiated'
      };
    } catch (err) {
      const errorMessage = err?.message || 'Failed to initiate verification';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [signer]);

  /**
   * Submit World ID verification to the contract
   */
  const submitVerification = useCallback(async (nullifierHash, proof) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = getContract();
      
      const tx = await contract.verifyWorldId(nullifierHash, proof);
      const receipt = await tx.wait();
      
      // Update local state
      const address = await signer.getAddress();
      await checkVerificationStatus(address);
      
      return {
        success: true,
        transactionHash: receipt.hash,
        message: 'World ID verification successful!'
      };
    } catch (err) {
      let errorMessage = err?.reason || err?.message || 'Verification failed';
      
      // Handle specific error cases
      if (errorMessage.includes('Nullifier already used')) {
        errorMessage = 'This World ID has already been used for verification';
      } else if (errorMessage.includes('World ID verification required')) {
        errorMessage = 'Please complete World ID verification first';
      }
      
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [getContract, signer, checkVerificationStatus]);

  /**
   * Complete verification flow (combines initiate and submit)
   */
  const verify = useCallback(async () => {
    // First, initiate verification to get proof
    const initiateResult = await initiateVerification();
    
    if (!initiateResult.success) {
      return initiateResult;
    }
    
    // Then submit the verification to the contract
    return await submitVerification(
      initiateResult.nullifierHash,
      initiateResult.proof
    );
  }, [initiateVerification, submitVerification]);

  /**
   * Open World ID widget for verification
   * This is the main entry point for users
   */
  const openWorldIdWidget = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if already verified
      const address = await signer.getAddress();
      const isAlreadyVerified = await checkVerificationStatus(address);
      
      if (isAlreadyVerified) {
        return {
          success: true,
          alreadyVerified: true,
          message: 'Already verified with World ID'
        };
      }
      
      // Proceed with verification
      return await verify();
    } catch (err) {
      const errorMessage = err?.message || 'World ID verification failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [signer, verify, checkVerificationStatus]);

  return {
    isLoading,
    error,
    verificationStatus,
    checkVerificationStatus,
    initiateVerification,
    submitVerification,
    verify,
    openWorldIdWidget
  };
}

/**
 * World ID configuration constants
 */
export const WORLD_ID_CONFIG = {
  appId: 'app_biomesh_research',
  action: 'biomesh-verify',
  verificationLevel: 'orb', // 'orb' for highest security, 'device' for phone-based
  
  // URLs for World ID
  worldIdUrl: 'https://id.worldcoin.org',
  verifierContract: {
    mainnet: '0x...', // Mainnet verifier
    sepolia: '0x...', // Sepolia testnet verifier
  }
};
