locals {
  lambda_sync_arn = "arn:aws:lambda:ap-northeast-1:203303191911:function:exabroker-scraping"
  lambda_sync_name = "exabroker-sync"
}

resource "aws_cloudwatch_event_rule" "sync" {
    name                = "exabroker_sync"
    description         = "Fires every ten minutes"
    schedule_expression = "cron(*/5 * * * ? *)"
}

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
}

// Repository

resource "aws_ecr_repository" "exabroker_sync" {
  name                 = "exabroker-sync"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}