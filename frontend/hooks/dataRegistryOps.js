// This file is specifically designed to avoid being bundled during build
// It only references fhevmjs indirectly through dynamic imports

'use client';

export const dataRegistryOperations = {
  async submitHealthData(signer, contractAddress, data) {
    const { useDataRegistry } = await import('./useDataRegistry.js');
    const hook = useDataRegistry(signer);
    return hook.submitHealthData?.(data);
  },

  async getPatientRecords(signer, address) {
    const { useDataRegistry } = await import('./useDataRegistry.js');
    const hook = useDataRegistry(signer);
    return hook.getPatientRecords?.(address);
  },

  async revokeRecord(signer, recordId) {
    const { useDataRegistry } = await import('./useDataRegistry.js');
    const hook = useDataRegistry(signer);
    return hook.revokeRecord?.(recordId);
  },
};
