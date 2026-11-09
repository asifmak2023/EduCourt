module.exports = {
  apps: [
    {
      name: "educourt-web",
      cwd: "/var/www/educourt/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        API_ORIGIN: "http://127.0.0.1:8080",
      },
    },
    {
      name: "educourt-parent",
      cwd: "/var/www/educourt/apps/parent",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3002",
      instances: 1,
      autorestart: true,
      max_memory_restart: "768M",
      env: {
        NODE_ENV: "production",
        PORT: "3002",
        API_ORIGIN: "http://127.0.0.1:8080",
        NEXT_PUBLIC_API_BASE: "/api",
      },
    },
  ],
};
