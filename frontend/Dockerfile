FROM node:20-slim

WORKDIR /app

# Copy package files first (cache layer)
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Build argument for API URL
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

EXPOSE 5173

# Start dev server (accessible from outside container)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
