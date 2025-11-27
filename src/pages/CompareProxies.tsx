import React, { useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fetchLatestRevision, fetchDeploymentStatus, fetchProxies } from '@/services/api';
import { toast } from 'sonner';
import { GitCompare, Shield, RefreshCw, Gauge, CheckCircle2, XCircle } from 'lucide-react';

const organizations = [
  { id: 1, name: 'apigee-prod-ouax', type: 'Production' },
  { id: 2, name: 'apigee-non-prod-crjb', type: 'Non-Production' },
];

const CompareProxies: React.FC = () => {
  const [sourceOrg, setSourceOrg] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [proxyName, setProxyName] = useState('');
  const [latestRevision, setLatestRevision] = useState<string | null>(null);
  const [deploymentInfo, setDeploymentInfo] = useState<{environment: string, status: string, revision?: string}[]>([]);
  const [revisionFetchState, setRevisionFetchState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [deploymentFetchState, setDeploymentFetchState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [allProxies, setAllProxies] = useState<string[]>([]);
  const [proxySuggestions, setProxySuggestions] = useState<string[]>([]);
  const [showProxySuggestions, setShowProxySuggestions] = useState(false);
  const [revision1, setRevision1] = useState('');
  const [revision2, setRevision2] = useState('');

  // Fetch proxies when org and token are provided
  useEffect(() => {
    if (sourceOrg && authToken?.trim()) {
      fetchProxies(sourceOrg, authToken)
        .then((res) => {
          console.log('Proxies received:', res);
          const proxyList = Array.isArray(res.proxies) ? res.proxies.map((p: any) => p.name) : [];
          setAllProxies(proxyList);
          setProxySuggestions(proxyList);
        })
        .catch((err) => {
          console.error('Error fetching proxies:', err);
          setAllProxies([]);
          setProxySuggestions([]);
        });
    } else {
      setAllProxies([]);
      setProxySuggestions([]);
    }
  }, [sourceOrg, authToken]);

  const handleProxyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProxyName(value);

    if (!value) {
      setShowProxySuggestions(false);
      return;
    }

    const filtered = allProxies.filter(p =>
      p.toLowerCase().includes(value.toLowerCase())
    );
    setProxySuggestions(filtered);
    setShowProxySuggestions(true);
  };

  const handleFetchDeploymentStatus = useCallback(
    async () => {
      if (!proxyName.trim()) {
        setDeploymentError('Proxy name is required.');
        setRevisionError('Proxy name is required.');
        return;
      }
      if (!sourceOrg.trim() || !authToken.trim()) {
        setDeploymentError('Provide organization and token first.');
        setRevisionError('Provide organization and token first.');
        return;
      }

      setDeploymentFetchState('loading');
      setRevisionFetchState('loading');
      setDeploymentError(null);
      setRevisionError(null);
      setDeploymentInfo([]);
      setLatestRevision(null);

      try {
        // Fetch both latest revision and deployment status in parallel
        const [revision, deployments] = await Promise.all([
          fetchLatestRevision({
            sourceOrg: sourceOrg.trim(),
            proxyName: proxyName.trim(),
            sourceToken: authToken.trim(),
          }),
          fetchDeploymentStatus({
            sourceOrg: sourceOrg.trim(),
            proxyName: proxyName.trim(),
            sourceToken: authToken.trim(),
          })
        ]);

        // Set latest revision
        setLatestRevision(revision?.toString() ?? null);
        setRevisionFetchState('success');

        // Set deployment info
        if (deployments && deployments.length > 0) {
          setDeploymentInfo(deployments);
          setDeploymentFetchState('success');
          toast.success(`Fetched latest revision (${revision}) and deployment status for ${deployments.length} environment(s)`);
        } else {
          setDeploymentInfo([]);
          setDeploymentFetchState('success');
          toast.success(`Fetched latest revision (${revision}). No deployments found for this proxy`);
        }
      } catch (error: any) {
        const message = error?.message || 'Failed to fetch proxy information.';
        setDeploymentError(message);
        setRevisionError(message);
        setDeploymentFetchState('error');
        setRevisionFetchState('error');
      }
    },
    [authToken, sourceOrg, proxyName],
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <GitCompare className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Compare Proxies</h1>
              <p className="text-gray-600 text-sm">
                Fetch a proxy from Apigee and inspect its latest deployed revision.
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Source Organization
            </CardTitle>
            <CardDescription>Provide Apigee details to fetch proxy information.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Organization *</label>
                  <Select value={sourceOrg} onValueChange={setSourceOrg}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.name}>
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-xs text-gray-500">{org.type}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Authorization Token *</label>
                  <Input
                    type="password"
                    value={authToken}
                    onChange={(event) => setAuthToken(event.target.value)}
                    placeholder="Enter organization token"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Proxy Name *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={proxyName}
                      onChange={handleProxyNameChange}
                      placeholder="Enter proxy name"
                      className="w-full"
                    />
                    {showProxySuggestions && proxySuggestions.length > 0 && (
                      <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 max-h-48 overflow-y-auto rounded-md shadow-lg">
                        {proxySuggestions.map((p, i) => (
                          <li
                            key={i}
                            className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                            onClick={() => {
                              setProxyName(p);
                              setShowProxySuggestions(false);
                            }}
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button
                    onClick={handleFetchDeploymentStatus}
                    disabled={(deploymentFetchState === 'loading' || revisionFetchState === 'loading') || !proxyName.trim() || !sourceOrg.trim() || !authToken.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {(deploymentFetchState === 'loading' || revisionFetchState === 'loading') ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Fetch and Deploy Status
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latest Revision and Deployment Status Card - Only show when button is clicked */}
        {(revisionFetchState !== 'idle' || deploymentFetchState !== 'idle') && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-blue-600" />
                Proxy Details
              </CardTitle>
              <CardDescription>Latest revision and deployment status for the selected proxy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Latest Revision Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Latest Revision</h3>

                {revisionError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {revisionError}
                  </div>
                )}

                {revisionFetchState === 'loading' && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Fetching latest revision...
                  </div>
                )}

                {proxyName && latestRevision && revisionFetchState === 'success' && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
                    <div className="flex items-center gap-2 text-green-800">
                      <Gauge className="h-4 w-4" />
                      Latest revision
                    </div>
                    <p className="mt-2 text-gray-900">
                      Proxy <span className="font-semibold">{proxyName}</span> is currently at revision{' '}
                      <span className="font-semibold">{latestRevision}</span>.
                    </p>
                  </div>
                )}
              </div>

              {/* Deployment Status Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Deployment Status</h3>

                {deploymentError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {deploymentError}
                  </div>
                )}

                {deploymentFetchState === 'loading' && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Fetching deployment status...
                  </div>
                )}

                {deploymentFetchState === 'success' && deploymentInfo.length > 0 && (
                  <div className="rounded-lg overflow-hidden border border-blue-200">
                    <Table>
                      <TableHeader className="bg-blue-50">
                        <TableRow>
                          <TableHead className="w-1/3 text-blue-700">Environment</TableHead>
                          <TableHead className="w-1/3 text-blue-700">Revision</TableHead>
                          <TableHead className="w-1/3 text-blue-700">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deploymentInfo.map((deployment, index) => (
                          <TableRow key={index} className="bg-white">
                            <TableCell className="font-medium">{deployment.environment}</TableCell>
                            <TableCell>{deployment.revision || '-'}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={deployment.status === 'Deployed' ? 'default' : 'secondary'}
                                className={
                                  deployment.status === 'Deployed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }
                              >
                                {deployment.status === 'Deployed' ? (
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                ) : (
                                  <XCircle className="mr-1 h-3 w-3" />
                                )}
                                {deployment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {deploymentFetchState === 'success' && deploymentInfo.length === 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    No deployments found for this proxy.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-blue-600" />
              Proxy Information
            </CardTitle>
            <CardDescription>Compare different revisions of the selected proxy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Proxy Name</label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {proxyName || <span className="text-gray-400 italic">No proxy selected</span>}
                  </p>
                  {sourceOrg && (
                    <p className="text-xs text-gray-500 mt-1">From: {sourceOrg}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Revision 1 *</label>
                  <Input
                    type="text"
                    value={revision1}
                    onChange={(e) => setRevision1(e.target.value)}
                    placeholder="Enter revision number (e.g., 1)"
                    disabled={!proxyName}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Revision 2 *</label>
                  <Input
                    type="text"
                    value={revision2}
                    onChange={(e) => setRevision2(e.target.value)}
                    placeholder="Enter revision number (e.g., 2)"
                    disabled={!proxyName}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => {
                    if (!proxyName || !revision1.trim() || !revision2.trim()) {
                      toast.error('Please provide proxy name and both revisions to compare');
                      return;
                    }
                    // TODO: Implement comparison logic
                    toast.info(`Comparing revision ${revision1} and ${revision2} of ${proxyName}`);
                  }}
                  disabled={!proxyName || !revision1.trim() || !revision2.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <GitCompare className="mr-2 h-4 w-4" />
                  Compare
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompareProxies;

