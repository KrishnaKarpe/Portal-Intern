
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Search, RefreshCw } from 'lucide-react';

const organizations = [
  { id: 1, name: 'apigee-prod-ouax' },
  { id: 2, name: 'apigee-non-prod-crjb' },
 
];

// Mock data for proxies
const mockProxies = [
  { id: 1, name: 'API Gateway Proxy', type: 'REST', environment: 'Production', status: 'Active', orgId: 1 },
  { id: 2, name: 'Mobile API Proxy', type: 'REST', environment: 'Testing', status: 'Active', orgId: 1 },
  { id: 3, name: 'Legacy System Proxy', type: 'SOAP', environment: 'Production', status: 'Inactive', orgId: 2 },
  { id: 4, name: 'Partner Integration', type: 'GraphQL', environment: 'Development', status: 'Active', orgId: 3 },
  { id: 5, name: 'Internal API', type: 'REST', environment: 'Production', status: 'Active', orgId: 4 },
];

const ListProxies = () => {
  const [selectedOrg, setSelectedOrg] = useState("");
  const [token, setToken] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [proxies, setProxies] = useState<typeof mockProxies>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = () => {
    if (!selectedOrg) {
      toast.error('Please select an organization');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const orgId = parseInt(selectedOrg);
      const filteredProxies = mockProxies
        .filter(proxy => proxy.orgId === orgId)
        .filter(proxy => 
          proxy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          proxy.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          proxy.environment.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
      setProxies(filteredProxies);
      setIsLoading(false);
      
      if (filteredProxies.length === 0 && searchTerm) {
        toast.info('No proxies match your search criteria');
      } else if (filteredProxies.length === 0) {
        toast.info('No proxies found for the selected organization');
      } else {
        toast.success(`Found ${filteredProxies.length} proxies`);
      }
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center">
        <h1 className="text-3xl font-bold">List All Proxies</h1>
      </div>
      
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="bg-white border-b">
          <CardTitle>Proxy Search</CardTitle>
          <CardDescription>
            Search for proxies across your organizations
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
                  placeholder="Search by name, type, or environment"
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
                'Search Proxies'
              )}
            </Button>
          </div>
          
          {proxies.length > 0 && (
            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proxies.map((proxy) => (
                    <TableRow 
                      key={proxy.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <TableCell className="font-medium">{proxy.name}</TableCell>
                      <TableCell>{proxy.type}</TableCell>
                      <TableCell>{proxy.environment}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          proxy.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {proxy.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ListProxies;
