import { MemoryManager, IAgentRuntime, elizaLogger } from "@ai16z/eliza";
import type { Memory, Provider } from "@ai16z/eliza";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
    executePythonScript,
    getCachedInsights,
    cacheInsights,
    DEFAULT_CACHE_TTL,
} from "./utils";

const duneMetricsRoninProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory): Promise<string> => {
        try {
            elizaLogger.info("Starting Dune metrics provider...");

            const memoryManager = new MemoryManager({
                runtime,
                tableName: "duneMetricsRonin",
            });

            // Check cache
            const cachedInsights = await getCachedInsights(
                memoryManager,
                message.roomId,
                DEFAULT_CACHE_TTL
            );
            if (cachedInsights) {
                return cachedInsights.join("\n");
            }

            // Get Python script path
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const pythonScript = join(
                __dirname,
                "..",
                "..",
                "..",
                "packages",
                "client-twitter",
                "src",
                "providers",
                "scripts",
                "dune_metrics_ronin.py"
            );

            // Execute Python script
            const insights = await executePythonScript(pythonScript);
            elizaLogger.info("Successfully fetched metrics from Python script");

            // Store in memory
            await cacheInsights(memoryManager, runtime, message, insights);

            // Return formatted insights
            return insights.join("\n");
        } catch (error) {
            console.error("Error in Dune metrics provider:", error);
            return "Unable to fetch Ronin metrics at this time.";
        }
    },
};

export { duneMetricsRoninProvider };
