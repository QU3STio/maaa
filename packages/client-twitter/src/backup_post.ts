import { Tweet } from "agent-twitter-client";
import {
    // composeContext,
    generateText,
    getEmbeddingZeroVector,
    IAgentRuntime,
    ModelClass,
    stringToUuid,
    State,
    Memory
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
    PlanModification,
    Validation,
    StepType
} from "./types";
import { tools, ToolType } from "./tools";
import { templates } from "./templates";
import Anthropic from "@anthropic-ai/sdk";

// Constants
const MAX_TWEET_LENGTH = 280;
const DEFAULT_MODEL = "claude-3-sonnet-20240229";
const PLANNING_MODEL = "claude-3-sonnet-20240229";
const TWEET_GENERATION_MODEL = "claude-3-opus-latest";
const DEFAULT_RETRY_ATTEMPTS = 3;
const MIN_SCORE = 0;
const MAX_SCORE = 5;
const DEFAULT_SCORE = 4;

// Helper function for tweet truncation
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

// Helper for normalizing scores
function normalizeScore(score: number | undefined): number {
    if (typeof score !== 'number') {
        return DEFAULT_SCORE;
    }
    
    if (score <= 1) {
        return Math.round(score * MAX_SCORE);
    }
    
    return Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(score)));
}

// Helper for validating and normalizing validation metrics
function normalizeValidation(validation: Partial<Validation>): Validation {
    return {
        voice_match: normalizeScore(validation.voice_match),
        factual_accuracy: normalizeScore(validation.factual_accuracy),
        risks: Array.isArray(validation.risks) && validation.risks.length > 0 
            ? validation.risks 
            : ["No specific risks identified"]
    };
}

function validateDependencies(step: ExecutionStep, results: Map<string, StepResult>): boolean {
    return step.dependencies.every(depId => results.has(depId));
}

function gatherDependencyOutputs(step: ExecutionStep, results: Map<string, StepResult>): Record<string, any> {
    const outputs: Record<string, any> = {};
    for (const depId of step.dependencies) {
        const result = results.get(depId);
        if (result) {
            outputs[depId] = result.output;
        }
    }
    return outputs;
}


// Type guards with consistent property normalization
function isGenerationResult(output: any): output is GenerationResult {
    const data = output?.properties || output?.input?.properties || output;
    return data && 
           typeof data.tweet === 'string' &&
           typeof data.rationale === 'string' &&
           Array.isArray(data.metrics_used);
}

function isValidationResult(output: any): output is ValidationResult {
    const data = output?.properties || output?.input?.properties || output;
    return data && 
           typeof data.scores === 'object' &&
           typeof data.approved === 'boolean' &&
           Array.isArray(data.issues);
}

function isAssessmentResult(output: any): output is AssessmentResult {
    const data = output?.properties || output?.input?.properties || output;
    return data &&
           Array.isArray(data.opportunities) &&
           Array.isArray(data.key_points) &&
           Array.isArray(data.voice_elements);
}

const composeContext = ({
    state,
    template,
}: {
    state: State;
    template: string;
}) => {
    const out = template.replace(/{{\w+}}/g, (match) => {
        const key = match.replace(/{{|}}/g, "");
        const value = state[key];
        return String(value ?? "");  // Explicitly convert to string
    });
    return out;
};

interface StepStateComposer {
    baseState: State;
    dependencyOutputs: Record<string, any>;
    step: ExecutionStep;
    timeline: Tweet[];
}

export class TwitterPostClient {
    private client: ClientBase;
    private runtime: IAgentRuntime;
    private anthropicClient: Anthropic;
    private terminalUrl: string;
    private processId: string;
    private lastError: Error | null = null;
    private retryMap: Map<string, number> = new Map();

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.anthropicClient = new Anthropic({
            apiKey: this.runtime.getSetting("ANTHROPIC_API_KEY")
        });
        this.terminalUrl = this.runtime.getSetting("TERMINAL_URL");
        this.processId = `tweet-${Date.now()}`;
        
        elizaLogger.info("Initializing TwitterPostClient", {
            username: this.client.profile?.username,
            processId: this.processId
        });
        
        if (!this.terminalUrl) {
            elizaLogger.warn("TERMINAL_URL not set - terminal streaming will be disabled");
        }
    }

    private async streamToTerminal(
        type: 'ACTION' | 'THOUGHT' | 'ERROR' | 'PLAN_MODIFICATION',
        content: any,
        customProcessId?: string
    ) {
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
                processId: customProcessId || this.processId,
                agentId
            };
    
            elizaLogger.info("Streaming to terminal:", {
                type,
                processId: logEntry.processId,
                contentType: typeof content
            });

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

    private async getBaseState(roomIdSuffix: string): Promise<State> {
        elizaLogger.info("Getting base state for room suffix:", roomIdSuffix);

        const roomId = stringToUuid(`twitter-${this.client.profile.username}-${roomIdSuffix}`);
    
        const baseMemory: Memory = {
            id: stringToUuid(`memory-${Date.now()}`),
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            roomId,
            content: { 
                text: '',
                action: 'generate_tweet',
                source: 'twitter',
                metadata: {
                    username: this.client.profile.username,
                    timestamp: Date.now()
                }
            },
            createdAt: Date.now()
        };
    
        let state = await this.runtime.composeState(baseMemory);
        
        elizaLogger.info("Initial state composition complete", {
            availableKeys: Object.keys(state)
        });

        // Ensure all template variables are properly initialized
        state = {
            ...state,
            previousResults: {},
            assessment_key_points: '',
            assessment_opportunities: '',
            generation_tweet: '',
            validation_scores: {}
        };
    
        elizaLogger.info("Enriched base state", {
            hasRequiredFields: {
                agentName: !!state.agentName,
                bio: !!state.bio,
                lore: !!state.lore,
                postDirections: !!state.postDirections,
                knowledge: !!state.knowledge
            }
        });
        
        return state;
    }

    private async composeStepState({ 
        baseState, 
        dependencyOutputs, 
        step, 
        timeline 
    }: StepStateComposer): Promise<State> {
        elizaLogger.info("Composing step state", {
            stepId: step.id,
            stepType: step.type,
            dependencyCount: Object.keys(dependencyOutputs).length
        });

        const enrichedState = {
            ...baseState,
            timeline: await this.formatTweets(timeline, `${baseState.agentName}'s Timeline`),
        };

        // Transform dependency outputs with property normalization
        const dependencyState = Object.entries(dependencyOutputs).reduce((acc, [stepId, output]) => {
            const normalizedOutput = output?.properties || output?.input?.properties || output;
            const prefix = stepId.replace(/-/g, '_');
            
            // Store raw output
            acc[stepId] = normalizedOutput;
            
            if (normalizedOutput && typeof normalizedOutput === 'object') {
                // Assessment outputs
                if ('key_points' in normalizedOutput) {
                    acc[`${prefix}_key_points`] = Array.isArray(normalizedOutput.key_points) 
                        ? normalizedOutput.key_points.join('\n')
                        : '';
                }
                if ('opportunities' in normalizedOutput) {
                    acc[`${prefix}_opportunities`] = Array.isArray(normalizedOutput.opportunities)
                        ? normalizedOutput.opportunities.map(o => `${o.topic}: ${o.reason}`).join('\n')
                        : '';
                }
                
                // Generation outputs
                if ('tweet' in normalizedOutput) {
                    acc[`${prefix}_tweet`] = String(normalizedOutput.tweet);
                }
                if ('rationale' in normalizedOutput) {
                    acc[`${prefix}_rationale`] = String(normalizedOutput.rationale);
                }
                
                // Validation outputs
                if ('scores' in normalizedOutput) {
                    acc[`${prefix}_scores`] = normalizedOutput.scores;
                }
            }
            
            return acc;
        }, {} as Record<string, any>);

        const finalState = {
            ...enrichedState,
            ...dependencyState,
            previousResults: dependencyOutputs
        };

        elizaLogger.info("Step state composed", {
            stepId: step.id,
            availableTemplateVars: Object.keys(finalState),
            dependencyKeys: Object.keys(dependencyOutputs)
        });

        elizaLogger.info(`Final state for ${step.id}:`, finalState);

        return finalState;
    }

    private async composeStepContext(
        step: ExecutionStep,
        baseContext: State,
        dependencyOutputs: Record<string, any>
    ): Promise<string> {
        elizaLogger.info("Composing step context", {
            stepId: step.id,
            stepType: step.type
        });

        const allTweets = [
            ...(await this.client.getCachedTimeline() || []),
            ...(await this.client.getCachedDryRunTweets() || [])
        ].sort((a, b) => b.timestamp - a.timestamp);

        const stepState = await this.composeStepState({
            baseState: baseContext,
            dependencyOutputs,
            step,
            timeline: allTweets
        });

        const templateKey = step.type as keyof typeof templates;
        const template = templates[templateKey] || step.template;

        // Validate template variables
        const templateVars = template.match(/{{([^}]+)}}/g)?.map(v => 
            v.replace(/[{}]/g, '').trim()
        ) || [];

        const missingVars = templateVars.filter(v => !(v in stepState));
        if (missingVars.length > 0) {
            elizaLogger.warn("Missing template variables", {
                step: step.id,
                missingVars,
                availableVars: Object.keys(stepState)
            });
        }

        elizaLogger.info(`Step state used for step: ${step.id}:`, stepState);

        const context = composeContext({
            state: stepState,
            template
        });

        elizaLogger.info("Step context composed", {
            stepId: step.id,
            templateVarsFound: templateVars.length,
            templateVarsMissing: missingVars.length
        });

        elizaLogger.info(`Prompt Combed by for step: ${step.id}`, context);

        return context;
    }

    private shouldRetryStep(stepId: string, error: Error): boolean {
        const retryCount = this.retryMap.get(stepId) || 0;
        
        elizaLogger.info("Checking retry eligibility", {
            stepId,
            currentRetryCount: retryCount,
            errorType: error.constructor.name,
            maxRetries: DEFAULT_RETRY_ATTEMPTS
        });
        
        if (error instanceof ValidationError && error.level === 'error') {
            elizaLogger.info("Skipping retry for validation error", {
                stepId,
                level: error.level
            });
            return false;
        }

        if (retryCount >= DEFAULT_RETRY_ATTEMPTS) {
            elizaLogger.info("Maximum retry attempts reached", { stepId });
            return false;
        }

        this.retryMap.set(stepId, retryCount + 1);
        elizaLogger.info("Step retry approved", {
            stepId,
            newRetryCount: retryCount + 1
        });
        
        return true;
    }

    private clearRetryState(stepId?: string) {
        if (stepId) {
            this.retryMap.delete(stepId);
        } else {
            this.retryMap.clear();
        }
        this.lastError = null;
        
        elizaLogger.info("Retry state cleared", {
            specificStep: stepId || 'all'
        });
    }

    private async executeStep(
        step: ExecutionStep,
        context: State,
        results: Map<string, StepResult>,
        metadata: ReturnType<typeof this.initializeProcessMetadata>
    ): Promise<StepResult> {
        const startTime = Date.now();
        
        elizaLogger.info("Starting step execution", {
            stepId: step.id,
            stepType: step.type,
            dependencies: step.dependencies
        });
        
        try {
            const dependencyOutputs = gatherDependencyOutputs(step, results);
            
            const missingDeps = step.dependencies.filter(depId => !results.has(depId));
            if (missingDeps.length > 0) {
                elizaLogger.warn("Missing dependencies", {
                    stepId: step.id,
                    missingDeps
                });
            }
    
            // Handle RAG if needed
            let ragResults: RagResult[] = [];
            if (step.requires_rag) {
                elizaLogger.info("Executing RAG query for step", { stepId: step.id });
                
                const query: RagQuery = {
                    query: step.template,
                    focus_areas: [],
                    must_include: [],
                    must_avoid: []
                };
                
                const result = await this.executeRagQuery(query, context);
                ragResults.push(result);
                
                context = {
                    ...context,
                    text: `${context.text || ''}\n\n${result.content}`
                };
            }
    
            const stepContext = await this.composeStepContext(
                step,
                context,
                dependencyOutputs
            );

            elizaLogger.info(`Prompt for step: ${step.id}`, stepContext);
    
            const toolMap = {
                'assessment': 'assess_context',
                'generation': 'generate_tweet',
                'validation': 'validate_tweet'
            };
    
            const toolName = toolMap[step.type];
            const tool = tools[step.type];
            
            if (!tool) {
                throw new Error(`Unknown tool type: ${step.type}`);
            }
    
            elizaLogger.info("Executing Claude request", {
                stepId: step.id,
                toolName,
                contextLength: stepContext.length
            });

            const response = await this.anthropicClient.messages.create({
                // model: step.id === 'generation' || step.id === 'generate_tweet' ? TWEET_GENERATION_MODEL : DEFAULT_MODEL,
                model : DEFAULT_MODEL,
                max_tokens: 4096,
                messages: [{ 
                    role: "user", 
                    content: stepContext
                }],
                tools: [tool],
                tool_choice: { type: "tool", name: toolName }
            });
    
            elizaLogger.info("Received Claude response", {
                stepId: step.id,
                contentTypes: response.content.map(c => c.type)
            });

            elizaLogger.info(`Claude response for step: ${step.id}`, response);
    
            // Extract and normalize output
            let stepOutput = null;
            for (const content of response.content) {
                if (content.type === "tool_use" && content.name === toolName) {
                    // Handle property normalization
                    const rawInput = content.input as Record<string, any>;
                    stepOutput = rawInput?.properties || rawInput?.input?.properties || rawInput;
                    break;
                }
            }
    
            if (!stepOutput) {
                throw new ExecutionError(
                    `No valid output from step ${step.id}`,
                    step.id,
                    false
                );
            }
    
            const normalizedOutput = await this.normalizeStepOutput(step.type, stepOutput);
    
            const result: StepResult = {
                stepId: step.id,
                type: step.type,
                output: normalizedOutput,
                metadata: {
                    started_at: startTime,
                    completed_at: Date.now(),
                    validation: step.validation,
                    rag_results: ragResults.length > 0 ? ragResults : undefined,
                    requires_plan_modification: false,
                    suggested_changes: undefined
                }
            };
    
            if (step.can_trigger_changes) {
                const planModification = await this.checkForPlanModification(
                    step,
                    normalizedOutput,
                    context
                );
                
                if (planModification) {
                    result.metadata.requires_plan_modification = true;
                    result.metadata.suggested_changes = planModification;
                    
                    elizaLogger.info("Plan modification suggested", {
                        stepId: step.id,
                        modification: planModification
                    });
                }
            }
    
            // await this.streamToTerminal('THOUGHT', {
            //     phase: 'Step Execution',
            //     step: step.id,
            //     result: result
            // });
    
            elizaLogger.info("Step execution completed successfully", {
                stepId: step.id,
                duration: Date.now() - startTime
            });

            return result;
    
        } catch (error) {
            elizaLogger.error("Step execution failed", {
                stepId: step.id,
                error: error,
                duration: Date.now() - startTime
            });

            // await this.streamToTerminal('ERROR', {
            //     phase: 'Step Execution',
            //     step: step.id,
            //     error: error
            // });
    
            if (step.type === 'assessment') {
                elizaLogger.info("Using fallback assessment due to error", { stepId: step.id });
                return {
                    stepId: step.id,
                    type: step.type,
                    output: {
                        opportunities: [{
                            topic: "Default Assessment",
                            value: DEFAULT_SCORE,
                            reason: "Fallback due to assessment failure"
                        }],
                        key_points: ["Using fallback assessment"],
                        voice_elements: ["Default voice elements"]
                    },
                    metadata: {
                        started_at: startTime,
                        completed_at: Date.now(),
                        validation: step.validation
                    }
                };
            }
    
            if (this.shouldRetryStep(step.id, error)) {
                metadata.retryCount++;
                elizaLogger.info("Retrying step execution", {
                    stepId: step.id,
                    retryCount: metadata.retryCount
                });
                return this.executeStep(step, context, results, metadata);
            }
            
            throw error;
        }
    }

    private async normalizeStepOutput(type: StepType, output: any): Promise<AssessmentResult | GenerationResult | ValidationResult> {
        elizaLogger.info(`Normalizing ${type} output`, {
            outputType: typeof output,
            hasProperties: !!output?.properties,
            hasInputProperties: !!output?.input?.properties
        });
        
        try {
            switch (type) {
                case 'assessment':
                    return this.normalizeAssessmentOutput(output);
                case 'generation':
                    return this.normalizeGenerationOutput(output);
                case 'validation':
                    return this.normalizeValidationOutput(output);
                default:
                    throw new Error(`Unknown step type: ${type}`);
            }
        } catch (error) {
            elizaLogger.error(`Error normalizing ${type} output:`, error);
            throw error;
        }
    }

    private normalizeAssessmentOutput(output: any): AssessmentResult {        
        // Handle different property structures
        const data = output?.properties || output?.input?.properties || output;
        
        elizaLogger.info("Normalizing assessment output", {
            hasOpportunities: Array.isArray(data?.opportunities),
            hasKeyPoints: Array.isArray(data?.key_points),
            hasVoiceElements: Array.isArray(data?.voice_elements)
        });

        return {
            opportunities: Array.isArray(data?.opportunities) ?
                data.opportunities.map((opp: any) => ({
                    topic: String(opp?.topic || 'Unknown Topic'),
                    value: normalizeScore(opp?.value),
                    reason: String(opp?.reason || 'No reason provided')
                })) :
                [{
                    topic: "Default Topic",
                    value: DEFAULT_SCORE,
                    reason: "No opportunities provided"
                }],
            key_points: Array.isArray(data?.key_points) ?
                data.key_points.map(String) :
                ["No key points specified"],
            voice_elements: Array.isArray(data?.voice_elements) ?
                data.voice_elements.map(String) :
                ["No voice elements specified"]
        };
    }
    
    private normalizeGenerationOutput(output: any): GenerationResult {    
        // Handle different property structures
        const data = output?.properties || output?.input?.properties || output;

        elizaLogger.info("Normalizing generation output", {
            hasTweet: !!data?.tweet,
            hasRationale: !!data?.rationale,
            hasMetrics: Array.isArray(data?.metrics_used)
        });

        if (!data?.tweet) {
            throw new ValidationError(
                "Invalid generation output structure",
                { voice_match: 0, factual_accuracy: 0, risks: ["Missing tweet content"] },
                'error'
            );
        }
    
        return {
            tweet: truncateToCompleteSentence(String(data.tweet)),
            rationale: String(data.rationale || 'Generated based on context'),
            metrics_used: Array.isArray(data.metrics_used) ?
                data.metrics_used.map(String) :
                ["No specific metrics recorded"]
        };
    }
    
    private normalizeValidationOutput(output: any): ValidationResult {
        // Handle different property structures
        const data = output?.properties || output?.input?.properties || output;

        elizaLogger.info("Normalizing validation output", {
            hasScores: !!data?.scores,
            hasIssues: Array.isArray(data?.issues),
            hasApproved: 'approved' in data
        });
    
        if (!data?.scores) {
            throw new ValidationError(
                "Invalid validation output structure",
                { voice_match: 0, factual_accuracy: 0, risks: ["Invalid validation structure"] },
                'error'
            );
        }
    
        return {
            scores: {
                voice_match: normalizeScore(data.scores.voice_match),
                factual_accuracy: normalizeScore(data.scores.factual_accuracy)
            },
            issues: Array.isArray(data.issues) ?
                data.issues.map(String) :
                [],
            approved: Boolean(data.approved)
        };
    }

    private async checkForPlanModification(
        step: ExecutionStep,
        output: any,
        context: State
    ): Promise<PlanModification | undefined> {
        if (!step.can_trigger_changes) {
            return undefined;
        }

        elizaLogger.info("Checking for plan modifications", {
            stepId: step.id,
            hasConditions: Array.isArray(step.modification_conditions)
        });

        const shouldModify = step.modification_conditions?.some(condition => {
            try {
                return new Function('output', 'context', `return ${condition}`)(output, context);
            } catch (error) {
                elizaLogger.warn("Error evaluating modification condition", {
                    condition,
                    error
                });
                return false;
            }
        });

        if (!shouldModify) {
            return undefined;
        }

        const modificationContext = composeContext({
            state: {
                ...context,
                currentStep: step,
                stepOutput: output
            },
            template: templates.planning
        });

        elizaLogger.info("Generating plan modification", {
            stepId: step.id,
            contextLength: modificationContext.length
        });

        const response = await this.anthropicClient.messages.create({
            model: PLANNING_MODEL,
            max_tokens: 1024,
            messages: [{ 
                role: "user", 
                content: modificationContext
            }],
            tools: [tools.planning],
            tool_choice: { type: "tool", name: "plan_execution" }
        });

        let modification: PlanModification | undefined;
        for (const content of response.content) {
            if (content.type === "tool_use" && content.name === "plan_execution") {
                const data = content.input as any;
                modification = data?.properties || data?.input?.properties || data;
                break;
            }
        }

        if (modification) {
            elizaLogger.info("Plan modification generated", {
                stepId: step.id,
                modification
            });

            // await this.streamToTerminal('PLAN_MODIFICATION', {
            //     step: step.id,
            //     modification
            // });
        }

        return modification;
    }

    private async executeRagQuery(query: RagQuery, context: State): Promise<RagResult> {
        elizaLogger.info("Executing RAG query", {
            queryLength: query.query.length,
            hasFocusAreas: query.focus_areas.length > 0
        });

        if (!query.query.trim()) {
            elizaLogger.warn("Empty RAG query, returning default result");
            return {
                content: '',
                metadata: {
                    retrieved_at: Date.now(),
                    relevance_score: DEFAULT_SCORE
                }
            };
        }
    
        const ragContext = composeContext({
            state: {
                ...context,
                query
            },
            template: templates.rag
        });
    
        const response = await this.anthropicClient.messages.create({
            model: DEFAULT_MODEL,
            max_tokens: 2048,
            messages: [{ role: "user", content: ragContext }],
            tools: [tools.rag],
            tool_choice: { type: "tool", name: "generate_rag_query" }
        });
    
        let ragResult: RagQuery | null = null;
        for (const content of response.content) {
            if (content.type === "tool_use" && content.name === "generate_rag_query") {
                const data = content.input as any;
                ragResult = data?.properties || data?.input?.properties || data;
                break;
            }
        }
    
        if (!ragResult || !ragResult.query.trim()) {
            elizaLogger.warn("Failed to generate valid RAG query, returning default result");
            return {
                content: '',
                metadata: {
                    retrieved_at: Date.now(),
                    relevance_score: DEFAULT_SCORE
                }
            };
        }
    
        const retrievedState = await this.runtime.composeState({
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            roomId: stringToUuid('rag-room'),
            content: {
                text: ragResult.query,
                action: ''
            },
            createdAt: Date.now()
        });
    
        const stateText = typeof retrievedState.text === 'string' ? retrievedState.text : '';
        const content = stateText.trim();
        
        elizaLogger.info("RAG query completed", {
            contentLength: content.length,
            score: content ? DEFAULT_SCORE : 0
        });

        return {
            content,
            metadata: {
                retrieved_at: Date.now(),
                relevance_score: content ? DEFAULT_SCORE : 0
            }
        };
    }

    private async planExecution(context: State): Promise<ExecutionPlan> {
        elizaLogger.info("Planning execution", {
            contextKeys: Object.keys(context)
        });

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

        let plan: ExecutionPlan | null = null;
        
        for (const content of response.content) {
            if (content.type === "tool_use" && content.name === "plan_execution") {
                const data = content.input as any;
                plan = this.normalizePlan(data?.properties || data?.input?.properties || data);
                break;
            }
        }

        if (!plan) {
            throw new ValidationError(
                "Failed to generate valid execution plan",
                { voice_match: 0, factual_accuracy: 0, risks: ["Plan generation failed"] },
                'error'
            );
        }
    
        await this.streamToTerminal('THOUGHT', {
            phase: 'Planning',
            plan: plan
        });

        elizaLogger.info("Execution plan generated", {
            stepCount: plan.steps.length,
            estimatedDuration: plan.metadata.estimated_duration
        });
    
        return plan;
    }

    private normalizePlan(planData: any): ExecutionPlan {
        elizaLogger.info("Normalizing plan", {
            hasSteps: Array.isArray(planData?.steps),
            hasMetadata: !!planData?.metadata
        });

        if (!planData || !Array.isArray(planData.steps)) {
            throw new ValidationError(
                "Invalid plan structure",
                { voice_match: 0, factual_accuracy: 0, risks: ["Missing steps array"] },
                'error'
            );
        }
    
        const normalizedSteps: ExecutionStep[] = planData.steps.map((step: any, index: number) => ({
            id: step.id || `step-${index + 1}`,
            type: this.validateStepType(step.type),
            template: step.template || templates[step.type] || '',
            requires_rag: Boolean(step.requires_rag),
            dependencies: Array.isArray(step.dependencies) ? step.dependencies : [],
            validation: typeof step.validation === 'string' ? 
                { voice_match: DEFAULT_SCORE, factual_accuracy: DEFAULT_SCORE, risks: [step.validation] } :
                normalizeValidation(step.validation || {}),
            can_trigger_changes: Boolean(step.can_trigger_changes),
            modification_conditions: Array.isArray(step.modification_conditions) ? 
                step.modification_conditions : []
        }));
    
        this.validateStepDependencies(normalizedSteps);
    
        return {
            steps: normalizedSteps,
            metadata: {
                estimated_duration: typeof planData.metadata?.estimated_duration === 'number' ? 
                    planData.metadata.estimated_duration : 
                    normalizedSteps.length * 30,
                success_criteria: Array.isArray(planData.metadata?.success_criteria) ?
                    planData.metadata.success_criteria :
                    ["Plan completion"],
                allows_modifications: Boolean(planData.metadata?.allows_modifications)
            }
        };
    }

    private async executePlan(
        plan: ExecutionPlan, 
        context: State,
        metadata: ReturnType<typeof this.initializeProcessMetadata>
    ): Promise<Map<string, StepResult>> {
        const results = new Map<string, StepResult>();
        let currentSteps = this.orderStepsByDependencies(plan.steps);
        
        elizaLogger.info("Starting plan execution with steps:", 
            currentSteps.map(s => ({id: s.id, type: s.type}))
        );
        
        while (currentSteps.length > 0) {
            const step = currentSteps.shift();
            if (!step) break;
    
            try {
                const result = await this.executeStep(step, context, results, metadata);
                results.set(step.id, result);
    
                if (result.metadata.requires_plan_modification && result.metadata.suggested_changes) {
                    const modification = result.metadata.suggested_changes;
                    
                    if (modification.add_steps) {
                        currentSteps = [...currentSteps, ...modification.add_steps];
                    }
                    if (modification.remove_steps) {
                        currentSteps = currentSteps.filter(s => 
                            !modification.remove_steps?.includes(s.id)
                        );
                    }
                    if (modification.modify_steps) {
                        currentSteps = currentSteps.map(s => ({
                            ...s,
                            ...modification.modify_steps?.[s.id]
                        }));
                    }
    
                    currentSteps = this.orderStepsByDependencies(currentSteps);
                    metadata.modifications.push(modification);
                }
    
            } catch (error) {
                metadata.errors.push(error);
                
                if (error instanceof ValidationError && error.level === 'error') {
                    elizaLogger.warn(`Skipping failed step ${step.id} and continuing...`);
                    continue;
                }
                
                throw error;
            }
        }
    
        return results;
    }

    private validateStepType(type: any): StepType {
        const validTypes: StepType[] = ['assessment', 'generation', 'validation'];
        if (!validTypes.includes(type)) {
            throw new ValidationError(
                `Invalid step type: ${type}`,
                { voice_match: 0, factual_accuracy: 0, risks: ["Invalid step type"] },
                'error'
            );
        }
        return type;
    }

    private validateStepDependencies(steps: ExecutionStep[]): void {
        const stepIds = new Set(steps.map(s => s.id));
        
        for (const step of steps) {
            for (const depId of step.dependencies) {
                if (!stepIds.has(depId)) {
                    throw new ValidationError(
                        `Invalid dependency: ${depId} in step ${step.id}`,
                        { voice_match: 0, factual_accuracy: 0, risks: ["Invalid dependency"] },
                        'error'
                    );
                }
            }
        }
    }

    private orderStepsByDependencies(steps: ExecutionStep[]): ExecutionStep[] {
        const ordered: ExecutionStep[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const visit = (step: ExecutionStep) => {
            if (visiting.has(step.id)) {
                throw new ValidationError(
                    "Circular dependency detected",
                    { voice_match: 0, factual_accuracy: 0, risks: ["Circular dependency"] },
                    'error'
                );
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

        elizaLogger.info("Steps ordered by dependencies", {
            originalCount: steps.length,
            orderedCount: ordered.length,
            order: ordered.map(s => s.id)
        });

        return ordered;
    }

    private initializeProcessMetadata() {
        return {
            processId: this.processId,
            startTime: Date.now(),
            retryCount: 0,
            modifications: [] as PlanModification[],
            errors: [] as Error[]
        };
    }

    private async saveTweetToMemory(tweet: Tweet, content: string) {
        const roomId = stringToUuid(
            "twitter_generate_room-" + this.client.profile.username
        );

        elizaLogger.info("Saving tweet to memory", {
            tweetId: tweet.id,
            roomId,
            contentLength: content.length
        });

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

    private async handleDryRun(content: string) {
        elizaLogger.info("Handling dry run", {
            contentLength: content.length
        });
        
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
        
        elizaLogger.info("Dry run completed", {
            tweetId: mockTweet.id,
            timestamp: mockTweet.timestamp
        });
    }

    private async postTweet(content: string) {
        elizaLogger.info("Posting tweet", {
            contentLength: content.length
        });

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
        
        elizaLogger.info("Tweet posted successfully", {
            tweetId: tweet.id,
            url: tweet.permanentUrl
        });
    }

    private async formatTweets(tweets: Tweet[], title: string): Promise<string> {
        const sortedTweets = [...tweets].sort((a, b) => b.timestamp - a.timestamp);
        const limitedTweets = sortedTweets.slice(0, 10);
        
        elizaLogger.info("Formatting tweets", {
            totalTweets: tweets.length,
            formattedCount: limitedTweets.length
        });

        return `# ${title}\n\n` +
            limitedTweets
                .map((tweet) => {
                    const date = new Date(tweet.timestamp).toDateString();
                    const replyInfo = tweet.inReplyToStatusId 
                        ? `\nIn reply to: ${tweet.inReplyToStatusId}` 
                        : "";
                    
                    return `#${tweet.id}\n${tweet.name} (@${tweet.username})${replyInfo}\n${date}\n\n${tweet.text}\n---\n`;
                })
                .join("\n");
    }

    async start(postImmediately: boolean = false) {
        elizaLogger.info("Starting TwitterPostClient", {
            postImmediately,
            hasProfile: !!this.client.profile
        });

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

            elizaLogger.info("Next tweet scheduled", {
                nextTweetIn: randomMinutes,
                lastPostAge: Date.now() - lastPostTimestamp
            });
        };

        if (
            this.runtime.getSetting("POST_IMMEDIATELY") === "true" ||
            postImmediately
        ) {
            await this.generateNewTweet();
        }

        generateNewTweetLoop();
    }

    private createDefaultValidation(): ValidationResult {
        return {
            scores: {
                voice_match: DEFAULT_SCORE,
                factual_accuracy: DEFAULT_SCORE
            },
            issues: [],
            approved: true
        };
    }
    
    private extractKeyPoints(assessments: AssessmentResult[]): string[] {
        const allPoints = new Set<string>();
        
        assessments.forEach(assessment => {
            assessment.key_points.forEach(point => allPoints.add(point));
        });
    
        return Array.from(allPoints);
    }
    
    private calculateOverallConfidence(results: Map<string, StepResult>): number {
        const scores: number[] = [];
    
        results.forEach(result => {
            if (isValidationResult(result.output)) {
                scores.push(result.output.scores.voice_match);
                scores.push(result.output.scores.factual_accuracy);
            }
            if (isAssessmentResult(result.output)) {
                scores.push(...result.output.opportunities.map(o => o.value));
            }
        });
    
        if (scores.length === 0) {
            return DEFAULT_SCORE;
        }
    
        return normalizeScore(
            scores.reduce((sum, score) => sum + score, 0) / scores.length
        );
    }

    private createTweetGenerationProcess(
        plan: ExecutionPlan,
        results: Map<string, StepResult>,
        metadata: ReturnType<typeof this.initializeProcessMetadata>
    ): TweetGenerationProcess {
        // Find generation and validation results
        const generationStep = Array.from(results.values())
            .find(r => r.type === 'generation' && isGenerationResult(r.output));
        
        const validationStep = Array.from(results.values())
            .find(r => r.type === 'validation' && isValidationResult(r.output));
        
        if (!generationStep || !isGenerationResult(generationStep.output)) {
            throw new ValidationError(
                "No valid generation result found",
                { voice_match: 0, factual_accuracy: 0, risks: ["Missing generation output"] },
                'error'
            );
        }
    
        // Gather all RAG queries and results
        const ragQueries = Array.from(results.values())
            .flatMap(r => r.metadata.rag_results || []);
    
        // Collect assessments
        const assessments = Array.from(results.values())
            .filter(r => r.type === 'assessment' && isAssessmentResult(r.output))
            .map(r => r.output as AssessmentResult);
    
        return {
            plan,
            steps: Array.from(results.values()),
            final_output: {
                tweet: generationStep.output.tweet,
                validation: validationStep?.output as ValidationResult || this.createDefaultValidation(),
                supporting_data: {
                    metrics_used: generationStep.output.metrics_used,
                    key_points: this.extractKeyPoints(assessments),
                    rag_results: ragQueries,
                    assessments
                }
            },
            metadata: {
                started_at: metadata.startTime,
                completed_at: Date.now(),
                steps_executed: results.size,
                overall_confidence: this.calculateOverallConfidence(results),
                modifications: metadata.modifications,
                errors: metadata.errors
            }
        };
    }

    private async validateTweetProcess(
        process: TweetGenerationProcess
    ): Promise<boolean> {
        try {
            if (process.final_output.tweet.length > MAX_TWEET_LENGTH) {
                throw new ValidationError(
                    "Tweet exceeds maximum length",
                    { voice_match: 0, factual_accuracy: 0, risks: ["Length violation"] },
                    'error'
                );
            }
    
            if (process.metadata.overall_confidence < DEFAULT_SCORE) {
                throw new ValidationError(
                    "Tweet confidence below threshold",
                    { 
                        voice_match: process.metadata.overall_confidence,
                        factual_accuracy: process.metadata.overall_confidence,
                        risks: ["Low confidence"]
                    },
                    'warning'
                );
            }
    
            const validationStep = process.steps.find(
                s => s.type === 'validation' && isValidationResult(s.output)
            );
    
            if (!validationStep || !isValidationResult(validationStep.output)) {
                if (process.steps.length > 1) {
                    throw new ValidationError(
                        "Missing validation step",
                        { voice_match: 0, factual_accuracy: 0, risks: ["No validation"] },
                        'warning'
                    );
                }
            }
    
            const criticalErrors = process.metadata.errors.filter(
                e => e instanceof ValidationError && e.level === 'error'
            );
    
            if (criticalErrors.length > 0) {
                throw new ValidationError(
                    "Process contains critical errors",
                    { voice_match: 0, factual_accuracy: 0, risks: ["Critical errors present"] },
                    'error'
                );
            }
    
            return true;
    
        } catch (error) {
            if (error instanceof ValidationError) {
                // await this.streamToTerminal('ERROR', {
                //     phase: 'Process Validation',
                //     error: error,
                //     level: error.level
                // });
    
                return error.level !== 'error';
            }
    
            throw error;
        }
    }

    private async generateTweet(): Promise<TweetGenerationProcess> {
        try {
            const metadata = this.initializeProcessMetadata();
            
            // Get base state from runtime
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
    
            elizaLogger.info("Generated context for tweet generation", {
                baseStateKeys: Object.keys(baseState),
                hasTimeline: !!formattedTimeline
            });
    
            // Try complex generation with plan first
            try {
                elizaLogger.info("Attempting complex tweet generation with plan");
                const plan = await this.planExecution(context);
                const results = await this.executePlan(plan, context, metadata);
                const process = this.createTweetGenerationProcess(plan, results, metadata);
                
                const isValid = await this.validateTweetProcess(process);
                if (!isValid) {
                    throw new ValidationError(
                        "Tweet generation process failed validation",
                        { voice_match: 0, factual_accuracy: 0, risks: ["Validation failed"] },
                        'error'
                    );
                }
    
                elizaLogger.info("Complex tweet generation succeeded");
                return process;
    
            } catch (error) {
                // Fall back to simple generation
                elizaLogger.warn("Complex generation failed, falling back to simple tweet", {
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                
                const simpleTweet = await this.generateSimpleTweet();
                return this.createSimpleTweetProcess(simpleTweet, metadata);
            }
    
        } catch (error) {
            elizaLogger.error("Tweet generation failed", {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    
    private async generateSimpleTweet(): Promise<string> {
        const processId = `simple-tweet-${Date.now()}`;
        const state = await this.getBaseState('simple');
    
        elizaLogger.info("Generating simple tweet", {
            processId,
            hasState: !!state
        });
    
        // Add timeline to state
        const homeTimeline = await this.client.getCachedTimeline() || [];
        const dryRunTweets = await this.client.getCachedDryRunTweets() || [];
        const allTweets = [...homeTimeline, ...dryRunTweets]
            .sort((a, b) => b.timestamp - a.timestamp);
    
        const timeline = await this.formatTweets(allTweets, `${state.agentName}'s Timeline`);
        const enrichedState: State = {
            ...state,
            timeline
        };
    
        const context = composeContext({
            state: enrichedState,
            template: templates.generation
        });
    
        // await this.streamToTerminal(
        //     'THOUGHT',
        //     {
        //         phase: 'Simple Generation',
        //         context: context
        //     },
        //     processId
        // );
    
        elizaLogger.info("Executing simple generation", {
            contextLength: context.length
        });
    
        const response = await generateText({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.MEDIUM,
        });
    
        try {
            const parsedResponse = JSON.parse(response.trim());
            const tweetContent = parsedResponse.tweet || response;
            const finalContent = truncateToCompleteSentence(tweetContent.trim());
    
            elizaLogger.info("Simple tweet generated successfully", {
                contentLength: finalContent.length
            });
    
            await this.streamToTerminal(
                'ACTION',
                finalContent,
                processId
            );
    
            return finalContent;
    
        } catch (error) {
            elizaLogger.warn("Failed to parse generation response as JSON, using raw text", {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            const finalContent = truncateToCompleteSentence(response.trim());
            
            await this.streamToTerminal(
                'ACTION',
                finalContent,
                processId
            );
    
            return finalContent;
        }
    }
    
    private async createSimpleTweetProcess(
        tweet: string,
        metadata: ReturnType<typeof this.initializeProcessMetadata>
    ): Promise<TweetGenerationProcess> {
        elizaLogger.info("Creating simple tweet process");
    
        const defaultValidation: ValidationResult = {
            scores: {
                voice_match: DEFAULT_SCORE,
                factual_accuracy: DEFAULT_SCORE
            },
            issues: [],
            approved: true
        };
    
        return {
            plan: {
                steps: [],
                metadata: {
                    estimated_duration: 30,
                    success_criteria: ["Simple tweet generation"],
                    allows_modifications: false
                }
            },
            steps: [{
                stepId: 'simple-generation',
                type: 'generation',
                output: {
                    tweet,
                    rationale: 'Generated using simple template',
                    metrics_used: []
                },
                metadata: {
                    started_at: metadata.startTime,
                    completed_at: Date.now(),
                    validation: {
                        voice_match: DEFAULT_SCORE,
                        factual_accuracy: DEFAULT_SCORE,
                        risks: []
                    }
                }
            }],
            final_output: {
                tweet,
                validation: defaultValidation,
                supporting_data: {
                    metrics_used: [],
                    key_points: [],
                    rag_results: [],
                    assessments: []
                }
            },
            metadata: {
                started_at: metadata.startTime,
                completed_at: Date.now(),
                steps_executed: 1,
                overall_confidence: DEFAULT_SCORE,
                modifications: [],
                errors: []
            }
        };
    }

    private async generateNewTweet() {
        elizaLogger.info("Generating new tweet");

        try {
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
                await this.handleDryRun(content);
                return;
            }

            await this.postTweet(content);

        } catch (error) {
            elizaLogger.error("Error generating new tweet:", {
                error: error,
                stack: error instanceof Error ? error.stack : undefined,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}