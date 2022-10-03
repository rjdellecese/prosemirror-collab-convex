import {
  DataModelFromSchemaDefinition,
  defineSchema,
  defineTable,
  DocumentMapFromSchemaDefinition,
  s,
} from "convex/schema";
import {
  makeMutation,
  makeQuery,
  DatabaseReader as GenericDatabaseReader,
  TableNamesInDataModel,
  ClientQuery,
  ClientMutation,
} from "convex/server";
import { GenericId } from "convex/values";
import { Node, Schema as ProseMirrorSchema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Step } from "prosemirror-transform";

export const tableDefinitions = {
  docs: defineTable({
    doc: s.string(),
  }),
  steps: defineTable({
    docId: s.id("docs"),
    position: s.number(),
    step: s.string(),
    clientId: s.string(),
  }).index("by_doc_id", ["docId"]),
};

const schemaDefinition = defineSchema(tableDefinitions);
type SchemaDefinition = typeof schemaDefinition;
type DocumentMap = DocumentMapFromSchemaDefinition<SchemaDefinition>;
type Document<TableName extends TableNames> = DocumentMap[TableName];
type DataModel = DataModelFromSchemaDefinition<SchemaDefinition>;
type TableNames = TableNamesInDataModel<DataModel>;
export type Id<TableName extends TableNames> = GenericId<TableName>;
type DatabaseReader = GenericDatabaseReader<DataModel>;

export interface API {
  queries: APIQueries;
  mutations: APIMutations;
}

interface APIQueries {
  [key: string]: GetStepsSinceQuery & GetDocAndVersionQuery;
}

export type GetStepsSinceQuery = ClientQuery<
  ReturnType<typeof functions>["getStepsSince"]
>;
export type GetDocAndVersionQuery = ClientQuery<
  ReturnType<typeof functions>["getDocAndVersion"]
>;

interface APIMutations {
  [key: string]: SendStepsMutation & CreateEmptyDocMutation;
}

export type SendStepsMutation = ClientMutation<
  ReturnType<typeof functions>["sendSteps"]
>;
export type CreateEmptyDocMutation = ClientMutation<
  ReturnType<typeof functions>["createEmptyDoc"]
>;

export const functions = (prosemirrorSchema: ProseMirrorSchema) => ({
  getStepsSince: getStepsSince,
  sendSteps: sendSteps(prosemirrorSchema),
  getDocAndVersion: getDocAndVersion,
  createEmptyDoc: createEmptyDoc(prosemirrorSchema),
});

const getStepsSince = makeQuery<DataModel>()(
  async (
    { db },
    docId: Id<"docs">,
    version: number
  ): Promise<{ steps: string[]; clientIds: string[] }> => {
    // TODO
    // const steps = await db
    //   .table("step")
    //   .index("by_note_id")
    //   .range((q) => q.eq("noteId", note._id))
    //   .filter((q) => q.gt(q.field("position"), version))
    //   .collect();
    const steps = await db
      .table("steps")
      .filter((q) =>
        q.and(q.eq(q.field("docId"), docId), q.gt(q.field("position"), version))
      )
      .collect();

    return steps.reduce(
      (
        result: {
          steps: DocumentMap["steps"]["step"][];
          clientIds: DocumentMap["steps"]["clientId"][];
        },
        step: DocumentMap["steps"]
      ) => ({
        steps: [...result.steps, step.step],
        clientIds: [...result.clientIds, step.clientId],
      }),
      { steps: [], clientIds: [] }
    );
  }
);

const sendSteps = (prosemirrorSchema: ProseMirrorSchema) =>
  makeMutation<DataModel>()(
    async (
      { db },
      docId: Id<"docs">,
      clientId: string,
      clientPersistedVersion: number,
      steps: string[]
    ) => {
      console.log("clientId", clientId);
      console.log("clientPersistedVersion", clientPersistedVersion);
      console.log("steps", steps.length);

      const doc = await db.get(docId);

      // TODO: Error?
      if (doc === null) {
        return;
      } else {
        const persistedVersion = await getVersion(db, doc._id);

        if (clientPersistedVersion !== persistedVersion) {
          console.log("Versions are not equal.");
          return;
        }

        const parsedSteps = steps.map((step) =>
          Step.fromJSON(prosemirrorSchema, JSON.parse(step))
        );
        const parsedDoc = Node.fromJSON(prosemirrorSchema, JSON.parse(doc.doc));
        const updatedParsedDoc = parsedSteps.reduce(
          (currentDoc, step, currentIndex) => {
            db.insert("steps", {
              docId: docId,
              step: steps[currentIndex],
              clientId: clientId,
              position: persistedVersion + currentIndex + 1,
            });
            // TODO: Handle error case better here
            return step.apply(currentDoc).doc || currentDoc;
          },
          parsedDoc
        );

        db.replace(doc._id, { doc: JSON.stringify(updatedParsedDoc.toJSON()) });
      }
    }
  );

const getDocAndVersion = makeQuery<DataModel>()(
  async (
    { db },
    docId: Id<"docs">
  ): Promise<{ doc: Document<"docs">["doc"]; version: number } | null> => {
    const doc = await db.get(docId);

    if (doc === null) {
      // TODO: Could throw instead…
      return null;
    }

    const version = await getVersion(db, doc._id);

    return { doc: doc.doc, version: version };
  }
);

const createEmptyDoc = (prosemirrorSchema: ProseMirrorSchema) =>
  makeMutation<DataModel>()(
    async ({ db }): Promise<Id<"docs">> =>
      db.insert("docs", {
        doc: JSON.stringify(
          EditorState.create({ schema: prosemirrorSchema }).doc.toJSON()
        ),
      })
  );

const getVersion = async (
  db: DatabaseReader,
  docId: Id<"docs">
): Promise<number> => {
  const stepsQuery = db
    .table("steps")
    .index("by_doc_id")
    .range((q) => q.eq("docId", docId));

  const getVersion = async () => {
    let versionCounter = 0;
    // TODO: What's going on here?
    for await (const _step of stepsQuery as any) {
      versionCounter += 1;
    }
    return versionCounter;
  };

  return await getVersion();
};