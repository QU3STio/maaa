import type { Tool } from '@anthropic-ai/sdk/resources/messages';


export const tweetGenerationTool: Tool = {
    name: "generate_tweet",
    description: "Generates diverse and impactful tweets through structured analysis and chain-of-thought reasoning",
    input_schema: {
        type: "object",
        required: [
            "knowledge",
            "currentState",
            "characterElements",
            "previousContext",
            "topicContext",
            "situationAnalysis",
            "contentStrategy",
            "tweetDevelopment",
            "finalSelection"
        ],
        properties: {
            // Knowledge Base section
            knowledge: {
                type: "object",
                required: ["facts", "expertise", "historicalContext"],
                properties: {
                    facts: { type: "array", items: { type: "string" } },
                    expertise: { type: "array", items: { type: "string" } },
                    historicalContext: { type: "array", items: { type: "string" } }
                }
            },
            
            // Current State section
            currentState: {
                type: "object",
                required: ["metrics", "developments"],
                properties: {
                    metrics: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["value", "timestamp", "context"],
                            properties: {
                                value: { type: "string" },
                                timestamp: { type: "string" },
                                context: { type: "string" }
                            }
                        }
                    },
                    developments: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["event", "timestamp", "significance"],
                            properties: {
                                event: { type: "string" },
                                timestamp: { type: "string" },
                                significance: { type: "string" }
                            }
                        }
                    }
                }
            },
            
            // Character Elements section
            characterElements: {
                type: "object",
                required: ["background", "lore", "adjectives", "postDirections", "examplePosts"],
                properties: {
                    background: { type: "string" },
                    lore: { type: "array", items: { type: "string" } },
                    adjectives: { type: "array", items: { type: "string" } },
                    postDirections: { type: "array", items: { type: "string" } },
                    examplePosts: { type: "array", items: { type: "string" } }
                }
            },
            
            // Previous Context section
            previousContext: {
                type: "object",
                required: ["recentTweets", "patterns", "categories"],
                properties: {
                    recentTweets: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["content", "timestamp", "pattern", "category", "strategy"],
                            properties: {
                                content: { type: "string" },
                                timestamp: { type: "string" },
                                pattern: { type: "string" },
                                category: { 
                                    type: "string",
                                    enum: ["culture", "narrative", "technical", "commentary", "hybrid"]
                                },
                                strategy: { type: "string" },
                                keyPhrases: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    patterns: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["type", "frequency", "lastUsed"],
                            properties: {
                                type: { type: "string" },
                                frequency: { type: "number" },
                                lastUsed: { type: "string" },
                                recentPhrases: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    categories: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["type", "frequency", "lastUsed"],
                            properties: {
                                type: { 
                                    type: "string",
                                    enum: ["culture", "narrative", "technical", "commentary", "hybrid"]
                                },
                                frequency: { type: "number" },
                                lastUsed: { type: "string" }
                            }
                        }
                    }
                }
            },

            // Topic Context section
            topicContext: {
                type: "object",
                required: ["selectedTopic", "categoryAlignment"],
                properties: {
                    selectedTopic: {
                        type: "object",
                        required: ["topic", "angle", "supportingData"],
                        properties: {
                            topic: { type: "string" },
                            angle: { type: "string" },
                            supportingData: {
                                type: "object",
                                required: ["metrics", "narrative", "reasoning"],
                                properties: {
                                    metrics: { type: "array", items: { type: "string" } },
                                    narrative: { type: "string" },
                                    reasoning: { type: "string" }
                                }
                            }
                        }
                    },
                    categoryAlignment: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["category", "strength"],
                            properties: {
                                category: {
                                    type: "string",
                                    enum: ["culture", "narrative", "technical", "commentary", "hybrid"]
                                },
                                strength: { type: "number" }
                            }
                        }
                    }
                }
            },

            // Situation Analysis section
            situationAnalysis: {
                type: "object",
                required: ["patternAnalysis", "opportunities", "categoryAnalysis"],
                properties: {
                    patternAnalysis: {
                        type: "object",
                        required: ["recentDistribution", "unusedPatterns", "recentPhrases", "recentStructures"],
                        properties: {
                            recentDistribution: { type: "object", additionalProperties: { type: "number" } },
                            unusedPatterns: { type: "array", items: { type: "string" } },
                            recentPhrases: { type: "array", items: { type: "string" } },
                            recentStructures: { type: "array", items: { type: "string" } }
                        }
                    },
                    opportunities: {
                        type: "array",
                        items: {
                            type: "object",
                            required: [
                                "description",
                                "timelineFreshness",
                                "metricStrength",
                                "topicRelevance",
                                "knowledgeSupport",
                                "priority",
                                "reasoning",
                                "patternFreshness",
                                "suggestedCategories"
                            ],
                            properties: {
                                description: { type: "string" },
                                timelineFreshness: { type: "number" },
                                metricStrength: { type: "number" },
                                topicRelevance: { type: "number" },
                                knowledgeSupport: { type: "number" },
                                priority: { type: "number" },
                                reasoning: { type: "string" },
                                patternFreshness: { type: "number" },
                                suggestedCategories: {
                                    type: "array",
                                    items: {
                                        type: "string",
                                        enum: ["culture", "narrative", "technical", "commentary", "hybrid"]
                                    }
                                }
                            }
                        }
                    },
                    categoryAnalysis: {
                        type: "object",
                        required: ["distribution", "recommendation"],
                        properties: {
                            distribution: { 
                                type: "object",
                                additionalProperties: { type: "number" }
                            },
                            recommendation: {
                                type: "object",
                                required: ["preferredCategory", "reasoning"],
                                properties: {
                                    preferredCategory: { 
                                        type: "string",
                                        enum: ["culture", "narrative", "technical", "commentary", "hybrid"]
                                    },
                                    reasoning: { type: "string" }
                                }
                            }
                        }
                    }
                }
            },

            // Content Strategy section
            contentStrategy: {
                type: "object",
                required: [
                    "selectedOpportunity",
                    "chosenStrategy",
                    "patternChoice",
                    "requiredSources",
                    "situationConnection",
                    "diversityApproach"
                ],
                properties: {
                    selectedOpportunity: {
                        type: "object",
                        required: ["description", "reasoning", "category"],
                        properties: {
                            description: { type: "string" },
                            reasoning: { type: "string" },
                            category: {
                                type: "string",
                                enum: ["culture", "narrative", "technical", "commentary", "hybrid"]
                            }
                        }
                    },
                    chosenStrategy: {
                        type: "object",
                        required: ["type", "distributionContext"],
                        properties: {
                            type: { type: "string" },
                            distributionContext: { type: "string" }
                        }
                    },
                    patternChoice: {
                        type: "object",
                        required: ["type", "fitExplanation", "categoryAlignment"],
                        properties: {
                            type: { type: "string" },
                            fitExplanation: { type: "string" },
                            categoryAlignment: { type: "string" }
                        }
                    },
                    requiredSources: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["source", "intent"],
                            properties: {
                                source: { type: "string" },
                                intent: { type: "string" }
                            }
                        }
                    },
                    situationConnection: { type: "string" },
                    diversityApproach: {
                        type: "object",
                        required: ["plannedStructures", "avoidPhrases", "angleVariations", "categoryBalance"],
                        properties: {
                            plannedStructures: { type: "array", items: { type: "string" } },
                            avoidPhrases: { type: "array", items: { type: "string" } },
                            angleVariations: { type: "array", items: { type: "string" } },
                            categoryBalance: { type: "string" }
                        }
                    }
                }
            },

            // Tweet Development section
            tweetDevelopment: {
                type: "object",
                required: ["variations", "differentiation", "uniquenessVerification", "strategyConnection"],
                properties: {
                    variations: {
                        type: "array",
                        items: {
                            type: "object",
                            required: [
                                "content",
                                "pattern",
                                "category",
                                "strategy",
                                "angle",
                                "voiceMarkers",
                                "strategyImplementation",
                                "uniquenessMetrics"
                            ],
                            properties: {
                                content: { type: "string" },
                                pattern: { type: "string" },
                                category: {
                                    type: "string",
                                    enum: ["culture", "narrative", "technical", "commentary", "hybrid"]
                                },
                                strategy: { type: "string" },
                                angle: { type: "string" },
                                voiceMarkers: { type: "array", items: { type: "string" } },
                                strategyImplementation: { type: "string" },
                                uniquenessMetrics: {
                                    type: "object",
                                    required: [
                                        "patternFreshness",
                                        "phraseUniqueness",
                                        "structuralDiversity",
                                        "categoryFreshness",
                                        "overallDistinctiveness"
                                    ],
                                    properties: {
                                        patternFreshness: { type: "number" },
                                        phraseUniqueness: { type: "number" },
                                        structuralDiversity: { type: "number" },
                                        categoryFreshness: { type: "number" },
                                        overallDistinctiveness: { type: "number" }
                                    }
                                }
                            }
                        }
                    },
                    differentiation: {
                        type: "object",
                        required: ["angleUniqueness", "voiceConsistency", "strategyAlignment", "categoryDiversity"],
                        properties: {
                            angleUniqueness: { type: "string" },
                            voiceConsistency: { type: "string" },
                            strategyAlignment: { type: "string" },
                            categoryDiversity: { type: "string" }
                        }
                    },
                    uniquenessVerification: {
                        type: "object",
                        required: ["vsRecentPosts", "vsOtherVariations"],
                        properties: {
                            vsRecentPosts: { type: "string" },
                            vsOtherVariations: { type: "string" }
                        }
                    },
                    strategyConnection: { type: "string" }
                }
            },

            // Final Selection section
            finalSelection: {
                type: "object",
                required: ["content", "reasoningChain", "expectedImpact", "qualityChecks", "diversityMetrics"],
                properties: {
                    content: { type: "string" },
                    reasoningChain: { type: "array", items: { type: "string" } },
                    expectedImpact: { type: "string" },
                    qualityChecks: {
                        type: "object",
                        required: ["voice", "content", "technical", "uniqueness"],
                        properties: {
                            voice: {
                                type: "object",
                                required: ["authentic", "naturalLanguage", "toneMatch"],
                                properties: {
                                    authentic: { type: "boolean" },
                                    naturalLanguage: { type: "boolean" },
                                    toneMatch: { type: "boolean" }
                                }
                            },
                            content: {
                                type: "object",
                                required: ["perspective", "communityResonance", "categoryAlignment"],
                                properties: {
                                    perspective: { type: "boolean" },
                                    communityResonance: { type: "boolean" },
                                    categoryAlignment: { type: "boolean" }
                                }
                            },
                            technical: {
                                type: "object",
                                required: ["metricAccuracy", "temporalClarity", "sourceValidity"],
                                properties: {
                                    metricAccuracy: { type: "boolean" },
                                    temporalClarity: { type: "boolean" },
                                    sourceValidity: { type: "boolean" }
                                }
                            },
                            uniqueness: {
                                type: "object",
                                required: ["patternFresh", "phraseUnique", "structureDistinct", "categoryFresh", "score"],
                                properties: {
                                    patternFresh: { type: "boolean" },
                                    phraseUnique: { type: "boolean" },
                                    structureDistinct: { type: "boolean" },
                                    categoryFresh: { type: "boolean" },
                                    score: { type: "number" }
                                }
                            }
                        }
                    },
                    diversityMetrics: {
                        type: "object",
                        required: [
                            "patternNovelty",
                            "structuralUniqueness",
                            "phraseOriginality",
                            "categoryFreshness",
                            "overallFreshness"
                        ],
                        properties: {
                            patternNovelty: { type: "number" },
                            structuralUniqueness: { type: "number" },
                            phraseOriginality: { type: "number" },
                            categoryFreshness: { type: "number" },
                            overallFreshness: { type: "number" }
                        }
                    }
                }
            }
        }
    }
};


export const topicAssessmentTool: Tool = {
    name: "assess_topics",
    description: "Analyzes current context and recent activity to identify fresh discussion topics",
    input_schema: {
        type: "object",
        required: [
            "highPriorityTopics",
            "backupTopics",
            "analysis"
        ],
        properties: {
            highPriorityTopics: {
                type: "array",
                items: {
                    type: "object",
                    required: ["topic", "angle", "supportingMetrics", "reasoning", "freshness", "impact", "priority"],
                    properties: {
                        topic: { type: "string" },
                        angle: { type: "string" },
                        supportingMetrics: { 
                            type: "array",
                            items: { type: "string" }
                        },
                        reasoning: { type: "string" },
                        freshness: {
                            type: "object",
                            required: ["metricUniqueness", "topicNovelty", "angleOriginality", "overallFreshness"],
                            properties: {
                                metricUniqueness: { type: "number" },
                                topicNovelty: { type: "number" },
                                angleOriginality: { type: "number" },
                                overallFreshness: { type: "number" }
                            }
                        },
                        impact: { type: "number" },
                        priority: { type: "number" }
                    }
                }
            },
            backupTopics: {
                type: "array",
                items: {
                    type: "object",
                    required: ["topic", "type", "angle", "reasoning"],
                    properties: {
                        topic: { type: "string" },
                        type: { 
                            type: "string",
                            enum: ["character_moment", "observation", "prediction"]
                        },
                        angle: { type: "string" },
                        reasoning: { type: "string" },
                        lastUsed: { type: "string" }
                    }
                }
            },
            analysis: {
                type: "object",
                required: ["coverage", "freshness", "distribution"],
                properties: {
                    coverage: {
                        type: "object",
                        required: ["saturatedMetrics", "saturatedTopics", "recommendedRotation"],
                        properties: {
                            saturatedMetrics: {
                                type: "array",
                                items: {
                                    type: "object",
                                    required: ["value", "lastUsed", "useCount", "associatedThemes"],
                                    properties: {
                                        value: { type: "string" },
                                        lastUsed: { type: "string" },
                                        useCount: { type: "number" },
                                        associatedThemes: { 
                                            type: "array",
                                            items: { type: "string" }
                                        }
                                    }
                                }
                            },
                            saturatedTopics: {
                                type: "array",
                                items: {
                                    type: "object",
                                    required: ["project", "lastDiscussed", "frequency", "associatedMetrics"],
                                    properties: {
                                        project: { type: "string" },
                                        lastDiscussed: { type: "string" },
                                        frequency: { type: "number" },
                                        associatedMetrics: {
                                            type: "array",
                                            items: { type: "string" }
                                        }
                                    }
                                }
                            },
                            recommendedRotation: {
                                type: "object",
                                required: ["avoidMetrics", "avoidProjects", "suggestedThemes"],
                                properties: {
                                    avoidMetrics: {
                                        type: "array",
                                        items: { type: "string" }
                                    },
                                    avoidProjects: {
                                        type: "array",
                                        items: { type: "string" }
                                    },
                                    suggestedThemes: {
                                        type: "array",
                                        items: { type: "string" }
                                    }
                                }
                            }
                        }
                    },
                    freshness: {
                        type: "object",
                        required: ["overallAssessment", "rotationNeeded", "nextBestTiming"],
                        properties: {
                            overallAssessment: { type: "string" },
                            rotationNeeded: { type: "boolean" },
                            nextBestTiming: {
                                type: "object",
                                additionalProperties: { type: "string" }
                            }
                        }
                    },
                    distribution: {
                        type: "object",
                        required: ["recentPatterns", "suggestedNextPattern", "themeBalance"],
                        properties: {
                            recentPatterns: {
                                type: "array",
                                items: { type: "string" }
                            },
                            suggestedNextPattern: { type: "string" },
                            themeBalance: {
                                type: "object",
                                additionalProperties: { type: "number" }
                            }
                        }
                    }
                }
            }
        }
    }
};
