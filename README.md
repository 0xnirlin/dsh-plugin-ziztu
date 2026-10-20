# Ziztu for DeepSeek Harness

Plan, write and make micro dramas and anime episodes from your DeepSeek Harness agent. This plugin connects the harness to [Ziztu](https://getziztu.com)'s hosted MCP server with your own API key, so the agent gets Ziztu's tools as `mcp__ziztu__<tool>`.

- Adds 30 tools: create a project, plan an episode with the Director, write and edit scripts, price any step, make first frames, animate shots, make music, export the film, and follow the jobs.
- Adds a **Ziztu** page to Settings: paste your API key, see the connection status and the tool list, and read a short list of things to ask.
- Spending stays under your control. Every tool that spends credits needs a `max_credits` cap, anything above 500 credits needs a `confirm`, and `dry_run` returns the price without starting anything. These rules are enforced by Ziztu's API, not by this plugin.
- The key is stored on your computer only (`$DSH_HOME/ziztu/settings.json`, readable by you alone) and is sent only to the server address in Settings (https://getziztu.com/mcp by default).
- No dependencies. The plugin talks to the server with Node's built-in `fetch`, and its settings page uses the React that the harness already provides.

Licence: MIT. This is a community plugin for DeepSeek Harness. It is made by the Ziztu team and is not made or endorsed by DeepSeek.

## Install

You need DeepSeek Harness (`dsh`) 0.2.x and a Ziztu API key. Make a key in the Ziztu studio at https://getziztu.com/app under Settings, API keys. Give it the `read` scope to look around, and add `generate` to make things and `export` to download films. A new account has free credits for scripts, character art and storyboards.

Pick one way to install.

**From the Plugins page (any version of `dsh`):** open **Plugins**, choose **Add plugin**, and enter one of:

- `dsh-plugin-ziztu` (the npm package)
- `https://github.com/0xnirlin/dsh-plugin-ziztu` (this repository)
- the path of a local checkout of this repository

**From the command line:**

```sh
dsh plugin --profile web add dsh-plugin-ziztu
```

or straight from GitHub, or from a local folder:

```sh
dsh plugin --profile web add github:0xnirlin/dsh-plugin-ziztu
dsh plugin --profile web add /path/to/dsh-plugin-ziztu
```

`dsh plugin` hands the arguments to pnpm in the profile folder and selects the bundle. Restart `dsh web` if the page does not show **Ziztu** under Settings.

**Add the Ziztu plugin index (optional):** with the experimental **Custom plugin markets** bundle on, open **Plugins**, **Discover**, **Add index source** and enter `https://getziztu.com/dsh/plugins.json`.

## Connect

1. Open **Settings**, then **Ziztu**.
2. Paste your key and choose **Save and connect**. The status changes to "30 tools ready".
3. Start a session and ask for something. Examples:
   - "Plan a 60 second vertical micro drama about a baker who finds a love letter in the dough. Show me the price before you make anything."
   - "Write the script for episode one of an anime about a lighthouse keeper, then turn it into a shot list."
   - "Make the first frames for this project with a cap of 200 credits."
   - "What is my credit balance, and what is the status of my jobs?"

Other ways to give the plugin a key, in order of priority: the Settings page, the plugin row's `config` (`apiKey`, and `url` for another server address), then the `ZIZTU_API_KEY` environment variable (`ZIZTU_TOKEN` also works).

## Notes

- **Full connector only.** The plugin uses an API key, which the full connector at `/mcp` accepts. Ziztu's planner edition (`/mcp/planner`, no tools that make media) takes an OAuth sign-in only, which this plugin does not do. If you want the planner, add it with the harness's own `@deepseek-ai/dsh-mcp-client` instead.
- **Tool names.** They follow the same shape as the harness's MCP client: `mcp__ziztu__list_projects`, `mcp__ziztu__quote`, and so on. Do not also add a second MCP client row named `ziztu`.
- **Long calls.** Calls time out after 180 seconds. Script drafts return a job id and are followed with `get_script_job`.
- **Permissions.** Ziztu tools run under your harness's normal tool approval. Read the `max_credits` value before you approve a call that spends credits.

## Develop

```sh
npm test    # unit tests against a fake MCP server, no network
```

Layout: `index.js` is the Host half (connection, tool registration, the settings routes under `/api/ziztu`), `client.js` is the browser half (the Settings page), `src/` holds the small Streamable HTTP client, the tool bridge, the settings store and the request fence. `cordis.patch.yml` mounts the plugin; `package.json` declares `dsh.bundle` and `dsh.client`.

## Links

- Ziztu: https://getziztu.com
- Setup guide: https://getziztu.com/connect/deepseek-harness
- Ziztu MCP docs: https://getziztu.com/docs/mcp
- Issues: https://github.com/0xnirlin/dsh-plugin-ziztu/issues
