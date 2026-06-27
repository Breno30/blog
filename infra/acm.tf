# Certificate for CloudFront — MUST be in us-east-1.
# Created on the first apply so its DNS validation records are available as
# outputs. Add those CNAMEs at your registrar, then re-apply with
# enable_custom_domain = true.
resource "aws_acm_certificate" "cert" {
  provider                  = aws.us_east_1
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Waits for the certificate to reach ISSUED. Validation records are created
# manually at the external registrar, so validation_record_fqdns is omitted —
# this resource just blocks until AWS sees the cert as validated.
# Only engaged once you opt into the custom domain.
resource "aws_acm_certificate_validation" "cert" {
  count           = var.enable_custom_domain ? 1 : 0
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.cert.arn

  timeouts {
    create = "45m"
  }
}
