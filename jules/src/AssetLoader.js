import { Assets } from 'pixi.js';

export class AssetLoader {
    constructor() {
        this.manifest = {
            bundles: [
                {
                    name: '2048-classic',
                    assets: [
                        { alias: '2', src: '/assets/2048/2.jpg' },
                        { alias: '4', src: '/assets/2048/4.jpg' },
                        { alias: '8', src: '/assets/2048/8.jpg' },
                        { alias: '16', src: '/assets/2048/16.jpg' },
                        { alias: '32', src: '/assets/2048/32.jpg' },
                        { alias: '64', src: '/assets/2048/64.jpg' },
                        { alias: '128', src: '/assets/2048/128.jpg' },
                        { alias: '256', src: '/assets/2048/256.jpg' },
                        { alias: '512', src: '/assets/2048/512.jpg' },
                        { alias: '1024', src: '/assets/2048/1024.jpg' },
                        { alias: '2048', src: '/assets/2048/2048.jpg' },
                        { alias: '4096', src: '/assets/2048/4096.jpg' },
                        { alias: '8192', src: '/assets/2048/8192.jpg' },
                        { alias: '16384', src: '/assets/2048/16384.jpg' },
                        { alias: '32768', src: '/assets/2048/32768.jpg' }
                    ]
                }
            ]
        };
    }

    async init() {
        await Assets.init({ manifest: this.manifest });
    }

    async loadBundle(bundleName) {
        return await Assets.loadBundle(bundleName);
    }
}
