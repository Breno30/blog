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
    tagline: "Cloud Engineer · AWS Certified · DevOps",
    // Career start year. Rendered as a live "uptime" row in the sidebar.
    since: 2021,
    fields: [
      { key: "role", value: "DevOps Engineer" },
      { key: "location", value: "Brazil" },
      { key: "focus", value: "AWS · Terraform · CI/CD" },
      { key: "stack", value: "Laravel · Docker · Linux" },
      { key: "certs", value: "AWS SAA-C03 · CLF-C02" },
      {
        key: "email",
        value: "brenodonascimentosilvaa@gmail.com",
        href: "mailto:brenodonascimentosilvaa@gmail.com",
      },
      { key: "github", value: "Breno30", href: "https://github.com/Breno30" },
      {
        key: "linkedin",
        value: "breno",
        href: "https://linkedin.com/in/breno-do-nascimento-silva",
      },
    ],
  },
  // Optional external links rendered in the footer.
  links: [
    { label: "github", href: "https://github.com/breno30" },
    { label: "linkedin", href: "https://www.linkedin.com/in/breno-do-nascimento-silva/" },
    // phone: fill in the real number, e.g. "tel:+5511999999999"
    { label: "phone", href: "tel:+0000000000" },
    { label: "rss", href: "/feed.xml" },
  ],
};
