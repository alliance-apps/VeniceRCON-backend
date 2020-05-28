module.exports = {
  transform: {"^.+\\.ts?$": "ts-jest"},
  testEnvironment: "node",
  testRegex: "/tests/.*\\.spec\\.ts$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**"
  ],
  moduleNameMapper: {
    "^@service/(.*)$": `${__dirname}/src/services/$1`,
    "^@repository/(.*)$": `${__dirname}/src/services/orm/repository/$1`,
    "^@entity/(.*)$": `${__dirname}/src/services/orm/entity/$1`,
  }
}