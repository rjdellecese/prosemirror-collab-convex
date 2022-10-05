import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import { Id, useCollabEditor } from "prosemirror-collab-convex";
import { useMutation, useQuery } from "../convex/_generated/react";
import { useEffect, useReducer, useRef, useState } from "react";
import { Editor } from "../components/Editor";

const Home: NextPage = () => {
  const [docCreationStatus, setDocCreationStatus] = useState<DocCreationStatus>(
    {
      tag: "DocNotYetCreated",
    }
  );
  const createEmptyDoc = useMutation("collab:createEmptyDoc");
  useEffect(() => {
    createEmptyDoc().then(({ id, doc, version }) =>
      setDocCreationStatus({ tag: "DocCreated", id, doc, version })
    );
  }, [createEmptyDoc]);

  switch (docCreationStatus.tag) {
    case "DocNotYetCreated":
      return main(<p>Creating doc…</p>);
    case "DocCreated":
      return main(
        <Editor
          id={docCreationStatus.id}
          doc={docCreationStatus.doc}
          version={docCreationStatus.version}
        ></Editor>
      );
    default:
      const exhausted: never = docCreationStatus;
      throw new Error(exhausted);
  }

  // const [state, dispatch] = useReducer(reducer, { tag: "Initialized" });
  //
  // useCollabEditor({
  //   getStepsSince: useQuery("collab:getStepsSince"),
  //   sendSteps: useMutation("collab:sendSteps"),
  // });
  // const stateTag = state.tag;
  //
  // switch (stateTag) {
  //   case "Initialized":
  //     return main(
  //       <button onClick={() => dispatch({ tag: "CreateDocButtonPressed" })}>
  //         Create empty doc
  //       </button>
  //     );
  //   case "CreatingDoc":
  //     return main(<p>Creating empty doc…</p>);
  //   case "DocCreated":
  //     return main(<p>Retrieving doc contents…</p>);
  //   case "DocLoaded":
  //     return main(<Editor></Editor>);
  //   default:
  //     const exhausted: never = stateTag;
  //     throw new Error(exhausted);
  // }
};

type DocCreationStatus =
  | { tag: "DocNotYetCreated" }
  | { tag: "DocCreated"; id: Id<"docs">; doc: string; version: number };

const main = (content) => (
  <div className="prose prose-stone">
    <Head>
      <title>ProseMirror Collab Convex Example</title>
    </Head>

    <main>{content}</main>
  </div>
);

type State =
  | { tag: "Initialized" }
  | { tag: "CreatingDoc" }
  | { tag: "DocCreated"; docId: Id<"docs"> }
  | { tag: "DocLoaded"; docId: Id<"docs">; doc: string; version: number };

type Action =
  | { tag: "CreateDocButtonPressed" }
  | { tag: "DocCreated" }
  | { tag: "LoadDoc" };

const reducer = (state: State, action: Action) => {
  const tag = action.tag;
  switch (tag) {
    case "CreateDocButtonPressed":
      return state;
    case "DocCreated":
      return state;
    case "LoadDoc":
      return state;
    default:
      const exhausted: never = tag;
      throw new Error(exhausted);
  }
};

export default Home;
