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
    RagQuery,
    RagResult,
    GenerationResult,
    AssessmentResult,
    PlanModification,
    StepType
} from "./types";
import { tools } from "./tools";
import { templates } from "./templates";
import Anthropic from "@anthropic-ai/sdk";

// Constants
const MAX_TWEET_LENGTH = 280;
const DEFAULT_MODEL = "claude-3-sonnet-20240229";
const PLANNING_MODEL = "claude-3-sonnet-20240229";
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

export interface EnrichedState extends State {
    // Assessment results
    opportunities?: string;
    key_points?: string;
    voice_elements?: string;
    avoid_list?: string;
    
    // Generation results
    generated_tweet?: string;
    tweet_rationale?: string;
    metrics_used?: string;
    
    // Validation results
    validation_scores?: {
        voice_match: number;
        factual_accuracy: number;
    };
    validation_issues?: string;
    validation_approved?: boolean;

    // Allow for step results to be stored
    [key: string]: any;
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

function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
    return Object.keys(obj).reduce((acc: Record<string, any>, key: string) => {
        const value = obj[key];
        const newKey = prefix ? `${prefix}_${key}` : key;
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(acc, flattenObject(value, newKey));
        } else if (Array.isArray(value)) {
            acc[newKey] = value.join('\n');
        } else {
            acc[newKey] = value;
        }
        
        return acc;
    }, {});
}

// Helper to process step results into template variables
function processStepResult(result: any, prefix: string): Record<string, any> {
    const processed: Record<string, any> = {};
    
    if (!result) return processed;

    // Handle assessment results
    if ('opportunities' in result) {
        processed[`${prefix}_opportunities`] = Array.isArray(result.opportunities) ?
            result.opportunities.map((o: any) => `${o.topic}: ${o.reason}`).join('\n') :
            '';
        processed[`${prefix}_key_points`] = Array.isArray(result.key_points) ?
            result.key_points.join('\n') :
            '';
        processed[`${prefix}_voice_elements`] = Array.isArray(result.voice_elements) ?
            result.voice_elements.join('\n') :
            '';
        processed[`${prefix}_avoid_list`] = Array.isArray(result.avoid_list) ?
            result.avoid_list.join('\n') :
            '';
    }

    // Handle generation results
    if ('tweet' in result) {
        processed[`${prefix}_tweet`] = result.tweet;
        processed[`${prefix}_rationale`] = result.rationale;
        processed[`${prefix}_metrics`] = Array.isArray(result.metrics_used) ?
            result.metrics_used.join('\n') :
            '';
    }

    // Handle validation results
    if ('scores' in result) {
        processed[`${prefix}_scores`] = result.scores;
        processed[`${prefix}_issues`] = Array.isArray(result.issues) ?
            result.issues.join('\n') :
            '';
        processed[`${prefix}_approved`] = result.approved;
    }

    return processed;
}

export const composeContext = ({
    state,
    template,
}: {
    state: State;
    template: string;
}) => {
    const templateVars = template.match(/{{\w+}}/g) || [];
    elizaLogger.info("Template variables requested", {
        vars: templateVars,
        availableKeys: Object.keys(state)
    });

    // Create flattened state with processed results
    const flattenedState: Record<string, any> = { ...state };

    // Process step results
    Object.entries(state).forEach(([key, value]) => {
        if (key.endsWith('_result') && value) {
            const prefix = key.replace('_result', '');
            const processedResult = processStepResult(value, prefix);
            Object.assign(flattenedState, processedResult);
        }
    });

    // Flatten any remaining nested objects
    const finalState = flattenObject(flattenedState);

    const out = template.replace(/{{\w+}}/g, (match) => {
        const key = match.replace(/{{|}}/g, "");
        const value = finalState[key];
        
        elizaLogger.info("Template replacement", {
            key,
            hasValue: value !== undefined,
            value: value ?? ""
        });

        return String(value ?? "");
    });

    return out;
};

export type UUID = `${string}-${string}-${string}-${string}-${string}`;

class StateManager {
    private currentState: State;
    
    constructor(initialState: State) {
        this.currentState = initialState;
        elizaLogger.info("StateManager initialized", {
            initialStateKeys: Object.keys(initialState)
        });
    }

    updateState(newData: Partial<State>): State {
        this.currentState = {
            ...this.currentState,
            ...newData
        };
        
        elizaLogger.info("State updated", {
            updatedKeys: Object.keys(newData),
            newStateKeys: Object.keys(this.currentState)
        });
        
        return this.currentState;
    }

    getCurrentState(): State {
        return this.currentState;
    }
}

export class TwitterPostClient {
    private client: ClientBase;
    private runtime: IAgentRuntime;
    private anthropicClient: Anthropic;
    private terminalUrl: string;
    private processId: string;

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

    private readonly toolNameMap = {
        'assessment': 'assess_context',
        'generation': 'generate_tweet',
        'validation': 'validate_tweet'
    } as const;

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
        timeline,
    }: {
        baseState: State;
        dependencyOutputs: Record<string, any>;
        step: ExecutionStep;
        timeline: any[];
    }): Promise<EnrichedState> {
        elizaLogger.info("Composing step state", {
            stepId: step.id,
            stepType: step.type,
            dependencyCount: Object.keys(dependencyOutputs).length
        });
    
        // Start with the base state
        const enrichedState: EnrichedState = {
            ...baseState,
            timeline: Array.isArray(timeline) ? timeline.join('\n') : ''
        };
    
        // Process dependency outputs and flatten them
        Object.entries(dependencyOutputs).forEach(([stepId, output]) => {
            const prefix = stepId.replace(/-/g, '_');
            
            elizaLogger.debug("Processing dependency output", {
                stepId,
                prefix,
                outputType: typeof output,
                outputKeys: output ? Object.keys(output) : []
            });
    
            // Store the raw output
            enrichedState[`${prefix}_result`] = output;
            
            // Flatten key properties to top level for template access
            if (output && typeof output === 'object') {
                if ('opportunities' in output) {
                    enrichedState.opportunities = Array.isArray(output.opportunities) ?
                        output.opportunities.map((o: any) => `${o.topic}: ${o.reason}`).join('\n') :
                        '';
                }
                if ('key_points' in output) {
                    enrichedState.key_points = Array.isArray(output.key_points) ?
                        output.key_points.join('\n') :
                        '';
                }
                if ('voice_elements' in output) {
                    enrichedState.voice_elements = Array.isArray(output.voice_elements) ?
                        output.voice_elements.join('\n') :
                        '';
                }
                if ('avoid_list' in output) {
                    enrichedState.avoid_list = Array.isArray(output.avoid_list) ?
                        output.avoid_list.join('\n') :
                        '';
                }
                if ('tweet' in output) {
                    enrichedState.generated_tweet = String(output.tweet);
                    enrichedState.tweet_rationale = String(output.rationale || '');
                    enrichedState.metrics_used = Array.isArray(output.metrics_used) ?
                        output.metrics_used.join('\n') :
                        '';
                }
                if ('scores' in output) {
                    enrichedState.validation_scores = output.scores;
                    enrichedState.validation_issues = Array.isArray(output.issues) ?
                        output.issues.join('\n') :
                        '';
                    enrichedState.validation_approved = Boolean(output.approved);
                }
            }
    
            elizaLogger.debug("Dependency state processed", {
                stepId,
                enrichedKeys: Object.keys(enrichedState)
            });
        });
    
        elizaLogger.info("Step state composed", {
            stepId: step.id,
            availableTemplateVars: Object.keys(enrichedState)
        });
    
        return enrichedState;
    }

    private async composeStepContext(
        step: ExecutionStep,
        baseContext: State,
        dependencyOutputs: Record<string, any>,
        timeline: string[]
    ): Promise<string> {
        elizaLogger.info("Composing step context", {
            stepId: step.id,
            stepType: step.type,
            dependencyCount: Object.keys(dependencyOutputs).length,
            timelineLength: timeline.length
        });
    
        // Get step state with timeline
        const stepState = await this.composeStepState({
            baseState: baseContext,
            dependencyOutputs,
            step,
            timeline
        });
    
        // When validating, ensure key_points and avoid_list from assessment are available
        if (step.type === 'validation') {
            const assessmentResult = baseContext.assess_context_result as AssessmentResult | undefined;
            
            if (assessmentResult) {
                if ('key_points' in assessmentResult) {
                    stepState.key_points = Array.isArray(assessmentResult.key_points) ?
                        assessmentResult.key_points.join('\n') :
                        '';
                    
                    elizaLogger.debug("Added assessment key points to validation context", {
                        hasKeyPoints: !!stepState.key_points
                    });
                }
                
                if ('avoid_list' in assessmentResult) {
                    stepState.avoid_list = Array.isArray(assessmentResult.avoid_list) ?
                        assessmentResult.avoid_list.join('\n') :
                        '';
                        
                    elizaLogger.debug("Added avoid list to validation context", {
                        hasAvoidList: !!stepState.avoid_list
                    });
                }
            } else {
                elizaLogger.warn("Assessment result not found", {
                    hasAssessmentResult: !!assessmentResult
                });
            }
        }
    
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
    
        const context = composeContext({
            state: stepState,
            template
        });

        elizaLogger.info(`Step context for ${step.id}`, context);
    
        elizaLogger.info("Step context composed", {
            stepId: step.id,
            templateVarsFound: templateVars.length,
            templateVarsMissing: missingVars.length,
            contextLength: context.length
        });
    
        return context;
    }

    private extractStepResult(response: any): any {
        if (response?.content) {
            for (const content of response.content) {
                if (content.type === "tool_use") {
                    const data = content.input;
                    return data?.properties || data?.input?.properties || data;
                }
            }
        }
        return response;
    }

    private async executeStep(
        step: ExecutionStep,
        state: State
    ): Promise<StepResult> {
        const startTime = Date.now();
        
        elizaLogger.info("Starting step execution", {
            stepId: step.id,
            stepType: step.type,
            stateKeys: Object.keys(state),
            timestamp: startTime
        });
    
        // Gather dependency outputs
        const dependencyOutputs: Record<string, any> = {};
        for (const depId of step.dependencies) {
            const result = state[`${depId}_result`];
            if (result) {
                elizaLogger.debug("Found dependency result", {
                    dependencyId: depId,
                    resultType: typeof result,
                    resultKeys: Object.keys(result)
                });
                dependencyOutputs[depId] = result;
            } else {
                elizaLogger.warn("Missing dependency result", {
                    stepId: step.id,
                    dependencyId: depId
                });
            }
        }
    
        // Get timeline from state
        let timeline = [];
        if (typeof state.timeline === 'string' && state.timeline.trim()) {
            timeline = state.timeline.split('\n');
            elizaLogger.debug("Retrieved timeline from state", {
                timelineLength: timeline.length
            });
        }

        let ragResults: RagResult[] = [];
            if (step.requires_rag) {
                elizaLogger.info("Executing RAG query for step", { stepId: step.id });
                
                const query: RagQuery = {
                    query: step.template,
                    focus_areas: [],
                    must_include: [],
                    must_avoid: []
                };
                
                const result = await this.executeRagQuery(query, state);
                ragResults.push(result);
                
                state = {
                    ...state,
                    text: `${state.text || ''}\n\n${result.content}`
                };
            }
    
        // Compose the context with dependencies and timeline
        const context = await this.composeStepContext(step, state, dependencyOutputs, timeline);
    
        elizaLogger.info("Step context composed", {
            stepId: step.id,
            contextLength: context.length
        });
    
        // Execute the step using anthropic client
        elizaLogger.info("Executing Anthropic request", {
            stepId: step.id,
            model: DEFAULT_MODEL,
            toolType: step.type
        });
    
        const response = await this.anthropicClient.messages.create({
            model: DEFAULT_MODEL,
            max_tokens: 4096,
            messages: [{ role: "user", content: context }],
            tools: [tools[step.type]],
            tool_choice: { type: "tool", name: this.toolNameMap[step.type] }
        });
    
        elizaLogger.info("Received Anthropic response", {
            stepId: step.id,
            responseType: typeof response,
            hasContent: !!response.content
        });
    
        // Extract and validate the result
        const output = this.extractStepResult(response);
        elizaLogger.info("Extracted step result", {
            stepId: step.id,
            outputType: typeof output,
            outputKeys: Object.keys(output)
        });
    
        const normalizedOutput = await this.normalizeStepOutput(step.type, output);
        elizaLogger.info("Normalized step output", {
            stepId: step.id,
            normalizedType: typeof normalizedOutput,
            normalizedKeys: Object.keys(normalizedOutput)
        });
    
        // Create the step result
        const result: StepResult = {
            stepId: step.id,
            type: step.type,
            output: normalizedOutput,
            metadata: {
                started_at: startTime,
                completed_at: Date.now(),
                validation: step.validation
            }
        };
    
        elizaLogger.info("Step execution completed", {
            stepId: step.id,
            executionDuration: Date.now() - startTime,
            outputType: step.type,
            success: true
        });
    
        return result;
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
            hasVoiceElements: Array.isArray(data?.voice_elements),
            hasAvoidList: Array.isArray(data?.avoid_list)
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
                ["No voice elements specified"],
            avoid_list: Array.isArray(data?.avoid_list) ?
                data.avoid_list.map(String) :
                []
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

    private async generateTweet(): Promise<TweetGenerationProcess> {
        const stateManager = new StateManager(
            await this.getBaseState('generate')
        );
        
        try {
            // 1. Planning Phase
            elizaLogger.info("Starting planning phase", {
                initialState: Object.keys(stateManager.getCurrentState())
            });
    
            const planContext = composeContext({
                state: stateManager.getCurrentState(), // This is now State type
                template: templates.planning
            });
            
            elizaLogger.info("Planning context composed", {
                context: planContext
            });
    
            const planResponse = await this.anthropicClient.messages.create({
                model: PLANNING_MODEL,
                max_tokens: 4096,
                messages: [{ role: "user", content: planContext }],
                tools: [tools.planning],
                tool_choice: { type: "tool", name: "plan_execution" }
            });
    
            elizaLogger.info("Received planning response", {
                response: planResponse
            });
    
            const plan = this.extractStepResult(planResponse);
            const homeTimeline = await this.client.getCachedTimeline() || [];
            const dryRunTweets = await this.client.getCachedDryRunTweets() || [];
            const allTweets = [...homeTimeline, ...dryRunTweets]
                .sort((a, b) => b.timestamp - a.timestamp);
    
            const timeline = await this.formatTweets(
                allTweets,
                `${stateManager.getCurrentState().agentName}'s Timeline`
            );

            stateManager.updateState({ plan });

            stateManager.updateState({ timeline });
            
    
            elizaLogger.info("Plan extracted and state updated", {
                planSteps: plan.steps.map(s => s.id),
                newStateKeys: Object.keys(stateManager.getCurrentState())
            });
    
            // 2. Step Execution Phase
            const results = new Map<string, StepResult>();
            let currentSteps = [...plan.steps];
    
            while (currentSteps.length > 0) {
                const step = currentSteps.shift();
                if (!step) break;
    
                const currentState = stateManager.getCurrentState();
                elizaLogger.info("Executing step with state", {
                    stepId: step.id,
                    stateSnapshot: currentState
                });
    
                const result = await this.executeStep(step, currentState);
                results.set(step.id, result);
    
                // Update state with new result
                stateManager.updateState({
                    [`${step.id}_result`]: result.output
                });
    
                elizaLogger.info("Step completed, state updated", {
                    stepId: step.id,
                    stepResult: result,
                    newStateKeys: Object.keys(stateManager.getCurrentState())
                });
            }
    
            const process = this.createTweetGenerationProcess(
                plan,
                results,
                this.initializeProcessMetadata()
            );
    
            elizaLogger.info("Tweet generation process created", {
                totalSteps: process.steps.length,
                finalTweet: process.final_output.tweet
            });
    
            return process;
    
        } catch (error) {
            elizaLogger.error("Tweet generation failed", {
                error: error instanceof Error ? error.message : 'Unknown error',
                finalState: stateManager.getCurrentState()
            });
            
            elizaLogger.info("Falling back to simple tweet generation");
            const simpleTweet = await this.generateSimpleTweet();
            return this.createSimpleTweetProcess(
                simpleTweet,
                this.initializeProcessMetadata()
            );
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