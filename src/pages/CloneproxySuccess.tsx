import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const CloneproxySuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { proxyData, sourceOrg, targetOrg } = location.state || {};

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
                  <span className="font-medium text-gray-600">Product Name:</span>
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
                
                {proxyData.environments && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Environments:</span>
                    <span className="text-gray-800">
                      {Array.isArray(proxyData.environments) 
                        ? proxyData.environments.join(', ') 
                        : proxyData.environments}
                    </span>
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