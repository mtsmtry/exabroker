FROM node:16-alpine3.13

# コードを/codeにコピー
RUN mkdir /code
COPY ./ /code

WORKDIR /code/lib/

# 依存関係
RUN npm install

# 実行
ENTRYPOINT [ "npm", "run", "crawl" ]
