// types.ts

// Core types
export type StepType = 'assessment' | 'generation' | 'validation';
export type ValidationLevel = 'error' | 'warning' | 'info';

// Base validation interface
export interface Validation {
    voice_match: number;      // 0-5
    factual_accuracy: number; // 0-5
    risks: string[];         // At least one item
}

export interface PlanModification {
    add_steps?: ExecutionStep[];
    remove_steps?: string[];
    modify_steps?: Record<string, Partial<ExecutionStep>>;
}

// Step interface
export interface ExecutionStep {
    id: string;
    type: StepType;
    template: string;
    requires_rag: boolean;
    dependencies: string[];
    validation: Validation;
    can_trigger_changes?: boolean;
    modification_conditions?: string[];
}

// Plan interface
export interface ExecutionPlan {
    steps: ExecutionStep[];
    metadata: {
        estimated_duration: number;
        success_criteria: string[];
        allows_modifications: boolean;
        modification_triggers?: {
            condition: string;
            suggested_steps: string[];
        }[];
    }
}
// RAG interfaces
export interface RagQuery {
    query: string;
    focus_areas: string[];      // Max 3
    must_include: string[];     // Min 1
    must_avoid: string[];
}

export interface RagResult {
    content: string;
    metadata: {
        retrieved_at: number;
        relevance_score: number;  // 0-5
    }
}

// Assessment interface
export interface Opportunity {
    topic: string;
    value: number;    // 0-5
    reason: string;
}

export interface AssessmentResult {
    opportunities: Opportunity[];  // Min 1
    key_points: string[];         // Min 1
    voice_elements: string[];     // Min 1
    avoid_list: string[];        // words/phrases to avoid
}

// Generation interface
export interface GenerationResult {
    tweet: string;           // Max 280 chars
    rationale: string;
    metrics_used: string[];  // Min 1
}

// Validation interface
export interface ValidationResult {
    scores: {
        voice_match: number;      // 0-5
        factual_accuracy: number; // 0-5
    };
    issues: string[];
    approved: boolean;
}

// Step result interface
export interface StepResult {
    stepId: string;
    type: StepType;
    output: AssessmentResult | GenerationResult | ValidationResult;
    metadata: {
        started_at: number;
        completed_at: number;
        validation: Validation;
        rag_results?: RagResult[];
        requires_plan_modification?: boolean;
        suggested_changes?: PlanModification;
    }
}

// Process interface
export interface TweetGenerationProcess {
    plan: ExecutionPlan;
    steps: StepResult[];
    final_output: {
        tweet: string;
        validation: ValidationResult;
        supporting_data: {
            metrics_used: string[];
            key_points: string[];
            rag_results?: RagResult[];
            assessments?: AssessmentResult[];
        }
    };
    metadata: {
        started_at: number;
        completed_at: number;
        steps_executed: number;
        overall_confidence: number;
        modifications?: PlanModification[];
        errors?: Error[];
    }
}

// Error types
export class ValidationError extends Error {
    constructor(
        message: string,
        public validation: Validation,
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
        public retry_attempted: boolean
    ) {
        super(message);
        this.name = 'ExecutionError';
    }
}