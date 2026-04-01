import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';
import { ArrowLeft, GitCompare, Folder, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileTree, buildProxyFileTree } from '@/components/ui/file-tree';

const CompareProxiesSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    proxyName, 
    sourceOrg, 
    revision1, 
    revision2,
    authToken,
    latestRevision,
    deploymentInfo
  } = location.state || {};

  const [selectedFile, setSelectedFile] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'proxies' | 'folders' | 'files'>('proxies');

  // Build file tree structure
  const fileTreeData = proxyName ? buildProxyFileTree(proxyName) : [];

  const handleBackToCompare = () => {
    navigate('/compare-proxies');
  };

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Left Sidebar - File Tree */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Folder Structure</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <FileTree
              data={fileTreeData}
              onFileSelect={handleFileSelect}
              selectedPath={selectedFile}
            />
          </div>
        </div>

        {/* Main Content - Comparison View */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitCompare className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Compare Proxies</h1>
                  <p className="text-sm text-gray-600">Review differences between revisions</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleBackToCompare}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </div>

          {/* Comparison Panels */}
          <div className="flex-1 flex overflow-hidden">
            {/* Compare 1 Panel */}
            <div className="flex-1 border-r border-gray-200 bg-white flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-blue-50">
                <h2 className="text-lg font-semibold text-blue-900 mb-3">Compare 1</h2>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Api Name</label>
                    <Input
                      value={proxyName || ''}
                      readOnly
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Org</label>
                    <Input
                      value={sourceOrg || ''}
                      readOnly
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Revision</label>
                    <Input
                      value={revision1 || ''}
                      readOnly
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <FileText className="h-4 w-4" />
                      <span>{selectedFile}</span>
                    </div>
                    <Card>
                      <CardContent className="p-4">
                        <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                          {/* File content would go here when API is implemented */}
                          {`// File content for ${selectedFile} in revision ${revision1}\n// This will be populated when the comparison API is implemented`}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Select a file from the sidebar to view content</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Compare 2 Panel */}
            <div className="flex-1 bg-white flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-green-50">
                <h2 className="text-lg font-semibold text-green-900 mb-3">Compare 2</h2>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Api Name</label>
                    <Input
                      value={proxyName || ''}
                      readOnly
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Org</label>
                    <Input
                      value={sourceOrg || ''}
                      readOnly
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Revision</label>
                    <Input
                      value={revision2 || ''}
                      readOnly
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <FileText className="h-4 w-4" />
                      <span>{selectedFile}</span>
                    </div>
                    <Card>
                      <CardContent className="p-4">
                        <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                          {/* File content would go here when API is implemented */}
                          {`// File content for ${selectedFile} in revision ${revision2}\n// This will be populated when the comparison API is implemented`}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Select a file from the sidebar to view content</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareProxiesSuccess;