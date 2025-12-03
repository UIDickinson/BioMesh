// This file must NOT be imported at module level to prevent WASM bundling during build
// It will only be loaded at runtime in the browser via dynamic import with eval

if (typeof window !== 'undefined') {
  // This code only runs in the browser, never during build
  module.exports = {
    useDataRegistry: require('@/hooks/useDataRegistry').useDataRegistry,
  };
}
