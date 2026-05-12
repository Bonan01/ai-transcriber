"use client";
import { useState } from "react";
import { Cpu, Server, Loader2, Download, RefreshCw } from "lucide-react";
import { CudaInfo } from "@/lib/types";
import { api } from "@/lib/api";

interface Props {
  cudaInfo:  CudaInfo;
  onRefresh: () => void;
}

export function SystemPanel({ cudaInfo, onRefresh }: Props) {
  const [installing, setInstalling] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      await api.installCuda();
      onRefresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Install failed");
    }
    setInstalling(false);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold mb-2 flex items-center justify-between">
        System
        <button onClick={onRefresh} className="text-[var(--accent)] hover:bg-white/10 p-1 rounded transition-colors">
          <RefreshCw className="w-3 h-3" />
        </button>
      </h3>

      <div className="bg-black/20 rounded-lg p-3 border border-white/5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/80 flex items-center gap-2">
            <Cpu className="w-4 h-4" /> CUDA (CTranslate2)
          </span>
          {cudaInfo.has_cuda
            ? <span className="text-emerald-400 font-medium">Ready</span>
            : <span className="text-white/40">No GPU</span>
          }
        </div>

        <div className="flex items-center justify-between text-sm border-t border-white/10 pt-2">
          <span className="text-white/80 flex items-center gap-2">
            <Server className="w-4 h-4" /> CUDA Toolkit (pip)
          </span>
          {cudaInfo.has_cublas_pip
            ? <span className="text-emerald-400 font-medium">Installed</span>
            : <span className="text-red-400 font-medium">Missing DLLs</span>
          }
        </div>

        {!cudaInfo.has_cublas_pip && (
          <>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full mt-2 py-1.5 px-3 rounded bg-[var(--accent)] text-white text-xs font-medium hover:brightness-110 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
            >
              {installing
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Installing…</>
                : <><Download className="w-3 h-3" /> Install CUDA Libraries (pip)</>
              }
            </button>
            {error && <p className="text-[10px] text-red-400">{error}</p>}
          </>
        )}

        <p className="text-[10px] text-white/40 leading-tight">
          Installs cuBLAS DLLs directly without the full NVIDIA installer.
        </p>
      </div>
    </div>
  );
}
