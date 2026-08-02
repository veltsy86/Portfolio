# DevOps Infrastructure Supervision Notes

### 1. What AI tool(s) did you use?
* Primary: Gemini (Internal standard context session) for scaffolding and initial checks.

---

### 2. What did you remove or trim from the AI's output, and why?
* **Deprecated S3 Inline Attributes:** AI models frequently attempt to include `versioning` block inline inside `aws_s3_bucket` or use `acl = "private"`. In modern AWS providers (v4+ through v6), inline versioning/ACL definitions are either deprecated or removed in favor of explicit `aws_s3_bucket_versioning` and `aws_s3_bucket_server_side_encryption_configuration` resources.
* **Redundant AWS Managed IAM Policies:** The AI attempted to attach `arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`. While standard, `AWSLambdaBasicExecutionRole` permits `logs:CreateLogGroup` broadly (`*`). Because our requirement asked for least-privilege IAM *and* we provision an explicit `aws_cloudwatch_log_group`, granting `logs:CreateLogGroup` is redundant and over-permissioned. I trimmed the managed policy and replaced it with a targeted inline custom IAM document.
* **Unnecessary `locals` Blocks:** The AI introduced `locals { name_prefix = "${var.project_name}-${var.environment}" }`. While clean, the prompt constraints explicitly disallowed `locals` unless strictly necessary. Directly interpolating variables inline kept the codebase strictly minimal and fully compliant without sacrificing readability.
* **Auxiliary Files:** Removed separate `variables.tf`, `outputs.tf`, and inline external script builders proposed by the LLM to fit everything cleanly in one root configuration file.

---

### 3. What mistake did the AI make that you had to correct?
* **Resource Dependency Race Condition on Logging:** The AI generated the `aws_cloudwatch_log_group` resource without linking its scope to the IAM policy resource block properly. Furthermore, it omitted an explicit `depends_on` on the `aws_lambda_function`. When Lambda runs or provisions, if the IAM policy isn't fully propagated, or if the Lambda automatically creates its log group *before* standard Terraform state registration finishes, log permission errors occur. I corrected the IAM policy resource wildcard scope (`${aws_cloudwatch_log_group.lambda_logs.arn}:*`) and attached explicit `depends_on` tags to guarantee IAM propagation prior to Lambda instantiation.
* **`archive_file` Provider Syntax:** AI generated a local path assumption expecting a physically pre-zipped file (`filename = "function.zip"`). I replaced this with an inline `archive_file` data block creating the `index.js` zip dynamic archive on-the-fly, ensuring `terraform validate` and `terraform plan/apply` pass cleanly out-of-the-box without requiring prior execution of build scripts.

---

### 4. If you had another hour, what would you improve?
* **KMS Customer Managed Key (CMK):** Replace basic `AES256` default S3 encryption with a custom KMS key resource featuring proper key rotation policy and dedicated Lambda decrypt policy statements.
* **CloudWatch Log Encryption & Insights:** Add KMS encryption keys to the `aws_cloudwatch_log_group` and configure metric filters/alarms for Lambda execution errors (`4xx`/`5xx` rates).
* **S3 Security Baseline Extensions:** Enable S3 Object Ownership (`BucketOwnerEnforced`), strict SSL enforcement bucket policies (`aws:SecureTransport`), and lifecycle rules for cost-effective log/version retention.
* **Dead Letter Queues (DLQ):** Attach an SQS DLQ configuration to the Lambda function to handle asynchronous execution failures gracefully.
