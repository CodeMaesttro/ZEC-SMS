# School Management System - Deployment Guide

## Overview

This guide covers deployment of the School Management System to various environments including development, staging, and production.

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn package manager
- Git

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd school-management-mern
```

### 2. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
npm run install-client
```

### 3. Environment Configuration

Create `.env` file in the root directory:

```env
# Environment
NODE_ENV=production

# Server
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/school_management

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRE=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=School Management System <noreply@school.com>

# File Upload
UPLOAD_PATH=uploads
MAX_FILE_SIZE=10485760

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

## Development Deployment

### 1. Start MongoDB

```bash
# Using MongoDB service
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Seed Database (Optional)

```bash
npm run seed
```

### 3. Start Development Servers

```bash
# Start both backend and frontend
npm run dev

# Or start separately
npm run server  # Backend only
npm run client  # Frontend only
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Production Deployment

### Option 1: Traditional Server Deployment

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2 for process management
sudo npm install -g pm2
```

#### 2. Application Setup

```bash
# Clone repository
git clone <repository-url>
cd school-management-mern

# Install dependencies
npm run install-all

# Build frontend
npm run build

# Set up environment
cp .env.example .env
# Edit .env with production values

# Seed database (if needed)
npm run seed
```

#### 3. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'school-management-api',
    script: 'backend/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

#### 4. Start Application

```bash
# Create logs directory
mkdir logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

#### 5. Nginx Configuration

Install and configure Nginx:

```bash
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/school-management
```

Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/school-management-mern/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /uploads {
        alias /path/to/school-management-mern/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/school-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile for Backend

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

#### 2. Create Dockerfile for Frontend

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 3. Create Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: school-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    container_name: school-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:password123@mongodb:27017/school_management?authSource=admin
      JWT_SECRET: your_jwt_secret_here
      FRONTEND_URL: http://localhost:3000
    volumes:
      - ./uploads:/app/uploads
    ports:
      - "5000:5000"
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    container_name: school-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

#### 4. Deploy with Docker

```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Option 3: Cloud Deployment (Heroku)

#### 1. Prepare for Heroku

Create `Procfile`:

```
web: node backend/server.js
```

Update `package.json`:

```json
{
  "scripts": {
    "start": "node backend/server.js",
    "heroku-postbuild": "cd frontend && npm install && npm run build"
  }
}
```

#### 2. Deploy to Heroku

```bash
# Install Heroku CLI
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set MONGODB_URI=your_mongodb_atlas_uri

# Deploy
git push heroku main
```

### Option 4: Cloud Deployment (AWS/DigitalOcean)

#### 1. Server Setup

Use the traditional server deployment steps on your cloud instance.

#### 2. Database Setup

- Use MongoDB Atlas for managed database
- Or set up MongoDB on a separate instance

#### 3. Load Balancer & Auto Scaling

Configure load balancer and auto-scaling groups for high availability.

## Database Migration

### MongoDB Atlas Setup

1. Create MongoDB Atlas account
2. Create cluster
3. Create database user
4. Whitelist IP addresses
5. Get connection string

### Data Migration

```bash
# Export from local MongoDB
mongodump --db school_management --out ./backup

# Import to Atlas
mongorestore --uri "mongodb+srv://username:password@cluster.mongodb.net/school_management" ./backup/school_management
```

## Security Considerations

### 1. Environment Variables

- Never commit `.env` files
- Use secure, random JWT secrets
- Use strong database passwords
- Rotate secrets regularly

### 2. HTTPS

- Always use HTTPS in production
- Redirect HTTP to HTTPS
- Use HSTS headers

### 3. Database Security

- Use authentication
- Limit database access
- Regular backups
- Monitor access logs

### 4. Application Security

- Keep dependencies updated
- Use security headers
- Implement rate limiting
- Validate all inputs
- Sanitize user data

## Monitoring & Logging

### 1. Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart all
```

### 2. System Monitoring

- Use tools like New Relic, DataDog, or Prometheus
- Monitor CPU, memory, disk usage
- Set up alerts for critical metrics

### 3. Log Management

- Centralize logs with ELK stack or similar
- Rotate logs regularly
- Monitor error rates

## Backup Strategy

### 1. Database Backup

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri "mongodb://localhost:27017/school_management" --out "/backups/db_$DATE"
find /backups -name "db_*" -mtime +7 -delete
```

### 2. File Backup

```bash
# Backup uploads directory
rsync -av /path/to/uploads/ /backup/uploads/
```

### 3. Automated Backups

Set up cron jobs for automated backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

## Performance Optimization

### 1. Database Optimization

- Create appropriate indexes
- Use aggregation pipelines efficiently
- Monitor slow queries

### 2. Application Optimization

- Enable gzip compression
- Use CDN for static assets
- Implement caching strategies
- Optimize images

### 3. Frontend Optimization

- Code splitting
- Lazy loading
- Bundle optimization
- Service workers for caching

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   sudo lsof -i :5000
   sudo kill -9 <PID>
   ```

2. **MongoDB connection issues**
   - Check MongoDB service status
   - Verify connection string
   - Check firewall settings

3. **Permission issues**
   ```bash
   sudo chown -R $USER:$USER /path/to/app
   chmod -R 755 /path/to/app
   ```

4. **Memory issues**
   - Monitor memory usage
   - Increase server memory
   - Optimize application code

### Log Analysis

```bash
# Check application logs
pm2 logs school-management-api

# Check system logs
sudo journalctl -u nginx
sudo journalctl -u mongod

# Check error logs
tail -f /var/log/nginx/error.log
```

## Maintenance

### Regular Tasks

1. **Update dependencies**
   ```bash
   npm audit
   npm update
   ```

2. **Monitor disk space**
   ```bash
   df -h
   du -sh /path/to/app/*
   ```

3. **Database maintenance**
   ```bash
   # Compact database
   mongo school_management --eval "db.runCommand({compact: 'collection_name'})"
   ```

4. **Log rotation**
   ```bash
   pm2 flush  # Clear PM2 logs
   ```

### Update Deployment

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Build frontend
npm run build

# Restart application
pm2 restart all
```

This deployment guide covers various deployment scenarios and best practices for running the School Management System in production environments.