module.exports = {
  apps : [{
    name: "Battlefield Rcon",
    script: "ts-node",
    args: "-r ../node_modules/tsconfig-paths/register src/index.ts",
    env: {
      TYPEORM_HOST: "10.10.12.104",
      TYPEORM_PORT: 3306,
      TYPEORM_USERNAME: "battlefield",
      TYPEORM_PASSWORD: "TM4cs7aM",
      TYPEORM_DATABASE: "battlefield3",
      LISTENPORT: 8000
  }
  }]
};
