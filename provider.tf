provider "aws" {
  region = "ap-northeast-1"
  access_key = "AKIAS6VOQQVTUYGDLO7I"
  secret_key = "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"
}

terraform {
  required_providers {
    aws = {
      version = "~> 3.20.0"
    }
  }
}


