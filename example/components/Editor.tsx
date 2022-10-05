import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent } from "@tiptap/react";
import { Id, useCollabEditor } from "prosemirror-collab-convex";
import { useCallback, useState } from "react";
import { useMutation, useQuery } from "../convex/_generated/react";
import { extensions } from "../prosemirrorExtensions";

export const Editor = (props: {
  id: Id<"docs">;
  doc: string;
  version: number;
}) => {
  const editor = useCollabEditor(
    {
      useQuery,
      useMutation,
      getStepsSinceQueryName: "collab:getStepsSince",
      sendStepsMutationName: "collab:sendSteps",
      docId: props.id,
      doc: props.doc,
      version: props.version,
    },
    {
      extensions,
      editorProps: {
        attributes: {
          class: "h-screen w-screen cursor-text p-5 focus:outline-none",
        },
      },
    }
  );

  if (editor) {
    return <EditorContent editor={editor}></EditorContent>;
  } else {
    return <p>Initializing editor…</p>;
  }
};
