import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cloneProduct as apiCloneProduct } from '@/services/api';
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

const availableEnvironments = [
  { id: 1, name: 'apim-dev', type: 'Development' },
  { id: 2, name: 'apim-uat-internal', type: 'UAT Internal' },
  { id: 3, name: 'apim-uat-public', type: 'UAT Public' },
];

const CloneProduct = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [sourceOrg, setSourceOrg] = useState("");
  const [targetOrg, setTargetOrg] = useState("");
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    sourceToken: '',
    targetToken: '',
    productName: '',
    newProductName: '',
    newDisplayName: '',
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEnvironmentSelect = (environmentName: string) => {
    if (!selectedEnvironments.includes(environmentName)) {
      setSelectedEnvironments([...selectedEnvironments, environmentName]);
    }
  };

  const handleEnvironmentRemove = (environmentName: string) => {
    setSelectedEnvironments(selectedEnvironments.filter(env => env !== environmentName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!sourceOrg || !targetOrg) {
      toast.error('Please select both source and target organizations');
      return;
    }
    
    if (!formData.productName || !formData.newProductName) {
      toast.error('Product name fields are required');
      return;
    }

    if (!formData.sourceToken || !formData.targetToken) {
      toast.error('Both authentication tokens are required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await apiCloneProduct({
        sourceOrg,
        targetOrg,
        sourceToken: formData.sourceToken,
        targetToken: formData.targetToken,
        productName: formData.productName,
        newProductName: formData.newProductName,
        newDisplayName: formData.newDisplayName,
        description: formData.description,
        environments: selectedEnvironments
      });

      if (response.success) {
        toast.success('Product successfully cloned!');
        navigate('/clone-success', {
          state: {
            productData: response.data,
            sourceOrg,
            targetOrg,
            originalProductName: formData.productName,
            newProductName: formData.newProductName
          }
        });
      } else {
        toast.error(response.message || 'Failed to clone product');
      }
    } catch (error) {
      console.error('Error cloning product:', error);
      toast.error(error.message || 'Failed to clone product');
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
            <div className="p-3 bg-blue-600 rounded-lg text-white">
              <Copy size={24} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Clone Product Across Organizations
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Duplicate API products between Apigee organizations with custom configurations
          </p>
        </div>

        {/* Main Form */}
        <Card className="shadow-lg">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Product Cloning Configuration
            </CardTitle>
            <CardDescription>
              Fill in the details below to clone your API product
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

                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <strong>Security Note:</strong> Tokens are used for authentication only and are not stored.
                  </div>
                </div>
              </div>

              {/* Product Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Product Details</h3>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Existing Product Name *
                    </label>
                    <Input
                      name="productName"
                      placeholder="Enter existing product name"
                      value={formData.productName}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      New Product Name *
                    </label>
                    <Input
                      name="newProductName"
                      placeholder="Enter new product name"
                      value={formData.newProductName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Display Name
                  </label>
                  <Input
                    name="newDisplayName"
                    placeholder="Enter display name (optional)"
                    value={formData.newDisplayName}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <Textarea
                    name="description"
                    placeholder="Enter product description (optional)"
                    value={formData.description}
                    onChange={handleChange}
                    className="min-h-[80px] resize-none"
                  />
                </div>

                {/* Updated Environments Section */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Environments
                  </label>
                  
                  <Select onValueChange={handleEnvironmentSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select environments to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEnvironments
                        .filter(env => !selectedEnvironments.includes(env.name))
                        .map((env) => (
                          <SelectItem key={env.id} value={env.name}>
                            <div>
                              <div className="font-medium">{env.name}</div>
                              <div className="text-xs text-gray-500">{env.type}</div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {/* Selected Environments Display */}
                  {selectedEnvironments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600">Selected environments:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEnvironments.map((envName) => {
                          const env = availableEnvironments.find(e => e.name === envName);
                          return (
                            <Badge 
                              key={envName} 
                              variant="outline" 
                              className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200"
                            >
                              <span>{envName}</span>
                              <button
                                type="button"
                                onClick={() => handleEnvironmentRemove(envName)}
                                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                              >
                                <X size={12} />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Select one or more environments for your cloned product
                  </p>
                </div>
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
                      Cloning Product...
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-5 w-5" />
                      Clone Product
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
              description: "Clone products in seconds"
            },
            {
              icon: Package,
              title: "Flexible",
              description: "Customize product settings"
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

export default CloneProduct;
