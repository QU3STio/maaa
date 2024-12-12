// validation.ts

import { elizaLogger } from "@ai16z/eliza";
import { AssessmentMetadata, TopicAssessmentResponse, TweetGenerationResponse } from "./types";

export class ValidationError extends Error {
    constructor(message: string, public context?: any) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class ResponseValidator {
    private static validateEnvironmentUpdate(update: any): boolean {
        return (
            typeof update === 'object' &&
            ['news', 'discussion', 'development', 'announcement'].includes(update.type) &&
            typeof update.content === 'string' &&
            typeof update.timestamp === 'string' &&
            typeof update.impact === 'number' &&
            Array.isArray(update.relevance)
        );
    }

    private static validateMetricData(metric: any): boolean {
        return (
            typeof metric === 'object' &&
            typeof metric.name === 'string' &&
            typeof metric.value === 'number' &&
            typeof metric.trend === 'string' &&
            typeof metric.timestamp === 'string'
        );
    }

    private static validateSocialData(social: any): boolean {
        return (
            typeof social === 'object' &&
            typeof social.type === 'string' &&
            typeof social.content === 'string' &&
            typeof social.source === 'string' &&
            typeof social.timestamp === 'string' &&
            typeof social.significance === 'number'
        );
    }

    static validateTopicAssessment(assessment: any): assessment is TopicAssessmentResponse {
        try {
            if (!assessment || typeof assessment !== 'object') {
                throw new ValidationError('Invalid assessment object');
            }

            // Validate context analysis
            const context = assessment.contextAnalysis;
            if (!context || typeof context !== 'object') {
                throw new ValidationError('Invalid context analysis');
            }

            // Validate environment
            if (!context.environment?.updates?.every(this.validateEnvironmentUpdate)) {
                throw new ValidationError('Invalid environment updates');
            }

            if (!context.environment?.metrics?.every(metric => 
                typeof metric.category === 'string' &&
                typeof metric.context === 'string' &&
                Array.isArray(metric.metrics) &&
                metric.metrics.every(this.validateMetricData)
            )) {
                throw new ValidationError('Invalid metrics data');
            }

            if (!context.environment?.social?.every(this.validateSocialData)) {
                throw new ValidationError('Invalid social data');
            }

            // Validate opportunity mapping
            const opportunity = assessment.opportunityMapping;
            if (!opportunity || typeof opportunity !== 'object') {
                throw new ValidationError('Invalid opportunity mapping');
            }

            // Validate strategy development
            const strategy = assessment.strategyDevelopment;
            if (!strategy?.selected?.topic || !strategy?.selected?.voice) {
                throw new ValidationError('Invalid strategy development');
            }

            return true;
        } catch (error) {
            if (error instanceof ValidationError) {
                elizaLogger.error(error.message, error.context);
            } else {
                elizaLogger.error('Validation error:', error);
            }
            return false;
        }
    }

    static validateTweetGeneration(response: any): response is TweetGenerationResponse {
        try {
            if (!response || typeof response !== 'object') {
                throw new ValidationError('Invalid tweet generation response');
            }

            // Validate context analysis
            const context = response.contextAnalysis;
            if (!context?.inputSynthesis || !context?.contentFramework) {
                throw new ValidationError('Invalid context analysis structure');
            }

            // Validate strategy development
            const strategy = response.strategyDevelopment;
            if (!Array.isArray(strategy?.variations) || !strategy?.selection?.chosenVersion) {
                throw new ValidationError('Invalid strategy development');
            }

            // Validate variations
            if (!strategy.variations.every(variation => 
                ['A', 'B', 'C'].includes(variation.version) &&
                typeof variation.text === 'string' &&
                typeof variation.rationale === 'string'
            )) {
                throw new ValidationError('Invalid tweet variations');
            }

            // Validate output generation
            const output = response.outputGeneration;
            if (!output?.finalTweet?.text || !output?.metadata?.characterCount) {
                throw new ValidationError('Invalid output generation');
            }

            return true;
        } catch (error) {
            if (error instanceof ValidationError) {
                elizaLogger.error(error.message, error.context);
            } else {
                elizaLogger.error('Tweet generation validation error:', error);
            }
            return false;
        }
    }

    static extractAssessmentData(assessment: TopicAssessmentResponse): AssessmentMetadata {
        return {
            topic: assessment.strategyDevelopment.selected.topic.main,
            angle: assessment.strategyDevelopment.selected.topic.angle,
            voice: {
                elements: assessment.strategyDevelopment.selected.voice.elements,
                tonality: assessment.strategyDevelopment.selected.voice.tonality,
                authenticity: assessment.strategyDevelopment.selected.voice.authenticity
            },
            context: {
                updates: assessment.contextAnalysis.environment.updates,
                metrics: assessment.contextAnalysis.environment.metrics,
                social: assessment.contextAnalysis.environment.social
            },
            guidelines: assessment.outputRecommendation.execution.guidelines,
            cautions: assessment.outputRecommendation.execution.cautions
        };
    }
}