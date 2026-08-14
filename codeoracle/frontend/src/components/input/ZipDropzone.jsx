import React, { useState, useRef } from 'react';
import { UploadCloud, FileArchive, X, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Drag and Drop ZIP file upload zone
 * @param {Object} props
 * @param {File | null} props.selectedFile
 * @param {Function} props.onFileSelect
 * @param {Function} props.onClear
 * @param {boolean} [props.disabled=false]
 */
export default function ZipDropzone({
  selectedFile,
  onFileSelect,
  onClear,
  disabled = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState(null);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateAndSelectFile = (file) => {
    setDragError(null);
    if (!file) return;

    // Validate ZIP extension or MIME type
    const isZip =
      file.name.toLowerCase().endsWith('.zip') ||
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed' ||
      file.type === 'multipart/x-zip';

    if (!isZip) {
      setDragError('Please upload a valid .zip file containing your Python or JavaScript codebase.');
      return;
    }

    // 50MB max file size safeguard for browser uploads
    const maxSizeBytes = 50 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setDragError('ZIP file is too large (maximum 50 MB allowed).');
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSelectFile(file);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        onChange={handleFileInputChange}
        disabled={disabled}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer select-none group ${
            disabled ? 'opacity-50 cursor-not-allowed bg-white/[0.01] border-white/10' : ''
          } ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_30px_rgba(6,182,212,0.2)] scale-[1.01]'
              : 'border-white/15 hover:border-purple-500/50 hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex flex-col items-center justify-center">
            {/* Animated Upload Icon */}
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
                isDragging
                  ? 'bg-cyan-500/20 text-cyan-300 scale-110'
                  : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 group-hover:bg-purple-500/20'
              }`}
            >
              <UploadCloud className="w-7 h-7" />
            </div>

            <h4 className="text-base font-semibold text-slate-100 mb-1">
              Drag and drop your codebase <span className="text-cyan-300 font-mono">.ZIP</span> here
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Supports Python (<span className="font-mono text-slate-300">.py</span>) and JavaScript (<span className="font-mono text-slate-300">.js, .jsx</span>) projects up to 10,000 lines.
            </p>

            <button
              type="button"
              disabled={disabled}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-200 transition-all cursor-pointer"
            >
              Browse Local Files
            </button>
          </div>
        </div>
      ) : (
        /* Selected File Summary Card */
        <div className="rounded-2xl bg-[#121424]/90 border border-purple-500/30 p-5 shadow-lg shadow-purple-500/10 backdrop-blur-xl flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
              <FileArchive className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-100 truncate block font-mono">
                  {selectedFile.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                  <CheckCircle2 className="w-3 h-3" /> Valid ZIP
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            disabled={disabled}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
            title="Remove selected file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drag & Drop Error */}
      {dragError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{dragError}</span>
        </div>
      )}
    </div>
  );
}
