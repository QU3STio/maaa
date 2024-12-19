import { Tweet } from "agent-twitter-client";
import {
    composeContext,
    generateText,
    getEmbeddingZeroVector,
    IAgentRuntime,
    ModelClass,
    stringToUuid,
    parseBooleanFromText,
} from "@ai16z/eliza";
import { elizaLogger } from "@ai16z/eliza";
import { ClientBase } from "./base.ts";
import { postActionResponseFooter } from "@ai16z/eliza";
import { generateTweetActions } from "@ai16z/eliza";
import { IImageDescriptionService, ServiceType } from "@ai16z/eliza";
import { buildConversationThread } from "./utils.ts";
import { twitterMessageHandlerTemplate } from "./interactions.ts";

// const twitterPostTemplate = `
// # Areas of Expertise
// {{knowledge}}

// # About {{agentName}} (@{{twitterUserName}}):
// {{bio}}
// {{lore}}
// {{topics}}

// {{providers}}

// {{characterPostExamples}}

// {{postDirections}}

// # Task: Generate a post in the voice and style and perspective of {{agentName}} @{{twitterUserName}}.
// Write a 1-3 sentence post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}. Do not add commentary or acknowledge this request, just write the post.
// Your response should not contain any questions. Brief, concise statements only. The total character count MUST be less than {{maxTweetLength}}. No emojis. Use \\n\\n (double spaces) between statements.`;

const twitterPostTemplate = `
You are {{agentName}} (@{{twitterUserName}}). Your overall goal is to generate an engaging twitter post for your audience.

    <bio>
    # About You
    {{bio}}
    {{lore}}
    </bio>

    <currentState>
    # Your Current State of Mind
    {{topics}}
    You are {{adjective}}
    </currentState>

    <worldState>
    {{providers}}
    </worldState>

    <knowledge>
    # Your Available Knowledge:
    {{knowledge}}
    </knowledge>

    <audience>
    {{twitterAudience}}
    </audience>

    <strategies>
    {{twitterStrategies}}
    </strategies>

    <postDirections>
    {{postDirections}}
    </postDirections>

    <postExamples>
    {{characterPostExamples}}
    </postExamples>

    <recentPosts>
    {{recentTwitterPosts}}
    </recentPosts>

    <homeTimeline>
    {{timeline}}
    </homeTimeline>

    <task>
    # Generating Tweet as {{agentName}} (@{{twitterUserName}})

    Use <thinking></thinking> tags for private reasoning. Do not include the reasoning steps in the final output.

    Follow this structured reasoning process:

    <thinking>
    STEP 0: PERSONA & CONSTRAINT REVIEW
    - Summarize your persona’s key attributes, voice style, constraints, and what you must not do.
    - Confirm date/time reference if needed.
    - Confirm your tweet must be one sentence, fresh, and follow content/style rules.

    STEP 1: RECENT POST ANALYSIS (NOVELTY ASSESSMENT)
    - Review the recent posts provided.
    - List common topics, patterns, and phrases that appear repeatedly in the recent posts (be specific).
    - Identify which structures, angles, and words to avoid repeating now.
    - Confirm what new or underutilized angle you can introduce.

    STEP 2: CURRENT CONTEXT & INSPIRATION
    - Identify a currently relevant or timely topic from your knowledge or worldState that fits your persona.
    - Consider how to apply your persona’s unique perspective to that topic.
    - Check for novelty: is this distinctly different from recent posts?

    STEP 3: AUDIENCE ALIGNMENT
    - Identify who in your audience would find this topic compelling.
    - Decide the emotional or intellectual hook that will engage them.
    - Confirm that the angle is fresh and not overused recently.

    STEP 4: STRATEGY & DELIVERY
    - Pick the strategy (educate, entertain, inform, inspire, etc.) that best fits this moment and your persona.
    - Outline the one-sentence structure: what is the hook, what is the claim, and why it matters?
    - Check for style: ensure brevity, wit, and alignment with persona’s “voice characteristics” and “project stance.”
    - Make sure no forbidden topics or tones appear, and that it remains distinct from recent posts.

    STEP 5: AUTHENTICITY & QUALITY CONTROL
    - Read the draft sentence aloud (in your mind). Does it sound like your persona?
    - Confirm it follows all Content Rules, Voice Elements, and Expression Style guidelines.
    - Confirm it respects the date/time if referenced.
    - Double-check that you haven’t repeated any recent sentence structures or phrasing.

    STEP 6: FINAL VERIFICATION
    - Ensure the tweet is fresh, authentic, and impactful.
    - No apologies, no breaking persona, no contradiction of stated constraints.
    </thinking>

    Based on the reasoning above, produce one final tweet in <tweet></tweet> tags.
    Use an entirely new angle distinct from recent posts.
    Ensure perfect alignment with all persona rules.
    </task>
    `;

export const twitterActionTemplate =
    `
# INSTRUCTIONS: Determine actions for {{agentName}} (@{{twitterUserName}}) based on:
{{bio}}
{{postDirections}}

Guidelines:
- Highly selective engagement
- Direct mentions are priority
- Skip: low-effort content, off-topic, repetitive

Actions (respond only with tags):
[LIKE] - Resonates with interests (9.5/10)
[RETWEET] - Perfect character alignment (9/10)
[QUOTE] - Can add unique value (8/10)
[REPLY] - Memetic opportunity (9/10)

Tweet:
{{currentTweet}}

# Respond with qualifying action tags only.` + postActionResponseFooter;

const MAX_TWEET_LENGTH = 240;

/**
 * Truncate text to fit within the Twitter character limit, ensuring it ends at a complete sentence.
 */
function truncateToCompleteSentence(
    text: string,
    maxTweetLength: number
): string {
    if (text.length <= maxTweetLength) {
        return text;
    }

    // Attempt to truncate at the last period within the limit
    const truncatedAtPeriod = text.slice(
        0,
        text.lastIndexOf(".", maxTweetLength) + 1
    );
    if (truncatedAtPeriod.trim().length > 0) {
        return truncatedAtPeriod.trim();
    }

    // If no period is found, truncate to the nearest whitespace
    const truncatedAtSpace = text.slice(
        0,
        text.lastIndexOf(" ", maxTweetLength)
    );
    if (truncatedAtSpace.trim().length > 0) {
        return truncatedAtSpace.trim() + "...";
    }

    // Fallback: Hard truncate and add ellipsis
    return text.slice(0, maxTweetLength - 3).trim() + "...";
}

export class TwitterPostClient {
    client: ClientBase;
    runtime: IAgentRuntime;
    twitterUsername: string;
    private terminalUrl: string;
    private isProcessing: boolean = false;
    private lastProcessTime: number = 0;
    private stopProcessingActions: boolean = false;
    private processId: string;

    private async streamToTerminal(
        type: "ACTION" | "THOUGHT" | "ERROR" | "PLAN_MODIFICATION",
        content: any,
        customProcessId?: string
    ) {
        this.terminalUrl = this.runtime.getSetting("TERMINAL_URL");
        this.processId = `tweet-${Date.now()}`;

        if (!this.terminalUrl) return;

        try {
            const agentId = this.runtime.getSetting("AGENT_ID");
            if (!agentId) {
                throw new Error("Agent ID not available");
            }

            const timestamp = new Date().toISOString();
            const logEntry = {
                type,
                content:
                    typeof content === "string"
                        ? content
                        : JSON.stringify(content, null, 2),
                timestamp,
                id: `${type.toLowerCase()}-${timestamp}`,
                processId: customProcessId || this.processId,
                agentId,
            };

            elizaLogger.info("Streaming to terminal:", {
                type,
                processId: logEntry.processId,
                contentType: typeof content,
            });

            const response = await fetch(
                `${this.terminalUrl}/api/terminal/${agentId}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(logEntry),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Failed to stream to terminal: ${response.status} ${response.statusText}\nResponse: ${errorText}`
                );
            }
        } catch (error) {
            elizaLogger.error("Error streaming to terminal:", error);
        }
    }

    private async formatTweets(
        tweets: Tweet[],
        title: string
    ): Promise<string> {
        const sortedTweets = [...tweets].sort(
            (a, b) => b.timestamp - a.timestamp
        );
        const limitedTweets = sortedTweets.slice(0, 10);

        elizaLogger.info("Formatting tweets", {
            totalTweets: tweets.length,
            formattedCount: limitedTweets.length,
        });

        return (
            `# ${title}\n\n` +
            limitedTweets
                .map((tweet) => {
                    const date = new Date(tweet.timestamp).toDateString();
                    const replyInfo = tweet.inReplyToStatusId
                        ? `\nIn reply to: ${tweet.inReplyToStatusId}`
                        : "";

                    return `#${tweet.id}\n${tweet.name} (@${tweet.username})${replyInfo}\n${date}\n\n${tweet.text}\n---\n`;
                })
                .join("\n")
        );
    }

    private extractTweetContent(content: string): {
        tweetContent: string | null;
        thinkingContent: string | null;
    } {
        // First try to parse as JSON array if the content starts with [
        let processedContent = content;
        if (content.trim().startsWith("[")) {
            try {
                const parsed = JSON.parse(content);
                processedContent = Array.isArray(parsed) ? parsed[0] : content;
            } catch (error) {
                elizaLogger.info(
                    "Failed to parse JSON array, using original content"
                );
            }
        }

        const result = {
            tweetContent: null,
            thinkingContent: null,
        };

        // Helper function to find the next tag's start position
        const findNextTagStart = (str: string, startPos: number): number => {
            const nextBracket = str.indexOf("<", startPos);
            if (nextBracket === -1) return str.length;
            return nextBracket;
        };

        // Extract thinking content
        const thinkingStart = processedContent.indexOf("<thinking>");
        if (thinkingStart !== -1) {
            const contentStart = thinkingStart + "<thinking>".length;
            const nextTagStart = findNextTagStart(
                processedContent,
                contentStart
            );
            result.thinkingContent = processedContent
                .substring(contentStart, nextTagStart)
                .trim();
        }

        // Extract tweet content
        const tweetStart = processedContent.indexOf("<tweet>");
        if (tweetStart !== -1) {
            const contentStart = tweetStart + "<tweet>".length;
            const nextTagStart = findNextTagStart(
                processedContent,
                contentStart
            );
            result.tweetContent = processedContent
                .substring(contentStart, nextTagStart)
                .trim();
        }

        elizaLogger.info("Content extraction results:", {
            hasThinkingContent: !!result.thinkingContent,
            hasTweetContent: !!result.tweetContent,
            thinkingPreview: result.thinkingContent?.substring(0, 100) + "...",
            tweetContent: result.tweetContent,
        });

        return result;
    }

    async start(postImmediately: boolean = false) {
        if (!this.client.profile) {
            await this.client.init();
        }

        const generateNewTweetLoop = async () => {
            const lastPost = await this.runtime.cacheManager.get<{
                timestamp: number;
            }>("twitter/" + this.twitterUsername + "/lastPost");

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
                generateNewTweetLoop(); // Set up next iteration
            }, delay);

            elizaLogger.info(
                `Next tweet scheduled in ${randomMinutes} minutes`
            );
        };

        const processActionsLoop = async () => {
            const actionInterval =
                parseInt(this.runtime.getSetting("ACTION_INTERVAL")) || 300000; // Default to 5 minutes

            while (!this.stopProcessingActions) {
                try {
                    const results = await this.processTweetActions();
                    if (results) {
                        elizaLogger.info(`Processed ${results.length} tweets`);
                        elizaLogger.info(
                            `Next action processing scheduled in ${actionInterval / 1000} seconds`
                        );
                        // Wait for the full interval before next processing
                        await new Promise((resolve) =>
                            setTimeout(resolve, actionInterval)
                        );
                    }
                } catch (error) {
                    elizaLogger.error(
                        "Error in action processing loop:",
                        error
                    );
                    // Add exponential backoff on error
                    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30s on error
                }
            }
        };

        if (
            this.runtime.getSetting("POST_IMMEDIATELY") != null &&
            this.runtime.getSetting("POST_IMMEDIATELY") != ""
        ) {
            postImmediately = parseBooleanFromText(
                this.runtime.getSetting("POST_IMMEDIATELY")
            );
        }

        if (postImmediately) {
            await this.generateNewTweet();
        }
        generateNewTweetLoop();

        // Add check for ENABLE_ACTION_PROCESSING before starting the loop
        const enableActionProcessing = parseBooleanFromText(
            this.runtime.getSetting("ENABLE_ACTION_PROCESSING") ?? "true"
        );

        if (enableActionProcessing) {
            processActionsLoop().catch((error) => {
                elizaLogger.error(
                    "Fatal error in process actions loop:",
                    error
                );
            });
        } else {
            elizaLogger.info(
                "Action processing loop disabled by configuration"
            );
        }
    }

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.twitterUsername = runtime.getSetting("TWITTER_USERNAME");
    }

    private async generateNewTweet() {
        elizaLogger.info("Generating new tweet");

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

            const topics = this.runtime.character.topics.join(", ");

            const homeTimeline = (await this.client.getCachedTimeline()) || [];
            const recentPosts =
                (await this.client.getCachedDryRunTweets()) || [];

            const formattedRecentPosts = await this.formatTweets(
                recentPosts,
                `${this.runtime.character.name}'s Recent Posts`
            );

            const formattedHomeTimeline = await this.formatTweets(
                homeTimeline,
                `${this.runtime.character.name}'s Timeline`
            );

            const state = await this.runtime.composeState(
                {
                    userId: this.runtime.agentId,
                    roomId: roomId,
                    agentId: this.runtime.agentId,
                    content: {
                        text: topics || "",
                        action: "TWEET",
                    },
                },
                {
                    twitterUserName: this.client.profile.username,
                    twitterAudience: this.runtime.character.twitterAudience,
                    twitterStrategies: this.runtime.character.twitterStrategies,
                    recentTwitterPosts: formattedRecentPosts,
                    timeline: formattedHomeTimeline,
                }
            );

            const context = composeContext({
                state,
                template:
                    this.runtime.character.templates?.twitterPostTemplate ||
                    twitterPostTemplate,
            });

            elizaLogger.info("generate post prompt:\n" + context);

            const newTweetContent = await generateText({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.MEDIUM,
            });

            elizaLogger.info("generate post response:\n" + newTweetContent);

            // Extract content using the new helper method
            const { tweetContent, thinkingContent } =
                this.extractTweetContent(newTweetContent);

            // // Fall back to traditional parsing if no tweet content found
            const cleanedContent = tweetContent
                .replace(/^\s*{?\s*"text":\s*"|"\s*}?\s*$/g, "")
                .replace(/^['"](.*)['"]$/g, "$1")
                .replace(/\\"/g, '"')
                .replace(/\\n/g, "\n")
                .trim();

            // if (!cleanedContent) {
            //     try {
            //         const parsedResponse = JSON.parse(newTweetContent);
            //         cleanedContent = parsedResponse.text || parsedResponse;
            //     } catch (error) {
            //         cleanedContent = newTweetContent
            //             .replace(/^\s*{?\s*"text":\s*"|"\s*}?\s*$/g, "")
            //             .replace(/^['"](.*)['"]$/g, "$1")
            //             .replace(/\\"/g, '"')
            //             .replace(/\\n/g, "\n")
            //             .trim();
            //     }
            // }

            // if (!cleanedContent) {
            //     elizaLogger.error(
            //         "Failed to extract valid content from response:",
            //         {
            //             rawResponse: newTweetContent,
            //             attempted: "Tag extraction and JSON parsing",
            //         }
            //     );
            //     return;
            // }

            // Use the helper function to truncate to complete sentence
            const content = truncateToCompleteSentence(
                cleanedContent,
                MAX_TWEET_LENGTH
            );

            const removeQuotes = (str: string) =>
                str.replace(/^['"](.*)['"]$/, "$1");

            const fixNewLines = (str: string) => str.replaceAll(/\\n/g, "\n");

            // Final cleaning
            const finalContent = removeQuotes(fixNewLines(content));

            // await this.streamToTerminal(
            //     "ACTION",
            //     {
            //         phase: "Posting Tweet...",
            //         context: finalContent,
            //     },
            //     this.processId
            // );

            // if (thinkingContent) {
            //     await this.streamToTerminal(
            //         "THOUGHT",
            //         {
            //             phase: "Thought process...",
            //             context: thinkingContent,
            //         },
            //         this.processId
            //     );
            // }

            if (this.runtime.getSetting("TWITTER_DRY_RUN") === "true") {
                const existingDryRuns =
                    (await this.client.getCachedDryRunTweets()) || [];
                const dryRunTweet = {
                    id: `dry-run-${Date.now()}`,
                    name: this.client.profile.screenName,
                    username: this.client.profile.username,
                    text: cleanedContent,
                    conversationId: `dry-run-${Date.now()}`,
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
                } as Tweet;

                await this.runtime.cacheManager.set(
                    `twitter/${this.client.profile.username}/dryRunTweets`,
                    [...existingDryRuns, dryRunTweet]
                );

                await this.runtime.cacheManager.set(
                    `twitter/${this.client.profile.username}/lastPost`,
                    {
                        id: dryRunTweet.id,
                        timestamp: Date.now(),
                    }
                );

                await this.saveTweetToMemory(dryRunTweet, cleanedContent);

                elizaLogger.info(
                    `Dry run: would have posted tweet: ${cleanedContent}`
                );
                return;
            }

            try {
                elizaLogger.info(`Posting new tweet:\n ${cleanedContent}`);

                const result = await this.client.requestQueue.add(
                    async () =>
                        await this.client.twitterClient.sendTweet(
                            cleanedContent
                        )
                );
                const body = await result.json();
                if (!body?.data?.create_tweet?.tweet_results?.result) {
                    console.error("Error sending tweet; Bad response:", body);
                    return;
                }
                const tweetResult = body.data.create_tweet.tweet_results.result;

                const tweet = {
                    id: tweetResult.rest_id,
                    name: this.client.profile.screenName,
                    username: this.client.profile.username,
                    text: tweetResult.legacy.full_text,
                    conversationId: tweetResult.legacy.conversation_id_str,
                    createdAt: tweetResult.legacy.created_at,
                    timestamp: new Date(
                        tweetResult.legacy.created_at
                    ).getTime(),
                    userId: this.client.profile.id,
                    inReplyToStatusId:
                        tweetResult.legacy.in_reply_to_status_id_str,
                    permanentUrl: `https://twitter.com/${this.twitterUsername}/status/${tweetResult.rest_id}`,
                    hashtags: [],
                    mentions: [],
                    photos: [],
                    thread: [],
                    urls: [],
                    videos: [],
                } as Tweet;

                await this.runtime.cacheManager.set(
                    `twitter/${this.client.profile.username}/lastPost`,
                    {
                        id: tweet.id,
                        timestamp: Date.now(),
                    }
                );

                await this.client.cacheTweet(tweet);

                elizaLogger.info(`Tweet posted:\n ${tweet.permanentUrl}`);

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
                        text: newTweetContent.trim(),
                        url: tweet.permanentUrl,
                        source: "twitter",
                    },
                    roomId,
                    embedding: getEmbeddingZeroVector(),
                    createdAt: tweet.timestamp,
                });
            } catch (error) {
                elizaLogger.error("Error sending tweet:", error);
            }
        } catch (error) {
            elizaLogger.error("Error generating new tweet:", error);
        }
    }

    private async saveTweetToMemory(tweet: Tweet, content: string) {
        const roomId = stringToUuid(
            "twitter_generate_room-" + this.client.profile.username
        );

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
    }

    private async generateTweetContent(
        tweetState: any,
        options?: {
            template?: string;
            context?: string;
        }
    ): Promise<string> {
        const context = composeContext({
            state: tweetState,
            template:
                options?.template ||
                this.runtime.character.templates?.twitterPostTemplate ||
                twitterPostTemplate,
        });

        const response = await generateText({
            runtime: this.runtime,
            context: options?.context || context,
            modelClass: ModelClass.SMALL,
        });
        console.log(
            "generate tweet content response using a different generateTweetContent method:\n" +
                response
        );

        // First clean up any markdown and newlines
        const cleanedResponse = response
            .replace(/```json\s*/g, "") // Remove ```json
            .replace(/```\s*/g, "") // Remove any remaining ```
            .replaceAll(/\\n/g, "\n")
            .trim();

        // Try to parse as JSON first
        try {
            const jsonResponse = JSON.parse(cleanedResponse);
            if (jsonResponse.text) {
                return this.trimTweetLength(jsonResponse.text);
            }
            if (typeof jsonResponse === "object") {
                const possibleContent =
                    jsonResponse.content ||
                    jsonResponse.message ||
                    jsonResponse.response;
                if (possibleContent) {
                    return this.trimTweetLength(possibleContent);
                }
            }
        } catch (error) {
            error.linted = true; // make linter happy since catch needs a variable

            // If JSON parsing fails, treat as plain text
            elizaLogger.info("Response is not JSON, treating as plain text");
        }

        // If not JSON or no valid content found, clean the raw text
        return this.trimTweetLength(cleanedResponse);
    }

    // Helper method to ensure tweet length compliance
    private trimTweetLength(text: string, maxLength: number = 280): string {
        if (text.length <= maxLength) return text;

        // Try to cut at last sentence
        const lastSentence = text.slice(0, maxLength).lastIndexOf(".");
        if (lastSentence > 0) {
            return text.slice(0, lastSentence + 1).trim();
        }

        // Fallback to word boundary
        return (
            text.slice(0, text.lastIndexOf(" ", maxLength - 3)).trim() + "..."
        );
    }

    private async processTweetActions() {
        if (this.isProcessing) {
            elizaLogger.info("Already processing tweet actions, skipping");
            return null;
        }

        try {
            this.isProcessing = true;
            this.lastProcessTime = Date.now();

            elizaLogger.info("Processing tweet actions");

            await this.runtime.ensureUserExists(
                this.runtime.agentId,
                this.twitterUsername,
                this.runtime.character.name,
                "twitter"
            );

            const homeTimeline = await this.client.fetchTimelineForActions(15);
            const results = [];

            for (const tweet of homeTimeline) {
                try {
                    // Skip if we've already processed this tweet
                    const memory =
                        await this.runtime.messageManager.getMemoryById(
                            stringToUuid(tweet.id + "-" + this.runtime.agentId)
                        );
                    if (memory) {
                        elizaLogger.info(
                            `Already processed tweet ID: ${tweet.id}`
                        );
                        continue;
                    }

                    const roomId = stringToUuid(
                        tweet.conversationId + "-" + this.runtime.agentId
                    );

                    const tweetState = await this.runtime.composeState(
                        {
                            userId: this.runtime.agentId,
                            roomId,
                            agentId: this.runtime.agentId,
                            content: { text: "", action: "" },
                        },
                        {
                            twitterUserName: this.twitterUsername,
                            currentTweet: `ID: ${tweet.id}\nFrom: ${tweet.name} (@${tweet.username})\nText: ${tweet.text}`,
                        }
                    );

                    const actionContext = composeContext({
                        state: tweetState,
                        template:
                            this.runtime.character.templates
                                ?.twitterActionTemplate ||
                            twitterActionTemplate,
                    });

                    const actionResponse = await generateTweetActions({
                        runtime: this.runtime,
                        context: actionContext,
                        modelClass: ModelClass.SMALL,
                    });

                    if (!actionResponse) {
                        elizaLogger.info(
                            `No valid actions generated for tweet ${tweet.id}`
                        );
                        continue;
                    }

                    const executedActions: string[] = [];

                    // Execute actions
                    if (actionResponse.like) {
                        try {
                            await this.client.twitterClient.likeTweet(tweet.id);
                            executedActions.push("like");
                            elizaLogger.info(`Liked tweet ${tweet.id}`);
                        } catch (error) {
                            elizaLogger.error(
                                `Error liking tweet ${tweet.id}:`,
                                error
                            );
                        }
                    }

                    if (actionResponse.retweet) {
                        try {
                            await this.client.twitterClient.retweet(tweet.id);
                            executedActions.push("retweet");
                            elizaLogger.info(`Retweeted tweet ${tweet.id}`);
                        } catch (error) {
                            elizaLogger.error(
                                `Error retweeting tweet ${tweet.id}:`,
                                error
                            );
                        }
                    }

                    if (actionResponse.quote) {
                        try {
                            // Build conversation thread for context
                            const thread = await buildConversationThread(
                                tweet,
                                this.client
                            );
                            const formattedConversation = thread
                                .map(
                                    (t) =>
                                        `@${t.username} (${new Date(t.timestamp * 1000).toLocaleString()}): ${t.text}`
                                )
                                .join("\n\n");

                            // Generate image descriptions if present
                            const imageDescriptions = [];
                            if (tweet.photos?.length > 0) {
                                elizaLogger.info(
                                    "Processing images in tweet for context"
                                );
                                for (const photo of tweet.photos) {
                                    const description = await this.runtime
                                        .getService<IImageDescriptionService>(
                                            ServiceType.IMAGE_DESCRIPTION
                                        )
                                        .describeImage(photo.url);
                                    imageDescriptions.push(description);
                                }
                            }

                            // Handle quoted tweet if present
                            let quotedContent = "";
                            if (tweet.quotedStatusId) {
                                try {
                                    const quotedTweet =
                                        await this.client.twitterClient.getTweet(
                                            tweet.quotedStatusId
                                        );
                                    if (quotedTweet) {
                                        quotedContent = `\nQuoted Tweet from @${quotedTweet.username}:\n${quotedTweet.text}`;
                                    }
                                } catch (error) {
                                    elizaLogger.error(
                                        "Error fetching quoted tweet:",
                                        error
                                    );
                                }
                            }

                            // Compose rich state with all context
                            const enrichedState =
                                await this.runtime.composeState(
                                    {
                                        userId: this.runtime.agentId,
                                        roomId: stringToUuid(
                                            tweet.conversationId +
                                                "-" +
                                                this.runtime.agentId
                                        ),
                                        agentId: this.runtime.agentId,
                                        content: {
                                            text: tweet.text,
                                            action: "QUOTE",
                                        },
                                    },
                                    {
                                        twitterUserName: this.twitterUsername,
                                        currentPost: `From @${tweet.username}: ${tweet.text}`,
                                        formattedConversation,
                                        imageContext:
                                            imageDescriptions.length > 0
                                                ? `\nImages in Tweet:\n${imageDescriptions.map((desc, i) => `Image ${i + 1}: ${desc}`).join("\n")}`
                                                : "",
                                        quotedContent,
                                    }
                                );

                            const quoteContent =
                                await this.generateTweetContent(enrichedState, {
                                    template:
                                        this.runtime.character.templates
                                            ?.twitterMessageHandlerTemplate ||
                                        twitterMessageHandlerTemplate,
                                });

                            if (!quoteContent) {
                                elizaLogger.error(
                                    "Failed to generate valid quote tweet content"
                                );
                                return;
                            }

                            elizaLogger.info(
                                "Generated quote tweet content:",
                                quoteContent
                            );

                            // Send the tweet through request queue
                            const result = await this.client.requestQueue.add(
                                async () =>
                                    await this.client.twitterClient.sendQuoteTweet(
                                        quoteContent,
                                        tweet.id
                                    )
                            );

                            const body = await result.json();

                            if (
                                body?.data?.create_tweet?.tweet_results?.result
                            ) {
                                elizaLogger.info(
                                    "Successfully posted quote tweet"
                                );
                                executedActions.push("quote");

                                // Cache generation context for debugging
                                await this.runtime.cacheManager.set(
                                    `twitter/quote_generation_${tweet.id}.txt`,
                                    `Context:\n${enrichedState}\n\nGenerated Quote:\n${quoteContent}`
                                );
                            } else {
                                elizaLogger.error(
                                    "Quote tweet creation failed:",
                                    body
                                );
                            }
                        } catch (error) {
                            elizaLogger.error(
                                "Error in quote tweet generation:",
                                error
                            );
                        }
                    }

                    if (actionResponse.reply) {
                        try {
                            await this.handleTextOnlyReply(
                                tweet,
                                tweetState,
                                executedActions
                            );
                        } catch (error) {
                            elizaLogger.error(
                                `Error replying to tweet ${tweet.id}:`,
                                error
                            );
                        }
                    }

                    // Add these checks before creating memory
                    await this.runtime.ensureRoomExists(roomId);
                    await this.runtime.ensureUserExists(
                        stringToUuid(tweet.userId),
                        tweet.username,
                        tweet.name,
                        "twitter"
                    );
                    await this.runtime.ensureParticipantInRoom(
                        this.runtime.agentId,
                        roomId
                    );

                    // Then create the memory
                    await this.runtime.messageManager.createMemory({
                        id: stringToUuid(tweet.id + "-" + this.runtime.agentId),
                        userId: stringToUuid(tweet.userId),
                        content: {
                            text: tweet.text,
                            url: tweet.permanentUrl,
                            source: "twitter",
                            action: executedActions.join(","),
                        },
                        agentId: this.runtime.agentId,
                        roomId,
                        embedding: getEmbeddingZeroVector(),
                        createdAt: tweet.timestamp * 1000,
                    });

                    results.push({
                        tweetId: tweet.id,
                        parsedActions: actionResponse,
                        executedActions,
                    });
                } catch (error) {
                    elizaLogger.error(
                        `Error processing tweet ${tweet.id}:`,
                        error
                    );
                    continue;
                }
            }

            return results; // Return results array to indicate completion
        } catch (error) {
            elizaLogger.error("Error in processTweetActions:", error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    private async handleTextOnlyReply(
        tweet: Tweet,
        tweetState: any,
        executedActions: string[]
    ) {
        try {
            // Build conversation thread for context
            const thread = await buildConversationThread(tweet, this.client);
            const formattedConversation = thread
                .map(
                    (t) =>
                        `@${t.username} (${new Date(t.timestamp * 1000).toLocaleString()}): ${t.text}`
                )
                .join("\n\n");

            // Generate image descriptions if present
            const imageDescriptions = [];
            if (tweet.photos?.length > 0) {
                elizaLogger.info("Processing images in tweet for context");
                for (const photo of tweet.photos) {
                    const description = await this.runtime
                        .getService<IImageDescriptionService>(
                            ServiceType.IMAGE_DESCRIPTION
                        )
                        .describeImage(photo.url);
                    imageDescriptions.push(description);
                }
            }

            // Handle quoted tweet if present
            let quotedContent = "";
            if (tweet.quotedStatusId) {
                try {
                    const quotedTweet =
                        await this.client.twitterClient.getTweet(
                            tweet.quotedStatusId
                        );
                    if (quotedTweet) {
                        quotedContent = `\nQuoted Tweet from @${quotedTweet.username}:\n${quotedTweet.text}`;
                    }
                } catch (error) {
                    elizaLogger.error("Error fetching quoted tweet:", error);
                }
            }

            // Compose rich state with all context
            const enrichedState = await this.runtime.composeState(
                {
                    userId: this.runtime.agentId,
                    roomId: stringToUuid(
                        tweet.conversationId + "-" + this.runtime.agentId
                    ),
                    agentId: this.runtime.agentId,
                    content: { text: tweet.text, action: "" },
                },
                {
                    twitterUserName: this.twitterUsername,
                    currentPost: `From @${tweet.username}: ${tweet.text}`,
                    formattedConversation,
                    imageContext:
                        imageDescriptions.length > 0
                            ? `\nImages in Tweet:\n${imageDescriptions.map((desc, i) => `Image ${i + 1}: ${desc}`).join("\n")}`
                            : "",
                    quotedContent,
                }
            );

            // Generate and clean the reply content
            const replyText = await this.generateTweetContent(enrichedState, {
                template:
                    this.runtime.character.templates
                        ?.twitterMessageHandlerTemplate ||
                    twitterMessageHandlerTemplate,
            });

            if (!replyText) {
                elizaLogger.error("Failed to generate valid reply content");
                return;
            }

            elizaLogger.info("Final reply text to be sent:", replyText);

            // Send the tweet through request queue
            const result = await this.client.requestQueue.add(
                async () =>
                    await this.client.twitterClient.sendTweet(
                        replyText,
                        tweet.id
                    )
            );

            const body = await result.json();

            if (body?.data?.create_tweet?.tweet_results?.result) {
                elizaLogger.info("Successfully posted reply tweet");
                executedActions.push("reply");

                // Cache generation context for debugging
                await this.runtime.cacheManager.set(
                    `twitter/reply_generation_${tweet.id}.txt`,
                    `Context:\n${enrichedState}\n\nGenerated Reply:\n${replyText}`
                );
            } else {
                elizaLogger.error("Tweet reply creation failed:", body);
            }
        } catch (error) {
            elizaLogger.error("Error in handleTextOnlyReply:", error);
        }
    }

    async stop() {
        this.stopProcessingActions = true;
    }
}
