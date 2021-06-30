# Dockerコンテナで、クローラーを起動するスクリプト
# 5分ごとにプロセスを監視し、死んでいたら再度実行

import subprocess
import time


while True:
    result = subprocess.run(['npm', 'run', 'mainte'])
    if result.returncode != 0:
        print("異常終了: 再度実行")
        continue

    time.sleep(5 * 60)  # とりあえず5分に一回
