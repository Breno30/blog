locals {
  bucket_name = coalesce(
    var.bucket_name,
    "${var.project_name}-${data.aws_caller_identity.current.account_id}"
  )
}

resource "aws_s3_bucket" "site" {
  bucket = local.bucket_name

  # Let `terraform destroy` empty the bucket (incl. all object versions) first.
  # Safe here: the content is disposable — it's rebuilt from git on every deploy.
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket            = aws_s3_bucket.site.id
  block_public_acls = true
  ignore_public_acls = true
  # With CloudFront the bucket is fully private (read via OAC only). Without it
  # the bucket must allow a public read policy to serve as a website.
  block_public_policy     = var.enable_cloudfront
  restrict_public_buckets = var.enable_cloudfront
}

# S3 static-website hosting. Only used when CloudFront is disabled; this is the
# endpoint visitors hit directly.
resource "aws_s3_bucket_website_configuration" "site" {
  count  = var.enable_cloudfront ? 0 : 1
  bucket = aws_s3_bucket.site.id

  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "404.html"
  }
}

resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Grant read ONLY to this CloudFront distribution via OAC. Bucket stays private.
data "aws_iam_policy_document" "bucket_oac" {
  count = var.enable_cloudfront ? 1 : 0
  statement {
    sid       = "AllowCloudFrontOAC"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site[0].arn]
    }
  }
}

# Public read for everyone — used when serving the bucket as a website directly.
data "aws_iam_policy_document" "bucket_public" {
  count = var.enable_cloudfront ? 0 : 1
  statement {
    sid       = "AllowPublicRead"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = var.enable_cloudfront ? data.aws_iam_policy_document.bucket_oac[0].json : data.aws_iam_policy_document.bucket_public[0].json

  # The public-access-block must be relaxed before a public policy is accepted.
  depends_on = [aws_s3_bucket_public_access_block.site]
}
