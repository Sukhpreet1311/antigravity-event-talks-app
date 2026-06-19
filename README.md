# BigQuery Release Notes Hub

A premium, modern single-page web application (SPA) built using **Python Flask** on the backend and **vanilla HTML/CSS/JavaScript** on the frontend. The dashboard tracks, splits, searches, filters, and formats Google Cloud BigQuery release notes into an elegant, interactive timeline.

---

## 🛠️ Project Structure

- **[app.py](file:///C:/Users/ksukh/agy-cli-projects/bq-releases-notes/app.py)**: The Flask backend that fetches the Google Cloud Atom feed, parses and splits entries, and exposes the JSON API.
- **[templates/index.html](file:///C:/Users/ksukh/agy-cli-projects/bq-releases-notes/templates/index.html)**: The dashboard layout, stats dashboard, category filter tabs, search container, timeline area, and tweet composer modal.
- **[static/css/style.css](file:///C:/Users/ksukh/agy-cli-projects/bq-releases-notes/static/css/style.css)**: Custom CSS design system implementing dark mode, glassmorphic cards, color-coded status badges, timeline lines, scrollbars, and micro-animations.
- **[static/js/app.js](file:///C:/Users/ksukh/agy-cli-projects/bq-releases-notes/static/js/app.js)**: Client-side logic for fetching, rendering, search debouncing, clipboard copying, and the custom Twitter intent composer.
- **[.gitignore](file:///C:/Users/ksukh/agy-cli-projects/bq-releases-notes/.gitignore)**: Standard Git ignore configuration for Python, Flask, Virtual Environments, and IDE files.

---

## ✨ Main Features

1. **Granular Release Splitting**: Google's feed groups multiple release updates under a single day's entry. The application parses the HTML markup and slices it into distinct, individual release cards (e.g. separating a day's *Feature* from an *Issue* or *Announcement*).
2. **Glassmorphic Dark Mode**: A premium, cloud-inspired dark UI using background gradients, glowing borders, custom layout structures, and smooth interactive transitions.
3. **Interactive Search & Filtering**: Client-side filtering by category types (Feature, Announcement, Breaking, Deprecation, Issue, Change) and text keywords, with real-time matching counts displayed on each tab.
4. **Twitter/X Draft Composer**: A modal allowing you to customize, copy, or tweet release updates. Includes default hashtag settings, active character calculations (counting URLs as 23 characters), and an **Auto-Summarize** text shortener to help fit within Twitter's 280-character limit.

---

## 🏗️ Architecture Breakdown

### 1. Server-Side (Flask Backend)
The backend is defined in [app.py](file:///C:/Users/ksukh/agy-cli-projects/bq-releases-notes/app.py). It acts as a data proxy and parser. Here is the explanation of its core mechanics:

- **Flask Initialization**:
  ```python
  app = Flask(__name__)
  ```
  Initializes the Flask application, setting up routing capabilities.

- **Frontend Serving Route (`/`)**:
  ```python
  @app.route("/")
  def index():
      return render_template("index.html")
  ```
  Listens for standard web browsers requesting the home page and responds by rendering the [templates/index.html](file:///C:/Users/ksukh/agy-cli-projects/bq-releases-notes/templates/index.html) file.

- **Releases API Route (`/api/releases`)**:
  Exposes the JSON endpoint consumed by our client.
  - **Feed Retrieval**:
    ```python
    response = requests.get(FEED_URL, timeout=15)
    ```
    Uses the `requests` library to fetch the XML feed with a 15-second timeout.
  - **Feed Parsing**:
    ```python
    feed = feedparser.parse(response.content)
    ```
    Uses the `feedparser` library to parse the Atom/RSS feed structure into python objects.
  - **Granular Update Decomposition**:
    Instead of passing daily release note blocks directly to the client, the code parses the HTML structure:
    ```python
    soup = BeautifulSoup(entry.summary, "html.parser")
    headers = soup.find_all("h3")
    ```
    Uses `BeautifulSoup` to scan the entry content.
    - If there are **no `<h3>` tags**, it packages the entry as a single "General" update.
    - If **`<h3>` tags exist**, it loops through them:
      ```python
      while next_sibling and next_sibling.name != "h3":
          content_elements.append(next_sibling)
          next_sibling = next_sibling.next_sibling
      ```
      This collects all HTML siblings (paragraphs, lists, code samples) between successive headers (`<h3>` tags represent the release categories like *Feature*, *Issue*, *Announcement*, etc.) and packages them into distinct update items.
  - **Hyperlink & Markup Sanitization**:
    For each split update, the backend cleans up URLs:
    ```python
    for a in cleaned_soup.find_all("a"):
        a["target"] = "_blank"
        a["rel"] = "noopener noreferrer"
    ```
    This adds safety and accessibility attributes so links clicked on the client open safely in new tabs. It also strips double-newlines and extra whitespaces using `" ".join(text_content.split())` to generate a clean text draft for Twitter.
  - **JSON Output**:
    Returns the unified updates list in a formatted JSON structure:
    ```python
    return jsonify({ "status": "success", "count": len(all_updates), ... })
    ```

### 2. Client-Side (Vanilla JS Engine)
The frontend manages state locally to provide instant response times:
- **State**: Keeps record of all fetched updates, search criteria, filter tabs, default hashtag settings, and active draft compose state.
- **Timeline Engine**: Iterates over matching updates, compiles elements using custom HTML templates, inserts them into the DOM, and loads Lucide icons.
- **Twitter Assistant**: Computes the draft layout, tracks text progress, blocks pushes over 280 characters, and constructs encoded links targeting Twitter's Web Intent URL.

---

## 🔄 Sample Request-Response Flow

Below is the execution sequence when a user clicks the **"Refresh Notes"** button or loads the page:

```mermaid
sequenceDiagram
    participant User as User / Browser
    participant JS as app.js (Client)
    participant Flask as app.py (Server)
    participant XML as Google Feed (API)
    
    User->>JS: Click "Refresh Notes"
    activate JS
    JS->>JS: Show Spinner Layout & start rotation animation
    JS->>Flask: GET /api/releases
    activate Flask
    Flask->>XML: Fetch bigquery-release-notes.xml
    activate XML
    XML-->>Flask: Return XML content
    deactivate XML
    Flask->>Flask: Parse XML & Split daily entries by <h3> using BeautifulSoup
    Flask-->>JS: Return JSON list of 66+ sanitized updates
    deactivate Flask
    
    JS->>JS: Populate state.updates
    JS->>JS: Update Stats Dashboard & Tab Count Badges
    JS->>JS: Execute applyFiltersAndSearch()
    JS->>JS: Render timeline cards & initialize Lucide icons
    JS->>JS: Slide in Toast Notification ("Successfully fetched...")
    JS-->>User: Visual transition complete, updates visible
    deactivate JS
```

---

## 🚀 Run Instructions

### 1. Activate the Virtual Environment
Open your terminal inside the project directory and run:
```powershell
.venv\Scripts\Activate.ps1
```

### 2. Run the Development Server
```powershell
python app.py
```

### 3. Open the Dashboard
Navigate to: [http://127.0.0.1:5000](http://127.0.0.1:5000)
