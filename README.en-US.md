

# X Bookmark to Obsidian

A Chrome extension + bundled macOS installer for saving X bookmarks into Obsidian.

After you bookmark a post on `x.com`, the extension automatically scrapes the post content and saves it as a Markdown note into Obsidian.

This repository is for anyone who wants to implement the following workflow:

- See content on X that you want to keep, and casually click bookmark
- Don't want to manually copy links and paste them into Obsidian
- Want bookmarked content to automatically land in your inbox or to-do/organize folder
- Want to preserve post content, author, publish time, media links, and the original post URL

## Project Origin

This project was not built from scratch.

It is a continued modification of an existing repository: [iamzifei/bookmark-is-learned](https://github.com/iamzifei/bookmark-is-learned).

The original project focused more on "AI summarization and organization of bookmarked content". This iteration focuses on streamlining it into a more direct workflow tool:

- Click bookmark on `x.com`
- Automatically scrape post content
- Automatically save to Obsidian

Key additions and refactoring in this version include:

- Changed the main flow to "X bookmark equals save to Obsidian"
- Introduced a native host-based local saving pipeline
- Built single-post scraping capability into the distribution package
- Added placeholder note fallback on scrape failure
- Added deduplication by `url:`
- Added custom Obsidian absolute path configuration

Thanks to the original project for providing a foundational version that can be further evolved, and to the original author for laying out the early extension structure, settings page, and Native Host setup. This allowed the current iteration to focus entirely on the "X Bookmark -> Obsidian" pipeline itself.

If you want to distinguish which features come from the original project versus what was newly added, you can review the commit history for this iteration.

## Feature Overview

- Listens for bookmark actions on `x.com`, triggering saves only after successful confirmation
- Supports manual triggering of bulk sync on the bookmarks page, automatically estimating scroll depth and loading more posts
- Uses built-in scraping scripts from the distribution package to fetch post content
- Automatically falls back to a placeholder note on scrape failure to prevent loss of bookmark actions
- Supports writing image and video cover links into Markdown
- Deduplicates by the `url:` field to prevent creating duplicate notes for the same post
- Supports custom saving to any Obsidian absolute path via the extension popup

## Workflow

1. You click bookmark on X.
2. `content.js` detects that the button state has changed to "Bookmarked".
3. `background.js` extracts the post URL and minimal page info, forwarding it to the Native Host.
4. Native Host calls the built-in scraping script to fetch the full content.
5. Generates a complete Markdown note on success; generates a fallback note containing the original post link on failure.
6. Writes to your configured Obsidian directory and deduplicates based on `url:`.

## Bookmarks Page Bulk Sync

In addition to "bookmark-to-save", you can now also perform a one-time bulk sync on the `x.com/i/bookmarks` page.

Usage:

1. Open the X bookmarks page `https://x.com/i/bookmarks`
2. Click "Sync Current Bookmarks Page" in the extension popup
3. Set the "Target Sync Count"
4. The extension automatically estimates scroll depth, scrolling from the top to load more posts
5. Each round collects newly appeared post URLs and writes them to Obsidian using the existing single-post save pipeline
6. During sync and cleanup, a persistent progress panel appears in the top-right corner of the X bookmarks page
7. On failure, the popup displays the main reason for the latest bulk sync failure
8. Automatically stops after several rounds without new content, returning sync statistics
9. After sync completes, if there are posts marked as "newly saved + deduplicated as existing", you can choose to clear these X bookmarks from the popup

Default Parameters:

- Maximum of 80 sync attempts per run
- Internally auto-estimates scroll depth based on "target count"
- Stops after 3 consecutive rounds with no new content

You can modify in the popup:

- `Target Sync Count`: Maximum number of posts you want to sync in this run

Notes:

- Deduplication by `url:` still applies during sync
- Posts just saved on the current page are temporarily skipped by the frontend to avoid duplicate submissions
- This is not an X official API sync, so it still relies on lazy loading and DOM structure stability of the bookmarks page
- If you start syncing from the middle of the bookmarks page, the extension will first scroll back to the top before proceeding
- Bulk sync results are logged in the popup, including the main failure reason for the latest attempt
- The persistent progress panel in the top-right corner shows real-time progress, failure reasons, and stop reasons for sync/cleanup
- Bookmark cleanup is a manual second step and is not executed automatically by default
- Only entries marked as "newly saved + deduplicated as existing" enter the cleanup list; failed and fallback saves are not cleaned up

## System Requirements

- macOS
- Chrome Browser
- Python 3 installed locally
- An existing Obsidian vault, and you know the absolute path to save to

## Installation

The simplest way to use this is to download from GitHub Releases:

- `x-bookmark-to-obsidian-extension.zip`

This archive already contains:

- Browser extension directory
- `install.command`
- `native-host` runtime file

If you only want to distribute the installer separately, you can also use:

- `x-bookmark-to-obsidian-installer.zip`

### 1. Load Chrome Extension

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select your extracted extension directory

### 2. Run Installer

After extracting, double-click directly:

```bash
install.command
```

This step will automatically:

- Install the local Native Host
- Install the built-in scraping runtime
- Write the host manifest required by Chrome

### 3. Restart Chrome

After restarting, you should see the Native Host connection status in the extension popup.

### 4. When Reloading the Extension

This project uses a fixed extension ID, so after reloading "Load unpacked", you don't need to copy a new extension ID.

If you suspect the local installation state is broken, simply run `install.command` again.

## Configure Save Path

Open the plugin popup, in the "Save Path" section:

- Manually enter your Obsidian absolute path
- Or click "Select Folder"
- Click Save

Example:

```text
/Users/yourname/Documents/YourVault/1-Input/01-To-Organize
```

Requirements:

- Must be an absolute path
- Recommended for inbox, to-do/organize area, or input area
- Directory must actually exist

## Output Format

The generated Markdown will by default retain the following information:

- Original post URL
- Author name and handle
- Publish time
- Post content
- Interaction metrics
- Image links or video covers
- Failure explanation if scraping fails

Example frontmatter:

```yaml
---
aliases: []
tags: []
up:
url: https://x.com/user/status/123
author: [Author Name @handle]
published: 2026-03-20
source: X (Twitter)
fetch_method: x_bookmark_helper
created_at: 2026-03-20
updated_at: 2026-03-20
---
```

## Usage

1. Open `x.com`
2. Find the post you want to save
3. Click bookmark
4. The extension will prompt "Saving to Obsidian..."
5. On success, the note will appear in your configured directory

If you want to batch import existing bookmarks:

1. Open `x.com/i/bookmarks`
2. Open the extension popup
3. Click "Sync Current Bookmarks Page"
4. Adjust "Target Sync Count" if needed
5. Wait for the popup or page toast to show sync results

## FAQ

### 1. Displays Native Host Not Connected

Check:

- Chrome extension has been reloaded
- `install.command` has been run
- Chrome has been restarted
- If an old version was previously installed, try running the installer again

### 2. Text-only posts save successfully, image posts fail

This was an issue in early versions; the current version is compatible with multiple `media` structures. If anomalies persist, check the logs.

### 3. Image links are written but disappear in Obsidian

This is usually not an extension issue, but rather your Markdown cleanup rules accidentally deleting `![](...)` image syntax. Please check Linter or custom regex.

### 4. Save fails but don't want to lose the link

The extension will automatically generate a placeholder note, preserving at least the original post URL and failure time for later re-scraping.

## Debugging

- The extension popup shows Native Host status and the latest save result
- Native Host log path:

```text
~/Library/Logs/x-bookmark-to-obsidian/native-host.log
```

- If X page structure changes, prioritize checking:
  - Whether the bookmark button still uses `data-testid="bookmark"` / `removeBookmark"`
  - Whether post links can still be extracted from timestamp links
  - Whether button state still switches as expected after successful bookmarking

## Current Limitations

- Does not rely on X's official API, but therefore heavily depends on X's page structure stability
- Currently does not handle "delete note after unbookmarking"
- Currently targeted primarily at macOS + Chrome workflows
- Does not directly call Obsidian Web Clipper internal APIs
- Currently still requires a local installer; does not support "fully functional just by loading extension ZIP"
- Bookmarks page bulk sync is currently manually triggered and will not automatically run through full history in the background

## Version Notes

Core capabilities of `v2.4.0`:

- Auto-save to Obsidian upon clicking bookmark
- Supports bookmarks page bulk sync and auto-estimated scroll depth
- Supports persistent progress panel in top-right corner, showing real-time sync/cleanup status
- Supports setting target sync count in popup, and displays latest failure reason
- Supports manual cleanup of successfully synced or deduplicated bookmarks after sync
- Supports posts with images
- Supports custom absolute save paths
- Supports fallback on scrape failure and URL deduplication
- Uses fixed extension ID, eliminating need to manually copy extension ID
- Uses built-in scraping scripts, not depending on external `~/.agents` environment

## Acknowledgements

- Original project foundation: [iamzifei/bookmark-is-learned](https://github.com/iamzifei/bookmark-is-learned)
- Thanks to the original author for providing an extensible extension foundation, allowing this iteration to focus more on Obsidian workflow integration

## License

This project is licensed under the MIT License.
