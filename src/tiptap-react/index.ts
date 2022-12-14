import * as collab from "prosemirror-collab";
import { EditorState } from "prosemirror-state";
import { DatabaseWriter, functions, Id } from "~convex";
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
    useQuery,
    useMutation,
    getStepsSinceQueryName,
    sendStepsMutationName,
    docId,
    doc,
    version,
  }: {
    useQuery: any;
    useMutation: any;
    getStepsSinceQueryName: string;
    sendStepsMutationName: string;
    docId: Id<"docs">;
    doc: string;
    version: number;
  },
  // We omit `content` here because you're already giving us the `doc`
  editorOptions: Omit<Partial<EditorOptions>, "content"> = {},
  deps: DependencyList = []
): Editor | null => {
  const [clientId] = useState(() => crypto.randomUUID());
  const [areStepsInFlight, setAreStepsInFlight] = useState(false);
  const areStepsInFlightRef = useRef(areStepsInFlight);
  areStepsInFlightRef.current = areStepsInFlight;
  console.log("areStepsInFlight", areStepsInFlightRef.current);
  const stepsSince = useQuery(
    getStepsSinceQueryName,
    docId,
    version
  ) as ReturnType<ApiFunction<"getStepsSince">>;
  const sendSteps = useMutation(sendStepsMutationName);

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
          areStepsInFlightRef,
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
        areStepsInFlightRef,
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
  }, [editor, stepsSince]);

  return editor;
};

const sendSendableSteps = ({
  sendSteps,
  docId,
  clientId,
  areStepsInFlightRef,
  setAreStepsInFlight,
  editorState,
}: {
  sendSteps: ApiFunction<"sendSteps">;
  docId: Id<"docs">;
  clientId: string;
  areStepsInFlightRef: React.MutableRefObject<boolean>;
  setAreStepsInFlight: React.Dispatch<React.SetStateAction<boolean>>;
  editorState: EditorState;
}) => {
  if (areStepsInFlightRef.current) {
    return;
  } else {
    const sendableSteps = collab.sendableSteps(editorState);
    console.log("sendableSteps", sendableSteps);
    if (sendableSteps) {
      setAreStepsInFlight(true);
      sendSteps(
        docId,
        clientId,
        sendableSteps.version,
        sendableSteps.steps.map((step) => JSON.stringify(step.toJSON()))
      ).then(() => setAreStepsInFlight(false));
    } else {
      return;
    }
  }
};
