'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    bgColor: 'bg-emerald-400 dark:bg-emerald-950/50',
    borderColor: 'border-emerald-500 dark:border-emerald-800',
    textColor: 'text-slate-950 dark:text-emerald-100',
    iconColor: 'text-emerald-700 dark:text-emerald-300',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-400 dark:bg-red-950/50',
    borderColor: 'border-red-500 dark:border-red-800',
    textColor: 'text-slate-950 dark:text-red-100',
    iconColor: 'text-red-700 dark:text-red-300',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-400 dark:bg-amber-950/50',
    borderColor: 'border-amber-500 dark:border-amber-800',
    textColor: 'text-slate-950 dark:text-amber-100',
    iconColor: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-400 dark:bg-blue-950/50',
    borderColor: 'border-blue-500 dark:border-blue-800',
    textColor: 'text-slate-950 dark:text-blue-100',
    iconColor: 'text-blue-700 dark:text-blue-300',
  },
};

export default function Toast({
  id,
  message,
  type = 'info',
  duration = 5000, // Changed from 4000ms to 5000ms (5 seconds)
  onClose,
}: ToastProps) {
  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        flex items-start gap-3 p-4 pr-3 rounded-xl border backdrop-blur-md shadow-lg
        ${config.bgColor} ${config.borderColor}
        min-w-[320px] max-w-md
      `}
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <Icon className={`w-5 h-5 ${config.iconColor}`} />
      </div>

      {/* Message */}
      <p className={`flex-1 text-sm font-medium ${config.textColor} leading-relaxed`}>
        {message}
      </p>

      {/* Close Button */}
      <button
        onClick={() => onClose(id)}
        className={`shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${config.textColor}`}
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Bar */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-1 ${config.iconColor.replace('text-', 'bg-').replace('dark:', '')} rounded-b-xl origin-left`}
        style={{ width: '100%' }}
      />
    </motion.div>
  );
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type?: ToastType;
  }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-100 flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={onClose}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
