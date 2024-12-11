import { Tweet } from "agent-twitter-client";
import {
    composeContext,
    getEmbeddingZeroVector,
    IAgentRuntime,
    stringToUuid,
} from "@ai16z/eliza";
import { elizaLogger } from "@ai16z/eliza";
import { ClientBase } from "./base";
import { TweetGenerationResponse } from "./types";
import { tweetGenerationTool } from "./tools";
import Anthropic from "@anthropic-ai/sdk";

const twitterPostTemplate = `# Tweet Generation System
The task is to generate an impactful twitter post using the following chain of thought reasoning.

# Reference Sections

## [KB] Knowledge Reference
Provides topic expertise and foundational facts for grounding posts.
Use for: Historical context, proven facts, deep understanding
{{knowledge}} 

## [CS] Current State
Delivers current metrics and temporal context.
Use for: Fresh metrics, current developments, temporal anchoring
{{providers}}

## [CE] Character Elements
Gives an overview about {{agentName}} (@{{twitterUserName}})
Use for: Voice consistency, personality expression, tone variation

Your background:
{{bio}}

Your stories and lore:
{{lore}}

Adjectives that describe you:
{{adjectives}}

Directions for your posts:
{{postDirections}}

Examples of posts:
{{characterPostExamples}}

## [PC] Previous Context
Shows recent tweets from {{agentName}} (@{{twitterUserName}})
Use for: Pattern variety, narrative continuity, content freshness
{{timeline}}

## [TC] Topic Context
Provides current discussion areas for consideration
Use for: Content focus, relevant angles
{{topics}}

# Pattern Reference

## Core Patterns
1. Metric Showcase
- Structure: [Current Metric] + [Sharp Take]
- When: Fresh metrics show strength
- Source: [CS] + [CE]

2. Character Moment
- Structure: [Action/Situation] + [Outcome]
- When: Building personality/engagement
- Source: [CE] + [CS] + [PC]

3. Market Commentary
- Structure: [Observation] + [Insight]
- When: Clear market narrative
- Source: [CS] + [KB]

4. Community Engagement
- Structure: [Shared Context] + [Unifying Point]
- When: Strong community moment
- Source: [CS] + [CE]

5. Knowledge Flex
- Structure: [Expert Insight] + [Implication]
- When: Demonstrating expertise
- Source: [KB] + [CE]

## Pattern Variety Requirements
1. Pattern Usage
   - Track patterns used in [PC]
   - Avoid repeating most recent pattern
   - Mix pattern types across variations
   - Use each pattern type maximum once per set

2. Structural Elements
   - Vary sentence structures
   - Alternate between short/long forms
   - Mix hook types (metric, observation, action)
   - Vary closing approaches

3. Phrase Management
   - Track key phrases from recent posts
   - Avoid repeating signature phrases too often
   - Create fresh versions of common themes
   - Vary metric presentation styles

# Strategy Reference

## Available Strategies
1. Educate (Knowledge Flex)
- Goal: Share expertise naturally
- When: Complex topic needs clarity
- Source: [KB] + [CS]

2. Entertain (Culture Build)
- Goal: Strengthen community bonds
- When: Community mood right
- Source: [CE] + current context

3. Inspire (Victory Narrative)
- Goal: Build confidence/momentum
- When: Significant achievements
- Source: [CS] + [CE]

4. Network (Ecosystem Growth)
- Goal: Highlight developments
- When: Notable progress
- Source: [CS] + [KB]

5. Build Exclusivity (Inside Knowledge)
- Goal: Create FOMO/engagement
- When: Unique insight available
- Source: [KB] + [CE]

## Strategy Distribution
- Track strategy usage across recent posts
- Rotate through different approaches
- Mix strategy types in variations
- Match strategy to opportunity while maintaining variety

# Core Guidelines

## Content Development Rules
1. Start with Real Moments
   - Identify genuine opportunities from [CS] or [KB]
   - Let context guide strategy naturally
   - Focus on authentic engagement

2. Strategic Approach
   - Use patterns as flexible guides
   - Let strategy emerge from situation
   - Prioritize viral potential
   - Focus on authentic engagement

3. Source Usage
   - Reference [CS] for current metrics
   - Ground insights in [KB] when relevant
   - Use [CE] for consistent voice
   - Check [PC] to avoid repetition
   - Incorporate metrics only when they enhance impact

4. Diversity Requirements
   - Review [PC] for recent patterns and phrases
   - Ensure each variation uses different structure
   - Vary between metric and narrative approaches
   - Create distinct angles on same opportunity
   - Mix engagement styles across variations

## Temporal Framework
1. Current State References
   - Ground present claims in [CS] data
   - Specify current metrics with timestamps
   - Mark ongoing developments clearly

2. Historical References
   - Include clear timeframes
   - Mark past events as historical
   - Use specific dates for past metrics

3. Future/Predictive Content
   - Base predictions on documented trends
   - Avoid ambiguous timeframes
   - Connect forecasts to current data

# Generation Process

## 1. Situation Analysis
Using [KB], [CS], [PC], [TC] analyze:
- Recent pattern/strategy distribution from [PC]
- Fresh opportunities in [CS]
- Available [TC] topics and angles
- Supporting [KB] context
- Recently used phrases and structures

Output: SituationAssessment containing
- Pattern/strategy distribution analysis (informs next steps)
- Current opportunities ranked by:
  * Timeline freshness (from [PC])
  * Metric strength (from [CS])
  * Topic relevance (from [TC])
  * Knowledge support (from [KB])
  * Pattern freshness (avoiding recent)
- Reasoned priority ranking explaining opportunity selection
- Analysis of recent patterns to avoid repetition

## 2. Content Strategy
Using SituationAssessment output, determine:
- Priority opportunity to address (based on rankings)
- Best strategic approach (informed by distribution)
- Optimal pattern selection (guided by opportunity)
- Required knowledge elements (based on needs)
- Variety requirements based on recent posts

Output: ContentStrategy detailing
- Selected opportunity + selection reasoning
- Chosen strategy + distribution context
- Pattern choice + fit explanation
- Required sources + usage intent
- Connection to situation analysis
- Diversity approach for variations

## 3. Tweet Development
Using ContentStrategy output, create 3 tweet variations that:
- Address selected opportunity
- Implement chosen strategy
- Follow selected pattern
Each variation MUST:
  * Use different pattern from recent posts
  * Implement unique sentence structure
  * Take distinct angle on opportunity
  * Avoid phrases, topics, metrics from [PC]
  * Mix between metric/narrative focus
  * Maintain voice while varying tone
  * Draw from specified sources
REMEMBER: DO NOT PRODUCE A SINGLE TWEET; YOU MUST PRODUCE 3 TWEETS IN THIS STEP.

Output: TweetVariations providing
- Three distinct tweets implementing strategy
- Pattern usage per variation
- Strategic element implementation
- Character voice markers
- Differentiation analysis
- Uniqueness verification vs recent posts
- Connection to content strategy

## 4. Selection
Using TweetVariations output, evaluate against:
- Original opportunity strength (from SituationAssessment)
- Strategic fit (from ContentStrategy)
- Pattern execution (from ContentStrategy)
- Uniqueness from recent posts
Additional criteria:
  * Metric accuracy
  * Voice authenticity
  * Timeline freshness
  * Temporal clarity
  * Pattern freshness
  * Phrase uniqueness
  * Structural variety

Output: FinalTweet containing
- Selected tweet
- Complete reasoning chain from opportunity to selection
- Expected impact based on strategy goals
- Quality control checklist results:
  * Voice and Style (authenticity, natural language, tone)
  * Content Value (perspective, community resonance)
  * Technical Accuracy (metrics, temporal context, sources)
  * Uniqueness Measures (patterns, phrases, structure)`;

const MAX_TWEET_LENGTH = 280;

function truncateToCompleteSentence(text: string): string {
    if (text.length <= MAX_TWEET_LENGTH) {
        return text;
    }

    const truncatedAtPeriod = text.slice(
        0,
        text.lastIndexOf(".", MAX_TWEET_LENGTH) + 1
    );
    if (truncatedAtPeriod.trim().length > 0) {
        return truncatedAtPeriod.trim();
    }

    const truncatedAtSpace = text.slice(
        0,
        text.lastIndexOf(" ", MAX_TWEET_LENGTH)
    );
    if (truncatedAtSpace.trim().length > 0) {
        return truncatedAtSpace.trim() + "...";
    }

    return text.slice(0, MAX_TWEET_LENGTH - 3).trim() + "...";
}

export class TwitterPostClient {
    client: ClientBase;
    runtime: IAgentRuntime;
    anthropicClient: Anthropic;

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.anthropicClient = new Anthropic({
            apiKey: this.runtime.getSetting("ANTHROPIC_API_KEY")
        });
    }

    async start(postImmediately: boolean = false) {
        if (!this.client.profile) {
            await this.client.init();
        }

        const generateNewTweetLoop = async () => {
            const lastPost = await this.runtime.cacheManager.get<{
                timestamp: number;
            }>(
                "twitter/" +
                    this.runtime.getSetting("TWITTER_USERNAME") +
                    "/lastPost"
            );

            const lastPostTimestamp = lastPost?.timestamp ?? 0;
            const minMinutes =
                parseInt(this.runtime.getSetting("POST_INTERVAL_MIN")) || 90;
            const maxMinutes =
                parseInt(this.runtime.getSetting("POST_INTERVAL_MAX")) || 180;
            const randomMinutes =
                Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) +
                minMinutes;
            const delay = randomMinutes * 60 * 1000;

            if (Date.now() > lastPostTimestamp + delay) {
                await this.generateNewTweet();
            }

            setTimeout(() => {
                generateNewTweetLoop();
            }, delay);

            elizaLogger.log(`Next tweet scheduled in ${randomMinutes} minutes`);
        };

        if (
            this.runtime.getSetting("POST_IMMEDIATELY") === "true" ||
            postImmediately
        ) {
            await this.generateNewTweet();
        }

        generateNewTweetLoop();
    }

    private async formatTweets(tweets: Tweet[], title: string): Promise<string> {
        const sortedTweets = [...tweets].sort((a, b) => b.timestamp - a.timestamp);
        const limitedTweets = sortedTweets.slice(0, 10);
        
        return `# ${title}\n\n` +
            limitedTweets
                .map((tweet) => {
                    return `#${tweet.id}\n${tweet.name} (@${tweet.username})${
                        tweet.inReplyToStatusId ? `\nIn reply to: ${tweet.inReplyToStatusId}` : ""
                    }\n${new Date(tweet.timestamp).toDateString()}\n\n${tweet.text}\n---\n`;
                })
                .join("\n");
    }

    private async generateNewTweet() {
        elizaLogger.log("Generating new tweet");

        try {
            const roomId = stringToUuid(
                "twitter_generate_room-" + this.client.profile.username
            );
            
            await this.runtime.ensureUserExists(
                this.runtime.agentId,
                this.client.profile.username,
                this.runtime.character.name,
                "twitter"
            );

            // Fetch home timeline
            let homeTimeline: Tweet[] = [];
            const cachedTimeline = await this.client.getCachedTimeline();
            const dryRunTweets = await this.client.getCachedDryRunTweets();

            if (cachedTimeline || dryRunTweets) {
                homeTimeline = [...(cachedTimeline || []), ...(dryRunTweets || [])]
                    .sort((a, b) => b.timestamp - a.timestamp);
            } else {
                homeTimeline = await this.client.fetchHomeTimeline(10);
                await this.client.cacheTimeline(homeTimeline);
            }

            // Format timeline
            const formattedHomeTimeline = await this.formatTweets(
                homeTimeline,
                `${this.runtime.character.name}'s Home Timeline`
            );

            const selectedTopics = this.runtime.character.topics
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);

            const state = await this.runtime.composeState(
                {
                    userId: this.runtime.agentId,
                    roomId: roomId,
                    agentId: this.runtime.agentId,
                    content: {
                        text: selectedTopics.join(", "),
                        action: "",
                    },
                },
                {
                    twitterUserName: this.client.profile.username,
                    timeline: formattedHomeTimeline,
                    selectedTopics: selectedTopics
                }
            );

            const context = composeContext({
                state,
                template: this.runtime.character.templates?.twitterPostTemplate || twitterPostTemplate,
            });

            const response = await this.anthropicClient.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 8192,
                messages: [
                    {
                        role: "user",
                        content: context
                    }
                ],
                tools: [tweetGenerationTool],
                tool_choice: {
                    type: "tool",
                    name: "generate_tweet"
                }
            });

            elizaLogger.info("Prompt", context);

            elizaLogger.info("Generated tweet response", response);

            let tweetData: TweetGenerationResponse | null = null;

            for (const content of response.content) {
                if (content.type === "tool_use" && content.name === "generate_tweet") {
                    tweetData = content.input as TweetGenerationResponse;
                    break;
                }
            }

            if (!tweetData || !tweetData.finalSelection?.content) {
                elizaLogger.error("Invalid tweet data:", { tweetData });
                throw new Error("No valid tweet data in response");
            }

            const content = truncateToCompleteSentence(
                tweetData.finalSelection?.content
            );

            if (this.runtime.getSetting("TWITTER_DRY_RUN") === "true") {
                elizaLogger.info(`Dry run: would have posted tweet: ${content}`);
                const mockTweet: Tweet = {
                    id: `dry-run-${Date.now()}`,
                    name: this.client.profile.screenName,
                    username: this.client.profile.username,
                    text: content,
                    conversationId: `dry-run-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    timestamp: Date.now(),
                    userId: this.client.profile.id,
                    inReplyToStatusId: null,
                    permanentUrl: `DRY_RUN_${Date.now()}`,
                    hashtags: [],
                    mentions: [],
                    photos: [],
                    thread: [],
                    urls: [],
                    videos: [],
                };

                // Cache the dry run tweet
                await this.runtime.cacheManager.set(
                    `twitter/${this.client.profile.username}/lastPost`,
                    {
                        id: mockTweet.id,
                        timestamp: Date.now(),
                    }
                );

                // Store dry run tweets separately - probably wrong
                const existingDryRuns = await this.client.getCachedDryRunTweets() || [];
                await this.runtime.cacheManager.set(
                    `twitter/${this.client.profile.username}/dryRunTweets`,
                    [...existingDryRuns, mockTweet]
                );
                return;
            }

            elizaLogger.log(`Posting new tweet:\n ${content}`);

            const result = await this.client.requestQueue.add(
                async () => await this.client.twitterClient.sendTweet(content)
            );

            const body = await result.json();
            if (!body?.data?.create_tweet?.tweet_results?.result) {
                throw new Error("Error sending tweet; Bad response: " + JSON.stringify(body));
            }

            const tweetResult = body.data.create_tweet.tweet_results.result;

            const tweet: Tweet = {
                id: tweetResult.rest_id,
                name: this.client.profile.screenName,
                username: this.client.profile.username,
                text: tweetResult.legacy.full_text,
                conversationId: tweetResult.legacy.conversation_id_str,
                createdAt: tweetResult.legacy.created_at,
                timestamp: new Date(tweetResult.legacy.created_at).getTime(),
                userId: this.client.profile.id,
                inReplyToStatusId: tweetResult.legacy.in_reply_to_status_id_str,
                permanentUrl: `https://twitter.com/${this.runtime.getSetting("TWITTER_USERNAME")}/status/${tweetResult.rest_id}`,
                hashtags: [],
                mentions: [],
                photos: [],
                thread: [],
                urls: [],
                videos: [],
            };

            await this.runtime.cacheManager.set(
                `twitter/${this.client.profile.username}/lastPost`,
                {
                    id: tweet.id,
                    timestamp: Date.now(),
                }
            );

            await this.client.cacheTweet(tweet);
            
            elizaLogger.log(`Tweet posted:\n ${tweet.permanentUrl}`);

            await this.runtime.ensureRoomExists(roomId);
            await this.runtime.ensureParticipantInRoom(
                this.runtime.agentId,
                roomId
            );

            await this.runtime.messageManager.createMemory({
                id: stringToUuid(tweet.id + "-" + this.runtime.agentId),
                userId: this.runtime.agentId,
                agentId: this.runtime.agentId,
                content: {
                    text: content.trim(),
                    url: tweet.permanentUrl,
                    source: "twitter",
                },
                roomId,
                embedding: getEmbeddingZeroVector(),
                createdAt: tweet.timestamp,
            });

        } catch (error) {
            elizaLogger.error("Error generating new tweet:", {
                error: error,
                stack: error instanceof Error ? error.stack : undefined,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}