'use client';

import { Toaster } from 'sonner';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      toastOptions={{
        style: {
          background: '#FFFFFF',
          color: '#36454F',
          border: '2px solid #E8DCC4',
        },
        className: 'toast',
      }}
    />
  );
}
