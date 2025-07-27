import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, Key, Package, CheckCircle2, Loader2, 
  ArrowRight, Server, Globe 
} from 'lucide-react';
import { 
  getOrganizations, 
  MoveProxy as apiMoveProxy,
  getOrganizationEnvironments  
} from '@/services/api';

const MoveProxy = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [sourceOrg, setSourceOrg] = useState('');
  const [targetOrg, setTargetOrg] = useState('');
  const [selectedEnvironments, setSelectedEnvironments] = useState([]);
  
  const [formData, setFormData] = useState({
    sourceToken: '',
    targetToken: '',
    proxyName: '',
    newProxyName: '',
    revision: 'latest' // Default to latest
  });

  const [availableEnvironments, setAvailableEnvironments] = useState([]);
  const [loadingEnvironments, setLoadingEnvironments] = useState(false);

  // Load organizations on component mount
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const orgs = await getOrganizations();
        setOrganizations(orgs);
      } catch (error) {
        console.error('Error loading organizations:', error);
        toast.error('Failed to load organizations');
      }
    };

    loadOrganizations();
  }, []);

  // Load environments when target org changes
  useEffect(() => {
    const loadEnvironments = async () => {
      if (!targetOrg || !formData.targetToken) return;
      
      setLoadingEnvironments(true);
      try {
        // need to add this API call
        const environments = await getOrganizationEnvironments(targetOrg, formData.targetToken);
        const transformedEnvs = environments.map((env, index) => ({
          id: index + 1,
          name: env,
          type: 'Environment'
        }));
        setAvailableEnvironments(transformedEnvs);
      } catch (error) {
        console.error('Error loading environments:', error);
        // Fallback to default environments
        setAvailableEnvironments([
          { id: 1, name: 'apim-dev', type: 'Development', category: 'non-prod' },
          { id: 2, name: 'apim-uat-internal', type: 'UAT Internal', category: 'non-prod' },
          { id: 3, name: 'apim-uat-public', type: 'UAT Public', category: 'non-prod' },
          // Production environments
          { id: 4, name: 'apim-prod-internal', type: 'Production Internal', category: 'prod' },
          { id: 5, name: 'apim-prod-public', type: 'Production Public', category: 'prod' },
          { id: 6, name: 'apim-prod-saas', type: 'Production SaaS', category: 'prod' },
        ]);
      } finally {
        setLoadingEnvironments(false);
      }
    };

    loadEnvironments();
  }, [targetOrg, formData.targetToken]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEnvironmentSelect = (environmentName) => {
    if (!selectedEnvironments.includes(environmentName)) {
      setSelectedEnvironments([...selectedEnvironments, environmentName]);
    }
  };

  const handleEnvironmentRemove = (environmentName) => {
    setSelectedEnvironments(selectedEnvironments.filter(env => env !== environmentName));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!sourceOrg || !targetOrg) {
      toast.error('Please select both source and target organizations');
      return;
    }

    // if (sourceOrg === targetOrg) {
    //   toast.error('Source and target organizations must be different');
    //   return;
    // }
    
    if (!formData.proxyName || !formData.newProxyName) {
      toast.error('Both existing and new proxy names are required');
      return;
    }

    if (!formData.sourceToken || !formData.targetToken) {
      toast.error('Both authentication tokens are required');
      return;
    }
    
    setIsLoading(true);

    // sending data to backend using apimoveproxy
    try {
      const payload = {
        sourceOrg,
        targetOrg,
        sourceToken: formData.sourceToken,
        targetToken: formData.targetToken,
        proxyName: formData.proxyName,
        newProxyName: formData.newProxyName,
        revision: formData.revision || 'latest',
        environments: selectedEnvironments
      };

      console.log('Submitting proxy move request');

      const response = await apiMoveProxy(payload);

      if (response.success) {
        toast.success('Proxy successfully moved and deployed!');
        navigate('/clone-proxy-success', {
          state: {
            proxyData: response.data,
            sourceOrg,
            targetOrg,
            originalProxyName: formData.proxyName,
            newProxyName: formData.newProxyName,
            deploymentResults: response.data.deploymentResults
          }
        });
      } else {
        toast.error(response.message || 'Failed to move proxy');
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
          <h1 className="text-3xl font-bold text-gray-900">
            Automated Proxy Migration
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Export proxy from source organization and import to target organization with automatic deployment
          </p>
        </div>

        {/* Main Form */}
        <Card className="shadow-lg">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Proxy Migration Configuration
            </CardTitle>
            <CardDescription>
              Automate the export/import process between Apigee organizations
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
                      {sourceOrg === targetOrg 
                        ? '✓ Organizations selected (Same org - proxy will be duplicated)'
                        : '✓ Organizations selected (Cross-org move)'
                      }
                    </span>
                  </div>
                )}

                {/* {sourceOrg && targetOrg && sourceOrg === targetOrg && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="text-sm text-red-800 font-medium">
                      ⚠️ Source and target organizations must be different
                    </span>
                  </div>
                )} */}
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
                      required
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
                      required
                    />
                    {formData.targetToken && (
                      <Badge variant="secondary" className="text-xs">
                        ✓ Token provided
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Proxy Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Proxy Details</h3>
                </div>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Existing Proxy Name *
                    </label>
                    <Input
                      name="proxyName"
                      placeholder="Enter existing proxy name"
                      value={formData.proxyName}
                      onChange={handleChange}
                      required
                    />
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
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Revision
                    </label>
                    <Input
                      name="revision"
                      placeholder="latest (default)"
                      value={formData.revision}
                      onChange={handleChange}
                    />
                    <p className="text-xs text-gray-500">
                      Leave empty or use "latest" for most recent revision
                    </p>
                  </div>
                </div>
              </div>

              {/* Environment Selection Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Server className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Deployment (Optional)</h3>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Target Environments
                  </label>
                  
                  <div className="grid gap-2 md:grid-cols-3">
                    {availableEnvironments.map((env) => (
                      <div 
                        key={env.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedEnvironments.includes(env.name)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => handleEnvironmentSelect(env.name)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{env.name}</div>
                            <div className="text-xs text-gray-500">{env.type}</div>
                          </div>
                          {selectedEnvironments.includes(env.name) && (
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedEnvironments.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Selected Environments:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedEnvironments.map((env) => (
                          <Badge 
                            key={env} 
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => handleEnvironmentRemove(env)}
                          >
                            {env} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Select environments to automatically deploy the proxy after import
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t">
                <Button
                  type="submit"
                  disabled={
                    isLoading || 
                    !sourceOrg || 
                    !targetOrg || 
                    (sourceOrg === targetOrg && formData.proxyName === formData.newProxyName)
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {sourceOrg === targetOrg ? 'Duplicating Proxy...' : 'Moving Proxy...'}
                    </>
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-5 w-5" />
                      {sourceOrg === targetOrg 
                        ? 'Duplicate Proxy in Same Org' 
                        : 'Export, Import & Deploy Proxy'
                      }
                    </>
                  )}
                </Button>
              </div>

              {/*     ADD: Proxy name validation for same org */}
              {sourceOrg === targetOrg && formData.proxyName && formData.newProxyName && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm text-blue-800 font-medium">
                    {formData.proxyName === formData.newProxyName
                      ? '⚠️ Proxy names must be different when duplicating within the same organization'
                      : '✓ Ready to duplicate proxy within the same organization'
                    }
                  </span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default MoveProxy;
