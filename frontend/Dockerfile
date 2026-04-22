# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage (using Nginx to serve static files)
FROM nginx:stable-alpine

# Copy build output from builder stage to nginx static folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration if needed (optional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
