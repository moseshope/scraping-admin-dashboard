# Business Rate Scraper Admin Dashboard

A full-stack application for managing and monitoring business rate scraping tasks using AWS ECS and DynamoDB.

## Features

- User authentication and authorization
- Project management for scraping tasks
- Real-time task monitoring
- Performance metrics visualization
- AWS ECS task management
- DynamoDB data storage

## Project Structure

```
.
├── client-dashboard/          # React frontend
│   ├── src/
│   │   ├── container/        # React components
│   │   ├── redux/           # Redux state management
│   │   └── services/        # API services
│   └── public/              # Static files
│
└── server-dashboard/         # Node.js backend
    ├── src/
    │   ├── config/          # Configuration files
    │   ├── middleware/      # Express middleware
    │   ├── models/          # Data models
    │   ├── routes/          # API routes
    │   ├── services/        # Business logic
    │   └── utils/           # Utility functions
    └── logs/                # Application logs
```

## Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose
- AWS Account with:
  - ECS cluster
  - DynamoDB tables
  - S3 bucket
  - IAM roles configured

## Environment Variables

### Server (.env)
```env
# AWS Configuration
AWS_REGION=us-west-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development
```

### Client (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd scraping-admin-dashboard
```

2. Install dependencies:
```bash
# Install server dependencies
cd server-dashboard
npm install

# Install client dependencies
cd ../client-dashboard
npm install
```

3. Set up environment variables:
- Copy `.env.example` to `.env` in both client and server directories
- Update the values according to your configuration

## Development

1. Start the development servers:
```bash
# Start server in development mode
cd server-dashboard
npm run dev

# Start client in development mode
cd client-dashboard
npm start
```

2. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs

## Docker Deployment

1. Build and push the scraping module:
```bash
aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin [account-id].dkr.ecr.us-west-1.amazonaws.com

docker build -t business-rate-scraper-module .

docker tag business-rate-scraper-module:latest [account-id].dkr.ecr.us-west-1.amazonaws.com/business-rate-scraper-module:latest

docker push [account-id].dkr.ecr.us-west-1.amazonaws.com/business-rate-scraper-module:latest
```

2. Deploy using Docker Compose:
```bash
docker-compose up -d
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - User login
- POST /api/auth/logout - User logout

### Projects
- GET /api/projects - List all projects
- POST /api/projects - Create new project
- GET /api/projects/:id - Get project details
- PUT /api/projects/:id - Update project
- DELETE /api/projects/:id - Delete project
- POST /api/projects/:id/status - Update project status

### Estimates
- GET /api/dev/getStates - Get available states
- GET /api/dev/getCitiesInStates - Get cities in a state
- POST /api/dev/getQueryIds - Get query IDs based on filters
- POST /api/dev/startScraping - Start scraping tasks

## Data Models

### Project
```javascript
{
  id: "uuid",
  name: "Project Name",
  status: "pending|running|completed|failed|paused",
  createdAt: "timestamp",
  updatedAt: "timestamp",
  settings: {
    entireScraping: boolean,
    highPriority: boolean,
    taskCount: number,
    startDate: "date",
    customQuery: "string"
  },
  filters: {
    states: ["state1", "state2"],
    cities: ["city1", "city2"],
    businessTypes: ["type1", "type2"]
  },
  queryCount: number,
  queryIds: ["id1", "id2"],
  scrapingTasks: [/* task details */]
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the BR License.

## Author

lucky.yaroslav0430@gmail.com