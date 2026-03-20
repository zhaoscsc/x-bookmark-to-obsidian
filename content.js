(function () {
  "use strict";

  const PENDING_BY_URL = new Map();
  const RECENT_SUCCESS = new Map();
  const PENDING_TTL_MS = 15000;
  const RECENT_TTL_MS = 30000;
  const CONFIRM_DELAY_MS = 700;
  const TOAST_ID = "x-bookmark-to-obsidian-toast-root";

  document.addEventListener("click", handleDocumentClick, true);

  function handleDocumentClick(event) {
    const bookmarkButton = findClosestTestId(event.target, ["bookmark", "removeBookmark"]);
    if (!bookmarkButton) {
      return;
    }

    const testId = bookmarkButton.getAttribute("data-testid");
    if (testId !== "bookmark") {
      return;
    }

    const article = bookmarkButton.closest('article[data-testid="tweet"]');
    if (!article) {
      return;
    }

    window.setTimeout(() => maybeCaptureBookmark(article), CONFIRM_DELAY_MS);
  }

  function maybeCaptureBookmark(article) {
    const activeBookmarkButton = article.querySelector('[data-testid="removeBookmark"]');
    if (!activeBookmarkButton) {
      return;
    }

    const payload = extractTweetPayload(article);
    if (!payload?.url) {
      showToast("未识别到帖子链接，已跳过", "error");
      return;
    }

    cleanupMap(PENDING_BY_URL, PENDING_TTL_MS);
    cleanupMap(RECENT_SUCCESS, RECENT_TTL_MS);

    if (PENDING_BY_URL.has(payload.url) || RECENT_SUCCESS.has(payload.url)) {
      return;
    }

    PENDING_BY_URL.set(payload.url, Date.now());
    showToast("正在保存到 Obsidian...", "info");

    chrome.runtime.sendMessage(
      { type: "SAVE_X_BOOKMARK", payload },
      (response) => {
        PENDING_BY_URL.delete(payload.url);

        if (chrome.runtime.lastError) {
          showToast("扩展后台连接失败，请刷新页面重试", "error");
          return;
        }

        if (!response?.success) {
          const message = response?.error || "保存失败";
          showToast("保存失败: " + message, "error");
          return;
        }

        RECENT_SUCCESS.set(payload.url, Date.now());
        if (response.result?.deduped) {
          showToast("这条帖子已经在 Obsidian 里了", "success");
        } else if (response.result?.fallbackUsed) {
          showToast("已保存占位笔记，可稍后手动补剪", "success");
        } else {
          showToast("已保存到 Obsidian", "success");
        }
      }
    );
  }

  function extractTweetPayload(article) {
    const statusLink = findStatusLink(article);
    const authorAnchor = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
    const authorHandle = extractHandle(statusLink?.getAttribute("href") || authorAnchor?.getAttribute("href") || "");
    const authorName = extractAuthorName(article);
    const text = article.querySelector('[data-testid="tweetText"]')?.innerText?.trim() || "";
    const timeEl = article.querySelector("time");
    const metrics = extractMetrics(article);

    const url = normalizeStatusUrl(statusLink?.href || statusLink?.getAttribute("href") || "");
    const tweetIdMatch = url.match(/status\/(\d+)/);

    return {
      url,
      tweet_id: tweetIdMatch ? tweetIdMatch[1] : "",
      author_handle: authorHandle,
      author_name: authorName,
      text,
      published_at: timeEl?.getAttribute("datetime") || "",
      captured_at: new Date().toISOString(),
      source: "x-bookmark-click",
      metrics,
    };
  }

  function extractAuthorName(article) {
    const userName = article.querySelector('[data-testid="User-Name"]');
    if (!userName) {
      return "";
    }
    const lines = userName.innerText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    for (const line of lines) {
      if (!line.startsWith("@")) {
        return line;
      }
    }
    return lines[0] || "";
  }

  function extractMetrics(article) {
    const metrics = {
      replies: "0",
      reposts: "0",
      likes: "0",
      views: "0",
    };
    const group = article.querySelector('[role="group"]');
    if (!group) {
      return metrics;
    }

    const map = {
      reply: "replies",
      retweet: "reposts",
      like: "likes",
    };

    Object.entries(map).forEach(([testId, key]) => {
      const el = group.querySelector(`[data-testid="${testId}"]`);
      const label = el?.getAttribute("aria-label") || "";
      const match = label.match(/([\d,.]+(?:[KMB万亿])?)/i);
      if (match) {
        metrics[key] = match[1];
      }
    });

    const analytics = article.querySelector('a[href*="/analytics"]');
    const viewLabel = analytics?.getAttribute("aria-label") || "";
    const match = viewLabel.match(/([\d,.]+(?:[KMB万亿])?)/i);
    if (match) {
      metrics.views = match[1];
    }

    return metrics;
  }

  function findStatusLink(article) {
    const candidates = article.querySelectorAll('a[href*="/status/"]');
    for (const candidate of candidates) {
      if (candidate.closest('[data-testid="quoteTweet"]')) {
        continue;
      }
      if (candidate.querySelector("time")) {
        return candidate;
      }
    }
    return candidates[0] || null;
  }

  function normalizeStatusUrl(href) {
    if (!href) {
      return "";
    }
    const raw = href.startsWith("http") ? href : "https://x.com" + href;
    try {
      const url = new URL(raw);
      const match = url.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
      if (!match) {
        return raw;
      }
      return `https://x.com/${match[1]}/status/${match[2]}`;
    } catch (_error) {
      return raw;
    }
  }

  function extractHandle(href) {
    const match = href.match(/^\/([^/]+)(?:\/|$)/);
    return match ? match[1].replace(/^@/, "") : "";
  }

  function findClosestTestId(element, testIds) {
    let current = element;
    while (current && current !== document.body) {
      const testId = current.getAttribute?.("data-testid");
      if (testId && testIds.includes(testId)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  function cleanupMap(map, ttlMs) {
    const now = Date.now();
    for (const [key, value] of map.entries()) {
      if (now - value > ttlMs) {
        map.delete(key);
      }
    }
  }

  function getToastRoot() {
    let root = document.getElementById(TOAST_ID);
    if (root) {
      return root;
    }
    root = document.createElement("div");
    root.id = TOAST_ID;
    document.documentElement.appendChild(root);
    return root;
  }

  function showToast(message, type) {
    const root = getToastRoot();
    const toast = document.createElement("div");
    toast.className = "x-bto-toast x-bto-" + type;
    toast.textContent = message;
    root.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("is-visible"));

    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 220);
    }, 2200);
  }
})();
