import React, { useState } from 'react';
import {
  UploadCloud,
  FolderGit2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  FileCode2,
  Cpu,
  Info,
} from 'lucide-react';
import ZipDropzone from './ZipDropzone';
import GithubInput from './GithubInput';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { MAX_SOURCE_LINES, SUPPORTED_LANGUAGES } from '../../utils/constants';

const INPUT_MODES = {
  ZIP: 'zip',
  GITHUB: 'github',
};

/**
 * Main Upload & Input Form Component
 * @param {Object} props
 * @param {Function} props.onSubmitZip
 * @param {Function} props.onSubmitGithub
 * @param {boolean} [props.isLoading=false]
 */
export default function UploadForm({
  onSubmitZip,
  onSubmitGithub,
  isLoading = false,
}) {
  const [activeMode, setActiveMode] = useState(INPUT_MODES.ZIP);
  const [zipFile, setZipFile] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [formError, setFormError] = useState(null);

  const handleModeChange = (mode) => {
    if (isLoading) return;
    setActiveMode(mode);
    setFormError(null);
  };

  const handleClearZip = () => {
    setZipFile(null);
    setFormError(null);
  };

  const handleClearGithub = () => {
    setGithubUrl('');
    setFormError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    if (activeMode === INPUT_MODES.ZIP) {
      if (!zipFile) {
        setFormError('Please select or drop a .zip archive containing your codebase.');
        return;
      }
      onSubmitZip(zipFile);
    } else if (activeMode === INPUT_MODES.GITHUB) {
      if (!githubUrl.trim()) {
        setFormError('Please enter a valid public GitHub repository URL.');
        return;
      }

      const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i;
      if (!githubRegex.test(githubUrl.trim())) {
        setFormError('The repository URL must follow the format: https://github.com/owner/repo');
        return;
      }

      onSubmitGithub(githubUrl.trim());
    }
  };

  const isFormValid =
    (activeMode === INPUT_MODES.ZIP && zipFile !== null) ||
    (activeMode === INPUT_MODES.GITHUB && githubUrl.trim().length > 0);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="rounded-3xl bg-[#121424]/80 border border-white/[0.08] backdrop-blur-2xl p-6 sm:p-10 shadow-2xl shadow-black/40 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-purple-500/10 via-cyan-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Input Mode Selector Toggle */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex p-1.5 rounded-2xl bg-[#0a0b12]/90 border border-white/[0.08] shadow-inner">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleModeChange(INPUT_MODES.ZIP)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeMode === INPUT_MODES.ZIP
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload ZIP Archive</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleModeChange(INPUT_MODES.GITHUB)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeMode === INPUT_MODES.GITHUB
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Public GitHub Repo</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {activeMode === INPUT_MODES.ZIP ? (
            <ZipDropzone
              selectedFile={zipFile}
              onFileSelect={(file) => {
                setZipFile(file);
                setFormError(null);
              }}
              onClear={handleClearZip}
              disabled={isLoading}
            />
          ) : (
            <GithubInput
              value={githubUrl}
              onChange={(url) => {
                setGithubUrl(url);
                setFormError(null);
              }}
              onClear={handleClearGithub}
              disabled={isLoading}
            />
          )}

          {/* Validation Error Notice */}
          {formError && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              disabled={!isFormValid || isLoading}
              className="w-full text-base py-4 shadow-xl shadow-purple-600/25 cursor-pointer"
              icon={<Sparkles className="w-5 h-5 text-cyan-300" />}
            >
              {isLoading
                ? 'Submitting for AI Analysis...'
                : activeMode === INPUT_MODES.ZIP
                ? 'Analyze Codebase ZIP'
                : 'Analyze GitHub Repository'}
            </Button>
          </div>
        </form>

        {/* Requirements & Supported Stack Footer */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Supported Languages:{' '}
              <strong className="text-slate-200">Python (.py)</strong> &{' '}
              <strong className="text-slate-200">JavaScript (.js, .jsx)</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              Project Scale Limit:{' '}
              <strong className="text-slate-200">Up to {MAX_SOURCE_LINES.toLocaleString()} lines</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
