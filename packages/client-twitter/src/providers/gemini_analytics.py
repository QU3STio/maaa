import os
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List
from google import genai
from google.generativeai.types import content_types
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")


def should_run(lockfile_path: str, interval_minutes: int = 30) -> bool:
    """
    Check if enough time has passed since the last run.

    Args:
        lockfile_path: Path to the lockfile
        interval_minutes: Minimum minutes between runs

    Returns:
        bool: True if enough time has passed, False otherwise
    """
    try:
        if not os.path.exists(lockfile_path):
            return True

        with open(lockfile_path, "r") as f:
            data = json.load(f)
            last_run = datetime.fromisoformat(data["last_run"])
            last_data = data.get("last_data", [])

        # Check if enough time has passed
        time_passed = datetime.now() - last_run
        return time_passed > timedelta(minutes=interval_minutes)

    except (json.JSONDecodeError, KeyError, ValueError):
        # If there's any error reading the file, assume we should run
        return True


def update_lockfile(lockfile_path: str, news_data: List[str]) -> None:
    """Update the lockfile with current timestamp and data."""
    data = {"last_run": datetime.now().isoformat(), "last_data": news_data}

    # Ensure directory exists
    os.makedirs(os.path.dirname(lockfile_path), exist_ok=True)

    with open(lockfile_path, "w") as f:
        json.dump(data, f)


def get_cached_data(lockfile_path: str) -> List[str]:
    """Retrieve the last cached data from the lockfile."""
    try:
        with open(lockfile_path, "r") as f:
            data = json.load(f)
            return data.get("last_data", [])
    except (json.JSONDecodeError, KeyError, ValueError, FileNotFoundError):
        return []


def get_crypto_gaming_news() -> List[str]:
    """Fetch and process latest crypto gaming news using Gemini."""
    _client = genai.Client(
        http_options={"api_version": "v1alpha"}, api_key=GOOGLE_API_KEY
    )
    _model = "gemini-2.0-flash-exp"

    yesterday = (datetime.now() - timedelta(days=1)).strftime("%B %d %Y")

    search_tool = {"google_search": {}}
    games_chat = _client.chats.create(model=_model, config={"tools": [search_tool]})

    prompt = f"""Give me the latest developments and headlines for the following categories since {yesterday}:
    1. Crypto Gaming
    2. Web3 Gaming
    3. General Crypto Market Updates

    Format as bullet points with the category prefix [Category]. Include specific details like numbers, percentages, and project names when available.
    Be concise and focus on significant developments only."""

    try:
        response = games_chat.send_message(prompt)
        news_insights = []
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M")

        # Get the raw text content from the response
        raw_text = response.candidates[0].content.parts[0].text

        # Split the text into sections based on category headers
        sections = raw_text.split("\n\n")

        for section in sections:
            lines = section.split("\n")
            current_category = None

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # Check if this is a category header
                if line.startswith("**[") and line.endswith("]**"):
                    current_category = line.replace("**[", "").replace("]**", "")
                    continue

                # Process bullet points
                if line.startswith("*"):
                    # Remove bullet point and any markdown formatting
                    content = line.replace("*", "").strip()
                    # Remove any remaining markdown formatting for bold text
                    content = content.replace("**", "")

                    if current_category:
                        insight = f"[{current_time}] [{current_category}] {content}"
                        news_insights.append(insight)

        return news_insights
    except Exception as e:
        print(f"Error fetching crypto gaming news: {str(e)}")
        return []


def rate_limited_main(interval_minutes: int = 30) -> List[str]:
    """
    Rate-limited version of main function that only runs if enough time has passed.

    Args:
        interval_minutes: Minimum minutes between runs

    Returns:
        List[str]: News insights or cached data if skipped
    """
    # Use a lockfile in the same directory as the script
    script_dir = Path(__file__).parent
    lockfile_path = script_dir / ".news_lockfile.json"

    if not should_run(str(lockfile_path), interval_minutes):
        print(
            f"Skipping run - less than {interval_minutes} minutes since last execution"
        )
        return get_cached_data(str(lockfile_path))

    try:
        # Configure Google AI
        genai.configure(api_key=GOOGLE_API_KEY)

        # Get news insights
        insights = get_crypto_gaming_news()

        # Update the lockfile after successful run
        update_lockfile(str(lockfile_path), insights)

        return insights

    except Exception as e:
        print(f"Error running news fetcher: {str(e)}")
        cached_data = get_cached_data(str(lockfile_path))
        return cached_data


if __name__ == "__main__":
    insights = rate_limited_main()
    for insight in insights:
        print(insight)
