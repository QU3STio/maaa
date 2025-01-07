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
# Task: Generate a post in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}).
NEVER include any "@" mentions in your reply tweet.
Your tweet should be value-add and not repeat any of the same content as your other recent replies.

You MUST include an action if the current post text includes a prompt that is similar to one of the available actions mentioned here:
{{actionNames}}
Here is the current post text again. Remember to include an action if the current post text includes a prompt that asks for one of the available actions mentioned above (does not need to be exact)
{{currentPost}}
` + messageCompletionFooter;

export const twitterShouldRespondTemplate = (targetUsersStr: string) =>
    `# INSTRUCTIONS: Determine if {{agentName}} (@{{twitterUserName}}) should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are RESPOND, IGNORE and STOP.

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
    3. How can you add value to current conversations or conversations you want to start?
    4. What did you talk about recently? What topics, phrases and themes were used? Be specific.
    5. How can you avoid repeating yourself and avoid over-using the same phrases, topics, and themes?

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

<worldState>
{{providers}}
</worldState>

<characterVoice>
Style Guidelines:
{{postDirections}}
Examples:
</characterVoice>

<recentPosts>
{{recentTwitterPosts}}
</recentPosts>

<audience>
{{twitterAudience}}
</audience>

<task>
Write an engaging tweet based on your plan. Think through the following questions in <thinking> tags:
1. Will the tweet make one clear point? What is it?
2. Will the tweet be brief (1-2 sentences), extremely simple, and easy to read? It must to you audience.
3. Will the tweet use your authentic voice? It must.
4. Will the tweet have a simple hook and pay-off? It must.
5. Will the tweet be completely unique from your recent posts? It must.
6. Will the tweet avoid using any of the same phrases, topics, and themes as your recent posts? It must not.
7. How can you make the tweet fulfill each of these criteria?
8. Draft three versions of the tweet you are thinking about, each with a different angle, hook, and pay-off.

Provide only your tweet text in <tweet> tags choose one of the versions that fulfills all of the criteria.
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
4. What did you talk about recently? What topics, phrases and themes were used? Be specific.
5. How can you avoid repeating yourself and avoid over-using the same phrases, topics, and themes?
</task>

<output>
Provide your analysis as valid JSON within <reflection> tags using this schema:

{
  "reflections": "string"
}
</output>
`;

export const twitterTweetEvalTemplate = `
<proposedTweet>
{{proposedTweet}}
</proposedTweet>

<recentTweets>
{{recentTwitterPosts}}
{{recentPostInteractions}}
</recentTweets>

<task>
Review your proposed tweet and recent tweets.
1. Is the topic the same as your recent tweets? If yes, then do you present the same angle, hook, or pay-off?
3. Are you using the same phrases or themes as your recent tweets?
</task>

<output>
Finally, if you answer your yes to either question #1 or #2, then provide a 'FAIL' value, else 'PASS.' in the following JSON format:
{
  "evaluation": "FAIL|PASS"
}
Only respond with this JSON format.
</output>
`;
