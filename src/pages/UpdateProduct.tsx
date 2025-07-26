
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const organizations = [
  { id: 1, name: 'apigee-prod-ouax' },
  { id: 2, name: 'apigee-non-prod-crjb' },
 
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOrg || !selectedProduct) {
      toast.error('Please select both organization and product');
      return;
    }
    
    // Simulate API call
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: 'Updating product...',
        success: 'Product successfully updated!',
        error: 'Failed to update product',
      }
    );
    
    console.log('Form submitted:', { ...formData, selectedOrg, selectedProduct });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center">
        <h1 className="text-3xl font-bold">Update Product</h1>
      </div>
      
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="bg-white border-b">
          <CardTitle>Update Product Details</CardTitle>
          <CardDescription>
            Modify existing product information
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="selectedOrg" className="text-sm font-medium">
                  Organization
                </label>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger id="selectedOrg" className="w-full">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="selectedProduct" className="text-sm font-medium">
                  Product
                </label>
                <Select 
                  value={selectedProduct} 
                  onValueChange={setSelectedProduct}
                  disabled={!selectedOrg}
                >
                  <SelectTrigger id="selectedProduct" className="w-full">
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
            
            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium">
                Authorization Token
              </label>
              <Input
                id="token"
                name="token"
                placeholder="Enter authorization token"
                value={formData.token}
                onChange={handleChange}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                New Product Name
              </label>
              <Input
                id="name"
                name="name"
                placeholder="Enter new product name"
                value={formData.name}
                onChange={handleChange}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                New Display Name
              </label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="Enter new display name"
                value={formData.displayName}
                onChange={handleChange}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                New Description
              </label>
              <Textarea
                id="description"
                name="description"
                placeholder="Enter new product description"
                value={formData.description}
                onChange={handleChange}
                className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            <div className="pt-2">
              <Button 
                type="submit" 
                className="bg-navy hover:bg-navy-200 transition-colors duration-300"
              >
                Update Product
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UpdateProduct;
