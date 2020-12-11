locals {
  lambda_arn = "arn:aws:lambda:ap-northeast-1:203303191911:function:exabroker-scraping"
  lambda_name = "exabroker-scraping"
}

// S3

resource "aws_s3_bucket" "exabroker_crawled" {
  bucket = "exabroker-crawled"
  acl    = "private"
}

resource "aws_s3_bucket_notification" "exabroker_scraping_event" {
  bucket = aws_s3_bucket.exabroker_crawled.id

  lambda_function {
    lambda_function_arn = local.lambda_arn
    events              = ["s3:ObjectCreated:*"]
  }
}

resource "aws_lambda_permission" "exabroker_scraping_event" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = local.lambda_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.exabroker_crawled.arn
}

// Lambda

data "aws_iam_policy_document" "ExabrokerScrapingLambdaRoleAssumeRolePolicy" {
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

resource "aws_iam_role" "exabroker_scraping" {
  name               = "ExabrokerScrapingLambdaRole"
  path               = "/"
  assume_role_policy = data.aws_iam_policy_document.ExabrokerScrapingLambdaRoleAssumeRolePolicy.json
}

resource "aws_ecr_repository" "exabroker_scraping" {
  name                 = "exabroker-scraping"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

/*
resource "aws_lambda_function" "exabroker_scraping" {
  function_name = "exabroker-scraping"
  image_uri     = aws_ecr_repository.exabroker_scraping.repository_url
  handler       = "exports.handler"
  runtime       = "nodejs12.x"
  role          = aws_iam_role.exabroker_scraping.arn

  environment {
    variables = {
      "S3_ARN": aws_s3_bucket.exabroker_crawled.arn
    }
  }
}
*/