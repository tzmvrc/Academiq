Auth Service – Handles all authentication and user account logic

Purpose:
This folder contains all functions related to authentication and user account management.
Services here handle the logic of signup, login, password hashing, token generation, and verification.

Allowed inside auth services:

✔ Hashing and verifying passwords
✔ Validating signup/login data
✔ Generating JWT or session tokens
✔ Calling user_model functions to interact with the database
✔ Sending emails (OTP / verification)
✔ Business rules for authentication

NOT allowed inside auth services:

✘ Direct HTTP handling (req / res)
✘ Direct database queries (use models instead)
✘ Defining routes
✘ AI validation logic (use separate service if needed)