import {
    postActionResponseFooter,
    messageCompletionFooter,
    shouldRespondFooter,
} from "@ai16z/eliza";

export const twitterSearchTemplate =
    `
{{timeline}}

{{providers}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{postDirections}}

{{recentPosts}}

# Task: Respond to the following post in the style and perspective of {{agentName}} (aka @{{twitterUserName}}). Write a {{adjective}} response for {{agentName}} to say directly in response to the post. don't generalize.
{{currentPost}}

IMPORTANT: Your response CANNOT be longer than 20 words.
Aim for 1-2 short sentences maximum. Be concise and direct.

Your response should not contain any questions. Brief, concise statements only. No emojis. Use \\n\\n (double spaces) between statements.

` + messageCompletionFooter;

export const twitterActionTemplate =
    `
# INSTRUCTIONS: Determine actions for {{agentName}} (@{{twitterUserName}}) based on:
{{bio}}
{{postDirections}}

Guidelines:
- Highly selective engagement
- Direct mentions are priority
- Skip: low-effort content, off-topic, repetitive

Actions (respond only with tags):
[LIKE] - Resonates with interests (9.5/10)
[RETWEET] - Perfect character alignment (9/10)
[QUOTE] - Can add unique value (8/10)
[REPLY] - Memetic opportunity (9/10)

Tweet:
{{currentTweet}}

# Respond with qualifying action tags only.` + postActionResponseFooter;

export const twitterMessageHandlerTemplate =
    `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

{{recentPosts}}

# Task: Generate a post/reply in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}) while using the thread of tweets as additional context:
Current Post:
{{currentPost}}

Thread of Tweets You Are Replying To:
{{formattedConversation}}

{{actions}}
# Task: Generate a post in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}). You MUST include an action if the current post text includes a prompt that is similar to one of the available actions mentioned here:
{{actionNames}}
Here is the current post text again. Remember to include an action if the current post text includes a prompt that asks for one of the available actions mentioned above (does not need to be exact)
{{currentPost}}
` + messageCompletionFooter;

export const twitterShouldRespondTemplate = (targetUsersStr: string) =>
    `# INSTRUCTIONS: Determine if {{agentName}} (@{{twitterUserName}}) should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are RESPOND, IGNORE and STOP.

PRIORITY RULE: ALWAYS RESPOND to these users regardless of topic or message content: ${targetUsersStr}. Topic relevance should be ignored for these users.

For other users:
- {{agentName}} should RESPOND to messages directed at them
- {{agentName}} should RESPOND to conversations relevant to their background
- {{agentName}} should IGNORE irrelevant messages
- {{agentName}} should IGNORE very short messages unless directly addressed
- {{agentName}} should STOP if asked to stop
- {{agentName}} should STOP if conversation is concluded
- {{agentName}} is in a room with other users and wants to be conversational, but not annoying.

{{recentPosts}}

IMPORTANT: For users not in the priority list, {{agentName}} (@{{twitterUserName}}) should err on the side of IGNORE rather than RESPOND if in doubt.

{{recentPosts}}

IMPORTANT: {{agentName}} (aka @{{twitterUserName}}) is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE than to RESPOND.

{{currentPost}}

Thread of Tweets You Are Replying To:

{{formattedConversation}}

# INSTRUCTIONS: Respond with [RESPOND] if {{agentName}} should respond, or [IGNORE] if {{agentName}} should not respond to the last message and [STOP] if {{agentName}} should stop participating in the conversation.
` + shouldRespondFooter;

export const oemTwitterPostTemplate = `
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
Your response should not contain any questions. Brief, concise statements only. The total character count MUST be less than {{maxTweetLength}}. No emojis. Use \\n\\n (double spaces) between statements.`;

export const twitterPostTemplate = `
You are {{agentName}} (@{{twitterUserName}})

    <bio>
    # About You
    {{bio}}
    {{lore}}
    </bio>

    <currentState>
    # Your Current State of Mind
    {{topics}}
    You are {{adjective}}
    </currentState>

    <worldState>
    {{providers}}
    </worldState>

    <goals>
    {{twitterStrategies}}
    </goals>

    <knowledge>
    # Your Available Knowledge:
    {{knowledge}}
    </knowledge>

    <audience>
    {{twitterAudience}}
    </audience>

    <postDirections>
    {{postDirections}}
    </postDirections>

    <postExamples>
    {{characterPostExamples}}
    </postExamples>

    <recentPosts>
    {{recentTwitterPosts}}
    </recentPosts>

    <homeTimeline>
    {{timeline}}
    </homeTimeline>

    <task>
    # Generating Tweet as {{agentName}} (@{{twitterUserName}})

    Think through these steps in <thinking> tags:

    0. NOVELTY ASSESSMENT
    - Carefully review your <recentPosts> to identify common and repeating goals, patterns, or themes.
    - Write out a list of the most recent topics, phrases, and words you've used in your recent posts (be specific).
    - Keep this list in mind as you generate your next post.

    1. CHOOSING A GOAL
    - Review details in <bio> <currentState> to understand who you are, what you are feeling, and what you want to achieve.
    - Review details in <homeTimeline> <worldState> to understand what's going on around you.
    - Choose ONE goal from <goals> to communicate with your <audience> based on the above.

    2. INSPIRATION
    - Identify the most relevant, recent, and interesting event or data point from <worldState> or <homeTimeline>.
    - Is it new, timely, and aligns with your persona’s perspective?

    3. AUDIENCE CONNECTION
    - Who cares most about this angle?
    - Present it in a short, punchy way that showcases your insider edge.
    - Verify you haven't used this angle or phrasing recently.

    4. AUTHENTICITY
    - Check <bio> and <postDirections> for style.
    - Check your tone against recent posts to ensure uniqueness.

    5. FACT VERIFICATION
    - Only use data from <worldState> or <homeTimeline>. If unsure, leave it out.
    - Keep it accurate, brief, and impactful.

    Based on your thinking, write one impactful tweet in <tweet> tags:
    - one or two sentences max
    - no filler words, no rhetorical questions
    - no referencing <postExamples> data
    - reflect your persona as defined in <postDirections> and <bio>

    </task>
    `;
