"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KNOWN_MODELS, ModelInfo, CudaInfo, AccentColor, ThemeMode } from "@/lib/types";
import { api } from "@/lib/api";
import { ModelManager } from "./ModelManager";
import { SystemPanel  } from "./SystemPanel";

interface Props {
  /* Transcription settings */
  modelSize:    string;   setModelSize:    (v: string) => void;
  language:     string;   setLanguage:     (v: string) => void;
  temperature:  number;   setTemperature:  (v: number) => void;
  device:       string;   setDevice:       (v: string) => void;
  computeType:  string;   setComputeType:  (v: string) => void;
  numWorkers:   number;   setNumWorkers:   (v: number) => void;
  hfToken:      string;   setHfToken:      (v: string) => void;
  theme:        ThemeMode; setTheme:       (v: ThemeMode) => void;
  accent:       AccentColor; setAccent:    (v: AccentColor) => void;
  isVisible:    boolean;
}

export function SettingsPanel({
  modelSize, setModelSize, language, setLanguage, temperature, setTemperature,
  device, setDevice, computeType, setComputeType, numWorkers, setNumWorkers,
  hfToken, setHfToken, theme, setTheme, accent, setAccent, isVisible,
}: Props) {
  const [models,    setModels]    = useState<ModelInfo[]>([]);
  const [cudaInfo,  setCudaInfo]  = useState<CudaInfo>({ has_cuda: false, has_cublas_pip: false });
  const [appVersion, setAppVersion] = useState<string>("1.0.0");

  const refresh = useCallback(async () => {
    try {
      const [m, c, v] = await Promise.all([
        api.getModels(), 
        api.getCudaInfo(),
        api.getVersion()
      ]);
      setModels(m);
      setCudaInfo(c);
      setAppVersion(v.version);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (isVisible) refresh();
  }, [isVisible, refresh]);

  const selectClass = "w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]";
  const labelClass  = "block text-sm text-white/80 font-medium";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{   opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="glass z-20 shrink-0 overflow-hidden"
        >
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* --- Transcription --- */}
              <div className="space-y-3">
                <h3 className="text-white font-semibold mb-2">Transcription</h3>

                <label className={labelClass}>Model Size</label>
                <select value={modelSize} onChange={e => setModelSize(e.target.value)} className={selectClass}>
                  {KNOWN_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>

                <label className={`${labelClass} mt-3 block`}>Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className={selectClass}>
                  <option value="auto">Auto-detect</option>
                  <option value="en">English</option>
                  <option value="ru">Russian</option>
                </select>

                <label className={`${labelClass} mt-3 block`}>Temperature: {temperature}</label>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </div>

              {/* --- Hardware --- */}
              <div className="space-y-3">
                <h3 className="text-white font-semibold mb-2">Hardware</h3>

                <label className={labelClass}>Hardware Device</label>
                <select value={device} onChange={e => setDevice(e.target.value)} className={selectClass}>
                  <option value="auto">Auto (Detect)</option>
                  <option value="cuda">GPU (CUDA)</option>
                  <option value="cpu">CPU (Slow)</option>
                </select>

                <label className={`${labelClass} mt-3 block`}>Compute Type (VRAM)</label>
                <select value={computeType} onChange={e => setComputeType(e.target.value)} className={selectClass}>
                  <option value="auto">Auto</option>
                  <option value="float16">FP16 (High VRAM)</option>
                  <option value="int8">INT8 (Low VRAM)</option>
                  <option value="int8_float16">INT8 + FP16</option>
                </select>

                <label className={`${labelClass} mt-3 block`}>CPU Threads: {numWorkers}</label>
                <input
                  type="range" min="1" max="4" step="1"
                  value={numWorkers}
                  onChange={e => setNumWorkers(parseInt(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                  disabled={device === "cuda"}
                />
                <p className="text-[10px] text-white/40 leading-tight">
                  {device === "cuda"
                    ? "GPU is parallel by default — threads not used."
                    : "CTranslate2 decode threads. Rec. 2–4 for CPU."}
                </p>

                <label className="text-sm text-white/80 font-medium mt-3 flex items-center justify-between">
                  <span>HuggingFace Token</span>
                  <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer"
                     className="text-[var(--accent)] text-xs hover:underline">Get Token</a>
                </label>
                <input
                  type="password"
                  placeholder="hf_…"
                  value={hfToken}
                  onChange={e => setHfToken(e.target.value)}
                  className={selectClass}
                />
                <p className="text-[10px] text-white/40 leading-tight">
                  Required for speaker diarization. Stored only for this session.
                </p>
              </div>

              {/* --- System --- */}
              <div className="space-y-3">
                <SystemPanel cudaInfo={cudaInfo} onRefresh={refresh} />

                <label className={`${labelClass} mt-3 block`}>Interface Theme</label>
                <div className="flex space-x-2">
                  {(["dark", "light"] as ThemeMode[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border capitalize ${
                        theme === t
                          ? "border-[var(--accent)] bg-white/10 text-white"
                          : "border-white/10 text-white/50 hover:bg-white/5"
                      }`}
                    >{t}</button>
                  ))}
                </div>

                <div className="flex space-x-3 mt-2">
                  {([
                    { id: "blue",    bg: "bg-blue-500"    },
                    { id: "emerald", bg: "bg-emerald-500" },
                    { id: "purple",  bg: "bg-purple-500"  },
                  ] as { id: AccentColor; bg: string }[]).map(a => (
                    <button
                      key={a.id}
                      onClick={() => setAccent(a.id)}
                      className={`w-6 h-6 rounded-full ${a.bg} border-2 transition-all ${
                        accent === a.id
                          ? "border-white scale-110 shadow-lg"
                          : "border-transparent opacity-50 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>

                <div className="pt-4 mt-4 border-t border-white/10">
                  <p className="text-xs text-white/40">AI Transcriber v{appVersion}</p>
                </div>
              </div>

              {/* --- Models Manager --- */}
              <ModelManager models={models} onRefresh={refresh} />

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
