

resource "aws_rds_cluster_parameter_group" "default" {
  name        = "incentknow-sql-aurora-mysql57"
  family      = "aurora-mysql5.7"
  description = "For incentknow-sql, and characer set is utf8mb4"

  // https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.how-it-works.html#aurora-serverless.parameter-groups
  // 文字セットに関するパラメータはcharacter_set_server以外無視される

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }
}

resource "aws_db_subnet_group" "default" {
  description = "All subnets in incentknow-vpc"
  subnet_ids  = [aws_subnet.subnet_1a.id, aws_subnet.subnet_1c.id, aws_subnet.subnet_1d.id]
}

resource "aws_rds_cluster" "default" {
  cluster_identifier                  = "incentknow-aurora"
  availability_zones                  = ["ap-northeast-1a", "ap-northeast-1c", "ap-northeast-1d"]
  backtrack_window                    = 0
  master_username                     = "admin"
  master_password                     = "21280712"
  backup_retention_period             = 5
  port                                = 3306
  vpc_security_group_ids              = [aws_security_group.incentknow_vpc.id]
  db_subnet_group_name                = aws_db_subnet_group.default.name
  storage_encrypted                   = true
  skip_final_snapshot                 = false
  deletion_protection                 = true
  enable_http_endpoint                = true
  copy_tags_to_snapshot               = true
  iam_database_authentication_enabled = false
  iam_roles                           = []
  db_cluster_parameter_group_name     = aws_rds_cluster_parameter_group.default.name
  engine                              = "aurora-mysql"
  engine_mode                         = "serverless"

  scaling_configuration {
    auto_pause               = true
    max_capacity             = 4
    min_capacity             = 1
    seconds_until_auto_pause = 300
    timeout_action           = "RollbackCapacityChange"
  }
}


// terraformer import aws --resources=alb,ec2_instance,eip,ebs,igw,nat,rds,route_table,sg,subnet,vpc,vpc_peering --regions=ap-northeast-1 --profile=default

/*
mkdir -p .terraform.d/plugins/darwin_amd64
cd .terraform.d/plugins/darwin_amd64/
curl https://releases.hashicorp.com/terraform/0.14.0/terraform_0.14.0_darwin_amd64.zip
unzip terraform_0.14.0_darwin_amd64.zip

export PROVIDER=aws
curl -LO https://github.com/GoogleCloudPlatform/terraformer/releases/download/$(curl -s https://api.github.com/repos/GoogleCloudPlatform/terraformer/releases/latest | grep tag_name | cut -d '"' -f 4)/terraformer-${PROVIDER}-darwin-amd64
chmod +x terraformer-${PROVIDER}-darwin-amd64
sudo mv terraformer-${PROVIDER}-darwin-amd64 /usr/local/bin/terraformer

terraformer import aws --resources=alb,ec2_instance,eip,ebs,igw,nat,rds,route_table,sg,subnet,vpc,vpc_peering --regions=ap-northeast-1 --profile=default --path-pattern {output}/{provider}/{service}/{resource}.tf

*/
