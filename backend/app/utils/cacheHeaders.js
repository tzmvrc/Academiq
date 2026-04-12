import crypto from "crypto";

/**
 * Generate an ETag (MD5 hash) from a JSON object
 */
export const generateETag = (data) => {
  const str = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash("md5").update(str).digest("hex");
};

/**
 * Set HTTP cache headers on the response
 * @param {object} res - Express response object
 * @param {object|array} data - The data that will be sent (used for ETag)
 * @param {string|Date} lastModified - ISO string or Date object
 * @param {object} options - { isPrivate: boolean, maxAgeSeconds: number }
 */
export const setCacheHeaders = (res, data, lastModified = null, options = {}) => {
  const { isPrivate = true, maxAgeSeconds = 30 } = options;
  const privacy = isPrivate ? "private" : "public";

  res.setHeader(
    "Cache-Control",
    `${privacy}, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`
  );

  const etag = generateETag(data);
  res.setHeader("ETag", etag);

  if (lastModified) {
    const modDate = new Date(lastModified);
    if (!isNaN(modDate.getTime())) {
      res.setHeader("Last-Modified", modDate.toUTCString());
    }
  }
};

/**
 * Check if the client already has the latest version (304)
 * @returns {boolean} true if we should send 304, false otherwise
 */
export const shouldReturn304 = (req, res, data, lastModified = null) => {
  const ifNoneMatch = req.headers["if-none-match"];
  const ifModifiedSince = req.headers["if-modified-since"];

  const currentEtag = generateETag(data);

  if (ifNoneMatch && ifNoneMatch === currentEtag) {
    return true;
  }

  if (lastModified && ifModifiedSince) {
    const since = new Date(ifModifiedSince);
    const mod = new Date(lastModified);
    if (!isNaN(since.getTime()) && !isNaN(mod.getTime()) && mod <= since) {
      return true;
    }
  }

  return false;
};