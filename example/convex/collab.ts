import { getSchema } from "@tiptap/core";
import { functions } from "prosemirror-collab-convex";
import { extensions } from "../prosemirrorExtensions";
import { mutation, query } from "./_generated/server";

const prosemirrorSchema = getSchema(extensions);

// TODO: Improve this
export const getStepsSince = query(functions(prosemirrorSchema).getStepsSince);
export const getDocAndVersion = query(
  functions(prosemirrorSchema).getDocAndVersion
);
export const sendSteps = mutation(functions(prosemirrorSchema).sendSteps);
export const createEmptyDoc = mutation(
  functions(prosemirrorSchema).createEmptyDoc
);
