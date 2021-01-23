locals {
  lambda_sync_arn = "arn:aws:lambda:ap-northeast-1:203303191911:function:exabroker-sync"
  lambda_sync_name = "exabroker-sync"
}

// Event

//resource "aws_cloudwatch_event_rule" "sync" {
//    name                = "exabroker_sync"
//    description         = "Fires every five minutes"
 //   schedule_expression = "cron(*/5 * * * ? *)"
//}
/*
resource "aws_cloudwatch_event_target" "sync" {
    rule      = aws_cloudwatch_event_rule.sync.name
    target_id = "output_report"
    arn       = local.lambda_sync_arn
}

resource "aws_lambda_permission" "sync" {
    statement_id  = "AllowExecutionFromCloudWatch"
    action        = "lambda:InvokeFunction"
    function_name = local.lambda_sync_name
    principal     = "events.amazonaws.com"
    source_arn    = aws_cloudwatch_event_rule.sync.arn
}*/


// Role

data "aws_iam_policy_document" "ExabrokerSyncLambdaRoleAssumeRolePolicy" {
  statement {
    effect = "Allow"
    actions = [
      "sts:AssumeRole"
    ]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "ExabrokerSyncLambdaRole" {
  role       = aws_iam_role.exabroker_sync.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role" "exabroker_sync" {
  name               = "ExabrokerSyncLambdaRole"
  path               = "/"
  assume_role_policy = data.aws_iam_policy_document.ExabrokerSyncLambdaRoleAssumeRolePolicy.json
}

// Repository

resource "aws_ecr_repository" "exabroker_sync" {
  name                 = "exabroker-sync"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_cloudwatch_log_group" "sync" {
  name = "/aws/lambda/exabroker-sync"
}