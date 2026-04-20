import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── Utility for syncing scroll ──────────────────────────────────────────────
function useSyncedScroll(refs: React.RefObject<HTMLDivElement>[]) {
  useEffect(() => {
    let isSyncing = false;
    const handlers = refs.map((ref, idx) => {
      return (e: Event) => {
        if (isSyncing) return;
        isSyncing = true;
        const target = e.target as HTMLElement;
        refs.forEach((otherRef, i) => {
          if (i !== idx && otherRef.current) {
            otherRef.current.scrollTop = target.scrollTop;
            otherRef.current.scrollLeft = target.scrollLeft;
          }
        });
        isSyncing = false;
      };
    });
    refs.forEach((ref, idx) => {
      ref.current?.addEventListener('scroll', handlers[idx]);
    });
    return () => {
      refs.forEach((ref, idx) => {
        ref.current?.removeEventListener('scroll', handlers[idx]);
      });
    };
  }, [refs]);
}

import { Button } from "@/components/ui/button";
import {
  ArrowLeft, GitCompare, Folder, FileText, RefreshCw,
  AlertCircle, Binary, ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getCompareFileTree,
  getCompareFileContent,
  getProxyRevisions,   // NEW — fetches revision list for a proxy; add this to your API service
} from '@/services/api';

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

interface ProxyInfo {
  org: string;
  name: string;
  token: string;
  revision: string;
}

// ─── Line-by-line diff renderer ───────────────────────────────────────────────

const DiffView = ({ chunks, side }: { chunks: DiffChunk[]; side: 'left' | 'right' }) => {
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

// ─── Revision Dropdown ────────────────────────────────────────────────────────

interface RevisionDropdownProps {
  revisions: string[];
  selected: string;
  onChange: (rev: string) => void;
  isLoading: boolean;
  accentCls: string;        // e.g. 'border-blue-300 text-blue-800 bg-blue-50'
  accentFocusCls: string;   // e.g. 'focus:ring-blue-300'
}

const RevisionDropdown = ({
  revisions,
  selected,
  onChange,
  isLoading,
  accentCls,
  accentFocusCls,
}: RevisionDropdownProps) => {
  const options = revisions.length > 0 ? revisions : [selected]; 

  return (
    <div className="relative flex items-center">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}  
        className={`
          appearance-none pl-2.5 pr-7 py-0.5 rounded-md border text-[11px] font-semibold
          cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-offset-1
          transition-colors
          ${accentCls} ${accentFocusCls}
        `}
      >
        {isLoading ? (
          <option>Loading…</option>
        ) : (
          options.map((rev) => (
            <option key={rev} value={rev}>
              rev {rev}
            </option>
          ))
        )}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 opacity-60" />
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CompareProxiesSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};
  let initialProxy1: ProxyInfo | undefined;
  let initialProxy2: ProxyInfo | undefined;

  if (state.proxy1 && state.proxy2) {
    initialProxy1 = state.proxy1;
    initialProxy2 = state.proxy2;
  } else {
    const { proxyName, sourceOrg, revision1, revision2, authToken } = state;
    if (sourceOrg && proxyName && authToken && revision1 && revision2) {
      initialProxy1 = { org: sourceOrg, name: proxyName, token: authToken, revision: revision1 };
      initialProxy2 = { org: sourceOrg, name: proxyName, token: authToken, revision: revision2 };
    }
  }

  // ── Active revision state (user-controlled) ──
  const [rev1, setRev1] = useState<string>(initialProxy1?.revision ?? '');
  const [rev2, setRev2] = useState<string>(initialProxy2?.revision ?? '');

  // ── Available revisions ──
  const [revList1, setRevList1] = useState<string[]>([]);
  const [revList2, setRevList2] = useState<string[]>([]);
  const [isLoadingRevs1, setIsLoadingRevs1] = useState(false);
  const [isLoadingRevs2, setIsLoadingRevs2] = useState(false);

  // ── File tree / content ──
  const [selectedFile, setSelectedFile]     = useState<string>('');
  const [fileSummary, setFileSummary]       = useState<FileSummary[]>([]);
  const [fileContent, setFileContent]       = useState<FileContent | null>(null);
  const [comparisonInfo, setComparisonInfo] = useState<{
    proxy1: { name: string; org: string; revision: string };
    proxy2: { name: string; org: string; revision: string };
  } | null>(null);

  const [isLoadingTree, setIsLoadingTree]       = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [treeError, setTreeError]               = useState<string | null>(null);
  const [contentError, setContentError]         = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const leftPanelRef  = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  useSyncedScroll([leftPanelRef, rightPanelRef]);

  // ── Helper: build proxy objects from current state ──
  const getProxy1 = useCallback((): ProxyInfo | undefined =>
    initialProxy1 ? { ...initialProxy1, revision: rev1 } : undefined,
    [initialProxy1, rev1]);

  const getProxy2 = useCallback((): ProxyInfo | undefined =>
    initialProxy2 ? { ...initialProxy2, revision: rev2 } : undefined,
    [initialProxy2, rev2]);

  // ── Fetch revision lists on mount ──
  useEffect(() => {
    if (!initialProxy1 || !initialProxy2) return;

    const fetchRevisions = async (
      proxy: ProxyInfo,
      setList: (r: string[]) => void,
      setLoading: (v: boolean) => void,
    ) => {
      setLoading(true);
      try {
        const revisions: string[] = await getProxyRevisions({
          org: proxy.org,
          name: proxy.name,
          token: proxy.token,
        });
        setList(revisions);
      } catch (err) {
        console.error('Revision fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRevisions(initialProxy1, setRevList1, setIsLoadingRevs1);
    fetchRevisions(initialProxy2, setRevList2, setIsLoadingRevs2);
  }, []);

  // ── Fetch file tree whenever rev1 or rev2 changes ──
  useEffect(() => {
    const proxy1 = getProxy1();
    const proxy2 = getProxy2();
    if (!proxy1 || !proxy2 || !proxy1.revision || !proxy2.revision) {
      setTreeError('Missing required comparison parameters.');
      setIsLoadingTree(false);
      return;
    }

    (async () => {
      setIsLoadingTree(true);
      setTreeError(null);
      setSelectedFile('');
      setFileContent(null);
      try {
        const result = await getCompareFileTree({
          proxy1: { org: proxy1.org, name: proxy1.name, token: proxy1.token, revision: proxy1.revision },
          proxy2: { org: proxy2.org, name: proxy2.name, token: proxy2.token, revision: proxy2.revision },
        });
        setFileSummary(result.fileDiffSummary);
        setComparisonInfo(result);
      } catch (err: any) {
        setTreeError(err.message || 'Failed to load file list.');
      } finally {
        setIsLoadingTree(false);
      }
    })();
  }, [rev1, rev2]);

  // ── Fetch file content on selection ──
  const handleFileSelect = useCallback(async (filePath: string) => {
    const proxy1 = getProxy1();
    const proxy2 = getProxy2();
    if (!proxy1 || !proxy2) return;
    setSelectedFile(filePath);
    setFileContent(null);
    setContentError(null);
    setIsLoadingContent(true);
    try {
      const result = await getCompareFileContent({
        proxy1: { org: proxy1.org, name: proxy1.name, token: proxy1.token, revision: proxy1.revision },
        proxy2: { org: proxy2.org, name: proxy2.name, token: proxy2.token, revision: proxy2.revision },
        filePath,
      });
      setFileContent(result);
    } catch (err: any) {
      setContentError(err.message || 'Failed to load file content.');
    } finally {
      setIsLoadingContent(false);
    }
  }, [getProxy1, getProxy2]);

  // ── Stats ──
  const counts = {
    modified:  fileSummary.filter((f) => f.status === 'modified').length,
    added:     fileSummary.filter((f) => f.status === 'added').length,
    removed:   fileSummary.filter((f) => f.status === 'removed').length,
    unchanged: fileSummary.filter((f) => f.status === 'unchanged').length,
  };

  const proxyLabel = (side: 'left' | 'right') => {
    if (side === 'left')  return comparisonInfo?.proxy1.name ?? initialProxy1?.name ?? 'Proxy 1';
    return comparisonInfo?.proxy2.name ?? initialProxy2?.name ?? 'Proxy 2';
  };

  const comparisonSubtitle =
    initialProxy1 && initialProxy2
      ? `${initialProxy1.name} (${initialProxy1.org}) vs ${initialProxy2.name} (${initialProxy2.org})`
      : 'Loading...';

  // ── Render panel content ──
  const renderPanel = (side: 'left' | 'right') => {
    if (!selectedFile) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <Folder className="h-10 w-10 mb-2 opacity-30" />
          <p className="text-sm text-gray-400">Select a file from the sidebar</p>
        </div>
      );
    }
    if (isLoadingContent) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">Loading...</span>
        </div>
      );
    }
    if (contentError) {
      return (
        <div className="m-4 p-3 text-sm text-red-700 bg-red-50 rounded-lg flex gap-2 items-start">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {contentError}
        </div>
      );
    }
    if (!fileContent) return null;

    if (fileContent.isBinary) {
      const rev = side === 'left' ? fileContent.revision1 : fileContent.revision2;
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
          <Binary className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Binary file — cannot be displayed</p>
          {rev.exists ? (
            <p className="text-xs text-gray-400">
              Size: {rev.size !== null ? `${(rev.size / 1024).toFixed(1)} KB` : 'unknown'}
            </p>
          ) : (
            <p className="text-xs text-red-400">Not present in {proxyLabel(side)}</p>
          )}
          {fileContent.isDifferent && (
            <span className="text-xs px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-medium">
              Files differ between proxies
            </span>
          )}
        </div>
      );
    }

    const rev = side === 'left' ? fileContent.revision1 : fileContent.revision2;
    if (!rev.exists) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
          <FileText className="h-10 w-10 opacity-25" />
          <p className="text-sm italic">File does not exist in {proxyLabel(side)}</p>
        </div>
      );
    }

    if (fileContent.diffChunks) {
      return <DiffView chunks={fileContent.diffChunks} side={side} />;
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">

        {/* ── Sidebar ── */}
        <div
          className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-200 overflow-hidden ${
            sidebarCollapsed ? 'w-10' : 'w-72'
          }`}
        >
          {sidebarCollapsed && (
            <div className="flex flex-col items-center pt-3 gap-3">
              <button
                onClick={() => setSidebarCollapsed(false)}
                title="Expand sidebar"
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {!sidebarCollapsed && (
            <div className="px-3 pt-3 pb-2.5 border-b border-gray-200 bg-gray-50 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Files</h3>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  title="Collapse sidebar"
                  className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 truncate leading-relaxed">{comparisonSubtitle}</p>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'Modified', cls: 'bg-amber-100 text-amber-800' },
                  { label: 'Added',    cls: 'bg-green-100 text-green-800' },
                  { label: 'Removed',  cls: 'bg-red-100 text-red-800' },
                  { label: 'Binary',   cls: 'bg-purple-100 text-purple-800' },
                ].map((s) => (
                  <span key={s.label} className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${s.cls}`}>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto py-1.5 px-2">
              {isLoadingTree ? (
                <div className="flex items-center justify-center h-32 text-gray-400">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-xs">Loading files...</span>
                </div>
              ) : treeError ? (
                <div className="m-2 p-2 text-xs text-red-700 bg-red-50 rounded-lg flex gap-1.5 items-start">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
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
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-all mb-0.5 border ${
                        isSelected
                          ? 'bg-blue-50 border-blue-200'
                          : 'border-transparent hover:bg-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                        <span className={`truncate ${isSelected ? 'text-blue-800 font-medium' : 'text-gray-700'}`}>
                          {fileName}
                        </span>
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
          )}
        </div>

        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitCompare className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <h1 className="text-base font-semibold text-gray-900 leading-tight">Compare Proxies</h1>
                  <p className="text-[11px] text-gray-400 mt-0.5">{comparisonSubtitle}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/compare-proxies')}
                className="flex items-center gap-1.5 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            </div>

            {/* Diff stats bar */}
            {fileSummary.length > 0 && (
              <div className="flex gap-1.5 mt-2.5">
                {counts.modified  > 0 && <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">{counts.modified} modified</span>}
                {counts.added     > 0 && <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">{counts.added} added</span>}
                {counts.removed   > 0 && <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">{counts.removed} removed</span>}
                {counts.unchanged > 0 && <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{counts.unchanged} unchanged</span>}
              </div>
            )}

            {/* Selected file diff banner */}
            {fileContent && !fileContent.isBinary && selectedFile && (
              <div className={`mt-2 px-2.5 py-1 rounded-md text-[11px] font-medium w-fit border ${
                fileContent.isDifferent
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}>
                {fileContent.isDifferent ? 'Files differ between revisions' : '✓ Files are identical'}
              </div>
            )}
          </div>

          {/* Side-by-side panels */}
          <div className="flex-1 flex overflow-hidden">

            {/* Proxy 1 — LEFT */}
            <div className="flex-1 border-r border-gray-200 flex flex-col overflow-hidden">
              <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex-shrink-0 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-blue-800 shrink-0">
                  {comparisonInfo?.proxy1.name ?? initialProxy1?.name ?? 'Proxy 1'}
                </span>

                {/* ── Revision dropdown — LEFT ── */}
                <RevisionDropdown
                  revisions={revList1}
                  selected={rev1}
                  onChange={(newRev) => setRev1(newRev)}
                  isLoading={isLoadingRevs1}
                  accentCls="border-blue-300 text-blue-800 bg-blue-50 hover:bg-blue-100"
                  accentFocusCls="focus:ring-blue-300"
                />

                {selectedFile && (
                  <span className="text-[10px] text-blue-400 truncate ml-auto">{selectedFile.split('/').pop()}</span>
                )}
              </div>
              <div className="flex-1 overflow-auto" ref={leftPanelRef}>
                {renderPanel('left')}
              </div>
            </div>

            {/* Proxy 2 — RIGHT */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-3 py-2 bg-green-50 border-b border-green-100 flex-shrink-0 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-green-800 shrink-0">
                  {comparisonInfo?.proxy2.name ?? initialProxy2?.name ?? 'Proxy 2'}
                </span>

                {/* ── Revision dropdown — RIGHT ── */}
                <RevisionDropdown
                  revisions={revList2}
                  selected={rev2}
                  onChange={(newRev) => setRev2(newRev)}
                  isLoading={isLoadingRevs2}
                  accentCls="border-green-300 text-green-800 bg-green-50 hover:bg-green-100"
                  accentFocusCls="focus:ring-green-300"
                />

                {selectedFile && (
                  <span className="text-[10px] text-green-400 truncate ml-auto">{selectedFile.split('/').pop()}</span>
                )}
              </div>
              <div className="flex-1 overflow-auto" ref={rightPanelRef}>
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