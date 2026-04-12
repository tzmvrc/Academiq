import React, { useState } from "react";
import "./VerificationBadge.css";

/**
 * VerificationBadge Component
 *
 * Displays a verification badge for verified comments.
 * Shows domain favicon if available, or a "Verified" text badge.
 *
 * Features:
 * - Display verification indicator
 * - Extract and show domain favicon
 * - Tooltip on hover showing source URL
 * - Click to open source in new tab
 * - Fallback to text badge if no logo/icon
 *
 * @param {object} props
 * @param {boolean} props.isVerified - Whether the comment is verified
 * @param {string} props.sourceUrl - URL to the verification source
 * @param {number} props.confidence - Confidence score (0-1)
 */
export const VerificationBadge = ({ isVerified, sourceUrl, confidence }) => {
  const [faviconError, setFaviconError] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  if (!isVerified) {
    return null; // Don't display if not verified
  }

  // Extract domain from URL for favicon
  const getFaviconUrl = (url) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      // Use Favicon service to get domain favicon
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    } catch {
      return null;
    }
  };

  // Extract domain name for display
  const getDomainName = (url) => {
    if (!url) return "Verified";
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return "Verified";
    }
  };

  const faviconUrl = sourceUrl ? getFaviconUrl(sourceUrl) : null;
  const domainName = getDomainName(sourceUrl);
  const confidencePercent = Math.round((confidence || 0) * 100);

  const handleClick = (e) => {
    if (sourceUrl) {
      e.preventDefault();
      e.stopPropagation();
      window.open(sourceUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="verification-badge-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      title={sourceUrl || "Verified"}>
      {/* Badge Icon/Logo */}
      {faviconUrl && !faviconError ? (
        <img
          src={faviconUrl}
          alt="source"
          className="verification-badge-icon"
          onClick={handleClick}
          onError={() => setFaviconError(true)}
          style={{ cursor: sourceUrl ? "pointer" : "default" }}
        />
      ) : (
        <div
          className="verification-badge-text"
          onClick={handleClick}
          style={{ cursor: sourceUrl ? "pointer" : "default" }}
          title="Click to view source">
          ✓
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && sourceUrl && (
        <div className="verification-tooltip">
          <div className="verification-tooltip-header">
            <strong>Source Verified</strong>
          </div>
          <div className="verification-tooltip-url">{sourceUrl}</div>
          <div className="verification-tooltip-confidence">
            Confidence: {confidencePercent}%
          </div>
          <div className="verification-tooltip-action">Click to open</div>
        </div>
      )}

      {/* Fallback text tooltip if no source URL */}
      {showTooltip && !sourceUrl && (
        <div className="verification-tooltip small">
          <strong>Account Verified</strong>
        </div>
      )}
    </div>
  );
};

/**
 * CommentAuthorWithVerification Component
 *
 * Displays comment author name alongside verification badge.
 * Used in comment threads to show both author and verification status.
 *
 * @param {object} props
 * @param {string} props.authorName - Name of the comment author
 * @param {boolean} props.isVerified - Whether comment is verified
 * @param {string} props.sourceUrl - Verification source URL
 * @param {number} props.confidence - Verification confidence
 * @param {string} props.className - Additional CSS classes
 */
export const CommentAuthorWithVerification = ({
  authorName,
  isVerified,
  sourceUrl,
  confidence,
  className = "",
}) => {
  return (
    <div className={`comment-author-with-verification ${className}`}>
      <span className="author-name">{authorName}</span>
      {isVerified && (
        <VerificationBadge
          isVerified={isVerified}
          sourceUrl={sourceUrl}
          confidence={confidence}
        />
      )}
    </div>
  );
};

/**
 * VerificationStatus Component
 *
 * Shows detailed verification status (used in comment details).
 *
 * @param {object} props
 * @param {boolean} props.isVerified
 * @param {string} props.sourceUrl
 * @param {number} props.confidence
 */
export const VerificationStatus = ({ isVerified, sourceUrl, confidence }) => {
  if (!isVerified) {
    return (
      <div className="verification-status unverified">
        <span className="status-icon">✗</span>
        <span className="status-text">Not verified</span>
      </div>
    );
  }

  const confidencePercent = Math.round((confidence || 0) * 100);
  const confidenceLevel =
    confidencePercent >= 80
      ? "high"
      : confidencePercent >= 50
        ? "medium"
        : "low";

  return (
    <div className={`verification-status verified ${confidenceLevel}`}>
      <span className="status-icon">✓</span>
      <span className="status-text">Verified ({confidencePercent}%)</span>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="status-link">
          View source
        </a>
      )}
    </div>
  );
};

export default VerificationBadge;
