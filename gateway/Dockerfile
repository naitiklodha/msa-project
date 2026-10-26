# Custom Kong image with declarative config baked in
FROM kong:3.4

# Copy declarative config to expected location
COPY kong.yml /tmp/kong.yml

# Set environment variable for Kong to find the config
ENV KONG_DECLARATIVE_CONFIG=/tmp/kong.yml

# Expose Kong ports
EXPOSE 8000 8443 8001 8444

# Use Kong's default entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["kong", "docker-start"]