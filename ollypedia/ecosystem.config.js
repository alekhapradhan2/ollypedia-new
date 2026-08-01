module.exports = {
  apps: [
    {
      name: 'ollypedia',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: __dirname,
      env_file: '.env.production',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        NEXT_TELEMETRY_DISABLED: '1'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: '3000',
        NEXT_TELEMETRY_DISABLED: '1'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '850M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log'
    }
  ]
};
