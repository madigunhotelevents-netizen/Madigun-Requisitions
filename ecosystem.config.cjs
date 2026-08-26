module.exports = {
  apps: [
    {
      name: "madigun-hotel-requisitions",
      script: "server.js",
      instances: "max",           // Runs on all available CPU cores for maximum performance & load-balancing
      exec_mode: "cluster",       // Enables cluster mode for high availability and zero-downtime reloads
      watch: false,               // Turned off in production to prevent unexpected restarts from log changes
      max_memory_restart: "1G",   // Auto-restarts if memory exceeds 1GB (extremely robust long-term)
      env: {
        NODE_ENV: "production",
        PORT: 3000                // Default serving port
      }
    }
  ]
};
