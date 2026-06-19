import os
import copy
from flask import Flask, jsonify, render_template, request
import requests
import feedparser
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    try:
        # Fetch the RSS feed
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        # Parse feed
        feed = feedparser.parse(response.content)
        
        all_updates = []
        for entry in feed.entries:
            soup = BeautifulSoup(entry.summary, "html.parser")
            headers = soup.find_all("h3")
            
            date_str = entry.title
            link = entry.link
            updated_iso = entry.get("updated", "")
            
            if not headers:
                # Fallback if no h3 headers exist
                text_content = soup.get_text().strip()
                # Remove extra spaces/newlines
                text_content = " ".join(text_content.split())
                
                all_updates.append({
                    "id": entry.get("id", link),
                    "date": date_str,
                    "updated_iso": updated_iso,
                    "link": link,
                    "type": "General",
                    "content_html": str(soup),
                    "content_text": text_content
                })
                continue
                
            for idx, header in enumerate(headers):
                update_type = header.text.strip()
                
                # Collect elements until next h3
                content_elements = []
                next_sibling = header.next_sibling
                while next_sibling and next_sibling.name != "h3":
                    content_elements.append(next_sibling)
                    next_sibling = next_sibling.next_sibling
                    
                update_soup = BeautifulSoup("", "html.parser")
                for elem in content_elements:
                    update_soup.append(copy.copy(elem))
                    
                content_html = str(update_soup).strip()
                
                # Clean up links (add target="_blank" rel="noopener noreferrer")
                cleaned_soup = BeautifulSoup(content_html, "html.parser")
                for a in cleaned_soup.find_all("a"):
                    a["target"] = "_blank"
                    a["rel"] = "noopener noreferrer"
                
                content_html = str(cleaned_soup)
                text_content = cleaned_soup.get_text().strip()
                # Clean up spaces
                text_content = " ".join(text_content.split())
                
                # Unique ID for each individual update
                entry_id = entry.get("id", link)
                update_id = f"{entry_id}_{idx}"
                
                all_updates.append({
                    "id": update_id,
                    "date": date_str,
                    "updated_iso": updated_iso,
                    "link": link,
                    "type": update_type,
                    "content_html": content_html,
                    "content_text": text_content
                })
                
        return jsonify({
            "status": "success",
            "count": len(all_updates),
            "feed_title": feed.feed.get("title", "BigQuery Release Notes"),
            "updates": all_updates
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    # Get port from environment or default to 5000
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="127.0.0.1", port=port)
