import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import contactHandler from './api/contact';

const contactDevPlugin = () => ({
  name: 'dev-contact-endpoint',
  configureServer(server: any) {
    server.middlewares.use('/api/contact', (req: IncomingMessage, res: ServerResponse) => {
      let raw = '';
      req.setEncoding('utf8');

      req.on('data', (chunk) => {
        raw += chunk;
      });

      req.on('error', (error) => {
        console.error('[contact-dev] request error', error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Contact form request failed.' }));
        }
      });

      req.on('end', async () => {
        let parsedBody: unknown = {};

        if (raw.length > 0) {
          try {
            parsedBody = JSON.parse(raw);
          } catch (error) {
            console.error('[contact-dev] JSON parse error', error);
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
            return;
          }
        }

        const vercelReq = req as unknown as VercelRequest;
        vercelReq.body = parsedBody;

        const vercelRes: VercelResponse = {
          status(statusCode: number) {
            res.statusCode = statusCode;
            return this;
          },
          setHeader(name: string, value: string | readonly string[]) {
            res.setHeader(name, value);
          },
          json(payload: unknown) {
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'application/json');
            }
            res.end(JSON.stringify(payload));
            return this;
          },
        } as unknown as VercelResponse;

        try {
          await contactHandler(vercelReq, vercelRes);
        } catch (error) {
          console.error('[contact-dev] handler error', error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error.' }));
          }
        }
      });
    });
  },
});

export default defineConfig({
  plugins: [react(), contactDevPlugin()],
  server: {
    open: true,
    host: '0.0.0.0',
  },
  // @ts-ignore
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  build: {
    outDir: 'build',
    sourcemap: process.env.VITE_SOURCEMAP === 'true',
  },
  resolve: {
    alias: {
      '@': '/src',
      '@docs': path.resolve(__dirname, 'docs'),
    },
  },
}); 
