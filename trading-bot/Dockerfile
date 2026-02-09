# trading-bot/Dockerfile

# 1. Use Node.js to build the app
FROM node:16-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# 4. Copy the rest of the code
COPY . .

# 5. Expose the port React runs on
EXPOSE 3000

# 6. Start the app
CMD ["npm", "start"]