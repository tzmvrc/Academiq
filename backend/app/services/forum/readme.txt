Forum Service – Handles forum posts and forum-related business logic

Purpose:
This folder manages forum post creation, retrieval, update, deletion, voting, and validation logic.
It does business rules for posts, interacts with models, and may call AI services (like content validation) if needed.

Allowed inside forum services:

✔ Create posts (validate data, assign user_id)
✔ Update posts (check ownership, business rules)
✔ Delete posts (soft delete / permissions)
✔ Retrieve posts (all posts, by user, by category)
✔ Voting logic (calculate vote points, enforce 1 vote per user)
✔ Call AI services (content validation, summarization, etc.)

NOT allowed inside forum services:

✘ Direct HTTP (req / res)
✘ Defining routes
✘ Raw database queries (use post_model, vote_model, etc.)
✘ Password hashing or auth (use auth_service)