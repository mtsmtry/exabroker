# FROM node:16-alpine3.13
FROM node:14-alpine3.13

# 依存関係
RUN apk add python3
RUN apk add alpine-sdk


# コードを/codeにコピー
#COPY ./lib/node_modules /code/lib/node_modules

COPY /lib/package.json /tmp/package.json
COPY /lib/typeorm-0.2.29.tgz /tmp/typeorm-0.2.29.tgz
RUN cd /tmp && npm install
RUN mkdir -p /code/lib
RUN cp -a /tmp/node_modules /code/lib/

COPY ./ /code
WORKDIR /code/lib/

# RUN npm install mysql --save
# RUN npm install typescript -g
RUN npm run build

# 実行
ENTRYPOINT [ "python3", "/code/run_crawler.py" ]
