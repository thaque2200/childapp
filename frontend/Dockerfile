# Stage 1: Build the app with Node.js
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# 🔧 Ensure vite is executable
RUN chmod +x node_modules/.bin/vite

# Run build
RUN npm run build

# Stage 2: Serve using nginx
FROM nginx:stable-alpine

# Copy built files from previous stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default nginx config
RUN rm /etc/nginx/conf.d/default.conf
#COPY nginx.conf /etc/nginx/conf.d
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]