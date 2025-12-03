// Server-side stub for encryption to prevent WASM loading during build
export async function getFHEInstance() {
  throw new Error('FHE operations are not available on the server');
}

export async function encryptHealthData() {
  throw new Error('FHE operations are not available on the server');
}

export async function decryptData() {
  throw new Error('FHE operations are not available on the server');
}
