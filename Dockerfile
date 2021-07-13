FROM node:16-alpine3.13

# コードを/codeにコピー
RUN mkdir /code
COPY ./ /code

WORKDIR /code/lib/

# 依存関係
RUN apk add python3
RUN apk add alpine-sdk

RUN npm uninstall node-pre-gyp --save
RUN npm install @mapbox/node-pre-gyp --save

RUN npm install
# RUN npm install mysql --save
RUN npm run build

# 実行
ENTRYPOINT [ "python3", "/code/run_crawler.py" ]