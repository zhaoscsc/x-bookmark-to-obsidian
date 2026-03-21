document.addEventListener("DOMContentLoaded", async () => {
  const DEFAULT_OUTPUT_DIR = "";
  const INSTALL_HINT = "Native Host 未连接，请先运行 install.command";
  const nativeStatusEl = document.getElementById("native-status");
  const lastResultEl = document.getElementById("last-result");
  const outputDirEl = document.getElementById("output-dir");
  const saveDirBtn = document.getElementById("save-dir");
  const pickDirBtn = document.getElementById("pick-dir");
  const saveDirStatusEl = document.getElementById("save-dir-status");

  const syncState = await chrome.storage.sync.get({
    obsidianOutputDir: DEFAULT_OUTPUT_DIR,
  });
  outputDirEl.value = syncState.obsidianOutputDir || "";

  try {
    const nativeStatus = await sendMessage({ type: "PING_NATIVE_HOST" });
    nativeStatusEl.textContent = nativeStatus?.success
      ? "Native Host 已连接"
      : INSTALL_HINT;
  } catch (_error) {
    nativeStatusEl.textContent = INSTALL_HINT;
  }

  try {
    const status = await sendMessage({ type: "GET_STATUS" });
    const last = status?.state?.lastResult;
    if (!last) {
      lastResultEl.textContent = "最近一次保存：暂无记录";
    } else {
      const when = new Date(last.timestamp).toLocaleString("zh-CN", { hour12: false });
      if (last.ok) {
        const suffix = last.deduped ? "（已去重）" : "";
        lastResultEl.textContent = `最近一次保存：${when} ${suffix}`;
      } else {
        lastResultEl.textContent = `最近一次保存失败：${when} ${last.error || ""}`;
      }
    }
  } catch (_error) {
    lastResultEl.textContent = "最近一次保存：读取状态失败";
  }

  saveDirBtn.addEventListener("click", async () => {
    const nextPath = outputDirEl.value.trim();
    if (!isValidAbsolutePath(nextPath)) {
      saveDirStatusEl.textContent = "请输入绝对路径，或使用“选择文件夹”。";
      return;
    }
    await chrome.storage.sync.set({ obsidianOutputDir: nextPath });
    saveDirStatusEl.textContent = "保存路径已更新。";
  });

  pickDirBtn.addEventListener("click", async () => {
    saveDirStatusEl.textContent = "正在打开文件夹选择器...";
    try {
      const result = await sendMessage({ type: "PICK_OUTPUT_DIR" });
      if (!result?.success || !result.path) {
        saveDirStatusEl.textContent = result?.error
          ? "选择失败：" + result.error
          : "未选择文件夹。";
        return;
      }
      outputDirEl.value = result.path;
      await chrome.storage.sync.set({ obsidianOutputDir: result.path });
      saveDirStatusEl.textContent = "保存路径已更新。";
    } catch (_error) {
      saveDirStatusEl.textContent = "打开文件夹选择器失败。";
    }
  });
});

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(response);
    });
  });
}

function isValidAbsolutePath(value) {
  return value.startsWith("/") || value.startsWith("~/");
}
