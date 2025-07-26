/**
 * Product Service - All product operations in one place
 * Handles: clone, list, view products + API calls
 */

const axios = require('axios');

// ==================== API FUNCTIONS ====================

/**
 * Fetch a single product from an organization using Apigee API
 */
const fetchProductFromOrg = async (orgId, productName, token) => {
    console.log(`Fetching product ${productName} from organization ${orgId}`);

    if (!token || token.trim() === '') {
        throw new Error('Authentication token is required');
    }

    try {
        const response = await axios({
            method: 'GET',
            url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apiproducts/${productName}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log(`Successfully fetched product data for ${productName}`);
        const productData = response.data;
        console.log(`Product ${productName} details:`, {
            hasDescription: !!productData.description,
            descriptionLength: productData.description?.length || 0,
            hasEnvironments: !!productData.environments,
            environmentsCount: productData.environments?.length || 0,
            environments: productData.environments
        });

        return productData;
    } catch (error) {
        console.error(`Error fetching product ${productName}:`, error.message);

        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }

        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error?.message || error.message;

        const enhancedError = new Error(errorMessage);
        enhancedError.status = statusCode;
        enhancedError.details = error.response?.data;

        throw enhancedError;
    }
};

/**
 * Fetch all products from an organization using Apigee API with expand=true
 */
const fetchAllProductsFromOrg = async (orgId, token) => {
    console.log(`Fetching all products from organization ${orgId} with expanded details`);
    console.log(`Using token: ${token ? token.substring(0, 20) + '...' : 'NO TOKEN'}`);

    if (!token || token.trim() === '') {
        throw new Error('Authentication token is required');
    }

    try {
        const response = await axios({
            method: 'GET',
            url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apiproducts?expand=true`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        console.log('Successfully fetched expanded products list');
        console.log('Response structure:', {
            hasApiProduct: !!response.data.apiProduct,
            isArray: Array.isArray(response.data.apiProduct),
            count: response.data.apiProduct?.length || 0
        });

        if (response.data.apiProduct && response.data.apiProduct.length > 0) {
            const sampleProduct = response.data.apiProduct[0];
            console.log('Sample expanded product:', {
                name: sampleProduct.name,
                displayName: sampleProduct.displayName,
                hasDescription: !!sampleProduct.description,
                descriptionLength: sampleProduct.description?.length || 0,
                hasEnvironments: !!sampleProduct.environments,
                environmentsCount: sampleProduct.environments?.length || 0,
                environments: sampleProduct.environments
            });
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching expanded products:', error.message);
        console.error('Status code:', error.response?.status);
        console.error('Response data:', error.response?.data);

        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error?.message || error.message;

        const enhancedError = new Error(errorMessage);
        enhancedError.status = statusCode;
        enhancedError.details = error.response?.data;

        throw enhancedError;
    }
};

/**
 * Create a product in an organization using Apigee API
 */
const createProductInOrg = async (orgId, productData, token, newProductName = null) => {
    console.log(`Creating product ${newProductName || productData.name || 'unnamed'} in organization ${orgId}`);
    console.log('Product data to be created:', productData);

    if (!token || token.trim() === '') {
        throw new Error('Authentication token is required');
    }

    try {
        const response = await axios({
            method: 'POST',
            url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apiproducts`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: productData
        });

        console.log('Successfully created product:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating product:', error.message);
        console.error('Status code:', error.response?.status);
        console.error('Response data:', error.response?.data);

        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error?.message || error.message;

        const enhancedError = new Error(errorMessage);
        enhancedError.status = statusCode;
        enhancedError.details = error.response?.data;

        throw enhancedError;
    }
};

/**
 * Modify product data for cloning
 */
const modifyProductForClone = (productData, newData) => {
    // console.log('Original product data:', productData);
    // console.log('New data to be applied:', newData);

    const modifiedData = {
        ...productData,
        name: newData.newProductName,
        displayName: newData.newDisplayName,
        description: newData.description,
        environments: Array.isArray(newData.environments)
            ? newData.environments
            : [newData.environments]
    };

    // Remove metadata fields that shouldn't be copied
    delete modifiedData.createdAt;
    delete modifiedData.createdBy;
    delete modifiedData.lastModifiedAt;
    delete modifiedData.lastModifiedBy;

    console.log('Modified product data:', modifiedData);
    return modifiedData;
};

/**
 * Clone product business logic
 */
const cloneProductService = async (cloneData) => {
    const {
        sourceOrg,
        targetOrg,
        sourceToken,
        targetToken,
        productName,
        newProductName,
        newDisplayName,
        description,
        environments
    } = cloneData;

    // Step 1: Fetch product from source organization
    console.log('Step 1: Fetching product from source...');
    const product = await fetchProductFromOrg(sourceOrg, productName, sourceToken);

    if (!product) {
        const error = new Error('Product not found in source organization');
        error.status = 404;
        throw error;
    }

    // Step 2: Modify product data for target organization
    console.log('Step 2: Modifying product data...');
    const modifiedProduct = modifyProductForClone(product, {
        newProductName,
        newDisplayName,
        description,
        environments
    });

    // Step 3: Create product in target organization
    const createdProduct = await createProductInOrg(
        targetOrg,
        modifiedProduct,
        targetToken,
        newProductName
    );

    console.log("Created product:", JSON.stringify(createdProduct, null, 2));
    return createdProduct;
};

/**
 * Get all products with transformation logic
 */
const getAllProductsService = async (orgId, token) => {
    console.log('Fetching all products from organization:', orgId);
    const productsData = await fetchAllProductsFromOrg(orgId, token);

    let products = [];

    // With expand=true, we should always get detailed product data
    if (productsData.apiProduct && Array.isArray(productsData.apiProduct)) {
        console.log('Processing expanded product response...');
        products = productsData.apiProduct.map((product, index) => ({
            id: index + 1,
            name: product.name,
            displayName: product.displayName || product.name,
            description: product.description || '',
            environments: product.environments || [],
            orgId: orgId
        }));

        // Log statistics about the data quality
        const productsWithDescription = products.filter(p => p.description && p.description !== '');
        const productsWithEnvironments = products.filter(p => p.environments && p.environments.length > 0);

        console.log(`Data quality stats:`, {
            total: products.length,
            withDescription: productsWithDescription.length,
            withEnvironments: productsWithEnvironments.length,
            descriptionPercentage: Math.round((productsWithDescription.length / products.length) * 100),
            environmentsPercentage: Math.round((productsWithEnvironments.length / products.length) * 100)
        });

    } else if (Array.isArray(productsData)) {
        // Fallback: if we get just names (shouldn't happen with expand=true)
        console.warn('Received product names instead of expanded data - this is unexpected with expand=true');
        products = productsData.map((productName, index) => ({
            id: index + 1,
            name: productName,
            displayName: productName,
            description: 'Expanded data not available',
            environments: [],
            orgId: orgId
        }));
    } else {
        console.log('Unexpected API response format:', productsData);
        products = [];
    }

    console.log(`Transformed ${products.length} products for frontend`);

    // Log sample of what we're sending to frontend
    if (products.length > 0) {
        console.log('Sample product data being sent:', {
            name: products[0].name,
            displayName: products[0].displayName,
            description: products[0].description?.substring(0, 50) + (products[0].description?.length > 50 ? '...' : ''),
            environments: products[0].environments,
            hasDescription: !!products[0].description,
            hasEnvironments: products[0].environments.length > 0
        });
    }

    return {
        products,
        total: products.length,
        organization: orgId,
        message: `Found ${products.length} products with expanded details`
    };
};

/**
 * Get product for view with transformation logic
 */
const getProductForViewService = async (orgId, productName, token) => {
    console.log('Fetching product for view:', { orgId, productName });
    const productDetails = await fetchProductFromOrg(orgId, productName, token);

    // Extract specific data as per requirements with grouped structure
    const transformedProduct = {
        name: productDetails.name,
        displayName: productDetails.displayName || productDetails.name,
        description: productDetails.description || '',
        environments: productDetails.environments || [],

        // Group operation data by API source
        apiOperations: []
    };

    // Process operation group if it exists
    if (productDetails.operationGroup && productDetails.operationGroup.operationConfigs) {
        transformedProduct.apiOperations = productDetails.operationGroup.operationConfigs.map(config => {
            const apiOperation = {
                apiSource: config.apiSource || 'Unknown API Source',
                operations: []
            };

            if (config.operations && Array.isArray(config.operations)) {
                apiOperation.operations = config.operations.map(operation => ({
                    resource: operation.resource || '',
                    methods: operation.methods || []
                }));
            }

            return apiOperation;
        });
    }

    // Log what we're sending for debugging
    console.log('Transformed product for view:', {
        name: transformedProduct.name,
        displayName: transformedProduct.displayName,
        description: transformedProduct.description,
        environments: transformedProduct.environments,
        environmentsCount: transformedProduct.environments.length,
        apiOperationsCount: transformedProduct.apiOperations.length
    });

    return transformedProduct;
};

module.exports = {
    cloneProductService,
    getAllProductsService,
    getProductForViewService
};