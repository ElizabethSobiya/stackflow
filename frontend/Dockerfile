FROM node:22-alpine AS build
WORKDIR /build

# Dependencies first: source changes should not invalidate the npm install layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
# Where the SPA's /api calls are forwarded; override per environment.
ENV API_UPSTREAM=http://api:8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /build/dist/inventory-web/browser /usr/share/nginx/html
EXPOSE 80
