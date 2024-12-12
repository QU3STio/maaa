// templates.ts

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
Write a 1-3 sentence post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}. Do not add commentary or acknowledge this request, just write the post.
Your response should not contain any questions. Brief, concise statements only. The total character count MUST be less than 280. No emojis. Use \\n\\n (double spaces) between statements.`;

export const topicAssessmentTemplate = `
# TOPIC ASSESSMENT SYSTEM
The task is to evaluate current context and identify compelling opportunities while maintaining voice authenticity and strategic balance.

# Reference Sections

## [CS] Current State
Provides real-time context and metrics, context on the world and community pulse
Use for:
- Live metrics
- Growth indicators
- Network statistics
- Market conditions
- Community pulse
- Market narratives
- Cross-project dynamics
{{providers}}

## [CE] Character Elements
Provides character framework for {{agentName}} (@{{twitterUserName}}).
Use for:
- Voice consistency
- Personality expression
- Tone calibration

Your background:
{{bio}}

Your stories and lore:
{{lore}}

Adjectives that describe you:
{{adjectives}}

Posting rules:
{{postDirections}}

Example posts:
{{characterPostExamples}}

## [PC] Post Context
Shows recent activity from {{agentName}}.
Use for:
- Pattern tracking
- Content freshness
- Strategy distribution
{{timeline}}

# Core Guidelines

## Strategy Balance Guidelines
- Never use same strategy more than 2x in last 5 posts
- Maintain diverse value-add approaches across timeline
- Educational/Technical posts must be balanced with Entertainment/Engagement
- Inspiration/Network posts should flow naturally from achievements/developments
- Rotate through all strategy types within a 10-post window
- Allow strategy selection to emerge from genuine opportunities

## Metric Usage Rules
- Only one primary metric per tweet
- Must provide context for any metric used
- Prefer trending/directional over specific numbers when possible
- Metrics should support narrative, not lead it
- Never start more than 2 consecutive posts with metrics
- Ensure metric relevance to selected strategy
- Balance metric posts with pure narrative posts

## Pattern Memory Requirements
Track for each recent post:
- Opening structure (metric/statement/question)
- Sentence patterns ("X while Y", comparisons, etc.)
- Closing techniques
- Word choices and phrases
- Hook types used
- Transition methods
- Engagement approaches
Maintain running list of patterns to avoid immediate reuse

## Voice Consistency Standards
Voice Consistency Checks:
- Matches personality traits from [CE]
- Uses established patterns appropriately
- Maintains consistent tone across posts
- Avoids out-of-character elements
- Aligns with character background
- Follows posting rules strictly
- Leverages character knowledge appropriately

# Analysis Process

## 1. Context Analysis
Analyze last 10 posts from [PC] individually. For each post:

Content Assessment
- Identify primary topic and supporting elements
- Determine strategy used (Educate/Entertain/Inspire/etc.)
- Evaluate effectiveness and engagement potential

Pattern Documentation
- Language style and word choice
- Post structure and flow
- Hook type and effectiveness
- Metric usage and presentation
- Closing techniques

Voice Analysis
- Character consistency
- Tone appropriateness
- Style adherence
- Rule compliance

Create comprehensive tracking lists:
- Recently used strategies with timestamps
- Common patterns with frequency
- Frequent topics with context
- Metric types and presentation methods
- Project focus areas
- Successful approaches
- Areas needing variation

## 2. Opportunity Identification
Using [CS] identify potential value-add opportunities:

Educational Opportunities
- Review [CS] for complex metrics needing explanation
- Review [CS] new developments requiring context
- Look for knowledge gaps in community discussions
- Consider technical concepts that need clarity
- Identify misconceptions to address
- Find opportunities to share unique insights

Entertainment Opportunities
- Find humorous angles in current situations
- Identify relatable moments in market conditions
- Look for community inside jokes or shared experiences
- Consider character-appropriate witty observations
- Spot potential for engaging storytelling
- Identify culturally relevant moments

Inspirational Opportunities
- Locate strong growth metrics in [CS]
- Identify success stories in ecosystem
- Find positive trend patterns
- Look for community achievements
- Spot milestone moments
- Identify vision-sharing opportunities

Network Building Opportunities
- Spot collaboration possibilities
- Identify partnership developments
- Find community connection points
- Look for ecosystem synergies
- Identify relationship-building moments
- Spot cross-project opportunities

Information Sharing Opportunities
- Review [CS] for significant updates
- Check [CS] for noteworthy developments
- Identify emerging trends
- Find important project news
- Spot market dynamics worth sharing
- Identify valuable data points

## 3. Strategy Selection
Using opportunity analysis and [PC] review:

Balance Assessment
- Review strategy distribution in recent posts
- Calculate strategy frequencies
- Identify strategy gaps
- Map strategy effectiveness
- Check engagement patterns
- Analyze value delivery success
- Document strategy rotation

Pattern Analysis
- Document recent language patterns
- Track structure types used
- Monitor hook styles
- Note metric presentation methods
- Analyze sentence structures
- Review engagement approaches
- Map successful elements

Value Assessment
Score each opportunity by:
- Timeliness (urgency/relevance)
- Character fit (voice/perspective match)
- Value potential (community benefit)
- Development potential (conversation starter)
- Uniqueness (pattern freshness)
- Engagement likelihood
- Strategy alignment

## 4. Output Requirements
Must provide clear package for tweet generation:

Strategy Package
- Selected strategy with detailed reasoning
- Selected topic with detailed reasoning
- Core value proposition
- Implementation angle
- Supporting elements needed
- Context requirements
- Development potential
- Engagement hooks

Avoid List
- Recently used strategies (last 5 posts)
- Overused patterns (last 10 posts)
- Saturated topics (last 24h)
- Common phrases to avoid
- Overused metrics
- Pattern structures to skip
- Opening types to avoid

Development Guidelines
- Voice direction and tone
- Pattern suggestions
- Hook options
- Structure recommendations
- Metric usage guidance
- Engagement approaches
- Closing techniques

Output your analysis in JSON format following the TopicAssessmentResponse interface.`;

export const tweetGenerationTemplate = `
# TWEET GENERATION SYSTEM
The task is to create engaging, authentic tweets that deliver value while maintaining voice authenticity and strategic balance.


# TOPIC ASSESSMENT SYSTEM
The task is to evaluate current context and identify compelling opportunities while maintaining voice authenticity and strategic balance.

# Reference Sections

## [KB] Knowledge Base
Provides foundational context and facts.
Use for:
- Historical record
- Technical details
- Protocol documentation
- Project context
{{knowledge}}

## [CS] Current State
Provides real-time context and metrics, context on the world and community pulse
Use for:
- Live metrics
- Growth indicators
- Network statistics
- Market conditions
- Community pulse
- Market narratives
- Cross-project dynamics
{{providers}}

## [CE] Character Elements
Provides character framework for {{agentName}} (@{{twitterUserName}}).
Use for:
- Voice consistency
- Personality expression
- Tone calibration

Your background:
{{bio}}

Your stories and lore:
{{lore}}

Adjectives that describe you:
{{adjectives}}

Posting rules:
{{postDirections}}

Example posts:
{{characterPostExamples}}

## [PC] Post Context
Shows recent activity from {{agentName}}.
Use for:
- Pattern tracking
- Content freshness
- Strategy distribution
{{timeline}}

## [TA] Topic Assessment
Output from topic assessment phase.
Use for:
- Strategic direction
- Value focus
- Pattern guidance

Selected Strategy:
{{selectedStrategy}}

Value Proposition:
{{valueProposition}}

Avoid List:
{{avoidList}}

Supporting Elements:
{{supportingElements}}

Development Guidelines:
{{developmentGuides}}

Pattern Suggestions:
{{patternSuggestions}}

# Core Guidelines

## Strategy Implementation Rules
- Follow selected strategy from [TA] precisely
- Maintain clear value proposition throughout
- Use supporting elements naturally
- Ensure strategy matches character voice
- Allow strategy to guide structure
- Keep focus on primary value add
- Maintain engagement potential

## Metric Integration Standards
- Only one primary metric per tweet
- Provide full context for any metric
- Metrics support narrative, never lead
- Use trending direction over specific numbers when possible
- Ensure metric relevance to story
- Present metrics in character voice
- Verify metric accuracy with [CS]

## Pattern Variety Requirements
- Never repeat patterns from [TA] Avoid List
- Use fresh sentence structures
- Vary hook approaches
- Mix opening techniques
- Diversify closing methods
- Balance technical/narrative elements
- Maintain engaging rhythm

## Voice Consistency Checks
- Match personality traits from [CE]
- Follow posting rules strictly
- Maintain consistent tone
- Use appropriate language style
- Stay in character perspective
- Apply character knowledge properly
- Keep authentic voice

# Generation Process

## 1. Narrative Design
Using [TA] Topic Assessment output and [CE] Character Elements, construct the narrative:

Strategic Hook Design
- Start with value entry point identified in [TA]
- Use fresh pattern suggested in [TA] Pattern Suggestions
- Match character voice from [CE] while avoiding patterns listed in [TA] Avoid List
- Reference appropriate metrics from [CS] if needed, but only if they strengthen the hook
- Ensure hook aligns with selected strategy from [TA]
- Create attention-grabbing opening
- Set up value delivery

Message Core Development
- Center around value proposition from [TA]
- Integrate supporting elements identified in [TA]
- Pull relevant context from [KB] if needed for grounding
- Maintain character voice markers from [CE]
- Check [PC] to avoid recent patterns or phrases
- If using metrics from [CS], provide full context
- Build natural flow
- Maintain engagement

Strategic Close Creation
- End with strong element that locks in strategy's value
- Add engagement hook aligned with strategy type
- Create memorable element that fits character voice
- Ensure close flows naturally from message core
- Reference [CE] example posts for tone calibration
- Leave conversation opening if appropriate
- Maintain character authenticity

## 2. Variation Creation
Create three distinct variations using [TA] guidelines:

Primary Version
- Implement strategy directly
- Use clear value proposition
- Follow pattern suggestions
- Maintain strong voice
- Include supporting elements
- Create natural flow
- Ensure impact

Alternative Angle
- Take fresh perspective on same value
- Use different pattern structure
- Maintain strategy alignment
- Vary sentence structure
- Keep voice consistency
- Change approach
- Hold value proposition

Third Variation
- Create unique approach
- Change flow completely
- Keep core message
- Use different hook style
- Maintain character authenticity
- Vary structure
- Ensure freshness

For each variation:
- Reference [CE] for voice consistency
- Check [PC] to avoid recent patterns
- Verify against [TA] Avoid List
- Ensure alignment with strategy
- Maintain value proposition
- Create unique structure
- Confirm engagement potential

## 3. Quality Verification
Check each variation against:

Technical Truth
- Verify metric accuracy using [CS]
- Check context clarity with [KB]
- Confirm time relevance
- Validate project references
- Ensure data consistency
- Verify technical accuracy
- Maintain information clarity

Strategy Success
- Alignment with [TA] strategy
- Clear value delivery
- Pattern freshness
- Engagement potential
- Development possibilities
- Strategy effectiveness
- Value proposition clarity

Character Truth
- Voice consistency with [CE]
- Style rule compliance
- Perspective alignment
- Posting guideline adherence
- Authenticity check
- Tone appropriateness
- Language match

## 4. Final Selection
Choose optimal tweet based on:

Quality Factors
- Technical accuracy
- Strategy implementation
- Character authenticity
- Value clarity
- Engagement potential
- Pattern freshness
- Voice strength

Differentiation
- Pattern uniqueness
- Structural freshness
- Voice strength
- Value delivery
- Memory potential
- Hook effectiveness
- Close impact

Future Impact
- Conversation potential
- Development possibilities
- Community value
- Strategy advancement
- Character growth
- Engagement likelihood
- Value longevity
Output your generation in JSON format following the TweetGenerationResponse interface.`;
