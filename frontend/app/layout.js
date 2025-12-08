import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navabar';
import { WalletProvider } from '@/contexts/WalletContext';
import { ConsentProvider } from '@/contexts/ConsentContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'BioMesh - Encrypted Clinical Trial Data Marketplace',
  description: 'Privacy-preserving clinical trial data marketplace using Zama FHE',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black min-h-screen text-gray-900 dark:text-gray-100`}>
        <WalletProvider>
          <ConsentProvider>
            <Navbar />
            <main className="min-h-[calc(100vh-4rem)]">
              {children}
            </main>
          </ConsentProvider>
        </WalletProvider>
        <footer className="border-t border-primary-500/20 py-8 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>BioMesh - Built for Zama Developer Program</p>
            <p className="mt-2">Powered by Fully Homomorphic Encryption</p>
          </div>
        </footer>
      </body>
    </html>
  );
}