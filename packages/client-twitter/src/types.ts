// types.ts - Comprehensive update for all response types

// Shared type definitions to ensure consistency
export type ContentType = 'news' | 'discussion' | 'development' | 'announcement';
export type CategoryType = 'information' | 'community' | 'strategic';
export type TweetVersion = 'A' | 'B' | 'C';

// Base interfaces for common structures
interface EnvironmentUpdate {
    type: ContentType;
    content: string;
    timestamp: string;
    impact: number;
    relevance: string[];
}

interface MetricData {
    name: string;
    value: number;
    trend: string;
    timestamp: string;
}

interface SocialData {
    type: string;
    content: string;
    source: string;
    timestamp: string;
    significance: number;
}

// Updated Topic Assessment Response
export interface TopicAssessmentResponse {
    contextAnalysis: {
        environment: {
            updates: EnvironmentUpdate[];
            metrics: Array<{
                category: string;
                context: string;
                metrics: MetricData[];
            }>;
            social: SocialData[];
        };
        character: {
            relevantTraits: string[];
            naturalPerspective: string;
            authenticValue: string;
        };
        recentActivity: {
            patterns: {
                contentTypes: string[];
                voicePatterns: string[];
                topics: string[];
                engagementApproaches: string[];
                timestamp: string;
            };
            avoidList: string[];
        };
    };
    opportunityMapping: {
        identified: Array<{
            category: CategoryType;
            value: {
                primary: string;
                supporting: string[];
                uniqueAngle: string;
            };
            suitability: {
                characterFit: number;
                timeliness: number;
                freshness: number;
            };
        }>;
        priorityScore: number;
        narrativeAlignment: string;
    };
    strategyDevelopment: {
        selected: {
            topic: {
                main: string;
                angle: string;
                perspective: string;
            };
            structure: {
                opening: string;
                flow: string;
                close: string;
            };
            voice: {
                elements: string[];
                tonality: string;
                authenticity: number;
            };
            impact: {
                intended: string;
                potential: string;
                measurement: string;
            };
        };
        avoidList: string[];
        reasoningPath: string[];
    };
    outputRecommendation: {
        topic: string;
        strategy: string;
        execution: {
            approach: string;
            guidelines: string[];
            cautions: string[];
        };
    };
}

// Updated Tweet Generation Response
export interface TweetGenerationResponse {
    contextAnalysis: {
        inputSynthesis: {
            selectedTopic: string;
            selectedAngle: string;
            characterVoice: {
                traits: string[];
                rules: string[];
                examples: string[];
            };
            contextualFactors: Array<{
                type: string;
                content: string;
                relevance: number;
            }>;
        };
        contentFramework: {
            structure: {
                opening: string;
                core: string;
                closing: string;
            };
            constraints: {
                characterLimit: number;
                avoidList: string[];
                requiredElements: string[];
            };
        };
    };
    strategyDevelopment: {
        variations: Array<{
            version: TweetVersion;
            text: string;
            rationale: string;
        }>;
        selection: {
            chosenVersion: TweetVersion;
            justification: string;
        };
    };
    contentValidation: {
        factualAccuracy: string;
        voiceAuthenticity: string;
        contextAlignment: string;
        uniqueness: string;
    };
    outputGeneration: {
        finalTweet: {
            text: string;
            version: TweetVersion;
        };
        metadata: {
            characterCount: number;
            contextualReferences: string[];
            avoidedElements: string[];
        };
    };
}

// Helper types for validation and data extraction
export interface AssessmentMetadata {
    topic: string;
    angle: string;
    voice: {
        elements: string[];
        tonality: string;
        authenticity: number;
    };
    context: {
        updates: EnvironmentUpdate[];
        metrics: Array<{
            category: string;
            context: string;
            metrics: MetricData[];
        }>;
        social: SocialData[];
    };
    guidelines: string[];
    cautions: string[];
}

export interface TweetGenerationMetadata {
    timestamp: number;
    assessment: AssessmentMetadata;
    tweetResponse: {
        finalTweet: {
            text: string;
            version: TweetVersion;
        };
        metadata: {
            characterCount: number;
            contextualReferences: string[];
            avoidedElements: string[];
        };
    };
}