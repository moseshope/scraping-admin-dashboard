# Scraping Admin Dashboard

A full-stack application with React frontend and Express backend, using DynamoDB for data storage.

## Prerequisites

- Docker
- Docker Compose

## Getting Started

1. Clone the repository:

```bash
git clone <repository-url>
cd scraping-admin-dashboard
```

2. Build and start the containers:

```bash
docker-compose up --build
```

This command will:

- Build the client and server images
- Start the DynamoDB local instance
- Start all services in the correct order

The application will be available at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- DynamoDB Local: http://localhost:8000
- Swagger API doc: http://localhost:5000/api-docs/

## Services

### Client Dashboard (Frontend)

- React application
- Running on port 3000
- Configured with Nginx for production serving
- Automatically proxies API requests to the backend

### Server Dashboard (Backend)

- Express.js application
- Running on port 5000
- JWT authentication
- Connected to local DynamoDB
- Winston logging enabled

### DynamoDB Local

- Running on port 8000
- Persistent data storage through Docker volume
- Accessible within the Docker network

## Development

To stop the services:

```bash
docker-compose down
```

To view logs:

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs client-dashboard
docker-compose logs server-dashboard
docker-compose logs dynamodb-local
```

To rebuild a specific service:

```bash
docker-compose up --build <service-name>
```

## Environment Variables

The docker-compose.yml file includes all necessary environment variables for development. For production, you should:

1. Create a .env file
2. Never commit sensitive information to version control
3. Use secure secrets management

## Troubleshooting

1. If the client can't connect to the API:

   - Check if the server-dashboard container is running
   - Verify the REACT_APP_API_URL environment variable

2. If DynamoDB tables aren't created:

   - Check the server-dashboard logs
   - Verify the DYNAMODB_LOCAL_ENDPOINT environment variable

3. For permission issues with logs:

   - The logs directory is mounted as a volume
   - Ensure proper write permissions

4. If ports are already in use:
   - Check if other services are using ports 3000, 5000, or 8000
   - Stop conflicting services or modify the ports in docker-compose.yml

## Security Notes

1. The JWT secret should be changed in production
2. DynamoDB credentials should be properly configured in production
3. CORS settings should be reviewed for production
4. Use HTTPS in production
