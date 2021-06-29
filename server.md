# SSH
chmod 600 Exabroker.cer
ssh -i Exabroker.cer ubuntu@18.181.201.118

# インスタンス作る時
OS: ubuntu
ネットワーク: 3306ポートを開けておく(外部からmysql繋げる用)

mysql -u docker --port 3306 -h 18.181.201.118 -ppassword exabroker

# 初期設定
## clone
git clone https://github.com/mtsmtry/exabroker.git

## Docker入れる
sudo apt update
sudo apt install docker.io
sudo apt install docker-compose

sudo usermod -aG docker ubuntu # ルート無しでdockerを実行できるようにする

ここで一旦ログアウトして, 再度ログイン

# dockerコンテナのビルド
docker-compose build

# 動かす
## 起動
docker-compose up -d # バックグラウンドでコンテナをすべて起動

## 一部だけ起動
docker-compose up -d サービス名

## 動いてるか確認
docker-compose ps

## 終了
docker-compose down

## 一部だけ終了
docker-compose down サービス名