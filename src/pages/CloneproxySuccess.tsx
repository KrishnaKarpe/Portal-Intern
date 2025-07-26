import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, ExternalLink, Package, Building2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const CloneproxySuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    proxyData, 
    sourceOrg, 
    targetOrg, 
    originalProxyName,
    newProxyName,
    deploymentResults,
    sameOrg = false 
  } = location.state || {};

  const handleBackToMove = () => {
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
            {sameOrg 
              ? 'Proxy Duplicated Successfully!' 
              : 'Proxy Moved Successfully!'
            }
          </CardTitle>
          <p className="text-green-600 mt-2">
            {sameOrg 
              ? 'Your proxy has been successfully duplicated within the organization'
              : 'Your proxy has been successfully moved to the target organization'
            }
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
              <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                <Package className="h-5 w-5" />
                {sameOrg ? 'Duplication' : 'Migration'} Details
              </h3>
              
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
                  <span className="font-medium text-gray-600">Original Proxy:</span>
                  <span className="text-gray-800">{originalProxyName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">New Proxy:</span>
                  <span className="text-gray-800">{newProxyName}</span>
                </div>
                
                {proxyData.sourceRevision && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Source Revision:</span>
                    <span className="text-gray-800">{proxyData.sourceRevision}</span>
                  </div>
                )}

                {proxyData.targetRevision && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Target Revision:</span>
                    <span className="text-gray-800">{proxyData.targetRevision}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Enhanced Deployment Results */}
          {deploymentResults && deploymentResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-50 p-4 rounded-lg space-y-3"
            >
              <h3 className="font-semibold text-lg text-gray-800">Deployment Results</h3>
              
              <div className="space-y-2">
                {deploymentResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{result.environment}</span>
                        <Badge 
                          variant={result.status === 'deployed' ? 'default' : 'destructive'}
                          className={result.status === 'deployed' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {result.status === 'deployed' ? '✅ Deployed' : '❌ Failed'}
                        </Badge>
                      </div>
                      
                      {/* ✅ ADD: Show error details for failed deployments */}
                      {result.status === 'failed' && (
                        <div className="mt-2 text-sm">
                          <div className="text-red-600 font-medium">{result.errorType || 'Error'}</div>
                          <div className="text-red-700">{result.error}</div>
                          {result.suggestion && (
                            <div className="text-blue-600 mt-1">💡 {result.suggestion}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {proxyData?.summary && (
                <div className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded">
                  <div className="font-medium text-gray-800 mb-1">Summary:</div>
                  <div className="flex gap-4">
                    <span className="text-green-600">✅ {proxyData.summary.deployedEnvironments} deployed</span>
                    <span className="text-red-600">❌ {proxyData.summary.failedEnvironments} failed</span>
                  </div>
                  {proxyData.summary.deployedEnvironments > 0 && (
                    <div className="text-green-700 mt-1 font-medium">
                      🎉 Proxy is successfully running in {proxyData.summary.deployedEnvironments} environment(s)!
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-3 pt-4"
          >
            <Button
              onClick={handleBackToMove}
              variant="outline"
              className="flex-1 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {sameOrg ? 'Duplicate Another Proxy' : 'Move Another Proxy'}
            </Button>
            
            <Button
              onClick={handleGoToDashboard}
              className="flex-1 bg-navy hover:bg-navy-200 flex items-center gap-2"
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