FROM node:22-alpine

WORKDIR /srv
RUN apk add --no-cache unzip

COPY deploy-payload/ /tmp/deploy-payload/
RUN cat /tmp/deploy-payload/part-*.txt | base64 -d > /tmp/tindahan-sa-eskinita.zip \
    && unzip -t /tmp/tindahan-sa-eskinita.zip \
    && unzip -q /tmp/tindahan-sa-eskinita.zip -d /srv \
    && cd /srv/tindahan-sa-eskinita \
    && npm install --omit=dev \
    && rm -rf /tmp/deploy-payload /tmp/tindahan-sa-eskinita.zip

WORKDIR /srv/tindahan-sa-eskinita
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
EXPOSE 3000
CMD ["npm", "start"]
