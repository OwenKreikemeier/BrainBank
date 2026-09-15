// ---------------------------------------------------------------------------
// NoteSearch — jump-to-note search in the top HUD
// ---------------------------------------------------------------------------
// Closed: a search button at the top-left. Open: the same control slides to
// the top-center and expands into a search field. Matches list under the bar
// with title, depth, and the root-surface ancestor. Enter jumps to the first
// result; clicking a row jumps to that note.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { useCanvasStore } from "../../store/canvasStore";
import { useNotesStore } from "../../store/notesStore";
import { useUiStore } from "../../store/uiStore";
import { searchNotes } from "../../lib/noteSearch";

export function NoteSearch({ light }: { light: boolean }) {
  const open = useUiStore((s) => s.searchOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const jumpToNote = useCanvasStore((s) => s.jumpToNote);
  const notesVersion = useNotesStore((s) => s.version);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      useUiStore.getState().setSearchOpen(false);
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  const results = useMemo(() => {
    void notesVersion;
    return searchNotes(query);
  }, [query, notesVersion]);

  function openSearch() {
    setSearchOpen(true);
  }

  function closeSearch() {
    setSearchOpen(false);
  }

  function jump(noteId: string) {
    jumpToNote(noteId);
  }

  function jumpToQuery(value: string) {
    const hits = searchNotes(value);
    if (hits.length === 0) return;
    jump(hits[0].id);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    jumpToQuery(inputRef.current?.value ?? query);
  }

  const showList = open && query.trim().length > 0;
  const ink = light ? "rgba(20,22,28,0.88)" : "rgba(255,255,255,0.92)";
  const muted = light ? "rgba(20,22,28,0.55)" : "rgba(255,255,255,0.55)";
  const chrome = light
    ? {
        border: "1px solid rgba(0,0,0,0.18)",
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
      }
    : {
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(22,24,32,0.94)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
      };

  return (
    <div data-hud>
      {open && (
        <div
          onPointerDown={closeSearch}
          style={{ position: "fixed", inset: 0, zIndex: 11 }}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: 20,
          left: open ? "50%" : 24,
          transform: open ? "translateX(-50%)" : "none",
          zIndex: 12,
          width: open ? "min(440px, calc(100% - 48px))" : 40,
          transition: "left 0.22s ease, transform 0.22s ease, width 0.22s ease",
        }}
      >
        <form
          onSubmit={onSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            height: 40,
            borderRadius: 8,
            overflow: "hidden",
            backdropFilter: "blur(10px)",
            ...chrome,
          }}
        >
          <button
            type="button"
            onClick={open ? closeSearch : openSearch}
            title={open ? "Close search" : "Search notes"}
            aria-label={open ? "Close search" : "Search notes"}
            aria-expanded={open}
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              border: "none",
              background: "transparent",
              color: ink,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SearchGlyph />
          </button>
          {open && (
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                jumpToQuery(e.currentTarget.value);
              }}
              placeholder="Search notes"
              aria-label="Search notes"
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1,
                minWidth: 0,
                height: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                color: ink,
                fontSize: 14,
                padding: "0 12px 0 0",
              }}
            />
          )}
        </form>

        {showList && (
          <div
            role="listbox"
            aria-label="Search results"
            style={{
              marginTop: 6,
              maxHeight: 320,
              overflowY: "auto",
              borderRadius: 8,
              backdropFilter: "blur(10px)",
              ...chrome,
            }}
          >
            {results.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: 13, color: muted }}>
                No notes found
              </div>
            ) : (
              results.map((hit, index) => (
                <button
                  key={hit.id}
                  type="button"
                  role="option"
                  aria-selected={index === 0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => jump(hit.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    border: "none",
                    borderBottom:
                      index < results.length - 1
                        ? light
                          ? "1px solid rgba(0,0,0,0.08)"
                          : "1px solid rgba(255,255,255,0.08)"
                        : "none",
                    background:
                      index === 0
                        ? light
                          ? "rgba(80,160,255,0.16)"
                          : "rgba(80,160,255,0.18)"
                        : "transparent",
                    color: ink,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {hit.title}
                  </div>
                  <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                    Depth {hit.depth} · {hit.rootTitle}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}
