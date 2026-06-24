/**
 * 数据处理领域配置
 * 适用于 Python/SQL/ETL/数据分析/机器学习 等数据工程开发
 */

const config = {
  name: 'data',

  skillCategory: {
    // 编程语言
    'python': 'language',
    'r': 'language',
    'sql': 'language',
    'julia': 'language',

    // 数据处理
    'pandas': 'processing',
    'numpy': 'processing',
    'spark': 'processing',
    'dask': 'processing',
    'polars': 'processing',

    // 数据库
    'mysql': 'database',
    'postgresql': 'database',
    'mongodb': 'database',
    'clickhouse': 'database',
    'elasticsearch': 'database',
    'hive': 'database',

    // ETL/流水线
    'airflow': 'pipeline',
    'prefect': 'pipeline',
    'dagster': 'pipeline',
    'dbt': 'pipeline',
    'luigi': 'pipeline',

    // 可视化
    'matplotlib': 'visualization',
    'plotly': 'visualization',
    'echarts': 'visualization',
    'grafana': 'visualization',
    'superset': 'visualization',

    // 机器学习
    'scikit-learn': 'ml',
    'tensorflow': 'ml',
    'pytorch': 'ml',
    'xgboost': 'ml',
    'huggingface': 'ml',

    // 测试
    'pytest': 'test',
    'unittest': 'test',
    'great-expectations': 'test',

    // 部署
    'docker': 'deploy',
    'kubernetes': 'deploy',
    'aws': 'cloud',
    'gcp': 'cloud',
    'azure': 'cloud',
  },

  categoryPrompts: {
    language: '选择合适的编程范式（函数式/面向对象），遵循 PEP 8/代码规范，类型注解优先',
    processing: '优先使用向量化操作避免循环，内存大数据考虑分块处理，注意数据类型精度',
    database: '查询优化（EXPLAIN 分析），索引策略，分区表设计，连接池管理',
    pipeline: '任务依赖 DAG 设计，幂等性保证，错误重试机制，监控告警',
    visualization: '选择合适的图表类型，交互式优先，大数据量考虑降采样',
    ml: '数据预处理优先，特征工程关键，模型评估指标选择，过拟合防护',
    test: '数据质量验证（Great Expectations），单元测试覆盖转换逻辑，集成测试覆盖端到端流水线',
    deploy: '容器化部署，资源限制（CPU/内存），自动扩缩容，日志收集',
  },

  troubleshootingMap: [
    {
      keywords: ['OOM', '内存溢出', 'out of memory'],
      step1: '检查数据规模 → 使用 chunksize 或 Dask 分块处理',
      step2: '优化数据类型 → int64→int32, object→category',
    },
    {
      keywords: ['慢查询', 'slow query', '性能'],
      step1: 'EXPLAIN 分析查询计划 → 添加索引',
      step2: '检查 N+1 查询 → 使用 JOIN 或批量查询',
    },
    {
      keywords: ['数据倾斜', 'skew', '分布不均'],
      step1: '分析数据分布 → 直方图/分位数',
      step2: '使用盐值打散或两阶段聚合',
    },
    {
      keywords: ['NaN', '缺失值', 'missing'],
      step1: '分析缺失模式 → 完全随机/随机/非随机',
      step2: '选择处理策略 → 删除/填充/插值/模型预测',
    },
    {
      keywords: ['编码错误', 'encoding', 'decode'],
      step1: '检查文件编码 → chardet 检测',
      step2: '统一 UTF-8 → open(encoding="utf-8")',
    },
    {
      keywords: ['版本冲突', 'dependency', '依赖'],
      step1: '使用虚拟环境隔离 → venv/conda',
      step2: '锁定依赖版本 → requirements.txt / poetry.lock',
    },
  ],

  verificationCriteria: `
## 数据处理知识验证标准

### 来源可信度
- 官方文档（Pandas/Spark/Airflow）= 1.0
- 数据科学权威书籍 = 0.9
- Kaggle/论文 = 0.8
- 技术博客 = 0.50
- Stack Overflow = 0.70

### 验证规则
1. API 用法必须与官方文档一致
2. 性能建议必须有基准测试支撑
3. 统计方法必须引用学术来源
4. 最佳实践必须有生产环境验证
`,
};

const security = {
  enabled: true,
  domain: 'data',
  preflight_rules: {
    check_database_credentials: true,
    check_data_privacy: true,
    check_pii_handling: true,
    check_query_injection: true,
  },
  output_filter: {
    filter_database_urls: true,
    filter_api_keys: true,
    filter_pii_data: true,
  },
  audit: {
    trace_level: 'task',
  },
};

module.exports = { config, security };
