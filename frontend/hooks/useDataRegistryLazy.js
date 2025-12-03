'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';

/**
 * Lazy-loading wrapper for useDataRegistry
 * This hook dynamically imports and initializes the data registry hook
 * to avoid bundling WASM modules at build time
 */
export function useDataRegistryLazy() {
  const { signer } = useWallet();
  const [hookMethods, setHookMethods] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!signer) return;

    const loadHook = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Dynamic import of the hook module
        const module = await import('@/hooks/useDataRegistry');
        const { useDataRegistry } = module;
        
        // Now we can call the hook safely since we're inside the component
        // However, we can't call it here. Instead, we'll return it for the component to use
        // So we just store a reference that the component can call
        setHookMethods({
          useDataRegistry,
          signer,
        });
      } catch (err) {
        console.error('Failed to load useDataRegistry:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadHook();
  }, [signer]);

  return { hookMethods, isLoading, error };
}
