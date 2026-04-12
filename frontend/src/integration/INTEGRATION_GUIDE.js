/**
 * INTEGRATION GUIDE: AI-Powered Features (Point Validation & Comment Verification)
 *
 * This guide shows how to integrate the new AI features into your React components.
 */

import { useState, useEffect } from "react";
import { usePointNotifications } from "../hooks/usePointNotifications";
import {
  VerificationBadge,
  CommentAuthorWithVerification,
} from "../components/VerificationBadge";

/**
 * 1. POINT NOTIFICATIONS IN YOUR MAIN APP
 *
 * Example of integrating point notification hook in your App or Dashboard component.
 */

export const PointNotificationExample = () => {
  const userId = localStorage.getItem("userId"); // Get from your auth context
  const { isConnected, lastPoints } = usePointNotifications(userId, true);

  return (
    <div>
      {/* Notification indicator */}
      <div className={isConnected ? "status-connected" : "status-disconnected"}>
        {isConnected ? "🔴 Online" : "⚫ Offline"}
      </div>

      {/* You can display last earned points in a badge */}
      {lastPoints && (
        <div className="points-earned">✨ Last earned: +{lastPoints} pts</div>
      )}
    </div>
  );
};

/**
 * 2. USING VERIFICATION BADGE IN COMMENTS
 *
 * Example showing how to integrate the verification badge in your comment display.
 */

export const CommentDisplayWithVerification = ({ comment }) => {
  const {
    id,
    content,
    users,
    is_ai_verified,
    verification_source_url,
    verification_confidence,
    points_awarded,
  } = comment;

  return (
    <div className="comment-card">
      {/* Author with verification badge */}
      <div className="comment-header">
        <CommentAuthorWithVerification
          authorName={users?.name || "Anonymous"}
          isVerified={is_ai_verified}
          sourceUrl={verification_source_url}
          confidence={verification_confidence}
        />
        {points_awarded > 0 && (
          <span className="points-badge">+{points_awarded} pts</span>
        )}
      </div>

      {/* Comment content */}
      <div className="comment-content">{content}</div>
    </div>
  );
};

/**
 * 3. GETTING COMMENTS WITH VERIFICATION DATA
 *
 * When fetching comments, ensure you're getting verification fields:
 */

const fetchCommentsExample = async (forumId) => {
  try {
    const response = await fetch(`/api/forums/${forumId}/comments`);
    const { comments } = await response.json();

    // Comments now include:
    // - is_ai_verified: boolean
    // - verification_source_url: string | null
    // - verification_confidence: number (0-1)
    // - points_awarded: integer
    // - points_reason: string

    return comments;
  } catch (error) {
    console.error("Failed to fetch comments:", error);
  }
};

/**
 * 4. DISPLAYING POINT NOTIFICATIONS IN COMMENT SECTION
 *
 * Example of using both hooks together in a comment section:
 */

export const CommentSectionWithPointsAndVerification = ({
  forumId,
  userId,
}) => {
  const [comments, setComments] = useState([]);
  const { isConnected, lastPoints } = usePointNotifications(userId, true);

  useEffect(() => {
    fetchCommentsExample(forumId).then(setComments);
  }, [forumId]);

  return (
    <div className="comments-section">
      {/* Show last earned points */}
      {lastPoints && (
        <div className="points-notification">
          🎉 You earned +{lastPoints} points!
        </div>
      )}

      {/* Render comments with verification badges */}
      {comments.map((comment) => (
        <CommentDisplayWithVerification key={comment.id} comment={comment} />
      ))}
    </div>
  );
};

/**
 * 5. CONNECTING TO POSTDETAILS.TSX
 *
 * In PostDetails.tsx, update the BackendComment interface and rendering:
 */

// Update BackendComment interface to include new fields:
// interface BackendComment {
//   id: string;
//   forum_id: string;
//   user_id: string;
//   parent_comment_id?: string | null;
//   content: string;
//   created_at: string;
//   upvotes_count?: number;
//   downvotes_count?: number;
//   points_awarded?: number;           // NEW
//   points_reason?: string;             // NEW
//   is_ai_verified?: boolean;           // NEW
//   verification_source_url?: string;   // NEW
//   verification_confidence?: number;   // NEW
//   users?: {
//     id?: string;
//     name?: string;
//     profile_url?: string | null;
//   } | null;
// }

// In the PostDetails component, add to useEffect:
// const { isConnected, lastPoints } = usePointNotifications(CURRENT_USER?.id, true);

// In comment rendering, wrap author display with CommentAuthorWithVerification:
// <CommentAuthorWithVerification
//   authorName={comment.author}
//   isVerified={comment.is_ai_verified}
//   sourceUrl={comment.verification_source_url}
//   confidence={comment.verification_confidence}
// />

/**
 * 6. STYLING POINTS BADGE
 *
 * Add this CSS to style the points badge:
 */

const pointsBadgeCSS = `
  .points-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    margin-left: auto;
  }

  .points-notification {
    background: rgba(16, 185, 129, 0.1);
    border-left: 4px solid #10b981;
    padding: 12px;
    margin-bottom: 16px;
    border-radius: 4px;
    color: #059669;
    font-weight: 500;
  }
`;

/**
 * 7. BACKEND SETUP CHECKLIST
 *
 * Ensure these are configured:
 *
 * ✓ AI_SERVICE_URL environment variable set (e.g., http://localhost:8000)
 * ✓ node-cron installed: npm install node-cron
 * ✓ Database migrations applied (see MIGRATIONS.md)
 * ✓ Point validation job started in server.js
 * ✓ Comment verification service called after comment creation
 */

/**
 * 8. ENVIRONMENT VARIABLES NEEDED
 *
 * Backend (.env):
 * - AI_SERVICE_URL=http://localhost:8000/ai
 * - PORT=5000
 *
 * Frontend (.env):
 * - VITE_API_URL=http://localhost:5000
 */
