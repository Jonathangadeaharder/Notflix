/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'no-server-imports-from-client',
      severity: 'error',
      from: {
        path: "^src/lib/server"
      },
      to: {
        path: "^src/lib/components",
        pathNot: "^src/lib/server"
      }
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "\\.spec\\.ts$",
          "\\.test\\.ts$",
          "app\\.d\\.ts",
          "hooks\\.server\\.ts",
          "src/lib/constants\\.ts",
          "src/lib/index\\.ts"
        ]
      },
      to: {}
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json'
    },
    reporterOptions: {
      dot: {
        theme: {
          graph: { rankdir: "TD" }
        }
      }
    }
  }
};
