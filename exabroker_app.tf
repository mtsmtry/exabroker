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

resource "aws_iam_role_policy_attachment" "ECSTaskExecutionRole2" {
  role       = aws_iam_role.ECSTaskExecutionRole.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

// Cluster

resource "aws_ecs_cluster" "default" {
  name = "${local.service_name}-cluster"
}

// Repository

resource "aws_ecr_repository" "default" {
  name                 = "${local.service_name}-app"
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
    ECR_ARN        = "${aws_ecr_repository.default.repository_url}:0.1"
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

resource "aws_cloudwatch_log_group" "default" {
  name = "/ecs/${local.service_name}"
}

resource "aws_ecs_service" "default" {
  name                = "${local.service_name}-service"
  cluster             = aws_ecs_cluster.default.id
  task_definition     = aws_ecs_task_definition.default.arn
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

// ECS Scheduled Tasks
/*
data "aws_iam_policy_document" "ECSScheduledTasksRoleAssumeRolePolicy" {
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

resource "aws_iam_role" "ECSScheduledTasksRole" {
  name               = "ECSScheduledTasksRole"
  assume_role_policy = data.aws_iam_role_policy_document.ECSScheduledTasksRoleAssumeRolePolicy.json
}
 
resource "aws_iam_role_policy_attachment" "ECSScheduledTasksRole" {
  role               = aws_iam_role.ecsscheduledtasks_role.name
  policy_arn         = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceEventsRole"
}

resource "aws_cloudwatch_event_rule" "exabroker_worker" {
  name                  = "ExabrokerWorker"
  description           = "ExabrokerWorker"
  schedule_expression   = "cron(0 9 ? * MON-FRI *)"
}

data "template_file" "container_overrides" {
  template = file("exabroker_containerOverrides.json")
  vars = {
    CONTAINER_NAME = "${local.service_name}-app"
  }
}
 
resource "aws_cloudwatch_event_target" "exabroker_worker" {
  target_id      = "ExabrokerWorker"
  arn            = aws_ecs_cluster.default.arn
  rule           = aws_cloudwatch_event_rule.exabroker_worker.name
  role_arn       = aws_iam_role.ECSScheduledTasksRole.arn
  input          = data.template_file.container_overrides.rendered
 
  ecs_target {
    launch_type               = "FARGATE"
    task_count                = 1
    task_definition_arn       = aws_ecs_task_definition.default.arn
    platform_version          = "0.1"
    network_configuration {
      subnets          = [aws_subnet.subnet_1c.id, aws_subnet.subnet_1a.id, aws_subnet.subnet_1d.id]
      security_groups  = [aws_security_group.incentknow_vpc.id]
      assign_public_ip = true
    }
  }
}*/