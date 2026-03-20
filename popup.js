document.addEventListener("DOMContentLoaded", async () => {
  const nativeStatusEl = document.getElementById("native-status");
  const lastResultEl = document.getElementById("last-result");

  try {
    const nativeStatus = await sendMessage({ type: "PING_NATIVE_HOST" });
    nativeStatusEl.textContent = nativeStatus?.success
      ? "Native Host 已连接"
      : "Native Host 未连接，请先执行安装脚本";
  } catch (_error) {
    nativeStatusEl.textContent = "Native Host 未连接，请先执行安装脚本";
  }

  try {
    const status = await sendMessage({ type: "GET_STATUS" });
    const last = status?.state?.lastResult;
    if (!last) {
      lastResultEl.textContent = "最近一次保存：暂无记录";
      return;
    }

    const when = new Date(last.timestamp).toLocaleString("zh-CN", { hour12: false });
    if (last.ok) {
      const suffix = last.deduped ? "（已去重）" : "";
      lastResultEl.textContent = `最近一次保存：${when} ${suffix}`;
    } else {
      lastResultEl.textContent = `最近一次保存失败：${when} ${last.error || ""}`;
    }
  } catch (_error) {
    lastResultEl.textContent = "最近一次保存：读取状态失败";
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
