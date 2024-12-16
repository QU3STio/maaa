import { TwitterPostClient } from "./post.ts";
import { TwitterSearchClient } from "./search.ts";
import { TwitterInteractionClient } from "./interactions.ts";
import { IAgentRuntime, Client, elizaLogger } from "@ai16z/eliza";
import { validateTwitterConfig } from "./enviroment.ts";
import { ClientBase } from "./base.ts";
import { roninProvider } from "./providers/ronin.ts";
import { cryptoGamingNewsProvider } from "./providers/cryptonews.ts";

class TwitterManager {
    client: ClientBase;
    post: TwitterPostClient;
    runtime: IAgentRuntime;
    search: TwitterSearchClient;
    interaction: TwitterInteractionClient;
    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
        this.client = new ClientBase(runtime);
        if (this.runtime.character.name === 'Terminator Tanuki') {
            this.runtime.providers.push(roninProvider);
            this.runtime.providers.push(cryptoGamingNewsProvider);
        }
        this.post = new TwitterPostClient(this.client, runtime);
        // this.search = new TwitterSearchClient(runtime); // don't start the search client by default
        // this searches topics from character file, but kind of violates consent of random users
        // burns your rate limit and can get your account banned
        // use at your own risk
        this.interaction = new TwitterInteractionClient(this.client, runtime);
    }
}

export const TwitterClientInterface: Client = {
    async start(runtime: IAgentRuntime) {
        await validateTwitterConfig(runtime);

        elizaLogger.log("Twitter client started");

        const manager = new TwitterManager(runtime);

        await manager.client.init();

        

        await manager.post.start();

        await manager.interaction.start();

        return manager;
    },
    async stop(_runtime: IAgentRuntime) {
        elizaLogger.warn("Twitter client does not support stopping yet");
    },
};

export default TwitterClientInterface;
