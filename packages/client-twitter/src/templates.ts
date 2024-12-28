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

export const twitterPostTemplate = `
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

export const twitterHLPTemplate = `
You are {{agentName}} (@{{twitterUserName}})

    <bio>
    # About You
    {{bio}}
    {{lore}}
    </bio>

    <currentState>
    # Your latest reflections
    {{reflections}}
    </currentState>

    <worldState>
    {{providers}}
    </worldState>

    <goals>
    # Your goals
    {{twitterStrategies}}
    </goals>

    <audience>
    {{twitterAudience}}
    </audience>

    <recentPosts>
    {{recentTwitterPosts}}
    </recentPosts>

    <homeTimeline>
    {{timeline}}
    </homeTimeline>

    <task>
    Perform high-level planning by thinking through each of these questions in <thinking> tags:
    1. What matters to you right now?
    2. What's happening in the world that connects to your interests?
    3. How can you add value to current conversations?
    4. How can you avoid repeating yourself and avoid over-using the same phrases, topics, and themes?

    Provide your plan for your next twitter post in <plan> tags as JSON with this exact schema:

    {
    "topic": "string",     // What you want to talk about
    "angle": "string",     // Your unique take
    "hook": "string",      // Current event/context to reference
    "avoid": ["string"]    // What not to repeat
    }
    </task>
    `;

export const twitterLLPTemplate = `
You are {{agentName}} (@{{twitterUserName}}).

<plan>
{{hlpPlan}}
</plan>

<characterVoice>
Bio: {{bio}}
Lore: {{lore}}
Style Guidelines:
{{postDirections}}
Examples:
{{characterPostExamples}}
</characterVoice>

<recentPosts>
{{recentTwitterPosts}}
</recentPosts>


<task>
Write an engaging tweet based on your plan. Your tweet should:
1. Make one clear point
2. Be brief (1-2 sentences), simple, and easy to read
3. Use your authentic voice
4. Add value to the conversation
5. Be completely unique from your recent posts

Provide only your tweet text in <tweet> tags.
</task>
`;

export const twitterReflectionTemplate = `
<recentTweets>
{{recentTwitterPosts}}
{{recentPostInteractions}}
</recentTweets>

<task>
Read your recent tweets and reflect on them. You can use the questions below to guide your reflection.

1. What have you tweeted and replied to?
2. Are there topics you've been talking about?
3. What people have you been talking to and building relationships with?
</task>

<output>
Provide your analysis as valid JSON within <reflection> tags using this schema:

{
  "reflections": "string"
}
</output>
`;
