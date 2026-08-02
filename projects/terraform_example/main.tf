terraform {
  required_version = ">= 1.8"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {}

variable "project_name" {
  type        = string
  description = "Name of the project"
  default     = "devops-eval"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "dev"
}

# ------------------------------------------------------------------------------
# S3 Bucket with Versioning & Server-Side Encryption
# ------------------------------------------------------------------------------

resource "aws_s3_bucket" "app_bucket" {
  bucket = "${var.project_name}-${var.environment}-app-data"

  tags = {
    Name        = "${var.project_name}-${var.environment}-app-data"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "app_bucket_versioning" {
  bucket = aws_s3_bucket.app_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_bucket_encryption" {
  bucket = aws_s3_bucket.app_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access to adhere to modern S3 security baseline
resource "aws_s3_bucket_public_access_block" "app_bucket_privacy" {
  bucket = aws_s3_bucket.app_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ------------------------------------------------------------------------------
# IAM Role & Least Privilege Policies for Lambda
# ------------------------------------------------------------------------------

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "${var.project_name}-${var.environment}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

# Dedicated CloudWatch log write policy (least privilege)
data "aws_iam_policy_document" "lambda_logging" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "${aws_cloudwatch_log_group.lambda_logs.arn}:*"
    ]
  }
}

resource "aws_iam_policy" "lambda_logging" {
  name        = "${var.project_name}-${var.environment}-lambda-logging-policy"
  description = "IAM policy for logging from a lambda"
  policy      = data.aws_iam_policy_document.lambda_logging.json
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_logging.arn
}

# ------------------------------------------------------------------------------
# CloudWatch Log Group
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-function"
  retention_in_days = 14
}

# ------------------------------------------------------------------------------
# Lambda Function & Packaging
# ------------------------------------------------------------------------------

data "archive_file" "lambda_dummy" {
  type        = "zip"
  output_path = "${path.module}/lambda_function.zip"

  source {
    content  = <<EOF
exports.handler = async (event) => {
    return {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };
};
EOF
    filename = "index.js"
  }
}

resource "aws_lambda_function" "app_lambda" {
  filename         = data.archive_file.lambda_dummy.output_path
  function_name    = "${var.project_name}-${var.environment}-function"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.js.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_dummy.output_base64sha256

  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cloudwatch_log_group.lambda_logs
  ]
}
