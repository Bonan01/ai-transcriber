"use client";
import { useState } from "react";
import { RefreshCw, Loader2, Download, Trash2, HardDrive, CheckCircle2 } from "lucide-react";
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

  const downloadedCount = models.filter(m => m.downloaded).length;

  return (
    <>
      <div className="space-y-3 flex flex-col">
        <h3 className="text-white font-semibold mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[var(--accent)]" />
            Models
          </span>
          <span className="text-xs text-white/40 font-normal">
            {downloadedCount}/{models.length} installed
          </span>
        </h3>

        <div className="flex-1 bg-black/20 rounded-lg border border-white/5 overflow-hidden flex flex-col">
          <div className="overflow-y-auto max-h-[350px] p-2 space-y-1.5 custom-scrollbar">
            {models.length === 0 && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-white/30 mr-2" />
                <p className="text-white/30 text-sm">Loading models…</p>
              </div>
            )}
            {models.map(m => (
              <div
                key={m.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  m.downloaded
                    ? "bg-white/[0.03] border-white/5 hover:bg-white/[0.06]"
                    : "bg-transparent border-white/5 hover:bg-white/5"
                }`}
              >
                {/* Status indicator */}
                <div className="shrink-0">
                  {m.downloaded ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-white/20" />
                  )}
                </div>

                {/* Model info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{m.name}</p>
                  {m.downloaded && m.size_mb > 0 && (
                    <p className="text-[11px] text-white/40 mt-0.5">
                      {m.size_mb >= 1024
                        ? `${(m.size_mb / 1024).toFixed(1)} GB`
                        : `${m.size_mb} MB`
                      }
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {m.downloaded ? (
                    <>
                      <button
                        onClick={() => handleDownload(m.id)}
                        disabled={downloading[m.id]}
                        className="p-1.5 rounded-lg text-white/40 hover:text-[var(--accent)] hover:bg-white/5 transition-colors"
                        title="Re-download / Update"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${downloading[m.id] ? "animate-spin" : ""}`} />
                      </button>
                      <button
                        onClick={() => setConfirmId(m.id)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                        title="Delete model"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleDownload(m.id)}
                      disabled={downloading[m.id]}
                      className="text-xs bg-[var(--accent)] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition-all"
                    >
                      {downloading[m.id]
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Downloading…</>
                        : <><Download className="w-3.5 h-3.5" /> Download</>
                      }
                    </button>
                  )}
                </div>
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
