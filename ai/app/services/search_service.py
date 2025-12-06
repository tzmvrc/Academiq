import os
from serpapi import GoogleSearch

SERPAPI_KEY = os.getenv("SERPAPI_API_KEY")

def search_web(query: str, num_results: int = 5):
    """
    Performs a Google search using SerpApi and returns a list of URLs.
    """

    if not SERPAPI_KEY:
        raise ValueError("Missing SERPAPI_API_KEY in environment variables.")

    try:
        search = GoogleSearch({
            "q": query,
            "api_key": SERPAPI_KEY,
            "num": num_results,
        })

        results = search.get_dict()

        urls = []
        organic_results = results.get("organic_results", [])

        for item in organic_results:
            if "link" in item:
                urls.append(item["link"])

            if len(urls) >= num_results:
                break

        return urls

    except Exception as e:
        print("SerpApi Error:", e)
        return []
