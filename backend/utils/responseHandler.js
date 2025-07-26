/**
 * Response Handler - Standardized response formatting
 */

/**
 * Send success response
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        ...(data && typeof data === 'object' && data.total !== undefined && { total: data.total }),
        ...(data && typeof data === 'object' && data.organization !== undefined && { organization: data.organization })
    });
};

/**
 * Send error response
 */
const sendError = (res, error, message = 'An error occurred', statusCode = 500) => {
    console.error('Error:', error);

    const errorResponse = {
        success: false,
        message: error.message || message,
        ...(error.details && { error: error.details })
    };

    return res.status(error.status || statusCode).json(errorResponse);
};

/**
 * Send validation error response
 */
const sendValidationError = (res, message = 'Validation error', statusCode = 400) => {
    return res.status(statusCode).json({
        success: false,
        message
    });
};

module.exports = {
    sendSuccess,
    sendError,
    sendValidationError
};