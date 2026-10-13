import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
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
              const symbol = decodeURIComponent(rawSym).replace(/[\[\]\{\}\(\)\<\>\\\/\|\^\$\*\+\?`~@#!%&=:;,"']/g, '').trim().toUpperCase();
              const range = parsedUrl.searchParams.get('range') || '1y';
              const interval = parsedUrl.searchParams.get('interval') || '1d';

              if (!symbol) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Stock symbol is required' }));
                return;
              }

              const targetUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
              
              const response = await fetch(targetUrl, { headers: YAHOO_HEADERS });
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

          if (req.url.startsWith('/api/yahoo/search')) {
            try {
              const parsedUrl = new URL(req.url, 'http://localhost');
              const rawQ = parsedUrl.searchParams.get('q') || '';
              // Sanitize query by removing keyboard typo characters: [, ], {, }, (, ), <, >, \, /, |, ^, $, *, +, ?, `, ~, ", ', @, #, etc.
              const q = rawQ.replace(/[\[\]\{\}\(\)\<\>\\\/\|\^\$\*\+\?`~@#!%&=:;,"']/g, '').replace(/\s+/g, ' ').trim();
              const quotesCount = parsedUrl.searchParams.get('quotesCount') || '12';
              const newsCount = parsedUrl.searchParams.get('newsCount') || '6';

              if (!q) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ quotes: [], news: [] }));
                return;
              }

              const targetUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${quotesCount}&newsCount=${newsCount}`;
              const response = await fetch(targetUrl, { headers: YAHOO_HEADERS });
              const data = await response.json();

              res.statusCode = response.status;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify(data));
              return;
            } catch (err) {
              console.error('Error in search proxy:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ quotes: [], news: [], error: err.message }));
              return;
            }
          }

          next();
        });
      }
    }
  ]
});
