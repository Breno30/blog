# Deploying your blog — the simple version

This guide gets your blog live on a public **S3 website** with the least possible
setup. No CloudFront, no certificate, no DNS — just a bucket serving HTML.

```
your markdown  →  build  →  S3 (public website)  →  http://...s3-website...
```

> Want a custom domain + HTTPS + CDN later? That's CloudFront. Flip
> `enable_cloudfront = true` and see the "Upgrade to CloudFront" note at the end.

You do the setup below **once**. After that, publishing is just `git push`.

---

## What you need first

- An **AWS account** with the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed and logged in (`aws sts get-caller-identity` should work).
- [Terraform](https://developer.hashicorp.com/terraform/install) installed.
- [Node.js 20+](https://nodejs.org/).
- This repo pushed to **GitHub**.

---

## Step 0 — Run it locally first

```bash
npm install
npm run dev      # opens http://localhost:8000
```

If the blog shows up, you're good. Stop it with `Ctrl+C`.

---

## Step 1 — Configure Terraform

```bash
cd infra
cp example.tfvars terraform.tfvars   # skip if it already exists
```

Open `terraform.tfvars`. For the simple S3-only path you only need:

```hcl
domain_name       = "blog.example.com"   # required, but unused while CloudFront is off
github_repo       = "your-username/blog"  # your GitHub repo
enable_cloudfront = false                 # ← the constant: keep false to skip CloudFront
```

`enable_cloudfront = false` is the switch. While it's off there's **no
CloudFront, no ACM cert, and no custom domain** — the site is served straight
from a public S3 website endpoint.

---

## Step 2 — Create the infrastructure

```bash
terraform init
terraform apply
```

Type `yes`. This creates the public S3 bucket (website hosting enabled) and the
GitHub deploy role. When it finishes, grab your live URL:

```bash
terraform output s3_website_url
```

That `http://...s3-website-....amazonaws.com` URL is your blog. It's empty until
the first deploy (next step).

---

## Step 3 — Turn on auto-deploy (GitHub Actions)

So every push deploys itself, give GitHub the values from `terraform output`.

In your GitHub repo: **Settings → Secrets and variables → Actions → Variables →
New repository variable**. Add these:

| Variable name          | Value                                              |
|------------------------|----------------------------------------------------|
| `AWS_REGION`           | `us-east-1` (or your region)                       |
| `AWS_DEPLOY_ROLE_ARN`  | output `deploy_role_arn`                            |
| `BUCKET`               | output `s3_bucket_name`                             |
| `SITE_URL`             | the `s3_website_url` value                          |

> **Leave `DISTRIBUTION_ID` unset.** The workflow auto-skips the CloudFront
> invalidation step when it's empty — exactly what we want for S3-only.

Run `terraform output` anytime to see these values again.

---

## Done! Your everyday workflow

```bash
# 1. Write a post  →  content/posts/my-new-post.md
# 2. Ship it:
git add .
git commit -m "New post"
git push
```

GitHub Actions builds the site and uploads it to S3. Live in a minute or two.

### Deploy manually (without pushing)

To build and upload straight from your machine — handy for the first fill or a
quick fix:

```bash
BUCKET=$(cd infra && terraform output -raw s3_bucket_name)
SITE_URL=$(cd infra && terraform output -raw s3_website_url) npm run build
aws s3 sync dist/ "s3://$BUCKET" --delete
```

`--delete` removes files from the bucket that no longer exist in `dist/`, so the
bucket always mirrors your latest build.

---

## Upgrade to CloudFront later (optional)

When you want HTTPS, a custom domain, and a CDN:

1. Set `enable_cloudfront = true` in `terraform.tfvars` and `terraform apply`.
2. Follow the certificate + DNS + custom-domain steps in [`README.md`](./README.md).
3. Add the `DISTRIBUTION_ID` repo variable (from `terraform output
   cloudfront_distribution_id`) and update `SITE_URL` to your `https://` domain.

---

## If something goes wrong

- **Build fails locally** → run `npm run build` and read the error.
- **403 / Access Denied on the S3 URL** → the deploy hasn't run yet (bucket is
  empty), or you opened the bucket's REST URL instead of the **website**
  endpoint from `s3_website_url`.
- **Push didn't deploy** → open the **Actions** tab on GitHub and read the log;
  usually a missing or misspelled repo variable from Step 3.
