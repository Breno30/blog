# Remote state in S3. The state bucket must exist BEFORE `terraform init`.
# Bootstrap it once (see README "One-time bootstrap"), then fill in the values
# below and run `terraform init -migrate-state`.
#
# Until you bootstrap, leave this block commented out to use local state.

# terraform {
#   backend "s3" {
#     bucket       = "terminal-blog-tfstate-<ACCOUNT_ID>"
#     key          = "blog/terraform.tfstate"
#     region       = "us-east-1"
#     encrypt      = true
#     use_lockfile = true # S3-native state locking (Terraform >= 1.10)
#   }
# }
