'use client';

import { Database, Lock, Cpu, Shield, Coins, Users } from 'lucide-react';

export default function AboutPage() {
  const features = [
    {
      icon: Lock,
      title: 'Fully Homomorphic Encryption',
      description: 'Built on Zama\'s fhEVM, enabling computation on encrypted data without ever decrypting it.'
    },
    {
      icon: Database,
      title: 'Blockchain Storage',
      description: 'Immutable, transparent storage of encrypted health records on Ethereum Sepolia testnet.'
    },
    {
      icon: Coins,
      title: 'Fair Compensation',
      description: 'Patients earn 70% of query fees automatically when their data contributes to research.'
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Zero-knowledge queries ensure researchers never see raw patient data.'
    },
    {
      icon: Cpu,
      title: 'Smart Contracts',
      description: 'Automated payment distribution and access control via Solidity smart contracts.'
    },
    {
      icon: Users,
      title: 'Decentralized Marketplace',
      description: 'Direct patient-to-researcher data marketplace with no intermediaries.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          About BioMesh
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Revolutionizing clinical trial data sharing with privacy-preserving encryption
        </p>
      </div>

      <div className="glass-morphism rounded-2xl p-12 mb-12 border border-primary-500/20">
        <h2 className="text-3xl font-bold mb-6">The Problem</h2>
        <div className="space-y-4 text-gray-600 dark:text-gray-400">
          <p>
            Clinical trial data is currently siloed across institutions, making research inefficient 
            and slowing medical breakthroughs. When data breaches occur, the average cost is $7.13 million, 
            and patients have no control over or benefit from their own health data.
          </p>
          <p>
            Traditional data sharing requires decrypting sensitive information, exposing patient privacy 
            to risks. Researchers struggle to access diverse datasets, while patients lose ownership of 
            their valuable health information.
          </p>
        </div>
      </div>

      <div className="glass-morphism rounded-2xl p-12 mb-12 border border-primary-500/20">
        <h2 className="text-3xl font-bold mb-6">Our Solution</h2>
        <div className="space-y-4 text-gray-600 dark:text-gray-400">
          <p>
            BioMesh creates a decentralized marketplace where patients submit encrypted health data 
            using Zama's Fully Homomorphic Encryption (FHE). Researchers can query this data and 
            receive encrypted results without ever seeing raw patient information.
          </p>
          <p>
            Every query automatically compensates contributing patients through smart contracts, 
            creating a fair and transparent ecosystem. The blockchain ensures immutability and 
            auditability while FHE guarantees privacy.
          </p>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-8 text-center">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card-3d p-6 glass-morphism rounded-xl border border-primary-500/20 hover:border-primary-500/40 transition-all"
            >
              <div className="p-3 bg-primary-500/10 rounded-lg w-fit mb-4">
                <feature.icon className="h-6 w-6 text-primary-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-morphism rounded-2xl p-12 mb-12 border border-primary-500/20">
        <h2 className="text-3xl font-bold mb-6">Technology Stack</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-lg mb-3 text-primary-500">Smart Contracts</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Solidity with Zama's fhEVM library</li>
              <li>• DataRegistry for encrypted health records</li>
              <li>• ResearchOracle for FHE queries</li>
              <li>• PaymentProcessor for automatic distributions</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-3 text-primary-500">Frontend</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Next.js 14 with App Router</li>
              <li>• fhevmjs for client-side encryption</li>
              <li>• ethers.js for blockchain interaction</li>
              <li>• TailwindCSS for modern UI</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="glass-morphism rounded-2xl p-12 border border-primary-500/20">
        <h2 className="text-3xl font-bold mb-6">Deployed Contracts</h2>
        <div className="space-y-3 font-mono text-sm">
          <div className="flex flex-col space-y-1">
            <span className="text-gray-600 dark:text-gray-400">DataRegistry:</span>
            <a
              href="https://sepolia.etherscan.io/address/0xb743ba11eea1aA78911127859550c1c119573cD5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:text-primary-600 break-all"
            >
              0xb743ba11eea1aA78911127859550c1c119573cD5
            </a>
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-gray-600 dark:text-gray-400">PaymentProcessor:</span>
            <a
              href="https://sepolia.etherscan.io/address/0xaEfa63772566B79AEC9c0BabE2F55d76880b7591"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:text-primary-600 break-all"
            >
              0xaEfa63772566B79AEC9c0BabE2F55d76880b7591
            </a>
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-gray-600 dark:text-gray-400">ResearchOracle:</span>
            <a
              href="https://sepolia.etherscan.io/address/0xe0bfB2eBC8830b7ACD56A317Fc37DE8887743D1b"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:text-primary-600 break-all"
            >
              0xe0bfB2eBC8830b7ACD56A317Fc37DE8887743D1b
            </a>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-6">
          Network: Ethereum Sepolia Testnet (Chain ID: 11155111)
        </p>
      </div>

      <div className="mt-12 text-center p-8 glass-morphism rounded-2xl border border-primary-500/20">
        <h2 className="text-2xl font-bold mb-4">Built for Zama Developer Program</h2>
        <p className="text-gray-600 dark:text-gray-400">
          This project demonstrates the power of Fully Homomorphic Encryption in healthcare data management, 
          showcasing how FHE can enable privacy-preserving computation at scale.
        </p>
      </div>
    </div>
  );
}