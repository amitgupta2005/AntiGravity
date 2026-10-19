import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5174,
    open: false,
    host: true
  },
  plugins: [
    {
      name: 'yahoo-finance-proxy',
      configureServer(server) {
        const YAHOO_HEADERS = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json,text/html,*/*',
          'Accept-Language': 'en-US,en;q=0.9'
        };

        server.middlewares.use(async (req, res, next) => {
          if (req.url.startsWith('/api/yahoo/chart')) {
            try {
              const parsedUrl = new URL(req.url, 'http://localhost');
              let rawSym = parsedUrl.searchParams.get('symbol') || parsedUrl.pathname.replace(/^\/api\/yahoo\/chart\/?/, '');
              let clean = decodeURIComponent(rawSym).trim().toUpperCase();
              const isIndex = clean.startsWith('^');
              clean = clean.replace(/[\[\]\{\}\(\)\<\>\\\/\|\$\*\+\?`~@#!%=:;,"']/g, '').trim();
              if (isIndex && !clean.startsWith('^')) {
                clean = '^' + clean;
              }
              const symbol = clean;
              const range = parsedUrl.searchParams.get('range') || '5d';
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
              console.error('Error fetching chart from Yahoo proxy:', err);
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
  ],
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
