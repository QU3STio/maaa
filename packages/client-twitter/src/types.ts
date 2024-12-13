// types.ts

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

// Base types and enums
export type StepType = 'planning' | 'rag' | 'assessment' | 'strategy' | 'generation' | 'validation';
export type ContentType = 'news' | 'discussion' | 'development' | 'announcement';
export type ValueType = 'information' | 'community' | 'strategic';
export type ValidationLevel = 'error' | 'warning' | 'info';

// Base context interfaces
export interface BaseContext {
    agentName: string;
    twitterUserName: string;
    bio: string[];
    knowledge: string[];
    adjectives: string[];
    postDirections: string[];
    providers: string;
    timeline: string;
}

export interface StepContext extends BaseContext {
    stepPurpose?: string;
    knowledgeNeeds?: string[];
    currentContext?: string;
    selectedTopic?: string;
    dependencyOutputs?: Record<string, any>;
    priorInsights?: string[];
    objective?: string;
    retrievedKnowledge?: string;
    opportunities?: string;
    characterAlignment?: string;
    selectedFocus?: string;
    selectedStrategy?: string;
    voicePlan?: string;
    selectedContent?: string;
    processMetadata?: string;
    strategyAlignment?: string;
    voiceRequirements?: string;
    valueMetrics?: string;
    impactMetrics?: string;
}

// Validation interfaces
export interface ValidationMetrics {
    technical_checks: Record<string, boolean>;
    character_alignment: {
        voice_score: number;
        expertise_score: number;
        authenticity_score: number;
    };
    value_assessment: {
        information_value: number;
        community_value: number;
        strategic_value: number;
    };
    risk_evaluation: {
        identified_risks: string[];
        mitigation_suggestions: string[];
    };
}

// Error handling interfaces
export interface ErrorHandling {
    retry_strategy: {
        max_attempts: number;
        conditions: string[];
    };
    fallback_options: string[];
    recovery_steps: string[];
}

// Step and execution interfaces
export interface ExecutionStep {
    id: string;
    type: StepType;
    template: string;
    purpose: string;
    requires_rag: boolean;
    dependencies: string[];
    validation: ValidationMetrics;
    error_handling: ErrorHandling;
    metadata: {
        estimated_duration?: number;
        required_context?: string[];
        success_criteria: string[];
    };
}

export interface ExecutionPlan {
    steps: ExecutionStep[];
    validation: ValidationMetrics;
    error_handling: ErrorHandling;
    metadata: {
        estimated_duration: number;
        required_context: string[];
        success_criteria: string[];
    };
}

// RAG interfaces
export interface RagQuery {
    query: string;
    focus_areas: string[];
    expected_use: string;
    relevance_criteria: {
        mustHave: string[];
        niceToHave: string[];
        avoid: string[];
    };
    validation: {
        completeness_checks: string[];
        accuracy_requirements: string[];
        relevance_metrics: string[];
    };
}

export interface RagResult {
    content: string;
    metadata: {
        retrieved_at: number;
        source: string;
        relevance_score: number;
        validation: ValidationMetrics;
    };
}

// Assessment interfaces
export interface Opportunity {
    type: string;
    description: string;
    value: number;
    feasibility: number;
}

export interface AssessmentResult {
    opportunities: {
        identified: Opportunity[];
        prioritization: {
            criteria: string[];
            rankings: Record<string, number>;
        };
    };
    knowledge_needs: {
        gaps: string[];
        verification_needs: string[];
        context_requirements: string[];
    };
    character_alignment: {
        natural_angles: string[];
        voice_considerations: string[];
        expertise_utilization: string[];
    };
}

// Strategy interfaces
export interface ContentStrategy {
    selected_strategy: {
        angle: string;
        rationale: string;
        key_points: string[];
        structure: {
            opening: string;
            development: string;
            conclusion: string;
        };
    };
    voice_plan: {
        traits_to_emphasize: string[];
        expertise_integration: string;
        tone_guidance: string;
    };
    validation_criteria: {
        authenticity_checks: string[];
        impact_measures: string[];
        uniqueness_validators: string[];
    };
}

// Generation interfaces
export interface ContentVariation {
    content: string;
    rationale: string;
    strengths: string[];
    risks: string[];
}

export interface GenerationResult {
    variations: ContentVariation[];
    evaluations: {
        authenticity_scores: Record<string, number>;
        impact_predictions: Record<string, number>;
        risk_assessments: Record<string, string[]>;
    };
    recommendation: {
        selected_version: string;
        justification: string;
        confidence_score: number;
    };
}

// Validation interfaces
export interface ValidationResult {
    validation_results: ValidationMetrics;
    final_recommendation: {
        approve: boolean;
        changes_needed: string[];
        confidence_score: number;
    };
}

// Step result interfaces
export interface StepResult {
    stepId: string;
    type: StepType;
    output: AssessmentResult | ContentStrategy | GenerationResult | ValidationResult;
    metadata: {
        started_at: number;
        completed_at: number;
        validation: ValidationMetrics;
        rag_queries?: RagQuery[];
        rag_results?: RagResult[];
    };
}

// Complete process interface
export interface TweetGenerationProcess {
    plan: ExecutionPlan;
    steps: StepResult[];
    final_output: {
        tweet: string;
        supporting_data: {
            rag_queries: RagQuery[];
            assessments: AssessmentResult[];
            strategies: ContentStrategy[];
            variations: ContentVariation[];
        };
        validation: ValidationResult;
    };
    metadata: {
        started_at: number;
        completed_at: number;
        steps_executed: number;
        rag_queries_performed: number;
        overall_confidence: number;
    };
    error_handling: {
        retries: Record<string, number>;
        failures: Record<string, string>;
        recoveries: Record<string, string>;
    };
}

// Error types
export class ValidationError extends Error {
    constructor(
        message: string,
        public validation: ValidationMetrics,
        public level: ValidationLevel
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class ExecutionError extends Error {
    constructor(
        message: string,
        public stepId: string,
        public recovery_attempted: boolean,
        public recovery_result?: string
    ) {
        super(message);
        this.name = 'ExecutionError';
    }
}

