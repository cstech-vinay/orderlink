FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="orderlink-web" \
      org.opencontainers.image.description="OrderLink coming-soon page" \
      org.opencontainers.image.source="https://orderlink.in"

# Clear nginx defaults
RUN rm -f /etc/nginx/conf.d/default.conf \
    && rm -rf /usr/share/nginx/html/*

# Copy site (only optimized assets are served; originals excluded via .dockerignore)
COPY index.html        /usr/share/nginx/html/index.html
COPY assets/optimized  /usr/share/nginx/html/assets/optimized
COPY robots.txt        /usr/share/nginx/html/robots.txt
COPY sitemap.xml       /usr/share/nginx/html/sitemap.xml
COPY nginx.conf        /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/healthz >/dev/null || exit 1
