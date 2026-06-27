---
title: Private S3, public site — CloudFront OAC
date: 2026-06-27
slug: why-cloudfront-oac
tags: [aws, security, cloudfront]
summary: Why this blog uses a private bucket with Origin Access Control instead of S3 website hosting.
draft: false
---

The old way to host a static site on AWS was to flip an S3 bucket to "static
website hosting", make it public, and point a CNAME at it. It works, but the
bucket is wide open and you can't easily add HTTPS or security headers.

This blog does it the modern way:

- The S3 bucket stays **fully private** (Block Public Access on).
- **CloudFront Origin Access Control (OAC)** signs requests from the CDN to S3.
- The bucket policy only trusts that one distribution.

## The win

- No public bucket to misconfigure.
- Real HTTPS via ACM, terminated at the edge.
- Response headers policy adds HSTS, `X-Content-Type-Options`, and a CSP.
- A tiny CloudFront Function rewrites `/posts/foo/` to `/posts/foo/index.html`
  so clean URLs work without server logic.

It's a few more lines of Terraform, but the result is a site that's private at
rest and locked down at the edge.
