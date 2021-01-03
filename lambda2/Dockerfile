FROM amazon/aws-lambda-nodejs:12

# Must not use WORKDIR since amazon read handler from default directory on the amazon's image

COPY package.json .
COPY exabroker-lib-1.0.0.tgz .
COPY typeorm-0.2.29.tgz .
COPY aws-config.json .
COPY chromedriver .
RUN npm install
RUN npm install exabroker-lib-1.0.0.tgz

COPY dist/ dist/

CMD [ "dist/Index.handler" ]
