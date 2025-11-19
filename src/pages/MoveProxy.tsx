import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MoveProxy as apiMoveProxy } from '@/services/api';
import { fetchProxies } from '@/services/api'; // your function to get proxies
import { useEffect } from 'react';  
import { fetchLatestRevision } from '@/services/api';
import { fetchDeploymentStatus } from '@/services/api';
import { 
  Copy, 
  Building2, 
  Key, 
  Package, 
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  X
} from 'lucide-react';

const organizations = [
  { id: 1, name: 'apigee-prod-ouax', type: 'Production' },
  { id: 2, name: 'apigee-non-prod-crjb', type: 'Non-Production' },
];


const MoveProxy = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [sourceOrg, setSourceOrg] = useState("");
  const [targetOrg, setTargetOrg] = useState("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [proxyCheckStatus, setProxyCheckStatus] = useState<'idle' | 'checking' | 'found' | 'not_found' | 'error' | 'unknown'>('idle');
  const [deploymentInfo, setDeploymentInfo] = useState<{environment: string, status: string, revision?: string}[]>([]);
  const [formData, setFormData] = useState({
    sourceToken: '',
    targetToken: '',
    proxyName: '',
    newProxyName: '',
    revision: '',
    
  });

  const [allProxies, setAllProxies] = useState<string[]>([]); // full list
  const [proxySuggestions, setProxySuggestions] = useState<string[]>([]); // filtered list
  const [showProxySuggestions, setShowProxySuggestions] = useState(false);

  const onFetchLatestRevision = async () => {
    if (!sourceOrg || !formData.sourceToken || !formData.proxyName) {
      toast.error('Provide source org, token, and proxy name first');
      return;
    }

    try {
      setIsFetching(true);
      const latestRevision = await fetchLatestRevision({
        sourceOrg,
        proxyName: formData.proxyName,
        sourceToken: formData.sourceToken,
      });
      setFormData((prev) => ({ ...prev, revision: latestRevision.toString() }));
      toast.success(`Latest revision fetched: ${latestRevision}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch latest revision');
    } finally {
      setIsFetching(false);
    }
  };

  const onFetchDeploymentStatus = async () => {
    if (!sourceOrg || !formData.sourceToken || !formData.proxyName) {
      toast.error('Provide Apigee org, token, and proxy name first');
      return;
    }

    try {
      setIsCheckingStatus(true);
      setProxyCheckStatus('checking');
      const deployments = await fetchDeploymentStatus({
        sourceOrg: sourceOrg,
        proxyName: formData.proxyName,
        sourceToken: formData.sourceToken,
      });
      if (deployments && deployments.length > 0) {
        setProxyCheckStatus('found');
        setDeploymentInfo(deployments);
      } else {
        setProxyCheckStatus('not_found');
        setDeploymentInfo([]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch deployment status');
      setProxyCheckStatus('error');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // <-- Add it here, with your other handlers
  const handleProxyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, proxyName: value }));

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  useEffect(() => {
    if (sourceOrg && formData.sourceToken?.trim()) {
      fetchProxies(sourceOrg, formData.sourceToken)
        .then((res) => {
          console.log('Proxies received:', res);
          const proxyList = Array.isArray(res.proxies) ? res.proxies.map(p => p.name) : [];
          setAllProxies(proxyList);      
          setProxySuggestions(proxyList);
        })
        .catch((err) => {
          console.error('Error fetching proxies:', err);
          setAllProxies([]);
          setProxySuggestions([]);
        });
    }
  }, [sourceOrg, formData.sourceToken]);


 


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!sourceOrg || !targetOrg) {
      toast.error('Please select both source and target organizations');
      return;
    }
    
    if (!formData.proxyName || !formData.newProxyName) {
      toast.error('Proxy name fields are required');
      return;
    }

    if (!formData.sourceToken || !formData.targetToken) {
      toast.error('Both authentication tokens are required');
      return;
    }
    
    
    setIsLoading(true);
    
    try {
      const response = await apiMoveProxy({
        sourceOrg,
        targetOrg,
        sourceToken: formData.sourceToken,
        targetToken: formData.targetToken,
        proxyName: formData.proxyName,
        newProxyName: formData.newProxyName,
        revision: formData.revision,
      });
      console.log('API response:', response); 
      if (response.success) {
        toast.success('Proxy successfully cloned!');
        navigate('/clone-proxy-success', {         //not done yet
          state: {
            proxyData: response.data || {},
            sourceOrg,
            targetOrg,
            originalProxyName: formData.proxyName,
            newProxyName: formData.newProxyName,
            targetToken: formData.targetToken,
            revision: formData.revision,
          }
        });
      } else {
        toast.error(response.message || 'Failed to move Proxy');
      }
    } catch (error) {
      console.error('Error moving proxy:', error);
      toast.error(error.message || 'Failed to move proxy');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="">
              {/* <Copy size={24} /> */}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Move Proxies Across Org
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Duplicate API proxies between Apigee organizations with custom configurations
          </p>
        </div>

        {/* Main Form */}
        <Card className="shadow-lg">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Proxy Cloning Configuration
            </CardTitle>
            <CardDescription>
              Fill in the details below to move your API proxy
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Organizations Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Organizations</h3>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Source Organization *
                    </label>
                    <Select value={sourceOrg} onValueChange={setSourceOrg}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source organization" />
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
                    <label className="text-sm font-medium text-gray-700">
                      Target Organization *
                    </label>
                    <Select value={targetOrg} onValueChange={setTargetOrg}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target organization" />
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
                </div>

                {sourceOrg && targetOrg && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800 font-medium">
                      Organizations selected successfully
                    </span>
                  </div>
                )}
              </div>

              {/* Authentication Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Authentication</h3>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Source Token *
                    </label>
                    <Input
                      name="sourceToken"
                      type="password"
                      placeholder="Enter source organization token"
                      value={formData.sourceToken}
                      onChange={handleChange}
                    />
                    {formData.sourceToken && (
                      <Badge variant="secondary" className="text-xs">
                        ✓ Token provided
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Target Token *
                    </label>
                    <Input
                      name="targetToken"
                      type="password"
                      placeholder="Enter target organization token"
                      value={formData.targetToken}
                      onChange={handleChange}
                    />
                    {formData.targetToken && (
                      <Badge variant="secondary" className="text-xs">
                        ✓ Token provided
                      </Badge>
                    )}
                  </div>
                </div>

                {/* <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <strong>Security Note:</strong> Tokens are used for authentication only and are not stored.
                  </div>
                </div> */}
              </div>

              {/* Proxy Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Proxy Details</h3>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Existing Proxy Name *
                    </label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="relative w-full">
                          <Input
                            name="proxyName"
                            placeholder="Existing proxy in Apigee"
                            value={formData.proxyName}
                            onChange={handleProxyNameChange}
                          />
                          {showProxySuggestions && proxySuggestions.length > 0 && (
                            <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 max-h-48 overflow-y-auto rounded-md shadow-lg">
                              {proxySuggestions.map((p, i) => (
                                <li
                                  key={i}
                                  className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, proxyName: p }));
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
                          type="button"
                          size="sm"
                          onClick={onFetchDeploymentStatus}
                          disabled={isCheckingStatus}
                          className="bg-blue-300 text-blue-900 hover:bg-blue-400 active:bg-blue-500 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          {isCheckingStatus ? 'Checking…' : 'Check Status'}
                        </Button>
                      </div>
                      {proxyCheckStatus !== 'idle' && (
                        <Badge
                          variant="secondary"
                          className={
                            proxyCheckStatus === 'found'
                              ? 'bg-green-100 text-green-800'
                              : proxyCheckStatus === 'not_found'
                              ? 'bg-red-100 text-red-800'
                              : proxyCheckStatus === 'checking'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }
                        >
                          {proxyCheckStatus === 'found' && 'Found'}
                          {proxyCheckStatus === 'not_found' && 'Not Found'}
                          {proxyCheckStatus === 'checking' && 'Checking...'}
                          {proxyCheckStatus === 'error' && 'Error'}
                          {proxyCheckStatus === 'unknown' && 'Unknown'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      New Proxy Name *
                    </label>
                    <Input
                      name="newProxyName"
                      placeholder="Enter new proxy name"
                      value={formData.newProxyName}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
                {/* Deployment Status Section */}
                {proxyCheckStatus === 'not_found' && (
                  <div className="mt-4 p-4 rounded-lg" style={{backgroundColor: '#E8F0FE', border: '1px solid #4285F4'}}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: '#4285F4'}}></div>
                      <span className="font-medium" style={{color: '#4285F4'}}>Not Present</span>
                    </div>
                    <p className="text-sm mt-1" style={{color: '#4285F4'}}>Proxy not found in the selected organization</p>
                  </div>
                )}

                 {proxyCheckStatus === 'found' && deploymentInfo.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-3" style={{color: '#4285F4'}}>Apigee Deployment Status</h4>
                    <div className="rounded-lg overflow-hidden" style={{border: '1px solid #4285F4'}}>
                      <Table>
                        <TableHeader style={{backgroundColor: '#E8F0FE'}}>
                          <TableRow>
                            <TableHead className="w-1/3" style={{color: '#4285F4'}}>Environment</TableHead>
                            <TableHead className="w-1/3" style={{color: '#4285F4'}}>Revision</TableHead>
                            <TableHead className="w-1/3" style={{color: '#4285F4'}}>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deploymentInfo.map((deployment, index) => (
                            <TableRow key={index} style={{backgroundColor: 'rgba(232, 240, 254, 0.3)'}}>
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
                                  {deployment.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Revision
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      name="revision"
                      placeholder="Press Fetch to get the latest revision"
                      value={formData.revision}
                      onChange={handleChange}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={onFetchLatestRevision}
                      disabled={isFetching}
                      className="bg-blue-300 text-blue-900 hover:bg-blue-400 active:bg-blue-500 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {isFetching ? 'Fetching…' : 'Fetch'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Fetch fills the latest deployed revision from your source org.
                  </p>
                </div>

               
               
    

              {/* Submit Button */}
              <div className="pt-4 border-t">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Cloning Proxy...
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-5 w-5" />
                      Clone Proxy
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Quick Info Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: CheckCircle2,
              title: "Secure",
              description: "Enterprise-grade security"
            },
            {
              icon: Copy,
              title: "Fast",
              description: "Move proxies in seconds"
            },
            {
              icon: Package,
              title: "Flexible",
              description: "Customize settings"
            }
          ].map((feature, index) => (
            <Card key={feature.title} className="text-center p-4 hover:shadow-md transition-shadow">
              <feature.icon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default MoveProxy;
