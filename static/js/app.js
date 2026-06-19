/**
 * BigQuery Release Notes Hub - Frontend Application Logic
 */

// Application State
const state = {
    updates: [],
    filteredUpdates: [],
    searchQuery: '',
    filterType: 'all',
    lastSyncTime: null,
    
    // Default tweet configuration
    settings: {
        hashtags: '#BigQuery #GoogleCloud #GCP',
        includeUrl: true,
        autoShorten: true
    },
    
    // Active tweet composition state
    activeTweet: {
        originalText: '',
        text: '',
        link: '',
        selectedTags: []
    }
};

// DOM Elements
const elements = {
    btnRefresh: document.getElementById('btn-refresh'),
    lastSyncTime: document.getElementById('last-sync-time'),
    
    // Stats
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statLatestDate: document.getElementById('stat-latest-date'),
    statBreaking: document.getElementById('stat-breaking'),
    
    // Filter & Search
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    filterTabs: document.getElementById('filter-tabs'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    
    // Tab Counts
    countAll: document.getElementById('count-all'),
    countFeature: document.getElementById('count-feature'),
    countAnnouncement: document.getElementById('count-announcement'),
    countBreaking: document.getElementById('count-breaking'),
    countDeprecation: document.getElementById('count-deprecation'),
    countIssue: document.getElementById('count-issue'),
    countChange: document.getElementById('count-change'),
    
    // Content States
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    emptyState: document.getElementById('empty-state'),
    timelineContainer: document.getElementById('timeline-container'),
    btnRetry: document.getElementById('btn-retry'),
    
    // Sidebar Settings
    defaultHashtagsInput: document.getElementById('default-hashtags'),
    includeUrlCheckbox: document.getElementById('include-url'),
    autoShortenCheckbox: document.getElementById('auto-shorten'),
    
    // Tweet Modal
    tweetModal: document.getElementById('tweet-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    modalSourceText: document.getElementById('modal-source-text'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCount: document.getElementById('char-count'),
    charProgress: document.getElementById('char-progress'),
    btnAutoShorten: document.getElementById('btn-auto-shorten'),
    modalTags: document.getElementById('modal-tags'),
    btnCopyTweet: document.getElementById('btn-copy-tweet'),
    btnPostTwitter: document.getElementById('btn-post-twitter'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toast-icon'),
    toastMessage: document.getElementById('toast-message')
};

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    // Initialise Lucide icons
    lucide.createIcons();
    
    // Load setting defaults from sidebar
    syncSettingsFromUI();
    
    // Register Event Listeners
    registerEventListeners();
    
    // Fetch initial data
    fetchReleaseNotes();
});

// Event Listeners
function registerEventListeners() {
    // Refresh buttons
    elements.btnRefresh.addEventListener('click', () => fetchReleaseNotes());
    elements.btnRetry.addEventListener('click', () => fetchReleaseNotes());
    
    // Settings change
    elements.defaultHashtagsInput.addEventListener('input', syncSettingsFromUI);
    elements.includeUrlCheckbox.addEventListener('change', syncSettingsFromUI);
    elements.autoShortenCheckbox.addEventListener('change', syncSettingsFromUI);
    
    // Search
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        elements.btnClearSearch.style.display = state.searchQuery ? 'flex' : 'none';
        applyFiltersAndSearch();
    });
    
    elements.btnClearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.btnClearSearch.style.display = 'none';
        applyFiltersAndSearch();
        elements.searchInput.focus();
    });
    
    elements.btnResetFilters.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.btnClearSearch.style.display = 'none';
        state.filterType = 'all';
        
        // Reset active state on tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            if (tab.dataset.filter === 'all') tab.classList.add('active');
            else tab.classList.remove('active');
        });
        
        applyFiltersAndSearch();
    });
    
    // Filter tabs
    elements.filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;
        
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        state.filterType = tab.dataset.filter;
        applyFiltersAndSearch();
    });
    
    // Modal events
    elements.btnCloseModal.addEventListener('click', hideTweetModal);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) hideTweetModal();
    });
    
    elements.tweetTextarea.addEventListener('input', (e) => {
        state.activeTweet.text = e.target.value;
        updateCharCount();
    });
    
    elements.btnAutoShorten.addEventListener('click', () => {
        autoSummarizeTweet();
    });
    
    elements.btnCopyTweet.addEventListener('click', copyTweetDraft);
    elements.btnPostTwitter.addEventListener('click', postTweet);
}

// Read settings from Sidebar panel
function syncSettingsFromUI() {
    state.settings.hashtags = elements.defaultHashtagsInput.value.trim();
    state.settings.includeUrl = elements.includeUrlCheckbox.checked;
    state.settings.autoShorten = elements.autoShortenCheckbox.checked;
}

// API: Fetch Release Notes
async function fetchReleaseNotes() {
    setLoadingState(true);
    
    // Spin icon animation
    const refreshIcon = elements.btnRefresh.querySelector('.icon-refresh');
    if (refreshIcon) refreshIcon.classList.add('spinning');
    elements.btnRefresh.disabled = true;
    
    try {
        const response = await fetch('/api/releases');
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const data = await response.json();
        
        if (data.status === 'success') {
            state.updates = data.updates;
            state.lastSyncTime = new Date();
            
            // Render UI
            updateSyncTimeUI();
            updateStatsDashboard();
            updateFilterCounts();
            applyFiltersAndSearch();
            
            showToast('database', 'Successfully fetched latest release notes!');
        } else {
            throw new Error(data.message || 'Unknown server error');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        setErrorState(error.message);
        showToast('alert-octagon', 'Failed to retrieve release notes.');
    } finally {
        setLoadingState(false);
        if (refreshIcon) refreshIcon.classList.remove('spinning');
        elements.btnRefresh.disabled = false;
    }
}

// UI State Switcher
function setLoadingState(isLoading) {
    if (isLoading) {
        elements.loadingState.style.display = 'flex';
        elements.errorState.style.display = 'none';
        elements.emptyState.style.display = 'none';
        elements.timelineContainer.style.display = 'none';
    } else {
        elements.loadingState.style.display = 'none';
    }
}

function setErrorState(msg) {
    elements.loadingState.style.display = 'none';
    elements.timelineContainer.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'flex';
    elements.errorMessage.textContent = msg || 'An unexpected error occurred.';
}

// Format sync time
function updateSyncTimeUI() {
    if (!state.lastSyncTime) return;
    
    const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    
    elements.lastSyncTime.textContent = `Refreshed at ${formatter.format(state.lastSyncTime)}`;
}

// Compute statistics dashboard
function updateStatsDashboard() {
    const total = state.updates.length;
    const features = state.updates.filter(u => u.type === 'Feature').length;
    
    const breaking = state.updates.filter(u => 
        u.type === 'Breaking' || u.type === 'Deprecation'
    ).length;
    
    // Get latest date
    let latestDate = '--';
    if (total > 0) {
        latestDate = state.updates[0].date;
    }
    
    elements.statTotal.textContent = total;
    elements.statFeatures.textContent = features;
    elements.statLatestDate.textContent = latestDate;
    elements.statBreaking.textContent = breaking;
}

// Compute badge counts on the filter tabs
function updateFilterCounts() {
    elements.countAll.textContent = state.updates.length;
    elements.countFeature.textContent = state.updates.filter(u => u.type === 'Feature').length;
    elements.countAnnouncement.textContent = state.updates.filter(u => u.type === 'Announcement').length;
    elements.countBreaking.textContent = state.updates.filter(u => u.type === 'Breaking').length;
    elements.countDeprecation.textContent = state.updates.filter(u => u.type === 'Deprecation').length;
    elements.countIssue.textContent = state.updates.filter(u => u.type === 'Issue').length;
    elements.countChange.textContent = state.updates.filter(u => u.type === 'Change').length;
}

// Filter and Search mechanism
function applyFiltersAndSearch() {
    const searchTerms = state.searchQuery.toLowerCase().trim().split(/\s+/);
    
    state.filteredUpdates = state.updates.filter(update => {
        // 1. Filter by category type
        if (state.filterType !== 'all') {
            if (update.type !== state.filterType) return false;
        }
        
        // 2. Filter by search query
        if (searchTerms.length > 0 && searchTerms[0] !== '') {
            const matchesSearch = searchTerms.every(term => 
                update.content_text.toLowerCase().includes(term) ||
                update.type.toLowerCase().includes(term) ||
                update.date.toLowerCase().includes(term)
            );
            if (!matchesSearch) return false;
        }
        
        return true;
    });
    
    renderTimeline();
}

// Render Timeline Updates
function renderTimeline() {
    elements.timelineContainer.innerHTML = '';
    
    if (state.filteredUpdates.length === 0) {
        elements.timelineContainer.style.display = 'none';
        elements.emptyState.style.display = 'flex';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.timelineContainer.style.display = 'block';
    
    state.filteredUpdates.forEach(update => {
        const card = createTimelineCard(update);
        elements.timelineContainer.appendChild(card);
    });
    
    // Re-initialize lucide icons for newly appended cards
    lucide.createIcons();
}

// Calculate relative time (e.g. "3 days ago")
function getRelativeTime(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0 || isNaN(diffDays)) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        }
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } catch (e) {
        return '';
    }
}

// Create Card DOM element
function createTimelineCard(update) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'timeline-card';
    cardDiv.dataset.type = update.type;
    cardDiv.id = `card-${update.id}`;
    
    const relativeTime = getRelativeTime(update.updated_iso);
    
    cardDiv.innerHTML = `
        <div class="card-content">
            <div class="card-header">
                <div class="card-meta">
                    <span class="card-date">${update.date}</span>
                    ${relativeTime ? `<span class="card-relative-time">&bull; ${relativeTime}</span>` : ''}
                </div>
                <span class="badge-type">${update.type}</span>
            </div>
            
            <div class="card-body">
                ${update.content_html}
            </div>
            
            <div class="card-footer">
                <div class="card-actions-left">
                    <button class="btn-card-action btn-tweet-action" onclick="openTweetComposer('${update.id}')">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet Update</span>
                    </button>
                    <button class="btn-card-action" onclick="copyUpdateText('${update.id}')">
                        <i data-lucide="copy"></i>
                        <span>Copy Text</span>
                    </button>
                </div>
                <div class="card-actions-right">
                    <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="btn-card-action">
                        <i data-lucide="external-link"></i>
                        <span>Original Feed</span>
                    </a>
                </div>
            </div>
        </div>
    `;
    
    return cardDiv;
}

// Global functions (attached to window for onclick in innerHTML)
window.copyUpdateText = function(updateId) {
    const update = state.updates.find(u => u.id === updateId);
    if (!update) return;
    
    const textToCopy = `[BigQuery Release Note - ${update.date} (${update.type})]\n\n${update.content_text}\n\nRead more: ${update.link}`;
    
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            showToast('check', 'Copied update details to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            showToast('x', 'Failed to copy to clipboard.');
        });
};

window.openTweetComposer = function(updateId) {
    const update = state.updates.find(u => u.id === updateId);
    if (!update) return;
    
    state.activeTweet.originalText = update.content_text;
    state.activeTweet.link = update.link;
    state.activeTweet.selectedTags = state.settings.hashtags ? state.settings.hashtags.split(/\s+/) : [];
    
    elements.modalSourceText.textContent = update.content_text;
    
    // Prepare initial tweet text
    let initialText = update.content_text;
    
    // If auto-shorten is checked, we pre-shorten the text if it is too long
    if (state.settings.autoShorten) {
        initialText = makeSummary(initialText, getAvailableContentLength());
    }
    
    state.activeTweet.text = initialText;
    elements.tweetTextarea.value = initialText;
    
    // Render tag choices in modal
    renderModalTags();
    
    // Update count & show
    updateCharCount();
    showTweetModal();
};

// Calculate available character length for description text
function getAvailableContentLength() {
    let extraLen = 0;
    
    // Account for Link
    if (state.settings.includeUrl && state.activeTweet.link) {
        // Twitter counts any URL as 23 characters (t.co link standard)
        extraLen += 23 + 1; // 23 characters + 1 space
    }
    
    // Account for hashtags
    const hashtags = state.activeTweet.selectedTags.filter(t => t.startsWith('#')).join(' ');
    if (hashtags) {
        extraLen += hashtags.length + 1; // tags length + 1 space
    }
    
    return 280 - extraLen;
}

// Generate a summary (first few sentences/words) to fit limit
function makeSummary(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    // Try to cut at sentence boundary
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentText = '';
    
    for (let sentence of sentences) {
        if ((currentText + sentence).length <= maxLength - 4) { // -4 for " ..."
            currentText += sentence;
        } else {
            break;
        }
    }
    
    if (currentText.trim().length > 0) {
        return currentText.trim() + ' ...';
    }
    
    // Fallback: Cut at word boundary
    const words = text.split(/\s+/);
    let wordText = '';
    for (let word of words) {
        if ((wordText + ' ' + word).length <= maxLength - 4) {
            wordText += (wordText ? ' ' : '') + word;
        } else {
            break;
        }
    }
    return wordText + ' ...';
}

// JavaScript-based AI-like Summarizer to condense text elegantly
function autoSummarizeTweet() {
    const original = state.activeTweet.originalText;
    
    // Shorten rules
    // 1. Remove introductory fluff
    // 2. Simplify phrases
    let summary = original
        .replace(/You can now use/gi, 'Supports')
        .replace(/We are pleased to announce/gi, 'Announcing')
        .replace(/This feature is available/gi, 'Available')
        .replace(/This feature is generally available \(GA\)\./gi, '(GA)')
        .replace(/This feature is in preview\./gi, '(Preview)')
        .replace(/For more information, see/gi, 'Details:');
        
    const limit = getAvailableContentLength();
    summary = makeSummary(summary, limit);
    
    state.activeTweet.text = summary;
    elements.tweetTextarea.value = summary;
    updateCharCount();
    
    // Visual sparkle effect on button
    elements.btnAutoShorten.classList.add('shake');
    setTimeout(() => elements.btnAutoShorten.classList.remove('shake'), 400);
    
    showToast('sparkles', 'Summarized note text to fit Twitter limit!');
}

// Render Hashtag Pills in Modal
function renderModalTags() {
    elements.modalTags.innerHTML = '';
    
    // Recommended tags lists
    const recommendedTags = ['#BigQuery', '#GoogleCloud', '#GCP', '#DataWarehouse', '#DataAnalytics', '#Serverless', '#Gemini', '#BigData'];
    
    recommendedTags.forEach(tag => {
        const isActive = state.activeTweet.selectedTags.includes(tag);
        const pill = document.createElement('span');
        pill.className = `tag-pill ${isActive ? 'active' : ''}`;
        pill.textContent = tag;
        
        pill.addEventListener('click', () => {
            if (state.activeTweet.selectedTags.includes(tag)) {
                state.activeTweet.selectedTags = state.activeTweet.selectedTags.filter(t => t !== tag);
                pill.classList.remove('active');
            } else {
                state.activeTweet.selectedTags.push(tag);
                pill.classList.add('active');
            }
            updateCharCount();
        });
        
        elements.modalTags.appendChild(pill);
    });
}

// Calculate total tweet length and update DOM
function updateCharCount() {
    const textContent = state.activeTweet.text;
    
    // Calculate final draft parts
    let totalLen = textContent.length;
    
    // Add Link (Always 23 characters on Twitter)
    if (state.settings.includeUrl && state.activeTweet.link) {
        totalLen += (totalLen > 0 ? 1 : 0) + 23; 
    }
    
    // Add hashtags
    const hashtags = state.activeTweet.selectedTags.join(' ');
    if (hashtags) {
        totalLen += (totalLen > 0 ? 1 : 0) + hashtags.length;
    }
    
    // Update Counter
    elements.charCount.textContent = totalLen;
    
    // Update Progress bar
    const percentage = Math.min((totalLen / 280) * 100, 100);
    elements.charProgress.style.width = `${percentage}%`;
    
    // Color coding
    elements.charProgress.className = 'progress-bar-fill';
    elements.charCount.style.color = '';
    
    if (totalLen > 280) {
        elements.charProgress.classList.add('error');
        elements.charCount.style.color = 'var(--color-breaking)';
        elements.btnPostTwitter.classList.add('disabled');
        elements.btnPostTwitter.style.pointerEvents = 'none';
        elements.btnPostTwitter.style.opacity = '0.5';
    } else {
        if (totalLen > 250) {
            elements.charProgress.classList.add('warning');
            elements.charCount.style.color = 'var(--color-deprecation)';
        }
        elements.btnPostTwitter.classList.remove('disabled');
        elements.btnPostTwitter.style.pointerEvents = '';
        elements.btnPostTwitter.style.opacity = '';
    }
}

// Assemble full tweet body
function assembleTweetBody() {
    let parts = [];
    if (state.activeTweet.text.trim()) {
        parts.push(state.activeTweet.text.trim());
    }
    
    if (state.settings.includeUrl && state.activeTweet.link) {
        parts.push(state.activeTweet.link);
    }
    
    const hashtags = state.activeTweet.selectedTags.join(' ');
    if (hashtags) {
        parts.push(hashtags);
    }
    
    return parts.join('\n\n'); // Separate text, URL and tags beautifully
}

// Copy Tweet draft to clipboard
function copyTweetDraft() {
    const fullTweet = assembleTweetBody();
    navigator.clipboard.writeText(fullTweet)
        .then(() => {
            showToast('check', 'Tweet draft copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            showToast('x', 'Failed to copy draft.');
        });
}

// Navigate to Twitter Web Intent
function postTweet(e) {
    const fullTweet = assembleTweetBody();
    if (fullTweet.length > 310) { // Safety check (280 text + URLs counts)
        e.preventDefault();
        showToast('alert-triangle', 'Tweet is too long! Please shorten it.');
        return;
    }
    
    const encodedText = encodeURIComponent(fullTweet);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    elements.btnPostTwitter.href = twitterUrl;
    
    showToast('sparkles', 'Opening Twitter...');
    setTimeout(hideTweetModal, 500);
}

// Modal Toggle utilities
function showTweetModal() {
    elements.tweetModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideTweetModal() {
    elements.tweetModal.style.display = 'none';
    document.body.style.overflow = '';
}

// Toast System
let toastTimeout;
function showToast(iconName, message) {
    // Clear existing timer
    clearTimeout(toastTimeout);
    
    elements.toastMessage.textContent = message;
    
    // Update Lucide icon
    elements.toastIcon.setAttribute('data-lucide', iconName);
    lucide.createIcons({
        attrs: {
            class: 'lucide-icon'
        },
        nameAttr: 'data-lucide'
    });
    
    elements.toast.classList.add('show');
    
    toastTimeout = setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3500);
}
