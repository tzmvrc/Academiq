Models Layer – Database Access Only

Purpose:
This folder contains all database access logic.
Models are responsible only for communicating with Supabase (PostgreSQL).

Think of models as:
→ "Database query helpers"

They should NEVER contain business logic or HTTP logic.

Responsibilities:
✔ Perform CRUD operations (create, read, update, delete)
✔ Execute queries to Supabase
✔ Return raw database results
✔ Reusable data access functions

Allowed inside models:
✔ supabase.from(...).select()
✔ insert()
✔ update()
✔ delete()
✔ joins
✔ filters (.eq, .match, .order, etc.)

NOT allowed inside models:
✘ Validation logic
✘ Business rules
✘ Password hashing
✘ AI calls
✘ Authentication logic
✘ req / res objects
✘ Express code
✘ Status codes

If you see these here → you are doing it wrong.
Move them to services instead.

How to design a model:

One model = one table

Examples:

user_model.js → users table

post_model.js → posts table

comment_model.js → comments table

vote_model.js → votes table

Function naming guidelines:

Use database-style names:

Good:
✔ create(payload)
✔ findById(id)
✔ findAll()
✔ findByUser(userId)
✔ update(id, updates)
✔ delete(id)

Bad:
✘ createPostWithValidation()
✘ loginUser()
✘ verifyPassword()

(Those belong in services)

Example structure:

import { supabase } from "../database/supabase.js"

const TABLE = "posts"

export const PostModel = {
async create(payload) {
return supabase.from(TABLE).insert(payload).select().single()
},

async findById(id) {
return supabase.from(TABLE).select("*").eq("id", id).single()
}
}

