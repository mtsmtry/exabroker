FROM node:12.20.0-slim

WORKDIR /usr/src/app

COPY package.json .
COPY exabroker-lib-1.0.0.tgz .
COPY typeorm-0.2.29.tgz .
COPY aws-config.json .
RUN npm install
RUN npm install exabroker-lib-1.0.0.tgz

COPY dist/ dist/

EXPOSE 8080
CMD ["npm", "start"]