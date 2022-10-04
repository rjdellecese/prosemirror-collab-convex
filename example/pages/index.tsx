import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import { useCollabEditor } from "prosemirror-collab-convex";

const Home: NextPage = () => {
  useCollabEditor;
  return (
    <div>
      <Head>
        <title>ProseMirror Collab Convex Example</title>
      </Head>

      <main className={styles.main}></main>
    </div>
  );
};

export default Home;
