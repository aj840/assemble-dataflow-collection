# Use a lightweight Node.js 20 image
FROM node:20-slim

# Set the working directory inside the container
WORKDIR /app

# Copy all project files into the container
COPY . .

# Run the exact build commands that were in railway.toml
RUN cd backend && npm install
RUN cd frontend && npm install --include=dev && npm run build

# Railway dynamically assigns a PORT environment variable
ENV PORT=5000
EXPOSE 5000

# Start the server (matches railway.toml deploy command)
CMD ["sh", "-c", "cd backend && node server.js"]
