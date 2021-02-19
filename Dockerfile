# specify the node base image with your desired version node:<version>
FROM node:14

WORKDIR /home/node/app

COPY ./package*.json ./

RUN npm install --verbose

COPY . ./

EXPOSE 8964

CMD ["npm", "start"]
