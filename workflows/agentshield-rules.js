/**
 * AgentShield Rules — 安全扫描规则库
 *
 * 纯数据文件，无运行时依赖。
 * match 函数为纯函数，接收文件内容数组，返回匹配结果。
 *
 * 外部调用者负责读取文件内容后传入 files 参数。
 *
 * @typedef {Object} FileEntry
 * @property {string} name - 文件路径 (e.g. '/home/user/.claude/settings.json')
 * @property {string} content - 文件内容
 *
 * @typedef {Object|null} MatchResult
 * @property {boolean} matched - true
 * @property {string} evidence - 匹配到的证据片段
 * @property {string} file - 匹配到的文件路径
 * @property {number} line - 匹配到的行号 (1-based)
 *
 * @typedef {Object} Rule
 * @property {string} id - 唯一ID
 * @property {string} severity - 'critical' | 'high' | 'medium' | 'low'
 * @property {string} category - 'keys' | 'mcp' | 'permissions' | 'hooks' | 'agents'
 * @property {string} title - 规则标题
 * @property {string} description - 规则描述
 * @property {(files: FileEntry[]) => MatchResult} match - 匹配函数
 * @property {string} recommendation - 修复建议
 * @property {Object} auto_fix - 自动修复信息
 * @property {boolean} auto_fix.available - 是否可自动修复
 * @property {string} auto_fix.description - 修复方式描述
 */

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

/**
 * 检查一行文本是否包含某个模式，返回匹配行号和内容。
 */
function findLine(lines, pattern, startIndex) {
  for (let i = startIndex || 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return { line: i + 1, text: lines[i].trim() };
  }
  return null;
}

/**
 * 在文件内容中搜索所有匹配模式的行。
 */
function findAllLines(lines, pattern) {
  const results = [];
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) results.push({ line: i + 1, text: lines[i].trim() });
  }
  return results;
}

/**
 * 解析 JSON 文件内容为对象，失败返回 null。
 */
function parseJSON(content) {
  try {
    return JSON.parse(content);
  } catch { return null; }
}

/**
 * 安全地通过路径访问嵌套对象属性。
 */
function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

/**
 * 检查字符串是否匹配正则模式列表。
 */
function matchesAny(str, patterns) {
  return patterns.some(p => p.test(str));
}

/**
 * 获取行号（1-based）：在 lines 数组中查找 value 的 index + 1，
 * 从 startIdx 开始搜索。
 */
function lineNumberOf(lines, value, startIdx) {
  for (let i = startIdx || 0; i < lines.length; i++) {
    if (lines[i].includes(value)) return i + 1;
  }
  return 1;
}

// ---------------------------------------------------------------------------
// KEY Scanner — 密钥与凭证扫描
// ---------------------------------------------------------------------------

const KEY_PATTERNS = [
  { pattern: /sk-ant-[a-zA-Z0-9]{20,}/, label: 'Anthropic API Key (sk-ant-*)' },
  { pattern: /sk-proj-[a-zA-Z0-9]{20,}/, label: 'OpenAI API Key (sk-proj-*)' },
  { pattern: /AKIA[0-9A-Z]{16}/, label: 'AWS Access Key (AKIA*)' },
  { pattern: /ghp_[a-zA-Z0-9]{36,}/, label: 'GitHub Personal Access Token (ghp_*)' },
  { pattern: /github_pat_[a-zA-Z0-9_]{36,}/, label: 'GitHub PAT (github_pat_*)' },
  { pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/, label: 'JWT token' },
];

const DB_CONNECTION_PATTERNS = [
  /mysql:\/\/[^:]+:[^@\s]+@/,
  /postgres:\/\/[^:]+:[^@\s]+@/,
  /mongodb(?:\+srv)?:\/\/[^:]+:[^@\s]+@/,
  /redis:\/\/[^:]+:[^@\s]+@/,
  /jdbc:[a-z]+:\/\/[^:]+:[^@\s]+@/,
  /"password"\s*:\s*"[^"]+"/i,
  /"pwd"\s*:\s*"[^"]+"/i,
  /password\s*[=:]\s*['"][^'"]+['"]/i,
];

const KEY_RULES = [
  // -----------------------------------------------------------------------
  // KEY-001: Anthropic API Key 硬编码
  // -----------------------------------------------------------------------
  {
    id: 'KEY-001',
    severity: 'critical',
    category: 'keys',
    title: '硬编码 Anthropic API Key',
    description: '检测 ~/.claude/ 配置文件中明文出现的 Anthropic API Key (sk-ant-...)',
    match: (files) => {
      for (const file of files) {
        const lines = file.content.split('\n');
        const result = findLine(lines, /sk-ant-[a-zA-Z0-9]{20,}/);
        if (result) {
          return { matched: true, evidence: result.text, file: file.name, line: result.line };
        }
      }
      return null;
    },
    recommendation: '使用环境变量 ANTHROPIC_AUTH_TOKEN 替代硬编码',
    auto_fix: { available: true, description: '从文件中移除 API Key 并替换为 ${ANTHROPIC_AUTH_TOKEN} 占位符' },
  },

  // -----------------------------------------------------------------------
  // KEY-002: OpenAI API Key 硬编码
  // -----------------------------------------------------------------------
  {
    id: 'KEY-002',
    severity: 'critical',
    category: 'keys',
    title: '硬编码 OpenAI API Key',
    description: '检测 ~/.claude/ 配置文件中明文出现的 OpenAI API Key (sk-proj-...)',
    match: (files) => {
      for (const file of files) {
        const lines = file.content.split('\n');
        const result = findLine(lines, /sk-proj-[a-zA-Z0-9]{20,}/);
        if (result) {
          return { matched: true, evidence: result.text, file: file.name, line: result.line };
        }
      }
      return null;
    },
    recommendation: '使用环境变量 OPENAI_API_KEY 替代硬编码',
    auto_fix: { available: true, description: '从文件中移除 API Key 并替换为 ${OPENAI_API_KEY} 占位符' },
  },

  // -----------------------------------------------------------------------
  // KEY-003: 环境变量文件中的明文 token
  // -----------------------------------------------------------------------
  {
    id: 'KEY-003',
    severity: 'high',
    category: 'keys',
    title: '环境变量文件中的明文 token',
    description: '检测 .env* 文件中明文出现的 API token、secret 或密钥',
    match: (files) => {
      for (const file of files) {
        if (!/\.env/.test(file.name)) continue;
        const lines = file.content.split('\n');
        const sensitiveVars = findAllLines(lines,
          /(API_KEY|API_SECRET|ACCESS_TOKEN|SECRET_KEY|AUTH_TOKEN|API_TOKEN|APP_SECRET)\s*=\s*['"]?[^'"\s]{8,}/i
        );
        if (sensitiveVars.length > 0) {
          return {
            matched: true,
            evidence: sensitiveVars.map(r => r.text).join('; ').slice(0, 200),
            file: file.name,
            line: sensitiveVars[0].line,
          };
        }
      }
      return null;
    },
    recommendation: '使用 secrets 管理服务（如 1Password CLI、Windows Credential Manager）替代 .env 明文存储',
    auto_fix: { available: false, description: '需人工评估每个 token 的用途并迁移到安全存储' },
  },

  // -----------------------------------------------------------------------
  // KEY-004: AWS Access Key 硬编码
  // -----------------------------------------------------------------------
  {
    id: 'KEY-004',
    severity: 'critical',
    category: 'keys',
    title: '硬编码 AWS Access Key',
    description: '检测 ~/.claude/ 配置文件中明文出现的 AWS Access Key ID (AKIA...)',
    match: (files) => {
      for (const file of files) {
        const lines = file.content.split('\n');
        const result = findLine(lines, /AKIA[0-9A-Z]{16}/);
        if (result) {
          return { matched: true, evidence: result.text, file: file.name, line: result.line };
        }
      }
      return null;
    },
    recommendation: '使用 AWS IAM 角色或 aws-vault 管理凭据',
    auto_fix: { available: false, description: '需轮换 AK 并迁移到 IAM 角色或 aws-vault' },
  },

  // -----------------------------------------------------------------------
  // KEY-005: 私钥文件引用在配置中
  // -----------------------------------------------------------------------
  {
    id: 'KEY-005',
    severity: 'high',
    category: 'keys',
    title: '配置文件引用私钥文件',
    description: '检测 settings.json / CLAUDE.md / AGENTS.md 中引用 ~/.ssh/ 或 *.pem 私钥文件',
    match: (files) => {
      const keyRefPatterns = [
        /['"]~\/\.ssh\/[a-zA-Z0-9_-]+['"]/,
        /['"][a-zA-Z0-9_\/.-]+\.pem['"]/,
        /identityFile[=:]\s*['"]?~\/\.ssh\//i,
        /['"]~\/\.ssh\/[a-zA-Z0-9_-]+['"]/,
        /ssh_key\s*[=:]\s*['"]/i,
        /private_key\s*[=:]\s*['"]/i,
      ];
      for (const file of files) {
        if (!/(settings\.json|CLAUDE\.md|AGENTS\.md)$/.test(file.name)) continue;
        const lines = file.content.split('\n');
        for (const pattern of keyRefPatterns) {
          const result = findLine(lines, pattern);
          if (result) {
            return { matched: true, evidence: result.text, file: file.name, line: result.line };
          }
        }
      }
      return null;
    },
    recommendation: '使用 SSH agent 管理私钥，避免在配置文件中直接引用私钥路径',
    auto_fix: { available: false, description: '需人工审核并替换为 SSH agent 引用方式' },
  },

  // -----------------------------------------------------------------------
  // KEY-006: JWT token 硬编码
  // -----------------------------------------------------------------------
  {
    id: 'KEY-006',
    severity: 'medium',
    category: 'keys',
    title: '硬编码 JWT token',
    description: '检测 ~/.claude/ 配置文件中明文出现的 JWT token（三部分 base64 编码）',
    match: (files) => {
      for (const file of files) {
        if (/\.(png|jpg|gif|ico|woff2?|ttf|eot)$/.test(file.name)) continue;
        const lines = file.content.split('\n');
        const result = findLine(lines, /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/);
        if (result) {
          return { matched: true, evidence: result.text.slice(0, 120), file: file.name, line: result.line };
        }
      }
      return null;
    },
    recommendation: 'JWT token 应动态获取，不要硬编码在配置文件中',
    auto_fix: { available: false, description: '需轮换 token 并改用动态认证流程' },
  },

  // -----------------------------------------------------------------------
  // KEY-007: 数据库连接串中的明文密码
  // -----------------------------------------------------------------------
  {
    id: 'KEY-007',
    severity: 'critical',
    category: 'keys',
    title: '数据库连接串中的明文密码',
    description: '检测 settings.json / .env* 中数据库连接串包含明文密码',
    match: (files) => {
      for (const file of files) {
        if (!/(settings\.json|\.env|\.yml|\.yaml|\.md)$/.test(file.name)) continue;
        const lines = file.content.split('\n');
        for (const dbPat of DB_CONNECTION_PATTERNS) {
          const result = findLine(lines, dbPat);
          if (result) {
            return { matched: true, evidence: result.text.slice(0, 150), file: file.name, line: result.line };
          }
        }
      }
      return null;
    },
    recommendation: '使用环境变量引用密码（${DB_PASSWORD}），或使用凭据管理服务',
    auto_fix: { available: true, description: '提取密码到环境变量并替换连接串中的明文部分为 ${VAR} 占位符' },
  },

  // -----------------------------------------------------------------------
  // KEY-008: GitHub PAT 硬编码
  // -----------------------------------------------------------------------
  {
    id: 'KEY-008',
    severity: 'high',
    category: 'keys',
    title: '硬编码 GitHub Personal Access Token',
    description: '检测 ~/.claude/ 配置文件中明文出现的 GitHub PAT (ghp_ / github_pat_)',
    match: (files) => {
      for (const file of files) {
        const lines = file.content.split('\n');
        const result = findLine(lines, /(ghp_|github_pat_)[a-zA-Z0-9_]{36,}/);
        if (result) {
          return { matched: true, evidence: result.text, file: file.name, line: result.line };
        }
      }
      return null;
    },
    recommendation: '使用 GITHUB_TOKEN 环境变量或 GitHub CLI (gh auth) 认证',
    auto_fix: { available: true, description: '从文件中移除 PAT 并替换为 ${GITHUB_TOKEN} 占位符' },
  },

  // -----------------------------------------------------------------------
  // KEY-009: settings.json 环境变量中嵌入了 secret
  // -----------------------------------------------------------------------
  {
    id: 'KEY-009',
    severity: 'medium',
    category: 'keys',
    title: '环境变量配置中嵌入直接值而非引用',
    description: '检测 settings.json 的 env 字段中直接写入 secret 值而非引用环境变量',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config || !config.env) continue;
        const lines = file.content.split('\n');
        const secretKeyNames = ['api_key', 'api_secret', 'token', 'secret', 'password', 'passwd', 'auth'];
        const results = [];
        for (const [key, value] of Object.entries(config.env)) {
          if (typeof value !== 'string') continue;
          const isSecret = secretKeyNames.some(n => key.toLowerCase().includes(n));
          const isRef = /^\$\{(.+)\}$/.test(value) || /^\$([A-Z_]+)$/.test(value);
          if (isSecret && !isRef && value.length > 4) {
            const line = lineNumberOf(lines, `"${key}"`);
            results.push({ key, val: value.slice(0, 60), line });
          }
        }
        if (results.length > 0) {
          return {
            matched: true,
            evidence: results.map(r => `${r.key}=${r.val}`).join('; '),
            file: file.name,
            line: results[0].line,
          };
        }
      }
      return null;
    },
    recommendation: 'env 字段中的 secret 值应使用 ${VARIABLE_NAME} 引用环境变量',
    auto_fix: { available: true, description: '将直接值替换为 ${KEY_NAME} 引用格式（需确保环境变量已设置）' },
  },

  // -----------------------------------------------------------------------
  // KEY-010: 日志/缓存文件包含敏感信息
  // -----------------------------------------------------------------------
  {
    id: 'KEY-010',
    severity: 'low',
    category: 'keys',
    title: '日志/缓存文件可能包含敏感信息',
    description: '检测 ~/.claude/ 下的日志文件和缓存目录中是否包含 API key 或 token 痕迹',
    match: (files) => {
      const logCachePatterns = [/\.log$/, /cache/, /tmp/, /transcript/, /trace/];
      for (const file of files) {
        const isSensitiveFile = logCachePatterns.some(p => p.exec(file.name));
        if (!isSensitiveFile) continue;
        const lines = file.content.split('\n');
        for (const { pattern, label } of KEY_PATTERNS) {
          const result = findLine(lines, pattern);
          if (result) {
            return { matched: true, evidence: `${label}: ${result.text.slice(0, 100)}`, file: file.name, line: result.line };
          }
        }
      }
      return null;
    },
    recommendation: '配置日志脱敏规则，确保 log/tmp/cache 目录不持久化敏感信息',
    auto_fix: { available: false, description: '需配置日志脱敏管道或清理已存在的敏感日志' },
  },
];

// ---------------------------------------------------------------------------
// MCP Scanner — MCP Server 配置安全扫描
// ---------------------------------------------------------------------------

const MCP_RULES = [
  // -----------------------------------------------------------------------
  // MCP-001: MCP server 使用未加密 HTTP 传输
  // -----------------------------------------------------------------------
  {
    id: 'MCP-001',
    severity: 'high',
    category: 'mcp',
    title: 'MCP server 使用未加密 HTTP 传输',
    description: '检测 MCP server 配置中的 url 字段是否使用 http:// 而非 https://',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        const lines = file.content.split('\n');
        for (const [name, srv] of Object.entries(servers)) {
          if (srv.url && /^http:\/\//.test(srv.url)) {
            const line = lineNumberOf(lines, srv.url);
            return { matched: true, evidence: `MCP server "${name}" 使用 HTTP: ${srv.url}`, file: file.name, line };
          }
        }
      }
      return null;
    },
    recommendation: '将 http:// 替换为 https:// 启用 TLS 加密传输',
    auto_fix: { available: true, description: '自动将 http:// 替换为 https://（需 server 端支持）' },
  },

  // -----------------------------------------------------------------------
  // MCP-002: MCP server 命令含 npx -y 自动安装
  // -----------------------------------------------------------------------
  {
    id: 'MCP-002',
    severity: 'medium',
    category: 'mcp',
    title: 'MCP server 命令含 npx -y 自动安装',
    description: '检测 MCP server 的 command 字段是否包含 npx -y（不经确认自动安装 npm 包）',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        const lines = file.content.split('\n');
        for (const [name, srv] of Object.entries(servers)) {
          if (srv.command && /npx\s+-y/.test(srv.command)) {
            const line = lineNumberOf(lines, srv.command);
            return {
              matched: true,
              evidence: `MCP server "${name}" 使用 npx -y: ${srv.command}`,
              file: file.name,
              line,
            };
          }
        }
      }
      return null;
    },
    recommendation: '先用 npm install 安装包，再用 node 直接运行，避免 npx -y 自动下载未审计代码',
    auto_fix: { available: false, description: '需手动替换为预安装后使用 node 直接调用' },
  },

  // -----------------------------------------------------------------------
  // MCP-003: MCP server 参数含 .env / .pem / credentials.json
  // -----------------------------------------------------------------------
  {
    id: 'MCP-003',
    severity: 'high',
    category: 'mcp',
    title: 'MCP server 参数含凭据文件引用',
    description: '检测 MCP server args 中是否包含 .env, .pem, credentials.json 等凭据文件',
    match: (files) => {
      const sensitiveRefs = [/\.env/, /\.pem/, /credentials\.json/, /service-account/, /\.key$/];
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        const lines = file.content.split('\n');
        for (const [name, srv] of Object.entries(servers)) {
          const args = srv.args || [];
          for (let i = 0; i < args.length; i++) {
            if (typeof args[i] === 'string' && matchesAny(args[i], sensitiveRefs)) {
              const line = lineNumberOf(lines, args[i]);
              return {
                matched: true,
                evidence: `MCP server "${name}" args[${i}] 引用凭据文件: ${args[i]}`,
                file: file.name,
                line,
              };
            }
          }
        }
      }
      return null;
    },
    recommendation: '将凭据文件路径替换为环境变量引用，或使用 secure enclave 注入',
    auto_fix: { available: false, description: '需评估每个凭据文件的使用方式后迁移' },
  },

  // -----------------------------------------------------------------------
  // MCP-004: MCP server 绑定到 0.0.0.0
  // -----------------------------------------------------------------------
  {
    id: 'MCP-004',
    severity: 'medium',
    category: 'mcp',
    title: 'MCP server 绑定到 0.0.0.0',
    description: '检测 MCP server 的 url 或 args 中是否包含 0.0.0.0 开放所有网络接口',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        const lines = file.content.split('\n');
        for (const [name, srv] of Object.entries(servers)) {
          const textToCheck = JSON.stringify(srv);
          if (/0\.0\.0\.0/.test(textToCheck)) {
            const line = lineNumberOf(lines, name);
            return {
              matched: true,
              evidence: `MCP server "${name}" 配置涉及 0.0.0.0 绑定`,
              file: file.name,
              line,
            };
          }
        }
      }
      return null;
    },
    recommendation: '绑定到 127.0.0.1 限制本地访问，或使用 Unix socket',
    auto_fix: { available: true, description: '将 0.0.0.0 替换为 127.0.0.1' },
  },

  // -----------------------------------------------------------------------
  // MCP-005: MCP server 配置中的硬编码密钥
  // -----------------------------------------------------------------------
  {
    id: 'MCP-005',
    severity: 'critical',
    category: 'mcp',
    title: 'MCP server 配置中的硬编码密钥',
    description: '检测 MCP server 配置对象的 env / args 中是否包含明文 API key 或 token',
    match: (files) => {
      const secretPatterns = [
        /api[_-]?key['"]?\s*[:=]\s*['"][a-zA-Z0-9_-]{16,}['"]/i,
        /token['"]?\s*[:=]\s*['"][a-zA-Z0-9_-]{16,}['"]/i,
        /secret['"]?\s*[:=]\s*['"][a-zA-Z0-9_\/+=-]{16,}['"]/i,
        /password['"]?\s*[:=]\s*['"][^'"]+['"]/i,
      ];
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        const lines = file.content.split('\n');
        for (const [name, srv] of Object.entries(servers)) {
          const srvStr = JSON.stringify(srv);
          for (const pat of secretPatterns) {
            const m = srvStr.match(pat);
            if (m) {
              // 找到在原文件中的位置
              const line = lineNumberOf(lines, m[0].slice(0, 30));
              return {
                matched: true,
                evidence: `MCP server "${name}" 含硬编码密钥: ${m[0].slice(0, 80)}`,
                file: file.name,
                line,
              };
            }
          }
        }
      }
      return null;
    },
    recommendation: 'MCP server 的密钥应通过系统环境变量注入，不写入配置文件',
    auto_fix: { available: false, description: '需轮换已泄露的密钥并改为环境变量方式注入' },
  },

  // -----------------------------------------------------------------------
  // MCP-006: MCP server 无超时设置
  // -----------------------------------------------------------------------
  {
    id: 'MCP-006',
    severity: 'low',
    category: 'mcp',
    title: 'MCP server 无超时设置',
    description: '检测 MCP server 配置是否缺少 timeout 字段（可能导致连接 hang）',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        const serverNames = Object.keys(servers);
        if (serverNames.length === 0) continue;
        const missingTimeout = serverNames.filter(n => servers[n].timeout === undefined);
        if (missingTimeout.length > 0) {
          const lines = file.content.split('\n');
          const line = lineNumberOf(lines, missingTimeout[0]);
          return {
            matched: true,
            evidence: `MCP server 缺少 timeout 设置: ${missingTimeout.join(', ')}`,
            file: file.name,
            line,
          };
        }
      }
      return null;
    },
    recommendation: '为每个 MCP server 添加合理的 timeout（建议 30-60 秒）',
    auto_fix: { available: true, description: '为缺少 timeout 的 server 添加 timeout: 30000（30 秒）' },
  },

  // -----------------------------------------------------------------------
  // MCP-007: MCP server 含 autoApprove 功能
  // -----------------------------------------------------------------------
  {
    id: 'MCP-007',
    severity: 'medium',
    category: 'mcp',
    title: 'MCP server 含 autoApprove 功能',
    description: '检测 MCP server 是否启用了 autoApprove 自动审批危险工具调用',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        const lines = file.content.split('\n');
        for (const [name, srv] of Object.entries(servers)) {
          if (srv.autoApprove && srv.autoApprove.length > 0) {
            const line = lineNumberOf(lines, name);
            return {
              matched: true,
              evidence: `MCP server "${name}" 启用了 autoApprove: [${srv.autoApprove.join(', ')}]`,
              file: file.name,
              line,
            };
          }
        }
      }
      return null;
    },
    recommendation: '关闭 autoApprove，让用户逐次确认危险工具调用',
    auto_fix: { available: true, description: '将 autoApprove 设置为空数组 []' },
  },

  // -----------------------------------------------------------------------
  // MCP-008: MCP 命令含 Shell 元字符
  // -----------------------------------------------------------------------
  {
    id: 'MCP-008',
    severity: 'high',
    category: 'mcp',
    title: 'MCP 命令含 Shell 元字符',
    description: '检测 MCP server 的 command 或 args 中是否包含 && | ; 等 Shell 元字符（可能注入）',
    match: (files) => {
      const shellMeta = /[;&|`$(){}\[\]]/;
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        const lines = file.content.split('\n');
        for (const [name, srv] of Object.entries(servers)) {
          const checkItems = [srv.command, ...(srv.args || [])].filter(Boolean);
          for (const item of checkItems) {
            if (shellMeta.test(item) && !/npx|npm|yarn|pnpm/.test(item)) {
              const line = lineNumberOf(lines, item);
              return {
                matched: true,
                evidence: `MCP server "${name}" 含 Shell 元字符: ${item.slice(0, 100)}`,
                file: file.name,
                line,
              };
            }
          }
        }
      }
      return null;
    },
    recommendation: '避免在 command/args 中使用 Shell 元字符，用数组参数绕过 Shell 解析',
    auto_fix: { available: false, description: '需人工审查并重构为安全的参数传递方式' },
  },

  // -----------------------------------------------------------------------
  // MCP-009: MCP 配置来自不受信任的来源
  // -----------------------------------------------------------------------
  {
    id: 'MCP-009',
    severity: 'medium',
    category: 'mcp',
    title: 'MCP 配置来自不受信任的来源',
    description: '检测 MCP server 的 url 或 command 是否指向不受信任的 URL/IP 或第三方源',
    match: (files) => {
      const untrustedDomains = [
        /\.ml$/i, /\.tk$/i, /\.ga$/i, /\.cf$/i, /\.gq$/i,
        /raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/.*/,
        /bit\.ly/i, /tinyurl\.com/i, /shorturl\.at/i,
      ];
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        const lines = file.content.split('\n');
        for (const [name, srv] of Object.entries(servers)) {
          const urls = [];
          if (srv.url) urls.push(srv.url);
          if (srv.command && /^https?:\/\//.test(srv.command)) urls.push(srv.command);
          for (const url of urls) {
            if (matchesAny(url, untrustedDomains)) {
              const line = lineNumberOf(lines, url);
              return {
                matched: true,
                evidence: `MCP server "${name}" 指向不受信任来源: ${url}`,
                file: file.name,
                line,
              };
            }
          }
        }
      }
      return null;
    },
    recommendation: '只从可信源安装 MCP server（官方 npm 包、已知 GitHub 组织）',
    auto_fix: { available: false, description: '需人工审计 server 来源可信度' },
  },

  // -----------------------------------------------------------------------
  // MCP-010: MCP server 数量过多
  // -----------------------------------------------------------------------
  {
    id: 'MCP-010',
    severity: 'low',
    category: 'mcp',
    title: 'MCP server 数量过多',
    description: '检测 MCP server 数量是否超过 10 个（增加攻击面和 token 消耗）',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        const names = Object.keys(servers);
        if (names.length > 10) {
          const lines = file.content.split('\n');
          const line = lineNumberOf(lines, 'mcpServers');
          return {
            matched: true,
            evidence: `MCP server 数量: ${names.length}（超过 10 个限制）`,
            file: file.name,
            line,
          };
        }
      }
      return null;
    },
    recommendation: '移除不需要的 MCP server，保持最小必要原则',
    auto_fix: { available: false, description: '需人工评估每个 server 的必要性后移除' },
  },
];

// ---------------------------------------------------------------------------
// PERM Scanner — 权限配置安全扫描
// ---------------------------------------------------------------------------

const PERM_RULES = [
  // -----------------------------------------------------------------------
  // PERM-001: 权限 allow(*) 过于宽松
  // -----------------------------------------------------------------------
  {
    id: 'PERM-001',
    severity: 'medium',
    category: 'permissions',
    title: '权限 allow(*) 过于宽松',
    description: '检测 settings.json 中 permissions 是否包含 allow(*) 放开所有权限',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const perms = getNested(config, 'permissions') || {};
        const lines = file.content.split('\n');
        // 检查全局 permissions.allow
        if (Array.isArray(perms.allow)) {
          for (const entry of perms.allow) {
            if (entry === '*' || entry === 'all') {
              const line = lineNumberOf(lines, `"${entry}"`);
              return { matched: true, evidence: `permissions.allow 包含 "${entry}" 全放开`, file: file.name, line };
            }
          }
        }
        // 检查 project 级别的 permissions
        if (config.projects) {
          for (const proj of Object.values(config.projects)) {
            const projPerms = proj.permissions || proj.settings?.permissions;
            if (!projPerms) continue;
            if (Array.isArray(projPerms.allow)) {
              for (const entry of projPerms.allow) {
                if (entry === '*' || entry === 'all') {
                  const line = lineNumberOf(lines, `"${entry}"`);
                  return { matched: true, evidence: `项目级别 permissions.allow 包含 "${entry}" 全放开`, file: file.name, line };
                }
              }
            }
          }
        }
      }
      return null;
    },
    recommendation: '使用最小权限原则，列出具体允许的权限项而非通配符',
    auto_fix: { available: false, description: '需人工审计实际需要的权限列表' },
  },

  // -----------------------------------------------------------------------
  // PERM-002: Bash(*) 全放开
  // -----------------------------------------------------------------------
  {
    id: 'PERM-002',
    severity: 'medium',
    category: 'permissions',
    title: 'Bash(*) 全放开',
    description: '检测 permissions.allow 中是否包含 Bash(*) 允许所有 shell 命令',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const perms = getNested(config, 'permissions') || {};
        const lines = file.content.split('\n');
        const checkSet = (arr, context) => {
          if (!Array.isArray(arr)) return;
          for (const entry of arr) {
            if (entry === 'Bash(*)') {
              const line = lineNumberOf(lines, entry);
              return { matched: true, evidence: `${context} 包含 Bash(*) 全放开命令行`, file: file.name, line };
            }
          }
          return null;
        };
        let r = checkSet(perms.allow, 'permissions.allow');
        if (r) return r;
        // 也检查 project 嵌套
        if (config.projects) {
          for (const proj of Object.values(config.projects)) {
            const projPerms = proj.permissions || proj.settings?.permissions;
            if (projPerms) {
              r = checkSet(projPerms.allow, `项目 ${proj.name || 'unknown'} permissions.allow`);
              if (r) return r;
            }
          }
        }
      }
      return null;
    },
    recommendation: '限制 Bash 允许列表，只放行具体需要的命令（如 Bash(git), Bash(npm)）',
    auto_fix: { available: true, description: '将 Bash(*) 替换为最小必要的具体命令列表' },
  },

  // -----------------------------------------------------------------------
  // PERM-003: 读写权限不匹配
  // -----------------------------------------------------------------------
  {
    id: 'PERM-003',
    severity: 'low',
    category: 'permissions',
    title: '读写权限不匹配',
    description: '检测 Read 是自动模式但 Write 需要明确允许，产生混淆',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const perms = getNested(config, 'permissions') || {};
        const lines = file.content.split('\n');
        // 检查 Write 在 allow 中但 Read 在 auto 中的情况
        const hasWriteAllowed = Array.isArray(perms.allow) && perms.allow.some(
          p => /^Write/.test(p) || p === '*' || p === 'all'
        );
        const readPatterns = [/^Read\s*\(/, /^Read\b/, /^FileRead/, /^read\b/i];
        const writePatterns = [/^Write\s*\(/, /^Write\b/, /^FileWrite/, /^write\b/i];
        // 检查是否同时存在 Read 和 Write 但模式不一致
        if (hasWriteAllowed) {
          // 如果 Read 完全不在 allow 里，那可能是 auto 模式
          const hasReadAllowed = Array.isArray(perms.allow) && perms.allow.some(
            p => readPatterns.some(pat => pat.test(p)) || p === '*' || p === 'all'
          );
          if (!hasReadAllowed && Array.isArray(perms.allow)) {
            const writeEntries = perms.allow.filter(p => writePatterns.some(pat => pat.test(p)));
            const line = lineNumberOf(lines, writeEntries[0]);
            return {
              matched: true,
              evidence: `Write 已明确允许 (${writeEntries.join(', ')}) 但 Read 不在 allow 列表中（可能 auto）`,
              file: file.name,
              line,
            };
          }
        }
      }
      return null;
    },
    recommendation: '保持 Read 和 Write 权限模式一致，避免用户困惑',
    auto_fix: { available: false, description: '需人工评估并统一权限策略' },
  },

  // -----------------------------------------------------------------------
  // PERM-004: defaultMode 为 auto
  // -----------------------------------------------------------------------
  {
    id: 'PERM-004',
    severity: 'medium',
    category: 'permissions',
    title: 'defaultMode 为 auto',
    description: '检测 settings.json 中 permissions.defaultMode 是否设为 auto（自动允许所有操作）',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        // 检测全局 defaultMode
        let defaultMode = getNested(config, 'permissions.defaultMode');
        if (!defaultMode && config.defaultMode) defaultMode = config.defaultMode;
        if (defaultMode === 'auto' || defaultMode === 'allow') {
          const lines = file.content.split('\n');
          let line = lineNumberOf(lines, 'defaultMode');
          if (line === 1 && !lines[0].includes('defaultMode')) line = 1;
          return {
            matched: true,
            evidence: `permissions.defaultMode 为 "${defaultMode}" — 所有操作自动放行`,
            file: file.name,
            line,
          };
        }
        // 也检查 per-project
        if (config.projects) {
          for (const proj of Object.values(config.projects)) {
            const projPerms = proj.permissions || proj.settings?.permissions;
            if (!projPerms) continue;
            const pdm = projPerms.defaultMode || projPerms.mode;
            if (pdm === 'auto' || pdm === 'allow') {
              const lines = file.content.split('\n');
              return {
                matched: true,
                evidence: `项目 ${proj.name || 'unknown'} 的 defaultMode 为 "${pdm}"`,
                file: file.name,
                line: lineNumberOf(lines, pdm),
              };
            }
          }
        }
      }
      return null;
    },
    recommendation: '将 defaultMode 设为 "prompt" 让每步操作都需要用户确认',
    auto_fix: { available: true, description: '将 defaultMode 改为 "prompt"' },
  },

  // -----------------------------------------------------------------------
  // PERM-005: enableWorkflows 开启 + 全权限同时存在
  // -----------------------------------------------------------------------
  {
    id: 'PERM-005',
    severity: 'low',
    category: 'permissions',
    title: 'Workflow 模式 + 全权限组合风险',
    description: '检测 enableWorkflows 开启且 permissions.allow 包含 * 或 Bash(*) 的组合（Workflow 可自动执行全权限）',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const enableWF = config.enableWorkflows || getNested(config, 'settings.enableWorkflows');
        if (!enableWF) continue;
        const perms = getNested(config, 'permissions') || {};
        const isPermissive = Array.isArray(perms.allow) && perms.allow.some(
          p => p === '*' || p === 'all' || p === 'Bash(*)'
        );
        const isAutoMode = (perms.defaultMode || config.defaultMode) === 'auto';
        if (isPermissive || isAutoMode) {
          const lines = file.content.split('\n');
          const line = lineNumberOf(lines, 'enableWorkflows');
          return {
            matched: true,
            evidence: `enableWorkflows 开启 + ${isPermissive ? '通配权限' : ''}${isPermissive && isAutoMode ? ' + ' : ''}${isAutoMode ? 'auto 模式' : ''} — Workflow 可自动执行任意操作`,
            file: file.name,
            line,
          };
        }
      }
      return null;
    },
    recommendation: 'Workflow 开启时应配合最小权限原则，禁用通配符和 auto 模式',
    auto_fix: { available: false, description: '需人工审查并收紧权限策略' },
  },
];

// ---------------------------------------------------------------------------
// HOOK Scanner — Hook 脚本安全扫描
// ---------------------------------------------------------------------------

const HOOK_RULES = [
  // -----------------------------------------------------------------------
  // HOOK-001: hook 脚本含危险命令
  // -----------------------------------------------------------------------
  {
    id: 'HOOK-001',
    severity: 'critical',
    category: 'hooks',
    title: 'hook 脚本含危险命令',
    description: '检测 hook 脚本（settings.json 引用的或 hooks/ 目录下的）是否包含 rm -rf、dd、curl|bash 等高危命令',
    match: (files) => {
      const dangerous = [
        { pattern: /\brm\s+-rf\s+(\/\s*|\/\*\s*|~\s*|\.\s*)/, label: 'rm -rf 根目录/全删' },
        { pattern: /\bdd\s+if=\/dev\/zero/, label: 'dd 写零' },
        { pattern: /\bdd\s+if=\/dev\/urandom/, label: 'dd 随机数据' },
        { pattern: /\bcurl\s+.*\|\s*(bash|sh)\b/, label: 'curl|bash 远程执行' },
        { pattern: /\bwget\s+.*\|\s*(bash|sh)\b/, label: 'wget|bash 远程执行' },
        { pattern: /\bchmod\s+-R\s+777\s+\//, label: 'chmod 777 / 递归' },
        { pattern: /\bchown\s+-R\s+.*\s+\//, label: 'chown -R 根目录' },
        { pattern: /\bmv\s+\/\s+\/dev\/null/, label: '移根目录到 /dev/null' },
        { pattern: /:\(\)\s*\{/, label: 'Fork 炸弹' },
        { pattern: /\b>\/dev\/sda\b/, label: '覆写块设备' },
        { pattern: /\bshutdown\b/, label: '关机命令' },
        { pattern: /\breboot\b/, label: '重启命令' },
        { pattern: /\binit\s+0\b/, label: 'init 0 关机' },
        { pattern: /\binit\s+6\b/, label: 'init 6 重启' },
      ];
      for (const file of files) {
        if (!/\.(sh|bat|ps1|bash|zsh)$/.test(file.name) &&
            !/settings\.json$/.test(file.name) &&
            !/AGENTS\.md$/.test(file.name)) continue;
        const lines = file.content.split('\n');
        for (const { pattern, label } of dangerous) {
          const result = findLine(lines, pattern);
          if (result) {
            return { matched: true, evidence: `${label}: ${result.text.slice(0, 120)}`, file: file.name, line: result.line };
          }
        }
      }
      return null;
    },
    recommendation: '移除 hook 中的危险命令，使用安全替代方案',
    auto_fix: { available: false, description: '需人工审查并移除危险命令或添加用户确认机制' },
  },

  // -----------------------------------------------------------------------
  // HOOK-002: SessionStart hook 是 async: false 阻塞型
  // -----------------------------------------------------------------------
  {
    id: 'HOOK-002',
    severity: 'medium',
    category: 'hooks',
    title: 'SessionStart hook 阻塞模式',
    description: '检测 SessionStart hook 是否配置为 async: false（同步阻塞，延迟会话启动）',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const hooks = getNested(config, 'hooks') || config.hooks;
        if (!hooks || !hooks.SessionStart) continue;
        const lines = file.content.split('\n');
        for (const hook of (Array.isArray(hooks.SessionStart) ? hooks.SessionStart : [hooks.SessionStart])) {
          if (hook.async === false || hook.async === 'false') {
            const line = lineNumberOf(lines, 'SessionStart');
            return {
              matched: true,
              evidence: 'SessionStart hook 为 async: false 阻塞模式',
              file: file.name,
              line,
            };
          }
        }
      }
      return null;
    },
    recommendation: '将 SessionStart hook 设为 async: true 避免阻塞会话启动',
    auto_fix: { available: true, description: '将 hook 的 async 设置为 true' },
  },

  // -----------------------------------------------------------------------
  // HOOK-003: hook 超时设置过长
  // -----------------------------------------------------------------------
  {
    id: 'HOOK-003',
    severity: 'low',
    category: 'hooks',
    title: 'hook 超时设置过长',
    description: '检测 hook 配置中的 timeout 是否超过 300 秒（5 分钟）',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const hooks = getNested(config, 'hooks') || config.hooks;
        if (!hooks) continue;
        const lines = file.content.split('\n');
        const allHooks = [];
        for (const [hookName, hookVal] of Object.entries(hooks)) {
          const entries = Array.isArray(hookVal) ? hookVal : [hookVal];
          entries.forEach(e => allHooks.push({ name: hookName, ...e }));
        }
        for (const hook of allHooks) {
          if (hook.timeout && hook.timeout > 300000) {
            const line = lineNumberOf(lines, hook.name || JSON.stringify(hook).slice(0, 20));
            return {
              matched: true,
              evidence: `Hook 超时 ${hook.timeout}ms（${hook.timeout / 1000}秒）超过建议值 300 秒`,
              file: file.name,
              line,
            };
          }
        }
      }
      return null;
    },
    recommendation: '将 hook 超时设置为 300 秒以内，避免长时间挂起',
    auto_fix: { available: true, description: '将超过 300000ms 的 timeout 截断为 300000' },
  },

  // -----------------------------------------------------------------------
  // HOOK-004: hook 脚本路径不正确
  // -----------------------------------------------------------------------
  {
    id: 'HOOK-004',
    severity: 'high',
    category: 'hooks',
    title: 'hook 脚本路径不正确',
    description: '检测 settings.json hook 配置中的脚本路径在文件系统中是否存在',
    match: (files) => {
      // 注意：此 match 函数需要额外接收 fs 能力，但我们保持纯函数约定
      // 这里只做静态检查：检测路径是否匹配常见的存在模式（如 ~/.claude/hooks/ 目录习惯）
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const hooks = getNested(config, 'hooks') || config.hooks;
        if (!hooks) continue;
        const lines = file.content.split('\n');
        const allHookConfigs = [];
        for (const [hookName, hookVal] of Object.entries(hooks)) {
          const entries = Array.isArray(hookVal) ? hookVal : [hookVal];
          entries.forEach(e => allHookConfigs.push({ name: hookName, ...e }));
        }
        for (const hook of allHookConfigs) {
          const scriptPath = hook.script || hook.command || hook.path;
          if (!scriptPath) continue;
          // 检查路径模式：如果以 ~/.claude/hooks/ 开头，但文件名可疑
          if (/~\/\.claude\/hooks\//.test(scriptPath)) {
            // 基本格式检查：应有文件名
            const hasFilename = /[a-zA-Z0-9_-]+\.(sh|js|py|bash|ps1|bat)$/.test(scriptPath);
            if (!hasFilename) {
              const line = lineNumberOf(lines, scriptPath);
              return {
                matched: true,
                evidence: `Hook "${hook.name}" 脚本路径格式可疑: ${scriptPath}`,
                file: file.name,
                line,
              };
            }
          }
          // 检查是否直接写了命令名称而非路径（缺少扩展名，但也不是内置命令）
          if (!scriptPath.includes('/') && !scriptPath.includes('\\') &&
              !scriptPath.includes(' ') && !/^[a-zA-Z0-9_-]+$/.test(scriptPath)) {
            const line = lineNumberOf(lines, scriptPath);
            return {
              matched: true,
              evidence: `Hook "${hook.name}" 脚本路径可能不完整: ${scriptPath}`,
              file: file.name,
              line,
            };
          }
        }
      }
      return null;
    },
    recommendation: '检查所有 hook 脚本路径是否正确指向存在的文件',
    auto_fix: { available: false, description: '需手动验证和修正文件路径' },
  },

  // -----------------------------------------------------------------------
  // HOOK-005: 存在被禁用的 hook 未清理
  // -----------------------------------------------------------------------
  {
    id: 'HOOK-005',
    severity: 'low',
    category: 'hooks',
    title: '存在被禁用的 hook 未清理',
    description: '检测配置中存在 enabled: false 的 hook 但未从配置中删除（残留配置）',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const hooks = getNested(config, 'hooks') || config.hooks;
        if (!hooks) continue;
        const lines = file.content.split('\n');
        const disabledHooks = [];
        for (const [hookName, hookVal] of Object.entries(hooks)) {
          const entries = Array.isArray(hookVal) ? hookVal : [hookVal];
          for (let i = 0; i < entries.length; i++) {
            if (entries[i].enabled === false) {
              disabledHooks.push({ name: hookName, index: i });
            }
          }
        }
        if (disabledHooks.length > 0) {
          // 找第一个 disabled 的位置
          const line = lineNumberOf(lines, disabledHooks[0].name);
          return {
            matched: true,
            evidence: `存在 ${disabledHooks.length} 个被禁用的 hook 未清理: ${disabledHooks.map(h => h.name).join(', ')}`,
            file: file.name,
            line,
          };
        }
      }
      return null;
    },
    recommendation: '清理已禁用的 hook 配置，保持配置整洁',
    auto_fix: { available: true, description: '移除 enabled: false 的 hook 条目' },
  },
];

// ---------------------------------------------------------------------------
// AGENT Scanner — Agent 定义安全扫描
// ---------------------------------------------------------------------------

const AGENT_RULES = [
  // -----------------------------------------------------------------------
  // AGENT-001: agent 工具权限超过实际需要
  // -----------------------------------------------------------------------
  {
    id: 'AGENT-001',
    severity: 'medium',
    category: 'agents',
    title: 'Agent 工具权限超过实际需要',
    description: '检测 ~/.claude/agents/ 下 agent 定义中配置的工具权限是否超出其任务所需范围',
    match: (files) => {
      for (const file of files) {
        if (!/\.claude\\agents\\/.test(file.name) && !/\.claude\/agents\//.test(file.name)) continue;
        const content = file.content;
        const lines = content.split('\n');
        // 检查是否有 tools 字段配置了过多权限
        const toolsMatch = content.match(/["']?tools["']?\s*:\s*\[([^\]]*)\]/s);
        if (toolsMatch) {
          const toolsStr = toolsMatch[1];
          const toolCount = (toolsStr.match(/['"]/g) || []).length / 2;
          if (toolCount > 8) {
            const line = lineNumberOf(lines, 'tools');
            return {
              matched: true,
              evidence: `Agent ${file.name} 配置了 ${toolCount} 个工具（超过建议值 8 个）`,
              file: file.name,
              line,
            };
          }
        }
        // 检查是否所有工具都被允许（Read + Write + Bash + Edit 全开）
        const allBasicTools = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'].every(t =>
          content.includes(t)
        );
        if (allBasicTools && content.includes('*')) {
          const line = lineNumberOf(lines, 'tools');
          return {
            matched: true,
            evidence: `Agent ${file.name} 同时包含所有基础工具和通配符`,
            file: file.name,
            line,
          };
        }
      }
      return null;
    },
    recommendation: '遵循最小权限原则，只赋予 agent 完成任务所需的工具',
    auto_fix: { available: false, description: '需人工评估每个 agent 的实际工具需求' },
  },

  // -----------------------------------------------------------------------
  // AGENT-002: agent 模型选择过强
  // -----------------------------------------------------------------------
  {
    id: 'AGENT-002',
    severity: 'low',
    category: 'agents',
    title: 'Agent 模型选择过强',
    description: '检测简单任务的 agent 是否使用了过强的模型（如 claude-opus-4 用于文件搜索等简单任务）',
    match: (files) => {
      for (const file of files) {
        if (!/\.claude\\agents\\/.test(file.name) && !/\.claude\/agents\//.test(file.name)) continue;
        const content = file.content;
        if (!content) continue;
        const lines = content.split('\n');
        // 检查是否使用 opus 或 sonnet（过强）
        const strongModels = /opus|claude-4-|claude-5-/;
        if (strongModels.test(content)) {
          const line = lineNumberOf(lines, 'model');
          return {
            matched: true,
            evidence: `Agent ${file.name} 使用过强模型: ${content.match(/['"]model['"]\s*:\s*['"]([^'"]+)['"]/)?.[1] || 'opus 系列'}`,
            file: file.name,
            line,
          };
        }
      }
      return null;
    },
    recommendation: '简单任务使用 Haiku 或 Sonnet，节约成本',
    auto_fix: { available: false, description: '需人工评估任务复杂度后选择合适的模型' },
  },

  // -----------------------------------------------------------------------
  // AGENT-003: agent 定义缺少关键约束
  // -----------------------------------------------------------------------
  {
    id: 'AGENT-003',
    severity: 'medium',
    category: 'agents',
    title: 'Agent 定义缺少关键约束',
    description: '检测 agent 定义是否缺少关键约束字段如 allowedTools、指令说明或 role 定义',
    match: (files) => {
      const requiredFields = ['role', 'instructions', 'allowedTools'];
      const recommendedFields = ['description', 'constraints', 'allowedTools'];
      for (const file of files) {
        if (!/\.claude\\agents\\/.test(file.name) && !/\.claude\/agents\//.test(file.name)) continue;
        const content = file.content;
        if (!content) continue;
        const lines = content.split('\n');
        const missingRequired = requiredFields.filter(f => !content.includes(f));
        const missingRecommended = recommendedFields.filter(f => !content.includes(f));
        if (missingRequired.length > 0) {
          return {
            matched: true,
            evidence: `Agent ${file.name} 缺少关键约束字段: ${missingRequired.join(', ')}`,
            file: file.name,
            line: 1,
          };
        }
        if (missingRecommended.length === recommendedFields.length) {
          return {
            matched: true,
            evidence: `Agent ${file.name} 缺少推荐字段: ${missingRecommended.join(', ')}`,
            file: file.name,
            line: 1,
          };
        }
      }
      return null;
    },
    recommendation: '为每个 agent 定义明确的 role、instructions 和 allowedTools 约束',
    auto_fix: { available: false, description: '需人工补全 agent 定义字段' },
  },

  // -----------------------------------------------------------------------
  // AGENT-004: agent 没有定义作用域限制
  // -----------------------------------------------------------------------
  {
    id: 'AGENT-004',
    severity: 'low',
    category: 'agents',
    title: 'Agent 没有定义作用域限制',
    description: '检测 agent 定义是否缺少 workingDirectory、allowedPaths 或 scope 限制',
    match: (files) => {
      const scopeFields = ['workingDirectory', 'scope', 'allowedPaths', 'restrictTo', 'allowedDirectories'];
      for (const file of files) {
        if (!/\.claude\\agents\\/.test(file.name) && !/\.claude\/agents\//.test(file.name)) continue;
        const content = file.content;
        if (!content) continue;
        const hasScope = scopeFields.some(f => content.includes(f));
        if (!hasScope) {
          const lines = content.split('\n');
          return {
            matched: true,
            evidence: `Agent ${file.name} 未定义任何作用域限制（workingDirectory/scope/allowedPaths）`,
            file: file.name,
            line: 1,
          };
        }
      }
      return null;
    },
    recommendation: '为 agent 添加 workingDirectory 或 allowedPaths 限制其文件系统访问范围',
    auto_fix: { available: false, description: '需人工设定 agent 的作用域范围' },
  },

  // -----------------------------------------------------------------------
  // AGENT-005: 存在重复的 agent 定义
  // -----------------------------------------------------------------------
  {
    id: 'AGENT-005',
    severity: 'medium',
    category: 'agents',
    title: '存在重复的 agent 定义',
    description: '检测 ~/.claude/agents/ 下是否存在名称或角色相同的重复 agent 定义',
    match: (files) => {
      const agentFiles = files.filter(f =>
        /\.claude\\agents\\/.test(f.name) || /\.claude\/agents\//.test(f.name)
      );
      if (agentFiles.length < 2) return null;
      // 按文件名提取 agent 名称
      const nameMap = new Map(); // name -> { files: [] }
      for (const f of agentFiles) {
        const basename = f.name.split(/[\\/]/).pop().replace(/\.\w+$/, '');
        if (!nameMap.has(basename)) nameMap.set(basename, []);
        nameMap.get(basename).push(f.name);
      }
      // 也检查内容中是否有同名 role
      const roleMap = new Map();
      for (const f of agentFiles) {
        const roleMatch = f.content.match(/['"]role['"]\s*:\s*['"]([^'"]+)['"]/);
        if (roleMatch) {
          const role = roleMatch[1].toLowerCase();
          if (!roleMap.has(role)) roleMap.set(role, []);
          roleMap.get(role).push(f.name);
        }
      }
      const duplicates = [];
      for (const [name, fnames] of nameMap) {
        if (fnames.length > 1) duplicates.push({ field: 'name', value: name, files: fnames });
      }
      for (const [role, fnames] of roleMap) {
        if (fnames.length > 1) duplicates.push({ field: 'role', value: role, files: fnames });
      }
      if (duplicates.length > 0) {
        const first = duplicates[0];
        return {
          matched: true,
          evidence: `重复 agent 定义: ${first.files.join(', ')}（重复 ${first.field}: ${first.value}）`,
          file: first.files[0],
          line: 1,
        };
      }
      return null;
    },
    recommendation: '合并重复的 agent 定义，避免配置冲突',
    auto_fix: { available: false, description: '需人工审查并合并重复的 agent 定义' },
  },
];

// ---------------------------------------------------------------------------
// NET Scanner — 网络安全
// ---------------------------------------------------------------------------

const NET_RULES = [
  // -----------------------------------------------------------------------
  // NET-001: 未加密本地服务
  // -----------------------------------------------------------------------
  {
    id: 'NET-001', severity: 'medium', category: 'net',
    title: '未加密本地服务',
    description: '检测 settings.json 中本地服务是否使用未加密传输',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const lines = file.content.split('\n');
        // 检测未加密的本地 URL
        for (const [key, val] of Object.entries(config)) {
          if (typeof val === 'string' && /http:\/\/localhost:/.test(val)) {
            const line = lineNumberOf(lines, val);
            return { matched: true, evidence: `未加密本地服务: ${val}`, file: file.name, line };
          }
        }
      }
      return null;
    },
    recommendation: '本地服务优先使用 HTTPS 或 Unix socket',
    auto_fix: { available: false, description: '需评估本地服务的安全传输需求' },
  },

  // -----------------------------------------------------------------------
  // NET-002: API 无速率限制
  // -----------------------------------------------------------------------
  {
    id: 'NET-002', severity: 'low', category: 'net',
    title: 'API 无速率限制',
    description: '检测 MCP server 配置中是否缺少速率限制配置',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        for (const [name, srv] of Object.entries(servers)) {
          if (srv.url && srv.url.startsWith('http') && !srv.rateLimit && !srv.ratelimit) {
            const lines = file.content.split('\n');
            const line = lineNumberOf(lines, name);
            return { matched: true, evidence: `MCP server "${name}" 无速率限制`, file: file.name, line };
          }
        }
      }
      return null;
    },
    recommendation: '为 HTTP MCP server 添加 rateLimit 配置',
    auto_fix: { available: false, description: '需根据 server 实际情况配置速率限制' },
  },

  // -----------------------------------------------------------------------
  // NET-003: Webhook 无 secret
  // -----------------------------------------------------------------------
  {
    id: 'NET-003', severity: 'high', category: 'net',
    title: 'Webhook 无 secret',
    description: '检测配置中的 webhook URL 是否缺少 secret 认证',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const lines = file.content.split('\n');
        const allText = JSON.stringify(config);
        const webhookUrl = allText.match(/(https?:\/\/[^"']*webhook[^"']*)/i);
        if (webhookUrl && !allText.includes('secret') && !allText.includes('token')) {
          const line = lineNumberOf(lines, webhookUrl[1].substring(0, 30));
          return { matched: true, evidence: `Webhook 无 secret: ${webhookUrl[1].substring(0, 80)}`, file: file.name, line };
        }
      }
      return null;
    },
    recommendation: '为 webhook 添加 secret 验证防止伪造请求',
    auto_fix: { available: false, description: '需生成强随机 secret 并配置到 webhook 端点' },
  },

  // -----------------------------------------------------------------------
  // NET-004: 暴露调试端点
  // -----------------------------------------------------------------------
  {
    id: 'NET-004', severity: 'medium', category: 'net',
    title: '暴露调试端点',
    description: '检测配置中是否暴露了调试/诊断端点',
    match: (files) => {
      const debugEndpoints = [/\/debug/, /\/health[^z]/, /\/metrics/, /\/admin/, /\/_debug/, /\/swagger/, /\/api-docs/];
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        const lines = file.content.split('\n');
        for (const [name, srv] of Object.entries(servers)) {
          if (!srv.url) continue;
          for (const pat of debugEndpoints) {
            if (pat.test(srv.url)) {
              const line = lineNumberOf(lines, srv.url);
              return { matched: true, evidence: `MCP "${name}" 暴露端点: ${srv.url}`, file: file.name, line };
            }
          }
        }
      }
      return null;
    },
    recommendation: '生产环境移除或保护调试端点',
    auto_fix: { available: false, description: '需人工评估调试端点是否应对外暴露' },
  },

  // -----------------------------------------------------------------------
  // NET-005: MCP localhost 无认证
  // -----------------------------------------------------------------------
  {
    id: 'NET-005', severity: 'medium', category: 'net',
    title: 'MCP localhost 无认证',
    description: '检测 MCP server 绑定 localhost 但未配置认证',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const servers = getNested(config, 'mcpServers') || {};
        const lines = file.content.split('\n');
        for (const [name, srv] of Object.entries(servers)) {
          const url = srv.url || '';
          if (/localhost|127\.0\.0\.1/.test(url) && !srv.auth && !srv.apiKey && !srv.token) {
            const line = lineNumberOf(lines, srv.url || name);
            return { matched: true, evidence: `MCP "${name}" localhost 无认证`, file: file.name, line };
          }
        }
      }
      return null;
    },
    recommendation: '为 localhost MCP 服务添加至少基本认证',
    auto_fix: { available: false, description: '需生成 API key 并配置到 MCP server' },
  },
];

// ---------------------------------------------------------------------------
// DATA Scanner — 数据保护
// ---------------------------------------------------------------------------

const DATA_RULES = [
  // -----------------------------------------------------------------------
  // DATA-001: Transcript 持久化敏感操作
  // -----------------------------------------------------------------------
  {
    id: 'DATA-001', severity: 'medium', category: 'data',
    title: 'Transcript 持久化敏感操作',
    description: '检测 transcript 或缓存目录是否可能持久化敏感操作',
    match: (files) => {
      for (const file of files) {
        if (!/transcript|\.log$|cache/i.test(file.name)) continue;
        const content = file.content;
        const hasSensitiveOps = /password|token|secret|key.*[:=]/i.test(content);
        if (hasSensitiveOps) {
          const lines = content.split('\n');
          const line = lineNumberOf(lines, content.match(/password|token|secret|key.*[:=]/i)?.[0] || '');
          return { matched: true, evidence: `可能持久化敏感操作: ${file.name}`, file: file.name, line };
        }
      }
      return null;
    },
    recommendation: '配置日志脱敏，确保敏感操作不被持久化',
    auto_fix: { available: false, description: '需配置日志脱敏管道或清理已存在的敏感日志' },
  },

  // -----------------------------------------------------------------------
  // DATA-002: 无数据保留策略
  // -----------------------------------------------------------------------
  {
    id: 'DATA-002', severity: 'low', category: 'data',
    title: '无数据保留策略',
    description: '检测是否配置了数据保留策略（如 transcript TTL）',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        const hasRetention = config.historyRetentionDays || config.transcriptTtlDays ||
          config.dataRetention || getNested(config, 'settings.historyRetentionDays');
        if (!hasRetention) {
          return { matched: true, evidence: '未配置数据保留策略', file: file.name, line: 1 };
        }
      }
      return null;
    },
    recommendation: '添加 historyRetentionDays 或 transcriptTtlDays 配置控制数据生命周期',
    auto_fix: { available: true, description: '添加 "historyRetentionDays": 90 到 settings' },
  },

  // -----------------------------------------------------------------------
  // DATA-003: 配置备份泄露敏感信息
  // -----------------------------------------------------------------------
  {
    id: 'DATA-003', severity: 'high', category: 'data',
    title: '配置备份泄露敏感信息',
    description: '检测备份文件是否包含敏感配置',
    match: (files) => {
      for (const file of files) {
        if (!/backup|\.bak|~$|\.tar\.gz/.test(file.name)) continue;
        if (/settings\.json|\.env/.test(file.name)) {
          const content = file.content;
          if (/sk-ant-|sk-proj-|ghp_|AKIA/.test(content)) {
            return { matched: true, evidence: `备份文件含敏感信息: ${file.name}`, file: file.name, line: 1 };
          }
        }
      }
      return null;
    },
    recommendation: '备份前脱敏敏感信息，或使用加密备份',
    auto_fix: { available: false, description: '需重建脱敏后的备份文件' },
  },

  // -----------------------------------------------------------------------
  // DATA-004: 缓存含执行历史
  // -----------------------------------------------------------------------
  {
    id: 'DATA-004', severity: 'low', category: 'data',
    title: '缓存含执行历史',
    description: '检测缓存目录是否包含执行历史记录',
    match: (files) => {
      for (const file of files) {
        if (!/\.cache|history\.jsonl|\.transcript/i.test(file.name)) continue;
        if (file.content.length > 10000) {
          return { matched: true, evidence: `大缓存文件可能含执行历史: ${file.name} (${Math.round(file.content.length / 1024)}KB)`, file: file.name, line: 1 };
        }
      }
      return null;
    },
    recommendation: '定期清理缓存文件，配置自动清理机制',
    auto_fix: { available: false, description: '可配置 ops-layer prune 自动清理' },
  },

  // -----------------------------------------------------------------------
  // DATA-005: 记忆含敏感信息
  // -----------------------------------------------------------------------
  {
    id: 'DATA-005', severity: 'medium', category: 'data',
    title: '记忆含敏感信息',
    description: '检测 memory/*.md 文件中是否包含敏感信息',
    match: (files) => {
      const sensitivePats = [/sk-ant-/i, /sk-proj-/i, /AKIA/i, /ghp_/i, /password/i, /api.?key/i];
      for (const file of files) {
        if (!memoryPattern.test(file.name)) continue;
        for (const pat of sensitivePats) {
          const lines = file.content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (pat.test(lines[i]) && !/example|placeholder|your_key/i.test(lines[i])) {
              return { matched: true, evidence: `记忆含敏感信息: ${file.name}:${i+1}`, file: file.name, line: i + 1 };
            }
          }
        }
      }
      return null;
    },
    recommendation: '使用环境变量引用替代记忆文件中的明文敏感信息',
    auto_fix: { available: false, description: '需人工审查并替换为环境变量引用' },
  },
];

// ---------------------------------------------------------------------------
// OPS Scanner — 运维安全
// ---------------------------------------------------------------------------

const OPS_RULES = [
  // -----------------------------------------------------------------------
  // OPS-001: 无备份策略
  // -----------------------------------------------------------------------
  {
    id: 'OPS-001', severity: 'low', category: 'ops',
    title: '无备份策略',
    description: '检测是否有定期备份配置',
    match: (files) => {
      const hasBackup = files.some(f => /backup/i.test(f.name) || /prune/i.test(f.name));
      if (!hasBackup) {
        return { matched: true, evidence: '未检测到备份相关配置', file: 'settings.json', line: 1 };
      }
      return null;
    },
    recommendation: '使用 ops-layer backup 定期备份系统配置',
    auto_fix: { available: true, description: '可配置 ops-layer backup 并添加到计划任务' },
  },

  // -----------------------------------------------------------------------
  // OPS-002: Workflow 版本过旧
  // -----------------------------------------------------------------------
  {
    id: 'OPS-002', severity: 'low', category: 'ops',
    title: 'Workflow 版本过旧',
    description: '检测 workflow 脚本是否长时间未更新',
    match: (files) => {
      for (const file of files) {
        if (!/workflows\/\w+\.js$/.test(file.name)) continue;
        if (!file.content.includes('meta.version') && !file.content.includes('"version"')) {
          const lines = file.content.split('\n');
          return { matched: true, evidence: `${file.name} 无版本信息`, file: file.name, line: 1 };
        }
      }
      return null;
    },
    recommendation: '为 workflow 添加版本号，定期审查更新',
    auto_fix: { available: false, description: '需人工添加版本号并审核更新频率' },
  },

  // -----------------------------------------------------------------------
  // OPS-003: 安全配置冲突
  // -----------------------------------------------------------------------
  {
    id: 'OPS-003', severity: 'high', category: 'ops',
    title: '安全配置冲突',
    description: '检测全局和项目级 settings.json 中是否存在冲突的安全配置',
    match: (files) => {
      const settingsFiles = files.filter(f => /settings\.json$/.test(f.name));
      if (settingsFiles.length < 2) return null;
      for (let i = 1; i < settingsFiles.length; i++) {
        const cfgs = settingsFiles.map(f => parseJSON(f.content));
        if (cfgs.some(c => !c)) continue;
        const defaultModes = cfgs.map(c => getNested(c, 'permissions.defaultMode'));
        if (new Set(defaultModes.filter(Boolean)).size > 1) {
          return { matched: true, evidence: '全局和项目级 defaultMode 冲突', file: settingsFiles[i].name, line: 1 };
        }
      }
      return null;
    },
    recommendation: '统一全局和项目级安全配置策略',
    auto_fix: { available: false, description: '需人工统一安全策略' },
  },

  // -----------------------------------------------------------------------
  // OPS-004: 无健康检查
  // -----------------------------------------------------------------------
  {
    id: 'OPS-004', severity: 'low', category: 'ops',
    title: '无健康检查',
    description: '检测是否有定期健康检查机制',
    match: (files) => {
      const hasHealthCheck = files.some(f => /health/i.test(f.name) || /doctor/i.test(f.name) || f.content.includes('ops-layer'));
      if (!hasHealthCheck) {
        return { matched: true, evidence: '未检测到健康检查机制', file: 'settings.json', line: 1 };
      }
      return null;
    },
    recommendation: '定期执行 ops-layer doctor 进行健康检查',
    auto_fix: { available: true, description: '可在 SessionEnd hook 中添加定期 doctor 调用' },
  },

  // -----------------------------------------------------------------------
  // OPS-005: 无依赖验证
  // -----------------------------------------------------------------------
  {
    id: 'OPS-005', severity: 'medium', category: 'ops',
    title: '无依赖验证',
    description: '检测是否缺少依赖完整性检查',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name)) continue;
        const config = parseJSON(file.content);
        if (!config) continue;
        if (config.dependencies && config.dependencies.length > 0) {
          return null; // 有依赖定义，ok
        }
      }
      return { matched: true, evidence: '未定义依赖关系', file: 'settings.json', line: 1 };
    },
    recommendation: '在 settings.json 中定义 dependencies 字段',
    auto_fix: { available: false, description: '需人工分析并定义依赖关系' },
  },
];

// ============================================================
// 扩展 — KEY 规则 11-20
// ============================================================

const KEY_RULES_EXT = [
  // -----------------------------------------------------------------------
  // KEY-011: Slack Bot Token
  // -----------------------------------------------------------------------
  {
    id: 'KEY-011', severity: 'high', category: 'keys',
    title: 'Slack Bot Token',
    description: '检测 xoxb- 开头的 Slack Bot Token',
    match: (files) => {
      for (const file of files) {
        const lines = file.content.split('\n');
        const result = findLine(lines, /xoxb-[a-zA-Z0-9-]{20,}/);
        if (result) return { matched: true, evidence: result.text, file: file.name, line: result.line };
      }
      return null;
    },
    recommendation: '使用环境变量 SLACK_BOT_TOKEN 替代硬编码',
    auto_fix: { available: true, description: '替换为 ${SLACK_BOT_TOKEN}' },
  },
  // KEY-012: Discord Token
  {
    id: 'KEY-012', severity: 'high', category: 'keys',
    title: 'Discord Bot Token',
    description: '检测 Discord Bot Token',
    match: (files) => {
      for (const file of files) {
        const lines = file.content.split('\n');
        const result = findLine(lines, /[MN][A-Za-z\d]{23,26}\.[A-Za-z\d]{6}\.[A-Za-z\d_-]{27,38}/);
        if (result) return { matched: true, evidence: result.text.slice(0, 60), file: file.name, line: result.line };
      }
      return null;
    },
    recommendation: '使用环境变量 DISCORD_TOKEN 替代硬编码',
    auto_fix: { available: true, description: '替换为 ${DISCORD_TOKEN}' },
  },
  // KEY-013: Azure DevOps PAT
  {
    id: 'KEY-013', severity: 'high', category: 'keys',
    title: 'Azure DevOps PAT',
    description: '检测 Azure DevOps Personal Access Token',
    match: (files) => {
      for (const file of files) {
        const lines = file.content.split('\n');
        // Azure DevOps PAT base64 pattern
        const result = findLine(lines, /[a-z0-9]{52}/i);
        if (result && /azure|devops|vsts|ado/i.test(result.text)) {
          return { matched: true, evidence: result.text.slice(0, 60), file: file.name, line: result.line };
        }
      }
      return null;
    },
    recommendation: '使用 AZURE_DEVOPS_TOKEN 环境变量替代硬编码',
    auto_fix: { available: true, description: '替换为 ${AZURE_DEVOPS_TOKEN}' },
  },
  // KEY-014: GitLab CI Token
  {
    id: 'KEY-014', severity: 'high', category: 'keys',
    title: 'GitLab CI Token',
    description: '检测 GitLab CI/CD Token',
    match: (files) => {
      for (const file of files) {
        const lines = file.content.split('\n');
        const result = findLine(lines, /glpat-[a-zA-Z0-9_-]{20,}/);
        if (result) return { matched: true, evidence: result.text, file: file.name, line: result.line };
      }
      return null;
    },
    recommendation: '使用 GITLAB_TOKEN 环境变量替代硬编码',
    auto_fix: { available: true, description: '替换为 ${GITLAB_TOKEN}' },
  },
  // KEY-015: Docker Hub 凭据
  {
    id: 'KEY-015', severity: 'high', category: 'keys',
    title: 'Docker Hub 凭据',
    description: '检测 Docker Hub 凭据',
    match: (files) => {
      for (const file of files) {
        if (!/settings\.json$/.test(file.name) && !/\.env/.test(file.name)) continue;
        const lines = file.content.split('\n');
        const result = findLine(lines, /DOCKER.*(PASSWORD|TOKEN|PASS)\s*[=:]\s*\S+/i);
        if (result) return { matched: true, evidence: result.text.slice(0, 60), file: file.name, line: result.line };
      }
      return null;
    },
    recommendation: '使用 DOCKER_TOKEN 环境变量或 docker login 替代',
    auto_fix: { available: false, description: '需轮换凭据并改用 docker login' },
  },
  // KEY-016: Twilio 凭据
  {
    id: 'KEY-016', severity: 'medium', category: 'keys',
    title: 'Twilio 凭据',
    description: '检测 Twilio Account SID 和 Auth Token',
    match: (files) => {
      for (const file of files) {
        const lines = file.content.split('\n');
        const sidResult = findLine(lines, /AC[a-f0-9]{32}/i);
        if (sidResult) return { matched: true, evidence: sidResult.text.slice(0, 60), file: file.name, line: sidResult.line };
      }
      return null;
    },
    recommendation: '使用 TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN 环境变量替代',
    auto_fix: { available: true, description: '替换为 ${TWILIO_ACCOUNT_SID} 等环境变量' },
  },
  // KEY-017: SendGrid Key
  {
    id: 'KEY-017', severity: 'medium', category: 'keys',
    title: 'SendGrid API Key',
    description: '检测 SendGrid API Key',
    match: (files) => {
      for (const file of files) {
        const lines = file.content.split('\n');
        const result = findLine(lines, /SG\.[a-zA-Z0-9_-]{22,}\.[a-zA-Z0-9_-]{22,}/);
        if (result) return { matched: true, evidence: result.text.slice(0, 60), file: file.name, line: result.line };
      }
      return null;
    },
    recommendation: '使用 SENDGRID_API_KEY 环境变量替代硬编码',
    auto_fix: { available: true, description: '替换为 ${SENDGRID_API_KEY}' },
  },
  // KEY-018: Stripe Live Key
  {
    id: 'KEY-018', severity: 'critical', category: 'keys',
    title: 'Stripe Live Secret Key',
    description: '检测 sk_live_ 开头的 Stripe 生产密钥',
    match: (files) => {
      for (const file of files) {
        const lines = file.content.split('\n');
        const result = findLine(lines, /sk_live_[a-zA-Z0-9]{20,}/);
        if (result) return { matched: true, evidence: result.text.slice(0, 40), file: file.name, line: result.line };
      }
      return null;
    },
    recommendation: '使用 STRIPE_SECRET_KEY 环境变量，测试用 sk_test_',
    auto_fix: { available: true, description: '替换为 ${STRIPE_SECRET_KEY} 环境变量' },
  },
  // KEY-019: NPM Token
  {
    id: 'KEY-019', severity: 'high', category: 'keys',
    title: 'NPM Auth Token',
    description: '检测 NPM .npmrc 中的 auth token',
    match: (files) => {
      for (const file of files) {
        if (!/\.npmrc/i.test(file.name)) continue;
        const lines = file.content.split('\n');
        const result = findLine(lines, /_authToken\s*=\s*[a-zA-Z0-9-]{20,}/);
        if (result) return { matched: true, evidence: result.text.slice(0, 50), file: file.name, line: result.line };
      }
      return null;
    },
    recommendation: '使用 NPM_TOKEN 环境变量替代 .npmrc 明文存储',
    auto_fix: { available: true, description: '替换为 ${NPM_TOKEN} 环境变量引用' },
  },
  // KEY-020: GCP 密钥
  {
    id: 'KEY-020', severity: 'critical', category: 'keys',
    title: 'GCP Service Account Key',
    description: '检测 GCP service account JSON 密钥文件',
    match: (files) => {
      for (const file of files) {
        if (!/\.json$/.test(file.name)) continue;
        try {
          const obj = JSON.parse(file.content);
          if (obj.type === 'service_account' && obj.private_key) {
            return { matched: true, evidence: `GCP SA Key: ${obj.client_email || file.name}`, file: file.name, line: 1 };
          }
        } catch {}
      }
      return null;
    },
    recommendation: '使用 gcloud 默认凭据或 workload identity federation 替代',
    auto_fix: { available: false, description: '需配置 GCP 凭据替代方案' },
  },
];

// ============================================================
// 扩展 — MCP 规则 11-25
// ============================================================

const MCP_RULES_EXT = [
  // MCP-011: 无 root 限制
  { id: 'MCP-011', severity: 'low', category: 'mcp',
    title: 'MCP server 无 root 限制',
    description: '检测 MCP server 是否未限制 root 权限',
    match: (files) => { for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; const cfg = parseJSON(f.content); if (!cfg) continue; for (const [n, s] of Object.entries(cfg.mcpServers || {})) { if (s.root) { const lines = f.content.split('\n'); return { matched: true, evidence: `MCP "${n}" 有 root 限制`, file: f.name, line: lineNumberOf(lines, n) }; } } } return null; },
    recommendation: '为 MCP server 设置 root 目录限制访问范围',
    auto_fix: { available: false, description: '需人工设定 root 限制路径' },
  },
  // MCP-012: 无 description
  { id: 'MCP-012', severity: 'low', category: 'mcp',
    title: 'MCP server 无 description',
    description: '检测 MCP server 是否缺少描述信息',
    match: (files) => { for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; const cfg = parseJSON(f.content); if (!cfg) continue; for (const [n, s] of Object.entries(cfg.mcpServers || {})) { if (!s.description) { const lines = f.content.split('\n'); return { matched: true, evidence: `MCP "${n}" 无 description`, file: f.name, line: lineNumberOf(lines, n) }; } } } return null; },
    recommendation: '为每个 MCP server 添加简短描述',
    auto_fix: { available: false, description: '需人工编写描述' },
  },
  // MCP-013: 重复定义
  { id: 'MCP-013', severity: 'medium', category: 'mcp',
    title: 'MCP server 重复定义',
    description: '检测多个配置文件中 MCP server 重复定义',
    match: (files) => { const seen = new Map(); for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; const cfg = parseJSON(f.content); if (!cfg) continue; for (const n of Object.keys(cfg.mcpServers || {})) { if (seen.has(n)) return { matched: true, evidence: `MCP "${n}" 在 ${seen.get(n)} 和 ${f.name} 中重复`, file: f.name, line: 1 }; seen.set(n, f.name); } } return null; },
    recommendation: '避免在多个 settings 中重复定义同一 MCP server',
    auto_fix: { available: false, description: '需合并重复定义' },
  },
  // MCP-014: 弃用 SDK
  { id: 'MCP-014', severity: 'medium', category: 'mcp',
    title: 'MCP server 使用弃用 SDK',
    description: '检测 MCP command 是否使用弃用的 SDK 版本',
    match: (files) => { const deprecated = [/@anthropic-ai\/sdk@0\./, /mcp-sdk@0\.\d\./, /modelcontextprotocol@0\./]; for (const f of files) { if (!/settings\.json$/.test(f.name) || !/package\.json/i.test(f.name)) continue; for (const d of deprecated) { if (d.test(f.content)) { const lines = f.content.split('\n'); return { matched: true, evidence: `使用弃用 SDK: ${d.source}`, file: f.name, line: lineNumberOf(lines, d.source || '' ) }; } } } return null; },
    recommendation: '升级到最新的 MCP SDK 版本',
    auto_fix: { available: false, description: '需运行 npm update 升级' },
  },
  // MCP-015: 禁用安全检查
  { id: 'MCP-015', severity: 'high', category: 'mcp',
    title: 'MCP server 禁用安全检查',
    description: '检测 MCP 配置中是否禁用了安全相关检查',
    match: (files) => { for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; const cfg = parseJSON(f.content); if (!cfg) continue; for (const [n, s] of Object.entries(cfg.mcpServers || {})) { if (s.disableSecurityCheck || s.allowAllTools) { const lines = f.content.split('\n'); return { matched: true, evidence: `MCP "${n}" 禁用安全检查`, file: f.name, line: lineNumberOf(lines, n) }; } } } return null; },
    recommendation: '启用安全检查，避免绕过权限系统',
    auto_fix: { available: true, description: '移除 disableSecurityCheck / allowAllTools 配置' },
  },
  // MCP-016: 路径遍历
  { id: 'MCP-016', severity: 'high', category: 'mcp',
    title: 'MCP server 路径遍历风险',
    description: '检测 MCP server args 中是否包含路径遍历模式',
    match: (files) => { for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; const cfg = parseJSON(f.content); if (!cfg) continue; for (const [n, s] of Object.entries(cfg.mcpServers || {})) { const args = s.args || []; for (let i = 0; i < args.length; i++) { if (typeof args[i] === 'string' && /\.\.\//.test(args[i])) { const lines = f.content.split('\n'); return { matched: true, evidence: `MCP "${n}" args[${i}] 含路径遍历: ${args[i]}`, file: f.name, line: lineNumberOf(lines, args[i]) }; } } } } return null; },
    recommendation: '避免在 args 中使用 .. 路径遍历',
    auto_fix: { available: false, description: '需替换为绝对路径或安全相对路径' },
  },
  // MCP-017: 泄露系统信息
  { id: 'MCP-017', severity: 'low', category: 'mcp',
    title: 'MCP server 泄露系统信息',
    description: '检测 MCP server 的 command 或 args 是否泄露系统路径',
    match: (files) => { const sysPaths = [/\/etc\//, /\/proc\//, /\/sys\//, /\/var\/log\//, /C:\\Windows/i, /\/Windows\\System32/i]; for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; for (const p of sysPaths) { if (p.test(f.content)) { const lines = f.content.split('\n'); return { matched: true, evidence: `可能泄露系统路径: ${p.source}`, file: f.name, line: lineNumberOf(lines, f.content.match(p)?.[0] || '') }; } } } return null; },
    recommendation: '避免在配置中使用绝对系统路径',
    auto_fix: { available: false, description: '需替换为相对路径或环境变量' },
  },
  // MCP-018: 文件访问过宽
  { id: 'MCP-018', severity: 'medium', category: 'mcp',
    title: 'MCP server 文件访问范围过宽',
    description: '检测 MCP server 的 root 或 args 是否包含过宽的文件访问范围',
    match: (files) => { for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; const cfg = parseJSON(f.content); if (!cfg) continue; for (const [n, s] of Object.entries(cfg.mcpServers || {})) { if (s.root === '/' || s.root === '.' || s.root === '~') { const lines = f.content.split('\n'); return { matched: true, evidence: `MCP "${n}" root 过宽: ${s.root}`, file: f.name, line: lineNumberOf(lines, n) }; } } } return null; },
    recommendation: '将 MCP server 的 root 限制到具体子目录',
    auto_fix: { available: true, description: '将 root 收窄到具体子目录' },
  },
  // MCP-019: 未验证 SSL
  { id: 'MCP-019', severity: 'medium', category: 'mcp',
    title: 'MCP server 未验证 SSL',
    description: '检测 MCP 配置中是否禁用了 SSL 验证',
    match: (files) => { for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; const cfg = parseJSON(f.content); if (!cfg) continue; for (const [n, s] of Object.entries(cfg.mcpServers || {})) { if (s.rejectUnauthorized === false || s.allowSelfSigned) { const lines = f.content.split('\n'); return { matched: true, evidence: `MCP "${n}" 禁用 SSL 验证`, file: f.name, line: lineNumberOf(lines, n) }; } } } return null; },
    recommendation: '启用 SSL 验证，设置 rejectUnauthorized: true',
    auto_fix: { available: true, description: '设置 rejectUnauthorized: true' },
  },
  // MCP-020: socket 世界可读
  { id: 'MCP-020', severity: 'high', category: 'mcp',
    title: 'MCP server socket 世界可读',
    description: '检测 MCP server 的 Unix socket 是否设置了宽松权限',
    match: (files) => { for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; const cfg = parseJSON(f.content); if (!cfg) continue; for (const [n, s] of Object.entries(cfg.mcpServers || {})) { const args = s.args || []; for (const a of args) { if (typeof a === 'string' && /\/tmp\/.+\.sock/.test(a)) { const lines = f.content.split('\n'); return { matched: true, evidence: `MCP "${n}" 使用 /tmp/ socket: ${a}`, file: f.name, line: lineNumberOf(lines, a) }; } } } } return null; },
    recommendation: '使用受保护路径的 Unix socket 或在 socket 上设置 umask',
    auto_fix: { available: false, description: '需修改 socket 路径或设置 umask' },
  },
  // MCP-021: 无认证（在 NET-005 中已覆盖，作为冗余）
  // MCP-022: root 运行
  { id: 'MCP-022', severity: 'critical', category: 'mcp',
    title: 'MCP server 以 root 运行',
    description: '检测 MCP server 配置中是否以 root 权限运行',
    match: (files) => { for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; const cfg = parseJSON(f.content); if (!cfg) continue; for (const [n, s] of Object.entries(cfg.mcpServers || {})) { if (s.runAs === 'root' || s.privileged) { const lines = f.content.split('\n'); return { matched: true, evidence: `MCP "${n}" 以 root 运行`, file: f.name, line: lineNumberOf(lines, n) }; } } } return null; },
    recommendation: 'MCP server 应以普通用户权限运行',
    auto_fix: { available: true, description: '移除 runAs: root 配置' },
  },
  // MCP-023: 弃用传输
  { id: 'MCP-023', severity: 'medium', category: 'mcp',
    title: 'MCP server 使用弃用传输协议',
    description: '检测 MCP server 是否使用弃用的传输方式',
    match: (files) => { const deprecatedTransports = [/stdio\s*-\s*windows/i, /pipe:/i, /tcp:\/\/0\.0\.0\.0/i]; for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; for (const d of deprecatedTransports) { if (d.test(f.content)) { const lines = f.content.split('\n'); return { matched: true, evidence: `弃用传输: ${d.source}`, file: f.name, line: lineNumberOf(lines, f.content.match(d)?.[0] || '') }; } } } return null; },
    recommendation: '升级到最新的 MCP 传输协议',
    auto_fix: { available: false, description: '需检查 MCP 文档并迁移传输方式' },
  },
  // MCP-024: command 不在 PATH
  { id: 'MCP-024', severity: 'high', category: 'mcp',
    title: 'MCP server command 不在 PATH',
    description: '检测 MCP server 的 command 是否可能不在系统 PATH 中',
    match: (files) => { const knownCommands = ['node', 'python', 'python3', 'npm', 'npx', 'uvx']; for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; const cfg = parseJSON(f.content); if (!cfg) continue; for (const [n, s] of Object.entries(cfg.mcpServers || {})) { if (s.command && !knownCommands.includes(s.command) && !s.command.includes('/')) { const lines = f.content.split('\n'); return { matched: true, evidence: `MCP "${n}" command 可能不在 PATH: ${s.command}`, file: f.name, line: lineNumberOf(lines, s.command) }; } } } return null; },
    recommendation: '使用绝对路径或在 PATH 中安装命令',
    auto_fix: { available: false, description: '需使用完整路径或确认命令在 PATH 中' },
  },
  // MCP-025: 危险工具模式
  { id: 'MCP-025', severity: 'high', category: 'mcp',
    title: 'MCP server 包含危险工具',
    description: '检测 MCP server 的工具权限是否包含危险操作',
    match: (files) => { const dangerous = ['Bash', 'Exec', 'Shell', 'Execute', 'Delete', 'Remove', 'Kill', 'Terminate']; for (const f of files) { if (!/settings\.json$/.test(f.name)) continue; const cfg = parseJSON(f.content); if (!cfg) continue; for (const [n, s] of Object.entries(cfg.mcpServers || {})) { const tools = s.tools || s.allowedTools || []; for (const t of tools) { if (dangerous.includes(t)) { const lines = f.content.split('\n'); return { matched: true, evidence: `MCP "${n}" 含危险工具: ${t}`, file: f.name, line: lineNumberOf(lines, n) }; } } } } return null; },
    recommendation: '审查 MCP server 的工具权限，移除危险工具',
    auto_fix: { available: false, description: '需人工审查各工具的合法性' },
  },
];

// ---------------------------------------------------------------------------
// 导出
// ---------------------------------------------------------------------------

const memoryPattern = /memory\\/|memory\//;

module.exports = {
  RULES_KEY_SCANNER: [...KEY_RULES, ...KEY_RULES_EXT],
  RULES_MCP_SCANNER: [...MCP_RULES, ...MCP_RULES_EXT],
  RULES_PERMISSION: PERM_RULES,
  RULES_HOOK: HOOK_RULES,
  RULES_AGENT_CONFIG: AGENT_RULES,
  RULES_NET_SCANNER: NET_RULES,
  RULES_DATA_SCANNER: DATA_RULES,
  RULES_OPS_SCANNER: OPS_RULES,
};
