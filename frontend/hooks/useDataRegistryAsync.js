'use client';

// This is a wrapper hook that avoids importing useDataRegistry at module level
// useDataRegistry imports encryption.js which imports fhevmjs (with WASM)
// By using dynamic import inside the hook, we delay the import until runtime

export async function getDataRegistryHook(signer) {
  if (!signer) throw new Error('Signer is required');
  
  const { useDataRegistry } = await import('./useDataRegistry');
  return useDataRegistry(signer);
}

// Hook that returns promise-based functions instead of hook
export function useDataRegistryAsync(signer) {
  return {
    submitHealthData: async (data) => {
      const hook = await getDataRegistryHook(signer);
      return hook.submitHealthData?.(data);
    },
    getPatientRecords: async (address) => {
      const hook = await getDataRegistryHook(signer);
      return hook.getPatientRecords?.(address);
    },
    revokeRecord: async (recordId) => {
      const hook = await getDataRegistryHook(signer);
      return hook.revokeRecord?.(recordId);
    },
  };
}
