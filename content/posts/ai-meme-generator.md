---
title: An AI meme generator on AWS Bedrock
date: 2025-06-29
slug: ai-meme-generator
thumb: /thumbs/ai-meme-generator.jpg
tags: [aws, bedrock, serverless, ai]
summary: Wiring generative AI into a serverless app — a Python Lambda calls Claude 3 Haiku on Bedrock to caption memes, no GPUs required.
draft: false
---

```
$ curl $WEBSITE_URL/generate -d '{"topic":"monday standups"}'
{ "caption": "..." }   # straight from Claude, via Bedrock
```

The [**Pooh Meme Generator**](https://github.com/Breno30/pooh-meme-generator) is
a silly app with a serious backend: you give it a topic, a model writes the
caption, and you get a Winnie-the-Pooh meme to download or share. The reason it
exists is the question behind it — *how do you put generative AI into a real,
deployable app without running any AI infrastructure yourself?*
[Live demo →](https://meme.brenodonascimento.com/)

## The architecture

```
[browser] ──prompt──▶ [Lambda] ──invoke──▶ [Bedrock: Claude 3 Haiku]
                          │                          │
                          └────────── caption ◀──────┘
```

A static frontend on S3, a Python **Lambda** as the glue, and **Amazon Bedrock**
doing the language generation. The whole thing is serverless and provisioned
with Terraform.

## Why Bedrock

There's no model to host, no GPU instance to keep warm, no inference server to
babysit. Bedrock exposes the model behind an API and bills per token. From the
Lambda it's a single `InvokeModel` call, and access is governed by **IAM** like
any other AWS service — the function gets a tightly scoped policy and nothing
more.

The model is pinned in Terraform as a variable:

```hcl
TF_VAR_model_id = "anthropic.claude-3-haiku-20240307-v1:0"
```

I chose **Claude 3 Haiku** on purpose: captions are short and need to come back
fast, so the smallest, cheapest, lowest-latency model is the right tool.
Swapping models later is a one-line change — the infra doesn't care which model
ID it points at.

## Tuning the Lambda

```hcl
TF_VAR_lambda_memory_size = 512
TF_VAR_lambda_timeout     = 10
```

512 MB is plenty for a function whose real work is a network call to Bedrock,
and a 10-second timeout comfortably covers generation while still failing fast
if something hangs. Right-sizing here is the difference between a function that
costs cents and one that quietly wastes money.

## What it demonstrates

- **Generative AI on managed infrastructure** — Bedrock instead of self-hosted
  models.
- **Serverless integration** — Lambda calling an AI service, secured with IAM.
- **Infrastructure as Code** — the model, the function, and its limits are all
  declared in Terraform and shipped through CI.

It's a meme generator. It's also a working pattern for adding AI features to a
cloud app without standing up a single GPU.

Code: [github.com/Breno30/pooh-meme-generator](https://github.com/Breno30/pooh-meme-generator)
