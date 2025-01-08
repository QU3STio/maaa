import os
import json
import pandas as pd
from typing import List, Dict, Any
import random

import time
import pytz
import sys
import argparse
from datetime import datetime, timedelta, timezone

from dune_client.client import DuneClient

import google.generativeai as genai
from google.generativeai.types import content_types

from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Get API keys from environment
DUNE_API_KEY = os.environ["DUNE_API_KEY"]
GOOGLE_API_KEY = os.environ["GOOGLE_GENERATIVE_AI_API_KEY"]


class RoninAnalytics:
    def __init__(self, dune_client):
        self.dune = dune_client

    def calculate_changes(
        self,
        df: pd.DataFrame,
        value_column: str,
        date_column: str,
        lookback_periods: List[tuple],
    ) -> Dict[str, float]:
        """
        Calculate changes over specified time periods.
        lookback_periods: List of tuples (number_of_days, period_label)
        """
        df = df.copy()
        df[date_column] = pd.to_datetime(df[date_column])
        df = df.sort_values(date_column, ascending=False)

        current_value = float(df.iloc[0][value_column])
        result = {"current": current_value}

        for days, label in lookback_periods:
            try:
                lookup_date = df.iloc[0][date_column] - timedelta(days=days)
                past_value = float(
                    df[df[date_column] <= lookup_date].iloc[0][value_column]
                )
                change = ((current_value - past_value) / past_value) * 100
                result[label] = change
            except (IndexError, ValueError):
                result[label] = None

        return result

    def format_metric_string(
        self,
        metric_name: str,
        current: float,
        changes: Dict[str, float],
        include_value: bool = True,
    ) -> str:
        """Format metric with its changes into a human readable string."""
        parts = [f"{metric_name}: {current:,.0f}"] if include_value else [metric_name]

        for period, change in changes.items():
            if period != "current" and change is not None:
                direction = "up" if change > 0 else "down"
                parts.append(f"{period} change: {abs(change):.1f}% {direction}")

        return " | ".join(parts)

    def analyze_waa(self) -> List[str]:
        """Weekly Active Addresses."""
        data = pd.DataFrame(self.dune.get_latest_result(4228167).result.rows)
        lookback_periods = [(7, "1w"), (30, "1m"), (90, "3m"), (180, "6m"), (365, "1y")]
        changes = self.calculate_changes(
            data, "users_moving_average", "time", lookback_periods
        )

        return [
            self.format_metric_string(
                "Weekly Active Users",
                changes["current"],
                {k: v for k, v in changes.items() if k != "current"},
            )
        ]

    def analyze_game_activity(self) -> List[str]:
        """Game Activity"""
        results = []
        games = self.dune.get_latest_result(4358228).result.rows

        for game in sorted(games, key=lambda x: x["num_of_accounts_1d"], reverse=True):
            results.append(
                f"{game['project']}: "
                f"DAU {game['num_of_accounts_1d']:,.0f} ({game['diff_1d']*100:+.1f}% 1d) | "
                f"WAU {game['num_of_accounts_7d']:,.0f} ({game['diff_7d']*100:+.1f}% 7d) | "
                f"MAU {game['num_of_accounts_30d']:,.0f} ({game['diff_30d']*100:+.1f}% 30d)"
            )

        return results

    def analyze_daily_addresses(self) -> List[str]:
        """Daily Active Addresses."""
        data = pd.DataFrame(self.dune.get_latest_result(4264865).result.rows)
        lookback_periods = [(1, "1d"), (7, "7d"), (30, "30d"), (90, "90d"), (365, "1y")]
        changes = self.calculate_changes(
            data, "receiving_addresses", "day", lookback_periods
        )

        return [
            self.format_metric_string(
                "Daily Active Addresses",
                changes["current"],
                {k: v for k, v in changes.items() if k != "current"},
            )
        ]

    def analyze_tvl(self) -> List[str]:
        """Total Volume Locked.."""
        data = pd.DataFrame(self.dune.get_latest_result(4228179).result.rows)
        lookback_periods = [(1, "1d"), (7, "7d"), (30, "30d"), (90, "90d"), (365, "1y")]
        changes = self.calculate_changes(data, "tvl", "date", lookback_periods)

        return [
            self.format_metric_string(
                "Total Value Locked (USD)",
                changes["current"],
                {k: v for k, v in changes.items() if k != "current"},
            )
        ]

    def analyze_fees(self) -> List[str]:
        """Protocol Fees"""
        data = pd.DataFrame(self.dune.get_latest_result(4228192).result.rows)
        lookback_periods = [(7, "1w"), (30, "1m"), (90, "3m"), (180, "6m"), (365, "1y")]
        changes = self.calculate_changes(data, "tx_fees_RON", "week", lookback_periods)

        return [
            self.format_metric_string(
                "Weekly Protocol Fees (RON)",
                changes["current"],
                {k: v for k, v in changes.items() if k != "current"},
            )
        ]

    def analyze_transactions(self) -> List[str]:
        """Transactions"""
        data = self.dune.get_latest_result(4228170).result.rows
        weekly_data = pd.DataFrame(data)
        lookback_periods = [(7, "1w"), (30, "1m"), (90, "3m"), (180, "6m"), (365, "1y")]
        changes = self.calculate_changes(
            weekly_data, "tx_count", "week", lookback_periods
        )

        latest = data[0]
        results = [
            self.format_metric_string(
                "Weekly Transactions",
                changes["current"],
                {k: v for k, v in changes.items() if k != "current"},
            ),
            f"Cumulative Stats: {latest['cumulative_transactions']:,.0f} total transactions | "
            f"{latest['cu_address_count']:,.0f} total addresses | "
            f"{latest['cu_address_count_30d']:,.0f} addresses in last 30d",
        ]

        return results

    def get_ron_price(self) -> List[str]:
        """RON Price - Current snapshot only."""
        price = float(self.dune.get_latest_result(4262272).result.rows[0]["ron_price"])
        return [f"Current RON Price: ${price:.2f}"]

    def analyze_ron_price(self) -> List[str]:
        """RON Price - Daily historical data."""
        data = pd.DataFrame(self.dune.get_latest_result(4228181).result.rows)

        lookback_periods = [(1, "1d"), (7, "7d"), (14, "14d"), (30, "30d")]

        changes = self.calculate_changes(data, "price", "time", lookback_periods)

        return [
            self.format_metric_string(
                "RON Price (USD)",
                changes["current"],
                {k: v for k, v in changes.items() if k != "current"},
            )
        ]

    def generate_knowledge_base(self) -> List[str]:
        """Generate complete knowledge base."""
        knowledge_base = []
        knowledge_base.extend(self.get_ron_price())
        knowledge_base.extend(self.analyze_ron_price())
        knowledge_base.extend(self.analyze_waa())
        knowledge_base.extend(self.analyze_daily_addresses())
        knowledge_base.extend(self.analyze_game_activity())
        knowledge_base.extend(self.analyze_tvl())
        knowledge_base.extend(self.analyze_fees())
        knowledge_base.extend(self.analyze_transactions())
        return knowledge_base


def get_llm_synthesis(metrics: List[str]) -> List[str]:
    """Generate concise, Bloomberg-style insights from Ronin metrics."""

    system_instruction = """You are a Web3 gaming influencer and data analyst specialized in blockchain gaming ecosystems, particularly Ronin Network. Your expertise spans Web3 gaming analytics, player behavior, tokenomics, and gaming market trends.

    Key Metrics Analysis Focus:
    1. Price Performance
    - Connect RON price movements to ecosystem developments
    - Highlight price strength relative to broader crypto gaming market
    - Frame price changes in context of network growth and adoption

    2. Gaming Ecosystem Health
    - Analyze each game's performance metrics (Pixel, Lumiterra, Wild Forest, The Machines Arena, Axie Infinity, etc.)
    - Compare growth rates across different games
    - Highlight how newer games are contributing to ecosystem diversity
    - Identify cross-game network effects and user behavior patterns

    3. Network Activity & Growth
    - Frame WAU/DAU metrics in context of gaming industry standards
    - Connect transaction volumes to actual gaming activities
    - Analyze user retention and growth patterns across different timeframes
    - Highlight organic growth vs promotional activity

    4. Economic Fundamentals
    - Analyze TVL trends and composition
    - Connect fee generation to ecosystem sustainability
    - Highlight validator economics and network security

    When analyzing metrics, your role is to:
    1. Identify positive trends across all measured games and metrics
    2. Frame each metric in gaming industry context
    3. Connect data to user experience and ecosystem quality
    4. Highlight cross-game network effects
    5. Compare current metrics to historical patterns
    6. Emphasize Ronin's advantages vs other gaming chains

    Your analysis must:
    - Include raw numbers to demonstrate scale
    - Analyze growth trends across all available timeframes
    - Connect each metric to others (e.g., how game activity impacts fees)
    - Frame all metrics in relation to RON price movements
    - Highlight ecosystem diversification beyond any single game
    - Connect user metrics to actual gameplay value

    Tone:
    - Professional and analytical like a Bloomberg terminal
    - Data-first but accessible to gamers
    - Confident in fundamentals
    - Forward-looking while grounded in data

    Output Format:
    - Return an array of strings
    - Each string should analyze one key metric or trend
    - Include actual numbers and growth percentages
    - Connect individual metrics to overall ecosystem health
    - No introductions - start directly with analysis

    Example Output Format:
    [Project Name] [Topic 1] [Topic 2] ... [Topic N]: RON price surged 65.6% over the last month, significantly outpacing broader crypto market gains, signaling renewed investor confidence in the Ronin ecosystem.',
    [Project Name] [Topic 1] [Topic 2] ... [Topic N]: Daily Active Addresses hit 63,513, indicating a positive daily trend (+4.6%) despite a recent 7-day decline (-11%), with volatile growth patterns across longer timeframes (+349.5% in 30 days, -83.1% in 90 days, +973.4% in 1 year) suggesting strong but fluctuating daily activity.',
    """

    model = genai.GenerativeModel(
        "gemini-1.5-pro-latest",
        system_instruction=system_instruction,
    )

    sections = {
        "Market": {
            "data": [m for m in metrics if "RON Price" in m],
            "context": "Price performance and market dynamics",
        },
        "Games": {
            "data": [
                m
                for m in metrics
                if any(
                    game in m
                    for game in [
                        "Pixel",
                        "Lumiterra",
                        "Wild Forest",
                        "The Machines Arena",
                        "Axie Infinity",
                        "Apeiron",
                        "Pixel HeroZ",
                        "Ragnarok",
                        "Kaidro",
                        "Kongz",
                    ]
                )
            ],
            "context": "Game-specific performance metrics",
        },
        "Users": {
            "data": [
                m
                for m in metrics
                if any(term in m for term in ["Active Users", "Active Addresses"])
            ],
            "context": "Network-wide user activity",
        },
        "Economics": {
            "data": [
                m
                for m in metrics
                if any(term in m for term in ["TVL", "Fees", "Transactions"])
            ],
            "context": "Economic indicators and network usage",
        },
    }

    all_insights = []

    for section, content in sections.items():
        if not content["data"]:  # Skip empty sections
            continue

        prompt = f"""Analyze these {section} metrics for the Ronin blockchain in the style of Bloomberg terminal updates. For each metric, provide a single-sentence, data-focused insight that:
        - Leads with the key number and then percentage
        - Includes relevant timeframe comparisons
        - Connects to broader ecosystem impact
        - Maintains professional, analytical tone

        Context: {content['context']}

        Metrics:
        {chr(10).join(content['data'])}

        Return each insight as a separate line, without quotes, markdown, or array notation. Focus on brevity and impact.
        """

        try:
            response = model.generate_content(prompt)

            insights = []
            for line in response.text.split("\n"):
                line = line.strip()
                if line and not any(
                    x in line.lower()
                    for x in ["```", "[", "]", "example:", "note:", "analysis:"]
                ):
                    line = line.strip("\"'")
                    insight = f"[[Current Ronin Network State] {line}"
                    insights.append(insight)

        except Exception as e:
            print(f"Error processing {section} section: {str(e)}")
            continue

    return insights

def main(client: DuneClient, model: genai.GenerativeModel):
    # Get Dune analytics insights
    ronin_analytics = RoninAnalytics(client)
    metrics = ronin_analytics.generate_knowledge_base()
    dune_insights = get_llm_synthesis(metrics)
    return dune_insights

if __name__ == "__main__":

    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    client = DuneClient(DUNE_API_KEY)

    try:
        insights = main(client, model)
        for insight in insights:
            print(insight)
    except Exception as e:
        print(f"Fatal error: {str(e)}", file=sys.stderr)
        sys.exit(1)