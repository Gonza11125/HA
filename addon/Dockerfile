ARG BUILD_FROM=ghcr.io/hassio-addons/base:latest
FROM ${BUILD_FROM}

# Just test if basic build works
RUN echo "Solar Portal Test Build"

# Create simple test script
RUN echo '#!/bin/bash' > /run.sh && \
    echo 'echo "Solar Portal is running!"' >> /run.sh && \
    echo 'tail -f /dev/null' >> /run.sh && \
    chmod +x /run.sh

CMD ["/run.sh"]
