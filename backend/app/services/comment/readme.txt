Comment Service – Handles all comment logic

Purpose:
This folder contains functions that manage comments on posts.
Services handle rules like who can comment, retrieving comments, deleting, or updating them.

Allowed inside comment services:

✔ Creating a comment (call comment_model)
✔ Retrieving comments for a post
✔ Deleting comments (check user permission)
✔ Updating comments (check user permission)
✔ Applying any business rules on comments

NOT allowed inside comment services:

✘ Direct HTTP handling (req / res)
✘ Direct database queries (use models)
✘ Defining routes
✘ Authentication (call auth_service instead if needed)