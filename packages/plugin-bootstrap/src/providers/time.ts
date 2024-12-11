import { IAgentRuntime, Memory, Provider, State } from "@ai16z/eliza";

const timeProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
        const currentDate = new Date();

        // Get UTC time since bots will be communicating with users around the global
        const options = {
            timeZone: "UTC",
            dateStyle: "full" as const,
            timeStyle: "long" as const,
        };
        const humanReadable = new Intl.DateTimeFormat("en-US", options).format(
            currentDate
        );

        const networkStateInfo = [
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin RON Price: $1.99, reflecting a 21.9% 30-day surge despite recent 10.1% dips (1d/7d), suggesting positive momentum with short-term volatility.',
            "[2024-12-11 08:55] [Current Ronin Network State] Ronin Pixel: DAU surged to 465,447 (+5.6% 1d), driving strong daily engagement and potentially boosting Ronin's overall network activity, though MAU declined significantly (-49.5% 30d) suggesting potential churn.",
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin Lumiterra:  MAU exploded by 1847.6% in 30 days to reach 386,045, signaling massive user growth, while DAU slightly dipped (-2.1% 1d), potentially due to onboarding challenges or content limitations.',
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin Wild Forest: While demonstrating substantial 30-day MAU growth (+184.3% to 442,863), declines in DAU (-14.8% 1d) and WAU (-13.1% 7d) raise concerns about short-term player retention.',
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin The Machines Arena: Stable DAU (121,323, +0.0% 1d) alongside marginal MAU decline (-1.4% 30d) suggests consistent engagement within a relatively stable player base for this established title.',
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin Axie Infinity: Resurgent DAU growth (+15.7% to 102,425) and positive MAU trends (+17.4% 30d) indicate renewed interest and potentially signal a successful pivot in gameplay or tokenomics.',
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin Apeiron: Despite a DAU uptick (+5.2% to 80,904), declining WAU (-12.0% 7d) and MAU (-10.6% 30d) suggest challenges in sustaining user interest and engagement.',
            "[2024-12-11 08:55] [Current Ronin Network State] Ronin Pixel HeroZ: Negative momentum across all timeframes (DAU -5.1% 1d, WAU -13.0% 7d, MAU -8.2% 30d) signals declining player engagement and raises questions about the game's long-term viability.",
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin Ragnarok: Monster World: Explosive single-day DAU growth (+145.8% to 3,279) and strong 30-day MAU gain (+341.5% to 51,066) indicate potential viral growth, though declining WAU (-12.3% 7d) requires further monitoring.',
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin Kaidro: Declining metrics across the board (DAU -1.2% 1d, WAU -0.5% 7d, MAU -10.4% 30d) point towards a shrinking user base and potential difficulties in attracting new players.',
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin Kongz: While DAU jumped significantly (+69.5% to 161), a massive WAU drop (-99.3% 7d) and enormous MAU surge (+24450.0% to 96,236) paint a complex picture, likely influenced by specific events like a promotional campaign or server issues.',
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin Network Weekly Active Users: 2,082,375 users represent a modest 0.1% weekly increase, contrasting with longer-term growth of 5.1% in 3 months and a substantial 2737.6% year-over-year expansion, suggesting sustained user engagement despite recent short-term fluctuations, positively impacting overall ecosystem growth.',
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin Network Daily Active Addresses: 3,412 addresses demonstrate a significant 75% one-day decrease and sustained declines across longer timeframes (95% down 7d, 99.1% down 90d), raising concerns about short-term user activity despite a smaller 40.9% decline YoY, potentially impacting daily transaction volume and fee generation.',
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin Network Weekly Protocol Fees: 7,126 RON (-75.1% WoW) signals a concerning decline in network utilization despite the long-term 39% yearly increase, impacting potential validator rewards and ecosystem sustainability.',
            '[2024-12-11 08:55] [Current Ronin Network State] Ronin Network Weekly Transactions: 17,439,226 (+43.9% WoW) demonstrates a resurgence in network activity, exceeding monthly growth of 129% and potentially boosting fee generation despite recent declines, contributing to long-term ecosystem health reflected in the 767.5% yearly increase.'].join('\n');

        return `The current date and time is ${humanReadable}.\n\nCurrent Network State:\n${networkStateInfo}\n\nPlease use this as your reference for any time-based operations or responses.`;
    },
};
export { timeProvider };
