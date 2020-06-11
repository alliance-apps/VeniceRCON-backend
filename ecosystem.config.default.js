module.exports = {
  apps : [{
    name: "Battlefield Rcon",
    script: "ts-node",
    args: "-r ../node_modules/tsconfig-paths/register src/index.ts",
    env: {
      TYPEORM_HOST: "127.0.0.1",
      TYPEORM_PORT: 3306,
      TYPEORM_USERNAME: "battlefield",
      TYPEORM_PASSWORD: "",
      TYPEORM_DATABASE: "",
      LISTENPORT: 8000
  }
  }]
};
