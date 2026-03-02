ARG BUILD_FROM
FROM ${BUILD_FROM}

# Minimal runnable service (valid Home Assistant add-on image)
RUN mkdir -p /etc/services.d/solar-portal && \
    echo "#!/usr/bin/with-contenv bashio" > /etc/services.d/solar-portal/run && \
    echo "bashio::log.info 'Solar Portal add-on container started'" >> /etc/services.d/solar-portal/run && \
    echo "bashio::log.info 'Build context fixed: addon-only image is running'" >> /etc/services.d/solar-portal/run && \
    echo "exec tail -f /dev/null" >> /etc/services.d/solar-portal/run && \
    chmod +x /etc/services.d/solar-portal/run
