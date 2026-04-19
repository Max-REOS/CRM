'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium backdrop-blur-sm animate-in">
      <span className="text-base">✓</span>
      {message}
    </div>
  );
}
