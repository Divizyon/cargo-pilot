FROM node:20-slim AS deps
WORKDIR /app
RUN npm install -g npm@11.6.1
COPY package*.json ./
RUN npm ci --ignore-scripts

FROM node:20-slim AS build
WORKDIR /app
ARG VITE_API_BASE_URL
ARG VITE_APP_VERSION=dev
ARG VITE_APP_ENV=production
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_ENV=$VITE_APP_ENV
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
