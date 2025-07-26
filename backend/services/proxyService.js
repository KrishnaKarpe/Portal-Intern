/**
 * Proxy Service - All proxy operations in one place
 * Handles: move, list, export/import proxies + API calls
 */

const axios = require('axios');
const FormData = require('form-data');

/**
 * Get latest revision for a proxy
 */
const getLatestRevision = async (orgId, proxyName, token) => {
    console.log(`Getting latest revision for proxy ${proxyName} in organization ${orgId}`);

    try {
        const response = await axios({
            method: 'GET',
            url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apis/${proxyName}/revisions`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const revisions = response.data;
        if (revisions && revisions.length > 0) {
            const latest = Math.max(...revisions.map(Number));
            console.log(`Latest revision found: ${latest}`);
            return latest.toString();
        } else {
            throw new Error(`No revisions found for proxy ${proxyName}`);
        }
    } catch (error) {
        console.error(`Error getting revisions for proxy ${proxyName}:`, error.message);
        throw error;
    }
};

/**
 * Fetch a proxy bundle from an organization using Apigee API (Export equivalent)
 */
const fetchProxyFromOrg = async (orgId, proxyName, token, revision = 'latest') => {
    console.log(`Fetching proxy ${proxyName} revision ${revision} from organization ${orgId}`);

    if (!token || token.trim() === '') {
        throw new Error('Authentication token is required');
    }

    try {
        // Step 1: Resolve revision if 'latest'
        let actualRevision = revision;
        if (revision === 'latest') {
            actualRevision = await getLatestRevision(orgId, proxyName, token);
        }

        // Step 2: Download the proxy bundle as ZIP (Export)
        console.log(`Downloading proxy bundle for revision ${actualRevision}...`);
        const response = await axios({
            method: 'GET',
            url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apis/${proxyName}/revisions/${actualRevision}?format=bundle`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/zip'
            },
            responseType: 'arraybuffer', // Important: Get binary data
            timeout: 30000
        });

        console.log(`Successfully fetched proxy bundle. Size: ${response.data.byteLength} bytes`);

        // Validate the response is actually a ZIP file
        const buffer = Buffer.from(response.data);
        if (buffer.length < 4) {
            throw new Error('Invalid proxy bundle: file too small');
        }

        // Check ZIP file signature (PK)
        const zipSignature = buffer.toString('hex', 0, 2);
        if (zipSignature !== '504b') {
            console.error('Invalid ZIP signature:', zipSignature);
            throw new Error('Invalid proxy bundle: not a valid ZIP file');
        }

        return {
            bundle: buffer,
            revision: actualRevision,
            size: buffer.length,
            contentType: 'application/zip'
        };

    } catch (error) {
        console.error(`Error fetching proxy ${proxyName}:`, error.message);

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
 * Upload a proxy bundle to target organization (Import equivalent)
 */
const sendProxyToOrg = async (orgId, proxyName, proxyBundle, token) => {
    console.log(`Uploading proxy ${proxyName} to organization ${orgId}`);
    console.log(`Bundle size: ${proxyBundle.size} bytes`);

    if (!token || token.trim() === '') {
        throw new Error('Authentication token is required');
    }

    if (!proxyBundle.bundle || proxyBundle.size === 0) {
        throw new Error('Invalid proxy bundle: empty or missing data');
    }

    try {
        // Create FormData for multipart upload (Import)
        const form = new FormData();

        // Add the ZIP bundle as a file
        form.append('file', proxyBundle.bundle, {
            filename: `${proxyName}.zip`,
            contentType: 'application/zip'
        });

        console.log('Uploading proxy bundle...');
        const response = await axios({
            method: 'POST',
            url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apis?action=import&name=${proxyName}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                ...form.getHeaders()
            },
            data: form,
            timeout: 60000, // Increased timeout for upload
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log(`Successfully uploaded proxy ${proxyName}:`, response.data);
        return response.data;

    } catch (error) {
        console.error(`Error uploading proxy ${proxyName}:`, error.message);

        if (error.response) {
            console.error('Upload response status:', error.response.status);
            console.error('Upload response data:', error.response.data);
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
 * Deploy proxy to environments
 */
const deployProxyToEnvironments = async (orgId, proxyName, revision, environments, token) => {
    console.log(`Deploying proxy ${proxyName} revision ${revision} to environments:`, environments);

    if (!environments || environments.length === 0) {
        console.log('No environments specified, skipping deployment');
        return { deployed: [], skipped: 'No environments specified' };
    }

    const deploymentResults = [];

    for (const envName of environments) {
        try {
            console.log(`Deploying to environment: ${envName}`);

            const response = await axios({
                method: 'POST',
                url: `https://apigee.googleapis.com/v1/organizations/${orgId}/environments/${envName}/apis/${proxyName}/revisions/${revision}/deployments`,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    override: true  // ✅ ONLY use override - remove delay and basePath
                },
                timeout: 45000
            });

            deploymentResults.push({
                environment: envName,
                status: 'deployed',
                result: response.data,
                message: `Successfully deployed to ${envName}`
            });

            console.log(`✅ Successfully deployed to ${envName}`);

        } catch (error) {
            console.error(`❌ Failed to deploy to ${envName}:`, error.message);
            console.error('Deployment error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                url: error.config?.url
            });

            let errorMessage = error.message;
            let suggestion = '';

            // Provide specific error messages based on status code
            if (error.response?.status === 400) {
                errorMessage = 'Bad Request - Environment may not exist or invalid deployment parameters';
                suggestion = `Verify that environment '${envName}' exists in organization '${orgId}'`;
            } else if (error.response?.status === 401) {
                errorMessage = 'Unauthorized - Check your authentication token';
                suggestion = 'Ensure your token has deployment permissions';
            } else if (error.response?.status === 403) {
                errorMessage = 'Forbidden - Insufficient permissions';
                suggestion = 'Your token may not have deployment permissions for this environment';
            } else if (error.response?.status === 404) {
                errorMessage = 'Not Found - Environment or proxy does not exist';
                suggestion = `Check if environment '${envName}' exists and proxy was successfully imported`;
            }

            deploymentResults.push({
                environment: envName,
                status: 'failed',
                error: errorMessage,
                suggestion: suggestion,
                statusCode: error.response?.status || 'Unknown',
                details: error.response?.data
            });
        }
    }

    return deploymentResults;
};

// ==================== BUSINESS LOGIC FUNCTIONS ====================

/**
 * Move proxy business logic (Export + Import + Deploy)
 */
const moveProxyService = async (moveData) => {
    const {
        sourceOrg,
        targetOrg,
        sourceToken,
        targetToken,
        proxyName,
        newProxyName,
        revision = 'latest',
        environments = []
    } = moveData;

    console.log('=== AUTOMATED PROXY MOVE/EXPORT/IMPORT ===');
    console.log('Source Org:', sourceOrg);
    console.log('Target Org:', targetOrg);
    console.log('Source Proxy:', proxyName);
    console.log('Target Proxy:', newProxyName || proxyName);
    console.log('Revision:', revision);
    console.log('Target Environments:', environments);

    try {
        // Step 1: Export proxy bundle from source (like manual export)
        console.log('📦 Step 1: Exporting proxy from source organization...');
        const proxyBundle = await fetchProxyFromOrg(sourceOrg, proxyName, sourceToken, revision);

        console.log('✅ Proxy exported successfully');
        console.log('Export details:', {
            size: `${(proxyBundle.size / 1024).toFixed(2)} KB`,
            revision: proxyBundle.revision,
            contentType: proxyBundle.contentType
        });

        // Step 2: Import proxy bundle to target (like manual import)
        console.log('📥 Step 2: Importing proxy to target organization...');
        const uploadedProxy = await sendProxyToOrg(
            targetOrg,
            newProxyName || proxyName,
            proxyBundle,
            targetToken
        );

        console.log('✅ Proxy imported successfully');

        // Step 3: Deploy to environments (if specified)
        let deploymentResults = [];
        if (environments && environments.length > 0) {
            console.log('🚀 Step 3: Deploying to target environments...');

            // Get the uploaded revision number from the response
            const uploadedRevision = uploadedProxy.revision || '1';

            deploymentResults = await deployProxyToEnvironments(
                targetOrg,
                newProxyName || proxyName,
                uploadedRevision,
                environments,
                targetToken
            );

            console.log('✅ Deployment completed');
        } else {
            console.log('⏭️ Step 3: Skipping deployment (no environments specified)');
        }

        // Return comprehensive result
        const result = {
            sourceProxy: proxyName,
            targetProxy: newProxyName || proxyName,
            sourceOrg,
            targetOrg,
            sourceRevision: proxyBundle.revision,
            targetRevision: uploadedProxy.revision || '1',
            uploadResult: uploadedProxy,
            deploymentResults,
            summary: {
                exported: true,
                imported: true,
                deployed: deploymentResults.length > 0,
                deployedEnvironments: deploymentResults.filter(d => d.status === 'deployed').length,
                failedEnvironments: deploymentResults.filter(d => d.status === 'failed').length
            }
        };

        console.log('🎉 Proxy move completed successfully!');
        return result;

    } catch (error) {
        console.error('❌ Proxy move failed:', error.message);
        throw error;
    }
};

/**
 * Get all proxies from organization (similar to getAllProductsService)
 */
const getAllProxiesService = async (orgId, token) => {
    console.log('Fetching all proxies from organization:', orgId);

    if (!token || token.trim() === '') {
        throw new Error('Authentication token is required');
    }

    try {
        const response = await axios({
            method: 'GET',
            url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apis`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        console.log('Successfully fetched proxies list');
        const proxies = response.data || [];

        const transformedProxies = proxies.map((proxyName, index) => ({
            id: index + 1,
            name: proxyName,
            orgId: orgId
        }));

        console.log(`Transformed ${transformedProxies.length} proxies for frontend`);

        return {
            proxies: transformedProxies,
            total: transformedProxies.length,
            organization: orgId,
            message: `Found ${transformedProxies.length} proxies`
        };

    } catch (error) {
        console.error('Error fetching proxies:', error.message);
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
 * Get available environments for an organization
 */
const getOrganizationEnvironments = async (orgId, token) => {
    console.log(`Fetching environments for organization ${orgId}`);

    try {
        const response = await axios({
            method: 'GET',
            url: `https://apigee.googleapis.com/v1/organizations/${orgId}/environments`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log(`Found environments:`, response.data);
        return response.data || [];

    } catch (error) {
        console.error(`Error fetching environments:`, error.message);
        throw error;
    }
};

// Add to module.exports
module.exports = {
    moveProxyService,
    getAllProxiesService,
    fetchProxyFromOrg,
    sendProxyToOrg,
    deployProxyToEnvironments,
    getOrganizationEnvironments  // ✅ ADD this
};