// Edit your blog's metadata here. Used by build.js for templates, RSS, sitemap.
export default {
  title: "~/blog",
  // Shown in the header prompt and <title>.
  author: "Breno",
  description: "Notes from a terminal. DevOps, AWS, and other machine noises.",
  // Public site URL (no trailing slash). Used for RSS/sitemap absolute links.
  // Override at build time with SITE_URL env var (CI sets this).
  url: process.env.SITE_URL || "https://example.com",
  lang: "en",
  // Default social-share image for Open Graph / Twitter cards. Absolute URL or
  // site-relative path. Ideally a 1200x630 PNG/JPG. Leave "" to omit.
  image: "",
  // Twitter @handle for the twitter:site card tag. Leave "" to omit.
  twitter: "",
  // Résumé PDF. Drop the file at static/resume.pdf (served at this path).
  // Powers the `resume` command and the nav "resume" button. Leave "" to omit.
  resume: "/resume.pdf",
  // Author profile rendered as a terminal "whoami" card in the sidebar.
  // Edit freely — `fields` is a plain key/value list; add `href` to make a value
  // a link. Set `name: ""` to hide the sidebar entirely.
  profile: {
    name: "Breno do Nascimento",
    tagline: "",
    // Career start year. Rendered as a live "uptime" row in the sidebar.
    since: 2021,
    fields: [
      { key: "role", value: "DevOps Engineer" },
      {
        key: "contact",
        stack: true,
        parts: [
          { value: "Github", href: "https://github.com/Breno30" },
          {
            value: "Linkedin",
            href: "https://linkedin.com/in/breno-do-nascimento-silva",
          },
        ],
      },
      { key: "location", value: "Brazil" },
      {
        key: "certs",
        stack: true,
        parts: [
          {
            value: "AWS SAA-C03",
            href: "https://www.credly.com/badges/56523630-0522-4b50-b58d-92c3bce0031a/public_url",
          },
          {
            value: "AWS CLF-C02",
            href: "https://www.credly.com/badges/b2dd5a42-7b49-4f80-b0aa-d3e06fce2ec1/public_url",
          },
        ],
      },
    ],
  },
  // Optional external links rendered in the footer.
  links: [
    { label: "Github", href: "https://github.com/breno30" },
    { label: "Linkedin", href: "https://www.linkedin.com/in/breno-do-nascimento-silva/" },
    // phone: fill in the real number, e.g. "tel:+5511999999999"
    { label: "rss", href: "/feed.xml" },
  ],
};
