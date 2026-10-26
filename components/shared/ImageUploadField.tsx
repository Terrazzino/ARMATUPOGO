"use client";

import { useEffect, useId, useRef, useState } from "react";
type Props = {
  label: string;
  helpText: string;
  accept: string;
  maxBytes: number;
  maxSizeLabel?: string;
  currentImageUrl?: string | null;
  previewAlt: string;
  selectedFile: File | null;
  removed: boolean;
  disabled?: boolean;
  previewClassName?: string;
  onSelect: (file: File) => void;
  onClearSelection: () => void;
  onRemove: () => void;
  onRestore: () => void;
};

export function ImageUploadField({ label, helpText, accept, maxBytes, maxSizeLabel = "5 MiB", currentImageUrl, previewAlt, selectedFile, removed, disabled, previewClassName = "h-28", onSelect, onClearSelection, onRemove, onRestore }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const visibleUrl = previewUrl ?? (!removed ? currentImageUrl : null);

  function selectFile(file: File | undefined) {
    setClientError(null);
    if (!file) return;
    if (!accept.split(",").includes(file.type)) {
      setClientError("Elegí un archivo JPG, PNG o WebP.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > maxBytes) {
      setClientError(`La imagen no puede superar los ${maxSizeLabel}.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    onSelect(file);
  }

  function clearSelection() {
    setClientError(null);
    if (inputRef.current) inputRef.current.value = "";
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    onClearSelection();
  }

  return (
    <fieldset className="space-y-3 border-t border-neutral-800 pt-4">
      <legend className="atp-label">{label}</legend>
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr] sm:items-center">
        <div className={`grid w-full place-items-center overflow-hidden border border-neutral-800 bg-neutral-950 sm:w-32 ${previewClassName}`}>
          {visibleUrl ? (
            // La vista previa puede ser una URL blob local o una URL pública ya guardada.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={visibleUrl} alt={previewAlt} className="h-full w-full object-contain" />
          ) : (
            <span className="px-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">Sin imagen</span>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor={inputId} className="block text-sm font-semibold text-neutral-200">{visibleUrl ? "Reemplazar imagen" : "Seleccionar imagen"}</label>
          <input ref={inputRef} id={inputId} type="file" accept={accept} disabled={disabled} onChange={(event) => selectFile(event.target.files?.[0])} aria-describedby={`${inputId}-help${clientError ? ` ${inputId}-error` : ""}`} className="atp-field file:mr-3 file:border-0 file:bg-red-700 file:px-3 file:py-1 file:font-bold file:text-white" />
          <p id={`${inputId}-help`} className="text-xs leading-relaxed text-neutral-500">{helpText}</p>
          {clientError && <p id={`${inputId}-error`} role="alert" className="text-xs font-medium text-red-300">{clientError}</p>}
          <div className="flex flex-wrap gap-2">
            {selectedFile && <button type="button" onClick={clearSelection} disabled={disabled} className="atp-button atp-button-ghost min-h-9 text-xs">Cancelar selección</button>}
            {!selectedFile && currentImageUrl && !removed && <button type="button" onClick={onRemove} disabled={disabled} className="atp-button atp-button-ghost min-h-9 text-xs text-red-300">Quitar imagen</button>}
            {removed && <button type="button" onClick={onRestore} disabled={disabled} className="atp-button atp-button-ghost min-h-9 text-xs">Conservar imagen actual</button>}
          </div>
        </div>
      </div>
    </fieldset>
  );
}
