"use client";

import { useState } from "react";
import { FileAudio, Settings2, Play, Loader2 } from "lucide-react";

import { useWebSocket  } from "@/hooks/useWebSocket";
import { useSettings   } from "@/hooks/useSettings";
import { useQueue      } from "@/hooks/useQueue";

import { ErrorBoundary        } from "@/components/ErrorBoundary";
import { DropZone             } from "@/components/DropZone";
import { FileQueue            } from "@/components/FileQueue";
import { TranscriptionEditor  } from "@/components/TranscriptionEditor";
import { SettingsPanel        } from "@/components/SettingsPanel";

export default function Home() {
  // Fix #4: crypto.randomUUID() for proper entropy
  const [clientId] = useState(() => crypto.randomUUID());
  const [showSettings, setShowSettings] = useState(false);

  const settings = useSettings();
  const queue    = useQueue(clientId);

  // Fix #1: WebSocket with exponential-backoff reconnect
  useWebSocket(clientId, queue.applyProgress);

  const handleTranscribeAll = () =>
    queue.transcribeAll({
      modelSize:   settings.modelSize,
      language:    settings.language,
      temperature: settings.temperature,
      device:      settings.device,
      computeType: settings.computeType,
      hfToken:     settings.hfToken,
      numWorkers:  settings.numWorkers,
    });

  return (
    <ErrorBoundary>
      <main className="min-h-screen p-6 lg:p-12 flex flex-col items-center justify-center relative overflow-hidden h-screen max-h-screen">

        {/* Animated background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--accent)] opacity-20 blur-[80px] pointer-events-none transition-all duration-500" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[80px] pointer-events-none transition-all duration-500" />

        <div className="w-full h-full z-10 flex flex-col space-y-6">

          {/* ── Header ── */}
          <header className="flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl glass-panel">
                <FileAudio className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">AI Transcriber</h1>
                <p className="text-white/50 text-sm">Pro Edition</p>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(s => !s)}
              className={`p-3 rounded-xl transition-all ${
                showSettings
                  ? "bg-white/10 text-white"
                  : "glass-panel text-white/50 hover:text-white hover:bg-white/5"
              }`}
              aria-label="Toggle settings"
            >
              <Settings2 className="w-5 h-5" />
            </button>
          </header>

          {/* ── Settings Panel ── */}
          <SettingsPanel
            {...settings}
            isVisible={showSettings}
          />

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">

            {/* Left column */}
            <div className="lg:col-span-4 flex flex-col space-y-6 min-h-0">
              <DropZone onFiles={queue.addFiles} />

              <FileQueue
                filesQueue={queue.filesQueue}
                selectedLocalId={queue.selectedLocalId}
                isQueuePaused={queue.isQueuePaused}
                onSelectFile={queue.setSelectedLocalId}
                onCancelOrRemove={queue.cancelOrRemove}
                onTogglePause={queue.togglePause}
                onClearAll={queue.clearQueue}
              />

              {/* Start button */}
              <div className="glass p-5 shrink-0">
                <button
                  onClick={handleTranscribeAll}
                  disabled={!queue.hasIdleFiles || queue.isProcessingAny}
                  className="w-full accent-button py-2.5 flex items-center justify-center space-x-2 text-sm"
                >
                  {queue.isProcessingAny ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Queue…</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>
                        Start All ({queue.filesQueue.filter(f => f.status === "idle" || f.status === "error").length})
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right column */}
            <div className="lg:col-span-8 flex flex-col min-h-0">
              <TranscriptionEditor
                file={queue.selectedFile}
                onResultChange={queue.updateResultText}
              />
            </div>
          </div>

        </div>
      </main>
    </ErrorBoundary>
  );
}
