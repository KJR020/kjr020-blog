import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryProvider } from "../../../../../src/components/scrapbox/QueryProvider";
import { useScrapboxData } from "../../../../../src/components/scrapbox/useScrapboxData";

function Notes() {
  const { data, isError, isFetching } = useScrapboxData("KJR020");
  return (
    <output data-fetching={isFetching}>
      {isError ? "error" : (data?.[0]?.title ?? "loading")}
    </output>
  );
}

function Fixture() {
  const [mounted, setMounted] = useState(true);
  return (
    <QueryProvider>
      <button type="button" onClick={() => setMounted(!mounted)}>
        {mounted ? "unmount" : "mount"}
      </button>
      {mounted && <Notes />}
    </QueryProvider>
  );
}

const root = document.getElementById("root");
if (root === null) throw new Error("Missing fixture root");
createRoot(root).render(<Fixture />);
