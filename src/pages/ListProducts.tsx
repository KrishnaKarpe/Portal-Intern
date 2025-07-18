
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Search, RefreshCw, Eye } from 'lucide-react';

const organizations = [
  { id: 1, name: 'apigee-prod-ouax' },
  { id: 2, name: 'apigee-non-prod-crjb' },
 
];

// Mock data for products
const mockProducts = [
  { id: 1, name: 'API Management', displayName: 'API Management Platform', status: 'Published', apiCount: 12, orgId: 1 },
  { id: 2, name: 'Developer Portal', displayName: 'Developer Experience Portal', status: 'Published', apiCount: 8, orgId: 1 },
  { id: 3, name: 'Analytics Suite', displayName: 'API Analytics Suite', status: 'Draft', apiCount: 5, orgId: 2 },
  { id: 4, name: 'Security Gateway', displayName: 'API Security Gateway', status: 'Published', apiCount: 15, orgId: 3 },
  { id: 5, name: 'Integration Hub', displayName: 'Enterprise Integration Hub', status: 'Draft', apiCount: 3, orgId: 4 },
  { id: 6, name: 'API Designer', displayName: 'API Designer Pro', status: 'Published', apiCount: 0, orgId: 4 },
  { id: 7, name: 'Monitoring Tools', displayName: 'API Monitoring Suite', status: 'Published', apiCount: 7, orgId: 5 },
];

const ListProducts = () => {
  const [selectedOrg, setSelectedOrg] = useState("");
  const [token, setToken] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<typeof mockProducts>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const handleSearch = () => {
    if (!selectedOrg) {
      toast.error('Please select an organization');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const orgId = parseInt(selectedOrg);
      let filteredProducts = mockProducts
        .filter(product => product.orgId === orgId)
        .filter(product => 
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.displayName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
      if (activeTab === "published") {
        filteredProducts = filteredProducts.filter(product => product.status === "Published");
      } else if (activeTab === "draft") {
        filteredProducts = filteredProducts.filter(product => product.status === "Draft");
      }
      
      setProducts(filteredProducts);
      setIsLoading(false);
      
      if (filteredProducts.length === 0 && searchTerm) {
        toast.info('No products match your search criteria');
      } else if (filteredProducts.length === 0) {
        toast.info('No products found for the selected organization');
      } else {
        toast.success(`Found ${filteredProducts.length} products`);
      }
    }, 1000);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (selectedOrg) {
      handleSearch();
    }
  };

  const viewProduct = (productId: number) => {
    toast.info(`Viewing product details for ID: ${productId}`);
    // In a real application, this would navigate to a product detail page
    console.log(`View product details for ID: ${productId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center">
        <h1 className="text-3xl font-bold">List All Products</h1>
      </div>
      
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="bg-white border-b">
          <CardTitle>Product Search</CardTitle>
          <CardDescription>
            Search and browse products across your organizations
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-3">
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
              <label htmlFor="token" className="text-sm font-medium">
                Authorization Token
              </label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter authorization token"
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="search" className="text-sm font-medium">
                Search Term
              </label>
              <div className="relative">
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or display name"
                  className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Button 
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-navy hover:bg-navy-200 transition-colors duration-300"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search Products'
              )}
            </Button>
          </div>
          
          {products.length > 0 && (
            <div className="mt-6">
              <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All Products</TabsTrigger>
                  <TabsTrigger value="published">Published</TabsTrigger>
                  <TabsTrigger value="draft">Draft</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Display Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>API Count</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow 
                          key={product.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.displayName}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              product.status === 'Published' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {product.status}
                            </span>
                          </TableCell>
                          <TableCell>{product.apiCount}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewProduct(product.id)}
                              className="hover:bg-navy hover:text-white transition-colors"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                <TabsContent value="published" className="mt-0">
                  {/* Same table structure but filtered for published products */}
                </TabsContent>
                
                <TabsContent value="draft" className="mt-0">
                  {/* Same table structure but filtered for draft products */}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ListProducts;
