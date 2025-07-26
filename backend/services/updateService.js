/**
 * Update Service - Product update operations
 * Handles: update product + API calls
 */

const axios = require('axios');

/**
 * Update a product in an organization using Apigee API
 */
const updateProductInOrg = async (orgId, productName, updateData, token) => {
    console.log(`Updating product ${productName} in organization ${orgId}`);
    console.log('Update data:', updateData);

    if (!token || token.trim() === '') {
        throw new Error('Authentication token is required');
    }

    try {
        const response = await axios({
            method: 'PUT',
            url: `https://apigee.googleapis.com/v1/organizations/${orgId}/apiproducts/${productName}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: updateData,
            timeout: 10000
        });

        console.log('Successfully updated product:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error updating product:', error.message);
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
 * Update product business logic
 */
const updateProductService = async (updateData) => {
    const {
        organizationId,
        productId,
        token,
        name,
        displayName,
        description
    } = updateData;

    // Prepare the update data
    const updatePayload = {};
    if (name) updatePayload.name = name;
    if (displayName) updatePayload.displayName = displayName;
    if (description) updatePayload.description = description;

    // Update the product in the organization
    const updatedProduct = await updateProductInOrg(
        organizationId,
        productId,
        updatePayload,
        token
    );

    return updatedProduct;
};

module.exports = {
    updateProductService
};