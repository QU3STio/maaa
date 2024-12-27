import { composeContext } from "@ai16z/eliza";
import { generateText } from "@ai16z/eliza";
import { parseJsonFromText } from "@ai16z/eliza";
import {
    IAgentRuntime,
    Memory,
    ModelClass,
    type State,
    Evaluator,
} from "@ai16z/eliza";
import {
    tweetReflectionTemplate,
    tweetReflectionSummaryTemplate,
} from "../templates.ts";

interface ReflectionContent {
    primary_message: string;
    evidence: string[];
    assertions: string[];
    assumptions: string[];
    audience_impact: string;
}

interface VoiceAnalysis {
    distinctive_phrases: string[];
    personality_traits: string[];
    engagement_style: string;
    emotional_tone: string;
}

interface TopicPosition {
    topic: string;
    stance: string;
    support: string[];
}

interface TopicsAnalysis {
    primary: string;
    secondary: string[];
    positions: TopicPosition[];
}

interface Entity {
    name: string;
    type: string;
    context: string;
    is_new: boolean;
}

interface Interaction {
    source: string;
    target: string;
    nature: string;
}

interface RelationshipsAnalysis {
    entities: Entity[];
    interactions: Interaction[];
}

interface StrategyAnalysis {
    opportunities: string[];
    risks: string[];
    threads: string[];
}

interface TweetReflection {
    content: ReflectionContent;
    voice: VoiceAnalysis;
    topics: TopicsAnalysis;
    relationships: RelationshipsAnalysis;
    strategy: StrategyAnalysis;
}

async function summarizeRecentContext(
    runtime: IAgentRuntime,
    recentReflections: TweetReflection[]
): Promise<string> {
    if (!recentReflections.length) {
        return "No previous context";
    }

    const context = composeContext({
        template: tweetReflectionSummaryTemplate,
        state: {
            reflections: JSON.stringify(recentReflections, null, 2),
        },
    });

    const response = await generateText({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    });

    return response;
}

async function handler(
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined
): Promise<TweetReflection> {
    // Get recent reflections from the database
    const recentReflections = await runtime.databaseAdapter.getReflections(
        message.roomId,
        5
    );

    // Get context summary
    const previousContext = await summarizeRecentContext(
        runtime,
        recentReflections
    );

    // Compose context for analysis
    const context = composeContext({
        template: tweetReflectionTemplate,
        state: {
            previousReflections: previousContext,
            tweet: message.content.text,
        },
    });

    // Generate reflection
    const response = await generateText({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    });

    // Extract reflection JSON from between tags
    const reflectionMatch = response.match(
        /<reflection>([\s\S]*?)<\/reflection>/
    );
    if (!reflectionMatch) {
        throw new Error("Missing reflection tags in response");
    }

    const reflection = parseJsonFromText(reflectionMatch[1]) as TweetReflection;

    // Store reflection in database
    await runtime.databaseAdapter.storeReflection(message.roomId, reflection);

    return reflection;
}

export const tweetReflectionEvaluator: Evaluator = {
    name: "TWEET_REFLECTION",
    similes: ["ANALYZE_TWEET", "REFLECT_ON_TWEET"],
    validate: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        return message.type === "TWEET";
    },
    description:
        "Analyze a tweet extensively to inform future content direction",
    handler,
};