# Use the official Node.js image as the base
FROM node:14

# Set the working directory inside the container
WORKDIR /app

# Copy the entire content of the "backend-nodejs" folder to the container
COPY . .

# Install dependencies
RUN npm install

# Expose port 3000 (the same port as in your Node.js server)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
