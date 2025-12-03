'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/LoadingSpinner';

const SubmitDataPageContent = dynamic(
  () => import('./submit-content'),
  { 
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export default function SubmitDataPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <LoadingSpinner />;
  }

  return <SubmitDataPageContent />;
}