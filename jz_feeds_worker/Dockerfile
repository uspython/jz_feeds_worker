# specify the node base image with your desired version node:<version>
FROM node:14

WORKDIR /home/node/app

COPY ./package*.json ./

#RUN apt-get update \
#&& apt-get autoremove -yqq --purge \
#&& apt-get clean

RUN npm install --verbose

COPY . /home/node/app

EXPOSE 8964

CMD ["npm", "start"]
