---
title: Booting the blog
date: 2026-06-26
slug: booting-the-blog
tags: [meta, aws]
summary: First boot. How this blog is built and shipped.
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

## Why serverless

- Costs cents per month.
- Scales to zero when nobody's reading.
- Nothing to patch at 3am.

> The best server is the one you don't run.

More soon.

