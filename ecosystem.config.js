// PM2 Ecosystem Configuration for SAK ERP
// Deploy this to /home/ubuntu/sak-erp/ on the server
//
// Usage:
//   pm2 delete all
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup  # Enable on boot

module.exports = {
  apps: [
    {
      name: 'sak-api',
      script: 'npm',
      args: 'run start:prod',
      cwd: '/home/ubuntu/sak-erp/apps/api',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: '/home/ubuntu/.pm2/logs/sak-api-error.log',
      out_file: '/home/ubuntu/.pm2/logs/sak-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'sak-web',
      script: 'npm',
      args: 'run dev',  // DEV MODE - Will switch to production after disk is extended to 20GB
      cwd: '/home/ubuntu/sak-erp/apps/web',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: '/home/ubuntu/.pm2/logs/sak-web-error.log',
      out_file: '/home/ubuntu/.pm2/logs/sak-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
