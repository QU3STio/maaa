import { IAgentRuntime, Memory, Provider, State } from "@ai16z/eliza";
import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Cache to store the latest analytics results
let analyticsCache = {
    data: '',
    lastUpdated: 0
};

// Update interval in milliseconds (30 minutes)
const UPDATE_INTERVAL = 30 * 60 * 1000;

async function executeAnalytics(): Promise<string> {
    return new Promise((resolve, reject) => {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const pythonScript = join(__dirname, '..', '..', '..', 'packages', 'client-twitter', 'src', 'providers', 'gemini_analytics.py');
        
        console.log('Python script path:', pythonScript);

        const python = spawn('python3', [
            pythonScript
        ]);
        
        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
            output += data.toString();
        });

        python.stderr.on('data', (data) => {
            error += data.toString();
        });

        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python script exited with code ${code}\nError: ${error}`));
                return;
            }
            resolve(output);
        });
    });
}

async function updateAnalytics() {
    try {
        const result = await executeAnalytics();
        analyticsCache.data = result;
        analyticsCache.lastUpdated = Date.now();
    } catch (error) {
        console.error('Error updating Gemini News:', error);
    }
}

// Initialize the update loop
function startUpdateLoop() {
    updateAnalytics(); // Initial update
    setInterval(updateAnalytics, UPDATE_INTERVAL);
}

// Start the update loop when the provider is imported
startUpdateLoop();

const cryptoGamingNewsProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        // If cache is empty or stale, force an update
        if (!analyticsCache.data || Date.now() - analyticsCache.lastUpdated > UPDATE_INTERVAL) {
            await updateAnalytics();
        }
        
        return analyticsCache.data || 'No Gemini News data available at the moment.';
    },
};

export { cryptoGamingNewsProvider };