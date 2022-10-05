import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

export const extensions = [
  StarterKit,
  Placeholder.configure({
    placeholder: "Write something…",
    emptyNodeClass:
      "first:before:h-0 first:before:text-gray-400 first:before:float-left first:before:content-[attr(data-placeholder)] first:before:pointer-events-none",
  }),
];
