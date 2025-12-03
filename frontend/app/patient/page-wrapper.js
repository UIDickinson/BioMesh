'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/LoadingSpinner';

// Dynamically import the main dashboard component to delay hook imports
const PatientDashboardContent = dynamic(
  () => import('./patient-dashboard-content'),
  { loading: () => <LoadingSpinner /> }
);

export default function PatientDashboard() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <LoadingSpinner />;
  }

  return <PatientDashboardContent />;
}
