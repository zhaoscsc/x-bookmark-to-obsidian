document.addEventListener("DOMContentLoaded", async () => {
  const DEFAULT_OUTPUT_DIR = "";
  const DEFAULT_TARGET_SYNC_COUNT = 80;
  const INSTALL_HINT = "Native Host 未连接，请先运行 install.command";
  const POLL_INTERVAL_MS = 1200;

  const nativeStatusEl = document.getElementById("native-status");
  const lastResultEl = document.getElementById("last-result");
  const outputDirEl = document.getElementById("output-dir");
  const saveDirBtn = document.getElementById("save-dir");
  const pickDirBtn = document.getElementById("pick-dir");
  const saveDirStatusEl = document.getElementById("save-dir-status");
  const syncBookmarksBtn = document.getElementById("sync-bookmarks");
  const syncStatusEl = document.getElementById("sync-status");
  const syncLastResultEl = document.getElementById("sync-last-result");
  const targetSyncCountEl = document.getElementById("target-sync-count");
  const clearActionEl = document.getElementById("clear-action");
  const clearPromptEl = document.getElementById("clear-prompt");
  const clearBookmarksBtn = document.getElementById("clear-bookmarks");
  const clearStatusEl = document.getElementById("clear-status");
  let targetSyncCountDirty = false;
  const clearActionRefs = {
    container: clearActionEl,
    prompt: clearPromptEl,
    button: clearBookmarksBtn,
    status: clearStatusEl,
  };

  const syncState = await chrome.storage.sync.get({
    obsidianOutputDir: DEFAULT_OUTPUT_DIR,
    targetSyncCount: DEFAULT_TARGET_SYNC_COUNT,
  });
  outputDirEl.value = syncState.obsidianOutputDir || "";
  targetSyncCountEl.value = sanitizeNumber(syncState.targetSyncCount, 1, 200, DEFAULT_TARGET_SYNC_COUNT);

  try {
    const nativeStatus = await sendMessage({ type: "PING_NATIVE_HOST" });
    nativeStatusEl.textContent = nativeStatus?.success ? "Native Host 已连接" : INSTALL_HINT;
  } catch (_error) {
    nativeStatusEl.textContent = INSTALL_HINT;
  }

  await refreshStatus();
  const poller = window.setInterval(refreshStatus, POLL_INTERVAL_MS);
  window.addEventListener("beforeunload", () => window.clearInterval(poller), { once: true });

  targetSyncCountEl.addEventListener("input", () => {
    targetSyncCountDirty = true;
  });

  targetSyncCountEl.addEventListener("change", async () => {
    const targetSyncCount = sanitizeNumber(targetSyncCountEl.value, 1, 200, DEFAULT_TARGET_SYNC_COUNT);
    targetSyncCountEl.value = targetSyncCount;
    await chrome.storage.sync.set({ targetSyncCount });
    targetSyncCountDirty = false;
    saveDirStatusEl.textContent = "目标同步条数已更新。";
  });

  saveDirBtn.addEventListener("click", async () => {
    const nextPath = outputDirEl.value.trim();
    if (!isValidAbsolutePath(nextPath)) {
      saveDirStatusEl.textContent = "请输入绝对路径，或使用“选择文件夹”。";
      return;
    }

    const targetSyncCount = sanitizeNumber(targetSyncCountEl.value, 1, 200, DEFAULT_TARGET_SYNC_COUNT);
    targetSyncCountEl.value = targetSyncCount;
    await chrome.storage.sync.set({
      obsidianOutputDir: nextPath,
      targetSyncCount,
    });
    targetSyncCountDirty = false;
    saveDirStatusEl.textContent = "保存路径已更新。";
  });

  pickDirBtn.addEventListener("click", async () => {
    saveDirStatusEl.textContent = "正在打开文件夹选择器...";
    try {
      const result = await sendMessage({ type: "PICK_OUTPUT_DIR" });
      if (!result?.success || !result.path) {
        saveDirStatusEl.textContent = result?.error ? "选择失败：" + result.error : "未选择文件夹。";
        return;
      }
      outputDirEl.value = result.path;
      await chrome.storage.sync.set({ obsidianOutputDir: result.path });
      saveDirStatusEl.textContent = "保存路径已更新。";
    } catch (_error) {
      saveDirStatusEl.textContent = "打开文件夹选择器失败。";
    }
  });

  syncBookmarksBtn.addEventListener("click", async () => {
    const outputDir = outputDirEl.value.trim();
    if (!isValidAbsolutePath(outputDir)) {
      syncStatusEl.textContent = "请先填写有效的 Obsidian 绝对路径。";
      return;
    }

    const targetSyncCount = sanitizeNumber(targetSyncCountEl.value, 1, 200, DEFAULT_TARGET_SYNC_COUNT);
    targetSyncCountEl.value = targetSyncCount;

    syncBookmarksBtn.disabled = true;
    syncStatusEl.textContent = `正在请求书签页开始同步，目标 ${targetSyncCount} 条...`;

    try {
      await chrome.storage.sync.set({
        obsidianOutputDir: outputDir,
        targetSyncCount,
      });
      targetSyncCountDirty = false;

      const response = await sendMessage({
        type: "START_BOOKMARK_PAGE_SYNC",
        options: {
          targetItems: targetSyncCount,
        },
      });

      if (!response?.success) {
        syncStatusEl.textContent = "同步失败：" + (response?.error || "未知错误");
        await refreshStatus();
        return;
      }

      syncStatusEl.textContent = formatSyncSummary(response.result || {});
      await refreshStatus();
    } catch (error) {
      syncStatusEl.textContent = "同步失败：" + (error?.message || "未知错误");
    } finally {
      syncBookmarksBtn.disabled = false;
    }
  });

  clearBookmarksBtn.addEventListener("click", async () => {
    clearBookmarksBtn.disabled = true;
    clearStatusEl.textContent = "正在清除本轮成功书签...";

    try {
      const response = await sendMessage({ type: "CLEAR_LAST_SYNC_BOOKMARKS" });
      if (!response?.success) {
        clearStatusEl.textContent = "清除失败：" + (response?.error || "未知错误");
        await refreshStatus();
        return;
      }

      await refreshStatus();
    } catch (error) {
      clearStatusEl.textContent = "清除失败：" + (error?.message || "未知错误");
    } finally {
      clearBookmarksBtn.disabled = false;
    }
  });

  async function refreshStatus() {
    try {
      const status = await sendMessage({ type: "GET_STATUS" });
      const state = status?.state || {};
      const last = state.lastResult;
      const lastSync = state.lastSyncResult;
      const activeRun = state.activeRunStatus;

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

      if (document.activeElement !== targetSyncCountEl && !targetSyncCountDirty) {
        targetSyncCountEl.value = sanitizeNumber(state.targetSyncCount, 1, 200, DEFAULT_TARGET_SYNC_COUNT);
      }
      renderSyncStatus(syncStatusEl, activeRun, lastSync);
      renderLastSyncResult(syncLastResultEl, lastSync);
      renderClearAction(clearActionRefs, lastSync, activeRun);
      syncBookmarksBtn.disabled = !!activeRun?.isRunning;
      clearBookmarksBtn.disabled = !!activeRun?.isRunning;
    } catch (_error) {
      lastResultEl.textContent = "最近一次保存：读取状态失败";
      syncLastResultEl.textContent = "最近一次批量同步：读取状态失败";
      syncStatusEl.textContent = "运行状态读取失败。";
      renderClearAction(clearActionRefs, null, null);
    }
  }
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

function sanitizeNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function renderSyncStatus(target, activeRun, lastSync) {
  if (activeRun?.isRunning) {
    target.textContent = activeRun.statusLine || "正在运行...";
    return;
  }

  if (lastSync?.ok) {
    target.textContent = formatSyncSummary(lastSync);
    return;
  }

  if (lastSync?.error) {
    target.textContent = "同步失败：" + lastSync.error;
    return;
  }

  target.textContent = "运行中会在 X 书签页右上角显示常驻进度面板。";
}

function formatSyncSummary(result) {
  const parts = [
    `目标 ${result.targetItems || result.attempted || 0} 条`,
    `实际处理 ${result.attempted || 0} 条`,
    `新增 ${result.saved || 0}`,
    `去重 ${result.deduped || 0}`,
  ];
  if (result.fallback) {
    parts.push(`降级 ${result.fallback}`);
  }
  if (result.failed) {
    parts.push(`失败 ${result.failed}`);
    if (result.topErrors?.length) {
      const topError = result.topErrors[0];
      parts.push(`主要原因 ${topError.message} ×${topError.count}`);
    }
  }
  if (result.stoppedReason) {
    parts.push(`原因：${describeSyncStopReason(result.stoppedReason)}`);
  }
  return parts.join("，");
}

function renderLastSyncResult(target, result) {
  if (!result) {
    target.textContent = "最近一次批量同步：暂无记录。";
    return;
  }

  const when = result.timestamp
    ? new Date(result.timestamp).toLocaleString("zh-CN", { hour12: false })
    : "未知时间";

  if (!result.ok) {
    target.textContent = `最近一次批量同步失败：${when} ${result.error || ""}`;
    return;
  }

  const summary = [when, formatSyncSummary(result)];
  target.textContent = "最近一次批量同步：" + summary.join("，");
}

function renderClearAction(refs, syncResult, activeRun) {
  refs.button.classList.remove("is-hidden");

  if (activeRun?.isRunning) {
    refs.container.classList.remove("is-hidden");
    refs.prompt.textContent = activeRun.phase === "clear"
      ? "正在清除本轮成功书签..."
      : "同步进行中，完成后可选择清除本轮成功书签。";
    refs.status.textContent = activeRun.statusLine || "";
    refs.button.classList.add("is-hidden");
    return;
  }

  if (!syncResult?.ok) {
    refs.container.classList.add("is-hidden");
    refs.prompt.textContent = "本轮同步完成后，可选择清除本轮成功书签。";
    refs.status.textContent = "默认不自动清除，避免误操作。";
    refs.button.textContent = "清除本轮成功书签";
    return;
  }

  const clearableCount = getClearCandidateCount(syncResult.clearableItems, syncResult.clearableUrls);
  const pendingCount = getClearCandidateCount(syncResult.pendingClearItems, syncResult.pendingClearUrls);
  const clearResult = syncResult.clearResult;

  if (clearableCount === 0 && !clearResult) {
    refs.container.classList.add("is-hidden");
    return;
  }

  refs.container.classList.remove("is-hidden");

  if (pendingCount > 0) {
    refs.prompt.textContent = `本轮有 ${clearableCount || pendingCount} 条书签可清除，当前剩余 ${pendingCount} 条。`;
    refs.button.textContent = pendingCount === clearableCount
      ? `清除本轮成功书签（${pendingCount}）`
      : `继续清除剩余书签（${pendingCount}）`;
    refs.button.classList.remove("is-hidden");
  } else {
    refs.prompt.textContent = `本轮 ${clearableCount} 条可清除书签已处理完清除动作。`;
    refs.button.classList.add("is-hidden");
  }

  if (!clearResult) {
    refs.status.textContent = "默认不自动清除，避免误操作。";
    return;
  }

  const summary = [
    `最近一次清除：已清除 ${clearResult.cleared || 0} 条`,
    `剩余 ${getClearCandidateCount(clearResult.remainingItems, clearResult.remainingUrls)} 条`,
  ];
  if (clearResult.failed) {
    summary.push(`失败 ${clearResult.failed}`);
  }
  if (clearResult.topErrors?.length) {
    const topError = clearResult.topErrors[0];
    summary.push(`主要原因：${topError.message} ×${topError.count}`);
  }
  if (clearResult.stoppedReason) {
    summary.push(`原因：${describeClearStopReason(clearResult.stoppedReason)}`);
  }
  refs.status.textContent = summary.join("，");
}

function describeSyncStopReason(reason) {
  if (reason === "target_reached") {
    return "已达到目标同步条数";
  }
  if (reason === "idle_limit") {
    return "后续没有加载出更多书签";
  }
  if (reason === "round_limit") {
    return "已达到内部滚动上限，可能还有更多书签未加载";
  }
  return "已停止";
}

function describeClearStopReason(reason) {
  if (reason === "completed") {
    return "全部目标书签已清除";
  }
  if (reason === "idle_limit") {
    return "连续多轮未找到更多可清除书签";
  }
  if (reason === "round_limit") {
    return "已达到内部滚动上限，可能还有书签未重新定位到";
  }
  return "已停止";
}

function getClearCandidateCount(primary, fallback) {
  if (Array.isArray(primary)) {
    return primary.length;
  }
  if (Array.isArray(fallback)) {
    return fallback.length;
  }
  return 0;
}
