# specify the node base image with your desired version node:<version>
FROM node:14

WORKDIR /home/node/app

COPY ./jz_feeds_worker/package*.json ./

RUN apt-get update \
&& apt-get autoremove -yqq --purge \
&& apt-get clean

RUN npm install

COPY ./jz_feeds_worker .

EXPOSE 8964

CMD ["npm", "start"]
