module.exports = {
  apps: [
    {
      name: 'stock-analyzer',
      script: 'node_modules/.bin/next',
      args: 'start -p 3009',
      cwd: '/Users/ze_ido/.gemini/antigravity/scratch/stock-analyzer',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        PORT: '3009',
      },
    },
  ],
};
