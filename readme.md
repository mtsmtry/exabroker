https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/ECS_AWSCLI_Fargate.html

0. 基本概念
    クラスター: プロジェクト単位
    タスク定義: ハードウェアの構成を定義する
    サービス: タスク定義を用いた実行構成を定義する(Subnet, SG, Public IP, ...etc)

1. クラスターを作成する
    入力
    ```
    aws ecs create-cluster --cluster-name giga-order-cluster
    ```
    出力
    ```
    {
        "cluster": {
            "activeServicesCount": 0,
            "statistics": [],
            "tags": [],
            "settings": [
                {
                    "name": "containerInsights",
                    "value": "disabled"
                }
            ],
            "capacityProviders": [],
            "defaultCapacityProviderStrategy": []
        }
    }
    ```

2. タスク定義を登録する
    ```
    aws ecs register-task-definition --cli-input-json file://amazonDownloader/aws/task.json
    ```
    ```
    {
        "taskDefinition": {
            "taskDefinitionArn": "arn:aws:ecs:ap-northeast-1:203303191911:task-definition/giga-order-task:1",
            "containerDefinitions": [
                {
                    "name": "giga-order-app",
                    "image": "httpd:2.4",
                    "cpu": 0,
                    "portMappings": [
                        {
                            "containerPort": 80,
                            "hostPort": 80,
                            "protocol": "tcp"
                        }
                    ],
                    "essential": true,
                    "entryPoint": [
                        "sh",
                        "-c"
                    ],
                {
                    "name": "com.amazonaws.ecs.capability.docker-remote-api.1.18"
                },
                {
                    "name": "ecs.capability.task-eni"
                }
            ],
            "placementConstraints": [],
            "compatibilities": [
                "EC2",
                "FARGATE"
            ],
            "requiresCompatibilities": [
                "FARGATE"
            ],
            "cpu": "256",
            "memory": "512"
        }
    }
    ```

3. タスク定義をリスト表示する
    ```
    aws ecs list-task-definitions
    ```

    ```
    {
        "taskDefinitionArns": [
            "arn:aws:ecs:ap-northeast-1:203303191911:task-definition/crawling-task-definition:1",
            "arn:aws:ecs:ap-northeast-1:203303191911:task-definition/giga-order-task:1"
        ]
    }
    ```

4. サービスを作成する
    ```
    aws ecs create-service 
        --cluster giga-order-cluster 
        --service-name giga-order-service 
        --task-definition giga-order-task:1 
        --desired-count 1 
        --launch-type "FARGATE" 
        --network-configuration "awsvpcConfiguration={subnets=[subnet-9b2182b0],securityGroups=[sg-0401a7f8d4141b436],assignPublicIp=ENABLED}"
    ```

5. サービスをリスト表示する
    ```
    aws ecs list-services --cluster giga-order-cluster
    ```

6. 実行中のサービスを記述する
    ```
    aws ecs describe-services --cluster giga-order-cluster --services giga-order-service > output.json
    ```

7. クリーンアップ
    ```
    aws ecs delete-service --cluster giga-order-cluster --service giga-order-service --force
    aws ecs delete-cluster --cluster giga-order-cluster
    ```