// templates.ts

export const planningTemplate = `
# CHARACTER CONTEXT
Name: {{agentName}}
Bio: {{bio}}
Lore: {{lore}}
Voice Rules: {{postDirections}}

# RECENT ACTIVITY & KNOWLEDGE
{{timeline}}
{{knowledge}}
{{providers}}

[CRITICAL GUIDELINES]
- Character voice must be perfectly matched
- Use only real metrics and facts
- Tweet must be <280 chars
- Must be unique from recent tweets
- Ground content in factual knowledge
- Stay razor-focused on one key point
- Make every word count

[AVAILABLE STEPS]
- "assessment": Analyze opportunities in context
- "generation": Create impactful tweet content
- "validation": Ensure quality and accuracy

You can:
- Add any number of steps needed
- Repeat step types for refinement
- Include validation at any point
- Request plan modifications if needed

Each step can suggest changes:
- Add new steps
- Remove existing steps
- Modify future steps
- Change dependencies

[OUTPUT STRUCTURE]
{
    "steps": [ ... ],
    "metadata": {
        "estimated_duration": number,
        "success_criteria": string[],
        "allows_modifications": boolean,
        "modification_triggers": [
            {
                "condition": string,      // When to trigger change
                "suggested_steps": string[]  // Steps to add/modify
            }
        ]
    }
}
`;

export const ragTemplate = `
# CHARACTER & CONTEXT
Name: {{agentName}}
Bio: {{bio}}
Voice: {{postDirections}}
Timeline: {{timeline}}
Knowledge: {{knowledge}}

[CRITICAL REQUIREMENTS]
- Query must target specific metrics/facts
- Focus on recent & relevant data
- Avoid any speculation or estimates
- Ensure data supports character voice

[OUTPUT FORMAT]
{
    "query": string,              // Precise search target
    "focus_areas": string[],      // Max 3 key topics
    "must_include": string[],     // Required data points
    "must_avoid": string[]        // Excluded topics
}
`;

export const assessmentTemplate = `
# CONTEXT
{{bio}}
{{knowledge}}
{{timeline}}
{{providers}}

[KEY OBJECTIVES]
- Identify highest-impact opportunities
- Focus on concrete metrics & facts
- Find voice-amplifying angles
- Ensure factual grounding

[OUTPUT FORMAT]
{
    "opportunities": [
        {
            "topic": string,
            "value": number,      // 0-5, must be ≥4
            "reason": string      // Concrete justification
        }
    ],
    "key_points": string[],      // Specific facts/metrics
    "voice_elements": string[]   // Essential character traits
}
`;

export const generationTemplate = `
# CONTEXT
Character: {{agentName}}
Bio: {{bio}}
Lore: {{lore}}
The character is feeling: {{adjectives}}
Post Directions: 
{{postDirections}}
Key Points: 
{{key_points}}
Opportunities: 
{{opportunities}}
Voice Elements: 
{{voice_elements}}
Recent Tweets: 
{{timeline}}
Example posts by {{agentName}}
{{characterPostExamples}}

[CRITICAL REQUIREMENTS]
- IT IS CRITICAL TO not repeat or reuse ANY of the same topics, phrases/patterns, metrics or content from Recent Tweets
- If there metrics were used in the last two recent tweets, then do not use any metrics
- Do not repeat the same topic from the last two recent tweets
- Consider the key points and opportunities and use them to create a unique tweet
- If you are unsure about the metrics, then do not use any metrics
- If you do use metrics, then only use them from Key Points and Opportunities
- Match character voice perfectly; use the Example posts by {{agentName}}, Bio, Lore, and Post Directions as a reference
- Follow Post Directions
- Use exact facts & metrics
- Stay under 280 chars and one sentence
- Use an engaging hook provide value to the reader
- Differ from recent tweets
- Make every word count
- One clear, impactful point
- No fluff or filler
- Write something totally unique from the recent tweets

[OUTPUT FORMAT]
{
    "tweet": string,          // The tweet text
    "rationale": string,      // Why this works
    "metrics_used": string[]  // Facts included
}
`;

export const validationTemplate = `
# REQUIREMENTS
Voice: {{postDirections}}
Facts: 
{{knowledge}}
{{providers}}


# GENERATED CONTENT
Tweet: {{generated_tweet}}

# ASSESSMENT CONTEXT
Key Points:
{{key_points}}

[VALIDATION CRITERIA]
- Voice must be perfect match
- Facts must be 100% accurate
- Content must be unique
- Impact must be clear

[OUTPUT FORMAT]
{
    "scores": {
        "voice_match": number,      // 0-5, must be ≥4
        "factual_accuracy": number  // 0-5, must be 5
    },
    "issues": string[],     // Any problems found
    "approved": boolean     // Final decision
}
`;

export const templates = {
    planning: planningTemplate,
    rag: ragTemplate,
    assessment: assessmentTemplate,
    generation: generationTemplate,
    validation: validationTemplate
};