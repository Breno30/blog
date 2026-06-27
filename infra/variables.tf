variable "aws_region" {
  description = "Region for the S3 content bucket and IAM (CloudFront is global; ACM is pinned to us-east-1)."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name prefix for resources."
  type        = string
  default     = "terminal-blog"
}

variable "bucket_name" {
  description = "Override the content bucket name. Defaults to <project>-<account_id> (globally unique)."
  type        = string
  default     = null
}

variable "domain_name" {
  description = "Primary custom domain, e.g. blog.example.com."
  type        = string
}

variable "subject_alternative_names" {
  description = "Extra domains for the cert / CloudFront aliases (e.g. apex + www)."
  type        = list(string)
  default     = []
}

variable "enable_custom_domain" {
  description = <<-EOT
    Attach the custom domain + ACM cert to CloudFront.
    Leave false on the FIRST apply (creates the cert and prints DNS validation
    records). After you add those records at your registrar and the cert is
    ISSUED, set true and apply again.
  EOT
  type        = bool
  default     = false
}

variable "github_repo" {
  description = "GitHub repo allowed to assume the deploy role, as OWNER/REPO."
  type        = string
}

variable "github_branch" {
  description = "Branch allowed to deploy."
  type        = string
  default     = "main"
}

variable "create_oidc_provider" {
  description = "Create the GitHub OIDC provider. Set false if it already exists in the account."
  type        = bool
  default     = true
}
