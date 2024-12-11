import { Tool } from '@anthropic-ai/sdk';


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
            knowledge: {
                type: "object",
                required: ["facts", "expertise", "historicalContext"],
                properties: {
                    facts: { type: "array", items: { type: "string" } },
                    expertise: { type: "array", items: { type: "string" } },
                    historicalContext: { type: "array", items: { type: "string" } }
                }
            },
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
            previousContext: {
                type: "object",
                required: ["recentTweets", "patterns"],
                properties: {
                    recentTweets: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["content", "timestamp", "pattern", "strategy"],
                            properties: {
                                content: { type: "string" },
                                timestamp: { type: "string" },
                                pattern: { type: "string" },
                                strategy: { type: "string" },
                                keyPhrases: { type: "array", items: { type: "string" } },
                                structure: { type: "string" }
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
                    }
                }
            },
            topicContext: {
                type: "object",
                required: ["currentTopics", "relevance"],
                properties: {
                    currentTopics: { type: "array", items: { type: "string" } },
                    relevance: { type: "object", additionalProperties: { type: "string" } }
                }
            },
            // Generation process properties
            situationAnalysis: {
                type: "object",
                required: ["patternAnalysis", "opportunities"],
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
                            required: ["description", "timelineFreshness", "metricStrength", "topicRelevance", "knowledgeSupport", "priority", "reasoning", "patternFreshness"],
                            properties: {
                                description: { type: "string" },
                                timelineFreshness: { type: "number" },
                                metricStrength: { type: "number" },
                                topicRelevance: { type: "number" },
                                knowledgeSupport: { type: "number" },
                                priority: { type: "number" },
                                reasoning: { type: "string" },
                                patternFreshness: { type: "number" }
                            }
                        }
                    }
                }
            },
            contentStrategy: {
                type: "object",
                required: ["selectedOpportunity", "chosenStrategy", "patternChoice", "requiredSources", "situationConnection", "diversityApproach"],
                properties: {
                    selectedOpportunity: {
                        type: "object",
                        required: ["description", "reasoning"],
                        properties: {
                            description: { type: "string" },
                            reasoning: { type: "string" }
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
                        required: ["type", "fitExplanation"],
                        properties: {
                            type: { type: "string" },
                            fitExplanation: { type: "string" }
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
                        required: ["plannedStructures", "avoidPhrases", "angleVariations"],
                        properties: {
                            plannedStructures: { type: "array", items: { type: "string" } },
                            avoidPhrases: { type: "array", items: { type: "string" } },
                            angleVariations: { type: "array", items: { type: "string" } }
                        }
                    }
                }
            },
            tweetDevelopment: {
                type: "object",
                required: ["variations", "differentiation", "uniquenessVerification", "strategyConnection"],
                properties: {
                    variations: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["content", "pattern", "strategy", "angle", "voiceMarkers", "strategyImplementation", "uniquenessMetrics"],
                            properties: {
                                content: { type: "string" },
                                pattern: { type: "string" },
                                strategy: { type: "string" },
                                angle: { type: "string" },
                                voiceMarkers: { type: "array", items: { type: "string" } },
                                strategyImplementation: { type: "string" },
                                uniquenessMetrics: {
                                    type: "object",
                                    required: ["patternFreshness", "phraseUniqueness", "structuralDiversity", "overallDistinctiveness"],
                                    properties: {
                                        patternFreshness: { type: "number" },
                                        phraseUniqueness: { type: "number" },
                                        structuralDiversity: { type: "number" },
                                        overallDistinctiveness: { type: "number" }
                                    }
                                }
                            }
                        }
                    },
                    differentiation: {
                        type: "object",
                        required: ["angleUniqueness", "voiceConsistency", "strategyAlignment"],
                        properties: {
                            angleUniqueness: { type: "string" },
                            voiceConsistency: { type: "string" },
                            strategyAlignment: { type: "string" }
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
                                required: ["perspective", "communityResonance"],
                                properties: {
                                    perspective: { type: "boolean" },
                                    communityResonance: { type: "boolean" }
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
                                required: ["patternFresh", "phraseUnique", "structureDistinct", "score"],
                                properties: {
                                    patternFresh: { type: "boolean" },
                                    phraseUnique: { type: "boolean" },
                                    structureDistinct: { type: "boolean" },
                                    score: { type: "number" }
                                }
                            }
                        }
                    },
                    diversityMetrics: {
                        type: "object",
                        required: ["patternNovelty", "structuralUniqueness", "phraseOriginality", "overallFreshness"],
                        properties: {
                            patternNovelty: { type: "number" },
                            structuralUniqueness: { type: "number" },
                            phraseOriginality: { type: "number" },
                            overallFreshness: { type: "number" }
                        }
                    }
                }
            }
        }
    }
};
