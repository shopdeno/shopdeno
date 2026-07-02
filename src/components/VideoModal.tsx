"use client";

import { useEffect, useRef } from "react";

interface VideoModalProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function VideoModal({ src, isOpen, onClose, title }: VideoModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) dialog.showModal();
    else dialog.close();
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handler = () => onClose();
    dialog.addEventListener("close", handler);
    return () => dialog.removeEventListener("close", handler);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="w-[90vw] max-w-4xl bg-black p-0 rounded-xl backdrop:bg-black/70 m-auto"
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
    >
      <div className="relative aspect-video w-full">
        {isOpen && (
          <iframe
            src={src}
            className="absolute inset-0 w-full h-full rounded-xl"
            allow="autoplay; fullscreen"
            allowFullScreen
            title={title}
          />
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Close video"
        className="absolute top-3 right-3 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80"
      >
        ✕
      </button>
    </dialog>
  );
}
