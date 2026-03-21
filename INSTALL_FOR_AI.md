# Install Guide for Claude Code / Codex

This file is for AI coding agents that can run commands on the user's own Mac.

It is written for tools such as:

- Claude Code
- Codex CLI / Codex app

It is not meant for web-only chatbots that cannot access the user's terminal or browser.

## Goal

Install the `x-bookmark-to-obsidian` Chrome extension on a user's Mac, set up the bundled Native Host, and help the user finish the last Chrome steps safely.

## What the agent should do

1. Clone or download this repository to a local folder.
2. Run the bundled installer:

```bash
cd x-bookmark-to-obsidian
bash install.command
```

3. Confirm that the Native Host manifest exists at:

```text
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.btl.file_writer.json
```

4. Confirm that the bundled runtime exists at:

```text
~/Library/Application Support/x-bookmark-to-obsidian/native-host/
```

5. Tell the user how to finish loading the unpacked extension in Chrome:
   - Open `chrome://extensions`
   - Turn on Developer mode
   - Click "Load unpacked"
   - Select the extracted extension directory

6. Ask the user to open the extension popup and confirm:
   - `Native Host 已连接`

7. Ask the user to choose an Obsidian output folder in the popup.

8. Ask the user to test by bookmarking one post on `x.com`.

## What the agent should not assume

- Do not assume Chrome can always be fully controlled without user confirmation.
- Do not assume the user wants any other system changes.
- Do not assume an Obsidian path in advance.
- Do not rewrite unrelated files or shell config.

## User-facing explanation the agent can give

The agent should explain the installation in simple terms:

- This extension needs one Chrome extension directory
- It also needs one small local helper installed by `install.command`
- After that, the user only needs to pick an Obsidian folder once

## Recommended verification steps

The agent should verify:

- `python3` is available
- `install.command` finished successfully
- Native Host manifest was written
- Chrome extension was loaded from the correct folder
- Extension popup shows `Native Host 已连接`
- Saving path is configured

## Expected limitations

- This project currently targets `macOS + Chrome`
- The user still needs to confirm or perform the Chrome "Load unpacked" step
- The user still needs to select their own Obsidian folder

## Short prompt users can paste to an AI agent

```text
Please help me install this project on my Mac:
https://github.com/zhaoscsc/x-bookmark-to-obsidian

You may run local terminal commands on this machine.
Please:
1. download or clone the repo
2. run install.command
3. verify the Native Host is installed
4. guide me through the final Chrome "Load unpacked" step
5. help me verify the extension popup says Native Host is connected
6. remind me to choose my Obsidian output folder

If a step needs my manual confirmation in Chrome, stop and tell me exactly what to click.
```
