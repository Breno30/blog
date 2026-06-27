# ---- DNS you must add at your registrar ----------------------------------

output "acm_validation_records" {
  description = "Add these CNAME records at your registrar to validate the certificate."
  value = [
    for o in aws_acm_certificate.cert.domain_validation_options : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  ]
}

output "custom_domain_target" {
  description = "Point your domain's CNAME/ALIAS at this CloudFront hostname."
  value       = aws_cloudfront_distribution.site.domain_name
}

# ---- Values for GitHub Actions repo variables -----------------------------

output "s3_bucket_name" {
  description = "BUCKET repo variable for the deploy workflow."
  value       = aws_s3_bucket.site.bucket
}

output "cloudfront_distribution_id" {
  description = "DISTRIBUTION_ID repo variable for the deploy workflow."
  value       = aws_cloudfront_distribution.site.id
}

output "deploy_role_arn" {
  description = "AWS_DEPLOY_ROLE_ARN repo secret/variable for the deploy workflow."
  value       = aws_iam_role.deploy.arn
}

# ---- Handy ----------------------------------------------------------------

output "cloudfront_url" {
  description = "Default CloudFront URL (works before the custom domain is wired up)."
  value       = "https://${aws_cloudfront_distribution.site.domain_name}"
}
