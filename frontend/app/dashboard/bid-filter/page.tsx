'use client';

import { useState } from 'react';
import { SnackbarAlert } from '@/app/_components/report/SnackbarAlert';
import { BidFilter } from '@/app/_components/report/BidFilter';

export default function BidFilterPage() {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });

  const showSnackbar = (
    message: string, 
    severity: 'success' | 'error' | 'warning' | 'info'
  ) => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Bid Filter Tool</h1>
      
      <BidFilter />
      
      <SnackbarAlert 
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={handleCloseSnackbar}
      />
    </div>
  );
}