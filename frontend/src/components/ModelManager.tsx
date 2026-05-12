"use client";
import { useState } from "react";
import { RefreshCw, Loader2, Download, Trash2, Check } from "lucide-react";
import { ModelInfo } from "@/lib/types";
import { api } from "@/lib/api";
import { ConfirmModal } from "./ConfirmModal";

interface Props {
  models:    ModelInfo[];
  onRefresh: () => void;
}

export function ModelManager({ models, onRefresh }: Props) {
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [confirmId,   setConfirmId]   = useState<string | null>(null);

  const handleDownload = async (id: string) => {
    setDownloading(p => ({ ...p, [id]: true }));
    try {
      await api.downloadModel(id);
      onRefresh();
    } catch { /* ignore */ }
    setDownloading(p => ({ ...p, [id]: false }));
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    try {
      await api.deleteModel(id);
      onRefresh();
    } catch { /* ignore */ }
  };

  return (
    <>
      <div className="space-y-3 flex flex-col">
        <h3 className="text-white font-semibold mb-2">Models Manager</h3>
        <div className="flex-1 bg-black/20 rounded-lg border border-white/5 overflow-hidden flex flex-col">
          <div className="overflow-y-auto max-h-[250px] p-2 space-y-1 custom-scrollbar">
            {models.length === 0 && (
              <p className="text-white/30 text-sm text-center py-4">Loading models…</p>
            )}
            {models.map(m => (
              <div key={m.id} className="flex flex-col p-2 bg-white/5 hover:bg-white/10 rounded border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">{m.name}</span>
                  <div className="flex items-center space-x-2">
                    {m.downloaded ? (
                      <>
                        <span className="text-xs text-white/60">{m.size_mb} MB</span>
                        <button
                          onClick={() => handleDownload(m.id)}
                          disabled={downloading[m.id]}
                          className="text-[var(--accent)] hover:text-white p-1 rounded transition-colors"
                          title="Re-download / Update"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${downloading[m.id] ? "animate-spin" : ""}`} />
                        </button>
                        <button
                          onClick={() => setConfirmId(m.id)}
                          className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDownload(m.id)}
                        disabled={downloading[m.id]}
                        className="text-xs bg-[var(--accent)] text-white px-3 py-1 rounded flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition-all"
                      >
                        {downloading[m.id]
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Downloading…</>
                          : <><Download className="w-3.5 h-3.5" /> Download</>
                        }
                      </button>
                    )}
                  </div>
                </div>
                {m.downloaded && downloading[m.id] && (
                  <p className="text-[10px] text-[var(--accent)] mt-1">Updating model…</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fix #20: Custom confirm instead of window.confirm */}
      <ConfirmModal
        isOpen={!!confirmId}
        title="Delete model?"
        message={`This will permanently remove the "${confirmId}" model files. You can re-download it later.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmId(null)}
      />
    </>
  );
}
