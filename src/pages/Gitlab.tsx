import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  GitBranch,
  ArrowRight,
} from 'lucide-react';

import { pushProxyToGitlab } from '@/services/api';

// Static options for Apigee orgs; adjust as needed
const organizations = [
  { id: 1, name: 'apigee-prod-ouax', type: 'Production' },
  { id: 2, name: 'apigee-non-prod-crjb', type: 'Non-Production' },
];

const Gitlab: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Apigee selections
  const [apigeeOrg, setApigeeOrg] = useState("");

  // Form fields for Apigee → GitLab
  const [formData, setFormData] = useState({
    gitlabGroupName: '',
    gitlabAccessToken: '',
    gitRef: 'master',
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
    try {
      setIsLoading(true);
      // Simulate backend operation for now
      const payload = {
        sourceOrg: apigeeOrg,
        sourceToken: formData.apigeeToken,
        proxyName: formData.proxyName,
        revision: formData.revision,
        gitToken: formData.gitlabAccessToken,
        branch: formData.gitRef || 'master', // default branch if empty
      };
      const response = await pushProxyToGitlab(payload); 
      toast.success(`Proxy ${formData.proxyName} pushed successfully`);
      
    } catch (e: any) {
      toast.error(e?.message || 'Failed pushing proxy to GitLab');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configuration saved');
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
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="flex items-center gap-2">
              Apigee → GitLab Configuration
            </CardTitle>
            <CardDescription>
              Provide Apigee source and GitLab target details
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* GitLab Target */}
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">GitLab Access Token *</label>
                    <Input name="gitlabAccessToken" type="password" placeholder="Enter GitLab personal access token" value={formData.gitlabAccessToken} onChange={handleChange} />
                    {formData.gitlabAccessToken && (<Badge variant="secondary" className="text-xs">✓ Token provided</Badge>)}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Branch/Tag</label>
                    <Input name="gitRef" placeholder="master" value={formData.gitRef} onChange={handleChange} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Group Name *</label>
                    <Input name="gitlabGroupName" placeholder="e.g. apigee-proxies" value={formData.gitlabGroupName} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* Apigee Source */}
              <div className="space-y-4">
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
                    <Input name="apigeeToken" type="password" placeholder="Enter Apigee token" value={formData.apigeeToken} onChange={handleChange} />
                    {formData.apigeeToken && (<Badge variant="secondary" className="text-xs">✓ Token provided</Badge>)}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Proxy Revision *</label>
                    <Input name="revision" placeholder="e.g. 5" value={formData.revision} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Proxy Name *</label>
                    <Input name="proxyName" placeholder="Existing proxy in Apigee" value={formData.proxyName} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* Single Action */}
              <div className="pt-4 border-t">
                <Button type="button" onClick={onPushProxyToGitlab} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium">
                  Create File
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Gitlab;
