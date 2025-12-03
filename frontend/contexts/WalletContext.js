'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CHAIN_CONFIG } from '@/lib/contracts';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);

      const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAddress(accounts[0]);
          await updateBalance(web3Provider, accounts[0]);
          // Get signer when accounts change
          try {
            const userSigner = await web3Provider.getSigner();
            setSigner(userSigner);
          } catch (err) {
            console.error('Failed to get signer on account change:', err);
          }
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());

      // Check if already connected and get signer
      window.ethereum.request({ method: 'eth_accounts' }).then(async (accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          await updateBalance(web3Provider, accounts[0]);
          try {
            const userSigner = await web3Provider.getSigner();
            setSigner(userSigner);
          } catch (err) {
            console.error('Failed to get signer on load:', err);
          }
        }
      });

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const updateBalance = async (prov, addr) => {
    if (prov && addr) {
      try {
        const bal = await prov.getBalance(addr);
        setBalance(ethers.formatEther(bal));
      } catch (err) {
        console.error('Failed to fetch balance:', err);
      }
    }
  };

  const connect = async () => {
    if (!provider) {
      setError('MetaMask not detected');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const network = await provider.getNetwork();

      if (Number(network.chainId) !== CHAIN_CONFIG.chainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${CHAIN_CONFIG.chainId.toString(16)}` }],
          });
        } catch (switchError) {
          setError('Please switch to Sepolia network');
          setIsConnecting(false);
          return;
        }
      }

      const accounts = await provider.send('eth_requestAccounts', []);
      const userSigner = await provider.getSigner();

      setAddress(accounts[0]);
      setSigner(userSigner);
      await updateBalance(provider, accounts[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setSigner(null);
    setBalance('0');
  };

  const value = {
    provider,
    signer,
    address,
    balance,
    isConnecting,
    error,
    connect,
    disconnect,
    isConnected: !!address,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
