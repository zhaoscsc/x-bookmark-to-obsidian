const NATIVE_HOST_NAME = "com.btl.file_writer";

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    extensionMode: "x-bookmark-to-obsidian",
    lastResult: null,
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SAVE_X_BOOKMARK") {
    handleSaveBookmark(message.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => {
        const failure = {
          ok: false,
          error: error.message || "unknown error",
          timestamp: Date.now(),
        };
        chrome.storage.local.set({ lastResult: failure });
        sendResponse({ success: false, error: failure.error, result: failure });
      });
    return true;
  }

  if (message?.type === "PING_NATIVE_HOST") {
    chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, { action: "ping" })
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message?.type === "GET_STATUS") {
    chrome.storage.local.get({
      lastResult: null,
      extensionMode: "x-bookmark-to-obsidian",
    }).then((state) => sendResponse({ success: true, state }));
    return true;
  }
});

async function handleSaveBookmark(payload) {
  const safePayload = sanitizePayload(payload);
  validatePayload(safePayload);

  const result = await chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, {
    action: "save_x_bookmark",
    payload: safePayload,
  });

  if (!result?.success) {
    throw new Error(result?.error || "native host failed");
  }

  const persisted = {
    ok: true,
    timestamp: Date.now(),
    url: safePayload.url,
    path: result.path,
    deduped: !!result.deduped,
    fallbackUsed: !!result.fallback_used,
    fetchStatus: result.fetch_status || "unknown",
    noteTitle: result.note_title || "",
  };
  await chrome.storage.local.set({ lastResult: persisted });
  return persisted;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("missing payload");
  }
  if (typeof payload.url !== "string" || !/^https:\/\/(x|twitter)\.com\/.+\/status\/\d+/.test(payload.url)) {
    throw new Error("invalid tweet url");
  }
}

function sanitizePayload(payload) {
  const text = typeof payload?.text === "string" ? payload.text.slice(0, 4000) : "";
  const authorName = typeof payload?.author_name === "string" ? payload.author_name.slice(0, 200) : "";
  const authorHandle = typeof payload?.author_handle === "string" ? payload.author_handle.slice(0, 100) : "";
  const metrics = payload?.metrics && typeof payload.metrics === "object" ? payload.metrics : {};

  return {
    url: String(payload?.url || ""),
    tweet_id: String(payload?.tweet_id || ""),
    author_handle: authorHandle,
    author_name: authorName,
    text,
    published_at: String(payload?.published_at || ""),
    captured_at: String(payload?.captured_at || ""),
    source: "x-bookmark-click",
    metrics: {
      likes: String(metrics.likes || ""),
      reposts: String(metrics.reposts || ""),
      views: String(metrics.views || ""),
      replies: String(metrics.replies || ""),
    },
  };
}
