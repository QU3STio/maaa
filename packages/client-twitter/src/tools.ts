// tools.ts

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

const baseValidationSchema = {
    type: "object",
    required: ["technical_checks", "character_alignment", "value_assessment", "risk_evaluation"],
    properties: {
        technical_checks: {
            type: "object",
            additionalProperties: { type: "boolean" }
        },
        character_alignment: {
            type: "object",
            required: ["voice_score", "expertise_score", "authenticity_score"],
            properties: {
                voice_score: { type: "number" },
                expertise_score: { type: "number" },
                authenticity_score: { type: "number" }
            }
        },
        value_assessment: {
            type: "object",
            required: ["information_value", "community_value", "strategic_value"],
            properties: {
                information_value: { type: "number" },
                community_value: { type: "number" },
                strategic_value: { type: "number" }
            }
        },
        risk_evaluation: {
            type: "object",
            required: ["identified_risks", "mitigation_suggestions"],
            properties: {
                identified_risks: {
                    type: "array",
                    items: { type: "string" }
                },
                mitigation_suggestions: {
                    type: "array",
                    items: { type: "string" }
                }
            }
        }
    }
};

const errorHandlingSchema = {
    type: "object",
    required: ["retry_strategy", "fallback_options", "recovery_steps"],
    properties: {
        retry_strategy: {
            type: "object",
            required: ["max_attempts", "conditions"],
            properties: {
                max_attempts: { type: "number" },
                conditions: {
                    type: "array",
                    items: { type: "string" }
                }
            }
        },
        fallback_options: {
            type: "array",
            items: { type: "string" }
        },
        recovery_steps: {
            type: "array",
            items: { type: "string" }
        }
    }
};

export const planningTool: Tool = {
    name: "plan_execution",
    description: "Plans the tweet generation execution steps",
    input_schema: {
        type: "object",
        required: ["steps", "validation", "error_handling", "metadata"],
        properties: {
            steps: {
                type: "array",
                items: {
                    type: "object",
                    required: ["id", "type", "template", "requires_rag", "dependencies", "validation", "error_handling", "metadata"],
                    properties: {
                        id: { type: "string" },
                        type: { 
                            type: "string",
                            enum: ["planning", "rag", "assessment", "strategy", "generation", "validation"]
                        },
                        template: { type: "string" },
                        requires_rag: { type: "boolean" },
                        dependencies: {
                            type: "array",
                            items: { type: "string" }
                        },
                        validation: baseValidationSchema,
                        error_handling: errorHandlingSchema,
                        metadata: {
                            type: "object",
                            required: ["success_criteria"],
                            properties: {
                                estimated_duration: { type: "number" },
                                required_context: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                success_criteria: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    }
                }
            },
            validation: baseValidationSchema,
            error_handling: errorHandlingSchema,
            metadata: {
                type: "object",
                required: ["estimated_duration", "required_context", "success_criteria"],
                properties: {
                    estimated_duration: { type: "number" },
                    required_context: {
                        type: "array",
                        items: { type: "string" }
                    },
                    success_criteria: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        }
    }
};

export const ragTool: Tool = {
    name: "generate_rag_query",
    description: "Generates a knowledge retrieval query",
    input_schema: {
        type: "object",
        required: ["query", "focus_areas", "expected_use", "relevance_criteria", "validation"],
        properties: {
            query: { type: "string" },
            focus_areas: {
                type: "array",
                items: { type: "string" }
            },
            expected_use: { type: "string" },
            relevance_criteria: {
                type: "object",
                required: ["mustHave", "niceToHave", "avoid"],
                properties: {
                    mustHave: {
                        type: "array",
                        items: { type: "string" }
                    },
                    niceToHave: {
                        type: "array",
                        items: { type: "string" }
                    },
                    avoid: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            },
            validation: {
                type: "object",
                required: ["completeness_checks", "accuracy_requirements", "relevance_metrics"],
                properties: {
                    completeness_checks: {
                        type: "array",
                        items: { type: "string" }
                    },
                    accuracy_requirements: {
                        type: "array",
                        items: { type: "string" }
                    },
                    relevance_metrics: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        }
    }
};

export const assessmentTool: Tool = {
    name: "initial_assessment",
    description: "Performs initial context and opportunity assessment",
    input_schema: {
        type: "object",
        required: ["opportunities", "knowledge_needs", "character_alignment"],
        properties: {
            opportunities: {
                type: "object",
                required: ["identified", "prioritization"],
                properties: {
                    identified: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["type", "description", "value", "feasibility"],
                            properties: {
                                type: { type: "string" },
                                description: { type: "string" },
                                value: { type: "number" },
                                feasibility: { type: "number" }
                            }
                        }
                    },
                    prioritization: {
                        type: "object",
                        required: ["criteria", "rankings"],
                        properties: {
                            criteria: {
                                type: "array",
                                items: { type: "string" }
                            },
                            rankings: {
                                type: "object",
                                additionalProperties: { type: "number" }
                            }
                        }
                    }
                }
            },
            knowledge_needs: {
                type: "object",
                required: ["gaps", "verification_needs", "context_requirements"],
                properties: {
                    gaps: {
                        type: "array",
                        items: { type: "string" }
                    },
                    verification_needs: {
                        type: "array",
                        items: { type: "string" }
                    },
                    context_requirements: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            },
            character_alignment: {
                type: "object",
                required: ["natural_angles", "voice_considerations", "expertise_utilization"],
                properties: {
                    natural_angles: {
                        type: "array",
                        items: { type: "string" }
                    },
                    voice_considerations: {
                        type: "array",
                        items: { type: "string" }
                    },
                    expertise_utilization: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        }
    }
};

export const strategyTool: Tool = {
    name: "develop_strategy",
    description: "Develops content strategy based on assessment and knowledge",
    input_schema: {
        type: "object",
        required: ["selected_strategy", "voice_plan", "validation_criteria"],
        properties: {
            selected_strategy: {
                type: "object",
                required: ["angle", "rationale", "key_points", "structure"],
                properties: {
                    angle: { type: "string" },
                    rationale: { type: "string" },
                    key_points: {
                        type: "array",
                        items: { type: "string" }
                    },
                    structure: {
                        type: "object",
                        required: ["opening", "development", "conclusion"],
                        properties: {
                            opening: { type: "string" },
                            development: { type: "string" },
                            conclusion: { type: "string" }
                        }
                    }
                }
            },
            voice_plan: {
                type: "object",
                required: ["traits_to_emphasize", "expertise_integration", "tone_guidance"],
                properties: {
                    traits_to_emphasize: {
                        type: "array",
                        items: { type: "string" }
                    },
                    expertise_integration: { type: "string" },
                    tone_guidance: { type: "string" }
                }
            },
            validation_criteria: {
                type: "object",
                required: ["authenticity_checks", "impact_measures", "uniqueness_validators"],
                properties: {
                    authenticity_checks: {
                        type: "array",
                        items: { type: "string" }
                    },
                    impact_measures: {
                        type: "array",
                        items: { type: "string" }
                    },
                    uniqueness_validators: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        }
    }
};

export const contentGenerationTool: Tool = {
    name: "generate_content",
    description: "Generates tweet variations based on strategy",
    input_schema: {
        type: "object",
        required: ["variations", "evaluations", "recommendation"],
        properties: {
            variations: {
                type: "array",
                items: {
                    type: "object",
                    required: ["content", "rationale", "strengths", "risks"],
                    properties: {
                        content: { type: "string" },
                        rationale: { type: "string" },
                        strengths: {
                            type: "array",
                            items: { type: "string" }
                        },
                        risks: {
                            type: "array",
                            items: { type: "string" }
                        }
                    }
                }
            },
            evaluations: {
                type: "object",
                required: ["authenticity_scores", "impact_predictions", "risk_assessments"],
                properties: {
                    authenticity_scores: {
                        type: "object",
                        additionalProperties: { type: "number" }
                    },
                    impact_predictions: {
                        type: "object",
                        additionalProperties: { type: "number" }
                    },
                    risk_assessments: {
                        type: "object",
                        additionalProperties: {
                            type: "array",
                            items: { type: "string" }
                        }
                    }
                }
            },
            recommendation: {
                type: "object",
                required: ["selected_version", "justification", "confidence_score"],
                properties: {
                    selected_version: { type: "string" },
                    justification: { type: "string" },
                    confidence_score: { type: "number" }
                }
            }
        }
    }
};

export const validationTool: Tool = {
    name: "validate_content",
    description: "Performs final validation of the generated content",
    input_schema: {
        type: "object",
        required: ["validation_results", "final_recommendation"],
        properties: {
            validation_results: baseValidationSchema,
            final_recommendation: {
                type: "object",
                required: ["approve", "changes_needed", "confidence_score"],
                properties: {
                    approve: { type: "boolean" },
                    changes_needed: {
                        type: "array",
                        items: { type: "string" }
                    },
                    confidence_score: { type: "number" }
                }
            }
        }
    }
};

export const tools = {
    planning: planningTool,
    rag: ragTool,
    assessment: assessmentTool,
    strategy: strategyTool,
    generation: contentGenerationTool,
    validation: validationTool
} as const;

export type ToolType = keyof typeof tools;