import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Search, RefreshCw, Eye, AlertCircle, Package, X, Code, Globe, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { getAllProductsFromOrganization, getProductForView } from '@/services/api';

const organizations = [
  { id: 1, name: 'apigee-prod-ouax' },
  { id: 2, name: 'apigee-non-prod-crjb' },
];

const ListProducts = () => {
  const [selectedOrg, setSelectedOrg] = useState("");
  const [token, setToken] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [expandedApiSources, setExpandedApiSources] = useState(new Set());

  // Add this debug function to see what we're receiving
  const handleSearch = async () => {
    if (!selectedOrg) {
      toast.error('Please select an organization');
      return;
    }

    if (!token) {
      toast.error('Please provide an authentication token');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Fetching products for:', {
        orgId: selectedOrg,
        token: token.substring(0, 20) + '...'
      });

      const orgName = organizations.find(org => org.id.toString() === selectedOrg)?.name || selectedOrg;
      const fetchedProducts = await getAllProductsFromOrganization(orgName, token);

      // Debug: Log what we received
      console.log('Raw fetched products:', fetchedProducts);
      console.log('Sample product:', fetchedProducts[0]);

      // Apply search filter if search term is provided
      const filteredProducts = searchTerm 
        ? fetchedProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
          )
        : fetchedProducts;

      // Debug: Check if products have descriptions and environments
      const productsWithDescription = filteredProducts.filter(p => p.description && p.description !== '');
      const productsWithEnvironments = filteredProducts.filter(p => p.environments && p.environments.length > 0);
      
      console.log(`Products with descriptions: ${productsWithDescription.length}/${filteredProducts.length}`);
      console.log(`Products with environments: ${productsWithEnvironments.length}/${filteredProducts.length}`);

      if (filteredProducts.length > 0) {
        console.log('First product sample:', {
          name: filteredProducts[0].name,
          description: filteredProducts[0].description,
          environments: filteredProducts[0].environments
        });
      }

      setProducts(filteredProducts);
      
      if (filteredProducts.length === 0 && searchTerm) {
        toast.info('No products match your search criteria');
      } else if (filteredProducts.length === 0) {
        toast.info('No products found for the selected organization');
      } else {
        toast.success(`Found ${filteredProducts.length} products (${productsWithDescription.length} with descriptions, ${productsWithEnvironments.length} with environments)`);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(error.message || 'Failed to fetch products');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProduct = async (product) => {
    if (!token || !selectedOrg) {
      toast.error('Token and organization are required');
      return;
    }

    setIsViewLoading(true);
    setIsViewDialogOpen(true);

    try {
      const orgName = organizations.find(org => org.id.toString() === selectedOrg)?.name || selectedOrg;
      
      console.log('Fetching detailed view for:', {
        orgId: orgName,
        productName: product.name,
        token: token.substring(0, 20) + '...'
      });

      const productDetails = await getProductForView(orgName, product.name, token);
      setViewingProduct(productDetails);
      
      // Reset expanded state when new product is loaded
      setExpandedApiSources(new Set());
      
      toast.success(`Loaded details for ${product.name}`);
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast.error(error.message || 'Failed to fetch product details');
      setIsViewDialogOpen(false);
    } finally {
      setIsViewLoading(false);
    }
  };

  const toggleApiSourceExpansion = (apiSource) => {
    const newExpanded = new Set(expandedApiSources);
    if (newExpanded.has(apiSource)) {
      newExpanded.delete(apiSource);
    } else {
      newExpanded.add(apiSource);
    }
    setExpandedApiSources(newExpanded);
  };

  const getOrgName = (orgId) => {
    const org = organizations.find(o => o.id.toString() === orgId.toString() || o.name === orgId);
    return org ? org.name : orgId;
  };

  const renderProductTable = (productsToShow) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Display Name</TableHead>
            {/* <TableHead>Description</TableHead>
            <TableHead>Environments</TableHead> */}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productsToShow.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                No products found
              </TableCell>
            </TableRow>
          ) : (
            productsToShow.map((product) => (
              <TableRow 
                key={`${product.orgId}-${product.name}`}
                className="hover:bg-gray-50 transition-colors"
              >
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.displayName}</TableCell>
                {/* <TableCell className="max-w-xs">
                  <div className="truncate" title={product.description}>
                    {product.description || 'No description'}
                  </div>
                </TableCell> */}
                {/* <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {product.environments && product.environments.length > 0 ? (
                      <>
                        {product.environments.slice(0, 3).map((env, index) => (
                          <Badge 
                            key={index}
                            variant="secondary"
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs"
                          >
                            {env}
                          </Badge>
                        ))}
                        {product.environments.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{product.environments.length - 3} more
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-500 text-xs">No environments</span>
                    )}
                  </div>
                </TableCell> */}
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewProduct(product)}
                    className="hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

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
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Product Search
          </CardTitle>
          <CardDescription>
            Search and browse API products across your Apigee organizations
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="selectedOrg" className="text-sm font-medium">
                Organization *
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
                Authorization Token *
              </label>
              <Input
                id="token"
                type="password"
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
                  placeholder="Search by name, display name, or description"
                  className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 mt-4">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <strong>Note:</strong> Authentication token is required to fetch real product data from Apigee.
            </div>
          </div>
          
          <div className="mt-6">
            <Button 
              onClick={handleSearch}
              disabled={isLoading || !selectedOrg || !token}
              className="bg-blue-600 hover:bg-blue-700 transition-colors duration-300"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Products...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Products
                </>
              )}
            </Button>
          </div>
          
          {products.length > 0 && (
            <div className="mt-6">
              <div className="mb-4 text-sm text-gray-600">
                Found {products.length} products in {getOrgName(selectedOrg)}
              </div>
              
              {renderProductTable(products)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Product Details
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsViewDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Detailed information about the selected API product
            </DialogDescription>
          </DialogHeader>
          
          {isViewLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading product details...</span>
            </div>
          ) : viewingProduct ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    Product Name
                  </label>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{viewingProduct.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                    Display Name
                  </label>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{viewingProduct.displayName}</p>
                </div>
              </div>

              {/* <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {viewingProduct.description || 'No description available'}
                </p>
              </div> */}

              {/* Environments */}
              {/* <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-3">
                  <Globe className="h-4 w-4" />
                  Environments ({viewingProduct.environments?.length || 0})
                </label>
                <div className="flex flex-wrap gap-2">
                  {viewingProduct.environments && viewingProduct.environments.length > 0 ? (
                    viewingProduct.environments.map((env, index) => (
                      <Badge 
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-800 text-sm"
                      >
                        <Globe className="h-3 w-3 mr-1" />
                        {env}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm bg-gray-100 px-3 py-1 rounded">
                      No environments configured
                    </span>
                  )}
                </div>
              </div> */}

              {/* API Operations - Grouped by API Source */}
              {viewingProduct.apiOperations && viewingProduct.apiOperations.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-4">
                    <Code className="h-4 w-4" />
                    API Operations ({viewingProduct.apiOperations.length} API Source{viewingProduct.apiOperations.length > 1 ? 's' : ''})
                  </label>
                  
                  <div className="space-y-4">
                    {viewingProduct.apiOperations.map((apiOp, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg">
                        {/* API Source Header */}
                        <div 
                          className="flex items-center justify-between p-3 bg-blue-50 border-b cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => toggleApiSourceExpansion(apiOp.apiSource)}
                        >
                          <div className="flex items-center gap-2">
                            <Code className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-blue-800">
                              {apiOp.apiSource || 'Unknown API Source'}
                            </span>
                            <Badge variant="secondary" className="bg-blue-200 text-blue-800 text-xs">
                              {apiOp.operations?.length || 0} operation{(apiOp.operations?.length || 0) !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          {expandedApiSources.has(apiOp.apiSource) ? (
                            <ChevronDown className="h-4 w-4 text-blue-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-blue-600" />
                          )}
                        </div>

                        {/* Expandable Operations Content */}
                        {expandedApiSources.has(apiOp.apiSource) && (
                          <div className="p-4 space-y-3">
                            {apiOp.operations && apiOp.operations.length > 0 ? (
                              apiOp.operations.map((operation, opIndex) => (
                                <div key={opIndex} className="bg-gray-50 p-3 rounded-md">
                                  <div className="flex items-start justify-between gap-4">
                                    {/* Resource */}
                                    <div className="flex-1">
                                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                        Resource
                                      </label>
                                      <p className="mt-1 text-sm font-mono bg-white p-2 rounded border">
                                        {operation.resource || 'No resource specified'}
                                      </p>
                                    </div>

                                    {/* Methods */}
                                    <div className="flex-1">
                                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                        Methods ({operation.methods?.length || 0})
                                      </label>
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {operation.methods && operation.methods.length > 0 ? (
                                          operation.methods.map((method, methodIndex) => {
                                            const methodColors = {
                                              'GET': 'bg-green-100 text-green-800 border-green-200',
                                              'POST': 'bg-blue-100 text-blue-800 border-blue-200',
                                              'PUT': 'bg-orange-100 text-orange-800 border-orange-200',
                                              'DELETE': 'bg-red-100 text-red-800 border-red-200',
                                              'PATCH': 'bg-purple-100 text-purple-800 border-purple-200'
                                            };
                                            
                                            return (
                                              <Badge 
                                                key={methodIndex}
                                                className={`px-2 py-1 text-xs font-semibold border ${methodColors[method] || 'bg-gray-100 text-gray-800 border-gray-200'}`}
                                              >
                                                {method}
                                              </Badge>
                                            );
                                          })
                                        ) : (
                                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            No methods specified
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
                                <Code className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm">No operations defined for this API source</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Data Message */}
              {(!viewingProduct.apiOperations || viewingProduct.apiOperations.length === 0) && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">No API operation configuration data available</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p>No product details available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
            {
              icon: Package,
              title: "Real-time Data",
              description: "Fetch live product data from Apigee"
            },
            {
              icon: Search,
              title: "Advanced Search",
              description: "Filter products by multiple criteria"
            },
            {
              icon: Eye,
              title: "Detailed View",
              description: "View comprehensive product information"
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
  );
};

export default ListProducts;
