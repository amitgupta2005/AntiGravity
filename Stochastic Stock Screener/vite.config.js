import { defineConfig } from 'vite';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export default defineConfig({
  server: {
    port: 5175,
    host: true
  },
  plugins: [
    {
      name: 'yahoo-finance-proxy',
      configureServer(server) {
        const YAHOO_HEADERS = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        };

        server.middlewares.use(async (req, res, next) => {
          if (req.url.startsWith('/api/yahoo/chart')) {
            try {
              const parsedUrl = new URL(req.url, 'http://localhost');
              let rawSym = parsedUrl.pathname.replace(/^\/api\/yahoo\/chart\/?/, '');
              if (!rawSym) {
                rawSym = parsedUrl.searchParams.get('symbol') || '';
              }
              let clean = decodeURIComponent(rawSym).trim().toUpperCase();
              const isIndex = clean.startsWith('^');
              clean = clean.replace(/[\[\]\{\}\(\)\<\>\\\/\|\$\*\+\?`~@#!%=:;,"']/g, '').trim();
              if (isIndex && !clean.startsWith('^')) {
                clean = '^' + clean;
              }
              const symbol = clean;
              const range = parsedUrl.searchParams.get('range') || '3mo';
              const interval = parsedUrl.searchParams.get('interval') || '1d';

              if (!symbol) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Stock symbol is required' }));
                return;
              }

              const targetUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
              
              let response = await fetch(targetUrl, { headers: YAHOO_HEADERS });
              if (!response.ok) {
                const fallbackUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
                try {
                  const fb = await fetch(fallbackUrl, { headers: YAHOO_HEADERS });
                  if (fb.ok) response = fb;
                } catch (_) {}
              }
              const data = await response.json();
              
              res.statusCode = response.status;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify(data));
              return;
            } catch (err) {
              console.error('Error fetching chart:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }

          if (req.url.startsWith('/api/yahoo/quote')) {
            try {
              const parsedUrl = new URL(req.url, 'http://localhost');
              const symbol = parsedUrl.searchParams.get('symbol') || '';
              if (!symbol) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Symbol required' }));
                return;
              }
              const quote = await yf.quote(symbol);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(quote));
              return;
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }

          next();
        });
      }
    }
  ]
});
