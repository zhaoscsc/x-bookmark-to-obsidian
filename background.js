const NATIVE_HOST_NAME = "com.btl.file_writer";
const DEFAULT_OUTPUT_DIR = "";
const INSTALL_HINT = "未完成本机安装，请先运行 install.command 后重试";

chrome.runtime.onInstalled.addListener(async () => {
  const syncState = await chrome.storage.sync.get({
    obsidianOutputDir: DEFAULT_OUTPUT_DIR,
    imageDisplayWidth: "",
  });
  await chrome.storage.local.set({
    extensionMode: "x-bookmark-to-obsidian",
    lastResult: null,
  });
  await chrome.storage.sync.set({
    obsidianOutputDir: syncState.obsidianOutputDir || DEFAULT_OUTPUT_DIR,
    imageDisplayWidth: sanitizeImageWidth(syncState.imageDisplayWidth),
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
      .catch((error) => sendResponse({ success: false, error: mapNativeHostError(error) }));
    return true;
  }

  if (message?.type === "GET_STATUS") {
    chrome.storage.local.get({
      lastResult: null,
      extensionMode: "x-bookmark-to-obsidian",
    }).then(async (state) => {
      const syncState = await chrome.storage.sync.get({
        obsidianOutputDir: DEFAULT_OUTPUT_DIR,
        imageDisplayWidth: "",
      });
      sendResponse({
        success: true,
        state: {
          ...state,
          obsidianOutputDir: syncState.obsidianOutputDir || DEFAULT_OUTPUT_DIR,
          imageDisplayWidth: sanitizeImageWidth(syncState.imageDisplayWidth),
        },
      });
    });
    return true;
  }

  if (message?.type === "PICK_OUTPUT_DIR") {
    chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, { action: "pick_folder" })
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: mapNativeHostError(error) }));
    return true;
  }
});

async function handleSaveBookmark(payload) {
  const safePayload = sanitizePayload(payload);
  validatePayload(safePayload);
  const syncState = await chrome.storage.sync.get({
    obsidianOutputDir: DEFAULT_OUTPUT_DIR,
    imageDisplayWidth: "",
  });
  safePayload.output_dir = (syncState.obsidianOutputDir || DEFAULT_OUTPUT_DIR).trim();
  safePayload.image_display_width = sanitizeImageWidth(syncState.imageDisplayWidth);

  if (!safePayload.output_dir) {
    throw new Error("请先在插件弹窗中设置 Obsidian 保存路径");
  }

  let result;
  try {
    result = await chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, {
      action: "save_x_bookmark",
      payload: safePayload,
    });
  } catch (error) {
    throw new Error(mapNativeHostError(error));
  }

  if (!result?.success) {
    throw new Error(result?.error || INSTALL_HINT);
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

function sanitizeImageWidth(value) {
  const normalized = String(value || "").trim();
  return /^[1-9]\d*$/.test(normalized) ? normalized : "";
}

function mapNativeHostError(error) {
  const message = String(error?.message || error || "");
  if (
    message.includes("Specified native messaging host not found") ||
    message.includes("Native host has exited") ||
    message.includes("Access to the specified native messaging host is forbidden")
  ) {
    return INSTALL_HINT;
  }
  return message || INSTALL_HINT;
}
