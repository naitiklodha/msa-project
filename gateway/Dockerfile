# Custom Kong image with declarative config template
FROM kong:3.4

# Switch to root to copy and set permissions
USER root

# Copy declarative config template
COPY kong.yml /etc/kong/kong.template.yml

# Copy custom entrypoint that renders the template
COPY kong-entrypoint.sh /kong-entrypoint.sh
RUN chmod +x /kong-entrypoint.sh

# Switch back to kong user
USER kong

# Expose Kong ports
EXPOSE 8000 8443 8001 8444

# Use custom entrypoint that processes template with envsubst
ENTRYPOINT ["/kong-entrypoint.sh"]
CMD ["kong", "docker-start"]
