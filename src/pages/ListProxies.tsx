import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Search, RefreshCw, Package, AlertCircle, Globe } from 'lucide-react';
import { getAllProxiesFromOrganization } from '@/services/api';

const organizations = [
  { id: 1, name: 'apigee-prod-ouax' },
  { id: 2, name: 'apigee-non-prod-crjb' },
];

const ListProxies = () => {
  const [selectedOrg, setSelectedOrg] = useState("");
  const [token, setToken] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [allProxies, setAllProxies] = useState([]); // Store all fetched proxies
  const [isLoading, setIsLoading] = useState(false);

  // Real-time filtered proxies based on search term
  const filteredProxies = useMemo(() => {
    if (!searchTerm.trim()) return allProxies;
    
    return allProxies.filter(proxy => 
      proxy.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allProxies, searchTerm]);

  const getOrgName = (orgId) => {
    return organizations.find(org => org.id.toString() === orgId)?.name || 'Unknown';
  };

  const handleFetchProxies = async () => {
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
      console.log('Fetching proxies for:', {
        orgId: selectedOrg,
        token: token.substring(0, 20) + '...'
      });

      const orgName = organizations.find(org => org.id.toString() === selectedOrg)?.name || selectedOrg;
      const fetchedProxies = await getAllProxiesFromOrganization(orgName, token);

      // Debug: Log what we received
      console.log('Raw fetched proxies:', fetchedProxies);
      
      if (fetchedProxies.length > 0) {
        console.log('Sample proxy data:', fetchedProxies[0]);
        
        // Show success message
        toast.success(
          `Found ${fetchedProxies.length} proxies in ${orgName}!`,
          { duration: 4000 }
        );
      }

      setAllProxies(fetchedProxies);
      
      if (fetchedProxies.length === 0) {
        toast.info('No proxies found for the selected organization');
      }
      
    } catch (error) {
      console.error('Error fetching proxies:', error);
      toast.error(error.message || 'Failed to fetch proxies');
      setAllProxies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderProxyTable = (proxiesToShow) => (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead className="font-semibold">Proxy Name</TableHead>
          <TableHead className="font-semibold">Organization</TableHead>
          <TableHead className="font-semibold">ID</TableHead>
          <TableHead className="font-semibold">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {proxiesToShow.map((proxy) => (
          <TableRow 
            key={proxy.id}
            className="hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                {proxy.name}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-green-600" />
                {proxy.orgId}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                ID: {proxy.id}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge className="bg-green-100 text-green-800">
                Active
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

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
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Proxy Search
          </CardTitle>
          <CardDescription>
            Search for proxies across your Apigee organizations using real API data
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
              {token && (
                <Badge variant="secondary" className="text-xs">
                  ✓ Token provided
                </Badge>
              )}
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
                  placeholder="Search by proxy name"
                  className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Authentication Required Note */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 mt-4">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <strong>Note:</strong> Authentication token is required to fetch real proxy data from Apigee.
            </div>
          </div>
          
          <div className="mt-6">
            <Button 
              onClick={handleFetchProxies}
              disabled={isLoading || !selectedOrg || !token}
              className="bg-blue-600 hover:bg-blue-700 transition-colors duration-300"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Proxies...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Fetch Proxies
                </>
              )}
            </Button>
          </div>

          {/* Results Section */}
          {allProxies.length > 0 && (
            <div className="mt-6">
              <div className="mb-4 text-sm text-gray-600 flex items-center justify-between">
                <span>
                  Found {allProxies.length} proxies in {getOrgName(selectedOrg)}
                  {searchTerm && ` (${filteredProxies.length} matching "${searchTerm}")`}
                </span>
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear search
                  </Button>
                )}
              </div>
              
              {renderProxyTable(filteredProxies)}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ListProxies;
