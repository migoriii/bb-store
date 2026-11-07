FROM node:22-alpine

WORKDIR /srv
RUN apk add --no-cache unzip

COPY deploy-payload/ /tmp/deploy-payload/
COPY deploy-patch.js /tmp/deploy-patch.js
COPY deploy-patch-2.js /tmp/deploy-patch-2.js
RUN cat /tmp/deploy-payload/part-*.txt | base64 -d > /tmp/tindahan-sa-eskinita.zip \
    && unzip -t /tmp/tindahan-sa-eskinita.zip \
    && unzip -q /tmp/tindahan-sa-eskinita.zip -d /srv \
    && node /tmp/deploy-patch.js /srv/tindahan-sa-eskinita \
    && node /tmp/deploy-patch-2.js /srv/tindahan-sa-eskinita \
    && cd /srv/tindahan-sa-eskinita \
    && npm install --omit=dev \
    && rm -rf /tmp/deploy-payload /tmp/tindahan-sa-eskinita.zip /tmp/deploy-patch.js /tmp/deploy-patch-2.js

WORKDIR /srv/tindahan-sa-eskinita
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
EXPOSE 3000
CMD ["npm", "start"]
