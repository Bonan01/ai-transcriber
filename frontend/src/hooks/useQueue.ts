"use client";
import { useState, useCallback } from "react";
import { QueuedFile, TranscriptionStatus, isActiveStatus, ProgressData } from "@/lib/types";
import { api, UploadPayload } from "@/lib/api";

export function useQueue(clientId: string) {
  const [filesQueue,     setFilesQueue]     = useState<QueuedFile[]>([]);
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
  const [isQueuePaused,  setIsQueuePaused]  = useState(false);

  /** Add files to the queue */
  const addFiles = useCallback((files: File[]) => {
    const newFiles: QueuedFile[] = files.map(f => ({
      localId: crypto.randomUUID(), // Fix #4
      file: f,
      status: "idle" as TranscriptionStatus,
      message: "Waiting...",
      resultText: "",
      segments: [],
    }));
    setFilesQueue(prev => [...prev, ...newFiles]);
    // Select the first newly added file if nothing was selected
    setSelectedLocalId(prev => prev ?? newFiles[0]?.localId ?? null);
  }, []);

  /** Apply a WebSocket progress message from the backend */
  const applyProgress = useCallback((data: ProgressData) => {
    setFilesQueue(prev =>
      prev.map(qf => {
        if (qf.backendId !== data.file_id) return qf;
        const next = { ...qf };
        if (data.status) next.status = data.status;
        if (data.message) next.message = data.message;
        if (data.status === "done" && data.result) {
          next.resultText = data.result.text;
          next.segments   = data.result.segments;
        } else if (data.segment) {
          next.resultText += data.segment;
          if (data.start !== undefined && data.end !== undefined) {
            next.segments = [...next.segments, { start: data.start, end: data.end, text: data.segment }];
          }
        }
        return next;
      })
    );
  }, []);

  /**
   * Fix #3: Upload all idle/errored files without race conditions.
   * One optimistic setFilesQueue → parallel uploads → per-file result updates.
   */
  const transcribeAll = useCallback(async (settings: Omit<UploadPayload, "file" | "clientId">) => {
    const idleFiles = filesQueue.filter(f => f.status === "idle" || f.status === "error");
    if (idleFiles.length === 0) return;

    // Optimistic: mark all as uploading at once
    setFilesQueue(prev => prev.map(f =>
      (f.status === "idle" || f.status === "error")
        ? { ...f, status: "queued" as TranscriptionStatus, message: "Uploading...", resultText: "", segments: [] }
        : f
    ));

    await Promise.allSettled(
      idleFiles.map(async qf => {
        try {
          const data = await api.uploadFile({ ...settings, file: qf.file, clientId });
          setFilesQueue(prev => prev.map(f =>
            f.localId === qf.localId
              ? { ...f, backendId: data.file_id, status: "queued" as TranscriptionStatus, message: "In Queue..." }
              : f
          ));
        } catch {
          setFilesQueue(prev => prev.map(f =>
            f.localId === qf.localId
              ? { ...f, status: "error" as TranscriptionStatus, message: "Failed to upload" }
              : f
          ));
        }
      })
    );
  }, [filesQueue, clientId]);

  /** Cancel active task or remove idle/done/errored file */
  const cancelOrRemove = useCallback(async (qf: QueuedFile) => {
    if (isActiveStatus(qf.status) && qf.backendId) {
      await api.cancelTask(qf.backendId); // best-effort, already swallows errors
      setFilesQueue(prev => prev.map(f =>
        f.localId === qf.localId
          ? { ...f, status: "error" as TranscriptionStatus, message: "Cancelled by user" }
          : f
      ));
    } else {
      setFilesQueue(prev => prev.filter(f => f.localId !== qf.localId));
      setSelectedLocalId(prev => prev === qf.localId ? null : prev);
    }
  }, []);

  /**
   * Fix #2: Clear queue AND cancel all active backend tasks first.
   */
  const clearQueue = useCallback(async () => {
    const active = filesQueue.filter(f => isActiveStatus(f.status) && f.backendId);
    await Promise.allSettled(active.map(f => api.cancelTask(f.backendId!)));
    setFilesQueue([]);
    setSelectedLocalId(null);
  }, [filesQueue]);

  const togglePause = useCallback(async () => {
    try {
      if (isQueuePaused) {
        await api.resumeQueue();
      } else {
        await api.pauseQueue();
      }
      setIsQueuePaused(p => !p);
    } catch { /* ignore */ }
  }, [isQueuePaused]);

  const updateResultText = useCallback((localId: string, text: string) => {
    setFilesQueue(prev => prev.map(f => f.localId === localId ? { ...f, resultText: text } : f));
  }, []);

  const hasIdleFiles    = filesQueue.some(f => f.status === "idle" || f.status === "error");
  const isProcessingAny = filesQueue.some(f => isActiveStatus(f.status));
  const selectedFile    = filesQueue.find(f => f.localId === selectedLocalId);

  return {
    filesQueue,
    selectedLocalId, setSelectedLocalId,
    selectedFile,
    isQueuePaused,
    hasIdleFiles,
    isProcessingAny,
    addFiles,
    applyProgress,
    transcribeAll,
    cancelOrRemove,
    clearQueue,
    togglePause,
    updateResultText,
  };
}
