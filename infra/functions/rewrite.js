// CloudFront Function (viewer-request): map pretty URLs to objects in S3.
//   /                 -> /index.html
//   /posts/foo/       -> /posts/foo/index.html
//   /about            -> /about/index.html
// Requests that already point at a file (have an extension) pass through.
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
  } else if (!uri.includes(".")) {
    request.uri = uri + "/index.html";
  }

  return request;
}
