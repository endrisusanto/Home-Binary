FROM mcr.microsoft.com/playwright:v1.50.1-noble

WORKDIR /app

# Copy root and engine package definitions
COPY package.json package-lock.json ./
COPY engine/package.json ./engine/

# Install root dependencies and engine dependencies
RUN npm ci --include=dev
RUN cd engine && npm install

# Copy all source files
COPY . .

# Build the Vite React frontend
RUN npm run build

# Expose HTTP port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Run Web App Server
CMD ["node", "server.mjs"]
