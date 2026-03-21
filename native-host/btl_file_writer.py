#!/usr/bin/env python3
"""
Native messaging host for the X bookmark -> Obsidian workflow.

Actions:
  - ping: health check
  - pick_folder: open a folder picker on macOS
  - write_file: write an arbitrary file under the user's home directory
  - save_x_bookmark: fetch a tweet via local x-fetcher and save markdown note
"""

from __future__ import annotations

import json
import os
import re
import struct
import subprocess
import sys
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple


HOME = Path.home()
DEFAULT_OUTPUT_DIR = ""
LOG_DIR = HOME / "Library" / "Logs" / "x-bookmark-to-obsidian"
LOG_FILE = LOG_DIR / "native-host.log"
X_FETCHER_PATH = Path(__file__).with_name("fetch_tweet.py")
MAX_MESSAGE_BYTES = 1024 * 1024


def read_message() -> Optional[Dict[str, Any]]:
    try:
        raw_length = sys.stdin.buffer.read(4)
        if len(raw_length) < 4:
            return None
        length = struct.unpack("<I", raw_length)[0]
        if length > MAX_MESSAGE_BYTES:
            log_event("read_message_too_large", length=length)
            return None
        raw = sys.stdin.buffer.read(length)
        message = json.loads(raw.decode("utf-8"))
        log_event("message_received", action=message.get("action"), length=length)
        return message
    except Exception as exc:
        log_event("read_message_failed", error=str(exc))
        raise


def send_message(msg: Dict[str, Any]) -> None:
    encoded = json.dumps(msg, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def log_event(event: str, **fields: Any) -> None:
    try:
      LOG_DIR.mkdir(parents=True, exist_ok=True)
      payload = {
          "time": datetime.now().isoformat(timespec="seconds"),
          "event": event,
          **fields,
      }
      with LOG_FILE.open("a", encoding="utf-8") as handle:
          handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:
      pass


def validate_path(file_path: str) -> Tuple[Optional[Path], Optional[str]]:
    if "\x00" in file_path:
        return None, "path contains null byte"
    parts = file_path.replace("\\", "/").split("/")
    if ".." in parts:
        return None, "path contains .."

    resolved = Path(os.path.realpath(os.path.expanduser(file_path)))
    if not str(resolved).startswith(str(HOME)):
        return None, "path is outside home directory"
    return resolved, None


def validate_directory_path(dir_path: str) -> Tuple[Optional[Path], Optional[str]]:
    if "\x00" in dir_path:
        return None, "path contains null byte"
    expanded = os.path.expanduser(dir_path)
    if not os.path.isabs(expanded):
        return None, "output_dir must be an absolute path"
    resolved = Path(os.path.realpath(expanded))
    return resolved, None


def pick_folder() -> Dict[str, Any]:
    try:
        proc = subprocess.run(
            ["osascript", "-e", 'POSIX path of (choose folder with prompt "选择 Obsidian 保存目录")'],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            path = proc.stdout.strip().rstrip("/")
            return {"success": True, "path": path, "name": os.path.basename(path)}
        return {"success": False, "error": "cancelled"}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "timeout"}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def write_file(file_path: str, content: str, overwrite: bool = False) -> Dict[str, Any]:
    try:
        resolved, err = validate_path(file_path)
        if err:
            return {"success": False, "error": err}

        assert resolved is not None
        resolved.parent.mkdir(parents=True, exist_ok=True)

        final_path = resolved
        if not overwrite:
            counter = 0
            while final_path.exists():
                counter += 1
                final_path = resolved.with_name(f"{resolved.stem} ({counter}){resolved.suffix}")

        final_path.write_text(content, encoding="utf-8")
        return {"success": True, "path": str(final_path)}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def sanitize_filename(name: str, max_len: int = 80) -> str:
    value = re.sub(r"[\x00-\x1f\x7f]", "", name or "")
    value = re.sub(r'[\\/:*?"<>|]', " ", value)
    value = re.sub(r"\s+", " ", value).strip().strip(".")
    return (value or "untitled")[:max_len].rstrip()


def normalize_url(url: str) -> str:
    match = re.search(r"https://(?:x|twitter)\.com/([^/]+)/status/(\d+)", url or "")
    if not match:
        return url or ""
    return f"https://x.com/{match.group(1)}/status/{match.group(2)}"


def detect_existing_note(url: str, output_dir: Path) -> Optional[Path]:
    if not output_dir.exists():
        return None
    needle = normalize_url(url)
    for path in output_dir.glob("*.md"):
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        frontmatter = text[:2000]
        if re.search(rf"^url:\s*[\"']?{re.escape(needle)}[\"']?\s*$", frontmatter, flags=re.MULTILINE):
            return path
    return None


def format_author(author_name: str, handle: str) -> str:
    clean_name = (author_name or "").strip()
    clean_handle = (handle or "").strip().lstrip("@")
    if clean_name and clean_handle:
        return f"[{clean_name} @{clean_handle}]"
    if clean_handle:
        return f"[@{clean_handle}]"
    if clean_name:
        return f"[{clean_name}]"
    return "[]"


def parse_created_date(value: str) -> Tuple[str, str]:
    if not value:
        today = datetime.now().strftime("%Y-%m-%d")
        return today, today
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        local_dt = dt.astimezone()
        return local_dt.strftime("%Y-%m-%d"), local_dt.strftime("%Y-%m-%d")
    except Exception:
        date_only = value[:10] if len(value) >= 10 else datetime.now().strftime("%Y-%m-%d")
        return date_only, datetime.now().strftime("%Y-%m-%d")


def build_title(fetch_data: Optional[Dict[str, Any]], payload: Dict[str, Any]) -> str:
    tweet = (fetch_data or {}).get("tweet", {})
    title_source = ""
    if tweet.get("is_article") and tweet.get("article", {}).get("title"):
        title_source = tweet["article"]["title"]
    else:
        title_source = tweet.get("text") or payload.get("text") or payload.get("tweet_id") or "x-bookmark"
    title_source = title_source.splitlines()[0]
    return sanitize_filename(title_source, max_len=60)


def build_markdown(fetch_data: Optional[Dict[str, Any]], payload: Dict[str, Any], fetch_error: str = "") -> Tuple[str, str]:
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    normalized_url = normalize_url(payload.get("url", ""))
    tweet = (fetch_data or {}).get("tweet", {})
    title = build_title(fetch_data, payload)
    image_width = normalize_image_width(payload.get("image_display_width", ""))

    if fetch_data and not fetch_error:
        published, _modified = parse_created_date(tweet.get("created_at", ""))
        author_name = tweet.get("author") or payload.get("author_name", "")
        handle = tweet.get("screen_name") or fetch_data.get("username") or payload.get("author_handle", "")
        text = tweet.get("article", {}).get("full_text") or tweet.get("text") or payload.get("text") or ""
        metrics = {
            "点赞": tweet.get("likes"),
            "转发": tweet.get("retweets"),
            "浏览": tweet.get("views"),
            "回复": tweet.get("replies_count"),
            "收藏": tweet.get("bookmarks"),
        }
        media_lines = extract_media_lines(tweet.get("media", []) or [], image_width=image_width)
    else:
        published = payload.get("published_at", "")[:10]
        author_name = payload.get("author_name", "")
        handle = payload.get("author_handle", "")
        text = payload.get("text", "") or "抓取失败，先保留原始链接。"
        metrics = {
            "点赞": (payload.get("metrics") or {}).get("likes"),
            "转发": (payload.get("metrics") or {}).get("reposts"),
            "浏览": (payload.get("metrics") or {}).get("views"),
            "回复": (payload.get("metrics") or {}).get("replies"),
        }
        media_lines = []

    info_parts = [f"{k} {v}" for k, v in metrics.items() if v not in (None, "", "0")]
    author_value = format_author(author_name, handle)

    frontmatter_lines = ["---", f"url: {normalized_url}"]
    if author_value != "[]":
        frontmatter_lines.append(f"author: {author_value}")
    if published:
        frontmatter_lines.append(f"published: {published}")
    frontmatter_lines.append("---")

    lines = [
        *frontmatter_lines,
        f"# {title}",
        "",
        "> [!INFO] 帖子信息",
        f"> - 作者: {author_name or '@' + handle if handle else '未知作者'}",
        f"> - 链接: {normalized_url}",
        f"> - 收藏时间: {today}",
    ]

    if info_parts:
        lines.append("> - 互动数据: " + " · ".join(info_parts))

    if fetch_error:
        lines.extend([
            "> [!WARNING] 自动抓取降级",
            f"> - 原因: {fetch_error}",
            "> - 处理方式: 已先保存占位笔记，后续可用 Web Clipper Quick clip 补抓。",
        ])

    lines.extend(["", "## 正文", "", text.strip() or "（无正文）"])

    if media_lines:
        lines.extend(["", "## 媒体", ""])
        lines.extend(media_lines)

    return "\n".join(lines).strip() + "\n", title


def normalize_image_width(value: Any) -> str:
    normalized = str(value or "").strip()
    return normalized if re.fullmatch(r"[1-9]\d*", normalized) else ""


def format_image_markdown(url: str, image_width: str = "") -> str:
    clean_url = str(url or "").strip()
    if not clean_url:
        return ""
    image_width = normalize_image_width(image_width)
    if image_width:
        return f"![{image_width}]({clean_url})"
    return f"![]({clean_url})"


def extract_media_lines(media_items: Any, image_width: str = "") -> list[str]:
    lines: list[str] = []
    if isinstance(media_items, dict):
        for image in media_items.get("images", []) or []:
            if isinstance(image, dict) and image.get("url"):
                image_line = format_image_markdown(image["url"], image_width)
                if image_line:
                    lines.append(image_line)

        for video in media_items.get("videos", []) or []:
            if not isinstance(video, dict):
                continue
            thumbnail = video.get("thumbnail")
            if thumbnail:
                image_line = format_image_markdown(thumbnail, image_width)
                if image_line:
                    lines.append(image_line)
            video_url = video.get("url")
            if video_url:
                lines.append(f"[视频链接]({video_url})")
        return dedupe_lines(lines)

    if not isinstance(media_items, list):
        return lines

    for item in media_items:
        media_url = ""
        if isinstance(item, str):
            media_url = item
        elif isinstance(item, dict):
            media_url = (
                item.get("url")
                or item.get("media_url")
                or item.get("expanded_url")
                or item.get("original")
            )
        if media_url:
            image_line = format_image_markdown(media_url, image_width)
            if image_line:
                lines.append(image_line)
    return dedupe_lines(lines)


def dedupe_lines(lines: list[str]) -> list[str]:
    seen = set()
    result = []
    for line in lines:
        if line in seen:
            continue
        seen.add(line)
        result.append(line)
    return result


def run_x_fetcher(url: str) -> Tuple[Optional[Dict[str, Any]], str]:
    if not X_FETCHER_PATH.exists():
        return None, f"x-fetcher not found: {X_FETCHER_PATH}"

    cmd = ["python3", str(X_FETCHER_PATH), "--url", url]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
    except Exception as exc:
        return None, str(exc)

    stdout = (proc.stdout or "").strip()
    if not stdout:
        return None, proc.stderr.strip() or "x-fetcher returned empty output"

    try:
        data = json.loads(stdout.splitlines()[-1])
    except json.JSONDecodeError as exc:
        return None, f"invalid x-fetcher json: {exc}"

    if data.get("error"):
        return None, str(data["error"])
    return data, ""


def save_x_bookmark(payload: Dict[str, Any]) -> Dict[str, Any]:
    url = normalize_url(str(payload.get("url", "")))
    output_dir_raw = str(payload.get("output_dir", "") or DEFAULT_OUTPUT_DIR).strip()
    if not output_dir_raw:
        return {"success": False, "error": "please configure obsidian output directory first"}
    output_dir, dir_err = validate_directory_path(output_dir_raw)
    if dir_err:
        return {"success": False, "error": dir_err}
    assert output_dir is not None
    log_event("save_requested", url=url, tweet_id=payload.get("tweet_id", ""))
    if not re.match(r"^https://x\.com/[^/]+/status/\d+$", url):
        return {"success": False, "error": "invalid tweet url"}

    existing = detect_existing_note(url, output_dir)
    if existing:
        log_event("deduped", url=url, path=str(existing))
        return {
            "success": True,
            "path": str(existing),
            "deduped": True,
            "fallback_used": False,
            "fetch_status": "existing",
            "note_title": existing.stem,
        }

    fetch_data, fetch_error = run_x_fetcher(url)
    markdown, title = build_markdown(fetch_data, payload, fetch_error=fetch_error)
    filename = sanitize_filename(title or payload.get("tweet_id", "x-bookmark"), max_len=80) + ".md"
    output_path = output_dir / filename
    result = write_file(str(output_path), markdown, overwrite=False)

    if not result.get("success"):
        log_event("write_failed", url=url, error=result.get("error", "unknown"))
        return result

    log_event(
        "saved",
        url=url,
        path=result["path"],
        fallback_used=bool(fetch_error),
        fetch_status="fallback" if fetch_error else "success",
    )
    return {
        "success": True,
        "path": result["path"],
        "deduped": False,
        "fallback_used": bool(fetch_error),
        "fetch_status": "fallback" if fetch_error else "success",
        "note_title": title,
    }


def main() -> None:
    try:
        message = read_message()
        if not message:
            log_event("empty_message")
            return

        action = message.get("action")

        if action == "ping":
            send_message({
                "success": True,
                "version": "2.2.0",
                "output_dir": DEFAULT_OUTPUT_DIR,
                "x_fetcher": str(X_FETCHER_PATH),
            })
            return

        if action == "pick_folder":
            send_message(pick_folder())
            return

        if action == "write_file":
            path = message.get("path", "")
            content = message.get("content", "")
            send_message(write_file(path, content, overwrite=False))
            return

        if action == "save_x_bookmark":
            payload = message.get("payload", {})
            send_message(save_x_bookmark(payload))
            return

        send_message({"success": False, "error": f"unknown action: {action}"})
    except Exception as exc:
        log_event("fatal_error", error=str(exc))
        try:
            send_message({"success": False, "error": str(exc)})
        except Exception:
            pass


if __name__ == "__main__":
    main()
