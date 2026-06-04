# Skill: Preprod Linux Docker Deploy Maker

This skill automates the generation of all necessary files for deploying a web application (monorepo or single-repo) to a Linux server using Docker, Docker Compose, and GitHub Actions.

## Capabilities

1.  **Project Analysis**: Identifies if the project is a Monorepo (Back + Front) or a Single-Repo.
2.  **Dockerfile Generation**: Creates optimized multi-stage Dockerfiles for Node.js (API) and Vite/React/Vue (Frontend with Nginx).
3.  **Orchestration**: Generates a `docker-compose.yml` tailored for pre-production environments.
4.  **CI/CD Automation**: Creates a GitHub Actions workflow (`.github/workflows/deploy-preprod.yml`) for automated building, pushing to GHCR, and deploying via SSH.
5.  **Runtime Config**: Implements runtime environment variable injection for frontend SPAs (using `env.sh` pattern).

## Standard File Set

When executing this skill, the following files are typically generated/managed:

- `back/Dockerfile.back` (or `Dockerfile`)
- `back/entrypoint.sh` (for migrations/seeds)
- `front/Dockerfile.front` (or `Dockerfile`)
- `front/nginx.conf`
- `front/env.sh` (for runtime variables)
- `docker-compose.yml`
- `.github/workflows/deploy-preprod.yml`

## PARKO Execution Protocol: Deploy Generation

When invoked to "implement deploy", follow these steps strictly:

### Phase 1: Detection
1.  **Repo Type**: Determine if it's a monorepo by checking for multiple `package.json` files in subdirectories (typically `back`, `front`).
2.  **Tech Stack**:
    *   **Backend**: Check for `express`, `sequelize`, `prisma`, `typeorm`, etc.
    *   **Frontend**: Check for `vite`, `webpack`, `next.js`, `react`, `vue`.
3.  **Ports**: Search for `PORT` or `listen` in backend code. Search for `VITE_API_URL` or similar in frontend.

### Phase 2: Configuration Mapping
Define the following mappings:
- `PROJECT_NAME`: Lowercase, no spaces (e.g., `abastible-ai`).
- `BACK_PORT`: Standard `4000` or detected.
- `FRONT_PORT`: Standard `80` (internal container) mapped to `8080` (host).
- `DEPLOY_PATH`: Target directory on the server (e.g., `/home/DOCKERS-PREPROD/{{PROJECT_NAME}}/`).

### Phase 3: Generation
Generate the following files using the detected values:

#### 1. Dockerfile (Backend Node.js)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 4000
CMD ["node", "src/index.js"]
```

#### 2. Dockerfile (Frontend Nginx + Runtime Env)
```dockerfile
# Build stage
FROM node:20-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 3. GitHub Actions Workflow
```yaml
name: Deploy Preprod
on:
  push:
    branches: [ "main" ]
jobs:
  build-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
  deploy:
    needs: build-push
    runs-on: ubuntu-latest
    steps:
      - name: SSH Deploy
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_IP }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /path/to/app
            docker compose pull
            docker compose up -d --force-recreate
```

### Phase 4: Validation
- Check that `docker-compose` links match (e.g., API uses `DB_HOST=db`).
- Check that GitHub Secrets are documented for the user (SERVER_IP, SSH_PRIVATE_KEY, etc.).
- Ensure `.dockerignore` exists to exclude `node_modules`.

## Security Requirements
- **Secrets**: Never hardcode credentials. Use `secrets.SERVER_IP`, `secrets.SSH_PRIVATE_KEY`, etc.
- **Port Mapping**: Ensure ports match the documentation/environment.
- **Persistence**: Use Docker volumes for database and uploads.
