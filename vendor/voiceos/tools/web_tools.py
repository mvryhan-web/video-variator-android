from research.web_search import search_web
from research.web_scraper import fetch_page
from research.content_extractor import extract_content
from research.summarizer import Summarizer
from research.analysis_engine import AnalysisEngine


def web_research(query):

    results = search_web(query)

    summaries = []

    summarizer = Summarizer()

    for r in results:

        html = fetch_page(r["link"])

        if not html:
            continue

        content = extract_content(html)

        summary = summarizer.summarize(content)

        summaries.append(summary)

    analyzer = AnalysisEngine()

    final_answer = analyzer.analyze(summaries)

    return final_answer