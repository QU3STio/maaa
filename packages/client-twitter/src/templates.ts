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

export const topicAssessmentTemplate = `
# TOPIC ASSESSMENT SYSTEM

Initial Evaluation Questions:
- What opportunities exist in the current context?
- What unique value can {{agentName}} provide now?
- How can we maintain authenticity while adding fresh perspective?

# 1. CONTEXT MAPPING

## [CS] Current State Analysis
Key Questions:
- What significant developments or discussions are happening?
- Which narratives are emerging or shifting?
- What opportunities arise from current context?
- Where are the gaps in current discussions?

Current Environment Analysis:
1. Real-time Updates
   - Breaking news
   - Community discussions
   - Market developments
   - Project announcements

2. Metric Synthesis
   - Key performance indicators
   - Growth trends
   - System health
   - Market activity

3. Social/Cultural Context
   - Community sentiment
   - Notable discussions
   - Cultural moments
   - Emerging narratives

Current Environment:
{{providers}}

**Context Mapping Summary:**
From the above, identify the most relevant developments, shifts in narrative, and emerging opportunities that could inform the next steps. Note down any significant trends, sentiment shifts, or knowledge gaps that {{agentName}} can address.

## [CE] Character Elements
Voice Questions:
- How would {{agentName}} naturally view current events?
- Which aspects of their character are most relevant now?
- What unique perspective can they authentically add?

About {{agentName}}:
Background: {{bio}}

Stories and Lore: 
{{lore}}

Key Traits: {{adjectives}}

Post Directoins andVoice Rules: 
{{postDirections}}

Reference Posts by {{agentName}}: 
{{characterPostExamples}}

**Character Elements Summary:**
Determine which character traits, backstory elements, and voice characteristics should shape the chosen angle. Pinpoint unique viewpoints and authentic elements that can make {{agentName}}’s contribution stand out.

## [PC] Previous Post Context Analysis
Pattern Questions:
- What types of content have we recently shared?
- Which approaches and topics need rest?
- What content areas are underexplored?
- How can we maintain voice while adding variety?

Most Recent Posts by {{agentName}} (@{{twitterUserName}}):
{{timeline}}

Previous Post Context Review:
- Content types and themes
- Voice patterns and tones
- Topics and perspectives
- Engagement approaches

Areas to Avoid:
- Recently used topics/angles
- Similar narrative approaches
- Repeated patterns
- Overused elements

**Previous Post Context Summary:**
Identify which recent themes to avoid, ensuring no redundancy. Highlight any open angles or narrative threads that could be advanced. Note the content areas that remain underexplored and consider how they might align with the current context and character strengths.

# 2. OPPORTUNITY MAPPING
Building on context and recent activity analysis, evaluate:

Value Questions:
- What compelling narratives emerge from current context?
- Which perspectives need more development?
- What unique angles align with character voice?
- How can we advance ongoing discussions?

Content Categories:
1. Information Value
   - New insights or perspectives
   - Context and understanding
   - Novel interpretations
   - Avoid: Basic repetition, obvious takes

2. Community Value
   - Cultural contributions
   - Shared experiences
   - Relationship building
   - Avoid: Forced engagement, inauthentic connection

3. Strategic Value
   - Long-term narrative development
   - Perspective shaping
   - Position establishment
   - Avoid: Generic statements, shallow takes

Pattern Elements:
- Opening approaches
- Structure variation
- Tone modulation
- Engagement hooks

**Opportunity Mapping Summary:**
From the insights above, pinpoint the specific narrative threads worth pursuing. Prioritize potential angles that:
- Provide fresh insight (Information Value)
- Deepen connection with the community (Community Value)
- Advance long-term narrative arcs or position {{agentName}} uniquely (Strategic Value)

Note which angles fit the character’s voice and avoid recently used patterns.

# 3. STRATEGY DEVELOPMENT
Using identified opportunities:

Selection Questions:
- Which angle best serves the moment (based on identified context and gaps)?
- How can {{agentName}} deliver unique value informed by their character traits and past posts?
- What's the most natural, authentic contribution?
- How does this build on recent activity and avoid repetitive patterns?

Content Requirements:
- Clear main point
- Strong context linkage
- Authentic voice
- Fresh perspective

Avoid List (Reiterated):
- Recent approaches from [PC]
- Common patterns from [PC]
- Expected takes
- Forced angles

**Decision Path:**
Explicitly reference which narratives or insights from [CS], [CE], and [PC] led you to select a particular angle. For example, “Due to emerging market shifts identified in [CS], combined with {{agentName}}’s unique perspective from [CE], and the underexplored angle from [PC], we choose to focus on…”

**Strategy Development Summary:**
Finalize a single angle or narrative thread that logically follows from the previous sections. Confirm that it differentiates from recent patterns and leverages character authenticity.

# 4. OUTPUT FORMATION
Building final strategy:

Assessment Questions:
- Does this chosen angle feel authentic to {{agentName}} as understood from [CE]?
- Are we adding real value identified in [Opportunity Mapping]?
- How does this advance broader narratives or address gaps noted in [CS] and [PC]?
- Will this resonate genuinely with the community context from [providers]?

Topic Selection:
1. Primary Focus:
   - Main point/observation
   - Approach angle
   - Unique perspective (tie back to character, context, and avoided areas)

2. Supporting Elements:
   - Relevant context (from [CS])
   - Character elements (from [CE])
   - Value delivery (information, community, strategic)

3. Structural Approach:
   - Opening style (novel hook or tone)
   - Content flow (clear narrative progression)
   - Closing element (conclude with authenticity and impact)

**Encourage Prioritization:**
If multiple topics qualify, choose the one that:
- Best aligns with long-term narrative arcs (Strategic Value)
- Adds unique insight (Information Value)
- Feels truly authentic to {{agentName}} (Character Assessment)

Strategy Package:
1. Topic: [Specific subject chosen]
2. Angle: [Perspective tied to character voice and current context]
3. Value: [Distinct contribution aligning with identified Value Categories]
4. Voice: [Character elements integrated: tone, style, background]
5. Pattern: [Chosen structural approach and avoided patterns noted]
6. Impact: [Intended effect on audience, narrative, and positioning]

Avoid in Execution:
- Forced elements
- Unnatural voice
- Common patterns
- Generic approaches
- Predictable takes

**Final Validation Check:**
Reassess the chosen strategy against initial evaluation questions:
- Does it address the identified opportunities?
- Does it leverage {{agentName}}’s unique perspective?
- Is it both authentic and fresh?

**JSON Output Guidance:**
Produce a JSON response following the TopicAssessmentResponse interface.  
{
  "topic": "selected_topic_here",
  "angle": "chosen_angle_here",
  "value": "articulated_value_here",
  "voice": "description_of_character_voice_elements",
  "pattern": "description_of_structural_approach",
  "impact": "intended_effect_on_audience",
  "rationale": {
    "context_based_decision": "explanation_of_how_this_topic_and_angle_were_chosen_based_on_previous_sections",
    "avoided_elements": "list_of_recently_used_or_inauthentic_approaches_not_chosen",
    "authenticity_check": "confirmation_that_voice_and_perspective_match_agentName"
  }
}`;


export const tweetGenerationTemplate = `
# TWEET GENERATION SYSTEM

Primary Task:
Leverage the final topic assessment ([TA]), knowledge base ([KB]), and additional context to create an authentic, valuable, and contextually relevant tweet as {{agentName}} (@{{twitterUserName}}).

[TA] reflects key insights from:
- Context State [CS]
- Character Expression [CE]
- Previous Post Context [PC]

[KB]:
Ground your tweet using relevant factual information.
{{knowledge}}

Guiding Principles:
- The tweet must directly reflect the selected topic, angle, and value identified in [TA].
- Maintain authenticity by integrating character voice elements from primarily [TA] and secondarily [CS].
- Respect context insights from primarily [TA] and secondarily [CS].
- Avoid recently used patterns, topics, or styles noted in primarily [TA] and secondarily [PC].
- Critically understand the dates of events and facts from [KB] and ensure temporal consistency.

# 1. INPUT SYNTHESIS

[TA]
- Selected Topic: {{selectedTopic}}
- Selected Angle: {{selectedAngle}}
- Selected Value: {{selectedValue}}
- Selected Voice Elements: {{selectedVoiceElements}}
- Selected Pattern: {{selectedPattern}}
- Intended Impact: {{intendedImpact}}
- Background Snippets: {{characterBackground}}
- Core Stories: {{characterLore}}
- Key Traits: {{characterTraits}}
- Voice Rules: {{voiceRules}}
- Topics to Avoid: {{avoidTopics}}
- Patterns to Avoid: {{avoidPatterns}}
- Approaches to Avoid: {{avoidApproaches}}

[CS]
{{Providers}}

[CE]
About {{agentName}}
Background: {{bio}}

Stories and Lore: 
{{lore}}

Key Traits: {{adjectives}}

Post Directoins andVoice Rules: 
{{postDirections}}

Reference Posts by {{agentName}}: 
{{characterPostExamples}}

[PC]
{{timeline}}

Critical Checks:
- Confirm the chosen topic and angle align with {{selectedTopic}} and {{selectedAngle}}.
- Ensure the tweet’s message delivers the {{selectedValue}}.
- Integrate character voice per {{selectedVoiceElements}}, {{characterTraits}}, and {{voiceRules}}.
- Incorporate any relevant real-time context from [CS] that supports the chosen angle, unless previously referenced in [PC].
- Avoid elements listed in {{avoidTopics}}, {{avoidPatterns}}, and {{avoidApproaches}}.

# 2. CONTENT FRAMEWORK
Constructing the Tweet:
1. Opening Hook:
   - Start with a statement or observation that aligns with {{selectedAngle}} and feels natural given {{characterBackground}} and {{characterLore}}.
   - Consider a subtle reference to context from [CS] if it enhances relevance.

2. Core Message:
   - Clearly express the main insight reflecting {{selectedValue}} linked to the {{selectedTopic}} without naming the topic directly if requested.
   - Ensure it advances the narrative or perspective identified in [TA].

3. Supporting Detail:
   - Add a fact or subtle hint (from {{contextualFacts}}) to lend credibility and depth.
   - Reinforce authenticity by reflecting {{characterTraits}} and staying within {{voiceRules}}.

4. Closing Element:
   - Conclude with a tone or phrase that aligns with the intended impact ({{intendedImpact}}).
   - No questions, no emojis, concise and final.

# 3. VARIATION EXPLORATION
Generate Three Variations:
- Version A (Primary Approach):  
  *Directly aligned with the selected strategy ({{selectedTopic}}, {{selectedAngle}}, {{selectedValue}}), standard structure.*

- Version B (Alternative Angle):  
  *Same core message but vary the tone or structure slightly within allowed voice rules, still avoiding {{avoidTopics}}, {{avoidPatterns}}, {{avoidApproaches}}.*

- Version C (Creative Take):  
  *A more unique phrasing or ordering while maintaining core authenticity and value. Consider a different opening style or narrative twist that still respects all constraints.*

For Each Variation:
- Verify that it is under 2 sentences.
- Maintain voice authenticity and no forbidden elements.
- No explicit reference to the topic if instructed to avoid it.
- Check consistency with {{selectedVoiceElements}} and {{voiceRules}}.

# 4. REFINEMENT & SELECTION
Validate Each Variation:
- Confirm factual accuracy (based on {{contextualFacts}}).
- Ensure narrative alignment with {{selectedAngle}} and {{selectedValue}}.
- Check for voice authenticity against {{characterTraits}} and {{voiceRules}}.
- Confirm distinctness from recently used patterns in {{avoidPatterns}}.

Select the Best Version:
- Which variation most faithfully executes the chosen strategy from [TA]?
- Which delivers the clearest value ({{selectedValue}}) and impact ({{intendedImpact}})?
- Which feels the most natural and authentic to the character, given {{characterBackground}} and {{characterLore}}?
- Which feels the most differentiated 

# 5. FINAL OUTPUT
Produce a JSON response following the TweetGenerationResponse interface:
- Include the selected tweet text.
- Reference the chosen angle, topic, and value.
- Briefly explain how this version respects the constraints (e.g., voice, authenticity, avoidance of patterns).
- Confirm its alignment with the final strategy package from [TA].
`;
