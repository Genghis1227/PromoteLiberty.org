import { Devvit, JobContext } from '@devvit/public-api';

// Enable required Devvit features: HTTP Fetch, Reddit API, and persistent Redis storage
Devvit.configure({
  http: true,
  redditAPI: true,
  redis: true,
});

// Helper function to decode basic XML / HTML entities
function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '') // Strip HTML tags
    .trim();
}

// Function to fetch RSS, check for new posts, and publish to Reddit
async function checkAndPostRss(context: JobContext | { reddit: any; redis: any; subredditName?: string }) {
  const rssUrl = 'https://promoteliberty.org/index.xml';
  console.log(`[PromoteLiberty Bot] Fetching RSS feed: ${rssUrl}`);

  try {
    const res = await fetch(rssUrl);
    if (!res.ok) {
      console.error(`[PromoteLiberty Bot] Failed to fetch RSS: HTTP ${res.status}`);
      return;
    }

    const xml = await res.text();

    // Extract the first <item> in the RSS feed
    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/i);
    if (!itemMatch) {
      console.log('[PromoteLiberty Bot] No <item> found in RSS feed.');
      return;
    }

    const itemContent = itemMatch[1];

    // Extract Title
    const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? decodeXml(titleMatch[1]) : '';

    // Extract Link
    const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
    const link = linkMatch ? linkMatch[1].trim() : '';

    // Extract Description / Summary
    const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/i);
    const description = descMatch ? decodeXml(descMatch[1]) : '';

    if (!title || !link) {
      console.error('[PromoteLiberty Bot] Missing title or link in RSS item.');
      return;
    }

    console.log(`[PromoteLiberty Bot] Latest RSS Item: "${title}" (${link})`);

    // Check Redis if this post was already submitted
    const lastPostedLink = await context.redis.get('promoteliberty_last_posted_link');
    if (lastPostedLink === link) {
      console.log('[PromoteLiberty Bot] Post has already been submitted to Reddit. Skipping.');
      return;
    }

    // Format post body with clean summary and direct article link
    const postBody = description
      ? `${description}\n\n🔗 Read the full article on PromoteLiberty.org:\n${link}`
      : `🔗 Read the full article on PromoteLiberty.org:\n${link}`;

    const targetSubreddit = context.subredditName || 'PromoteLiberty';

    console.log(`[PromoteLiberty Bot] Submitting new post to r/${targetSubreddit}...`);

    const newPost = await context.reddit.submitPost({
      subredditName: targetSubreddit,
      title: title.slice(0, 300),
      text: postBody,
    });

    console.log(`[PromoteLiberty Bot] Successfully created post! Post ID: ${newPost.id}`);

    // Update Redis with the newly posted link
    await context.redis.set('promoteliberty_last_posted_link', link);
  } catch (error) {
    console.error(`[PromoteLiberty Bot] Error during RSS check: ${error}`);
  }
}

// 1. Scheduled Background Job
Devvit.addSchedulerJob({
  name: 'promoteliberty-rss-checker',
  onRun: async (event, context) => {
    console.log('[PromoteLiberty Bot] Scheduled RSS check starting...');
    await checkAndPostRss(context);
  },
});

// 2. Schedule the hourly recurring job when the app is installed or updated
Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (event, context) => {
    console.log('[PromoteLiberty Bot] App installed! Scheduling recurring hourly check...');
    await context.scheduler.runJob({
      name: 'promoteliberty-rss-checker',
      cron: '0 * * * *', // Run every hour at minute 0
    });
  },
});

Devvit.addTrigger({
  event: 'AppUpgrade',
  onEvent: async (event, context) => {
    console.log('[PromoteLiberty Bot] App upgraded! Ensuring recurring hourly check...');
    await context.scheduler.runJob({
      name: 'promoteliberty-rss-checker',
      cron: '0 * * * *',
    });
  },
});

// 3. Subreddit Moderator Menu Item to trigger an immediate check on demand
Devvit.addMenuItem({
  label: 'Post Latest PromoteLiberty RSS',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    context.ui.showToast('Checking PromoteLiberty.org RSS feed...');
    await checkAndPostRss(context);
    context.ui.showToast('RSS check completed!');
  },
});

export default Devvit;
