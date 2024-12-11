// types.ts

// Input Analysis Types
interface SituationAssessment {
    patternAnalysis: {
        recentDistribution: Record<string, number>;
        unusedPatterns: string[];
        recentPhrases: string[];
        recentStructures: string[];
    };
    opportunities: Array<{
        description: string;
        timelineFreshness: number;
        metricStrength: number;
        topicRelevance: number;
        knowledgeSupport: number;
        priority: number;
        reasoning: string;
        patternFreshness: number;
    }>;
}

interface ContentStrategy {
    selectedOpportunity: {
        description: string;
        reasoning: string;
    };
    chosenStrategy: {
        type: string;
        distributionContext: string;
    };
    patternChoice: {
        type: string;
        fitExplanation: string;
    };
    requiredSources: Array<{
        source: string;
        intent: string;
    }>;
    situationConnection: string;
    diversityApproach: {
        plannedStructures: string[];
        avoidPhrases: string[];
        angleVariations: string[];
    };
}

interface TweetVariation {
    content: string;
    pattern: string;
    strategy: string;
    angle: string;
    voiceMarkers: string[];
    strategyImplementation: string;
    uniquenessMetrics: {
        patternFreshness: number;
        phraseUniqueness: number;
        structuralDiversity: number;
        overallDistinctiveness: number;
    };
}

interface TweetDevelopment {
    variations: TweetVariation[];
    differentiation: {
        angleUniqueness: string;
        voiceConsistency: string;
        strategyAlignment: string;
    };
    uniquenessVerification: {
        vsRecentPosts: string;
        vsOtherVariations: string;
    };
    strategyConnection: string;
}

interface QualityChecks {
    voice: {
        authentic: boolean;
        naturalLanguage: boolean;
        toneMatch: boolean;
    };
    content: {
        perspective: boolean;
        communityResonance: boolean;
    };
    technical: {
        metricAccuracy: boolean;
        temporalClarity: boolean;
        sourceValidity: boolean;
    };
    uniqueness: {
        patternFresh: boolean;
        phraseUnique: boolean;
        structureDistinct: boolean;
        score: number;
    };
}

interface FinalTweet {
    content: string;
    reasoningChain: string[];
    expectedImpact: string;
    qualityChecks: QualityChecks;
    diversityMetrics: {
        patternNovelty: number;
        structuralUniqueness: number;
        phraseOriginality: number;
        overallFreshness: number;
    };
}

export interface TweetGenerationResponse {
    situationAnalysis: SituationAssessment;
    contentStrategy: ContentStrategy;
    tweetDevelopment: TweetDevelopment;
    finalSelection: FinalTweet;
}