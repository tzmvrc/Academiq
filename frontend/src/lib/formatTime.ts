/**
 * Format timestamp as "ago" format within 24 hours,
 * "Yesterday" for 24-48 hours,
 * or full date format beyond that
 */
export const formatTimeAgo = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Within 1 minute
    if (diffMins < 1) {
      return "just now";
    }

    // Within 1 hour
    if (diffHours < 1) {
      return `${diffMins}m ago`;
    }

    // Within 24 hours
    if (diffDays < 1) {
      return `${diffHours}h ago`;
    }

    // Between 24-48 hours
    if (diffDays === 1) {
      return "Yesterday";
    }

    // Beyond 48 hours, show full date
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "unknown time";
  }
};
