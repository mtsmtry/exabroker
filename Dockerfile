# FROM node:16-alpine3.13
FROM node:14-alpine3.13

# キャッシュが効くように最初に依存関係をインストール
RUN apk add python3
RUN apk add alpine-sdk

# npm installにキャッシュが効き、なおかつnode_modules以外はキャッシュが効かないように
# 最初にtmpにpackage.jsonだけをコピーする
COPY /lib/package.json /tmp/package.json
COPY /lib/typeorm-0.2.29.tgz /tmp/typeorm-0.2.29.tgz
RUN cd /tmp && npm install
RUN mkdir -p /code/lib
RUN cp -a /tmp/node_modules /code/lib/

# ソースコードコピー
COPY ./ /code
WORKDIR /code/lib/

# コンパイル
RUN npm run build

# 実行
ENTRYPOINT [ "python3", "/code/run_crawler.py" ]
