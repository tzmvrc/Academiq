#!/usr/bin/env node

/**
 * Generate Test JWT Token
 * Creates a valid JWT for testing the feed endpoint
 */

import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const userId = process.argv[2];
const JWT_SECRET = process.env.JWT_SECRET;

if (!userId) {
  console.error("Usage: node scripts/generate_test_token.js <userId>");
  console.error(
    "Example: node scripts/generate_test_token.js ef0170ed-c962-4447-9f2a-c15768fce4d5",
  );
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET not found in .env file");
  process.exit(1);
}

// Generate a token that expires in 24 hours
const token = jwt.sign({ id: userId }, JWT_SECRET, {
  expiresIn: "24h",
});

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║  TEST JWT TOKEN GENERATED                                  ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

console.log(`User ID: ${userId}`);
console.log(`Expires in: 24 hours\n`);

console.log("✅ Your test token:\n");
console.log(token);

console.log("\n\n📝 To use this token, copy it and run:\n");

console.log("PowerShell:");
console.log(`$token = "${token}"`);
console.log(`$headers = @{ "Authorization" = "Bearer $token" }`);
console.log(
  `Invoke-WebRequest -Uri "http://localhost:5000/api/forums/feed" -Headers $headers | ConvertTo-Json`,
);

console.log("\n\nBash/curl:");
console.log(`curl -X GET http://localhost:5000/api/forums/feed \\`);
console.log(`  -H "Authorization: Bearer ${token}"`);

console.log("\n\n🔗 Direct test URL (with token in browser):\n");
console.log(`http://localhost:5000/api/forums/feed?token=${token}`);
console.log("(Note: Add query param handling if you want this)\n");
