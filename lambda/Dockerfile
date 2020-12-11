FROM amazon/aws-lambda-nodejs:12

COPY package.json .
COPY package-lock.json .
RUN npm install

COPY dist/ dist/

CMD [ "dist/Index.handler" ]
