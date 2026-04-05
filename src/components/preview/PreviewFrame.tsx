"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useFileSystem } from "@/lib/contexts/file-system-context";
import {
  createImportMap,
  createPreviewHTML,
} from "@/lib/transform/jsx-transformer";
import { AlertCircle } from "lucide-react";

export function PreviewFrame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { getAllFiles, refreshTrigger } = useFileSystem();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const iframeHasContentRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [entryPoint, setEntryPoint] = useState<string>("/App.jsx");
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    const updatePreview = () => {
      try {
        const files = getAllFiles();

        // Clear error first when we have files
        if (files.size > 0 && error) {
          setError(null);
        }

        // Find the entry point - look for App.jsx, App.tsx, index.jsx, or index.tsx
        let foundEntryPoint = entryPoint;
        const possibleEntries = [
          "/App.jsx",
          "/App.tsx",
          "/index.jsx",
          "/index.tsx",
          "/src/App.jsx",
          "/src/App.tsx",
        ];

        if (!files.has(entryPoint)) {
          const found = possibleEntries.find((path) => files.has(path));
          if (found) {
            foundEntryPoint = found;
            setEntryPoint(found);
          } else if (files.size > 0) {
            // Just use the first .jsx/.tsx file found
            const firstJSX = Array.from(files.keys()).find(
              (path) => path.endsWith(".jsx") || path.endsWith(".tsx")
            );
            if (firstJSX) {
              foundEntryPoint = firstJSX;
              setEntryPoint(firstJSX);
            }
          }
        }

        if (files.size === 0) {
          if (isFirstLoad) {
            setError("firstLoad");
          } else {
            setError("No files to preview");
          }
          return;
        }

        // We have files, so it's no longer the first load
        if (isFirstLoad) {
          setIsFirstLoad(false);
        }

        if (!foundEntryPoint || !files.has(foundEntryPoint)) {
          setError(
            "No React component found. Create an App.jsx or index.jsx file to get started."
          );
          return;
        }

        const { importMap, styles, errors } = createImportMap(files);
        const previewHTML = createPreviewHTML(foundEntryPoint, importMap, styles, errors, isDarkRef.current);

        if (iframeRef.current) {
          const iframe = iframeRef.current;

          // Need both allow-scripts and allow-same-origin for blob URLs in import map
          iframe.setAttribute(
            "sandbox",
            "allow-scripts allow-same-origin allow-forms"
          );
          iframe.srcdoc = previewHTML;
          iframeHasContentRef.current = true;

          setError(null);
        }
      } catch (err) {
        console.error("Preview error:", err);
        setError(err instanceof Error ? err.message : "Unknown preview error");
      }
    };

    updatePreview();
  }, [refreshTrigger, getAllFiles, entryPoint, error, isFirstLoad]);

  // Send theme changes to the existing iframe without reloading it
  useEffect(() => {
    if (!iframeHasContentRef.current || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: "theme-change", isDark }, "*");
  }, [isDark]);

  if (error) {
    if (error === "firstLoad") {
      return (
        <div className="h-full flex items-center justify-center p-8 bg-neutral-50 dark:bg-neutral-900">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/50 mb-4">
              <svg
                className="h-8 w-8 text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Welcome to UI Generator
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              Start building React components with AI assistance
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              Ask the AI to create your first component to see it live here
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex items-center justify-center p-8 bg-neutral-50 dark:bg-neutral-900">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
            <AlertCircle className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            No Preview Available
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{error}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
            Start by creating a React component using the AI assistant
          </p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className="w-full h-full border-0"
      title="Preview"
    />
  );
}
