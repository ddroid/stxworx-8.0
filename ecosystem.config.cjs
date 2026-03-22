module.exports = {
  apps: [
    {
      name: "stxworx-app",
      script: "./dist/backend/index.cjs",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
