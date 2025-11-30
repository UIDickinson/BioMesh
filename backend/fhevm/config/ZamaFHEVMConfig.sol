// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * Local stub of Zama's fhEVM config used for tests and local compilation.
 *
 * NOTE: This is a shallow stub added so the repo compiles in environments
 * where the `fhevm` package does not expose the `config` file. In production
 * or when using the actual fhEVM toolchain, remove this stub and rely on the
 * official package files.
 */

abstract contract ZamaFHEVMConfig {
    // Intentionally left minimal — real package provides network constants & helpers
}

// Provide a Sepolia-specific alias used by contracts in this repo
abstract contract SepoliaZamaFHEVMConfig is ZamaFHEVMConfig {}
