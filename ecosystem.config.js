module.exports = {
  apps: [{
    name: "mckaren",
    script: "pnpm start:scheduler",
    env: {
      NODE_ENV: "production"
    },
    env_file: ".env",
    autorestart: true,
    exp_backoff_restart_delay: 100
  }]
}