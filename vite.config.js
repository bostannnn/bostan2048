import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const normalizeBase = (value) => {
  if (!value) return '/';
  let base = value;
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base += '/';
  return base;
};

const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const devBaseRedirect = (base) => ({
  name: 'dev-base-redirect',
  apply: 'serve',
  configureServer(server) {
    if (base === '/') return;
    server.middlewares.use((req, res, next) => {
      if (req.url === '/' || req.url === '/index.html') {
        res.statusCode = 302;
        res.setHeader('Location', base);
        res.end();
        return;
      }
      next();
    });
  }
});

export default defineConfig(() => {
  const base = normalizeBase(process.env.VITE_BASE || '/bostan2048/');
  const buildTag = (process.env.VITE_BUILD_TAG || '').toLowerCase();
  const isDevBuild = buildTag === 'dev';
  const devScope = `${base}dev/`;
  const navigateFallbackDenylist = isDevBuild ? [] : [new RegExp(`^${escapeForRegExp(devScope)}`)];
  const iconPath = isDevBuild
    ? 'assets/levels/level-1/2048-dev.svg'
    : 'assets/levels/level-1/2048.jpg';
  const iconType = isDevBuild ? 'image/svg+xml' : 'image/jpeg';
  const icons = isDevBuild
    ? [
        {
          src: iconPath,
          sizes: 'any',
          type: iconType,
          purpose: 'any maskable'
        }
      ]
    : [
        {
          src: iconPath,
          sizes: '192x192',
          type: iconType,
          purpose: 'any maskable'
        },
        {
          src: iconPath,
          sizes: '512x512',
          type: iconType,
          purpose: 'any maskable'
        }
      ];

  return {
    base,
    plugins: [
      devBaseRedirect(base),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
          type: 'module'
        },
        workbox: {
          cacheId: isDevBuild ? 'photo2048-dev' : 'photo2048-prod',
          navigateFallbackDenylist
        },
        manifest: {
          name: isDevBuild ? 'Photo 2048 Dev' : 'Photo 2048',
          short_name: isDevBuild ? 'Photo2048 Dev' : 'Photo2048',
          description: 'A modern 2048 game',
          start_url: './',
          scope: './',
          display: 'standalone',
          background_color: '#F2F2F7',
          theme_color: '#F2F2F7',
          orientation: 'portrait',
          icons
        }
      })
    ]
  };
});
