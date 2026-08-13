FROM node:18-bullseye-slim

WORKDIR /app

# copy package and config first to leverage layer caching
COPY package.json ./
COPY jest.config.cjs ./
COPY tsconfig.json ./

# copy source
COPY . ./

# Install test tooling (dev deps)
RUN npm install --no-audit --no-fund --save-dev jest ts-jest typescript @types/jest

ENV CI=true

CMD ["npm", "test"]
