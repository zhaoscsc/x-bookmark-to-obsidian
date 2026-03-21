#!/usr/bin/env python3
"""
Minimal bundled X tweet fetcher for x-bookmark-to-obsidian.

This keeps the release self-contained and only supports single tweet fetching.
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional, Tuple


def parse_tweet_url(url: str) -> Tuple[str, str]:
    match = re.search(r"(?:x\.com|twitter\.com)/([a-zA-Z0-9_]{1,15})/status/(\d+)", url)
    if not match:
        raise ValueError(f"Cannot parse tweet URL: {url}")
    return match.group(1), match.group(2)


def extract_media(tweet_obj: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    media_data: Dict[str, Any] = {}
    media = tweet_obj.get("media", {})

    all_media = media.get("all", [])
    if isinstance(all_media, list):
      photos = [item for item in all_media if item.get("type") == "photo"]
      if photos:
          media_data["images"] = []
          for photo in photos:
              image_info = {"url": photo.get("url", "")}
              if photo.get("width"):
                  image_info["width"] = photo.get("width")
              if photo.get("height"):
                  image_info["height"] = photo.get("height")
              media_data["images"].append(image_info)

    videos = media.get("videos", [])
    if isinstance(videos, list) and videos:
        media_data["videos"] = []
        for video in videos:
            if not isinstance(video, dict):
                continue
            video_info: Dict[str, Any] = {}
            if video.get("url"):
                video_info["url"] = video.get("url")
            if video.get("duration"):
                video_info["duration"] = video.get("duration")
            if video.get("thumbnail_url"):
                video_info["thumbnail"] = video.get("thumbnail_url")
            if video_info:
                media_data["videos"].append(video_info)

    return media_data if media_data else None


def fetch_tweet(url: str, timeout: int = 30) -> Dict[str, Any]:
    try:
        username, tweet_id = parse_tweet_url(url)
    except ValueError as error:
        return {"url": url, "error": str(error)}

    result = {"url": url, "username": username, "tweet_id": tweet_id}
    api_url = f"https://api.fxtwitter.com/{username}/status/{tweet_id}"

    for attempt in range(2):
        try:
            req = urllib.request.Request(api_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=timeout) as response:
                data = json.loads(response.read().decode())

            if data.get("code") != 200:
                result["error"] = f"FxTwitter returned code {data.get('code')}: {data.get('message', 'Unknown')}"
                return result

            tweet = data["tweet"]
            tweet_data: Dict[str, Any] = {
                "text": tweet.get("text", ""),
                "author": tweet.get("author", {}).get("name", ""),
                "screen_name": tweet.get("author", {}).get("screen_name", ""),
                "likes": tweet.get("likes", 0),
                "retweets": tweet.get("retweets", 0),
                "bookmarks": tweet.get("bookmarks", 0),
                "views": tweet.get("views", 0),
                "replies_count": tweet.get("replies", 0),
                "created_at": tweet.get("created_at", ""),
                "is_note_tweet": tweet.get("is_note_tweet", False),
                "lang": tweet.get("lang", ""),
            }

            media = extract_media(tweet)
            if media:
                tweet_data["media"] = media

            article = tweet.get("article")
            if article:
                article_data: Dict[str, Any] = {
                    "title": article.get("title", ""),
                    "preview_text": article.get("preview_text", ""),
                    "created_at": article.get("created_at", ""),
                }
                content = article.get("content", {})
                blocks = content.get("blocks", [])
                if isinstance(blocks, list) and blocks:
                    full_text = "\n\n".join(block.get("text", "") for block in blocks if block.get("text", ""))
                    article_data["full_text"] = full_text
                    article_data["word_count"] = len(full_text.split())
                    article_data["char_count"] = len(full_text)
                tweet_data["article"] = article_data
                tweet_data["is_article"] = True
            else:
                tweet_data["is_article"] = False

            result["tweet"] = tweet_data
            return result

        except urllib.error.URLError:
            if attempt == 0:
                time.sleep(1)
                continue
            result["error"] = "Network error: failed to fetch tweet after retry"
            return result
        except urllib.error.HTTPError as error:
            result["error"] = f"HTTP {error.code}: {error.reason}"
            return result
        except Exception:
            result["error"] = "An unexpected error occurred while fetching the tweet"
            return result

    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    args = parser.parse_args()
    print(json.dumps(fetch_tweet(args.url), ensure_ascii=False))


if __name__ == "__main__":
    main()
