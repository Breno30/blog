# Copy to terraform.tfvars and edit. terraform.tfvars is gitignored.

domain_name = "blog.example.com"
github_repo = "your-gh-username/blog"

# Optional extras:
# subject_alternative_names = ["www.blog.example.com"]
# aws_region                = "us-east-1"
# project_name              = "terminal-blog"

# Flip to true on the SECOND apply, after the ACM validation records are added
# at your registrar and the certificate is ISSUED.
enable_custom_domain = false
