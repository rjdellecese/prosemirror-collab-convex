import collab from "prosemirror-collab";
import { EditorState } from "prosemirror-state";
import { API, DatabaseReader, DatabaseWriter, functions, Id } from "~convex";
import { ReactMutation, UseMutationForAPI } from "convex/react";
import { DependencyList, useEffect, useRef, useState } from "react";
import { EditorOptions, Extension } from "@tiptap/core";
import { Editor, useEditor } from "@tiptap/react";
import { Step } from "prosemirror-transform";

// https://stackoverflow.com/a/63029283
type DropFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;

type Functions = ReturnType<typeof functions>;
type ApiFunction<Name extends keyof Functions> = Parameters<
  Functions[Name]
>[0]["db"] extends DatabaseWriter
  ? (
      ...args: DropFirst<Parameters<Functions[Name]>>
    ) => ReturnType<Functions[Name]>
  : (
      ...args: DropFirst<Parameters<Functions[Name]>>
    ) => Awaited<ReturnType<Functions[Name]>> | undefined;

export const useCollabEditor = (
  {
    sendSteps,
    getStepsSince,
    docId,
    doc,
    version,
  }: {
    sendSteps: ApiFunction<"sendSteps">;
    getStepsSince: ApiFunction<"getStepsSince">;
    docId: Id<"docs">;
    doc: string;
    version: number;
  },
  // We omit `content` here because you're already giving us the `doc`
  editorOptions: Omit<EditorOptions, "content">,
  deps: DependencyList = []
): Editor | null => {
  const [clientId] = useState(() => crypto.randomUUID());
  const [areStepsInFlight, setAreStepsInFlight] = useState(false);
  const areStepsInFlightRef = useRef(areStepsInFlight);
  areStepsInFlightRef.current = areStepsInFlight;
  const stepsSince = getStepsSince(docId, version);

  const editor = useEditor(
    {
      ...editorOptions,
      content: JSON.parse(doc),
      extensions: [
        ...(editorOptions.extensions || []),
        Extension.create({
          addProseMirrorPlugins: () => [
            collab.collab({ version, clientID: clientId }),
          ],
        }),
      ],
      onTransaction: (props) => {
        sendSendableSteps({
          sendSteps,
          docId,
          clientId,
          areStepsInFlight: areStepsInFlightRef.current,
          setAreStepsInFlight,
          editorState: props.editor.state,
        });

        if (editorOptions.onTransaction) {
          editorOptions.onTransaction(props);
        }
      },
    },
    deps
  );

  useEffect(() => {
    if (editor) {
      sendSendableSteps({
        sendSteps,
        docId,
        clientId,
        areStepsInFlight,
        setAreStepsInFlight,
        editorState: editor.state,
      });
    }
  }, [editor, areStepsInFlight]);

  useEffect(() => {
    if (
      editor &&
      stepsSince &&
      stepsSince.steps.length !== 0 &&
      stepsSince.clientIds.length !== 0
    ) {
      const parsedSteps = stepsSince.steps.map((step) =>
        Step.fromJSON(editor.schema, JSON.parse(step))
      );

      editor.view.dispatch(
        collab.receiveTransaction(
          editor.state,
          parsedSteps,
          stepsSince.clientIds,
          {
            mapSelectionBackward: true,
          }
        )
      );
    }
  }, [editor, getStepsSince]);

  return editor;
};

const sendSendableSteps = ({
  sendSteps,
  docId,
  clientId,
  areStepsInFlight,
  setAreStepsInFlight,
  editorState,
}: {
  sendSteps: ApiFunction<"sendSteps">;
  docId: Id<"docs">;
  clientId: string;
  areStepsInFlight: boolean;
  setAreStepsInFlight: React.Dispatch<React.SetStateAction<boolean>>;
  editorState: EditorState;
}) => {
  if (areStepsInFlight) {
    return;
  } else {
    const sendableSteps = collab.sendableSteps(editorState);
    if (sendableSteps) {
      sendSteps(
        docId,
        clientId,
        sendableSteps.version,
        sendableSteps.steps.map((step) => JSON.stringify(step.toJSON()))
      ).then(() => setAreStepsInFlight(false));
      setAreStepsInFlight(true);
    } else {
      return;
    }
  }
};
