// Custom static-site build: markdown -> HTML in dist/.
// No framework. Deps: markdown-it, markdown-it-anchor, gray-matter.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import site from "./site.config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const CONTENT = path.join(ROOT, "content");
const TEMPLATES = path.join(ROOT, "templates");
const STATIC = path.join(ROOT, "static");

const md = new MarkdownIt({ html: true, linkify: true, typographer: true }).use(
  anchor,
  { permalink: anchor.permalink.headerLink(), level: [2, 3] }
);

// --- tiny helpers ---------------------------------------------------------
const read = (p) => fs.readFileSync(p, "utf8");

const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

// {{token}} replacement. Missing tokens become "".
const render = (tpl, vars) =>
  tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (k in vars ? vars[k] : ""));

const fmtDate = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
};

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// --- SEO helpers ----------------------------------------------------------
const SITE_URL = (site.url || "").replace(/\/$/, "");
const absUrl = (p) => (/^https?:\/\//.test(p) ? p : SITE_URL + p);
const iso = (d) => new Date(d).toISOString();

// JSON-LD structured data for one page.
function jsonLd(opts, url, title, desc) {
  let data;
  if (opts.type === "article") {
    data = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description: desc,
      url,
      mainEntityOfPage: url,
      datePublished: iso(opts.date),
      dateModified: iso(opts.modified || opts.date),
      author: { "@type": "Person", name: site.author },
      publisher: { "@type": "Person", name: site.author },
    };
    if ((opts.tags || []).length) data.keywords = opts.tags.join(", ");
    if (site.image) data.image = absUrl(site.image);
  } else {
    data = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.title,
      url: SITE_URL + "/",
      description: site.description,
    };
  }
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

// Canonical + Open Graph + Twitter + JSON-LD for the <head>.
function seoHead(opts) {
  const url = absUrl(opts.path);
  const title = opts.ogTitle;
  const desc = opts.description;
  const out = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${opts.type}" />`,
    `<meta property="og:site_name" content="${esc(site.title)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:locale" content="${(site.lang || "en").replace("-", "_")}" />`,
  ];
  if (site.image) out.push(`<meta property="og:image" content="${absUrl(site.image)}" />`);
  out.push(
    `<meta name="twitter:card" content="${site.image ? "summary_large_image" : "summary"}" />`
  );
  if (site.twitter) out.push(`<meta name="twitter:site" content="${esc(site.twitter)}" />`);
  out.push(`<meta name="twitter:title" content="${esc(title)}" />`);
  out.push(`<meta name="twitter:description" content="${esc(desc)}" />`);
  if (site.image) out.push(`<meta name="twitter:image" content="${absUrl(site.image)}" />`);
  if (opts.type === "article") {
    out.push(`<meta property="article:published_time" content="${iso(opts.date)}" />`);
    out.push(`<meta property="article:modified_time" content="${iso(opts.modified || opts.date)}" />`);
    out.push(`<meta property="article:author" content="${esc(site.author)}" />`);
    (opts.tags || []).forEach((t) =>
      out.push(`<meta property="article:tag" content="${esc(t)}" />`)
    );
  }
  out.push(jsonLd(opts, url, title, desc));
  return out.join("\n  ");
}

// Author profile -> terminal "whoami" card. Returns "" when no name is set.
function buildSidebar(profile) {
  const p = profile || {};
  if (!p.name) return "";
  const fields = [...(p.fields || [])];
  // Live "uptime": whole years since the career start year.
  if (p.since) {
    const years = new Date().getFullYear() - p.since;
    fields.push({ key: "uptime", value: `${years} years` });
  }
  const rows = fields
    .map((f) => {
      const val = f.href
        ? `<a href="${esc(f.href)}">${esc(f.value)}</a>`
        : esc(f.value);
      // When the key would just repeat the value (e.g. github / Github), drop
      // the key column and show the link on its own.
      if (f.key && f.value && f.key.toLowerCase() === f.value.toLowerCase()) {
        return `        <div class="pf-row pf-row--solo"><dd class="pf-val">${val}</dd></div>`;
      }
      return `        <div class="pf-row"><dt class="pf-key">${esc(f.key)}</dt><dd class="pf-val">${val}</dd></div>`;
    })
    .join("\n");
  return `<aside class="sidebar" aria-label="about the author">
  <div class="card">
    <div class="card-bar">
      <span class="win-dots"><i></i><i></i><i></i></span>
      <span class="card-title">~/whoami</span>
    </div>
    <div class="card-body">
      <p class="card-name">${esc(p.name)}</p>${p.tagline ? `\n      <p class="card-tag muted">${esc(p.tagline)}</p>` : ""}
      <dl class="pf">
${rows}
      </dl>
    </div>
  </div>
</aside>`;
}

const writeFile = (rel, html) => {
  const out = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
};

// Assets emitted with a content-hashed filename so they can be cached forever
// (the deploy marks non-HTML assets immutable). Editing one yields a new URL,
// so browsers and CDNs fetch the update instead of serving a year-stale copy.
const FINGERPRINT = new Set(["style.css", "terminal.js"]);

// Map "/style.css" -> "/style.<hash>.css" for each fingerprinted static asset.
function hashAssets() {
  const map = {};
  for (const name of FINGERPRINT) {
    const src = path.join(STATIC, name);
    if (!fs.existsSync(src)) continue;
    const hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(src))
      .digest("hex")
      .slice(0, 8);
    const ext = path.extname(name);
    map[`/${name}`] = `/${name.slice(0, -ext.length)}.${hash}${ext}`;
  }
  return map;
}

// Rewrite "/style.css" -> "/style.<hash>.css" (etc.) throughout a string.
const applyAssets = (s, map) =>
  Object.entries(map).reduce((acc, [from, to]) => acc.split(from).join(to), s);

// Copy static/ into dist/. Fingerprinted assets land under their hashed name;
// .html files get their asset references rewritten to match; the rest is copied
// verbatim.
const copyStatic = (src, dest, map) => {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    if (entry.isDirectory()) {
      copyStatic(s, path.join(dest, entry.name), map);
    } else if (map[`/${entry.name}`]) {
      fs.copyFileSync(s, path.join(dest, path.basename(map[`/${entry.name}`])));
    } else if (entry.name.endsWith(".html")) {
      fs.writeFileSync(path.join(dest, entry.name), applyAssets(read(s), map));
    } else {
      fs.copyFileSync(s, path.join(dest, entry.name));
    }
  }
};

// --- load markdown documents ---------------------------------------------
function loadDocs(dir) {
  const full = path.join(CONTENT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = read(path.join(full, f));
      const { data, content } = matter(raw);
      const slug = data.slug || slugify(path.basename(f, ".md"));
      return {
        ...data,
        slug,
        tags: data.tags || [],
        draft: Boolean(data.draft),
        html: md.render(content),
      };
    });
}

// --- build ----------------------------------------------------------------
function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Content-hash style.css/terminal.js, then point the layout at the hashed
  // URLs so the immutable cache headers are honest.
  const assets = hashAssets();
  const base = applyAssets(read(path.join(TEMPLATES, "base.html")), assets);
  const postTpl = read(path.join(TEMPLATES, "post.html"));
  const indexTpl = read(path.join(TEMPLATES, "index.html"));

  const footerLinks = (site.links || [])
    .map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`)
    .join(" · ");

  // Author "whoami" card for the sidebar. Built from site.profile; empty when
  // no name is set so the layout collapses back to a single column.
  const sidebarHtml = buildSidebar(site.profile);

  let postsJson = "[]"; // populated below; injected into every page for the terminal

  // The big "~/blog" masthead. It's the page <h1> ONLY on the listing/home;
  // on a single post the post title is the <h1>, so the brand is a plain div.
  const brandLink = `<a href="/">${esc(site.title)}</a>`;
  const brandH1 = `<h1 class="brand">${brandLink}</h1>`;
  const brandPlain = `<div class="brand">${brandLink}</div>`;

  const page = (vars) =>
    render(base, {
      site_title: esc(site.title),
      author: esc(site.author),
      lang: site.lang || "en",
      footer_links: footerLinks,
      sidebar_html: sidebarHtml,
      posts_json: postsJson,
      head_extra: "",
      brand_html: brandPlain, // default; home overrides with brandH1
      resume_url: esc(site.resume || ""),
      year: new Date().getFullYear(),
      ...vars,
    });

  // posts (newest first, drafts excluded)
  const posts = loadDocs("posts")
    .filter((p) => !p.draft)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Manifest the in-page terminal reads for `ls` / `cd`. Escape `<` so the
  // JSON is safe to embed inside a <script> tag.
  postsJson = JSON.stringify(
    posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      date: fmtDate(p.date),
      summary: p.summary || "",
      tags: p.tags || [],
    }))
  ).replace(/</g, "\\u003c");

  for (const p of posts) {
    const meta =
      `<time class="muted" datetime="${fmtDate(p.date)}">${fmtDate(p.date)}</time> ` +
      p.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join(" ");
    const body = render(postTpl, {
      title: esc(p.title),
      meta,
      content: p.html,
    });
    writeFile(
      `posts/${p.slug}/index.html`,
      page({
        title: `${esc(p.title)} — ${esc(site.title)}`,
        description: esc(p.summary || site.description),
        content: body,
        path: `/posts/${p.slug}/`,
        head_extra: seoHead({
          type: "article",
          path: `/posts/${p.slug}/`,
          ogTitle: p.title,
          description: p.summary || site.description,
          date: p.date,
          modified: p.updated || p.date,
          tags: p.tags,
        }),
      })
    );
  }

  // index: terminal `ls`-style listing
  const rows = posts
    .map(
      (p) =>
        `<li><span class="ls-date">${fmtDate(p.date)}</span> ` +
        `<h2 class="ls-title"><a href="/posts/${p.slug}/">${esc(p.title)}</a></h2></li>`
    )
    .join("\n");
  const indexBody = render(indexTpl, {
    rows: rows || `<li class="muted">no posts yet — touch content/posts/first.md</li>`,
  });
  writeFile(
    "index.html",
    page({
      title: esc(site.title),
      description: esc(site.description),
      content: indexBody,
      path: "/",
      brand_html: brandH1, // home: the brand is the page <h1>
      head_extra: seoHead({
        type: "website",
        path: "/",
        ogTitle: site.title,
        description: site.description,
      }),
    })
  );

  // static pages (e.g. about) -> /<slug>/
  const pages = loadDocs("pages");
  for (const pg of pages) {
    const body = render(postTpl, {
      title: esc(pg.title),
      meta: "",
      content: pg.html,
    });
    writeFile(
      `${pg.slug}/index.html`,
      page({
        title: `${esc(pg.title)} — ${esc(site.title)}`,
        description: esc(pg.summary || site.description),
        content: body,
        path: `/${pg.slug}/`,
        head_extra: seoHead({
          type: "website",
          path: `/${pg.slug}/`,
          ogTitle: pg.title,
          description: pg.summary || site.description,
        }),
      })
    );
  }

  // feeds + crawler files
  writeRss(posts);
  writeSitemap(posts, pages);
  writeRobots();

  // static assets (style.css/terminal.js emitted under hashed names)
  copyStatic(STATIC, DIST, assets);

  console.log(
    `built ${posts.length} post(s) -> dist/  (url: ${site.url})`
  );
  return posts.length;
}

function writeRss(posts) {
  const self = `${SITE_URL}/feed.xml`;
  const lastBuild = (posts.length ? new Date(posts[0].date) : new Date(0)).toUTCString();
  const items = posts
    .map((p) => {
      const link = `${SITE_URL}/posts/${p.slug}/`;
      const cats = (p.tags || [])
        .map((t) => `      <category>${esc(t)}</category>`)
        .join("\n");
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${esc(p.summary || "")}</description>${cats ? "\n" + cats : ""}
    </item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.title)}</title>
    <link>${SITE_URL}/</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${esc(site.description)}</description>
    <language>${site.lang || "en"}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  writeFile("feed.xml", xml);
}

function writeSitemap(posts, pages) {
  const entries = [{ loc: "/", lastmod: posts.length ? fmtDate(posts[0].date) : null }];
  posts.forEach((p) => entries.push({ loc: `/posts/${p.slug}/`, lastmod: fmtDate(p.date) }));
  (pages || []).forEach((pg) => entries.push({ loc: `/${pg.slug}/`, lastmod: null }));
  const urls = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${absUrl(e.loc)}</loc>` +
        (e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : "") +
        `\n  </url>`
    )
    .join("\n");
  writeFile(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
  );
}

function writeRobots() {
  writeFile(
    "robots.txt",
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );
}

export { build };

// Run the build when invoked directly (`node build.js`), not when imported.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build();
}
