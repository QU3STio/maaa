// types.ts
export interface TweetGenerationResponse {
    // Historical Analysis
    historical_analysis: {
        performance_patterns: Array<{
            pattern: string;
            engagement_score: number;
            frequency: number;
        }>;
        success_metrics: Array<{
            metric_type: string;
            effectiveness: number;
        }>;
        failure_patterns: string[];
    };

    // Character and Voice Elements
    character_elements: {
        voice_patterns: string[];
        recurring_memes: string[];
        relationships: {
            allies: string[];
            competitors: string[];
            mentioned_entities: string[];
        };
    };

    post_pattern_analysis: {
        avoided_patterns: string[];
        signature_phrases: string[];
        successful_formats: Array<{
            pattern: string;
            engagement_score: number;
            frequency: number;
        }>;
    };

    // Topic and Strategy Selection
    topic_selection: {
        available_topics: string[];
        chosen_topic: string;
        available_metrics: Array<{
            metric: string;
            timestamp: string;
            impact_score: number;
        }>;
        coverage_analysis: {
            recent_coverage: string[];
            gap_opportunities: string[];
        };
        selection_rationale: string;
    };

    strategy_selection: {
        available_strategies: string[];
        chosen_strategy: string;
        available_adjectives: string[];
        chosen_adjective: string;
        effectiveness_analysis: {
            metric_impact: number;
            engagement_potential: number;
            virality_score: number;
        };
    };

    // Timing and Community
    timing_optimization: {
        best_times: string[];
        frequency_patterns: string[];
        topic_cycles: string[];
        metric_freshness: number;
    };

    community_analysis: {
        trigger_words: string[];
        reaction_patterns: Array<{
            trigger: string;
            response_type: string;
            effectiveness: number;
        }>;
    };

    // Content Elements
    metric_presentation: {
        raw_number: string;
        percentage_change: string;
        comparative_context: string;
        impact_score: number;
    };

    meme_elements: {
        current_memes: string[];
        character_specific_memes: string[];
        meme_effectiveness: number;
    };

    response_bait: {
        controversy_level: number;
        debate_potential: number;
        community_triggers: string[];
    };

    // Content Generation and Validation
    content_generation: {
        hooks: Array<{
            content: string;
            type: string;
            impact_score: number;
        }>;
        value_statements: Array<{
            content: string;
            type: string;
            impact_score: number;
        }>;
        generated_tweets: Array<{
            content: {
                hook: string;
                value_statement: string;
                full_tweet: string;
            };
            validation: {
                metrics_valid: boolean;
                temporal_accuracy: boolean;
                unique_content: boolean;
                character_voice: boolean;
                style_rules: boolean;
                length_valid: boolean;
            };
            impact_metrics: {
                engagement_score: number;
                virality_potential: number;
                community_impact: number;
                meme_potential: number;
            };
        }>;
    };

    // Evaluation and Selection
    selected_tweet: {
        content: {
            hook: string;
            value_statement: string;
            full_tweet: string;
        };
        validation: {
            metrics_valid: boolean;
            temporal_accuracy: boolean;
            unique_content: boolean;
            character_voice: boolean;
            style_rules: boolean;
            length_valid: boolean;
        };
        impact_metrics: {
            engagement_score: number;
            virality_potential: number;
            community_impact: number;
            meme_potential: number;
        };
    };

    // Tracking and Validation
    topic_rotation: {
        recent_topics: string[];
        optimal_spacing: number;
        freshness_score: number;
    };

    prediction_tracking: {
        prediction_types: string[];
        timeframes: string[];
        confidence_levels: number[];
    };

    content_validation: {
        length_check: {
            character_count: number;
            word_count: number;
            segments: number;
            is_concise: boolean;
            matches_examples: boolean;
        };
        structure_check: {
            single_point: boolean;
            simple_punctuation: boolean;
            clear_message: boolean;
        };
        metrics_check: {
            used_metrics: Array<{
                metric: string;
                source: string;
                timestamp: string;
                context: string;
                is_valid: boolean;
            }>;
        };
    };

    final_validation: {
        validation_checks: {
            metrics_validated: boolean;
            temporal_accuracy: boolean;
            uniqueness_confirmed: boolean;
            voice_consistency: boolean;
            strategy_execution: boolean;
        };
        verification_status: {
            is_verified: boolean;
            failure_notes: string;
        };
    };

    // Optimization
    optimization_results: {
        improvements: Array<{
            aspect: string;
            change: string;
            impact: number;
        }>;
        final_version: {
            tweet: string;
            impact_delta: number;
        };
    };

    selection_rationale: string;
}