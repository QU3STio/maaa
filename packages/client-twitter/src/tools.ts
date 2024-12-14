// tools.ts
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

// Simplified core validation schema
const validationSchema = {
    type: "object",
    required: ["voice_match", "factual_accuracy", "risks"],
    properties: {
        voice_match: { 
            type: "number",
            minimum: 0,
            maximum: 5
        },
        factual_accuracy: { 
            type: "number",
            minimum: 0,
            maximum: 5
        },
        risks: {
            type: "array",
            items: { type: "string" },
            minItems: 1
        }
    }
};

// Planning tool for overall tweet strategy
export const planningTool: Tool = {
    name: "plan_execution",
    description: "Plans tweet generation steps",
    input_schema: {
        type: "object",
        required: ["steps", "metadata"],
        properties: {
            steps: {
                type: "array",
                items: {
                    type: "object",
                    required: ["id", "type", "template", "requires_rag", "dependencies", "validation"],
                    properties: {
                        id: { type: "string" },
                        type: { 
                            type: "string",
                            enum: ["assessment", "generation", "validation"]  // Enforce valid step types
                        },
                        template: { type: "string" },
                        requires_rag: { type: "boolean" },
                        dependencies: {
                            type: "array",
                            items: { type: "string" }
                        },
                        validation: {
                            type: "object",
                            required: ["voice_match", "factual_accuracy", "risks"],
                            properties: {
                                voice_match: { 
                                    type: "number",
                                    minimum: 0,
                                    maximum: 5
                                },
                                factual_accuracy: { 
                                    type: "number",
                                    minimum: 0,
                                    maximum: 5
                                },
                                risks: {
                                    type: "array",
                                    items: { type: "string" },
                                    minItems: 1
                                }
                            }
                        },
                        can_trigger_changes: { type: "boolean" },
                        modification_conditions: {
                            type: "array",
                            items: { type: "string" }
                        }
                    }
                }
            },
            metadata: {
                type: "object",
                required: ["estimated_duration", "success_criteria", "allows_modifications"],
                properties: {
                    estimated_duration: { type: "number" },
                    success_criteria: {
                        type: "array",
                        items: { type: "string" }
                    },
                    allows_modifications: { type: "boolean" }
                }
            }
        }
    }
};

// RAG tool for knowledge retrieval
export const ragTool: Tool = {
    name: "generate_rag_query",
    description: "Generates knowledge query",
    input_schema: {
        type: "object",
        required: ["query", "focus_areas", "must_include", "must_avoid"],
        properties: {
            query: { type: "string" },
            focus_areas: {
                type: "array",
                items: { type: "string" },
                maxItems: 3
            },
            must_include: {
                type: "array",
                items: { type: "string" },
                minItems: 1
            },
            must_avoid: {
                type: "array",
                items: { type: "string" }
            }
        }
    }
};

// Assessment tool for context analysis
export const assessmentTool: Tool = {
    name: "assess_context",
    description: "Analyzes context for tweet opportunities",
    input_schema: {
        type: "object",
        required: ["opportunities", "key_points", "voice_elements"],
        properties: {
            opportunities: {
                type: "array",
                items: {
                    type: "object",
                    required: ["topic", "value", "reason"],
                    properties: {
                        topic: { type: "string" },
                        value: { 
                            type: "number",
                            minimum: 0,
                            maximum: 5
                        },
                        reason: { type: "string" }
                    }
                },
                minItems: 1
            },
            key_points: {
                type: "array",
                items: { type: "string" },
                minItems: 1
            },
            voice_elements: {
                type: "array",
                items: { type: "string" },
                minItems: 1
            }
        }
    }
};

// Generation tool for tweet creation
export const generationTool: Tool = {
    name: "generate_tweet",
    description: "Creates tweet content",
    input_schema: {
        type: "object",
        required: ["tweet", "rationale", "metrics_used"],
        properties: {
            tweet: { 
                type: "string",
                maxLength: 280
            },
            rationale: { type: "string" },
            metrics_used: {
                type: "array",
                items: { type: "string" },
                minItems: 1
            }
        }
    }
};

// Validation tool for quality checks
export const validationTool: Tool = {
    name: "validate_tweet",
    description: "Validates tweet quality",
    input_schema: {
        type: "object",
        required: ["scores", "issues", "approved"],
        properties: {
            scores: {
                type: "object",
                required: ["voice_match", "factual_accuracy"],
                properties: {
                    voice_match: { 
                        type: "number",
                        minimum: 0,
                        maximum: 5
                    },
                    factual_accuracy: { 
                        type: "number",
                        minimum: 0,
                        maximum: 5
                    }
                }
            },
            issues: {
                type: "array",
                items: { type: "string" }
            },
            approved: { type: "boolean" }
        }
    }
};

export const tools = {
    planning: planningTool,
    rag: ragTool,
    assessment: assessmentTool,
    generation: generationTool,
    validation: validationTool
} as const;

export type ToolType = keyof typeof tools;