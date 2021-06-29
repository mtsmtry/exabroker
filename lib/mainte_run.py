# Copyright (c) 2021 Hiroki Takemura (kekeho)
# 
# This software is released under the MIT License.
# https://opensource.org/licenses/MIT

import time
import subprocess

while True:
    subprocess.run(['npm', 'run', 'mainte'])
    time.sleep(60*10)  # 10分sleep
