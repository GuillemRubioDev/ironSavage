FROM node:20

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Starts both the API server and the background worker in one process —
# fine for a simple single-container deployment. Split into two containers
# running `start:server` / `start:worker` separately if you need to scale
# the worker independently.
CMD ["npm", "run", "start"]
