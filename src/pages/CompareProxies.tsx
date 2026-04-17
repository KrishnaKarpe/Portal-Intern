import React, { useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fetchLatestRevision, fetchDeploymentStatus, fetchProxies } from '@/services/api';
import { toast } from 'sonner';
import { GitCompare, Shield, RefreshCw, CheckCircle2, XCircle, ArrowRightLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const organizations = [
  { id: 1, name: 'apigee-prod-ouax', type: 'Production' },
  { id: 2, name: 'apigee-non-prod-crjb', type: 'Non-Production' },
];

interface ProxyConfig {
  org: string;
  token: string;
  name: string;
  revision: string;
  latestRevision: string | null;
  deploymentInfo: { environment: string; status: string; revision?: string }[];
  fetchState: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  proxies: string[];
  proxySuggestions: string[];
  showProxySuggestions: boolean;
  showToken: boolean;
}

const defaultConfig = (): ProxyConfig => ({
  org: '',
  token: '',
  name: '',
  revision: '',
  latestRevision: null,
  deploymentInfo: [],
  fetchState: 'idle',
  error: null,
  proxies: [],
  proxySuggestions: [],
  showProxySuggestions: false,
  showToken: false,
});

const CompareProxies: React.FC = () => {
  const navigate = useNavigate();
  const [proxy1, setProxy1] = useState<ProxyConfig>(defaultConfig());
  const [proxy2, setProxy2] = useState<ProxyConfig>(defaultConfig());

  const fetchProxiesForConfig = useCallback(async (org: string, token: string): Promise<string[]> => {
    if (!org || !token?.trim()) return [];
    try {
      const res = await fetchProxies(org, token);
      return Array.isArray(res.proxies) ? res.proxies.map((p: any) => p.name) : [];
    } catch {
      return [];
    }
  }, []);

  const updateProxy1 = useCallback((updates: Partial<ProxyConfig>) => {
    setProxy1(prev => ({ ...prev, ...updates }));
  }, []);

  const updateProxy2 = useCallback((updates: Partial<ProxyConfig>) => {
    setProxy2(prev => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    if (proxy1.org && proxy1.token?.trim()) {
      fetchProxiesForConfig(proxy1.org, proxy1.token).then(proxies =>
        updateProxy1({ proxies, proxySuggestions: proxies })
      );
    } else {
      updateProxy1({ proxies: [], proxySuggestions: [] });
    }
  }, [proxy1.org, proxy1.token, fetchProxiesForConfig, updateProxy1]);

  useEffect(() => {
    if (proxy2.org && proxy2.token?.trim()) {
      fetchProxiesForConfig(proxy2.org, proxy2.token).then(proxies =>
        updateProxy2({ proxies, proxySuggestions: proxies })
      );
    } else {
      updateProxy2({ proxies: [], proxySuggestions: [] });
    }
  }, [proxy2.org, proxy2.token, fetchProxiesForConfig, updateProxy2]);

  const handleNameChange = (value: string, side: 'left' | 'right') => {
    const config = side === 'left' ? proxy1 : proxy2;
    const update = side === 'left' ? updateProxy1 : updateProxy2;
    update({ name: value });
    if (!value) { update({ showProxySuggestions: false }); return; }
    const filtered = config.proxies.filter(p => p.toLowerCase().includes(value.toLowerCase()));
    update({ proxySuggestions: filtered, showProxySuggestions: true });
  };

  const fetchProxyDetails = useCallback(async (
    config: ProxyConfig,
    updateFn: (u: Partial<ProxyConfig>) => void
  ) => {
    if (!config.name.trim()) { updateFn({ error: 'Proxy name is required.', fetchState: 'error' }); return; }
    if (!config.org.trim() || !config.token.trim()) { updateFn({ error: 'Provide organization and token first.', fetchState: 'error' }); return; }
    updateFn({ fetchState: 'loading', error: null, latestRevision: null, deploymentInfo: [] });
    try {
      const [revision, deployments] = await Promise.all([
        fetchLatestRevision({ sourceOrg: config.org.trim(), proxyName: config.name.trim(), sourceToken: config.token.trim() }),
        fetchDeploymentStatus({ sourceOrg: config.org.trim(), proxyName: config.name.trim(), sourceToken: config.token.trim() }),
      ]);
      updateFn({
        latestRevision: revision?.toString() ?? null,
        deploymentInfo: deployments || [],
        fetchState: 'success',
        revision: revision?.toString() ?? '',
      });
      toast.success(`Fetched ${config.name} (rev ${revision})`);
    } catch (error: any) {
      updateFn({ error: error?.message || 'Failed to fetch proxy information.', fetchState: 'error' });
    }
  }, []);

  const renderProxyCard = (
    title: string,
    config: ProxyConfig,
    onUpdate: (u: Partial<ProxyConfig>) => void,
    onFetch: () => void,
    side: 'left' | 'right'
  ) => {
    const accentClasses = {
      headerBg: side === 'left' ? 'bg-blue-50/60' : 'bg-purple-50/60',
      borderAccent: side === 'left' ? 'border-l-blue-500' : 'border-l-purple-500',
      iconColor: side === 'left' ? 'text-blue-600' : 'text-purple-600',
      iconBg: side === 'left' ? 'bg-blue-100' : 'bg-purple-100',
      badgeDot: side === 'left' ? 'bg-blue-500' : 'bg-purple-500',
      fetchBtn: side === 'left'
        ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-sm shadow-blue-200'
        : 'bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-sm shadow-purple-200',
    };

    return (
      <Card className={`shadow-md border border-gray-200 border-l-4 ${accentClasses.borderAccent} overflow-visible transition-shadow hover:shadow-lg`}>
        {/* Header */}
        <CardHeader className={`${accentClasses.headerBg} border-b border-gray-100 pb-4`}>
          <CardTitle className="flex items-center gap-2.5">
            <span className={`${accentClasses.iconBg} p-1.5 rounded-md`}>
              <Shield className={`h-4 w-4 ${accentClasses.iconColor}`} />
            </span>
            <span className="text-gray-900">{title}</span>
            {config.fetchState === 'success' && (
              <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Fetched
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-gray-500 text-xs mt-0.5">Configure proxy for comparison</CardDescription>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          {/* Org + Token row */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Organization *</label>
              <Select value={config.org} onValueChange={(val) => onUpdate({ org: val })}>
                <SelectTrigger className="border-gray-200 hover:border-gray-300 focus:ring-1 focus:ring-offset-0">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.name}>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${org.type === 'Production' ? 'bg-red-400' : 'bg-amber-400'}`} />
                        <div>
                          <div className="font-medium text-sm">{org.name}</div>
                          <div className="text-xs text-gray-400">{org.type}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Authorization Token *</label>
              <div className="relative">
                <Input
                  type={config.showToken ? 'text' : 'password'}
                  value={config.token}
                  onChange={(e) => onUpdate({ token: e.target.value })}
                  placeholder="Enter organization token"
                  className="pr-9 border-gray-200 hover:border-gray-300 focus:ring-1 focus:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={() => onUpdate({ showToken: !config.showToken })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {config.showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Proxy Name + Fetch */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proxy Name *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={config.name}
                  onChange={(e) => handleNameChange(e.target.value, side)}
                  placeholder="Enter or search proxy name…"
                  className="border-gray-200 hover:border-gray-300 focus:ring-1 focus:ring-offset-0"
                />
                {config.showProxySuggestions && config.proxySuggestions.length > 0 && (
                  <ul className="absolute z-20 w-full bg-white border border-gray-200 mt-1 max-h-48 overflow-y-auto rounded-lg shadow-lg divide-y divide-gray-50">
                    {config.proxySuggestions.map((p, i) => (
                      <li
                        key={i}
                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2 transition-colors"
                        onClick={() => onUpdate({ name: p, showProxySuggestions: false })}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${accentClasses.badgeDot} opacity-60`} />
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button
                onClick={onFetch}
                disabled={config.fetchState === 'loading' || !config.name.trim() || !config.org.trim() || !config.token.trim()}
                className={`${accentClasses.fetchBtn} text-white rounded-lg px-4 transition-all`}
              >
                {config.fetchState === 'loading' ? (
                  <><RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />Fetching…</>
                ) : (
                  <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Fetch</>
                )}
              </Button>
            </div>
          </div>

          {/* Status area — error + deployment table only */}
          {config.fetchState !== 'idle' && (
            <div className="space-y-3">
              {config.error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                  {config.error}
                </div>
              )}

              {config.fetchState === 'success' && config.deploymentInfo.length > 0 && (
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow className="border-b border-gray-200">
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-2">Environment</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-2">Revision</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-2">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config.deploymentInfo.map((dep, i) => (
                        <TableRow key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                          <TableCell className="font-medium text-sm text-gray-700">{dep.environment}</TableCell>
                          <TableCell className="text-sm text-gray-500">{dep.revision || '—'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={dep.status === 'Deployed' ? 'default' : 'secondary'}
                              className={`text-xs gap-1 ${dep.status === 'Deployed'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'}`}
                            >
                              {dep.status === 'Deployed'
                                ? <CheckCircle2 className="h-3 w-3" />
                                : <XCircle className="h-3 w-3" />}
                              {dep.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Revision input — auto-filled after fetch, still editable */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Revision to Compare *</label>
            <Input
              type="text"
              value={config.revision}
              onChange={(e) => onUpdate({ revision: e.target.value })}
              placeholder="Enter revision number (e.g. 1)"
              disabled={!config.name}
              className="border-gray-200 hover:border-gray-300 focus:ring-1 focus:ring-offset-0 disabled:opacity-40"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  const bothReady = !!(proxy1.name && proxy1.revision.trim() && proxy2.name && proxy2.revision.trim());

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Page header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <GitCompare className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Compare Proxies</h1>
              <p className="text-gray-600 text-sm">
                Compare proxies from the same or different organizations
              </p>
            </div>
          </div>
        </div>

        {/* Proxy 1 */}
        {renderProxyCard('Proxy 1', proxy1, updateProxy1, () => fetchProxyDetails(proxy1, updateProxy1), 'left')}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-dashed border-gray-300" />
          <div className="flex items-center gap-2 text-gray-500 bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm text-sm font-medium">
            <ArrowRightLeft className="h-4 w-4" />
            Compare
          </div>
          <div className="flex-1 border-t border-dashed border-gray-300" />
        </div>

        {/* Proxy 2 */}
        {renderProxyCard('Proxy 2', proxy2, updateProxy2, () => fetchProxyDetails(proxy2, updateProxy2), 'right')}

        {/* Compare button */}
        <Card className="shadow-md border border-gray-200">
          <CardContent className="pt-5 pb-5">
            <Button
              onClick={() => {
                if (!bothReady) { toast.error('Please provide both proxy names and revisions to compare'); return; }
                navigate('/compare-proxies-success', {
                  state: {
                    proxy1: { org: proxy1.org, name: proxy1.name, token: proxy1.token, revision: proxy1.revision.trim() },
                    proxy2: { org: proxy2.org, name: proxy2.name, token: proxy2.token, revision: proxy2.revision.trim() },
                  },
                });
              }}
              disabled={!bothReady}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-base py-6 rounded-xl shadow-sm shadow-blue-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <GitCompare className="mr-2 h-5 w-5" />
              Compare Proxies
            </Button>
            {!bothReady && (
              <p className="text-center text-xs text-gray-400 mt-2">
                Fill in both proxy names and revision numbers to continue
              </p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default CompareProxies;