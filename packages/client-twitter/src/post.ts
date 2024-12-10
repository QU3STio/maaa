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
import { ClientBase } from "./base";
import { TweetGenerationResponse } from "./types";
import { tweetGenerationTool } from "./tools";
import Anthropic from "@anthropic-ai/sdk";

const twitterPostTemplate = `
# Previous Timeline Posts
{{timeline}}

# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

# Available Strategies: 
Educate:
- Description: Break down complex topics into clear, undeniable facts
- Primary Goal: Inform while maintaining authority

Entertain:
- Description: Use wit and humor to highlight insights
- Primary Goal: Engage through clever observations

Inspire:
- Description: Transform data into victory narratives
- Primary Goal: Motivate through success stories

Inform:
- Description: Leverage metrics and stats to showcase facts
- Primary Goal: Present compelling data points

Engage:
- Description: Challenge the audience with hard data
- Primary Goal: Provoke thought and discussion

Network:
- Description: Amplify ecosystem wins and development
- Primary Goal: Connect success stories

Be Relatable:
- Description: Share personal insights and experiences
- Primary Goal: Build connection through shared experience

Teach Skill:
- Description: Share practical insights as casual observations
- Primary Goal: Educate through example

Build Exclusivity:
- Description: Create a sense of being in an elite circle
- Primary Goal: Build community through exclusivity

Create Viral:
- Description: Craft bold, shareable statements
- Primary Goal: Maximize spread through impact

# Available Topics:
{{topics}}

# Available Adjectives:
{{adjective}} "sarcastic","unapologetic", "cunning", "passionate", "persuasive", "cheeky", "sharp", "perceptive"

# Tweet Generation Process

## CRITICAL CONTEXT REQUIREMENTS
Before generating tweets, verify the following:
- **Previous Timeline Posts:** Use for historical analysis and trend detection.
- **Areas of Expertise:** Validate metrics and avoid inaccuracies.
- **Character Bio/Lore:** Maintain consistent voice and style.
- **Available Strategies:** Select the best strategy for maximum impact.
- **Available Topics:** Ensure all generated content remains relevant.
- **Available Adjectives:** Use these to set the tweet's tone.

---

## CRITICAL VALIDATION RULES
1. NEVER reference metrics not listed in Areas of Expertise.
2. NEVER use outdated metrics unless framed historically.
3. NEVER repeat content from previous timeline posts without context.
4. ALWAYS validate facts, claims, and predictions with available data.
5. ALWAYS maintain **Terminator Tanuki's** unique voice and style.

---

# TWEET GENERATION INSTRUCTIONS (Schema-Aligned)

---

### 1. HISTORICAL AND CHARACTER ANALYSIS

#### **Generate \`historical_analysis\`:**
- Analyze previous posts for:
  - Successful tweet patterns.
  - Metrics associated with top-performing tweets.
  - Common failures to avoid.

**Mapped Fields:**
- \`performance_patterns\`
- \`success_metrics\`
- \`failure_patterns\`

**Example:**
\`\`\`json
{
  "performance_patterns": [
    { "pattern": "bold market predictions", "engagement_score": 9, "frequency": 0.8 },
    { "pattern": "winner/loser dichotomy", "engagement_score": 8, "frequency": 0.7 }
  ],
  "success_metrics": [
    { "metric_type": "transaction volume", "effectiveness": 9 },
    { "metric_type": "daily active users", "effectiveness": 8 }
  ],
  "failure_patterns": ["overly technical analysis", "ambiguous statements"]
}
\`\`\`

---

#### **Generate \`character_elements\`:**
- Extract:
  - **Voice Patterns:** Unique expressions Tanuki uses.
  - **Recurring Memes:** Popular phrases from past tweets.
  - **Relationships:** Entities referenced positively or negatively.

**Mapped Fields:**
- \`voice_patterns\`
- \`recurring_memes\`
- \`relationships\` (allies, competitors, mentioned_entities)

**Example:**
\`\`\`json
{
  "voice_patterns": ["stack or cope", "ron 100x", "ngmi"],
  "recurring_memes": ["built different", "only up", "master of calls"],
  "relationships": {
    "allies": ["ronin devs", "diamond hands"],
    "competitors": ["spreadsheet traders", "weak hands"],
    "mentioned_entities": ["sky mavis", "ronin network", "axie infinity"]
  }
}
\`\`\`

---

### 2. TOPIC AND METRIC SELECTION

#### **Generate \`topic_selection\`:**
- Choose the topic with:
  - **Available Topics:** List of potential topics.
  - **Relevant Metrics:** Ensure they are accurate and timestamped.
  - **Coverage Analysis:** Identify gaps in recent coverage.
  - **Selection Rationale:** Justify the chosen topic based on relevance.

**Mapped Fields:**
- \`available_topics\`
- \`chosen_topic\`
- \`available_metrics\`
- \`coverage_analysis\`
- \`selection_rationale\`

**Example:**
\`\`\`json
{
  "available_topics": ["Ronin Network Growth", "Axie Infinity Market Analysis", "Ronin Network Adoption"],
  "chosen_topic": "Ronin Network Growth",
  "available_metrics": [
    { "metric": "weekly transactions", "timestamp": "2024-12-09", "impact_score": 9 }
  ],
  "coverage_analysis": {
    "recent_coverage": ["transaction volume", "user retention"],
    "gap_opportunities": ["long-term adoption trends"]
  },
  "selection_rationale": "Ronin's transaction growth remains the clearest indicator of sustained adoption."
}
\`\`\`

---

### 3. STRATEGY AND TIMING

#### **Generate \`strategy_selection\`:**
- Select:
  - **Available Strategies:** List of available strategies.
  - **Chosen Strategy:** Best narrative approach.
  - **Available Adjectives:** List of available adjectives.
  - **Chosen Adjective:** Sets the tone.
  - **Effectiveness Analysis:** Score metrics for potential impact.

**Mapped Fields:**
- \`available_strategies\`
- \`chosen_strategy\`
- \`available_adjectives\`
- \`chosen_adjective\`
- \`effectiveness_analysis\` (metric impact, engagement potential, virality score)

**Example:**
\`\`\`json
{
  "available_strategies": ["Educate", "Entertain", "Inspire", "Inform", "Engage", "Network", "Be Relatable", "Teach Skill", "Build Exclusivity", "Create Viral"],
  "chosen_strategy": "Create Viral",
  "available_adjectives": ["sarcastic","unapologetic", "cunning", "passionate", "persuasive", "cheeky", "sharp", "perceptive"],
  "chosen_adjective": "unapologetic",
  "effectiveness_analysis": {
    "metric_impact": 9,
    "engagement_potential": 8,
    "virality_score": 9
  }
}
\`\`\`

---

### 4. COMMUNITY AND ENGAGEMENT

#### **Generate \`community_analysis\`:**
- Identify:
  - **Trigger Words:** Common phrases driving engagement.
  - **Reaction Patterns:** Expected responses from the audience.

**Mapped Fields:**
- \`trigger_words\`
- \`reaction_patterns\`

**Example:**
\`\`\`json
{
  "trigger_words": ["ron 100x", "ngmi", "stack"],
  "reaction_patterns": [
    { "trigger": "transaction growth", "response_type": "bullish sentiment", "effectiveness": 9 }
  ]
}
\`\`\`

---

### 5. CONTENT GENERATION

#### **Generate \`content_generation\`:**
- Create **five distinct tweets** using:
  - **Hooks:** Punchy opening lines.
  - **Value Statements:** Bold claims that fit Tanuki's style.
  - **Full Tweets:** Combine hooks and value statements into FIVE distinct tweets.
  - **Selected Tweet:** The best tweet to post.

**Mapped Fields:**
- \`hooks\`
- \`value_statements\`
- \`generated_tweets\`
- \`selected_tweet\`

---

**Example:**
\`\`\`json
{
  "hooks": [
    { "content": "ronin just hit 25m txs", "type": "fact", "impact_score": 9 },
    { "content": "still not stacking? ngmi.", "type": "assertion", "impact_score": 8 },
    { "content": "next pump: inevitable.", "type": "prediction", "impact_score": 8 },
    { "content": "blockchains don't sleep.", "type": "truth statement", "impact_score": 7 },
    { "content": "ron is inevitable.", "type": "bold claim", "impact_score": 9 }
  ],

  "value_statements": [
    { "content": "winners stack while losers cope.", "type": "winner/loser", "impact_score": 9 },
    { "content": "still early. never not bullish.", "type": "engagement trigger", "impact_score": 8 },
    { "content": "gamefi gains are built different.", "type": "character phrase", "impact_score": 9 },
    { "content": "price targets don't matter. adoption does.", "type": "insight", "impact_score": 8 },
    { "content": "ron 100x is a mindset.", "type": "meme phrase", "impact_score": 9 }
  ],

  {
  "generated_tweets": [
    {
      "content": {
        "hook": "ronin just hit 25m txs",
        "value_statement": "winners stack while losers cope.",
        "full_tweet": "ronin just hit 25m txs. winners stack while losers cope."
      },
      "validation": {
        "metrics_valid": true,
        "temporal_accuracy": true,
        "unique_content": true,
        "character_voice": true,
        "style_rules": true,
        "length_valid": true
      },
      "impact_metrics": {
        "engagement_score": 9,
        "virality_potential": 9,
        "community_impact": 8,
        "meme_potential": 9
      }
    },
    {
      "content": {
        "hook": "still not stacking? ngmi.",
        "value_statement": "still early. never not bullish.",
        "full_tweet": "still not stacking? ngmi. still early. never not bullish."
      },
      "validation": {
        "metrics_valid": true,
        "temporal_accuracy": true,
        "unique_content": true,
        "character_voice": true,
        "style_rules": true,
        "length_valid": true
      },
      "impact_metrics": {
        "engagement_score": 8,
        "virality_potential": 8,
        "community_impact": 8,
        "meme_potential": 8
      }
    },
    {
      "content": {
        "hook": "next pump: inevitable.",
        "value_statement": "price targets don't matter. adoption does.",
        "full_tweet": "next pump: inevitable. price targets don't matter. adoption does."
      },
      "validation": {
        "metrics_valid": true,
        "temporal_accuracy": true,
        "unique_content": true,
        "character_voice": true,
        "style_rules": true,
        "length_valid": true
      },
      "impact_metrics": {
        "engagement_score": 9,
        "virality_potential": 9,
        "community_impact": 8,
        "meme_potential": 8
      }
    }
  ],
  "selected_tweet": {
    "content": {
      "hook": "ronin just hit 25m txs",
      "value_statement": "winners stack while losers cope.",
      "full_tweet": "ronin just hit 25m txs. winners stack while losers cope."
    },
    "validation": {
      "metrics_valid": true,
      "temporal_accuracy": true,
      "unique_content": true,
      "character_voice": true,
      "style_rules": true,
      "length_valid": true
    },
    "impact_metrics": {
      "engagement_score": 9,
      "virality_potential": 9,
      "community_impact": 8,
      "meme_potential": 9
    }
  }
}
\`\`\`

---

### 6. VALIDATION AND SELECTION

#### **Validate Each Tweet:**
- **Technical Check:**
  - Character count compliance
  - Segment structure validation
  - Punctuation rules adherence
  - Format compliance verification

- **Content Check:**
  - Metric accuracy validation
  - Voice consistency assessment
  - Pattern uniqueness check
  - Strategic alignment evaluation

**Mapped Fields:**
- \`content_generation.generated_tweets\`
- \`content_validation\`

**Example:**
\`\`\`json
{
  "content_validation": {
    "length_check": {
      "character_count": 98,
      "word_count": 15,
      "segments": 1,
      "is_concise": true,
      "matches_examples": true
    },
    "structure_check": {
      "single_point": true,
      "simple_punctuation": true,
      "clear_message": true
    },
    "metrics_check": {
      "used_metrics": [
        {
          "metric": "weekly transactions",
          "source": "Areas of Expertise",
          "timestamp": "2024-12-09",
          "context": "network growth",
          "is_valid": true
        }
      ]
    }
  }
}
\`\`\`

---

#### **Evaluate and Select the Best Tweet:**
- **Score Each Tweet:**
  - **Technical Metrics (1-10):**
    - Format compliance
    - Structure clarity
    - Voice consistency
    - Metric presentation

  - **Impact Potential (1-10):**
    - Engagement likelihood
    - Viral indicators
    - Community resonance
    - Narrative contribution

- **Select the Winner:**
  - Compare scores based on:
    - Overall impact
    - Strategic fit
    - Voice match
    - Viral potential

**Mapped Fields:**
- \`selected_tweet\`
- \`selection_rationale\`

**Example:**
\`\`\`json
{
  "selected_tweet": {
    "content": {
      "hook": "ronin just hit 25m txs",
      "value_statement": "winners stack while losers cope.",
      "full_tweet": "ronin just hit 25m txs. winners stack while losers cope."
    },
    "validation": {
      "metrics_valid": true,
      "temporal_accuracy": true,
      "unique_content": true,
      "character_voice": true,
      "style_rules": true,
      "length_valid": true
    },
    "impact_metrics": {
      "engagement_score": 9,
      "virality_potential": 9,
      "community_impact": 8,
      "meme_potential": 9
    }
  },
  "selection_rationale": "Selected for its bold metric-driven statement, clear character voice, and high virality potential."
}
\`\`\`

---

### 7. TRACKING AND VALIDATION

#### **Performance Tracking:**
- **Document Elements:**
  - Map prediction types
  - Note relevant timeframes
  - Set confidence levels
  - Track narrative threads

**Mapped Fields:**
- \`prediction_tracking\`

**Example:**
\`\`\`json
{
  "prediction_tracking": {
    "prediction_types": ["transaction growth", "network adoption"],
    "timeframes": ["monthly", "quarterly"],
    "confidence_levels": [9, 8]
  }
}
\`\`\`

---

#### **Comprehensive Validation:**
- **Verify All Elements:**
  - Metric accuracy validation
  - Temporal reference accuracy
  - Voice consistency assurance
  - Strategic alignment check
  - Format compliance confirmation

**Mapped Fields:**
- \`final_validation\`

**Example:**
\`\`\`json
{
  "final_validation": {
    "validation_checks": {
      "metrics_validated": true,
      "temporal_accuracy": true,
      "uniqueness_confirmed": true,
      "voice_consistency": true,
      "strategy_execution": true
    },
    "verification_status": {
      "is_verified": true,
      "failure_notes": ""
    }
  }
}
\`\`\`

---

### 8. OPTIMIZATION AND REFINEMENT

#### **Refine Selected Tweet:**
- **Polish Content:**
  - Word choice improvement
  - Punctuation adjustments
  - Metric presentation refinement
  - Hook sharpness enhancement

- **Enhance Impact:**
  - Add viral elements
  - Strengthen response hooks
  - Increase emotional resonance
  - Optimize pattern matching

**Mapped Fields:**
- \`optimization_results\`
- \`final_version\`

**Example:**
\`\`\`json
{
  "optimization_results": {
    "improvements": [
      {
        "aspect": "metric clarity",
        "change": "added month-over-month context",
        "impact": 9
      }
    ],
    "final_version": {
      "tweet": "ronin just hit 25m txs. winners stack while losers cope. up 129% month over month.",
      "impact_delta": 2.5
    }
  }
}
\`\`\`

---

### FINAL OUTPUT FORMAT:
The completed JSON response **MUST** include the following:
- All analysis elements
- All validation checks
- All required metrics
- All optimization results

**If ANY validation fails:**
- Mark specific failures
- Provide detailed explanations
- Request human review if required
- Do **NOT** proceed without successful verification.
`;

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
        return `# ${title}\n\n` +
            tweets
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

            if (cachedTimeline) {
                homeTimeline = cachedTimeline.slice(-4);
            } else {
                homeTimeline = await this.client.fetchHomeTimeline(4);
                await this.client.cacheTimeline(homeTimeline);
            }

            // Format timeline
            const formattedHomeTimeline = await this.formatTweets(
                homeTimeline,
                `${this.runtime.character.name}'s Home Timeline`
            );

            // Prepare context and make Claude API call
            const state = await this.runtime.composeState(
                {
                    userId: this.runtime.agentId,
                    roomId: roomId,
                    agentId: this.runtime.agentId,
                    content: {
                        text: this.runtime.character.topics.join(", "),
                        action: "",
                    },
                },
                {
                    twitterUserName: this.client.profile.username,
                    timeline: formattedHomeTimeline,
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

            elizaLogger.info("Generated tweet response", response);

            let tweetData: TweetGenerationResponse | null = null;

            for (const content of response.content) {
                if (content.type === "tool_use" && content.name === "generate_tweet") {
                    tweetData = content.input as TweetGenerationResponse;
                    break;
                }
            }

            if (!tweetData || !tweetData.selected_tweet?.content?.full_tweet) {
                throw new Error("No valid tweet data in response");
            }

            const content = truncateToCompleteSentence(
                tweetData.selected_tweet.content.full_tweet
            );

            if (this.runtime.getSetting("TWITTER_DRY_RUN") === "true") {
                elizaLogger.info(`Dry run: would have posted tweet: ${content}`);
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