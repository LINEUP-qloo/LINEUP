import type { Metadata } from "next";
import LineupApp from "../lineup-app";

export const metadata: Metadata = {
  title: "Build a bill · LINEUP",
};

export default function AppPage() {
  return <LineupApp />;
}
