// ---------------------------------------------------------------------------
// Open a file picker and return the chosen image, or null if cancelled.
// ---------------------------------------------------------------------------

export function pickImageFile(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);

    let settled = false;
    function finish(blob: Blob | null) {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onFocus);
      input.remove();
      resolve(blob);
    }

    function onFocus() {
      window.setTimeout(() => {
        if (!settled && !input.files?.length) finish(null);
      }, 400);
    }

    input.addEventListener("change", () => {
      finish(input.files?.[0] ?? null);
    });
    input.addEventListener("cancel", () => finish(null));
    window.addEventListener("focus", onFocus);
    input.click();
  });
}
