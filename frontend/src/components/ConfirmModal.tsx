"use client";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Fix #20: Native window.confirm is unreliable in pywebview — use this instead */
export function ConfirmModal({
  isOpen, title, message,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  dangerous    = false,
  onConfirm, onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            key="dialog"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            exit={{   scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="glass p-6 max-w-sm w-full mx-4 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-white font-semibold text-lg">{title}</h2>
            <p className="text-white/60 text-sm">{message}</p>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2 rounded-xl text-white text-sm font-medium transition-all hover:brightness-110 ${
                  dangerous ? "bg-red-500" : "bg-[var(--accent)]"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
