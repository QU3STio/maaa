export const twitterSimplePostTemplate = `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

# Task: Generate a post in the voice and style and perspective of {{agentName}} @{{twitterUserName}}.
Write a 1 sentence post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}. Do not add commentary or acknowledge this request, just write the post.
Your response should not contain any questions. Brief, concise statements only. The total character count MUST be less than 280. No emojis. Use \\n\\n (double spaces) between statements.`;

export const baseValidation = `
# VALIDATION REQUIREMENTS

Quality Metrics:
- Relevance: How well does this align with the goal?
- Authenticity: Does this match character voice/expertise?
- Value: Does this add meaningful insight?
- Coherence: Does this build logically on previous steps?

Check for:
1. Required fields present and properly formatted
2. Values within expected ranges/formats
3. Logical consistency with previous steps
4. Character voice alignment

Error Cases to Handle:
- Missing required data
- Invalid format/structure
- Logical inconsistencies
- Voice/character misalignment
`;

export const planningTemplate = `
[CRITICAL WARNING]
Return ONLY this structure:
{
  "steps": [...],
  "validation": {...},
  "error_handling": {...},
  "metadata": {...}
}
DO NOT wrap in 'input' or 'properties' objects.

# TWEET GENERATION PLANNING

[Character Context]
Name: {{agentName}}
Twitter: @{{twitterUserName}}
Background: {{bio}}
Core Knowledge: {{knowledge}}
Personality: {{adjectives}}
Voice Rules: {{postDirections}}

[Environmental Context]
Current Landscape: {{providers}}
Recent Activity: {{timeline}}

You are a tweet planning system. Design a custom sequence of steps that will produce the best possible tweet. You can:
- Include multiple assessment steps
- Add refinement or revision steps
- Include validation at any point
- Add extra research steps when needed
- Loop back to previous step types if improvements are needed

[AVAILABLE STEP TYPES]
- "assessment": Analyze context, opportunities, or results
- "rag": Gather knowledge or verify information
- "strategy": Develop or refine content strategy
- "generation": Create or improve content
- "validation": Validate at any stage
- "planning": Plan or adjust the approach

[VALIDATION REQUIREMENTS]
Each step must include proper validation structure:
{
    "technical_checks": {
        "input_complete": boolean,
        "format_valid": boolean,
        "dependencies_met": boolean,
        "schema_valid": boolean
    },
    "character_alignment": {
        "voice_score": number,      // 0-5 only
        "expertise_score": number,  // 0-5 only
        "authenticity_score": number // 0-5 only
    },
    "value_assessment": {
        "information_value": number,  // 0-5 only
        "community_value": number,    // 0-5 only
        "strategic_value": number     // 0-5 only
    },
    "risk_evaluation": {
        "identified_risks": string[],          // MIN 1 item
        "mitigation_suggestions": string[]     // MIN 1 item
    }
}

[VALIDATION RULE]
Risk evaluation arrays must NEVER be empty. If no risks exist, include at least:
"identified_risks": ["No significant risks identified"],
"mitigation_suggestions": ["Continue monitoring for emerging risks"]

[ERROR HANDLING REQUIREMENTS]
Each error_handling object must include:
{
    "retry_strategy": {
        "max_attempts": number,        // 2-5 only
        "conditions": string[]         // MIN 1 specific condition like "voice_score < 4"
    },
    "fallback_options": string[],      // MIN 1 specific option
    "recovery_steps": string[]         // MIN 1 specific step
}

[RESPONSE STRUCTURE]
Return a direct object (NO 'input' or 'properties' wrappers):
{
    "steps": [
        {
            "id": string,              // Unique identifier
            "type": string,            // One of the step types above
            "template": string,        // Step instructions
            "purpose": string,         // Clear goal
            "requires_rag": boolean,
            "dependencies": string[],  // IDs of required previous steps
            "validation": {
                // Validation structure as above
            },
            "error_handling": {
                // Error handling structure as above
            },
            "metadata": {
                "estimated_duration": number,
                "required_context": string[],    // MIN 1 item
                "success_criteria": string[]     // MIN 1 specific criterion
            }
        }
    ],
    "validation": {
        // Same validation structure as steps
    },
    "error_handling": {
        // Same error_handling structure as steps
    },
    "metadata": {
        "estimated_duration": number,
        "required_context": string[],    // MIN 1 item
        "success_criteria": string[]     // MIN 1 specific criterion
    }
}

[CRITICAL REQUIREMENTS]
1. ALL array fields must contain at least 1 item
2. ALL number scores must be between 0-5
3. ALL error conditions must be specific and testable
4. ALL technical checks must include all required fields
5. NO empty or null fields allowed
6. Dependencies must reference valid step IDs
7. Return direct object with NO wrapper objects

Design a plan that will create the best possible tweet, using whatever steps and sequence you determine are necessary.
`;

export const ragTemplate = `
# KNOWLEDGE RETRIEVAL REQUEST

[Step Context]
Purpose: {{stepPurpose}}
Knowledge Needs: {{knowledgeNeeds}}
Current Understanding: {{currentContext}}

[Character Expertise]
Core Knowledge: {{knowledge}}
Background: {{bio}}
Current Focus: {{selectedTopic}}

[Execution Context]
Prior Steps: {{dependencyOutputs}}
Gathered Insights: {{priorInsights}}
Goal: {{objective}}

Generate knowledge query:

1. Query Formation:
- Target specific knowledge gaps
- Consider expertise context
- Include temporal bounds
- Specify format expectations

2. Relevance Criteria:
- Must include technical/factual elements
- Should align with character expertise
- Must be temporally appropriate
- Should build on existing knowledge

3. Success Metrics:
- Information completeness
- Technical accuracy
- Expertise alignment
- Usability for next steps

${baseValidation}

Output Format:
{
  "query": string,
  "focus_areas": string[],
  "expected_use": string,
  "relevance_criteria": {
    "mustHave": string[],
    "niceToHave": string[],
    "avoid": string[]
  },
  "validation": {
    "completeness_checks": string[],
    "accuracy_requirements": string[],
    "relevance_metrics": string[]
  }
}
`;

export const initialAssessmentTemplate = `
# INITIAL ASSESSMENT

[Base Context]
${baseValidation}

[Current Environment]
Landscape: {{providers}}
Timeline: {{timeline}}
Recent Activity: {{recentActivity}}

[Character Foundation]
Background: {{bio}}
Expertise: {{knowledge}}
Voice: {{postDirections}}

Analyze current context:

1. Opportunity Identification:
- Emerging discussions
- Knowledge gaps
- Unique perspective opportunities
- Value addition potential

2. Character Alignment:
- Natural interest areas
- Expertise relevance
- Voice authenticity potential
- Authentic engagement angles

3. Strategic Value:
- Community needs
- Discussion advancement
- Knowledge contribution
- Narrative development

Output Format:
{
  "opportunities": {
    "identified": Array<Opportunity>,
    "prioritization": {
      "criteria": string[],
      "rankings": Record<string, number>
    }
  },
  "knowledge_needs": {
    "gaps": string[],
    "verification_needs": string[],
    "context_requirements": string[]
  },
  "character_alignment": {
    "natural_angles": string[],
    "voice_considerations": string[],
    "expertise_utilization": string[]
  }
}
`;

export const strategyTemplate = `
# STRATEGY DEVELOPMENT

[Current Understanding]
Retrieved Knowledge: {{retrievedKnowledge}}
Identified Opportunities: {{opportunities}}
Character Alignment: {{characterAlignment}}

[Execution Context]
Prior Steps: {{dependencyOutputs}}
Current Focus: {{selectedFocus}}

${baseValidation}

Develop content strategy:

1. Angle Selection:
- Evaluate opportunities
- Consider knowledge utilization
- Ensure character alignment
- Validate uniqueness

2. Structure Planning:
- Message architecture
- Key points placement
- Flow development
- Impact optimization

3. Voice Integration:
- Character trait utilization
- Expertise demonstration
- Authentic perspective
- Natural engagement

Output Format:
{
  "selected_strategy": {
    "angle": string,
    "rationale": string,
    "key_points": string[],
    "structure": {
      "opening": string,
      "development": string,
      "conclusion": string
    }
  },
  "voice_plan": {
    "traits_to_emphasize": string[],
    "expertise_integration": string,
    "tone_guidance": string
  },
  "validation_criteria": {
    "authenticity_checks": string[],
    "impact_measures": string[],
    "uniqueness_validators": string[]
  }
}
`;

export const contentGenerationTemplate =`
# CONTENT GENERATION

[Core Context]
Character: {{agentName}}
Background: {{bio}}
Voice Guidelines: {{postDirections}}

[Strategic Input]
Recent Knowledge: {{retrievedKnowledge}}
Selected Strategy: {{selectedStrategy}}
Opportunities: {{opportunities}}

[Examples & Guidelines]
{{characterPostExamples}}

[Your Most Recent Tweets]
{{timeline}}

Generate tweet variations that:
1. Incorporate insights from Recent Knowledge
2. Follow strategic direction
3. Match character voice and style
4. Stay within 280 characters
5. Provide unique perspectives on the information
6. Are totally unique from Your Most Recent Tweets

For each variation:
- Focus on key insights from retrieved knowledge
- Maintain authentic voice
- Add value to community
- Consider impact and engagement

Output Format:
{
  "variations": [
    {
      "content": string,    // The actual tweet text
      "rationale": string,  // Why this variation works
      "strengths": string[],
      "risks": string[]
    }
  ],
  "evaluations": {
    "authenticity_scores": Record<string, number>,
    "impact_predictions": Record<string, number>,
    "risk_assessments": Record<string, string[]>
  },
  "recommendation": {
    "selected_version": string,
    "justification": string,
    "confidence_score": number
  }
}`;

export const finalValidationTemplate = `
# FINAL VALIDATION

[Content Context]
Selected Content: {{selectedContent}}
Generation Process: {{processMetadata}}
Strategy Alignment: {{strategyAlignment}}

[Quality Requirements]
Character Voice: {{voiceRequirements}}
Value Delivery: {{valueMetrics}}
Impact Goals: {{impactMetrics}}

${baseValidation}

Comprehensive validation:

1. Technical Validation:
- Character count
- Format requirements
- Structural integrity
- Technical accuracy

2. Character Alignment:
- Voice authenticity
- Expertise utilization
- Perspective consistency
- Natural engagement

3. Value Assessment:
- Information value
- Community contribution
- Discussion advancement
- Impact potential

4. Risk Evaluation:
- Content risks
- Voice deviation
- Value dilution
- Impact reduction

Output Format:
{
  "validation_results": {
    "technical_checks": Record<string, boolean>,
    "character_alignment": {
      "voice_score": number,
      "expertise_score": number,
      "authenticity_score": number
    },
    "value_assessment": {
      "information_value": number,
      "community_value": number,
      "strategic_value": number
    },
    "risk_evaluation": {
      "identified_risks": string[],
      "mitigation_suggestions": string[]
    }
  },
  "final_recommendation": {
    "approve": boolean,
    "changes_needed": string[],
    "confidence_score": number
  }
}
`;

export interface TemplateMap {
    planning: typeof planningTemplate;
    rag: typeof ragTemplate;
    initialAssessment: typeof initialAssessmentTemplate;
    strategy: typeof strategyTemplate;
    contentGeneration: typeof contentGenerationTemplate;
    finalValidation: typeof finalValidationTemplate;
}

export const templates: TemplateMap = {
    planning: planningTemplate,
    rag: ragTemplate,
    initialAssessment: initialAssessmentTemplate,
    strategy: strategyTemplate,
    contentGeneration: contentGenerationTemplate,
    finalValidation: finalValidationTemplate
};