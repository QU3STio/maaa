import os
from datetime import datetime, timedelta, timezone
from typing import List
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GOOGLE_API_KEY = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_GENERATIVE_AI_API_KEY not found in environment")

def get_web3_news() -> List[str]:
    """Fetch latest Web3 and crypto gaming news using Gemini."""
    _client = genai.Client(api_key=GOOGLE_API_KEY)
    _model = "gemini-2.0-flash-exp"

    yesterday = (datetime.now() - timedelta(days=1)).strftime("%B %d %Y")

    search_tool = {"google_search": {}}
    news_chat = _client.chats.create(model=_model, config={"tools": [search_tool]})

    prompt = f"""Provide the latest developments and headlines for crypto and Web3 since {yesterday}.
    Include the following categories:
    • Crypto Gaming News
    • Web3 Development Updates
    • Trending Memecoins
    • General Crypto Market Updates

    Format as bullet points with category headers.
    Include specific metrics like:
    • User numbers and growth
    • Trading volumes
    • Token prices
    • Project launches

    Focus only on verified, significant developments.
    Be concise and factual.

    OUTPUT FORMAT:
    A single entry of text with no preamble or introduction.
    Each bullet point is seperated by `\n`
    Each bullet point should be formatted as `[Category] generated_text`

    Example:
    "[Crypto Gaming News] Crypto gaming platform X has seen a 20% increase in daily active users over the past week.\n[Web3 Development Updates] • The Ethereum 2.0 upgrade is expected to be completed by the end of 2025."
    """

    try:
        response = news_chat.send_message(prompt)
        raw_text = response.candidates[0].content.parts[0].text
        try:
            return raw_text.split("\n")
        except Exception as e:
            print(f"Error parsing Web3 news: {str(e)}", file=sys.stderr)
            return [raw_text]
    except Exception as e:
        print(f"Error fetching Web3 news: {str(e)}", file=sys.stderr)
        return []

if __name__ == "__main__":
    try:
        insights = get_web3_news()
        for insight in insights:
            print(insight)
    except Exception as e:
        print(f"Fatal error: {str(e)}", file=sys.stderr)
        sys.exit(1)