import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Screenshots for browser automation (stored in Convex)
  screenshots: defineTable({
    storageId: v.id("_storage"),
    timestamp: v.number(),
    format: v.string(),
  }),
});
