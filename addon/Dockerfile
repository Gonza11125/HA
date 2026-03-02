ARG BUILD_FROM
FROM ${BUILD_FROM}

# Create s6 service directory
RUN mkdir -p /etc/services.d/solar-portal

# Test script
RUN echo "#!/usr/bin/with-contenv bashio" > /etc/services.d/solar-portal/run && \
    echo "bashio::log.info 'Solar Portal Test Running!'" >> /etc/services.d/solar-portal/run && \
    echo "exec tail -f /dev/null" >> /etc/services.d/solar-portal/run && \
    chmod +x /etc/services.d/solar-portal/run
