"use client";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";

interface Props {
  onFiles: (files: File[]) => void;
}

export function DropZone({ onFiles }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".flac", ".ogg"],
      "video/*": [".mp4"],
    },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`glass shrink-0 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
        isDragActive
          ? "border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.02]"
          : "hover:border-white/20 hover:bg-white/5"
      }`}
    >
      <input {...getInputProps()} />
      <div className="p-3 rounded-full bg-white/5 mb-3">
        <UploadCloud
          className={`w-6 h-6 ${isDragActive ? "text-[var(--accent)]" : "text-white/60"}`}
        />
      </div>
      <p className="font-medium text-white text-sm">
        {isDragActive ? "Drop files here…" : "Add files to queue"}
      </p>
      <p className="text-white/30 text-xs mt-1">MP3 · WAV · M4A · FLAC · OGG · MP4</p>
    </div>
  );
}
