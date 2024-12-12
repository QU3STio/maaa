import type { Tool } from '@anthropic-ai/sdk/resources/messages';


export const topicAssessmentTool: Tool = {
    name: "assess_topics",
    description: "Analyzes current context and recent activity to identify fresh discussion opportunities while maintaining voice authenticity.",
    input_schema: {
      type: "object",
      required: ["contextAnalysis", "opportunityAnalysis", "strategySelection"],
      properties: {
        contextAnalysis: {
          type: "object",
          required: ["contentAssessment", "patternAnalysis", "voiceAnalysis", "trackingLists"],
          properties: {
            contentAssessment: {
              type: "array",
              items: {
                type: "object",
                required: ["topic", "strategy", "effectiveness", "engagementLevel", "supportingElements"],
                properties: {
                  topic: { type: "string" },
                  strategy: { type: "string" },
                  effectiveness: { type: "number" },
                  engagementLevel: { type: "number" },
                  supportingElements: { 
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            },
            patternAnalysis: {
              type: "object",
              required: ["openingStructures", "sentencePatterns", "closingTechniques", "phraseUsage"],
              properties: {
                openingStructures: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["type", "frequency", "lastUsed"],
                    properties: {
                      type: { type: "string" },
                      frequency: { type: "number" },
                      lastUsed: { type: "string" }
                    }
                  }
                },
                sentencePatterns: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["pattern", "frequency", "lastUsed"],
                    properties: {
                      pattern: { type: "string" },
                      frequency: { type: "number" },
                      lastUsed: { type: "string" }
                    }
                  }
                },
                closingTechniques: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["technique", "frequency", "lastUsed"],
                    properties: {
                      technique: { type: "string" },
                      frequency: { type: "number" },
                      lastUsed: { type: "string" }
                    }
                  }
                },
                phraseUsage: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["phrase", "frequency", "lastUsed"],
                    properties: {
                      phrase: { type: "string" },
                      frequency: { type: "number" },
                      lastUsed: { type: "string" }
                    }
                  }
                }
              }
            },
            voiceAnalysis: {
              type: "object",
              required: ["consistencyScore", "toneAlignment", "styleCompliance", "ruleAdherence"],
              properties: {
                consistencyScore: { type: "number" },
                toneAlignment: { type: "number" },
                styleCompliance: { type: "number" },
                ruleAdherence: { type: "boolean" }
              }
            },
            trackingLists: {
              type: "object",
              required: ["strategies", "patterns", "topics", "metrics", "projects"],
              properties: {
                strategies: {
                  type: "object",
                  required: ["recentUsage", "distribution", "gaps", "rotationNeeded"],
                  properties: {
                    recentUsage: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["strategy", "timestamp", "postId"],
                        properties: {
                          strategy: { type: "string" },
                          timestamp: { type: "string" },
                          postId: { type: "string" }
                        }
                      }
                    },
                    distribution: {
                      type: "object",
                      additionalProperties: { type: "number" }
                    },
                    gaps: {
                      type: "array",
                      items: { type: "string" }
                    },
                    rotationNeeded: { type: "boolean" }
                  }
                },
                patterns: { $ref: "#/properties/contextAnalysis/properties/patternAnalysis" },
                topics: { type: "array", items: { type: "string" } },
                metrics: { type: "array", items: { type: "string" } },
                projects: { type: "array", items: { type: "string" } }
              }
            }
          }
        },
        opportunityAnalysis: {
          type: "object",
          required: ["educational", "entertainment", "inspirational", "networking", "informational", "scores"],
          properties: {
            educational: { type: "array", items: { type: "string" } },
            entertainment: { type: "array", items: { type: "string" } },
            inspirational: { type: "array", items: { type: "string" } },
            networking: { type: "array", items: { type: "string" } },
            informational: { type: "array", items: { type: "string" } },
            scores: {
              type: "object",
              additionalProperties: {
                type: "object",
                required: ["timeliness", "characterFit", "valuePotential", "developmentPotential", "uniqueness", "engagementLikelihood", "strategyAlignment"],
                properties: {
                  timeliness: { type: "number" },
                  characterFit: { type: "number" },
                  valuePotential: { type: "number" },
                  developmentPotential: { type: "number" },
                  uniqueness: { type: "number" },
                  engagementLikelihood: { type: "number" },
                  strategyAlignment: { type: "number" }
                }
              }
            }
          }
        },
        strategySelection: {
          type: "object",
          required: ["selectedPackage", "avoidList", "guidelines"],
          properties: {
            selectedPackage: {
              type: "object",
              required: ["strategy", "reasoning", "topic", "angle", "valueProposition", "implementationAngle", "supportingElements", "contextRequirements", "developmentPotential", "engagementHooks"],
              properties: {
                strategy: { type: "string" },
                reasoning: { type: "string" },
                topic: { type: "string" },
                angle: { type: "string" },
                valueProposition: { type: "string" },
                implementationAngle: { type: "string" },
                supportingElements: { type: "array", items: { type: "string" } },
                contextRequirements: { type: "array", items: { type: "string" } },
                developmentPotential: { type: "array", items: { type: "string" } },
                engagementHooks: { type: "array", items: { type: "string" } }
              }
            },
            avoidList: {
              type: "object",
              required: ["strategies", "patterns", "topics", "phrases", "metrics", "structures", "openings"],
              properties: {
                strategies: { type: "array", items: { type: "string" } },
                patterns: { type: "array", items: { type: "string" } },
                topics: { type: "array", items: { type: "string" } },
                phrases: { type: "array", items: { type: "string" } },
                metrics: { type: "array", items: { type: "string" } },
                structures: { type: "array", items: { type: "string" } },
                openings: { type: "array", items: { type: "string" } }
              }
            },
            guidelines: {
              type: "object",
              required: ["voiceDirection", "toneGuidance", "patternSuggestions", "hookOptions", "structureRecommendations", "metricUsageGuidance", "engagementApproaches", "closingTechniques"],
              properties: {
                voiceDirection: { type: "string" },
                toneGuidance: { type: "string" },
                patternSuggestions: { type: "array", items: { type: "string" } },
                hookOptions: { type: "array", items: { type: "string" } },
                structureRecommendations: { type: "array", items: { type: "string" } },
                metricUsageGuidance: { type: "string" },
                engagementApproaches: { type: "array", items: { type: "string" } },
                closingTechniques: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    }
  };

  export const tweetGenerationTool: Tool = {
    name: "generate_tweet",
    description: "Creates engaging, authentic tweets that deliver value while maintaining voice authenticity and strategic balance.",
    input_schema: {
      type: "object",
      required: ["variations", "qualityChecks", "selectionReasoning", "selectedTweet"],
      properties: {
        variations: {
          type: "array",
          items: {
            type: "object",
            required: ["content", "hookAnalysis", "messageCore", "strategicClose", "metrics", "strategyAlignment", "characterTruth"],
            properties: {
              content: { type: "string" },
              hookAnalysis: {
                type: "object",
                required: ["valueEntry", "patternUsed", "voiceAlignment"],
                properties: {
                  valueEntry: { type: "string" },
                  patternUsed: { type: "string" },
                  voiceAlignment: { type: "string" }
                }
              },
              messageCore: {
                type: "object",
                required: ["valueDelivery", "supportingElements", "characterVoice"],
                properties: {
                  valueDelivery: { type: "string" },
                  supportingElements: { 
                    type: "array",
                    items: { type: "string" }
                  },
                  characterVoice: { type: "string" }
                }
              },
              strategicClose: {
                type: "object",
                required: ["impactElement", "engagementHook", "memoryElement"],
                properties: {
                  impactElement: { type: "string" },
                  engagementHook: { type: "string" },
                  memoryElement: { type: "string" }
                }
              },
              metrics: {
                type: "object",
                required: ["technicalAccuracy", "contextClarity", "timeRelevance"],
                properties: {
                  technicalAccuracy: { type: "boolean" },
                  contextClarity: { type: "boolean" },
                  timeRelevance: { type: "boolean" }
                }
              },
              strategyAlignment: {
                type: "object",
                required: ["valueDelivery", "patternFreshness", "engagementPotential"],
                properties: {
                  valueDelivery: { type: "boolean" },
                  patternFreshness: { type: "number" },
                  engagementPotential: { type: "number" }
                }
              },
              characterTruth: {
                type: "object",
                required: ["voiceConsistency", "styleCompliance", "perspectiveAlignment"],
                properties: {
                  voiceConsistency: { type: "number" },
                  styleCompliance: { type: "boolean" },
                  perspectiveAlignment: { type: "boolean" }
                }
              }
            }
          },
          minItems: 3,
          maxItems: 3
        },
        qualityChecks: {
          type: "object",
          required: ["technical", "strategic", "character"],
          properties: {
            technical: {
              type: "object",
              required: ["accuracy", "clarity", "relevance"],
              properties: {
                accuracy: { type: "boolean" },
                clarity: { type: "boolean" },
                relevance: { type: "boolean" }
              }
            },
            strategic: {
              type: "object",
              required: ["implementation", "valueDelivery", "engagement"],
              properties: {
                implementation: { type: "boolean" },
                valueDelivery: { type: "boolean" },
                engagement: { type: "number" }
              }
            },
            character: {
              type: "object",
              required: ["voiceMatch", "styleMatch", "authenticity"],
              properties: {
                voiceMatch: { type: "boolean" },
                styleMatch: { type: "boolean" },
                authenticity: { type: "number" }
              }
            }
          }
        },
        selectionReasoning: {
          type: "object",
          required: ["qualityFactors", "differentiation", "impact"],
          properties: {
            qualityFactors: {
              type: "object",
              required: ["technicalScore", "strategyScore", "characterScore", "valueScore", "engagementScore"],
              properties: {
                technicalScore: { type: "number" },
                strategyScore: { type: "number" },
                characterScore: { type: "number" },
                valueScore: { type: "number" },
                engagementScore: { type: "number" }
              }
            },
            differentiation: {
              type: "object",
              required: ["patternUniqueness", "structuralFreshness", "voiceStrength", "valueClarity"],
              properties: {
                patternUniqueness: { type: "number" },
                structuralFreshness: { type: "number" },
                voiceStrength: { type: "number" },
                valueClarity: { type: "number" }
              }
            },
            impact: {
              type: "object",
              required: ["conversationPotential", "developmentPossibilities", "communityValue", "strategyAdvancement"],
              properties: {
                conversationPotential: { type: "number" },
                developmentPossibilities: { 
                  type: "array",
                  items: { type: "string" }
                },
                communityValue: { type: "string" },
                strategyAdvancement: { type: "string" }
              }
            }
          }
        },
        selectedTweet: {
          type: "object",
          required: ["content", "strategy", "pattern", "analysis"],
          properties: {
            content: { type: "string" },
            strategy: { type: "string" },
            pattern: { type: "string" },
            analysis: {
              type: "object",
              required: ["valueDelivery", "engagement", "impact"],
              properties: {
                valueDelivery: { type: "string" },
                engagement: { type: "string" },
                impact: { type: "string" }
              }
            }
          }
        }
      }
    }
  };