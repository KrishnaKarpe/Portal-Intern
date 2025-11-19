import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { deployProxy } from '@/services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

const environmentCatalog: Record<string, { id: string; label: string }[]> = {
  'apigee-non-prod-crjb': [
    { id: 'apim-dev', label: 'apim-dev' },
    { id: 'apim-uat-internal', label: 'apim-uat-internal ' },
    { id: 'apim-uat-public', label: 'apim-uat-public' },
  ],
  'apigee-prod-ouax': [
    
    { id: 'apim-prod-internal', label: 'apim-prod-internal' },
    { id: 'apim-prod-public', label: 'apim-prod-public' },
    { id: 'apim-prod-saas', label: 'apim-prod-saas' },
    
  ],
};

const CloneproxySuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    proxyData, 
    sourceOrg, 
    targetOrg,
    newProxyName,
    targetToken,
    environments: selectedEnvironments = []
  } = location.state || {};

  const environmentOptions = useMemo(
    () => environmentCatalog[targetOrg as keyof typeof environmentCatalog] || [],
    [targetOrg]
  );

  const [deployEnvironment, setDeployEnvironment] = useState(
    selectedEnvironments?.[0] || ''
  );
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployFeedback, setDeployFeedback] = useState<{status: 'idle' | 'success' | 'error', message?: string}>({ status: 'idle' });

  useEffect(() => {
    if (selectedEnvironments && selectedEnvironments.length > 0) {
      setDeployEnvironment(selectedEnvironments[0]);
      return;
    }
    if (environmentOptions.length > 0) {
      setDeployEnvironment(environmentOptions[0].id);
    } else {
      setDeployEnvironment('');
    }
  }, [selectedEnvironments, environmentOptions, targetOrg]);

  const handleDeployProxy = async () => {
    if (!targetOrg || !targetToken) {
      toast.error('Missing target organization or token for deployment.');
      return;
    }
    if (!newProxyName) {
      toast.error('Proxy name is missing.');
      return;
    }
    if (!deployEnvironment) {
      toast.error('Please choose an environment to deploy to.');
      return;
    }

    try {
      setIsDeploying(true);
      setDeployFeedback({ status: 'idle' });

      const response = await deployProxy({
        targetOrg,
        targetToken,
        newProxyName,
        environment: deployEnvironment,
      });

      const message = response?.message || `Deployment triggered for ${deployEnvironment}`;
      setDeployFeedback({ status: 'success', message });
      toast.success(message);
    } catch (error: any) {
      const message = error?.message || 'Failed to deploy proxy';
      setDeployFeedback({ status: 'error', message });
      toast.error(message);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleBackToClone = () => {
    navigate('/move-proxy');
  };

  const handleGoToDashboard = () => {
    navigate('/');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-2xl shadow-xl border-green-200">
        <CardHeader className="text-center bg-green-50 border-b">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-4"
          >
            <CheckCircle className="h-16 w-16 text-green-500" />
          </motion.div>
          <CardTitle className="text-2xl text-green-800">
            Proxy Cloned Successfully!
          </CardTitle>
          <p className="text-green-600 mt-2">
            Your proxy has been successfully cloned to the target organization
          </p>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {proxyData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-50 p-4 rounded-lg space-y-3"
            >
              <h3 className="font-semibold text-lg text-gray-800">Clone Details</h3>
              
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Source Organization:</span>
                  <span className="text-gray-800">{sourceOrg}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Target Organization:</span>
                  <span className="text-gray-800">{targetOrg}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Proxy Name:</span>
                  <span className="text-gray-800">{proxyData.name}</span>
                </div>
                
                {proxyData.displayName && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Display Name:</span>
                    <span className="text-gray-800">{proxyData.displayName}</span>
                  </div>
                )}
                
                {proxyData.description && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Description:</span>
                    <span className="text-gray-800">{proxyData.description}</span>
                  </div>
                )}
                
                
                
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Created At:</span>
                  <span className="text-gray-800">
                    {new Date().toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
          {(targetOrg && newProxyName) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white border rounded-lg p-4 shadow-sm space-y-4"
            >
              <div>
                <h4 className="font-semibold text-gray-900">Deploy this proxy</h4>
                <p className="text-sm text-gray-600">
                  Choose a target environment in <span className="font-medium">{targetOrg}</span> and deploy <span className="font-medium">{newProxyName}</span>.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Environment</label>
                <Select
                  value={deployEnvironment}
                  onValueChange={setDeployEnvironment}
                  disabled={isDeploying || environmentOptions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={environmentOptions.length ? 'Select environment' : 'No environments available'} />
                  </SelectTrigger>
                  <SelectContent>
                    {environmentOptions.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm text-gray-600">
                  <p>Proxy: <span className="font-medium text-gray-900">{newProxyName}</span></p>
                  <p>Org: <span className="font-medium text-gray-900">{targetOrg}</span></p>
                  {selectedEnvironments.length > 0 && (
                    <p>
                      Preferred:{' '}
                      <span className="font-medium text-gray-900">
                        {selectedEnvironments.join(', ')}
                      </span>
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleDeployProxy}
                  disabled={isDeploying || !deployEnvironment}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isDeploying ? 'Deploying…' : 'Deploy Proxy'}
                </Button>
              </div>

              {deployFeedback.status === 'success' && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-2">
                  {deployFeedback.message}
                </p>
              )}
              {deployFeedback.status === 'error' && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
                  {deployFeedback.message}
                </p>
              )}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-blue-50 p-4 rounded-lg"
          >
            <h4 className="font-medium text-blue-800 mb-2">Next Steps:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Check your Apigee console to verify the proxy</li>
              <li>• Configure any additional settings if needed</li>
              <li>• Test the API proxy in the target environment</li>
            </ul>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-4 justify-center pt-4"
          >
            <Button
              onClick={handleBackToClone}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Clone Another Proxy
            </Button>
            
            <Button
              onClick={handleGoToDashboard}
              className="bg-navy hover:bg-navy-200 flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CloneproxySuccess;