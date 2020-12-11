locals {
  service_name = "exabroker"
}

// ECSTaskExecutionRole 

data "aws_iam_policy_document" "ECSTaskExecutionRoleAssumeRolePolicy" {
  statement {
    effect = "Allow"
    actions = [
      "sts:AssumeRole"
    ]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ECSTaskExecutionRole" {
  name               = "ECSTaskExecutionRole"
  path               = "/"
  assume_role_policy = data.aws_iam_policy_document.ECSTaskExecutionRoleAssumeRolePolicy.json
}

resource "aws_iam_role_policy_attachment" "ECSTaskExecutionRole" {
  role       = aws_iam_role.ECSTaskExecutionRole.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

// Cluster

resource "aws_ecs_cluster" "default" {
  name = "${local.service_name}-cluster"
}

// Repository

resource "aws_ecr_repository" "default" {
  name                 = "${local.service_name}-app-repository"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

// Task definition

data "template_file" "container_defininitions" {
  template = file("exabroker_containerDefinitions.json")
  vars = {
    CONTAINER_NAME = "${local.service_name}-app"
    SERVICE_NAME   = local.service_name
    ECR_ARN        = aws_ecr_repository.default.repository_url
  }
}

resource "aws_ecs_task_definition" "default" {
  family                   = "${local.service_name}-task"
  container_definitions    = data.template_file.container_defininitions.rendered
  network_mode             = "awsvpc"
  task_role_arn            = aws_iam_role.ECSTaskExecutionRole.arn
  execution_role_arn       = aws_iam_role.ECSTaskExecutionRole.arn
  cpu                      = 512
  memory                   = 1024
  requires_compatibilities = ["FARGATE"]
}

// Service

resource "aws_ecs_service" "default" {
  name                = "${local.service_name}-service"
  cluster             = aws_ecs_cluster.default.id
  task_definition     = aws_ecs_task_definition.default.arn
  //iam_role            = aws_iam_role.ECSServiceRole.arn
  desired_count       = 1
  launch_type         = "FARGATE"
  scheduling_strategy = "REPLICA"

  deployment_controller {
    type = "ECS"
  }

  network_configuration {
    subnets          = [aws_subnet.subnet_1c.id, aws_subnet.subnet_1a.id, aws_subnet.subnet_1d.id]
    security_groups  = [aws_security_group.incentknow_vpc.id]
    assign_public_ip = true
  }

  depends_on = [ aws_iam_role.ECSTaskExecutionRole ]
}
