import { config as baseConfig } from '@repo/eslint-config/base.js'

export default [...baseConfig, { ignores: ['.vinxi/**', 'dist/**', 'app/routeTree.gen.ts'] }]
