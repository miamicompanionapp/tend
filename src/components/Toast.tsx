import { useEffect } from "react";

export interface ToastState {
  type: "success" | "error";
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div className={`toast ${toast.type}`}>
      <span className="toast-icon">{toast.type === "success" ? "✓" : "!"}</span>
      <p className="toast-message">{toast.message}</p>
      {toast.actionLabel && toast.onAction && (
        <button
          className="toast-action"
          onClick={() => {
            toast.onAction!();
            onDismiss();
          }}
        >
          {toast.actionLabel}
        </button>
      )}
      <button className="toast-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
