// tools.ts

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const topicAssessmentTool: Tool = {
    name: "assess_topics",
    description: "Analyzes current context and character voice to identify authentic content opportunities.",
    input_schema: {
        type: "object",
        required: ["contextAnalysis", "opportunityMapping", "strategyDevelopment", "outputRecommendation"],
        properties: {
            contextAnalysis: {
                type: "object",
                required: ["environment", "character", "recentActivity"],
                properties: {
                    environment: {
                        type: "object",
                        required: ["updates", "metrics", "social"],
                        properties: {
                            updates: {
                                type: "array",
                                items: {
                                    type: "object",
                                    required: ["type", "content", "timestamp", "impact", "relevance"],
                                    properties: {
                                        type: {
                                            type: "string",
                                            enum: ["news", "discussion", "development", "announcement"]
                                        },
                                        content: { type: "string" },
                                        timestamp: { type: "string" },
                                        impact: { type: "number" },
                                        relevance: {
                                            type: "array",
                                            items: { type: "string" }
                                        }
                                    }
                                }
                            },
                            metrics: {
                                type: "array",
                                items: {
                                    type: "object",
                                    required: ["category", "metrics", "context"],
                                    properties: {
                                        category: { type: "string" },
                                        metrics: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                required: ["name", "value", "trend", "timestamp"],
                                                properties: {
                                                    name: { type: "string" },
                                                    value: { type: "number" },
                                                    trend: { type: "string" },
                                                    timestamp: { type: "string" }
                                                }
                                            }
                                        },
                                        context: { type: "string" }
                                    }
                                }
                            },
                            social: {
                                type: "array",
                                items: {
                                    type: "object",
                                    required: ["type", "content", "source", "timestamp", "significance"],
                                    properties: {
                                        type: {
                                            type: "string",
                                            enum: ["sentiment", "discussion", "cultural", "narrative"]
                                        },
                                        content: { type: "string" },
                                        source: { type: "string" },
                                        timestamp: { type: "string" },
                                        significance: { type: "number" }
                                    }
                                }
                            }
                        }
                    },
                    character: {
                        type: "object",
                        required: ["relevantTraits", "naturalPerspective", "authenticValue"],
                        properties: {
                            relevantTraits: {
                                type: "array",
                                items: { type: "string" }
                            },
                            naturalPerspective: { type: "string" },
                            authenticValue: { type: "string" }
                        }
                    },
                    recentActivity: {
                        type: "object",
                        required: ["patterns", "avoidList"],
                        properties: {
                            patterns: {
                                type: "object",
                                required: ["contentTypes", "voicePatterns", "topics", "engagementApproaches", "timestamp"],
                                properties: {
                                    contentTypes: { type: "array", items: { type: "string" } },
                                    voicePatterns: { type: "array", items: { type: "string" } },
                                    topics: { type: "array", items: { type: "string" } },
                                    engagementApproaches: { type: "array", items: { type: "string" } },
                                    timestamp: { type: "string" }
                                }
                            },
                            avoidList: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    }
                }
            },
            opportunityMapping: {
                type: "object",
                required: ["identified", "priorityScore", "narrativeAlignment"],
                properties: {
                    identified: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["category", "value", "suitability"],
                            properties: {
                                category: {
                                    type: "string",
                                    enum: ["information", "community", "strategic"]
                                },
                                value: {
                                    type: "object",
                                    required: ["primary", "supporting", "uniqueAngle"],
                                    properties: {
                                        primary: { type: "string" },
                                        supporting: { type: "array", items: { type: "string" } },
                                        uniqueAngle: { type: "string" }
                                    }
                                },
                                suitability: {
                                    type: "object",
                                    required: ["characterFit", "timeliness", "freshness"],
                                    properties: {
                                        characterFit: { type: "number" },
                                        timeliness: { type: "number" },
                                        freshness: { type: "number" }
                                    }
                                }
                            }
                        }
                    },
                    priorityScore: { type: "number" },
                    narrativeAlignment: { type: "string" }
                }
            },
            strategyDevelopment: {
                type: "object",
                required: ["selected", "avoidList", "reasoningPath"],
                properties: {
                    selected: {
                        type: "object",
                        required: ["topic", "structure", "voice", "impact"],
                        properties: {
                            topic: {
                                type: "object",
                                required: ["main", "angle", "perspective"],
                                properties: {
                                    main: { type: "string" },
                                    angle: { type: "string" },
                                    perspective: { type: "string" }
                                }
                            },
                            structure: {
                                type: "object",
                                required: ["opening", "flow", "close"],
                                properties: {
                                    opening: { type: "string" },
                                    flow: { type: "string" },
                                    close: { type: "string" }
                                }
                            },
                            voice: {
                                type: "object",
                                required: ["elements", "tonality", "authenticity"],
                                properties: {
                                    elements: { type: "array", items: { type: "string" } },
                                    tonality: { type: "string" },
                                    authenticity: { type: "number" }
                                }
                            },
                            impact: {
                                type: "object",
                                required: ["intended", "potential", "measurement"],
                                properties: {
                                    intended: { type: "string" },
                                    potential: { type: "string" },
                                    measurement: { type: "string" }
                                }
                            }
                        }
                    },
                    avoidList: { type: "array", items: { type: "string" } },
                    reasoningPath: { type: "array", items: { type: "string" } }
                }
            },
            outputRecommendation: {
                type: "object",
                required: ["topic", "strategy", "execution"],
                properties: {
                    topic: { type: "string" },
                    strategy: { type: "string" },
                    execution: {
                        type: "object",
                        required: ["approach", "guidelines", "cautions"],
                        properties: {
                            approach: { type: "string" },
                            guidelines: { type: "array", items: { type: "string" } },
                            cautions: { type: "array", items: { type: "string" } }
                        }
                    }
                }
            }
        }
    }
};

export const tweetGenerationTool: Tool = {
    name: "generate_tweet",
    description: "Generates a tweet based on the provided context and strategy.",
    input_schema: {
        type: "object",
        required: ["contextAnalysis", "strategyDevelopment", "contentValidation", "outputGeneration"],
        properties: {
            contextAnalysis: {
                type: "object",
                required: ["inputSynthesis", "contentFramework"],
                properties: {
                    inputSynthesis: {
                        type: "object",
                        required: ["selectedTopic", "selectedAngle", "characterVoice", "contextualFactors"],
                        properties: {
                            selectedTopic: { type: "string" },
                            selectedAngle: { type: "string" },
                            characterVoice: {
                                type: "object",
                                required: ["traits", "rules", "examples"],
                                properties: {
                                    traits: { type: "array", items: { type: "string" } },
                                    rules: { type: "array", items: { type: "string" } },
                                    examples: { type: "array", items: { type: "string" } }
                                }
                            },
                            contextualFactors: {
                                type: "array",
                                items: {
                                    type: "object",
                                    required: ["type", "content", "relevance"],
                                    properties: {
                                        type: { type: "string" },
                                        content: { type: "string" },
                                        relevance: { type: "number" }
                                    }
                                }
                            }
                        }
                    },
                    contentFramework: {
                        type: "object",
                        required: ["structure", "constraints"],
                        properties: {
                            structure: {
                                type: "object",
                                required: ["opening", "core", "closing"],
                                properties: {
                                    opening: { type: "string" },
                                    core: { type: "string" },
                                    closing: { type: "string" }
                                }
                            },
                            constraints: {
                                type: "object",
                                required: ["characterLimit", "avoidList", "requiredElements"],
                                properties: {
                                    characterLimit: { type: "number" },
                                    avoidList: { type: "array", items: { type: "string" } },
                                    requiredElements: { type: "array", items: { type: "string" } }
                                }
                            }
                        }
                    }
                }
            },
            strategyDevelopment: {
                type: "object",
                required: ["variations", "selection"],
                properties: {
                    variations: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["version", "text", "rationale"],
                            properties: {
                                version: {
                                    type: "string",
                                    enum: ["A", "B", "C"]
                                },
                                text: { type: "string" },
                                rationale: { type: "string" }
                            }
                        }
                    },
                    selection: {
                        type: "object",
                        required: ["chosenVersion", "justification"],
                        properties: {
                            chosenVersion: {
                                type: "string",
                                enum: ["A", "B", "C"]
                            },
                            justification: { type: "string" }
                        }
                    }
                }
            },
            contentValidation: {
                type: "object",
                required: ["factualAccuracy", "voiceAuthenticity", "contextAlignment", "uniqueness"],
                properties: {
                    factualAccuracy: { type: "string" },
                    voiceAuthenticity: { type: "string" },
                    contextAlignment: { type: "string" },
                    uniqueness: { type: "string" }
                }
            },
            outputGeneration: {
                type: "object",
                required: ["finalTweet", "metadata"],
                properties: {
                    finalTweet: {
                        type: "object",
                        required: ["text", "version"],
                        properties: {
                            text: { type: "string" },
                            version: {
                                type: "string",
                                enum: ["A", "B", "C"]
                            }
                        }
                    },
                    metadata: {
                        type: "object",
                        required: ["characterCount", "contextualReferences", "avoidedElements"],
                        properties: {
                            characterCount: { type: "number" },
                            contextualReferences: { type: "array", items: { type: "string" } },
                            avoidedElements: { type: "array", items: { type: "string" } }
                        }
                    }
                }
            }
        }
    }
};