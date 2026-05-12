"use client";
import { useState, useEffect } from "react";
import { AppSettings, ThemeMode, AccentColor } from "@/lib/types";

const STORAGE_KEY = "ai_transcriber_settings";
const SESSION_HF_KEY = "ai_transcriber_hf_token"; // Fix #7: sessionStorage for secrets

// --- Type guards ---
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && isFinite(v);

function loadSettings(): Partial<AppSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Partial<AppSettings>; // Fix #12: validated below per-field
  } catch {
    return {};
  }
}

function loadHfToken(): string {
  try { return sessionStorage.getItem(SESSION_HF_KEY) ?? ""; }
  catch { return ""; }
}

export function useSettings() {
  const saved = loadSettings();

  // Fix #12: validate every field from localStorage before using it
  const [modelSize,    setModelSize]    = useState<string>(     isStr(saved.modelSize)    ? saved.modelSize    : "base");
  const [language,     setLanguage]     = useState<string>(     isStr(saved.language)     ? saved.language     : "auto");
  const [temperature,  setTemperature]  = useState<number>(     isNum(saved.temperature)  ? saved.temperature  : 0.0);
  const [device,       setDevice]       = useState<string>(     isStr(saved.device)       ? saved.device       : "auto");
  const [computeType,  setComputeType]  = useState<string>(     isStr(saved.computeType)  ? saved.computeType  : "auto");
  const [numWorkers,   setNumWorkers]   = useState<number>(     isNum(saved.numWorkers)   ? saved.numWorkers   : 1);
  const [theme,        setTheme]        = useState<ThemeMode>(  saved.theme === "light" || saved.theme === "dark" ? saved.theme : "dark");
  const [accent,       setAccent]       = useState<AccentColor>(["blue","emerald","purple"].includes(saved.accent as string) ? saved.accent as AccentColor : "blue");

  // Fix #7: HF token lives only in sessionStorage
  const [hfToken, setHfToken] = useState<string>(loadHfToken);

  // Persist settings (no hfToken here)
  useEffect(() => {
    const s: AppSettings = { modelSize, language, temperature, device, computeType, numWorkers, theme, accent };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }, [modelSize, language, temperature, device, computeType, numWorkers, theme, accent]);

  // Persist token in sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_HF_KEY, hfToken); } catch { /* ignore */ }
  }, [hfToken]);

  // Apply theme/accent to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.className = theme === "light" ? "theme-light" : "";
    root.classList.add(`accent-${accent}`);
    return () => root.classList.remove("accent-blue", "accent-emerald", "accent-purple");
  }, [theme, accent]);

  return {
    modelSize, setModelSize,
    language, setLanguage,
    temperature, setTemperature,
    device, setDevice,
    computeType, setComputeType,
    numWorkers, setNumWorkers,
    theme, setTheme,
    accent, setAccent,
    hfToken, setHfToken,
  };
}
