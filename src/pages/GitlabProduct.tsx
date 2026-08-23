import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Package, ArrowRight, Loader2 } from 'lucide-react';

import {
  getAllProductsFromOrganization,
  getProductForView,
  pushProductToGitlab,
} from '@/services/api';

const organizations = [
  { id: 1, name: 'apigee-prod-ouax', type: 'Production' },
  { id: 2, name: 'apigee-non-prod-crjb', type: 'Non-Production' },
];

type ProductDetail = {
  displayName?: string;
  description?: string;
  environments?: string[];
  approvalType?: string;
  attributes?: { name: string; value: string }[];
  apiResources?: string[];
  scopes?: string[];
  apiOperations?: {
    apiSource?: string;
    operations?: {
      resource?: string;
      methods?: string[];
    }[];
  }[];
};

const GitlabProduct: React.FC = () => {
  const [apigeeOrg, setApigeeOrg] = useState('');
  const [formData, setFormData] = useState({
    apigeeToken: '',
    productName: '',
    gitlabAccessToken: '',
    gitlabGroupName: '',
    gitRef: 'dev',
    template: 'apigee-product-cicd',
  });
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([
    'prod',
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [buttonAnimationPhase, setButtonAnimationPhase] = useState<
    'idle' | 'phase1' | 'phase2' | 'phase3'
  >('idle');
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [gitlabProjectUrl, setGitlabProjectUrl] = useState('');
  const [gitUsername, setGitUsername] = useState('');
  const [pushedAt, setPushedAt] = useState<string>('');

  const [allProducts, setAllProducts] = useState<string[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [productDetails, setProductDetails] = useState<ProductDetail | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  useEffect(() => {
    let active = true;
    if (!apigeeOrg || !formData.apigeeToken) {
      setAllProducts([]);
      setProductSuggestions([]);
      return;
    }

    const fetchProducts = async () => {
      try {
        setIsFetchingProducts(true);
        const products = await getAllProductsFromOrganization(
          apigeeOrg,
          formData.apigeeToken
        );
        if (!active) return;
        const names =
          Array.isArray(products) && products.length
            ? products.map((product) => product.name).filter(Boolean)
            : [];
        setAllProducts(names);
        setProductSuggestions(names);
      } catch (error: any) {
        if (!active) return;
        toast.error(error.message || 'Failed to fetch products');
        setAllProducts([]);
        setProductSuggestions([]);
      } finally {
        if (active) {
          setIsFetchingProducts(false);
        }
      }
    };

    fetchProducts();

    return () => {
      active = false;
    };
  }, [apigeeOrg, formData.apigeeToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProductNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, productName: value }));
    if (!value) {
      setShowProductSuggestions(false);
      return;
    }

    const filtered = allProducts.filter((name) =>
      name.toLowerCase().includes(value.toLowerCase())
    );
    setProductSuggestions(filtered);
    setShowProductSuggestions(true);
  };

  const loadProductDetails = async () => {
    if (!apigeeOrg || !formData.apigeeToken || !formData.productName) {
      toast.error('Provide org, token, and product first');
      return;
    }

    try {
      setIsFetchingDetails(true);
      const details = await getProductForView(
        apigeeOrg,
        formData.productName,
        formData.apigeeToken
      );
      setProductDetails(details);
      toast.success('Product details loaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch product');
      setProductDetails(null);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const productAttributes = useMemo(() => {
    if (!productDetails?.attributes) return [];
    return productDetails.attributes.filter(
      (attr): attr is { name: string; value: string } =>
        Boolean(attr?.name && attr?.value)
    );
  }, [productDetails]);

  const onPushProductToGitlab = async () => {
    if (!apigeeOrg) {
      toast.error('Select Apigee organization');
      return;
    }
    if (!formData.apigeeToken || !formData.productName) {
      toast.error('Provide Apigee token and product name');
      return;
    }
    if (!formData.gitlabAccessToken || !formData.gitlabGroupName) {
      toast.error('Provide GitLab token and group name');
      return;
    }
    try {
      setIsLoading(true);
      setButtonAnimationPhase('phase1');

      const payload = {
        sourceOrg: apigeeOrg,
        sourceToken: formData.apigeeToken,
        productName: formData.productName,
        gitToken: formData.gitlabAccessToken,
        gitlabGroupName: formData.gitlabGroupName,
        branch: formData.gitRef,
        template: formData.template,
        environments: selectedEnvironments,
      };

      await new Promise((resolve) => setTimeout(resolve, 600));
      const response = await pushProductToGitlab(payload);

      setButtonAnimationPhase('phase2');
      const gitUrl = response.projectUrl;
      setGitUsername(response.username || 'unknown');

      setTimeout(() => {
        setButtonAnimationPhase('phase3');
        setShowSuccessCard(true);
        setGitlabProjectUrl(gitUrl);
        setPushedAt(new Date().toLocaleString());
      }, 800);
    } catch (error: any) {
      setButtonAnimationPhase('idle');
      toast.error(error.message || 'Failed pushing product to GitLab');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
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
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Package className="h-5 w-5 text-amber-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Export Apigee Product to GitLab
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Select an Apigee product, inspect its metadata, and bootstrap a
            GitLab repo with the product contract.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader
            className="bg-gradient-to-r from-blue-50 to-orange-50 border-b"
            style={{ background: 'linear-gradient(to right, #E8F0FE, #FFF5F0)' }}
          >
            <CardTitle className="flex items-center gap-2">
              <span style={{ color: '#4285F4' }}>Apigee</span>
              <span className="text-gray-400">→</span>
              <span style={{ color: '#FC6D26' }}>GitLab</span>
              <span className="text-gray-600">Product workflow</span>
            </CardTitle>
            <CardDescription>
              Provide Apigee source details and target GitLab configuration
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div
                className="space-y-4 p-4 rounded-lg"
                style={{ backgroundColor: '#E8F0FE', border: '1px solid #4285F4' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#4285F4' }}
                  ></div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: '#4285F4' }}
                  >
                    Apigee Product
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Apigee Organization *
                    </label>
                    <Select value={apigeeOrg} onValueChange={setApigeeOrg}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
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
                      Apigee Token *
                    </label>
                    <Input
                      name="apigeeToken"
                      type="password"
                      placeholder="Enter Apigee token"
                      value={formData.apigeeToken}
                      onChange={handleChange}
                    />
                    {isFetchingProducts && (
                      <p className="text-xs text-blue-700">Fetching products…</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Product Name *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative w-full">
                      <Input
                        name="productName"
                        placeholder="Existing product in Apigee"
                        value={formData.productName}
                        onChange={handleProductNameChange}
                        onFocus={() => {
                          if (allProducts.length > 0) {
                            setProductSuggestions(allProducts);
                            setShowProductSuggestions(true);
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowProductSuggestions(false), 150)}
                      />
                      {showProductSuggestions && productSuggestions.length > 0 && (
                        <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 max-h-48 overflow-y-auto rounded-md shadow-lg">
                          {productSuggestions.map((name) => (
                            <li
                              key={name}
                              className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setFormData((prev) => ({ ...prev, productName: name }));
                                setShowProductSuggestions(false);
                              }}
                            >
                              {name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={loadProductDetails}
                      disabled={isFetchingDetails}
                      className="bg-blue-300 text-blue-900 hover:bg-blue-400 active:bg-blue-500 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {isFetchingDetails ? 'Loading…' : 'Inspect'}
                    </Button>
                  </div>
                </div>

                {productDetails && (
                  <div className="space-y-3 rounded-lg border border-blue-200 bg-white/70 p-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-700">
                        Product snapshot
                      </span>
                    </div>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="w-40 text-sm font-medium text-gray-600">
                            Display Name
                          </TableCell>
                          <TableCell className="text-gray-900">
                            {productDetails.displayName || '—'}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm font-medium text-gray-600">
                            Environments
                          </TableCell>
                          <TableCell className="text-gray-900">
                            {productDetails.environments &&
                              productDetails.environments.length > 0
                              ? productDetails.environments.join(', ')
                              : '—'}
                          </TableCell>
                        </TableRow>
                        {productDetails.apiResources && (
                          <TableRow>
                            <TableCell className="text-sm font-medium text-gray-600">
                              API Resources
                            </TableCell>
                            <TableCell className="text-gray-900">
                              {productDetails.apiResources.join(', ')}
                            </TableCell>
                          </TableRow>
                        )}
                        {productDetails.scopes && (
                          <TableRow>
                            <TableCell className="text-sm font-medium text-gray-600">
                              Scopes
                            </TableCell>
                            <TableCell className="text-gray-900">
                              {productDetails.scopes.join(', ')}
                            </TableCell>
                          </TableRow>
                        )}
                        {productDetails.apiOperations &&
                          productDetails.apiOperations.length > 0 &&
                          productDetails.apiOperations.map((op, opIndex) => (
                            <React.Fragment
                              key={`${op.apiSource || 'default'}-${opIndex}`}
                            >
                              <TableRow>
                                <TableCell className="text-sm font-medium text-gray-600">
                                  Api Source
                                </TableCell>
                                <TableCell className="text-gray-900">
                                  {op.apiSource || '—'}
                                </TableCell>
                              </TableRow>
                              {(op.operations && op.operations.length > 0
                                ? op.operations
                                : [{ resource: '/', methods: [] }]
                              ).map((operation, index) => (
                                <React.Fragment
                                  key={`${op.apiSource || 'default'}-${index}`}
                                >
                                  <TableRow>
                                    <TableCell className="text-sm font-medium text-gray-600">
                                      Resource
                                    </TableCell>
                                    <TableCell className="text-gray-900">
                                      {operation.resource || '/'}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell className="text-sm font-medium text-gray-600">
                                      Method
                                    </TableCell>
                                    <TableCell className="text-gray-900">
                                      {operation.methods &&
                                        operation.methods.length > 0
                                        ? operation.methods.join(', ')
                                        : '—'}
                                    </TableCell>
                                  </TableRow>
                                </React.Fragment>
                              ))}
                            </React.Fragment>
                          ))}
                      </TableBody>
                    </Table>
                    {productAttributes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {productAttributes.map((attr) => (
                          <Badge
                            key={attr.name}
                            variant="secondary"
                            className="bg-blue-50 text-blue-700"
                          >
                            {attr.name}: {attr.value}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div
                className="space-y-4 p-4 rounded-lg"
                style={{ backgroundColor: '#FFF5F0', border: '1px solid #FC6D26' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#FC6D26' }}
                  ></div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: '#FC6D26' }}
                  >
                    GitLab Target
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      GitLab Access Token *
                    </label>
                    <Input
                      name="gitlabAccessToken"
                      type="password"
                      placeholder="Enter personal access token"
                      value={formData.gitlabAccessToken}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Group Name *</label>
                    <Select
                      value={formData.gitlabGroupName}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, gitlabGroupName: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apigee-cicd">Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Group Name *</label>
                  <Select
                    value={formData.template}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, template: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apigee-cicd">Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div> */}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Branch
                    </label>
                    <Input value="dev" readOnly />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Template
                    </label>
                    <Select
                      value={formData.template}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, template: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apigee-product-cicd">
                          Apigee Product CI/CD
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    GitLab Environments
                  </label>
                  <div className="grid gap-3 md:grid-cols-3">
                    {['dev', 'uat-public', 'prod'].map((env) => (
                      <div key={env} className="flex items-center space-x-2">
                        <Checkbox
                          id={`product-${env}`}
                          checked={selectedEnvironments.includes(env)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEnvironments((prev) => [...prev, env]);
                            } else {
                              setSelectedEnvironments((prev) =>
                                prev.filter((value) => value !== env)
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={`product-${env}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {env}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Select the environments to enable in the generated GitLab
                    project.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <motion.div
                  animate={{
                    scale: buttonAnimationPhase === 'phase1' ? [1, 1.07, 1] : 1,
                  }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <Button
                    type="button"
                    onClick={onPushProductToGitlab}
                    disabled={isLoading}
                    className={`w-full font-semibold focus:outline-none focus:ring-2 py-3 text-lg transition-all duration-300 ${buttonAnimationPhase === 'phase2'
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400'
                      }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Pushing to GitLab...
                      </>
                    ) : buttonAnimationPhase === 'phase2' ? (
                      <>
                        ✓ Created!
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    ) : (
                      <>
                        Push product to GitLab
                        <GitBranch className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            </form>
          </CardContent>
        </Card>

        {showSuccessCard && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mt-6"
          >
            <Card className="shadow-xl shadow-green-200/60 border border-green-300 bg-green-50/80 rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">
                      Success!
                    </h3>
                    <p className="text-green-600">Product pushed to GitLab</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg overflow-hidden border border-green-300 bg-white shadow-md shadow-green-200/50">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium text-green-800 w-40">
                            Product
                          </TableCell>
                          <TableCell className="break-all text-green-900 border-l border-green-200">
                            {formData.productName || '-'}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-green-800">
                            Branch
                          </TableCell>
                          <TableCell className="break-all text-green-900 border-l border-green-200">
                            {formData.gitRef || '-'}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-green-800">
                            Pushed at
                          </TableCell>
                          <TableCell className="break-all text-green-900 border-l border-green-200">
                            {pushedAt || '-'}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-green-800">
                            Created by
                          </TableCell>
                          <TableCell className="break-all text-green-900 border-l border-green-200">
                            {gitUsername || 'unknown'}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-green-800">
                            Project
                          </TableCell>
                          <TableCell className="break-all border-l border-green-200">
                            {gitlabProjectUrl ? (
                              <a
                                href={gitlabProjectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {gitlabProjectUrl}
                              </a>
                            ) : (
                              <span className="text-green-900">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
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
    </div >
  );
};

export default GitlabProduct;

