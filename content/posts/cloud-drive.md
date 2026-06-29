---
title: Cloud Drive — serverless file storage on AWS
date: 2026-03-13
slug: cloud-drive
thumb: /thumbs/cloud-drive.webp
tags: [aws, terraform, serverless, cognito]
summary: A Dropbox-lite with no servers — Cognito auth, S3 storage, a Lambda API, and CloudFront, all provisioned with Terraform.
draft: false
---

```
$ terraform -chdir=infra apply
[ ok ] cognito user pool + hosted ui
[ ok ] s3 (frontend + storage)
[ ok ] lambda api
[ ok ] cloudfront distribution
ready -> https://drive.brenodonascimento.com
```

[**Cloud Drive**](https://github.com/Breno30/Cloud-Drive) is a small cloud
storage app: log in, upload files, list them, delete them. The point wasn't the
feature list — it was building the whole thing **serverless and from code**, so
that `terraform apply` stands up the entire stack and `terraform destroy` takes
it back down. [Live demo →](https://drive.brenodonascimento.com/)

## The architecture

```
browser ──▶ CloudFront ──▶ S3 (static frontend)
   │
   ├──▶ Cognito Hosted UI        (sign-in / sign-up)
   │
   └──▶ Lambda (Python)  ──▶  S3 (your files)
```

No EC2, no containers, no database to patch. Everything is a managed service
glued together with **Terraform**.

## The pieces

- **Amazon Cognito** handles identity — user pool, app client, and the Hosted
  UI so I never store passwords or write a login screen. The browser comes back
  with a token; the API trusts it.
- **S3** does double duty: one bucket serves the static frontend, another holds
  user files.
- **Lambda (Python)** is the API — upload, list, delete. It scales to zero when
  nobody's using it and costs nothing at rest.
- **CloudFront** sits in front for HTTPS and global delivery.
- **IAM** roles wire it together with least-privilege policies — the Lambda can
  touch the storage bucket and nothing else.

## The login flow

```
CloudFront URL → redirect to Cognito → login → redirect back → dashboard
```

Offloading auth to Cognito was the decision I'm happiest with. Auth is the part
everyone gets subtly wrong; handing it to a managed service removed a whole
class of bugs and let me focus on the file handling.

## Why build it this way

Because it's how I'd build it at work. Infrastructure as Code means the repo
*is* the environment — reviewable, reproducible, and disposable. A teammate
clones it, sets a backend config, runs one command, and has an identical stack.
There's no "click around the console until it works" step to document.

> The whole environment lives in `infra/`. Delete the repo, delete the cloud.

It's a deliberately small app standing on a production-shaped foundation:
Cognito for auth, S3 for state, Lambda for compute, CloudFront at the edge,
Terraform holding it all — and a GitHub Actions pipeline to ship changes.

Code: [github.com/Breno30/Cloud-Drive](https://github.com/Breno30/Cloud-Drive)
