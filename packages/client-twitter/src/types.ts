// types.ts

// Common interfaces used across both systems
interface PatternEntry {
    type: string;
    frequency: number;
    lastUsed: string;
  }
  
  // Topic Assessment Types
  
  interface ContentAssessmentEntry {
    topic: string;
    strategy: string;
    effectiveness: number;
    engagementLevel: number;
    supportingElements: string[];
  }
  
  interface PatternAnalysis {
    openingStructures: Array<PatternEntry>;
    sentencePatterns: Array<PatternEntry>;
    closingTechniques: Array<PatternEntry>;
    phraseUsage: Array<PatternEntry>;
  }
  
  interface VoiceAnalysis {
    consistencyScore: number;
    toneAlignment: number;
    styleCompliance: number;
    ruleAdherence: boolean;
  }
  
  interface StrategyTracking {
    recentUsage: Array<{
      strategy: string;
      timestamp: string;
      postId: string;
    }>;
    distribution: Record<string, number>;
    gaps: string[];
    rotationNeeded: boolean;
  }
  
  interface TrackingLists {
    strategies: StrategyTracking;
    patterns: PatternAnalysis;
    topics: string[];
    metrics: string[];
    projects: string[];
  }
  
  interface ContextAnalysis {
    contentAssessment: ContentAssessmentEntry[];
    patternAnalysis: PatternAnalysis;
    voiceAnalysis: VoiceAnalysis;
    trackingLists: TrackingLists;
  }
  
  interface OpportunityScores {
    timeliness: number;
    characterFit: number;
    valuePotential: number;
    developmentPotential: number;
    uniqueness: number;
    engagementLikelihood: number;
    strategyAlignment: number;
  }
  
  interface OpportunityAnalysis {
    educational: string[];
    entertainment: string[];
    inspirational: string[];
    networking: string[];
    informational: string[];
    scores: Record<string, OpportunityScores>;
  }
  
  interface SelectedPackage {
    strategy: string;
    reasoning: string;
    topic: string;
    angle: string;
    valueProposition: string;
    implementationAngle: string;
    supportingElements: string[];
    contextRequirements: string[];
    developmentPotential: string[];
    engagementHooks: string[];
  }
  
  interface AvoidList {
    strategies: string[];
    patterns: string[];
    topics: string[];
    phrases: string[];
    metrics: string[];
    structures: string[];
    openings: string[];
  }
  
  interface Guidelines {
    voiceDirection: string;
    toneGuidance: string;
    patternSuggestions: string[];
    hookOptions: string[];
    structureRecommendations: string[];
    metricUsageGuidance: string;
    engagementApproaches: string[];
    closingTechniques: string[];
  }
  
  interface StrategySelection {
    selectedPackage: SelectedPackage;
    avoidList: AvoidList;
    guidelines: Guidelines;
  }
  
  export interface TopicAssessmentResponse {
    contextAnalysis: ContextAnalysis;
    opportunityAnalysis: OpportunityAnalysis;
    strategySelection: StrategySelection;
  }
  
  // Tweet Generation Types
  
  interface HookAnalysis {
    valueEntry: string;
    patternUsed: string;
    voiceAlignment: string;
  }
  
  interface MessageCore {
    valueDelivery: string;
    supportingElements: string[];
    characterVoice: string;
  }
  
  interface StrategicClose {
    impactElement: string;
    engagementHook: string;
    memoryElement: string;
  }
  
  interface TweetMetrics {
    technicalAccuracy: boolean;
    contextClarity: boolean;
    timeRelevance: boolean;
  }
  
  interface StrategyAlignment {
    valueDelivery: boolean;
    patternFreshness: number;
    engagementPotential: number;
  }
  
  interface CharacterTruth {
    voiceConsistency: number;
    styleCompliance: boolean;
    perspectiveAlignment: boolean;
  }
  
  interface TweetVariation {
    content: string;
    hookAnalysis: HookAnalysis;
    messageCore: MessageCore;
    strategicClose: StrategicClose;
    metrics: TweetMetrics;
    strategyAlignment: StrategyAlignment;
    characterTruth: CharacterTruth;
  }
  
  interface TechnicalChecks {
    accuracy: boolean;
    clarity: boolean;
    relevance: boolean;
  }
  
  interface StrategicChecks {
    implementation: boolean;
    valueDelivery: boolean;
    engagement: number;
  }
  
  interface CharacterChecks {
    voiceMatch: boolean;
    styleMatch: boolean;
    authenticity: number;
  }
  
  interface QualityChecks {
    technical: TechnicalChecks;
    strategic: StrategicChecks;
    character: CharacterChecks;
  }
  
  interface QualityFactors {
    technicalScore: number;
    strategyScore: number;
    characterScore: number;
    valueScore: number;
    engagementScore: number;
  }
  
  interface Differentiation {
    patternUniqueness: number;
    structuralFreshness: number;
    voiceStrength: number;
    valueClarity: number;
  }
  
  interface Impact {
    conversationPotential: number;
    developmentPossibilities: string[];
    communityValue: string;
    strategyAdvancement: string;
  }
  
  interface SelectionReasoning {
    qualityFactors: QualityFactors;
    differentiation: Differentiation;
    impact: Impact;
  }
  
  interface TweetAnalysis {
    valueDelivery: string;
    engagement: string;
    impact: string;
  }
  
  interface SelectedTweet {
    content: string;
    strategy: string;
    pattern: string;
    analysis: TweetAnalysis;
  }
  
  export interface TweetGenerationResponse {
    variations: TweetVariation[];
    qualityChecks: QualityChecks;
    selectionReasoning: SelectionReasoning;
    selectedTweet: SelectedTweet;
  }