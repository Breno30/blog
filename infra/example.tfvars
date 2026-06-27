# Copy to terraform.tfvars and edit. terraform.tfvars is gitignored.

# ---- Required ----------------------------------------------------------------

github_repo = "your-gh-username/blog" # OWNER/REPO allowed to deploy

# Required by Terraform, but UNUSED while enable_cloudfront = false (no custom
# domain without CloudFront). Set it to your real domain when you upgrade.
domain_name = "blog.example.com"

# ---- Hosting mode ------------------------------------------------------------

# false = serve straight from a public S3 website (HTTP, no CDN) — simplest.
# true  = put CloudFront in front (HTTPS + CDN + custom domain).
enable_cloudfront = false

# ---- CloudFront-only options (ignored while enable_cloudfront = false) -------

# Attach the custom domain + ACM cert. Flip to true on the SECOND apply, after
# the ACM validation records are added at your registrar and the cert is ISSUED.
enable_custom_domain = false

# subject_alternative_names = ["www.blog.example.com"]

# ---- Optional ----------------------------------------------------------------

# aws_region   = "us-east-1"
# project_name = "terminal-blog"
