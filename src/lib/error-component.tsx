import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

function friendlyMessage(error: Error): string {
  const msg = error.message || "";
  if (/invariant failed/i.test(msg) || /content-type/i.test(msg) || /expected result/i.test(msg)) {
    return "Automatic transcription hit a snag. Try Transcribe this span again, or type what you hear.";
  }
  return msg || "An unexpected error occurred. Try reloading the page.";
}

export function AppErrorComponent({ error, reset }: ErrorComponentProps) {
  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      }
    >
      <span className="text-red-500" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">
        {friendlyMessage(error)}
      </p>
      {error.message && friendlyMessage(error) !== error.message ? (
        <p className="max-w-md text-xs break-words text-zinc-400 dark:text-zinc-500">{error.message}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-2 h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Try again
      </button>
    </main>
  );
}
