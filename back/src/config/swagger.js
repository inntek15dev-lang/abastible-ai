const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'OIEM Abastible API',
            version: '2.0.0',
            description: `
# API Documentation - OIEM Abastible

Sistema de Gestión de Cumplimiento Normativo (IEEE 1058 / 29148).

## 🚀 Test Users & Credentials
Use these credentials to test different roles and vulnerability scopes.

| Role | Email | Password | Scope / Permissions |
|:--- | :--- | :--- | :--- |
| **Admin (Dios)** | \`admin@abastible.cl\` | \`User123*\` | Full Access (CRUD All) |
| **Admin Contrato (ADC)** | \`pedro.ac@abastible.cl\` | \`User123*\` | Auditar, Aprobar, Ver Asignados |
| **Contratista Admin** | \`contratista@demo.cl\` | \`User123*\` | Crear Operativos, Subir Evidencia, Postular |
| **Contratista User** | \`operativo@demo.cl\` | \`User123*\` | Solo lectura (su dependencia) |

## 🔑 Security & Roles
The system uses JWT (Bearer Token).
- **Admin**: \`role_id: 1\`
- **ADC**: \`role_id: 2\`
- **Contratista Admin**: \`role_id: 3\`
- **Contratista User**: \`role_id: 4\`

## 🛡️ Business Rules (Enforced)
1. **Scope Check**: Users can only edit themselves or their children.
2. **Audit Separation**: ADC can **Audit** but NOT **Delete**.
3. **Licitaciones**:
    - **Create**: Admin only.
    - **Postulate**: Contractors only.
      `,
            contact: {
                name: 'Soporte Abastible AI',
                email: 'soporte@abastible.cloud',
            },
        },
        servers: [
            {
                url: 'http://localhost:4000/api',
                description: 'Local Development Server',
            },
            {
                url: 'https://api.abastible-ai.cloud/api',
                description: 'Staging Server',
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
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js', './src/database/models/*.js', './src/docs/*.js'], // Scan routes and models
};

const specs = swaggerJsdoc(options);
module.exports = specs;
