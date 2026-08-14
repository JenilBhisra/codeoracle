import React, { useState } from 'react';
import { FolderGit2, X, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';

/**
 * GitHub repository URL input component
 * @param {Object} props
 * @param {string} props.value
 * @param {Function} props.onChange
 * @param {Function} props.onClear
 * @param {boolean} [props.disabled=false]
 */
export default function GithubInput({
  value,
  onChange,
  onClear,
  disabled = false,
}) {
  const [error, setError] = useState(null);

  const sampleRepos = [
    { label: 'Flask Mini App (Python)', url: 'https://github.com/pallets/flask' },
    { label: 'Express Starter (JavaScript)', url: 'https://github.com/expressjs/express' },
  ];

  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    onChange(rawVal);

    if (!rawVal.trim()) {
      setError(null);
      return;
    }

    // Basic GitHub URL regex check
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i;
    if (!githubRegex.test(rawVal.trim())) {
      setError('Please enter a valid public GitHub repository URL (e.g. https://github.com/owner/repository)');
    } else {
      setError(null);
    }
  };

  const handleSelectSample = (sampleUrl) => {
    if (disabled) return;
    onChange(sampleUrl);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Input container */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <FolderGit2 className="w-5 h-5 text-cyan-400" />
        </div>

        <input
          type="url"
          value={value}
          onChange={handleInputChange}
          placeholder="https://github.com/username/repository"
          disabled={disabled}
          className={`w-full pl-12 pr-12 py-4 rounded-2xl bg-[#0f111e]/90 border text-slate-100 placeholder-slate-500 text-sm font-mono focus:outline-none transition-all ${
            disabled ? 'opacity-50 cursor-not-allowed bg-white/[0.01]' : ''
          } ${
            error
              ? 'border-rose-500/50 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 shadow-lg shadow-rose-500/5'
              : value
              ? 'border-cyan-500/40 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 shadow-lg shadow-cyan-500/5'
              : 'border-white/10 focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 hover:border-white/20'
          }`}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
            title="Clear URL"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Sample Repository Pickers */}
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs text-slate-400 font-medium">Or try a sample repository:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sampleRepos.map((sample) => (
            <button
              key={sample.url}
              type="button"
              disabled={disabled}
              onClick={() => handleSelectSample(sample.url)}
              className="text-xs font-mono px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/40 text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{sample.label}</span>
              <ExternalLink className="w-3 h-3 text-cyan-400 opacity-60" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
