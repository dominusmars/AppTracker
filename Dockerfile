FROM node:latest

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install
RUN npm install -g typescript ts-node

# Bundle app source
COPY . .

RUN npm run build

CMD [ "npm", "run", "start" ]