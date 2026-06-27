# terminal-blog

A serverless markdown blog with a terminal aesthetic, hosted on AWS.

```
markdown -> node build -> dist/ -> S3 (private) -> CloudFront (OAC) -> your domain
```

No servers, no database, no framework. A small Node script renders markdown to
static HTML; Terraform provisions a private S3 bucket behind CloudFront; GitHub
Actions deploys on every push to `main` using OIDC (no static AWS keys).

## Repository layout

| Path | What |
|------|------|
| `content/posts/*.md` | Blog posts (frontmatter + markdown). |
| `content/pages/*.md` | Standalone pages (e.g. `about`). |
| `templates/` | `base`, `index`, `post` HTML with `{{token}}` slots. |
| `static/` | `style.css` (terminal theme), `favicon.svg`, `404.html`. |
| `build.js` | The build: md -> `dist/` with pretty URLs, RSS, sitemap. |
| `site.config.js` | Site title, author, URL, footer links. |
| `serve.js` | Local preview server (mirrors CloudFront pretty URLs). |
| `infra/` | Terraform: S3 + CloudFront + ACM + GitHub OIDC. |
| `.github/workflows/deploy.yml` | Build + deploy pipeline. |

## Writing a post

Create `content/posts/my-post.md`:

```markdown
---
title: My post
date: 2026-06-26
slug: my-post        # optional; defaults to filename
tags: [aws, notes]
summary: One-line description for RSS.
draft: false         # true hides it from the build
---

Body in **markdown**.
```

## Local development

```bash
npm install
npm run build        # -> dist/
npm run dev          # build + serve at http://localhost:8000
```

## Deploying — one-time setup

### 1. Bootstrap remote Terraform state (once)

Create the state bucket, then enable the backend block in `infra/backend.tf`:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws s3 mb "s3://terminal-blog-tfstate-$ACCOUNT_ID" --region us-east-1
aws s3api put-bucket-versioning \
  --bucket "terminal-blog-tfstate-$ACCOUNT_ID" \
  --versioning-configuration Status=Enabled
```

Edit `infra/backend.tf` (uncomment + fill the account id), then:

```bash
cd infra
terraform init   # -migrate-state if you already had local state
```

> Prefer to skip remote state for now? Leave `backend.tf` commented and use
> local state. You can migrate later.

### 2. First apply — creates infra + the (pending) certificate

```bash
cp example.tfvars terraform.tfvars   # edit domain_name + github_repo
terraform apply                      # enable_custom_domain stays false
```

Note the outputs:

- `acm_validation_records` — **add these CNAMEs at your registrar.**
- `custom_domain_target` — the CloudFront hostname for your domain's CNAME.
- `cloudfront_url` — works immediately for testing.

### 3. Validate the cert, then second apply

Wait until the ACM certificate shows **ISSUED** (after DNS propagates), then:

```bash
terraform apply -var enable_custom_domain=true
```

This attaches the custom domain + HTTPS cert to CloudFront. Add a CNAME (or
ALIAS) for your domain pointing at `custom_domain_target`.

### 4. Wire up GitHub Actions

In the GitHub repo, set these **Actions → Variables** (from `terraform output`):

| Variable | Value |
|----------|-------|
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_DEPLOY_ROLE_ARN` | `deploy_role_arn` |
| `BUCKET` | `s3_bucket_name` |
| `DISTRIBUTION_ID` | `cloudfront_distribution_id` |
| `SITE_URL` | `https://your-domain` (for absolute RSS/sitemap links) |

Push to `main`. The workflow builds, syncs `dist/` to S3, and invalidates the CDN.

## How it stays secure

- S3 bucket is **private** (Block Public Access); only CloudFront can read it via
  Origin Access Control.
- HTTPS terminated at the edge with an ACM cert; HTTP redirects to HTTPS.
- Response headers policy adds HSTS, `X-Content-Type-Options`, frame denial, and
  a CSP.
- CI authenticates with short-lived OIDC tokens scoped to `main` — no stored keys.

## SEO

Generated automatically by `build.js` for every page:

- Per-page `<title>`, meta description, and `<link rel="canonical">`.
- **Open Graph** + **Twitter Card** tags (posts use `og:type=article` with
  `article:published_time` / `article:tag`).
- **JSON-LD** structured data (`BlogPosting` for posts, `WebSite` for the home).
- Semantic markup: one `<h1>` per page, `<article>`, `<time datetime>`.
- `sitemap.xml` (with `lastmod`), `robots.txt` pointing at it, and an RSS feed
  with `atom:self` + categories. The 404 page is `noindex`.

> **Set `SITE_URL`** (repo variable / env) to your real `https://…` origin — all
> canonical, OG, sitemap, and RSS links are absolute and built from it. Without
> it the build falls back to the `site.config.js` `url`.

Optional in `site.config.js`: `image` (a 1200×630 social-share image) and
`twitter` (@handle) — both are emitted into the cards when set.

## Cost

Roughly **under $1/month** at personal-blog traffic (S3 + CloudFront), excluding
domain registration.
