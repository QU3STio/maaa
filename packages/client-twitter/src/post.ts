// post.ts

import { Tweet } from "agent-twitter-client";
import {
    composeContext,
    generateText,
    getEmbeddingZeroVector,
    IAgentRuntime,
    ModelClass,
    stringToUuid,
    State
} from "@ai16z/eliza";
import { elizaLogger } from "@ai16z/eliza";
import { ClientBase } from "./base";
import {
    ExecutionPlan,
    ExecutionStep,
    StepResult,
    TweetGenerationProcess,
    ValidationResult,
    ValidationError,
    ExecutionError,
    RagQuery,
    RagResult,
    GenerationResult,
    AssessmentResult,
    ContentStrategy,
    ValidationMetrics
} from "./types";
import { tools, ToolType } from "./tools";
import { templates, twitterSimplePostTemplate } from "./templates";
import Anthropic from "@anthropic-ai/sdk";

const MAX_TWEET_LENGTH = 280;
const DEFAULT_MODEL = "claude-3-sonnet-20240229";
const PLANNING_MODEL = "claude-3-sonnet-20240229";

function truncateToCompleteSentence(text: string): string {
    if (text.length <= MAX_TWEET_LENGTH) {
        return text;
    }

    const truncatedAtPeriod = text.slice(
        0,
        text.lastIndexOf(".", MAX_TWEET_LENGTH) + 1
    );
    if (truncatedAtPeriod.trim().length > 0) {
        return truncatedAtPeriod.trim();
    }

    const truncatedAtSpace = text.slice(
        0,
        text.lastIndexOf(" ", MAX_TWEET_LENGTH)
    );
    if (truncatedAtSpace.trim().length > 0) {
        return truncatedAtSpace.trim() + "...";
    }

    return text.slice(0, MAX_TWEET_LENGTH - 3).trim() + "...";
}

export class TwitterPostClient {
    client: ClientBase;
    runtime: IAgentRuntime;
    anthropicClient: Anthropic;
    terminalUrl: string;
    processId: string;

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.anthropicClient = new Anthropic({
            apiKey: this.runtime.getSetting("ANTHROPIC_API_KEY")
        });
        this.terminalUrl = this.runtime.getSetting("TERMINAL_URL");
        this.processId = `tweet-${Date.now()}`;
        
        if (!this.terminalUrl) {
            elizaLogger.warn("TERMINAL_URL not set - terminal streaming will be disabled");
        }
    }

    private async streamToTerminal(type: 'ACTION' | 'THOUGHT' | 'ERROR', content: any, customProcessId?: string) {
        if (!this.terminalUrl) return;
    
        try {
            const agentId = this.runtime.getSetting("AGENT_ID");
            if (!agentId) {
                throw new Error('Agent ID not available');
            }
    
            const timestamp = new Date().toISOString();
            
            const logEntry = {
                type,
                content: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
                timestamp,
                id: `${type.toLowerCase()}-${timestamp}`,
                processId: customProcessId || this.processId
            };
    
            const response = await fetch(`${this.terminalUrl}/api/terminal/${agentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logEntry)
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to stream to terminal: ${response.status} ${response.statusText}\nResponse: ${errorText}`);
            }
        } catch (error) {
            elizaLogger.error("Error streaming to terminal:", error);
        }
    }

    private async formatTweets(tweets: Tweet[], title: string): Promise<string> {
        const sortedTweets = [...tweets].sort((a, b) => b.timestamp - a.timestamp);
        const limitedTweets = sortedTweets.slice(0, 10);
        
        return `# ${title}\n\n` +
            limitedTweets
                .map((tweet) => {
                    return `#${tweet.id}\n${tweet.name} (@${tweet.username})${
                        tweet.inReplyToStatusId ? `\nIn reply to: ${tweet.inReplyToStatusId}` : ""
                    }\n${new Date(tweet.timestamp).toDateString()}\n\n${tweet.text}\n---\n`;
                })
                .join("\n");
    }

    private normalizeGenerationStepOutput(output: any): GenerationResult {
        // Check if output has the basic required structure
        if (!output || typeof output !== 'object') {
            throw new Error('Invalid generation output format');
        }
    
        // Handle different possible structures for recommendations
        const variations = Array.isArray(output.variations) ? output.variations : [];
        let selectedVersion = output.recommendation?.selected_version;
        
        // If no selected version, try to get from variations
        if (!selectedVersion && variations.length > 0) {
            selectedVersion = variations[0].content;
        }
    
        // If still no content, check direct content field
        if (!selectedVersion && output.content) {
            selectedVersion = output.content;
        }
    
        if (!selectedVersion) {
            throw new Error('No valid content found in generation output');
        }
    
        return {
            variations: variations.map(v => ({
                content: v.content || '',
                rationale: v.rationale || 'Generated variation',
                strengths: Array.isArray(v.strengths) ? v.strengths : [],
                risks: Array.isArray(v.risks) ? v.risks : []
            })),
            evaluations: {
                authenticity_scores: this.normalizeScores(output.evaluations?.authenticity_scores || {}),
                impact_predictions: this.normalizeScores(output.evaluations?.impact_predictions || {}),
                risk_assessments: output.evaluations?.risk_assessments || {}
            },
            recommendation: {
                selected_version: selectedVersion,
                justification: output.recommendation?.justification || 'Selected based on quality assessment',
                confidence_score: this.normalizeScore(output.recommendation?.confidence_score || 0.8)
            }
        };
    }
    
    private normalizeValidationStepOutput(output: any): ValidationResult {
        if (!output || typeof output !== 'object') {
            throw new Error('Invalid validation output format');
        }
    
        const validation_results = output.validation_results || {};
        
        return {
            validation_results: {
                technical_checks: this.normalizeTechnicalChecks(validation_results.technical_checks),
                character_alignment: {
                    voice_score: this.normalizeScore(validation_results.character_alignment?.voice_score || 4),
                    expertise_score: this.normalizeScore(validation_results.character_alignment?.expertise_score || 4),
                    authenticity_score: this.normalizeScore(validation_results.character_alignment?.authenticity_score || 4)
                },
                value_assessment: {
                    information_value: this.normalizeScore(validation_results.value_assessment?.information_value || 4),
                    community_value: this.normalizeScore(validation_results.value_assessment?.community_value || 4),
                    strategic_value: this.normalizeScore(validation_results.value_assessment?.strategic_value || 4)
                },
                risk_evaluation: {
                    identified_risks: Array.isArray(validation_results.risk_evaluation?.identified_risks) ? 
                        validation_results.risk_evaluation.identified_risks : 
                        ['No significant risks identified'],
                    mitigation_suggestions: Array.isArray(validation_results.risk_evaluation?.mitigation_suggestions) ?
                        validation_results.risk_evaluation.mitigation_suggestions :
                        ['Continue monitoring process']
                }
            },
            final_recommendation: {
                approve: output.final_recommendation?.approve ?? true,
                changes_needed: Array.isArray(output.final_recommendation?.changes_needed) ?
                    output.final_recommendation.changes_needed : [],
                confidence_score: this.normalizeScore(output.final_recommendation?.confidence_score || 4)
            }
        };
    }
    
    private normalizeScore(score: number | undefined): number {
        if (typeof score !== 'number') return 4;
        
        // Convert 0-1 range to 0-5
        if (score <= 1) {
            return Math.round(score * 5);
        }
        
        // Ensure score is within 0-5 range
        return Math.min(5, Math.max(0, Math.round(score)));
    }
    
    private normalizeScores(scores: Record<string, number>): Record<string, number> {
        const normalized: Record<string, number> = {};
        Object.entries(scores).forEach(([key, value]) => {
            normalized[key] = this.normalizeScore(value);
        });
        return normalized;
    }
    
    private normalizeTechnicalChecks(checks: any): Record<string, boolean> {
        const standardChecks = {
            input_complete: true,
            format_valid: true,
            dependencies_met: true,
            schema_valid: true
        };
    
        if (!checks || typeof checks !== 'object') {
            return standardChecks;
        }
    
        // Map common variations to standard keys
        const keyMappings: Record<string, string> = {
            'Grammar and spelling': 'format_valid',
            'Content length requirements': 'input_complete',
            'Information accuracy': 'schema_valid',
            'Links functional': 'dependencies_met',
            'Length within limit': 'input_complete',
            'No profanity detected': 'format_valid'
        };
    
        const normalizedChecks = {...standardChecks};
        
        Object.entries(checks).forEach(([key, value]) => {
            const standardKey = keyMappings[key] || key;
            if (standardKey in standardChecks) {
                normalizedChecks[standardKey] = Boolean(value);
            }
        });
    
        return normalizedChecks;
    }

    private gatherDependencyOutputs(step: ExecutionStep, results: Map<string, StepResult>): Record<string, any> {
        const outputs: Record<string, any> = {};
        for (const depId of step.dependencies) {
            const result = results.get(depId);
            if (result) {
                outputs[depId] = result.output;
            }
        }
        return outputs;
    }

    private async getBaseState(roomIdSuffix: string): Promise<State> {
        const roomId = stringToUuid(`twitter-${this.client.profile.username}-${roomIdSuffix}`);

        const state = await this.runtime.composeState({
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            roomId,
            content: { 
                text: this.runtime.character.topics?.join(", ") || '',
                action: ''
            }
        });

        return {
            ...state,
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            roomId,
            bio: state.bio || '',
            lore: state.lore || '',
            messageDirections: state.messageDirections || '',
            postDirections: state.postDirections || '',
            actors: state.actors || '',
            recentMessages: state.recentMessages || '',
            recentMessagesData: state.recentMessagesData || []
        };
    }

    private async generateSimpleTweet(): Promise<string> {
        const processId = `simple-tweet-${Date.now()}`;
        const state = await this.getBaseState('simple');

        const context = composeContext({
            state,
            template: this.runtime.character.templates?.twitterPostTemplate || twitterSimplePostTemplate
        });

        await this.streamToTerminal(
            'THOUGHT',
            {
                phase: 'Simple Generation',
                prompt: context
            },
            processId
        );

        const newTweetContent = await generateText({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.MEDIUM,
        });

        const content = newTweetContent.replaceAll(/\\n/g, "\n").trim();

        await this.streamToTerminal(
            'ACTION',
            content,
            processId
        );

        await this.streamToTerminal(
            'THOUGHT',
            'Generated using simple tweet template without chain-of-thought reasoning.',
            processId
        );

        return content;
    }

    private async executeRagQuery(query: RagQuery, context: State): Promise<RagResult> {
        const ragContext = composeContext({
            state: {
                ...context,
                roomId: stringToUuid('rag-room')
            },
            template: templates.rag
        });

        elizaLogger.info("RAG Prompt:", ragContext);

        const response = await this.anthropicClient.messages.create({
            model: DEFAULT_MODEL,
            max_tokens: 2048,
            messages: [{ role: "user", content: ragContext }],
            tools: [tools.rag],
            tool_choice: { type: "tool", name: "generate_rag_query" }
        });

        elizaLogger.info("RAG Response:", response);

        let ragResult: RagQuery | null = null;
        
        for (const content of response.content) {
            if (content.type === "tool_use" && content.name === "generate_rag_query") {
                ragResult = content.input as RagQuery;
                break;
            }
        }

        if (!ragResult) {
            throw new ValidationError(
                "Failed to generate RAG query",
                {
                    technical_checks: { query_generation: false },
                    character_alignment: {
                        voice_score: 0,
                        expertise_score: 0,
                        authenticity_score: 0
                    },
                    value_assessment: {
                        information_value: 0,
                        community_value: 0,
                        strategic_value: 0
                    },
                    risk_evaluation: {
                        identified_risks: ["RAG query generation failed"],
                        mitigation_suggestions: ["Retry with simplified query"]
                    }
                },
                'error'
            );
        }

        const retrievedState = await this.runtime.composeState({
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            roomId: stringToUuid('rag-room'),
            content: {
                text: ragResult.query,
                action: ''
            }
        });

        const result: RagResult = {
            content: retrievedState.text as string || '',
            metadata: {
                retrieved_at: Date.now(),
                source: 'knowledge_base',
                relevance_score: 1.0,
                validation: {
                    technical_checks: { retrieved: true },
                    character_alignment: {
                        voice_score: 1,
                        expertise_score: 1,
                        authenticity_score: 1
                    },
                    value_assessment: {
                        information_value: 1,
                        community_value: 1,
                        strategic_value: 1
                    },
                    risk_evaluation: {
                        identified_risks: [],
                        mitigation_suggestions: []
                    }
                }
            }
        };

        await this.streamToTerminal('THOUGHT', {
            phase: 'RAG Results',
            result: result
        });

        return result;
    }

    private async executeStep(
        step: ExecutionStep,
        context: State,
        stepInputs?: Record<string, any>,
        retryCount = 0
    ): Promise<StepResult> {
        const maxRetries = step.error_handling.retry_strategy.max_attempts;
        const startTime = Date.now();
        
        try {
            let ragResults: RagResult[] = [];
            let query: RagQuery | undefined;
            if (step.requires_rag) {
                const query: RagQuery = {
                    query: step.purpose,
                    focus_areas: [],
                    expected_use: step.purpose,
                    relevance_criteria: {
                        mustHave: [],
                        niceToHave: [],
                        avoid: []
                    },
                    validation: {
                        completeness_checks: [],
                        accuracy_requirements: [],
                        relevance_metrics: []
                    }
                };
                
                const result = await this.executeRagQuery(query, context);
                ragResults.push(result);
                context = {
                    ...context,
                    text: `${context.text || ''}\n\n${result.content}`
                };
            }

            const toolType = step.type as ToolType;
            const tool = tools[toolType];
            
            if (!tool) {
                throw new Error(`Unknown tool type: ${step.type}`);
            }

            const stepContext = composeContext({
                state: {
                    ...context,
                    retrievedKnowledge: context.text || '',  // RAG results
                    opportunities: stepInputs?.opportunities || {},  // From assessment
                    selectedStrategy: stepInputs?.selected_strategy || {},  // From strategy
                    roomId: stringToUuid(`step-${step.id}`),
                    lore: context.lore || '',
                    messageDirections: context.messageDirections || '',
                    actors: context.actors || '',
                    recentMessages: context.recentMessages || '',
                    recentMessagesData: context.recentMessagesData || [],
                    timeline: context.timeline || ''
                },
                template: step.template
            });

            elizaLogger.info("Step Prompt:", stepContext);

            const response = await this.anthropicClient.messages.create({
                model: DEFAULT_MODEL,
                max_tokens: 4096,
                messages: [{ role: "user", content: stepContext }],
                tools: [tool],
                tool_choice: { type: "tool", name: tool.name }
            });

            elizaLogger.info("Step Response:", response);

            let stepOutput: any = null;
            
            for (const content of response.content) {
                if (content.type === "tool_use" && content.name === tool.name) {
                    stepOutput = content.input;
                    break;
                }
            }

            if (!stepOutput) {
                throw new ExecutionError(
                    `Failed to execute step ${step.id}`,
                    step.id,
                    false
                );
            }

        let normalizedOutput;
            switch (step.type) {
                case 'generation':
                    normalizedOutput = this.normalizeGenerationStepOutput(stepOutput);
                    break;
                case 'validation':
                    normalizedOutput = this.normalizeValidationStepOutput(stepOutput);
                    break;
                default:
                    normalizedOutput = stepOutput;
            }

            const result: StepResult = {
                stepId: step.id,
                type: step.type,
                output: normalizedOutput,
                metadata: {
                    started_at: startTime,
                    completed_at: Date.now(),
                    validation: step.validation,
                    rag_queries: query ? [query] : undefined,
                    rag_results: ragResults.length > 0 ? ragResults : undefined
                }
            };

            await this.streamToTerminal('THOUGHT', {
                phase: 'Step Execution',
                step: step.id,
                result: result
            });

            return result;

        } catch (error) {
            await this.streamToTerminal('ERROR', {
                phase: 'Step Execution',
                step: step.id,
                error: error,
                retryCount
            });

            if (retryCount < maxRetries) {
                return this.executeStep(step, context, retryCount + 1);
            }
            
            throw new ExecutionError(
                `Failed to execute step ${step.id} after ${maxRetries} attempts: ${error.message}`,
                step.id,
                retryCount > 0
            );
        }
    }

    private orderStepsByDependencies(steps: ExecutionStep[]): ExecutionStep[] {
        const ordered: ExecutionStep[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const visit = (step: ExecutionStep) => {
            if (visiting.has(step.id)) {
                throw new Error('Circular dependency detected');
            }
            if (visited.has(step.id)) {
                return;
            }

            visiting.add(step.id);

            for (const depId of step.dependencies) {
                const depStep = steps.find(s => s.id === depId);
                if (depStep) {
                    visit(depStep);
                }
            }

            visiting.delete(step.id);
            visited.add(step.id);
            ordered.push(step);
        };

        steps.forEach(step => {
            if (!visited.has(step.id)) {
                visit(step);
            }
        });

        return ordered;
    }

    private getNormalizedPlanFromResponse(response: any): ExecutionPlan {
        // Try to get the plan from different possible locations
        let plan: any = null;
    
        // Check different possible paths to the plan
        if (response?.input?.properties) {
            plan = response.input.properties;
        } else if (response?.properties) {
            plan = response.properties;
        } else if (response?.input) {
            plan = response.input;
        } else {
            plan = response;  // Assume direct structure
        }
    
        // Validate we have the core required properties
        if (!plan || !Array.isArray(plan.steps)) {
            throw new ValidationError(
                "Invalid plan structure - missing steps array",
                {
                    technical_checks: { plan_valid: false },
                    character_alignment: {
                        voice_score: 0,
                        expertise_score: 0,
                        authenticity_score: 0
                    },
                    value_assessment: {
                        information_value: 0,
                        community_value: 0,
                        strategic_value: 0
                    },
                    risk_evaluation: {
                        identified_risks: ["Invalid plan structure"],
                        mitigation_suggestions: ["Check plan generation"]
                    }
                },
                'error'
            );
        }
    
        // Normalize validation structure
        const normalizeValidation = (validation: any) => {
            if (!validation) {
                return {
                    technical_checks: {
                        input_complete: true,
                        format_valid: true,
                        dependencies_met: true,
                        schema_valid: true
                    },
                    character_alignment: {
                        voice_score: 4,
                        expertise_score: 4,
                        authenticity_score: 4
                    },
                    value_assessment: {
                        information_value: 4,
                        community_value: 4,
                        strategic_value: 4
                    },
                    risk_evaluation: {
                        identified_risks: ["No risks explicitly identified"],
                        mitigation_suggestions: ["Continue standard monitoring"]
                    }
                };
            }
    
            // Ensure technical_checks has all required fields
            validation.technical_checks = {
                input_complete: true,
                format_valid: true,
                dependencies_met: true,
                schema_valid: true,
                ...validation.technical_checks
            };
    
            // Ensure risk arrays are never empty
            if (!validation.risk_evaluation?.identified_risks?.length) {
                validation.risk_evaluation = {
                    ...validation.risk_evaluation,
                    identified_risks: ["No risks explicitly identified"],
                    mitigation_suggestions: ["Continue standard monitoring"]
                };
            }
    
            return validation;
        };
    
        // Normalize error handling structure
        const normalizeErrorHandling = (error_handling: any) => {
            if (!error_handling) {
                return {
                    retry_strategy: {
                        max_attempts: 3,
                        conditions: ["validation.technical_checks.format_valid === false"]
                    },
                    fallback_options: ["Use default approach"],
                    recovery_steps: ["Review and retry"]
                };
            }
    
            // Ensure retry strategy has reasonable defaults
            error_handling.retry_strategy = {
                max_attempts: 3,
                conditions: ["validation.technical_checks.format_valid === false"],
                ...error_handling.retry_strategy
            };
    
            // Ensure arrays are never empty
            if (!error_handling.fallback_options?.length) {
                error_handling.fallback_options = ["Use default approach"];
            }
            if (!error_handling.recovery_steps?.length) {
                error_handling.recovery_steps = ["Review and retry"];
            }
    
            return error_handling;
        };
    
        // Normalize each step
        plan.steps = plan.steps.map((step: any) => ({
            ...step,
            validation: normalizeValidation(step.validation),
            error_handling: normalizeErrorHandling(step.error_handling),
            metadata: {
                estimated_duration: step.metadata?.estimated_duration || 30,
                required_context: step.metadata?.required_context || ["base context"],
                success_criteria: step.metadata?.success_criteria || ["basic completion"]
            }
        }));
    
        // Normalize plan-level structures
        plan.validation = normalizeValidation(plan.validation);
        plan.error_handling = normalizeErrorHandling(plan.error_handling);
        plan.metadata = {
            estimated_duration: plan.metadata?.estimated_duration || 
                plan.steps.reduce((total: number, step: any) => total + (step.metadata?.estimated_duration || 30), 0),
            required_context: plan.metadata?.required_context || ["base context"],
            success_criteria: plan.metadata?.success_criteria || ["plan completion"]
        };
    
        return plan as ExecutionPlan;
    }
    
    // Use it in your planExecution method:
    private async planExecution(context: State): Promise<ExecutionPlan> {
        const planningContext = composeContext({
            state: context,
            template: templates.planning
        });
    
        const response = await this.anthropicClient.messages.create({
            model: PLANNING_MODEL,
            max_tokens: 4096,
            messages: [{ role: "user", content: planningContext }],
            tools: [tools.planning],
            tool_choice: { type: "tool", name: "plan_execution" }
        });
    
        elizaLogger.info("Planning Response:", response);
    
        let plan: ExecutionPlan | null = null;
        
        for (const content of response.content) {
            if (content.type === "tool_use" && content.name === "plan_execution") {
                plan = this.getNormalizedPlanFromResponse(content.input);
                break;
            }
        }
    
        if (!plan) {
            throw new ValidationError(
                "Failed to generate valid execution plan",
                {
                    technical_checks: { plan_generation: false },
                    character_alignment: {
                        voice_score: 0,
                        expertise_score: 0,
                        authenticity_score: 0
                    },
                    value_assessment: {
                        information_value: 0,
                        community_value: 0,
                        strategic_value: 0
                    },
                    risk_evaluation: {
                        identified_risks: ["Plan generation failed"],
                        mitigation_suggestions: ["Retry with modified prompt"]
                    }
                },
                'error'
            );
        }
    
        await this.streamToTerminal('THOUGHT', {
            phase: 'Planning',
            plan: plan
        });
    
        return plan;
    }

    private isGenerationResult(output: any): output is GenerationResult {
        return output && 
               'recommendation' in output && 
               typeof output.recommendation === 'object' &&
               'selected_version' in output.recommendation;
    }

    private isValidationResult(output: any): output is ValidationResult {
        return output && 
               'validation_results' in output &&
               'final_recommendation' in output;
    }

    private async generateTweet(): Promise<TweetGenerationProcess> {
        try {
            const baseState = await this.getBaseState('generate');
            const homeTimeline = await this.client.getCachedTimeline() || [];
            const dryRunTweets = await this.client.getCachedDryRunTweets() || [];
            const allTweets = [...homeTimeline, ...dryRunTweets]
                .sort((a, b) => b.timestamp - a.timestamp);

            const formattedTimeline = await this.formatTweets(
                allTweets,
                `${baseState.agentName}'s Timeline`
            );

            const context: State = {
                ...baseState,
                timeline: formattedTimeline
            };

            elizaLogger.info("Generated context for plan:", context);

            let plan: ExecutionPlan;
            
            try {
                plan = await this.planExecution(context);
                
            } catch (error) {
                elizaLogger.warn("Failed to generate plan, falling back to simple tweet generation:", error);
                const simpleTweet = await this.generateSimpleTweet();
                
                return this.createSimpleTweetProcess(simpleTweet);
            }

            elizaLogger.info("Generated plan:", plan);

            const results = new Map<string, StepResult>();
            let currentContext = { ...context };
            const orderedSteps = this.orderStepsByDependencies(plan.steps);
            
            for (const step of orderedSteps) {
                const stepInputs = this.gatherDependencyOutputs(step, results);
                currentContext = {
                    ...currentContext,
                    stepInputs,
                    text: `${currentContext.text || ''}\n\n${stepInputs ? JSON.stringify(stepInputs) : ''}`
                };
                
                const result = await this.executeStep(step, currentContext);
                results.set(step.id, result);
            }

            return this.createTweetGenerationProcess(plan, results);

        } catch (error) {
            await this.streamToTerminal('ERROR', {
                phase: 'Tweet Generation',
                error: error
            });
            throw error;
        }
    }

    private createSimpleTweetProcess(tweet: string): TweetGenerationProcess {
        const baseValidation: ValidationMetrics = {
            technical_checks: { simple_generation: true },
            character_alignment: {
                voice_score: 1,
                expertise_score: 1,
                authenticity_score: 1
            },
            value_assessment: {
                information_value: 1,
                community_value: 1,
                strategic_value: 1
            },
            risk_evaluation: {
                identified_risks: [],
                mitigation_suggestions: []
            }
        };

        return {
            plan: {
                steps: [],
                validation: baseValidation,
                error_handling: {
                    retry_strategy: { max_attempts: 1, conditions: [] },
                    fallback_options: [],
                    recovery_steps: []
                },
                metadata: {
                    estimated_duration: 0,
                    required_context: [],
                    success_criteria: []
                }
            },
            steps: [],
            final_output: {
                tweet,
                supporting_data: {
                    rag_queries: [],
                    assessments: [],
                    strategies: [],
                    variations: []
                },
                validation: {
                    validation_results: baseValidation,
                    final_recommendation: {
                        approve: true,
                        changes_needed: [],
                        confidence_score: 1
                    }
                }
            },
            metadata: {
                started_at: Date.now(),
                completed_at: Date.now(),
                steps_executed: 1,
                rag_queries_performed: 0,
                overall_confidence: 1
            },
            error_handling: {
                retries: {},
                failures: {},
                recoveries: {}
            }
        };
    }

    private createTweetGenerationProcess(
        plan: ExecutionPlan,
        results: Map<string, StepResult>
    ): TweetGenerationProcess {
        const generationStep = Array.from(results.values())
            .find(r => r.type === 'generation');

        if (!generationStep) {
            throw new ValidationError(
                "No generation step found in results",
                plan.validation,
                'error'
            );
        }

        if (!this.isGenerationResult(generationStep.output)) {
            throw new ValidationError(
                "Invalid generation step output",
                plan.validation,
                'error'
            );
        }

        const validationStep = Array.from(results.values())
            .find(r => r.type === 'validation');
        
        const selectedTweet = generationStep.output.recommendation.selected_version;

        return {
            plan,
            steps: Array.from(results.values()),
            final_output: {
                tweet: selectedTweet,
                supporting_data: {
                    rag_queries: Array.from(results.values())
                        .flatMap(r => r.metadata.rag_queries || []),
                    assessments: Array.from(results.values())
                        .filter(r => r.type === 'assessment')
                        .map(r => r.output as AssessmentResult),
                    strategies: Array.from(results.values())
                        .filter(r => r.type === 'strategy')
                        .map(r => r.output as ContentStrategy),
                    variations: generationStep.output.variations
                },
                validation: validationStep?.output as ValidationResult
            },
            metadata: {
                started_at: Math.min(...Array.from(results.values())
                    .map(r => r.metadata.started_at)),
                completed_at: Math.max(...Array.from(results.values())
                    .map(r => r.metadata.completed_at)),
                steps_executed: results.size,
                rag_queries_performed: Array.from(results.values())
                    .reduce((count, r) => count + (r.metadata.rag_queries?.length || 0), 0),
                overall_confidence: validationStep && this.isValidationResult(validationStep.output)
                    ? validationStep.output.final_recommendation.confidence_score
                    : 0
            },
            error_handling: {
                retries: {},
                failures: {},
                recoveries: {}
            }
        };
    }

    private async saveTweetToMemory(tweet: Tweet, content: string) {
        const roomId = stringToUuid(
            "twitter_generate_room-" + this.client.profile.username
        );

        await this.runtime.ensureRoomExists(roomId);
        await this.runtime.ensureParticipantInRoom(
            this.runtime.agentId,
            roomId
        );

        await this.runtime.messageManager.createMemory({
            id: stringToUuid(tweet.id + "-" + this.runtime.agentId),
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            content: {
                text: content.trim(),
                url: tweet.permanentUrl,
                source: "twitter",
            },
            roomId,
            embedding: getEmbeddingZeroVector(),
            createdAt: tweet.timestamp,
        });
    }

    private async generateNewTweet() {
        elizaLogger.log("Generating new tweet");

        try {
            const roomId = stringToUuid(
                "twitter_generate_room-" + this.client.profile.username
            );
            
            await this.runtime.ensureUserExists(
                this.runtime.agentId,
                this.client.profile.username,
                this.runtime.character.name,
                "twitter"
            );

            const process = await this.generateTweet();
            const content = truncateToCompleteSentence(process.final_output.tweet);

            await this.streamToTerminal('ACTION', content);

            if (this.runtime.getSetting("TWITTER_DRY_RUN") === "true") {
                elizaLogger.info(`Dry run: would have posted tweet: ${content}`);
                const mockTweet: Tweet = {
                    id: `dry-run-${Date.now()}`,
                    name: this.client.profile.screenName,
                    username: this.client.profile.username,
                    text: content,
                    conversationId: `dry-run-${Date.now()}`,
                    timestamp: Date.now(),
                    userId: this.client.profile.id,
                    inReplyToStatusId: null,
                    permanentUrl: `DRY_RUN_${Date.now()}`,
                    hashtags: [],
                    mentions: [],
                    photos: [],
                    thread: [],
                    urls: [],
                    videos: [],
                };

                await this.runtime.cacheManager.set(
                    `twitter/${this.client.profile.username}/lastPost`,
                    {
                        id: mockTweet.id,
                        timestamp: Date.now(),
                    }
                );

                const existingDryRuns = await this.client.getCachedDryRunTweets() || [];
                await this.runtime.cacheManager.set(
                    `twitter/${this.client.profile.username}/dryRunTweets`,
                    [...existingDryRuns, mockTweet]
                );

                await this.saveTweetToMemory(mockTweet, content);
                return;
            }

            const result = await this.client.requestQueue.add(
                async () => await this.client.twitterClient.sendTweet(content)
            );

            const body = await result.json();
            if (!body?.data?.create_tweet?.tweet_results?.result) {
                throw new Error("Error sending tweet; Bad response: " + JSON.stringify(body));
            }

            const tweetResult = body.data.create_tweet.tweet_results.result;
            const tweet: Tweet = {
                id: tweetResult.rest_id,
                name: this.client.profile.screenName,
                username: this.client.profile.username,
                text: tweetResult.legacy.full_text,
                conversationId: tweetResult.legacy.conversation_id_str,
                timestamp: new Date(tweetResult.legacy.created_at).getTime(),
                userId: this.client.profile.id,
                inReplyToStatusId: tweetResult.legacy.in_reply_to_status_id_str,
                permanentUrl: `https://twitter.com/${this.runtime.getSetting("TWITTER_USERNAME")}/status/${tweetResult.rest_id}`,
                hashtags: [],
                mentions: [],
                photos: [],
                thread: [],
                urls: [],
                videos: [],
            };

            await this.runtime.cacheManager.set(
                `twitter/${this.client.profile.username}/lastPost`,
                {
                    id: tweet.id,
                    timestamp: Date.now(),
                }
            );

            await this.client.cacheTweet(tweet);
            await this.saveTweetToMemory(tweet, content);
            
            elizaLogger.log(`Tweet posted:\n ${tweet.permanentUrl}`);

        } catch (error) {
            elizaLogger.error("Error generating new tweet:", {
                error: error,
                stack: error instanceof Error ? error.stack : undefined,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    async start(postImmediately: boolean = false) {
        if (!this.client.profile) {
            await this.client.init();
        }

        const generateNewTweetLoop = async () => {
            const lastPost = await this.runtime.cacheManager.get<{
                timestamp: number;
            }>(
                "twitter/" +
                    this.runtime.getSetting("TWITTER_USERNAME") +
                    "/lastPost"
            );

            const lastPostTimestamp = lastPost?.timestamp ?? 0;
            const minMinutes =
                parseInt(this.runtime.getSetting("POST_INTERVAL_MIN")) || 90;
            const maxMinutes =
                parseInt(this.runtime.getSetting("POST_INTERVAL_MAX")) || 180;
            const randomMinutes =
                Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) +
                minMinutes;
            const delay = randomMinutes * 60 * 1000;

            if (Date.now() > lastPostTimestamp + delay) {
                await this.generateNewTweet();
            }

            setTimeout(() => {
                generateNewTweetLoop();
            }, delay);

            elizaLogger.log(`Next tweet scheduled in ${randomMinutes} minutes`);
        };

        if (
            this.runtime.getSetting("POST_IMMEDIATELY") === "true" ||
            postImmediately
        ) {
            await this.generateNewTweet();
        }

        generateNewTweetLoop();
    }
}