import { Tweet } from "agent-twitter-client";
import {
    composeContext,
    generateText,
    getEmbeddingZeroVector,
    IAgentRuntime,
    ModelClass,
    stringToUuid,
} from "@ai16z/eliza";
import { elizaLogger } from "@ai16z/eliza";
import { ClientBase } from "./base";
import { 
    TweetGenerationResponse, 
    TopicAssessmentResponse,
    TweetGenerationMetadata 
} from "./types";
import { tweetGenerationTool, topicAssessmentTool } from "./tools";
import { ResponseValidator, ValidationError } from "./validation";
import Anthropic from "@anthropic-ai/sdk";
import {
    twitterSimplePostTemplate,
    tweetGenerationTemplate,
    topicAssessmentTemplate,
} from "./templates";
import util from 'util';


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
    useCOT: boolean;
    terminalUrl: string;

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.anthropicClient = new Anthropic({
            apiKey: this.runtime.getSetting("ANTHROPIC_API_KEY")
        });
        this.useCOT = this.runtime.getSetting("twitter_post_cot") === "true";
        this.terminalUrl = this.runtime.getSetting("TERMINAL_URL");
        if (!this.terminalUrl) {
            elizaLogger.warn("TERMINAL_URL not set - terminal streaming will be disabled");
        }
    }

    private async streamToTerminal(type: 'ACTION' | 'THOUGHT', content: string, id: string) {
        if (!this.terminalUrl) return;
    
        try {
            const agentId = this.runtime.getSetting("AGENT_ID");
            if (!agentId) {
                throw new Error('Agent ID not available');
            }
    
            // Create a precise ISO timestamp
            const timestamp = new Date().toISOString();
            
            const logEntry = {
                type,
                content,
                timestamp,
                id: `${type.toLowerCase()}-${timestamp}`,
                processId: id
            };
    
            const response = await fetch(`${this.terminalUrl}/api/terminal/${agentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logEntry)
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to stream to terminal: ${response.status} ${response.statusText}\nResponse: ${errorText}`);
            }
        } catch (error) {
            elizaLogger.error("Error streaming to terminal:", error);
        }
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

    private async generateSimpleTweet(): Promise<string> {
        const processId = `tweet-${Date.now()}`;
        const roomId = stringToUuid(
            "twitter_generate_room-" + this.client.profile.username
        );

        const topics = this.runtime.character.topics.join(", ");
        const state = await this.runtime.composeState(
            {
                userId: this.runtime.agentId,
                roomId: roomId,
                agentId: this.runtime.agentId,
                content: {
                    text: topics,
                    action: "",
                },
            },
            {
                twitterUserName: this.client.profile.username,
            }
        );

        const context = composeContext({
            state,
            template: this.runtime.character.templates?.twitterPostTemplate || twitterSimplePostTemplate,
        });

        elizaLogger.debug("generate simple post prompt:\n" + context);

        const newTweetContent = await generateText({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.MEDIUM,
        });

        const content = newTweetContent.replaceAll(/\\n/g, "\n").trim();

        await this.streamToTerminal(
            'ACTION',
            content,
            processId
        );

        await this.streamToTerminal(
            'THOUGHT',
            'Generated using simple tweet template without chain-of-thought reasoning.',
            processId
        );

        return content;
    }

    private async assessTopics(): Promise<TopicAssessmentResponse> {
        const homeTimeline = await this.client.getCachedTimeline() || [];
        const dryRunTweets = await this.client.getCachedDryRunTweets() || [];
        const allTweets = [...homeTimeline, ...dryRunTweets]
            .sort((a, b) => b.timestamp - a.timestamp);

        const formattedHomeTimeline = await this.formatTweets(
            allTweets,
            `${this.runtime.character.name}'s Home Timeline`
        );

        const state = await this.runtime.composeState(
            {
                userId: this.runtime.agentId,
                roomId: stringToUuid("topic_assessment-" + this.client.profile.username),
                agentId: this.runtime.agentId,
                content: {
                    text: this.runtime.character.topics.join(", "),
                    action: "",
                },
            },
            {
                twitterUserName: this.client.profile.username,
                timeline: formattedHomeTimeline,
                topics: this.runtime.character.topics,
                lastDiscussedTopics: allTweets.slice(0, 5).map(t => t.text),
                recentPatterns: allTweets.slice(0, 10).map(t => ({
                    content: t.text,
                    timestamp: t.timestamp
                })),
                recentMetrics: allTweets.slice(0, 10)
                    .filter(t => t.text.match(/\d+/))
                    .map(t => ({
                        content: t.text,
                        timestamp: t.timestamp
                    }))
            }
        );

        const context = composeContext({
            state,
            template: topicAssessmentTemplate,
        });

        const response = await this.anthropicClient.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4096,
            messages: [{ role: "user", content: context }],
            tools: [topicAssessmentTool],
            tool_choice: { type: "tool", name: "assess_topics" }
        });

        elizaLogger.info("Topic assessment prompt", context);
        elizaLogger.info("Topic assessment response", response);

        for (const content of response.content) {
            if (content.type === "tool_use" && content.name === "assess_topics") {
                const assessment = content.input as any;
                
                if (!ResponseValidator.validateTopicAssessment(assessment)) {
                    throw new ValidationError("Invalid topic assessment response structure");
                }

                return assessment;
            }
        }

        throw new ValidationError("No valid topic assessment in response");
    }

    private async generateChainOfThoughtTweet(): Promise<string> {
        try {
            const processId = `tweet-${Date.now()}`;

            // First assessment step
            const topicAssessment = await this.assessTopics();
            const assessmentData = ResponseValidator.extractAssessmentData(topicAssessment);


            // Map assessment data to tweet generation state
            const tweetGenerationState = {
                selectedTopic: assessmentData.topic,
                selectedAngle: assessmentData.angle,
                characterVoice: {
                    traits: assessmentData.voice.elements,
                    rules: assessmentData.guidelines,
                    examples: topicAssessment.contextAnalysis.recentActivity.patterns.contentTypes
                },
                contextualFactors: assessmentData.context.updates.map(update => ({
                    type: update.type,
                    content: update.content,
                    relevance: update.impact
                })),
                avoidList: assessmentData.cautions
            };

            // Fetch and format timeline
            const homeTimeline = await this.client.getCachedTimeline() || [];
            const dryRunTweets = await this.client.getCachedDryRunTweets() || [];
            const allTweets = [...homeTimeline, ...dryRunTweets]
                .sort((a, b) => b.timestamp - a.timestamp);
            
            const formattedHomeTimeline = await this.formatTweets(
                allTweets,
                `${this.runtime.character.name}'s Home Timeline`
            );

            const state = await this.runtime.composeState(
                {
                    userId: this.runtime.agentId,
                    roomId: stringToUuid("twitter_generate_room-" + this.client.profile.username),
                    agentId: this.runtime.agentId,
                    content: {
                        text: tweetGenerationState.selectedTopic,
                        action: "",
                    },
                },
                {
                    twitterUserName: this.client.profile.username,
                    timeline: formattedHomeTimeline,
                    ...tweetGenerationState,
                }
            );

            const context = composeContext({
                state,
                template: tweetGenerationTemplate,
            });

            const response = await this.anthropicClient.messages.create({
                model: "claude-3-opus-20240229",
                max_tokens: 4096,
                messages: [{ role: "user", content: context }],
                tools: [tweetGenerationTool],
                tool_choice: { type: "tool", name: "generate_tweet" }
            });

            let tweetResponse: TweetGenerationResponse | null = null;
            
            for (const content of response.content) {
                if (content.type === "tool_use" && content.name === "generate_tweet") {
                    const tweetData = content.input as TweetGenerationResponse;
                    if (ResponseValidator.validateTweetGeneration(tweetData)) {
                        tweetResponse = tweetData;
                        break;
                    }
                }
            }

            if (!tweetResponse?.outputGeneration?.finalTweet?.text) {
                throw new ValidationError("No valid tweet content in response");
            }

            // Stream the tweet as an ACTION
            await this.streamToTerminal(
                'ACTION',
                tweetResponse.outputGeneration.finalTweet.text,
                processId
            );

                        // Stream assessment data as a THOUGHT
            await this.streamToTerminal(
                'THOUGHT',
                `Topic Assessment:\n${util.inspect(assessmentData, { depth: null, colors: true })}`,
                processId
            );

            // Stream generation metadata as a THOUGHT
            await this.streamToTerminal(
                'THOUGHT',
                `Tweet Generation:\n${util.inspect(tweetResponse, { depth: null, colors: true })}`,
                processId
            );

            const metadata: TweetGenerationMetadata = {
                timestamp: Date.now(),
                assessment: assessmentData,
                tweetResponse: tweetResponse.outputGeneration
            };

            // Cache metadata for future reference
            await this.runtime.cacheManager.set(
                `twitter/${this.client.profile.username}/last_tweet_metadata`,
                metadata
            );

            return tweetResponse.outputGeneration.finalTweet.text;

        } catch (error) {
            elizaLogger.error("Error in chain of thought tweet generation:", error);
            return this.generateSimpleTweet();
        }
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

            const content = truncateToCompleteSentence(
                this.useCOT ? 
                    await this.generateChainOfThoughtTweet() : 
                    await this.generateSimpleTweet()
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

                await this.runtime.cacheManager.set(
                    `twitter/${this.client.profile.username}/lastPost`,
                    {
                        id: mockTweet.id,
                        timestamp: Date.now(),
                    }
                );

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

    private async handleDryRun(content: string): Promise<void> {
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

        await this.runtime.cacheManager.set(
            `twitter/${this.client.profile.username}/lastPost`,
            {
                id: mockTweet.id,
                timestamp: Date.now(),
            }
        );

        const existingDryRuns = await this.client.getCachedDryRunTweets() || [];
        await this.runtime.cacheManager.set(
            `twitter/${this.client.profile.username}/dryRunTweets`,
            [...existingDryRuns, mockTweet]
        );

        await this.saveTweetToMemory(mockTweet, content);
    }

    private async postTweet(content: string): Promise<Tweet> {
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
        await this.saveTweetToMemory(tweet, content);
        
        elizaLogger.log(`Tweet posted:\n ${tweet.permanentUrl}`);
        
        return tweet;
    }
}