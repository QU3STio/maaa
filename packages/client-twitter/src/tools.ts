// tools.ts
import { Tool } from '@anthropic-ai/sdk';

export const tweetGenerationTool: Tool = {
    name: "generate_tweet",
    description: "Generates and analyzes tweets with comprehensive validation",
    input_schema: {
        type: "object",
        required: [
            "historical_analysis",
            "character_elements",
            "post_pattern_analysis",
            "topic_selection",
            "strategy_selection",
            "timing_optimization",
            "community_analysis",
            "metric_presentation",
            "meme_elements",
            "response_bait",
            "content_generation",
            "selected_tweet",
            "topic_rotation",
            "prediction_tracking",
            "content_validation",
            "final_validation",
            "optimization_results",
            "selection_rationale"
        ],
        properties: {
            historical_analysis: {
                type: "object",
                required: ["performance_patterns", "success_metrics", "failure_patterns"],
                properties: {
                    performance_patterns: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                pattern: { type: "string" },
                                engagement_score: { type: "number", minimum: 1, maximum: 10 },
                                frequency: { type: "number" }
                            }
                        }
                    },
                    success_metrics: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                metric_type: { type: "string" },
                                effectiveness: { type: "number", minimum: 1, maximum: 10 }
                            }
                        }
                    },
                    failure_patterns: { type: "array", items: { type: "string" } }
                }
            },
            character_elements: {
                type: "object",
                properties: {
                    voice_patterns: { type: "array", items: { type: "string" } },
                    recurring_memes: { type: "array", items: { type: "string" } },
                    relationships: {
                        type: "object",
                        properties: {
                            allies: { type: "array", items: { type: "string" } },
                            competitors: { type: "array", items: { type: "string" } },
                            mentioned_entities: { type: "array", items: { type: "string" } }
                        }
                    }
                }
            },
            post_pattern_analysis: {
                type: "object",
                properties: {
                    avoided_patterns: { type: "array", items: { type: "string" } },
                    signature_phrases: { type: "array", items: { type: "string" } },
                    successful_formats: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                pattern: { type: "string" },
                                engagement_score: { type: "number", minimum: 1, maximum: 10 },
                                frequency: { type: "number" }
                            }
                        }
                    }
                }
            },
            topic_selection: {
                type: "object",
                required: ["available_topics", "chosen_topic", "available_metrics", "coverage_analysis", "selection_rationale"],
                properties: {
                    available_topics: { type: "array", items: { type: "string" } },
                    chosen_topic: { type: "string" },
                    available_metrics: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                metric: { type: "string" },
                                timestamp: { type: "string" },
                                impact_score: { type: "number", minimum: 1, maximum: 10 }
                            }
                        }
                    },
                    coverage_analysis: {
                        type: "object",
                        properties: {
                            recent_coverage: { type: "array", items: { type: "string" } },
                            gap_opportunities: { type: "array", items: { type: "string" } }
                        }
                    },
                    selection_rationale: { type: "string" }
                }
            },
            strategy_selection: {
                type: "object",
                required: ["available_strategies", "chosen_strategy", "available_adjectives", "chosen_adjective", "effectiveness_analysis"],
                properties: {
                    available_strategies: { type: "array", items: { type: "string" } },
                    chosen_strategy: { type: "string" },
                    available_adjectives: { type: "array", items: { type: "string" } },
                    chosen_adjective: { type: "string" },
                    effectiveness_analysis: {
                        type: "object",
                        properties: {
                            metric_impact: { type: "number", minimum: 1, maximum: 10 },
                            engagement_potential: { type: "number", minimum: 1, maximum: 10 },
                            virality_score: { type: "number", minimum: 1, maximum: 10 }
                        }
                    }
                }
            },
            timing_optimization: {
                type: "object",
                properties: {
                    best_times: { type: "array", items: { type: "string" } },
                    frequency_patterns: { type: "array", items: { type: "string" } },
                    topic_cycles: { type: "array", items: { type: "string" } },
                    metric_freshness: { type: "number", minimum: 1, maximum: 10 }
                }
            },
            community_analysis: {
                type: "object",
                properties: {
                    trigger_words: { type: "array", items: { type: "string" } },
                    reaction_patterns: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                trigger: { type: "string" },
                                response_type: { type: "string" },
                                effectiveness: { type: "number", minimum: 1, maximum: 10 }
                            }
                        }
                    }
                }
            },
            metric_presentation: {
                type: "object",
                properties: {
                    raw_number: { type: "string" },
                    percentage_change: { type: "string" },
                    comparative_context: { type: "string" },
                    impact_score: { type: "number", minimum: 1, maximum: 10 }
                }
            },
            meme_elements: {
                type: "object",
                properties: {
                    current_memes: { type: "array", items: { type: "string" } },
                    character_specific_memes: { type: "array", items: { type: "string" } },
                    meme_effectiveness: { type: "number", minimum: 1, maximum: 10 }
                }
            },
            response_bait: {
                type: "object",
                properties: {
                    controversy_level: { type: "number", minimum: 1, maximum: 10 },
                    debate_potential: { type: "number", minimum: 1, maximum: 10 },
                    community_triggers: { type: "array", items: { type: "string" } }
                }
            },
            content_generation: {
                type: "object",
                required: ["hooks", "value_statements", "generated_tweets"],
                properties: {
                    hooks: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                content: { type: "string" },
                                type: { type: "string" },
                                impact_score: { type: "number", minimum: 1, maximum: 10 }
                            }
                        }
                    },
                    value_statements: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                content: { type: "string" },
                                type: { type: "string" },
                                impact_score: { type: "number", minimum: 1, maximum: 10 }
                            }
                        }
                    },
                    generated_tweets: {
                        type: "array",
                        minItems: 3,
                        maxItems: 5,
                        items: {
                            type: "object",
                            required: ["content", "validation", "impact_metrics"],
                            properties: {
                                content: {
                                    type: "object",
                                    required: ["hook", "value_statement", "full_tweet"],
                                    properties: {
                                        hook: { type: "string" },
                                        value_statement: { type: "string" },
                                        full_tweet: { type: "string" }
                                    }
                                },
                                validation: {
                                    type: "object",
                                    properties: {
                                        metrics_valid: { type: "boolean" },
                                        temporal_accuracy: { type: "boolean" },
                                        unique_content: { type: "boolean" },
                                        character_voice: { type: "boolean" },
                                        style_rules: { type: "boolean" },
                                        length_valid: { type: "boolean" }
                                    }
                                },
                                impact_metrics: {
                                    type: "object",
                                    properties: {
                                        engagement_score: { type: "number", minimum: 1, maximum: 10 },
                                        virality_potential: { type: "number", minimum: 1, maximum: 10 },
                                        community_impact: { type: "number", minimum: 1, maximum: 10 },
                                        meme_potential: { type: "number", minimum: 1, maximum: 10 }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            selected_tweet: {
                type: "object",
                required: ["content", "validation", "impact_metrics"],
                properties: {
                    content: {
                        type: "object",
                        required: ["hook", "value_statement", "full_tweet"],
                        properties: {
                            hook: { type: "string" },
                            value_statement: { type: "string" },
                            full_tweet: { type: "string" }
                        }
                    },
                    validation: {
                        type: "object",
                        properties: {
                            metrics_valid: { type: "boolean" },
                            temporal_accuracy: { type: "boolean" },
                            unique_content: { type: "boolean" },
                            character_voice: { type: "boolean" },
                            style_rules: { type: "boolean" },
                            length_valid: { type: "boolean" }
                        }
                    },
                    impact_metrics: {
                        type: "object",
                        properties: {
                            engagement_score: { type: "number", minimum: 1, maximum: 10 },
                            virality_potential: { type: "number", minimum: 1, maximum: 10 },
                            community_impact: { type: "number", minimum: 1, maximum: 10 },
                            meme_potential: { type: "number", minimum: 1, maximum: 10 }
                        }
                    }
                }
            },
            topic_rotation: {
                type: "object",
                properties: {
                    recent_topics: { type: "array", items: { type: "string" } },
                    optimal_spacing: { type: "number" },
                    freshness_score: { type: "number", minimum: 1, maximum: 10 }
                }
            },
            prediction_tracking: {
                type: "object",
                properties: {
                    prediction_types: { type: "array", items: { type: "string" } },
                    timeframes: { type: "array", items: { type: "string" } },
                    confidence_levels: { type: "array", items: { type: "number", minimum: 1, maximum: 10 } }
                }
            },
            content_validation: {
                type: "object",
                properties: {
                    length_check: {
                        type: "object",
                        properties: {
                            character_count: { type: "number" },
                            word_count: { type: "number" },
                            segments: { type: "number", maximum: 2 },
                            is_concise: { type: "boolean" },
                            matches_examples: { type: "boolean" }
                        }
                    },
                    structure_check: {
                        type: "object",
                        properties: {
                            single_point: { type: "boolean" },
                            simple_punctuation: { type: "boolean" },
                            clear_message: { type: "boolean" }
                        }
                    },
                    metrics_check: {
                        type: "object",
                        properties: {
                            used_metrics: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        metric: { type: "string" },
                                        source: { type: "string" },
                                        timestamp: { type: "string" },
                                        context: { type: "string" },
                                        is_valid: { type: "boolean" }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            final_validation: {
                type: "object",
                required: ["validation_checks", "verification_status"],
                properties: {
                    validation_checks: {
                        type: "object",
                        properties: {
                            metrics_validated: { type: "boolean" },
                            temporal_accuracy: { type: "boolean" },
                            uniqueness_confirmed: { type: "boolean" },
                            voice_consistency: { type: "boolean" },
                            strategy_execution: { type: "boolean" }
                        }
                    },
                    verification_status: {
                        type: "object",
                        properties: {
                            is_verified: { type: "boolean" },
                            failure_notes: { type: "string" }
                        }
                    }
                }
            },
            optimization_results: {
                type: "object",
                required: ["improvements", "final_version"],
                properties: {
                    improvements: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                aspect: { type: "string" },
                                change: { type: "string" },
                                impact: { type: "number", minimum: 1, maximum: 10 }
                            }
                        }
                    },
                    final_version: {
                        type: "object",
                        required: ["tweet", "impact_delta"],
                        properties: {
                            tweet: { type: "string" },
                            impact_delta: { type: "number" }
                        }
                    }
                }
            },
            selection_rationale: { type: "string" }
        }
    }
};