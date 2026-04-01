import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { ArrowLeft, GitCompare, Folder, FileText, RefreshCw, AlertCircle, Binary } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCompareFileTree, getCompareFileContent } from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiffChunk {
  line: string;
  type: 'added' | 'removed' | 'unchanged';
}

interface FileContent {
  isBinary: boolean;
  isDifferent: boolean;
  diffChunks: DiffChunk[] | null;
  revision1: { content: string | null; exists: boolean; size: number | null };
  revision2: { content: string | null; exists: boolean; size: number | null };
}

interface FileSummary {
  filePath: string;
  status: 'modified' | 'added' | 'removed' | 'unchanged';
  isBinary: boolean;
}

// ─── Line-by-line diff renderer ───────────────────────────────────────────────

const DiffView = ({ chunks, side }: { chunks: DiffChunk[]; side: 'left' | 'right' }) => {
  // Left panel shows: unchanged + removed lines
  // Right panel shows: unchanged + added lines
  const visibleChunks = chunks.filter((c) =>
    side === 'left' ? c.type !== 'added' : c.type !== 'removed'
  );

  return (
    <div className="font-mono text-xs overflow-x-auto">
      <table className="w-full border-collapse">
        <tbody>
          {visibleChunks.map((chunk, i) => {
            const bg =
              chunk.type === 'added'
                ? 'bg-green-50'
                : chunk.type === 'removed'
                ? 'bg-red-50'
                : '';
            const prefix =
              chunk.type === 'added' ? '+' : chunk.type === 'removed' ? '-' : ' ';
            const prefixColor =
              chunk.type === 'added'
                ? 'text-green-700 bg-green-100 select-none'
                : chunk.type === 'removed'
                ? 'text-red-700 bg-red-100 select-none'
                : 'text-gray-400 bg-gray-50 select-none';
            const textColor =
              chunk.type === 'added'
                ? 'text-green-900'
                : chunk.type === 'removed'
                ? 'text-red-900'
                : 'text-gray-800';

            return (
              <tr key={i} className={`${bg} leading-5`}>
                <td className={`w-6 text-center px-1 py-0 border-r border-gray-200 ${prefixColor}`}>
                  {prefix}
                </td>
                <td className={`px-3 py-0 whitespace-pre ${textColor}`}>
                  {chunk.line || ' '}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Status badge helper ──────────────────────────────────────────────────────

const statusBadge = (status: string) => {
  switch (status) {
    case 'modified':  return { label: 'M', cls: 'bg-amber-100 text-amber-800' };
    case 'added':     return { label: 'A', cls: 'bg-green-100 text-green-800' };
    case 'removed':   return { label: 'R', cls: 'bg-red-100 text-red-800' };
    default:          return { label: '', cls: '' };
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CompareProxiesSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { proxyName, sourceOrg, revision1, revision2, authToken } = location.state || {};

  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileSummary, setFileSummary] = useState<FileSummary[]>([]);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);

  const [isLoadingTree, setIsLoadingTree]       = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [treeError, setTreeError]               = useState<string | null>(null);
  const [contentError, setContentError]         = useState<string | null>(null);

  // ── Fetch file tree on mount ──
  useEffect(() => {
    if (!sourceOrg || !proxyName || !authToken || !revision1 || !revision2) {
      setTreeError('Missing required comparison parameters.');
      setIsLoadingTree(false);
      return;
    }

    (async () => {
      setIsLoadingTree(true);
      setTreeError(null);
      try {
        const result = await getCompareFileTree({
          sourceOrg, proxyName, sourceToken: authToken, revision1, revision2,
        });
        setFileSummary(result.fileDiffSummary);
      } catch (err: any) {
        setTreeError(err.message || 'Failed to load file list.');
      } finally {
        setIsLoadingTree(false);
      }
    })();
  }, [sourceOrg, proxyName, authToken, revision1, revision2]);

  // ── Fetch file content on selection ──
  const handleFileSelect = useCallback(async (filePath: string) => {
    setSelectedFile(filePath);
    setFileContent(null);
    setContentError(null);
    setIsLoadingContent(true);

    try {
      const result = await getCompareFileContent({
        sourceOrg, proxyName, sourceToken: authToken,
        revision1, revision2, filePath,
      });
      setFileContent(result);
    } catch (err: any) {
      setContentError(err.message || 'Failed to load file content.');
    } finally {
      setIsLoadingContent(false);
    }
  }, [sourceOrg, proxyName, authToken, revision1, revision2]);

  // ── Stats ──
  const counts = {
    modified:  fileSummary.filter((f) => f.status === 'modified').length,
    added:     fileSummary.filter((f) => f.status === 'added').length,
    removed:   fileSummary.filter((f) => f.status === 'removed').length,
    unchanged: fileSummary.filter((f) => f.status === 'unchanged').length,
  };

  // ── Render panel content ──
  const renderPanel = (side: 'left' | 'right') => {
    if (!selectedFile) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <Folder className="h-12 w-12 mb-2 opacity-40" />
          <p className="text-sm">Select a file from the sidebar</p>
        </div>
      );
    }

    if (isLoadingContent) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Loading...</span>
        </div>
      );
    }

    if (contentError) {
      return (
        <div className="m-4 p-3 text-sm text-red-700 bg-red-50 rounded flex gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {contentError}
        </div>
      );
    }

    if (!fileContent) return null;

    // Binary file
    if (fileContent.isBinary) {
      const rev = side === 'left' ? fileContent.revision1 : fileContent.revision2;
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
          <Binary className="h-10 w-10 opacity-40" />
          <p className="text-sm font-medium">Binary file — cannot be displayed</p>
          {rev.exists ? (
            <p className="text-xs text-gray-400">
              Size: {rev.size !== null ? `${(rev.size / 1024).toFixed(1)} KB` : 'unknown'}
            </p>
          ) : (
            <p className="text-xs text-red-400">
              Not present in revision {side === 'left' ? revision1 : revision2}
            </p>
          )}
          {fileContent.isDifferent && (
            <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
              Files differ between revisions
            </span>
          )}
        </div>
      );
    }

    // File not present in this revision
    const rev = side === 'left' ? fileContent.revision1 : fileContent.revision2;
    if (!rev.exists) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
          <FileText className="h-10 w-10 opacity-30" />
          <p className="text-sm italic">
            File does not exist in revision {side === 'left' ? revision1 : revision2}
          </p>
        </div>
      );
    }

    // Text file with diff
    if (fileContent.diffChunks) {
      return <DiffView chunks={fileContent.diffChunks} side={side} />;
    }

    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">

        {/* ── Sidebar ── */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Files</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {proxyName} · rev {revision1} vs {revision2}
            </p>
            {/* Legend */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { label: 'Modified', cls: 'bg-amber-100 text-amber-800' },
                { label: 'Added',    cls: 'bg-green-100 text-green-800' },
                { label: 'Removed',  cls: 'bg-red-100 text-red-800' },
                { label: 'Binary',   cls: 'bg-purple-100 text-purple-800' },
              ].map((s) => (
                <span key={s.label} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.cls}`}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {isLoadingTree ? (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">Loading files...</span>
              </div>
            ) : treeError ? (
              <div className="m-3 p-2 text-xs text-red-700 bg-red-50 rounded">
                <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                {treeError}
              </div>
            ) : (
              fileSummary.map((item) => {
                const fileName = item.filePath.split('/').pop();
                const isSelected = selectedFile === item.filePath;
                const badge = statusBadge(item.status);

                return (
                  <div
                    key={item.filePath}
                    onClick={() => handleFileSelect(item.filePath)}
                    title={item.filePath}
                    className={`flex items-center justify-between mx-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors hover:bg-gray-100 ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate text-gray-800">{fileName}</span>
                      {item.isBinary && (
                        <span className="flex-shrink-0 text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                          bin
                        </span>
                      )}
                    </div>
                    {badge.label && (
                      <span className={`flex-shrink-0 ml-1 w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitCompare className="h-5 w-5 text-blue-600" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Compare Proxies</h1>
                  <p className="text-xs text-gray-500">
                    {proxyName} · {sourceOrg}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/compare-proxies')}
                className="flex items-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            </div>

            {/* Diff stats bar */}
            {fileSummary.length > 0 && (
              <div className="flex gap-2 mt-2">
                {counts.modified  > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{counts.modified} modified</span>}
                {counts.added     > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">{counts.added} added</span>}
                {counts.removed   > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">{counts.removed} removed</span>}
                {counts.unchanged > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{counts.unchanged} unchanged</span>}
              </div>
            )}

            {/* Selected file diff banner */}
            {fileContent && !fileContent.isBinary && selectedFile && (
              <div className={`mt-2 px-3 py-1 rounded text-xs font-medium w-fit ${
                fileContent.isDifferent
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}>
                {fileContent.isDifferent ? '⚡ Files differ between revisions' : '✓ Files are identical'}
              </div>
            )}
          </div>

          {/* Side-by-side panels */}
          <div className="flex-1 flex overflow-hidden">

            {/* Revision 1 — LEFT */}
            <div className="flex-1 border-r border-gray-200 flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex-shrink-0">
                <span className="text-xs font-semibold text-blue-800">Revision {revision1}</span>
                {selectedFile && (
                  <span className="ml-2 text-xs text-blue-600 truncate">{selectedFile.split('/').pop()}</span>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {renderPanel('left')}
              </div>
            </div>

            {/* Revision 2 — RIGHT */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-green-50 border-b border-green-100 flex-shrink-0">
                <span className="text-xs font-semibold text-green-800">Revision {revision2}</span>
                {selectedFile && (
                  <span className="ml-2 text-xs text-green-600 truncate">{selectedFile.split('/').pop()}</span>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {renderPanel('right')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareProxiesSuccess;