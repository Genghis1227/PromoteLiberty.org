# PromoteLiberty Devvit RSS Auto-Poster

A native Reddit Developer Platform (Devvit) App that runs directly inside Reddit to automatically post new articles from `https://promoteliberty.org/index.xml` to `r/PromoteLiberty`.

---

## Features
- **100% Native**: Runs directly on Reddit's servers. Zero third-party API keys or expired tokens.
- **Hourly Cron Scheduler**: Automatically checks your RSS feed every hour (`0 * * * *`).
- **Duplicate Prevention**: Uses Reddit's built-in Redis database to track posted articles and prevent reposts.
- **Instant Moderator Action**: Adds a moderator button in `r/PromoteLiberty` (`Post Latest PromoteLiberty RSS`) to test or post articles immediately with one click.

---

## 3-Step Setup

### Step 1: Open Terminal in this folder
Navigate to the `devvit-rss-bot` directory:
```bash
cd devvit-rss-bot
```

### Step 2: Install dependencies & Log in to Reddit
```bash
npm install
npx devvit login
```
*(This will open your browser to authorize your Reddit account `Genghis1227`).*

### Step 3: Upload & Install to `r/PromoteLiberty`
```bash
npx devvit upload
npx devvit install PromoteLiberty
```

That's it! Your Devvit bot is now live inside `r/PromoteLiberty`.
