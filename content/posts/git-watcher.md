---
title: Git-Watcher — GitHub activity on an ESP32
date: 2024-08-25
slug: git-watcher
thumb: /thumbs/git-watcher.webp
tags: [hardware, esp32, webhooks, github]
summary: A desk gadget that reacts to GitHub webhooks — ESP32, C++, and a webhook tunnel that turns repo events into something you can see.
draft: false
---

```
$ git push
   ...
[esp32] ◀── webhook ── github   "push received"
```

Most of the systems I work on are invisible — events fly between services and
you only see them in logs. [**Git-Watcher**](https://github.com/Breno30/Git-Watcher)
is the opposite: a little **ESP32** on my desk that physically reacts when
something happens on a GitHub repo. It's a hardware hack, and also an excuse to
take webhooks apart and really understand them.

## How it works

```
GitHub ──webhook──▶ ngrok tunnel ──▶ ESP32 (:80) ──▶ display
```

The ESP32 runs a tiny HTTP server on port 80. GitHub fires a **webhook** on repo
events, an [ngrok](https://ngrok.com) tunnel exposes the device's local address
to the internet, and the board parses the incoming payload and shows it.

The whole firmware is one `main.ino` in C++ — connect to WiFi, listen for POSTs,
read the event, react. Setup is deliberately blunt: flash the board, read the
local IP off the display, point an ngrok tunnel at it, paste the URL into
GitHub's webhook settings. Done.

## The honest part

ngrok is a development tunnel, not production plumbing. It's perfect for a desk
toy — zero infra, instant public URL — but it's not how I'd ship this for real.

## Why I built it

Event-driven systems are the backbone of modern infrastructure — webhooks,
queues, pub/sub. Building a device that sits at the receiving end forced me to
understand the full path: what GitHub actually sends, how to receive it, how to
expose a private endpoint to a public sender, and where that approach breaks.

> The best way to learn a protocol is to build the thing on the other end of it.

It's a small board blinking at `git push`. It's also a hands-on map of how an
event gets from a service in the cloud to a box on your desk.

Code: [github.com/Breno30/Git-Watcher](https://github.com/Breno30/Git-Watcher)
