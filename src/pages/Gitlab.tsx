import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  GitBranch,
  ArrowRight,
} from 'lucide-react';

import { pushProxyToGitlab, checkProxyExists } from '@/services/api';

// Static options for Apigee orgs; adjust as needed
const organizations = [
  { id: 1, name: 'apigee-prod-ouax', type: 'Production' },
  { id: 2, name: 'apigee-non-prod-crjb', type: 'Non-Production' },
];

const Gitlab: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [proxyCheckStatus, setProxyCheckStatus] = useState<'idle' | 'checking' | 'found' | 'not_found' | 'error' | 'unknown'>('idle');
  const [availableRevisions, setAvailableRevisions] = useState<string[]>([]);
  const [deploymentInfo, setDeploymentInfo] = useState<{environment: string, status: string}[]>([]);
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>(['dev', 'uat-public', 'prod-public']);
  const [buttonAnimationPhase, setButtonAnimationPhase] = useState<'idle' | 'phase1' | 'phase2' | 'phase3'>('idle');
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [gitlabProjectUrl, setGitlabProjectUrl] = useState('');

  // Apigee selections
  const [apigeeOrg, setApigeeOrg] = useState("");

  // Form fields for Apigee → GitLab
  const [formData, setFormData] = useState({
    gitlabGroupName: '',
    gitlabAccessToken: '',
    gitRef: 'master',
    customGitRef: '',
    template: 'apigee-cicd',
    apigeeToken: '',
    proxyName: '',
    revision: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

  };

  const onPushProxyToGitlab = async () => {
    if (!apigeeOrg) {
      toast.error('Select Apigee organization');
      return;
    }
    if (!formData.apigeeToken || !formData.proxyName || !formData.revision) {
      toast.error('Provide Apigee token, proxy name and revision');
      return;
    }
    if (!formData.gitlabAccessToken || !formData.gitlabGroupName) {
      toast.error('Provide GitLab token and group name');
      return;
    }
    if (formData.gitRef === 'other' && !formData.customGitRef) {
      toast.error('Provide a branch/tag name');
      return;
    }
    try {
      setIsLoading(true);
      
      // Phase 1: Button Transform (0-300ms)
      setButtonAnimationPhase('phase1');
      
      // Simulate backend operation
      const selectedBranch = formData.gitRef === 'other' ? formData.customGitRef : formData.gitRef;
      const payload = {
        sourceOrg: apigeeOrg,
        sourceToken: formData.apigeeToken,
        proxyName: formData.proxyName,
        revision: formData.revision,
        gitToken: formData.gitlabAccessToken,
        gitlabGroupName: formData.gitlabGroupName,
        branch: selectedBranch || 'master',
        template: formData.template,
        environments: selectedEnvironments,
      };
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await pushProxyToGitlab(payload);
      
      // Phase 2: Success state (300ms)
      setButtonAnimationPhase('phase2');
      
      // Phase 3: Result Display (1000ms+)
      setTimeout(() => {
        setButtonAnimationPhase('phase3');
        setShowSuccessCard(true);
        // Use GitLab project URL from backend response
        setGitlabProjectUrl(response.data?.gitlabProjectUrl || `https://gitlab.com/${formData.gitlabGroupName}/${formData.proxyName}`);
      }, 1000);
      
    } catch (e: any) {
      setButtonAnimationPhase('idle');
      toast.error(e?.message || 'Failed pushing proxy to GitLab');
    } finally {
      setIsLoading(false);
    }
  };

  // Token validation was previously mocked; removed per product requirements.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configuration saved');
  };

  const onFetchProxyMeta = async () => {
    if (!apigeeOrg) {
      toast.error('Select Apigee organization');
      return;
    }
    if (!formData.apigeeToken) {
      toast.error('Provide Apigee token');
      return;
    }
    if (!formData.proxyName) {
      toast.error('Enter proxy name');
      return;
    }
    try {
      setIsFetching(true);
      setProxyCheckStatus('checking');
      
      const response = await checkProxyExists(apigeeOrg, formData.proxyName, formData.apigeeToken);
      
      if (response.exists) {
        setProxyCheckStatus('found');
        // Use real data from backend
        setAvailableRevisions(response.revisions || []);
        setDeploymentInfo(response.deployments || []);
        toast.success(`Proxy ${formData.proxyName} found in ${apigeeOrg}`);
      } else {
        setProxyCheckStatus('not_found');
        setAvailableRevisions([]);
        setDeploymentInfo([]);
        toast.error(`Proxy ${formData.proxyName} not found in ${apigeeOrg}`);
      }
    } catch (e: any) {
      console.error('Proxy check error:', e);
      setProxyCheckStatus('error');
      toast.error(e?.message || 'Failed to check proxy existence');
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <GitBranch className="h-5 w-5 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Export Apigee Proxy to GitLab
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Select Apigee org, then push the proxy bundle to GitLab
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-orange-50 border-b" style={{background: 'linear-gradient(to right, #E8F0FE, #FFF5F0)'}}>
            <CardTitle className="flex items-center gap-2">
              <span style={{color: '#4285F4'}}>Apigee</span>
              <span className="text-gray-400">→</span>
              <span style={{color: '#FC6D26'}}>GitLab</span>
              <span className="text-gray-600">Configuration</span>
            </CardTitle>
            <CardDescription>
              Provide Apigee source and GitLab target details
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* GitLab Target */}
              <div className="space-y-4 p-4 rounded-lg" style={{backgroundColor: '#FFF5F0', border: '1px solid #FC6D26'}}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#FC6D26'}}></div>
                  <h3 className="text-lg font-semibold" style={{color: '#FC6D26'}}>GitLab Target</h3>
                </div>
                {/* Row 1: Access Token + Group Name */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">GitLab Access Token *</label>
                    <Input 
                      name="gitlabAccessToken" 
                      type="password" 
                      placeholder="Enter GitLab personal access token" 
                      value={formData.gitlabAccessToken} 
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Group Name *</label>
                    <Input name="gitlabGroupName" placeholder="e.g. apigee-proxies" value={formData.gitlabGroupName} onChange={handleChange} />
                  </div>
                </div>

                {/* Row 2: Branch/Tag + Template */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Branch/Tag</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select
                          value={formData.gitRef}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, gitRef: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch or tag" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="master">master</SelectItem>
                            <SelectItem value="main">main</SelectItem>
                            <SelectItem value="other">Other…</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.gitRef === 'other' && (
                        <div className="flex-1">
                          <Input
                            name="customGitRef"
                            placeholder="Enter branch or tag"
                            value={formData.customGitRef}
                            onChange={handleChange}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Template</label>
                    <Select
                      value={formData.template}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, template: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apigee-cicd">Apigee CI/CD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Environment Selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">GitLab Environments</label>
                    <div className="grid gap-3 md:grid-cols-3">
                      {['dev', 'uat-public', 'uat-internal'].map((env) => (
                        <div key={env} className="flex items-center space-x-2">
                          <Checkbox
                            id={env}
                            checked={selectedEnvironments.includes(env)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedEnvironments(prev => [...prev, env]);
                              } else {
                                setSelectedEnvironments(prev => prev.filter(e => e !== env));
                              }
                            }}
                          />
                          <label
                            htmlFor={env}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {env}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">Select environments to deploy to GitLab</p>
                  </div>
                </div>
              </div>

              {/* Apigee Source */}
              <div className="space-y-4 p-4 rounded-lg" style={{backgroundColor: '#E8F0FE', border: '1px solid #4285F4'}}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#4285F4'}}></div>
                  <h3 className="text-lg font-semibold" style={{color: '#4285F4'}}>Apigee Source</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Apigee Organization *</label>
                    <Select value={apigeeOrg} onValueChange={setApigeeOrg}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Apigee organization" />
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
                    <label className="text-sm font-medium text-gray-700">Apigee Token *</label>
                    <Input 
                      name="apigeeToken" 
                      type="password" 
                      placeholder="Enter Apigee token" 
                      value={formData.apigeeToken} 
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Proxy Revision *</label>
                    {availableRevisions.length > 0 ? (
                      <Select
                        value={formData.revision}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, revision: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select revision" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRevisions.map((revision) => (
                            <SelectItem key={revision} value={revision}>
                              Revision {revision}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input name="revision" placeholder="e.g. 5" value={formData.revision} onChange={handleChange} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Proxy Name *</label>
                    <div className="flex items-center gap-2">
                      <Input name="proxyName" placeholder="Existing proxy in Apigee" value={formData.proxyName} onChange={handleChange} />
                      <Button
                        type="button"
                        size="sm"
                        onClick={onFetchProxyMeta}
                        disabled={isFetching}
                        className="bg-blue-300 text-blue-900 hover:bg-blue-400 active:bg-blue-500 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {isFetching ? 'Fetching…' : 'Fetch'}
                      </Button>
                      {proxyCheckStatus !== 'idle' && proxyCheckStatus !== 'checking' && (
                        <Badge
                          variant="secondary"
                          className={
                            proxyCheckStatus === 'found'
                              ? 'bg-green-100 text-green-800'
                              : proxyCheckStatus === 'not_found'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }
                        >
                          {proxyCheckStatus === 'found' && 'Found'}
                          {proxyCheckStatus === 'not_found' && 'Not Found'}
                          {proxyCheckStatus === 'error' && 'Error'}
                          {proxyCheckStatus === 'unknown' && 'Unknown'}
                        </Badge>
                      )}
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
                            <TableHead className="w-1/2" style={{color: '#4285F4'}}>Environment</TableHead>
                            <TableHead className="w-1/2" style={{color: '#4285F4'}}>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deploymentInfo.map((deployment, index) => (
                            <TableRow key={index} style={{backgroundColor: 'rgba(232, 240, 254, 0.3)'}}>
                              <TableCell className="font-medium">{deployment.environment}</TableCell>
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
              </div>

              {/* Single Action */}
              <div className="pt-4 border-t">
                <motion.div
                  animate={{
                    scale: buttonAnimationPhase === 'phase1' ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut"
                  }}
                >
                  <Button
                    type="button"
                    onClick={onPushProxyToGitlab}
                    disabled={isLoading}
                    className={`w-full font-semibold focus:outline-none focus:ring-2 py-3 text-lg transition-all duration-300 ${
                      buttonAnimationPhase === 'phase1' || buttonAnimationPhase === 'phase2'
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-blue-300 text-blue-900 hover:bg-blue-400 active:bg-blue-500 focus:ring-blue-400'
                    }`}
                  >
                    {buttonAnimationPhase === 'phase1' || buttonAnimationPhase === 'phase2' ? (
                      <>
                        ✓ Created!
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    ) : (
                      <>
                        Create File
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Success Card */}
        {showSuccessCard && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-6"
          >
            <Card className="shadow-lg border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">Success!</h3>
                    <p className="text-green-600">Proxy successfully pushed to GitLab</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-green-700">GitLab Project URL:</label>
                    <div className="mt-1 p-3 bg-white border border-green-200 rounded-lg">
                      <a 
                        href={gitlabProjectUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        {gitlabProjectUrl}
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setShowSuccessCard(false);
                        setButtonAnimationPhase('idle');
                      }}
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-100"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => window.open(gitlabProjectUrl, '_blank')}
                      className="bg-green-500 text-white hover:bg-green-600"
                    >
                      Open in GitLab
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Gitlab;
