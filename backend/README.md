
# Product Management System - Backend

This is the backend API for the Product Management System. It provides endpoints for managing products across organizations.

## Technologies Used

- Node.js
- Express.js
- Axios for API requests
- Express Validator for request validation
- CORS for Cross-Origin Resource Sharing
- Morgan for HTTP request logging
- Dotenv for environment variable management

## Project Structure

```
backend/
├── controllers/      # Business logic handlers
├── data/            # Mock data for development
├── middleware/      # Custom middleware (validation, etc.)
├── routes/          # API route definitions
├── services/        # External API communication
├── .env.example     # Template for environment variables
├── package.json     # Project dependencies
├── README.md        # This documentation
└── server.js        # Main application entry point
```

## API Endpoints

### Product Operations

- `POST /api/products/clone` - Clone a product from one organization to another
- `PUT /api/products/update` - Update an existing product
- `GET /api/products/organizations` - Get list of organizations
- `GET /api/products/by-organization/:orgId` - Get products by organization ID

### System

- `GET /api/health` - Check API health status

## Setup Instructions

1. Clone the repository
2. Navigate to the backend directory: `cd backend`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and update the values
5. Start the development server: `npm run dev`

## Communication with Frontend

The frontend React application communicates with this API to perform product management operations. The API is designed to be consumed by the existing UI without requiring any changes to the frontend code.

## Error Handling

The API includes comprehensive error handling:

- Request validation errors return 400 status with detailed error messages
- API communication errors are properly caught and formatted
- Internal server errors return appropriate 500 status responses

## Security Considerations

- CORS is configured to restrict access to allowed origins only
- Request validation is implemented to prevent malformed data
- Authorization tokens are required for API operations

