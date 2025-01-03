import os
import sys
import argparse
from datetime import datetime, timedelta, timezone
from typing import List
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GOOGLE_API_KEY = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_GENERATIVE_AI_API_KEY not found in environment")

def get_weeb_news() -> List[str]:
    """Fetch latest Web3 and crypto gaming news using Gemini."""
    _client = genai.Client(api_key=GOOGLE_API_KEY)
    _model = "gemini-2.0-flash-exp"

    yesterday = (datetime.now() - timedelta(days=1)).strftime("%B %d %Y")

    search_tool = {"google_search": {}}
    news_chat = _client.chats.create(model=_model, config={"tools": [search_tool]})

    prompt = f"""Provide the latest developments and headlines for weeb culture since {yesterday}.
    Include the following categories:
    • VTubers and Gaming Content Creators
    • Games and Gaming Gear
    • Anime, Manga, Cosplay and Fashion
    • KPop, Jpop, and KDramas

    Format as bullet points with category headers.
    Include specifics like:
    • Upcoming events and conventions
    • New releases and merchandise
    • Influencers and their followers
    • Names, titles, dates, and other relevant details

    Focus only on verified, significant developments.
    Be concise and factual.

    OUTPUT FORMAT:
    A single entry of text with no preamble or introduction.
    Each bullet point is seperated by `\n`
    Each bullet point should be formatted as `[Category] generated_text`

    Example:
    "[Kpop] New KPop group YYY is set to debut in January 2025.\n[Anime] The latest season of Anime X is now available on streaming platforms.\n[Games] The highly anticipated game YYY is set to release in March 2025."
    """

    try:
        response = news_chat.send_message(prompt)
        raw_text = response.candidates[0].content.parts[0].text
        try:
            return raw_text.split("\n")
        except Exception as e:
            print(f"Error parsing weeb news: {str(e)}", file=sys.stderr)
            return [raw_text]
    except Exception as e:
        print(f"Error fetching weeb news: {str(e)}", file=sys.stderr)
        return []

if __name__ == "__main__":
    try:
        insights = get_weeb_news()
        for insight in insights:
            print(insight)
    except Exception as e:
        print(f"Fatal error: {str(e)}", file=sys.stderr)
        sys.exit(1)