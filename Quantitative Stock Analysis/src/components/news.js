/**
 * News and Quant Sentiment Feed Component
 * Displays real-time financial news for the selected stock sorted by current date/time.
 */

export function renderNewsFeed(stock, filter = 'ALL') {
  const container = document.getElementById('newsFeedList');
  const countBadge = document.getElementById('newsStatusCount');
  if (!container) return;

  let newsList = [...(stock.news || [])];

  // Explicitly sort news by current date / publish timestamp descending (newest on top)
  newsList.sort((a, b) => {
    const timeA = a.publishTimestamp || (a.time ? 0 : 0);
    const timeB = b.publishTimestamp || (b.time ? 0 : 0);
    return timeB - timeA;
  });

  const filtered = filter === 'ALL' 
    ? newsList 
    : newsList.filter(item => item.sentiment.toUpperCase() === filter.toUpperCase());

  if (countBadge) {
    countBadge.textContent = `${filtered.length} Live Stories (Sorted by Date)`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-news-state" style="padding: 32px; text-align: center; color: var(--text-dim); background: var(--bg-card); border-radius: var(--radius-md);">
        <i data-lucide="newspaper" class="inline-icon" style="width: 32px; height: 32px; margin-bottom: 8px;"></i>
        <p>No news items match the "${filter}" filter for ${stock.ticker} on current date.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((item, idx) => {
    const isBull = item.sentiment.toLowerCase() === 'bullish';
    const isBear = item.sentiment.toLowerCase() === 'bearish';
    const sentimentClass = isBull ? 'badge-bullish' : isBear ? 'badge-bearish' : 'badge-neutral';
    const scoreFormatted = item.sentimentScore >= 0 ? `+${item.sentimentScore.toFixed(2)}` : item.sentimentScore.toFixed(2);
    const dateDisplay = item.formattedDate || item.time || 'Today';
    
    return `
      <article class="news-card" data-id="${item.id || idx}">
        <div class="news-header">
          <div class="news-meta">
            <span class="news-source">${item.source}</span>
            <span class="news-time" title="Publication Timestamp">
              <i data-lucide="calendar" class="inline-icon"></i> ${dateDisplay}
            </span>
          </div>
          <div class="sentiment-indicator ${sentimentClass}">
            <span class="sentiment-dot"></span>
            <span class="sentiment-label">${item.sentiment}</span>
            <span class="sentiment-score">${scoreFormatted}</span>
          </div>
        </div>
        <h4 class="news-title">
          ${item.link && item.link !== '#' ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer" class="news-link-title">${item.title}</a>` : item.title}
        </h4>
        <p class="news-summary">${item.summary}</p>
        <div class="news-footer">
          <span class="impact-tag"><i data-lucide="zap" class="inline-icon"></i> Catalyst: EPS Growth & Valuation Impact</span>
          ${item.link && item.link !== '#' ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer" class="read-more-link">Read on Yahoo Finance <i data-lucide="arrow-right" class="inline-icon"></i></a>` : `<span class="read-more-link">Analysis Verified <i data-lucide="check-circle-2" class="inline-icon verified-icon"></i></span>`}
        </div>
      </article>
    `;
  }).join('');
}
