/**
 * Web 开发领域配置
 * 适用于 React/Vue/Angular/Node.js/Next.js 等 Web 全栈开发
 */

const config = {
  name: 'web',

  skillCategory: {
    // ── 前端框架（映射到实际技能目录名）──
    'react-best-practices': 'frontend',
    'vue-best-practices': 'frontend',
    'nuxt-best-practices': 'frontend',
    'senior-fullstack': 'frontend',
    'composition-patterns': 'frontend',

    // ── UI/样式 ──
    'tailwind-design-system': 'style',
    'tailwind-patterns': 'style',
    'css-modern-layouts': 'style',
    'radix-ui-design-system': 'ui',
    'frontend-design': 'ui',
    'ui-ux-pro-max': 'ui',
    'web-design-guidelines': 'ui',

    // ── 前端工具 ──
    'threejs-fundamentals': 'tool',
    'remotion-best-practices': 'tool',
    'frontend-slides': 'tool',

    // ── 后端（保留抽象标签，按需扩展实际技能）──
    'express': 'backend',
    'koa': 'backend',
    'fastify': 'backend',
    'nestjs': 'backend',
    'django': 'backend',
    'flask': 'backend',
    'spring': 'backend',

    // ── 数据库 ──
    'mysql': 'database',
    'postgresql': 'database',
    'mongodb': 'database',
    'redis': 'database',
    'prisma': 'orm',
    'sequelize': 'orm',
    'typeorm': 'orm',

    // ── 测试 ──
    'jest': 'test',
    'vitest': 'test',
    'cypress': 'test',
    'playwright': 'test',
    'mocha': 'test',

    // ── 构建/部署 ──
    'webpack': 'build',
    'vite': 'build',
    'esbuild': 'build',
    'docker': 'deploy',
    'nginx': 'deploy',
    'vercel': 'deploy',
    'netlify': 'deploy',

    // ── 工具/质量 ──
    'eslint': 'quality',
    'prettier': 'quality',
    'typescript': 'language',
    'graphql': 'api',
    'rest': 'api',
    'websocket': 'api',
  },

  categoryPrompts: {
    frontend: '遵循组件化设计原则，优先使用 Hooks/Composition API，避免 prop drilling；状态管理优先 Context/Zustand，复杂场景用 Redux',
    style: '遵循 Design Token 体系，响应式优先，移动先行；CSS 变量管理主题，避免 !important',
    ui: '无障碍优先（WCAG 2.1 AA），组件 API 设计简洁一致，支持主题定制和暗黑模式',
    tool: '按工具官方最佳实践集成，注意运行时依赖和打包体积；3D 场景注意内存管理和渲染性能',
    backend: '遵循 RESTful 规范，中间件链式处理，错误统一捕获；数据库操作使用 ORM，避免 SQL 拼接',
    database: '设计合理的索引，避免 N+1 查询；使用事务保证数据一致性；大表查询考虑分页',
    test: '单元测试覆盖核心逻辑，集成测试覆盖 API 端点，E2E 测试覆盖关键用户流程',
    build: '优化构建速度（代码分割/懒加载），产出体积分析，环境变量隔离',
    deploy: '容器化部署优先，健康检查端点必备，日志结构化输出',
    quality: 'ESLint 规则统一，Prettier 格式化，TypeScript 严格模式',
    api: '接口文档自动生成（Swagger/OpenAPI），版本管理（/v1/），限流/鉴权中间件',
  },

  troubleshootingMap: [
    {
      keywords: ['白屏', 'blank', '页面不显示'],
      step1: '检查控制台报错 → 定位组件渲染错误',
      step2: '检查路由配置 → 确认入口文件和 BrowserRouter',
    },
    {
      keywords: ['内存泄漏', 'memory leak', '组件卸载'],
      step1: '检查 useEffect 清理函数 → 取消订阅/定时器',
      step2: '检查事件监听器移除 → 使用 React DevTools Profiler',
    },
    {
      keywords: ['CORS', '跨域', 'cors'],
      step1: '后端配置 Access-Control-Allow-Origin',
      step2: '开发环境代理配置（vite proxy / webpack devServer）',
    },
    {
      keywords: ['502', '504', '网关错误'],
      step1: '检查后端服务是否运行 → 健康检查端点',
      step2: '检查 Nginx upstream 配置 → 超时设置',
    },
    {
      keywords: ['hydration', '水合', 'SSR'],
      step1: '检查服务端/客户端渲染内容一致性',
      step2: '使用 dynamic import + ssr: false 跳过水合',
    },
    {
      keywords: ['性能', 'performance', '加载慢'],
      step1: 'Lighthouse 审计 → 识别瓶颈',
      step2: '代码分割 + 懒加载 + 图片优化 + CDN',
    },
  ],

  verificationCriteria: `
## Web 开发知识验证标准

### 来源可信度
- 官方文档（React/Vue/Next.js）= 1.0
- 框架核心团队博客 = 0.9
- 知名技术社区（Stack Overflow/GitHub）= 0.75
- 技术博客（Medium/掘金）= 0.50
- 个人教程 = 0.30

### 验证规则
1. API 用法必须与官方文档一致
2. 版本兼容性必须确认（React 18 vs 17, Next.js 14 vs 13）
3. 性能建议必须有 Lighthouse 或基准测试支撑
4. 安全实践必须参考 OWASP Top 10
`,
};

const security = {
  enabled: true,
  domain: 'web',
  preflight_rules: {
    check_env_secrets: true,
    check_dependency_vulnerabilities: true,
    check_cors_configuration: true,
    check_sql_injection: true,
    check_xss_prevention: true,
  },
  output_filter: {
    filter_api_keys: true,
    filter_database_urls: true,
    filter_session_secrets: true,
  },
  audit: {
    trace_level: 'task',
  },
};

module.exports = { config, security };
