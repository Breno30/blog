---
title: Booting the blog
date: 2026-06-26
slug: booting-the-blog
tags: [meta, aws, security, cloudfront]
summary: First boot. How this blog is built, shipped, and locked down — static HTML on a private S3 bucket behind CloudFront.
draft: false
---

```
$ ./boot.sh
[ ok ] mounting markdown...
[ ok ] rendering static html...
[ ok ] syncing to s3...
[ ok ] invalidating cloudfront...
ready.
```

Welcome to the first post. This blog is intentionally boring infrastructure:
markdown files in a git repo, compiled to static HTML by a small Node script,
served from **S3 behind CloudFront**. No servers, no database, no runtime.

## How a post becomes a page

1. I write a `.md` file in `content/posts/`.
2. `build.js` parses the frontmatter and renders the body to HTML.
3. The output lands in `dist/posts/<slug>/index.html`.
4. A push to `main` triggers GitHub Actions, which syncs `dist/` to S3 and
   invalidates the CDN cache.

## Private S3, public site

The old way to host a static site on AWS was to flip an S3 bucket to "static
website hosting", make it public, and point a CNAME at it. It works, but the
bucket is wide open and you can't easily add HTTPS or security headers.

This blog does it the modern way:

- The S3 bucket stays **fully private** (Block Public Access on).
- **CloudFront Origin Access Control (OAC)** signs requests from the CDN to S3.
- The bucket policy only trusts that one distribution.

The payoff:

- No public bucket to misconfigure.
- Real HTTPS via ACM, terminated at the edge.
- Response headers policy adds HSTS, `X-Content-Type-Options`, and a CSP.
- A tiny CloudFront Function rewrites `/posts/foo/` to `/posts/foo/index.html`
  so clean URLs work without server logic.

It's a few more lines of Terraform, but the result is a site that's private at
rest and locked down at the edge.

## Why serverless

- Costs cents per month.
- Scales to zero when nobody's reading.
- Nothing to patch at 3am.

> The best server is the one you don't run.

More soon.

