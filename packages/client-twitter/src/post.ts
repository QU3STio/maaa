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
import { TweetGenerationResponse, TopicAssessmentResponse } from "./types";
import { tweetGenerationTool, topicAssessmentTool } from "./tools";
import Anthropic from "@anthropic-ai/sdk";
import {
    twitterSimplePostTemplate,
    tweetGenerationTemplate,
    topicAssessmentTemplate,
} from "./templates";

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

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.anthropicClient = new Anthropic({
            apiKey: this.runtime.getSetting("ANTHROPIC_API_KEY")
        });
        this.useCOT = this.runtime.getSetting("twitter_post_cot") === "true";
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
            modelClass: ModelClass.SMALL,
        });

        return newTweetContent.replaceAll(/\\n/g, "\n").trim();
    }

    private async assessTopics(): Promise<TopicAssessmentResponse> {
        const homeTimeline = await this.client.getCachedTimeline() || [];
        const dryRunTweets = await this.client.getCachedDryRunTweets() || [];
        const allTweets = [...homeTimeline, ...dryRunTweets].sort((a, b) => b.timestamp - a.timestamp);

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
            messages: [
                {
                    role: "user",
                    content: context
                }
            ],
            tools: [topicAssessmentTool],
            tool_choice: {
                type: "tool",
                name: "assess_topics"
            }
        });

        elizaLogger.info("Topic assessment prompt", context);
        elizaLogger.info("Topic assessment response", response);

        for (const content of response.content) {
            if (content.type === "tool_use" && content.name === "assess_topics") {
                return content.input as TopicAssessmentResponse;
            }
        }

        throw new Error("No valid topic assessment in response");
    }

    private async generateChainOfThoughtTweet(): Promise<string> {

        const topicAssessment = await this.assessTopics();
        
        const selectedTopic = {
            topic: topicAssessment.strategySelection.selectedPackage.topic,
            angle: topicAssessment.strategySelection.selectedPackage.angle,
            reasoning: topicAssessment.strategySelection.selectedPackage.reasoning,
            freshness: {
                topicNovelty: topicAssessment.opportunityAnalysis.scores[topicAssessment.strategySelection.selectedPackage.topic]?.timeliness,
                angleOriginality: topicAssessment.opportunityAnalysis.scores[topicAssessment.strategySelection.selectedPackage.topic]?.strategyAlignment,
                patternFreshness: topicAssessment.opportunityAnalysis.scores[topicAssessment.strategySelection.selectedPackage.topic]?.uniqueness,
                developmentPotential: topicAssessment.opportunityAnalysis.scores[topicAssessment.strategySelection.selectedPackage.topic]?.developmentPotential
            }
        };
    
        // Fetch and format timeline
        const homeTimeline = await this.client.getCachedTimeline() || [];
        const dryRunTweets = await this.client.getCachedDryRunTweets() || [];
        const allTweets = [...homeTimeline, ...dryRunTweets].sort((a, b) => b.timestamp - a.timestamp);
    
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
                    text: selectedTopic.topic,
                    action: "",
                },
            },
            {
                twitterUserName: this.client.profile.username,
                timeline: formattedHomeTimeline,
                selectedTopic: `Topic: ${selectedTopic.topic}\nAngle: ${selectedTopic.angle}\nReasoning: ${selectedTopic.reasoning}${
                    selectedTopic.freshness ? 
                    `\nFreshness: ${JSON.stringify(selectedTopic.freshness)}` : 
                    ''
                }`,
                selectedStrategy: topicAssessment.strategySelection.selectedPackage.strategy,
                valueProposition: topicAssessment.strategySelection.selectedPackage.valueProposition,
                avoidList: JSON.stringify(topicAssessment.strategySelection.avoidList),
                supportingElements: topicAssessment.strategySelection.selectedPackage.supportingElements.join('\n'),
                developmentGuides: topicAssessment.strategySelection.guidelines.patternSuggestions.join('\n'),
                patternSuggestions: topicAssessment.strategySelection.guidelines.patternSuggestions.join('\n')
            }
        );
    
        const context = composeContext({
            state,
            template: tweetGenerationTemplate,
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
    
        elizaLogger.info("Chain of thought prompt", context);
        elizaLogger.info("Chain of thought response", response);
    
        let tweetData: TweetGenerationResponse | null = null;
    
        for (const content of response.content) {
            if (content.type === "tool_use" && content.name === "generate_tweet") {
                tweetData = content.input as TweetGenerationResponse;
                break;
            }
        }
    
        if (!tweetData || !tweetData.selectedTweet?.content) {
            elizaLogger.error("Invalid tweet data:", { tweetData });
            throw new Error("No valid tweet data in response");
        }
    
        return tweetData.selectedTweet.content;
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