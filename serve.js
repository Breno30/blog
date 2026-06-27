// Minimal static file server for local preview of dist/.
// Mirrors CloudFront pretty-URL behavior: /foo/ -> /foo/index.html.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

export function serve(port = process.env.PORT || 8000) {
  return http
    .createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      let file = path.join(DIST, urlPath);
      // pretty URLs: directory or trailing slash -> index.html
      if (urlPath.endsWith("/")) file = path.join(file, "index.html");
      else if (!path.extname(file)) file = path.join(file, "index.html");

      fs.readFile(file, (err, data) => {
        if (err) {
          // mirror CloudFront: missing object -> 404 page
          fs.readFile(path.join(DIST, "404.html"), (e2, page) => {
            res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
            res.end(e2 ? "404 not found: " + urlPath : page);
          });
          return;
        }
        res.writeHead(200, {
          "content-type":
            TYPES[path.extname(file)] || "application/octet-stream",
        });
        res.end(data);
      });
    })
    .listen(port, () =>
      console.log(`serving dist/ at http://localhost:${port}`)
    );
}

// Run directly: `node serve.js`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  serve();
}
