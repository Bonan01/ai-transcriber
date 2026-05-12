"use client";
import {
  CheckCircle2, XCircle, FileAudio, Loader2,
  ListVideo, Pause, PlayCircle, Trash2, X,
} from "lucide-react";
import { QueuedFile, TranscriptionStatus, isActiveStatus } from "@/lib/types";

function StatusIcon({ status }: { status: TranscriptionStatus }) {
  switch (status) {
    case "done":  return <CheckCircle2 className="text-emerald-400 w-5 h-5 shrink-0" />;
    case "error": return <XCircle      className="text-red-400 w-5 h-5 shrink-0" />;
    case "idle":  return <FileAudio    className="text-white/40 w-5 h-5 shrink-0" />;
    default:      return <Loader2      className="text-[var(--accent)] w-5 h-5 animate-spin shrink-0" />;
  }
}

interface Props {
  filesQueue:      QueuedFile[];
  selectedLocalId: string | null;
  isQueuePaused:   boolean;
  onSelectFile:    (id: string) => void;
  onCancelOrRemove:(qf: QueuedFile) => void;
  onTogglePause:   () => void;
  onClearAll:      () => void;
}

export function FileQueue({
  filesQueue, selectedLocalId, isQueuePaused,
  onSelectFile, onCancelOrRemove, onTogglePause, onClearAll,
}: Props) {
  return (
    <div className="glass flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-white/10 shrink-0 flex items-center justify-between">
        <h2 className="font-semibold text-white/80 flex items-center gap-2">
          <ListVideo className="w-4 h-4" /> Queue ({filesQueue.length})
        </h2>
        <div className="flex items-center space-x-1">
          <button
            onClick={onTogglePause}
            className={`p-1.5 rounded-lg transition-colors ${
              isQueuePaused
                ? "text-[var(--accent)] bg-white/10"
                : "text-white/40 hover:text-white hover:bg-white/10"
            }`}
            title={isQueuePaused ? "Resume Queue" : "Pause Queue"}
          >
            {isQueuePaused
              ? <PlayCircle className="w-4 h-4" />
              : <Pause      className="w-4 h-4" />
            }
          </button>

          {filesQueue.length > 0 && (
            <button
              onClick={onClearAll}
              className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
              title="Clear Queue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {filesQueue.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/30 text-sm">
            No files in queue
          </div>
        ) : (
          filesQueue.map(qf => (
            <div
              key={qf.localId}
              onClick={() => onSelectFile(qf.localId)}
              className={`group p-3 rounded-xl flex items-center space-x-3 cursor-pointer transition-colors ${
                selectedLocalId === qf.localId ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <StatusIcon status={qf.status} />
              <div className="flex-1 min-w-0" style={{ userSelect: "text" }}>
                <p className="text-sm font-medium text-white truncate" title={qf.file.name}>
                  {qf.file.name}
                </p>
                <p className="text-xs text-white/50 truncate" title={qf.message}>
                  {qf.message}
                </p>
              </div>

              <button
                onClick={e => { e.stopPropagation(); onCancelOrRemove(qf); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"
                title={isActiveStatus(qf.status) ? "Cancel Task" : "Remove from Queue"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
