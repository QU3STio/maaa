import { elizaLogger } from "@ai16z/eliza";
import { spawn } from "child_process";
import { Memory, IAgentRuntime } from "@ai16z/eliza";
import { MemoryManager } from "@ai16z/eliza";

/**
 * Executes a Python script and returns its output as an array of strings
 * @param pythonScriptPath - Path to the Python script to execute
 * @returns Promise<string[]> Array of output lines from the Python script
 */
export const executePythonScript = async (
    pythonScriptPath: string
): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        elizaLogger.info(`Executing Python script: ${pythonScriptPath}`);
        const python = spawn(process.env.PYTHON_PATH, [pythonScriptPath]);

        let output = "";
        let error = "";

        python.stdout.on("data", (data) => {
            output += data.toString();
        });

        python.stderr.on("data", (data) => {
            error += data.toString();
        });

        python.on("close", (code) => {
            if (code !== 0) {
                elizaLogger.error(`Python script error: ${error}`);
                reject(
                    new Error(
                        `Python script failed with code ${code}: ${error}`
                    )
                );
                return;
            }
            try {
                const results = output
                    .trim()
                    .split("\n")
                    .filter((line) => line.length > 0);
                resolve(results);
            } catch (e) {
                reject(new Error(`Failed to parse Python output: ${e}`));
            }
        });
    });
};

/**
 * Interface for cached data structure
 */
interface CachedData {
    createdAt: number;
    insights: string[];
}

/**
 * Checks if cached data is still valid based on TTL
 * @param cachedData - The cached data to check
 * @param ttlMs - Time to live in milliseconds
 * @returns boolean indicating if cache is valid
 */
export const isCacheValid = (
    cachedData: CachedData,
    ttlMs: number
): boolean => {
    return Date.now() - cachedData.createdAt < ttlMs;
};

/**
 * Retrieves cached insights from memory if valid, otherwise returns null
 * @param memoryManager - MemoryManager instance
 * @param roomId - Room ID to check cache for
 * @param ttlMs - Time to live in milliseconds
 * @returns Promise<string[] | null> Cached insights or null if invalid/missing
 */
export const getCachedInsights = async (
    memoryManager: MemoryManager,
    roomId: `${string}-${string}-${string}-${string}-${string}`,
    ttlMs: number
): Promise<string[] | null> => {
    elizaLogger.info("Checking cache...");
    const recentData = await memoryManager.getMemories({
        roomId,
        count: 1,
    });

    if (recentData.length > 0) {
        elizaLogger.info("Found cached data, checking age...");
        const data = JSON.parse(recentData[0].content.text) as CachedData;

        if (isCacheValid(data, ttlMs)) {
            elizaLogger.info("Using cached data (within TTL)");
            return data.insights;
        }
        elizaLogger.info("Cached data too old, fetching fresh data...");
    }

    return null;
};

/**
 * Stores insights in memory cache
 * @param memoryManager - MemoryManager instance
 * @param runtime - Runtime instance
 * @param message - Memory message
 * @param insights - Insights to cache
 */
export const cacheInsights = async (
    memoryManager: MemoryManager,
    runtime: IAgentRuntime,
    message: Memory,
    insights: string[]
): Promise<void> => {
    elizaLogger.info("Storing insights in memory...");
    const cacheData: CachedData = {
        createdAt: Date.now(),
        insights,
    };

    await memoryManager.createMemory({
        roomId: message.roomId,
        agentId: runtime.agentId,
        userId: message.userId,
        content: { text: JSON.stringify(cacheData) },
        createdAt: Date.now(),
    });
    elizaLogger.info("Successfully stored insights in memory");
};

/**
 * Default TTL for cached data (30 minutes)
 */
export const DEFAULT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds
