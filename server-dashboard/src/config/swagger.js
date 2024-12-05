const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Scraping Admin Dashboard API',
      version: '1.0.0',
      description: 'API documentation for Scraping Admin Dashboard',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js',
  ],
};

// Estimate routes documentation
/**
 * @swagger
 * /api/dev/getStates:
 *   get:
 *     tags: [Estimates]
 *     summary: Get all unique states
 *     description: Retrieves all unique state names from the Estimates table
 *     responses:
 *       200:
 *         description: List of states retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 states:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error
 * 
 * /api/dev/getCitiesInStates:
 *   get:
 *     tags: [Estimates]
 *     summary: Get cities in a state
 *     description: Retrieves all cities in a specified state
 *     parameters:
 *       - in: query
 *         name: stateName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the state
 *     responses:
 *       200:
 *         description: List of cities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cities:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: State name is required
 *       500:
 *         description: Server error
 * 
 * /api/dev/getQueryIds:
 *   post:
 *     tags: [Estimates]
 *     summary: Get query IDs based on filters
 *     description: Retrieves query IDs that match the specified filters
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scrapingMode:
 *                 type: integer
 *                 enum: [0, 1]
 *                 description: 0 for entire mode, 1 for filtered mode
 *               filter:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     state:
 *                       type: string
 *                     filters:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           city:
 *                             type: string
 *                           businessType:
 *                             type: array
 *                             items:
 *                               type: string
 *             example:
 *               scrapingMode: 0
 *               filter:
 *                 - state: "CA"
 *                   filters:
 *                     - city: "Mountain View"
 *                       businessType: []
 *                     - city: "Cupertino"
 *                       businessType: ["Caterer"]
 *     responses:
 *       200:
 *         description: Query IDs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ids:
 *                   type: array
 *                   items:
 *                     type: integer
 *       500:
 *         description: Server error
 */

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;