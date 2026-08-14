import React, { useState, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css';
import { Copy, Check, Download, FileCode2 } from 'lucide-react';
import Button from './Button';

/**
 * Reusable Syntax-Highlighted Code Viewer
 * @param {Object} props
 * @param {string} props.code - Raw code string
 * @param {'python' | 'javascript' | 'text'} [props.language='python']
 * @param {string} [props.filename]
 * @param {boolean} [props.showLineNumbers=true]
 * @param {string} [props.className='']
 */
export default function CodeViewer({
  code = '',
  language = 'python',
  filename,
  showLineNumbers = true,
  className = '',
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Prism.highlightAll();
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `code.${language === 'python' ? 'py' : 'js'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const langClass = language === 'javascript' || language === 'js' ? 'language-javascript' : 'language-python';

  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-[#0b0c16] overflow-hidden shadow-xl ${className}`}>
      {/* Code Header Toolbar */}
      <div className="px-4 py-3 bg-[#111322] border-b border-white/[0.06] flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300 min-w-0">
          <FileCode2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="font-bold truncate text-slate-200">
            {filename || `source.${language === 'python' ? 'py' : 'js'}`}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06] uppercase">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            className="text-xs px-2.5 py-1"
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            icon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
            className="text-xs px-2.5 py-1"
            title="Download file"
          >
            Download
          </Button>
        </div>
      </div>

      {/* Code Body */}
      <div className="max-h-[500px] overflow-auto p-4 text-xs font-mono leading-relaxed bg-[#080912]">
        <pre className="!bg-transparent !p-0 !m-0 !overflow-visible">
          <code className={langClass}>{code}</code>
        </pre>
      </div>
    </div>
  );
}
