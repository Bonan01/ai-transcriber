"use client";
import {
  CheckCircle2, XCircle, FileAudio, Loader2,
  Download, FileText,
} from "lucide-react";
import { QueuedFile, TranscriptionStatus, isActiveStatus } from "@/lib/types";
import { formatTime } from "@/lib/formatTime";

declare global {
  interface Window {
    pywebview?: {
      api: { save_file: (content: string, filename: string) => Promise<boolean> };
    };
  }
}

function StatusIcon({ status }: { status: TranscriptionStatus }) {
  switch (status) {
    case "done":  return <CheckCircle2 className="text-emerald-400 w-5 h-5" />;
    case "error": return <XCircle      className="text-red-400 w-5 h-5" />;
    case "idle":  return <FileAudio    className="text-white/40 w-5 h-5" />;
    default:      return <Loader2      className="text-[var(--accent)] w-5 h-5 animate-spin" />;
  }
}

async function saveFile(content: string, filename: string) {
  if (window.pywebview?.api) {
    await window.pywebview.api.save_file(content, filename);
    return;
  }
  const blob = new Blob([content], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  file:            QueuedFile | undefined;
  onResultChange:  (localId: string, text: string) => void;
}

export function TranscriptionEditor({ file, onResultChange }: Props) {
  if (!file) {
    return (
      <div className="glass flex-1 flex flex-col p-6 min-h-0">
        <div className="flex-1 flex flex-col items-center justify-center text-white/30">
          <FileText className="w-12 h-12 mb-4 opacity-50" />
          <p>Select a file from the queue to view transcription</p>
        </div>
      </div>
    );
  }

  const exportTxt = async () => {
    const filename = `${file.file.name}.txt`;
    await saveFile(file.resultText, filename);
  };

  const exportSrt = async () => {
    const srtContent = file.segments.map((seg, i) => {
      const text = seg.speaker ? `[${seg.speaker}]: ${seg.text.trim()}` : seg.text.trim();
      return `${i + 1}\n${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${text}\n`;
    }).join("\n");
    await saveFile(srtContent, `${file.file.name}.srt`);
  };

  const isActive = isActiveStatus(file.status);

  return (
    <div className="glass flex-1 flex flex-col p-6 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0 border-b border-white/10 pb-4">
        <div className="min-w-0 flex-1 pr-4" style={{ userSelect: "text", cursor: "text" }}>
          <h2 className="font-semibold text-white/90 text-lg break-all">{file.file.name}</h2>
          <p className="text-sm text-white/50 flex items-center gap-2 mt-1">
            <StatusIcon status={file.status} />
            <span className="break-words" title={file.message}>{file.message}</span>
          </p>
        </div>

        {file.status === "done" && (
          <div className="flex space-x-2 shrink-0 self-start">
            <button
              onClick={exportTxt}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> TXT
            </button>
            {file.segments.length > 0 && (
              <button
                onClick={exportSrt}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> SRT
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="w-full bg-white/5 h-1.5 rounded-full mb-4 overflow-hidden shrink-0">
          <div className="bg-[var(--accent)] h-full w-full origin-left animate-pulse" />
        </div>
      )}

      {/* Editor */}
      <textarea
        value={file.resultText}
        onChange={e => onResultChange(file.localId, e.target.value)}
        placeholder={
          file.status === "idle"
            ? "Press Start to begin transcription..."
            : "Transcription will appear here..."
        }
        className="flex-1 w-full bg-transparent resize-none outline-none text-white/90 placeholder:text-white/20 text-base leading-relaxed custom-scrollbar"
        readOnly={isActive}
      />
    </div>
  );
}
