import asyncio
from reporter import send_telegram_report

# Formatted based on the real time Google Search results
articles = [
    {"source": "The National (Abu Dhabi)", "title": "Abu Dhabi's Zayed International Airport airspace closed. One fatality reported and several injured from falling drone debris in residential area.", "link": "https://thenationalnews.com/uae/live"},
    {"source": "Gulf News", "title": "[LIVE] UAE airports suspend flights following Iran drone and missile attacks in response to regional conflict.", "link": "https://gulfnews.com/uae/live"},
    {"source": "Khaleej Times", "title": "Dubai International (DXB) confirms minor damage to a concourse. All major UAE airlines including Emirates, Etihad, and flydubai suspend operations.", "link": "https://khaleejtimes.com/aviation"},
    {"source": "Instagram", "title": "Instagram Post: Residents sharing footage of intercepted drones over Abu Dhabi skyline", "link": "https://instagram.com/explore/tags/abudhabiairport"},
]

asyncio.run(send_telegram_report(articles))
