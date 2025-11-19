
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchProxies } from '@/services/api';

const organizations = [
  { id: 1, name: 'apigee-prod-ouax' },
  { id: 2, name: 'apigee-non-prod-crjb' },
];

const ListProxies = () => {
  const [selectedOrg, setSelectedOrg] = useState("");
  const [token, setToken] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [proxies, setProxies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      const orgName = organizations.find(org => org.id.toString() === selectedOrg)?.name || selectedOrg;
      const fetchedProxies = await fetchProxies(orgName, token);

      // Handle different response formats from Apigee API
      // Apigee API can return either an array of strings (proxy names) or array of objects
      let proxyList: any[] = [];
      
      if (Array.isArray(fetchedProxies)) {
        if (fetchedProxies.length > 0 && typeof fetchedProxies[0] === 'string') {
          // If it's an array of strings, convert to objects
          proxyList = fetchedProxies.map((name: string, index: number) => ({
            id: index + 1,
            name: name,
            type: 'REST', // Default type, can be enhanced if API provides more info
            environment: 'N/A', // Will need additional API call to get environment info
            status: 'Active', // Default status
          }));
        } else if (fetchedProxies.length > 0 && typeof fetchedProxies[0] === 'object') {
          // If it's already an array of objects, use as is
          proxyList = fetchedProxies.map((proxy: any, index: number) => ({
            id: index + 1,
            name: proxy.name || proxy,
            type: proxy.type || 'REST',
            environment: proxy.environment || 'N/A',
            status: proxy.status || 'Active',
          }));
        }
      } else if (fetchedProxies && typeof fetchedProxies === 'object') {
        // Handle case where response might be wrapped in a data property
        const data = (fetchedProxies as any).data || (fetchedProxies as any).proxies || [];
        if (Array.isArray(data)) {
          proxyList = data.map((item: any, index: number) => ({
            id: index + 1,
            name: typeof item === 'string' ? item : (item.name || item),
            type: item.type || 'REST',
            environment: item.environment || 'N/A',
            status: item.status || 'Active',
          }));
        }
      }

      // Apply search filter if search term is provided
      const filteredProxies = searchTerm 
        ? proxyList.filter(proxy => 
            proxy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (proxy.type && proxy.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (proxy.environment && proxy.environment.toLowerCase().includes(searchTerm.toLowerCase()))
          )
        : proxyList;

      setProxies(filteredProxies);
      
      if (filteredProxies.length === 0 && searchTerm) {
        toast.info('No proxies match your search criteria');
      } else if (filteredProxies.length === 0) {
        toast.info('No proxies found for the selected organization');
      } else {
        toast.success(`Found ${filteredProxies.length} proxies`);
      }
    } catch (error: any) {
      console.error('Error fetching proxies:', error);
      toast.error(error.message || 'Failed to fetch proxies');
      setProxies([]);
    } finally {
      setIsLoading(false);
    }
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
                  placeholder="Search by name, type, or environment"
                  className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 mt-4">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <strong>Note:</strong> Authentication token is required to fetch real proxy data from Apigee.
            </div>
          </div>
          
          <div className="mt-6">
            <Button 
              onClick={handleSearch}
              disabled={isLoading || !selectedOrg || !token}
              className="bg-navy hover:bg-navy-200 transition-colors duration-300"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Proxies...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Proxies
                </>
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
