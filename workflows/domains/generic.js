// 通用领域配置 — 给 agent-orchestration 引擎加载
// 无领域绑定，适合非嵌入式项目

const config = {
  name: 'generic',

  skillCategory: {},

  categoryPrompts: {
    general: '按任务描述执行，确保产出符合验收标准',
  },

  troubleshootingMap: [],

  verificationCriteria: `
=== 验证标准 ===
1. 代码正确性: 逻辑无遗漏，边界条件已处理
2. 变更范围: 仅修改预期内的文件，无意外改动
3. 测试充分: 核心路径和异常路径均有覆盖`,

  // ── 安全层开关标记（规则集中在 safety-layer.js） ──
  security: {
    enabled: true,
    domain: 'generic',
    preflight_rules: {
      check_high_risk: true,
      check_file_permissions: true,
      check_blacklist: true,
      check_embedded_constraints: false,
    },
    output_filter: {
      filter_sensitive: true,
      filter_chip_uid: false,
      filter_firmware_keys: false,
    },
    audit: {
      enabled: true,
      trace_level: 'batch',
    },
  },

  // ── 工具层操作类（tool-layer） ──
  tool_layer: {
    operations: {
      scan_skills:     { risk: 'low',    desc: '扫描 skills 目录读取元数据' },
      adopt_skill:     { risk: 'low',    desc: '将已有 skill 注册到工具层' },
      install_skill:   { risk: 'medium', desc: '从 Git 源安装新 skill（文件复制）' },
      remove_skill:    { risk: 'medium', desc: '删除 skill 目录' },
      update_skill:    { risk: 'medium', desc: '从 Git 源更新现有 skill' },
      write_registry:  { risk: 'low',    desc: '写入工具层注册表 registry.json' },
    },
    allowed_paths: [
      '~/.claude/skills/',
      '~/.claude/tool-layer/',
    ],
  },
}

// eslint-disable-next-line no-unused-vars
const __domainConfig = config
