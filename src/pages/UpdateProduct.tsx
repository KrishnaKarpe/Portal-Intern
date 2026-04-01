
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { 
  Key, 
  Package, 
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

const organizations = [
  { id: 1, name: 'apigee-prod-ouax', type: 'Production' },
  { id: 2, name: 'apigee-non-prod-crjb', type: 'Non-Production' },
];

const products = [
  { id: 1, name: 'Product A', orgId: 1 },
  { id: 2, name: 'Product B', orgId: 1 },
  { id: 3, name: 'Product C', orgId: 2 },
  { id: 4, name: 'Product D', orgId: 3 },
  { id: 5, name: 'Product E', orgId: 4 },
];

const UpdateProduct = () => {
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    token: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const filteredProducts = selectedOrg 
    ? products.filter(product => product.orgId === parseInt(selectedOrg))
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOrg || !selectedProduct) {
      toast.error('Please select both organization and product');
      return;
    }

    if (!formData.token) {
      toast.error('Authentication token is required');
      return;
    }
    
    if (!formData.name || !formData.displayName) {
      toast.error('Product name and display name are required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Product successfully updated!');
      console.log('Form submitted:', { ...formData, selectedOrg, selectedProduct });
    } catch (error) {
      toast.error('Failed to update product');
      console.error('Error updating product:', error);
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
            <h1 className="text-3xl font-bold text-gray-900">
              Update Product
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Modify existing product information in your API management platform
          </p>
        </div>

        {/* Main Form */}
        <Card className="shadow-lg">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Product Update Configuration
            </CardTitle>
            <CardDescription>
              Fill in the details below to update your product
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Organization & Product Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Product Selection</h3>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Organization *
                    </label>
                    <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
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
                      Product *
                    </label>
                    <Select 
                      value={selectedProduct} 
                      onValueChange={setSelectedProduct}
                      disabled={!selectedOrg}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedOrg ? "Select product" : "Select an organization first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedOrg && selectedProduct && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800 font-medium">
                      Product selected successfully
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
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Authorization Token *
                  </label>
                  <Input
                    name="token"
                    type="password"
                    placeholder="Enter authorization token"
                    value={formData.token}
                    onChange={handleChange}
                  />
                  {formData.token && (
                    <Badge variant="secondary" className="text-xs">
                      ✓ Token provided
                    </Badge>
                  )}
                </div>
              </div>

              {/* Product Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Product Details</h3>
                </div>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      New Product Name *
                    </label>
                    <Input
                      name="name"
                      placeholder="Enter new product name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      New Display Name *
                    </label>
                    <Input
                      name="displayName"
                      placeholder="Enter new display name"
                      value={formData.displayName}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      New Description
                    </label>
                    <Textarea
                      name="description"
                      placeholder="Enter new product description"
                      value={formData.description}
                      onChange={handleChange}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {isLoading ? 'Updating...' : 'Update Product'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default UpdateProduct;
