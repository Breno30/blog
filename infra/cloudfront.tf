resource "aws_cloudfront_origin_access_control" "site" {
  count                             = var.enable_cloudfront ? 1 : 0
  name                              = "${var.project_name}-oac"
  description                       = "OAC for ${local.bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "rewrite" {
  count   = var.enable_cloudfront ? 1 : 0
  name    = "${var.project_name}-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite pretty URLs to index.html"
  publish = true
  code    = file("${path.module}/functions/rewrite.js")
}

# Managed cache policy tuned for static content.
data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_response_headers_policy" "security" {
  count = var.enable_cloudfront ? 1 : 0
  name  = "${var.project_name}-security-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    # CSP is a managed security header — it must live here, not in
    # custom_headers_config (CloudFront rejects it as a custom header).
    # The script-src sha256 is the hash of the inline "no-js -> js" flip
    # in templates/base.html. If that one-liner changes, recompute with:
    #   printf '%s' '<script body>' | openssl dgst -sha256 -binary | openssl base64
    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self' 'sha256-tlTtfpdsMQSdcfX3DLM1fgx/y++BLw+48vFj+5cTJa0='; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
      override                = true
    }
  }
}

resource "aws_cloudfront_distribution" "site" {
  count               = var.enable_cloudfront ? 1 : 0
  enabled             = true
  is_ipv6_enabled     = true
  comment             = var.project_name
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # NA + EU; cheapest. Widen if needed.

  aliases = var.enable_custom_domain ? concat([var.domain_name], var.subject_alternative_names) : []

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-site"
    origin_access_control_id = aws_cloudfront_origin_access_control.site[0].id
  }

  default_cache_behavior {
    target_origin_id           = "s3-site"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security[0].id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite[0].arn
    }
  }

  # S3 + OAC returns 403 for missing keys; serve our 404 page.
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }
  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.enable_custom_domain ? null : true
    acm_certificate_arn            = var.enable_custom_domain ? aws_acm_certificate.cert.arn : null
    ssl_support_method             = var.enable_custom_domain ? "sni-only" : null
    minimum_protocol_version       = var.enable_custom_domain ? "TLSv1.2_2021" : null
  }

  # Only attach the custom domain after the cert is validated/issued.
  depends_on = [aws_acm_certificate_validation.cert]
}
