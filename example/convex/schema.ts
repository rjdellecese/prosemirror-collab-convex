import { defineSchema } from "convex/schema";
import { tableDefinitions } from "prosemirror-collab-convex";

export default defineSchema({
  ...(tableDefinitions as any),
});
