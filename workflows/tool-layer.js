// 工具层 Workflow — 技能包管理器
// 输入: { action: 'list' | 'install' | 'remove' | 'update' | 'deps-tree', ... }
// 输出: 操作结果 + 结构化数据
//
// 使用方式:
//   Workflow({ scriptPath: '.claude/workflows/tool-layer.js', args: { action: 'list' } })
//   Workflow({ scriptPath: '.claude/workflows/tool-layer.js', args: { action: 'install', source: 'git-url' } })
//   Workflow({ scriptPath: '.claude/workflows/tool-layer.js', args: { action: 'remove', name: 'skill-name' } })
//   Workflow({ scriptPath: '.claude/workflows/tool-layer.js', args: { action: 'update', name: 'skill-name' } })
//   Workflow({ scriptPath: '.claude/workflows/tool-layer.js', args: { action: 'deps-tree' } })
//
// 设计原则:
// 1. 不与 Claude Code 引擎竞争 — 装饰原生发现机制，不替代
// 2. 更新采用 diff + 确认模式 — 不静默升级
// 3. 依赖检查走浅层 — 存在性检查，不做图遍历 MVP 阶段
// 4. 所有文件操作经安全层 Phase 0.5/2.5

export const meta = {
  name: 'tool-layer',
  description: '工具层：技能包管理器 — 安装/卸载/更新/列表/依赖管理',
  phases: [
    { title: '解析', detail: '解析请求 action 和参数' },
    { title: '扫描', detail: '扫描 skills 目录获取元数据' },
    { title: '执行', detail: '执行具体操作' },
    { title: '输出', detail: '格式化输出结果' },
  ],
}

// ============================================================
// Schema 定义
// ============================================================

const SKILL_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Skill 标识名' },
    description: { type: 'string', description: 'Skill 描述' },
    version: { type: 'string', description: '版本号' },
    depends_on: { type: 'array', items: { type: 'string' }, description: '依赖列表' },
    source: { type: 'string', description: '来源 URL' },
    category: { type: 'string', enum: ['root', 'engineering', 'productivity', 'misc', '_archive'], description: '分类' },
    status: { type: 'string', description: '注册状态' },
    path: { type: 'string', description: '路径' },
  },
  required: ['name', 'category'],
}

const LIST_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    total: { type: 'number' },
    skills: { type: 'array', items: SKILL_ITEM_SCHEMA },
  },
  required: ['total', 'skills'],
}

const INSTALL_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    name: { type: 'string' },
    version: { type: 'string' },
    depends_on: { type: 'array', items: { type: 'string' } },
    missing_deps: { type: 'array', items: { type: 'string' } },
    path: { type: 'string' },
    error: { type: 'string' },
  },
  required: ['success', 'name'],
}

const REMOVE_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    name: { type: 'string' },
    dependents: { type: 'array', items: { type: 'string' } },
    has_dependents: { type: 'boolean' },
    needs_force: { type: 'boolean' },
    error: { type: 'string' },
  },
  required: ['success', 'name'],
}

const ADOPT_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    name: { type: 'string' },
    version: { type: 'string' },
    source: { type: 'string' },
    error: { type: 'string' },
  },
  required: ['success', 'name'],
}

const SHOW_DIFF_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    name: { type: 'string' },
    current_version: { type: 'string' },
    new_version: { type: 'string' },
    source: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    diff_summary: { type: 'string' },
    needs_confirmation: { type: 'boolean' },
    error: { type: 'string' },
  },
  required: ['success', 'name'],
}

const APPLY_UPDATE_SCHEMA = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    name: { type: 'string' },
    version: { type: 'string' },
    files_updated: { type: 'number' },
    error: { type: 'string' },
  },
  required: ['success', 'name'],
}

// ============================================================
// action_items 生成器
// ============================================================

function getToolActionItems(act, res, extra) {
  const items = {
    list: [
      { step: 1, action: 'manual', title: '审查技能列表状态', skill: null, detail: '注册: ' + (extra?.registered || 0) + ', 孤立: ' + (extra?.orphaned || 0) + ', 归档: ' + (extra?.archived || 0) + '\n孤立技能需要收养（adopt）后才能受工具层管理', reason: '孤立技能不会被依赖检查覆盖', expects: '确认所有技能状态正确', depends_on: [] },
      { step: 2, action: 'workflow', title: '收养孤立技能', skill: null, detail: (extra?.orphaned || 0) > 0 ? '对每个孤立技能调 tool-layer adopt 注册到管理' : '无孤立技能', reason: '注册后依赖分析才能完整', expects: '孤立技能数归零', depends_on: ['step_1'] },
    ],
    install: [
      { step: 1, action: 'verify', title: '验证安装结果', skill: null, detail: res?.success ? res.name + ' v' + res.version + ' 已安装到 ' + res.path : '安装失败: ' + (res?.error || '未知') + '\n失败原因可能：URL 无效、SKILL.md 格式不对、依赖缺失', reason: '安装失败会导致依赖该技能的流水线不可用', expects: '技能可正常调用', depends_on: [] },
      { step: 2, action: 'review', title: '检查缺失依赖', skill: null, detail: (res?.missing_deps?.length || 0) > 0 ? '缺失依赖: ' + res.missing_deps.join(', ') : '所有依赖已满足', reason: '缺失依赖需要单独安装', expects: '所有依赖已安装', depends_on: ['step_1'] },
    ],
    remove: [
      { step: 1, action: 'review', title: '审查卸载影响', skill: null, detail: res?.needs_force ? res.name + ' 有其他技能依赖，需 force 确认卸载' : res?.success ? res.name + ' 已卸载' + (res?.dependents?.length > 0 ? '，被依赖方: ' + res.dependents.join(', ') : '') : '卸载失败: ' + (res?.error || '未知'), reason: '强制卸载可能破坏依赖链', expects: res?.needs_force ? '用户确认 force: true' : '卸载完成', depends_on: [] },
    ],
    deps_tree: [
      { step: 1, action: 'review', title: '审查依赖分析结果', skill: null, detail: res && typeof res === 'object' ? JSON.stringify(res).substring(0, 500) : '依赖分析完成', reason: '依赖树反映技能间的耦合关系', expects: '确认依赖结构健康', depends_on: [] },
    ],
    adopt: [
      { step: 1, action: 'verify', title: '验证收养成功', skill: null, detail: res?.success ? res.name + ' v' + res.version + ' 已注册到工具层管理' : '收养失败: ' + (res?.error || '未知'), reason: '收养后才能进行依赖分析和更新管理', expects: '技能已注册', depends_on: [] },
    ],
    update: [
      { step: 1, action: 'review', title: extra?.confirm ? '确认更新已完成' : '审查更新内容', skill: null, detail: extra?.confirm ? (res?.success ? res.name + ' 已更新到 v' + res.version + ' (' + res.files_updated + ' 文件)' : '更新失败: ' + (res?.error || '未知')) : '当前版本: ' + (res?.current_version || '?') + ' → 新版本: ' + (res?.new_version || '?') + '\n变更摘要: ' + (res?.diff_summary || '无'), reason: extra?.confirm ? '验证更新生效' : '审查 diff 后确认更新', expects: extra?.confirm ? '技能已更新' : '调 update confirm 执行更新', depends_on: [] },
    ],
    map: [
      { step: 1, action: 'review', title: '浏览技能分类地图', skill: null, detail: (res?.categories?.length || 0) + ' 个分类, ' + (res?.total || 0) + ' 个技能' + (args.category ? '，当前筛选: ' + args.category : '') + '\n可用的 category 参数: 通信协议 / MCU 架构 / RTOS / 常用模块 / 系统级设计 / 开发工具 / 编码规范与审查 / 中间件 / 知识管理 / 学习 / 前端框架 / UI/样式 / 前端工具 / 论文写作', reason: '了解可用技能体系，找到当前任务需要的技能', expects: '定位到适合当前任务的 skill', depends_on: [] },
      { step: 2, action: 'manual', title: args.task ? '查看任务推荐' : '选择并调用目标 skill', skill: null, detail: args.task ? 'task 参数指定的推荐结果已返回' : '从地图中找到目标 skill 后调 Skill() 加载', reason: '技能地图的最终目的是帮助找到并调取目标 skill', expects: '目标 skill 已加载并使用', depends_on: ['step_1'] },
    ],
    version: [
      { step: 1, action: 'review', title: '审查版本身份清单', skill: null, detail: (res?.total || 0) + ' 个技能, ' + (res?.outdated || 0) + ' 个可更新, ' + (res?.unversioned || 0) + ' 个无版本号', reason: '了解技能版本分布，发现需要更新的技能', expects: '确认版本状态，决定是否需要更新', depends_on: [] },
    ],
    check: [
      { step: 1, action: 'review', title: '审查批量更新检查结果', skill: null, detail: (res?.checked || 0) + ' 个技能已检查, ' + (res?.updatable || 0) + ' 个可更新', reason: '批量检查一次过，不需要逐个 update', expects: '选择需要更新的技能执行 update confirm', depends_on: [] },
    ],
  }
  return items[act] || []
}

function getToolState(act, res) {
  const base = { action: act }
  if (act === 'list') return { ...base, total: res?.total || 0, registered: res?.registered || 0, orphaned: res?.orphaned || 0 }
  if (act === 'install') return { ...base, success: res?.success || false, name: res?.name || null, version: res?.version || null, missing_deps: res?.missing_deps || [] }
  if (act === 'remove') return { ...base, success: res?.success || false, name: res?.name || null, has_dependents: res?.has_dependents || false }
  if (act === 'deps_tree') return { ...base, result_summary: res && typeof res === 'object' ? JSON.stringify(res).substring(0, 200) : String(res) }
  if (act === 'adopt') return { ...base, success: res?.success || false, name: res?.name || null, version: res?.version || null }
  if (act === 'update') return { ...base, success: res?.success || false, name: res?.name || null, version: res?.version || res?.new_version || null }
  if (act === 'map') return { ...base, categories: res?.categories?.length || 0, total: res?.total || 0 }
  if (act === 'version') return { ...base, total: res?.total || 0, outdated: res?.outdated || 0 }
  if (act === 'check') return { ...base, checked: res?.checked || 0, updatable: res?.updatable || 0 }
  return base
}

// ============================================================
// 技能分类地图数据（从 embedded-skills-map 合并）
// ============================================================

const SKILL_CATEGORIES = [
  {
    name: '通信协议',
    children: [
      { name: '有线通信', skills: [
        { name: 'i2c-bus', desc: 'I2C 总线配置/死锁恢复/时序/HAL 陷阱' },
        { name: 'spi-bus', desc: 'SPI 总线配置/BSY 恢复/NSS/DMA 一致性' },
        { name: 'uart-module', desc: 'UART/USART 串口/波特率/RS485/LIN/DMA' },
        { name: 'can-debug', desc: 'CAN 总线调试/监听/发送/节点扫描' },
        { name: 'modbus-debug', desc: 'Modbus RTU/TCP 调试/寄存器读写' },
      ]},
      { name: '无线通信', skills: [
        { name: 'ble-module', desc: 'BLE 低功耗蓝牙/STM32WB/ESP32/nRF52' },
        { name: 'wifi-module', desc: 'WiFi/ESP32/AT 模块/配网/TCP-UDP' },
        { name: 'lora-module', desc: 'LoRa/LoRaWAN SX1278/SX1262 远距离' },
        { name: 'cellular-module', desc: '4G/NB-IoT/Cat-M 蜂窝通信' },
        { name: 'gps-module', desc: 'GPS/北斗 GNSS 定位/NMEA 解析' },
      ]},
      { name: '物联网协议', skills: [
        { name: 'mqtt-module', desc: 'MQTT 协议/ESP-MQTT/paho/云平台对接' },
      ]},
    ],
  },
  {
    name: 'MCU 架构',
    children: [
      { name: 'ARM Cortex-M', skills: [
        { name: 'stm32-hal-development', desc: 'STM32 HAL 工程开发全指南' },
        { name: 'stm32-spl-development', desc: 'STM32 标准外设库 (SPL) 开发' },
        { name: 'arm-core-registers', desc: 'Cortex-M 内核寄存器/SCB/NVIC/SysTick/DWT' },
        { name: 'arm-memory-architecture', desc: '系统内存架构/MPU/Cache/内存屏障/总线矩阵' },
        { name: 'arm-interrupt-exception', desc: '中断/异常/NVIC/EXTI/HardFault/向量表/ISR' },
        { name: 'mcu-peripheral-registers', desc: 'STM32 外设寄存器级操作' },
      ]},
      { name: 'RISC-V', skills: [
        { name: 'build-idf', desc: 'ESP-IDF 构建' },
        { name: 'flash-idf', desc: 'ESP32 系列烧录' },
      ]},
    ],
  },
  {
    name: 'RTOS',
    children: [
      { name: '实时系统', skills: [
        { name: 'freertos-module', desc: 'FreeRTOS 任务/队列/信号量/中断安全' },
        { name: 'rtos-debug', desc: 'FreeRTOS/ThreadX 任务/栈/死锁/HardFault 分析' },
      ]},
    ],
  },
  {
    name: '常用模块',
    children: [
      { name: 'ADC 采集', skills: [{ name: 'adc-module', desc: 'ADC 时序/规则注入组/过采样/校准/DMA' }] },
      { name: '定时器', skills: [{ name: 'timer-module', desc: 'PWM/输入捕获/编码器/单脉冲/主从同步' }] },
      { name: '看门狗', skills: [{ name: 'watchdog-module', desc: 'IWDG/WWDG 配置/喂狗策略/调试冻结' }] },
      { name: '外设驱动', skills: [{ name: 'peripheral-driver', desc: '传感器/存储器/显示屏 BSP 驱动适配' }] },
      { name: 'DMA', skills: [{ name: 'dma-module', desc: 'DMA 配置/传输模式/中断/多路复用' }] },
      { name: 'USB', skills: [{ name: 'usb-module', desc: 'USB 设备/主机/HID/CDC/MSC 开发' }] },
      { name: '电机控制', skills: [{ name: 'motor-control', desc: 'FOC/PID/BLDC/步进电机' }] },
      { name: 'Flash 存储', skills: [{ name: 'flash-module', desc: '内部 Flash 读写/擦除/保护' }] },
      { name: 'SRAM', skills: [{ name: 'sram-module', desc: 'SRAM/PSRAM/SDRAM 配置/时序' }] },
    ],
  },
  {
    name: '系统级设计',
    children: [
      { name: '低功耗', skills: [{ name: 'lowpower-design', desc: 'Sleep/Stop/Standby/唤醒源/时钟门控' }] },
      { name: 'Bootloader', skills: [{ name: 'bootloader-design', desc: '启动架构/分区/跳转/回滚/安全引导' }] },
      { name: 'OTA', skills: [{ name: 'ota-update-system', desc: 'OTA 状态机/协议/安全/双芯片/量产策略' }] },
      { name: '芯片架构', skills: [{ name: 'chip-architecture', desc: 'MCU 架构差异 + 开发方式对比' }] },
    ],
  },
  {
    name: '开发工具',
    children: [
      { name: '构建', skills: [
        { name: 'build-keil', desc: 'Keil MDK 命令行编译' },
        { name: 'build-iar', desc: 'IAR 命令行编译' },
        { name: 'build-cmake', desc: 'CMake + ARM GCC 构建' },
        { name: 'build-platformio', desc: 'PlatformIO 构建' },
      ]},
      { name: '烧录', skills: [
        { name: 'flash-jlink', desc: 'J-Link 烧录/校验' },
        { name: 'flash-keil', desc: 'Keil MDK 烧录' },
        { name: 'flash-openocd', desc: 'OpenOCD 烧录' },
        { name: 'flash-platformio', desc: 'PlatformIO 烧录' },
        { name: 'gang-flash', desc: '多路并行量产烧录' },
      ]},
      { name: '调试', skills: [
        { name: 'debug-gdb-openocd', desc: 'GDB + OpenOCD 调试' },
        { name: 'serial-monitor', desc: '串口日志抓取/分析' },
        { name: 'segger-rtt-module', desc: 'SEGGER RTT 实时日志' },
        { name: 'cmbacktrace-debug', desc: 'CmBacktrace HardFault 回溯' },
        { name: 'embedded-debugger-framework', desc: '五层诊断模型故障排查' },
      ]},
      { name: '质量', skills: [
        { name: 'static-analysis', desc: 'cppcheck MISRA 自动扫描' },
        { name: 'map-analyzer', desc: 'Flash/RAM 用量/符号分析' },
      ]},
      { name: '打包部署', skills: [
        { name: 'firmware-sign', desc: 'ECDSA/RSA 签名/加密' },
        { name: 'ota-package', desc: '全量/差分/分段 OTA 打包' },
      ]},
      { name: '硬件通信', skills: [
        { name: 'pcb-analysis', desc: 'LCEDA Pro 原理图 BOM/电源树/引脚/网络/DRC' },
        { name: 'visa-debug', desc: 'GPIB/USB/TCP 仪器控制' },
      ]},
    ],
  },
  {
    name: '编码规范与审查',
    children: [
      { name: '规范', skills: [{ name: 'coding-standards', desc: '编码规范速查（MISRA + 立芯）' }] },
      { name: '审查', skills: [{ name: 'embedded-reviewer', desc: '中断安全/DMA/并发/内存审查' }] },
      { name: '架构', skills: [{ name: 'embedded-architect', desc: '系统架构设计与需求分析' }] },
    ],
  },
  {
    name: '中间件',
    children: [
      { name: '文件系统', skills: [{ name: 'fatfs-module', desc: 'FATFS 移植/配置/开发' }] },
      { name: '加密切换', skills: [
        { name: 'aes-module', desc: 'AES 加密/STM32 CRYP 硬件/软件库' },
        { name: 'rsa-module', desc: 'RSA 非对称加密/签名验签' },
        { name: 'crc-module', desc: 'CRC 校验/查表法/硬件 CRC' },
      ]},
      { name: '通信', skills: [
        { name: 'ymodem-module', desc: 'Ymodem 串口文件传输协议' },
        { name: 'lora-module', desc: 'LoRa/LoRaWAN SX1278/SX1262' },
      ]},
      { name: '图形', skills: [{ name: 'lvgl-module', desc: 'LVGL 嵌入式图形界面/GUI' }]},
      { name: '信号处理', skills: [
        { name: 'dsp-module', desc: 'DSP FIR/IIR/CMSIS-DSP' },
        { name: 'fft-module', desc: 'FFT 频谱分析/窗函数/Goertzel' },
      ]},
      { name: '存储驱动', skills: [{ name: 'sfud-module', desc: 'SFUD 串行 Flash 通用驱动' }]},
      { name: '日志', skills: [
        { name: 'elog-module', desc: 'EasyLogger 分级日志库' },
      ]},
    ],
  },
  {
    name: '知识管理',
    children: [
      { name: '检索', skills: [{ name: 'knowledge-base-search', desc: '六源知识检索管线' }] },
      { name: '验证', skills: [{ name: 'kb-verify', desc: '真伪验证引擎' }] },
      { name: '导入', skills: [{ name: 'kb-import', desc: '知识导入' }] },
      { name: '记录', skills: [{ name: 'kb-record', desc: '问题记录归档' }] },
      { name: '数据手册', skills: [{ name: 'kb-datasheet', desc: '数据手册获取' }] },
      { name: '文档生成', skills: [{ name: 'doc-automation', desc: '自动生成 Doxygen/minunit/API 文档' }] },
    ],
  },
  {
    name: '学习',
    children: [
      { name: '路径规划', skills: [{ name: 'embedded-learning-path-framework', desc: '三阶段学习路径规划' }] },
      { name: '笔记记录', skills: [{ name: 'embedded-learning-notes', desc: '学习笔记管理（Obsidian 归档）' }] },
      { name: '技能系统', skills: [{ name: 'skills-system-builder', desc: '技能创建规范/模板/流程' }] },
    ],
  },
  {
    name: '前端框架',
    children: [
      { name: 'React/Next.js', skills: [
        { name: 'react-best-practices', desc: 'React/Next.js 性能优化/45 条规则/Vercel 维护' },
      ]},
      { name: 'Vue/Nuxt', skills: [
        { name: 'vue-best-practices', desc: 'Vue 3 最佳实践/TypeScript/40+ 条规则' },
        { name: 'nuxt-best-practices', desc: 'Nuxt 3/4 性能优化/架构指南' },
      ]},
      { name: '全栈', skills: [
        { name: 'senior-fullstack', desc: '高级全栈开发工具集/现代最佳实践' },
        { name: 'composition-patterns', desc: '组合模式/模块化可维护架构' },
      ]},
    ],
  },
  {
    name: 'UI/样式',
    children: [
      { name: 'Tailwind CSS', skills: [
        { name: 'tailwind-design-system', desc: 'Tailwind 生产级设计系统/Design Tokens' },
        { name: 'tailwind-patterns', desc: 'Tailwind CSS v4 原则/CSS-first 配置/容器查询' },
      ]},
      { name: 'CSS 布局', skills: [
        { name: 'css-modern-layouts', desc: '精英级 CSS 布局/现代响应式设计模式' },
      ]},
      { name: '组件库', skills: [
        { name: 'radix-ui-design-system', desc: 'Radix UI 无障碍设计系统/原语组件' },
      ]},
      { name: '设计系统', skills: [
        { name: 'frontend-design', desc: '前端设计师工程师/高工艺界面/设计系统' },
        { name: 'ui-ux-pro-max', desc: 'UI/UX 专业设计/67 风格/96 调色板/57 字体' },
        { name: 'web-design-guidelines', desc: '现代 Web 设计指南与最佳实践' },
      ]},
    ],
  },
  {
    name: '前端工具',
    children: [
      { name: '3D/可视化', skills: [
        { name: 'threejs-fundamentals', desc: 'Three.js 场景/相机/渲染器/Object3D 层级' },
      ]},
      { name: '视频/演示', skills: [
        { name: 'remotion-best-practices', desc: 'Remotion 视频创作最佳实践' },
        { name: 'frontend-slides', desc: '前端幻灯片与演示文稿制作' },
      ]},
    ],
  },
  {
    name: '论文写作',
    children: [
      { name: '核心写作框架', skills: [
        { name: 'research-paper-writing-skills', desc: 'ML/CV/NLP 论文写作技能包，通用学术写作框架' },
        { name: 'academic-paper-skills', desc: '系统化学术论文规划与写作框架' },
        { name: 'codex-claude-academic-skills', desc: '中文科研用户专用，完整工作流' },
      ]},
      { name: 'LaTeX 排版', skills: [
        { name: 'latex-document-skill', desc: '27 个 LaTeX 模板 + 脚本 + 参考指南' },
        { name: 'beamer-skill', desc: 'Beamer 学术演示文稿制作' },
        { name: 'latex-typesetting-advisor', desc: 'LaTeX 排版顾问，支持中文文档' },
      ]},
      { name: '中文学位论文', skills: [
        { name: 'paper-maker', desc: '中文本科/硕士论文写作，无幻觉文献搜索' },
        { name: 'ug-thesis-writing', desc: '中文本科毕设全流程辅助（9 阶段工作流）' },
        { name: 'humanize-mba-text-skill', desc: '去除中文论文 AI 写作痕迹' },
        { name: 'humanizer-zh-academic', desc: '降低中文学术写作 AIGC 检测率' },
      ]},
      { name: '英文期刊论文', skills: [
        { name: 'paper-writing-skill', desc: '结构化写作流水线（头脑风暴→初稿→评估→写作→压缩）' },
        { name: 'paperjury', desc: '投稿前 AI 审稿压力测试' },
        { name: 'response-letter-bootstrap-skill', desc: 'IEEE 格式审稿意见回复信生成' },
      ]},
      { name: '专业领域增强', skills: [
        { name: 'paper-orchestra', desc: '自动化研究论文写作器' },
        { name: 'mathmodel-skill', desc: '数学建模工作流（适合嵌入式算法论文）' },
      ]},
    ],
  },
]

// 任务→技能推荐表
const TASK_SKILL_RECOMMENDATIONS = [
  { task: '新建工程 (HAL)', skills: ['stm32-hal-development', 'build-cmake', 'flash-jlink'] },
  { task: '新建工程 (SPL)', skills: ['stm32-spl-development', 'build-cmake', 'flash-jlink'] },
  { task: '编译 Keil', skills: ['build-keil'] },
  { task: '编译 ESP-IDF', skills: ['build-idf', 'flash-idf'] },
  { task: '烧录 J-Link', skills: ['flash-jlink'] },
  { task: '烧录 OpenOCD', skills: ['flash-openocd'] },
  { task: '串口调试', skills: ['serial-monitor', 'uart-module'] },
  { task: 'I2C 设备调试', skills: ['i2c-bus'] },
  { task: 'SPI 设备调试', skills: ['spi-bus'] },
  { task: '低功耗设计', skills: ['lowpower-design', 'timer-module', 'watchdog-module'] },
  { task: 'Bootloader', skills: ['bootloader-design', 'ota-update-system', 'ota-package'] },
  { task: 'FreeRTOS 开发', skills: ['freertos-module', 'rtos-debug'] },
  { task: '代码审查', skills: ['embedded-reviewer', 'coding-standards', 'static-analysis'] },
  { task: '架构评审', skills: ['embedded-architect', 'embedded-reviewer'] },
  { task: 'HardFault 调试', skills: ['cmbacktrace-debug', 'embedded-debugger-framework', 'debug-gdb-openocd'] },
  { task: '单元测试', skills: ['doc-automation', 'static-analysis'] },
  { task: '固件签名/OTA', skills: ['firmware-sign', 'ota-package', 'ota-update-system'] },
  { task: '量产烧录', skills: ['gang-flash', 'firmware-sign'] },
  { task: '原理图审查', skills: ['pcb-analysis'] },
  { task: '仪表控制', skills: ['visa-debug'] },
  // ── 前端任务 ──
  { task: 'React 组件开发', skills: ['react-best-practices', 'frontend-design', 'composition-patterns'] },
  { task: 'Vue 项目搭建', skills: ['vue-best-practices', 'nuxt-best-practices', 'composition-patterns'] },
  { task: 'Tailwind 样式系统', skills: ['tailwind-design-system', 'tailwind-patterns', 'css-modern-layouts'] },
  { task: 'UI/UX 设计', skills: ['ui-ux-pro-max', 'frontend-design', 'radix-ui-design-system', 'web-design-guidelines'] },
  { task: '3D 可视化', skills: ['threejs-fundamentals', 'react-best-practices'] },
  { task: '全栈开发', skills: ['senior-fullstack', 'react-best-practices', 'vue-best-practices'] },
  { task: '视频/演示制作', skills: ['remotion-best-practices', 'frontend-slides'] },
  // ── 论文写作任务 ──
  { task: '学位论文写作', skills: ['codex-claude-academic-skills', 'paper-maker', 'humanizer-zh-academic', 'latex-document-skill'] },
  { task: '期刊论文写作', skills: ['research-paper-writing-skills', 'paper-writing-skill', 'paperjury', 'response-letter-bootstrap-skill'] },
  { task: 'LaTeX 排版', skills: ['latex-document-skill', 'latex-typesetting-advisor', 'beamer-skill'] },
  { task: '参考文献管理', skills: ['research-paper-writing-skills', 'academic-paper-skills'] },
  { task: '论文结构规划', skills: ['academic-paper-skills', 'paper-writing-skill'] },
  { task: '投稿前审稿', skills: ['paperjury', 'paper-writing-skill'] },
  { task: '审稿意见回复', skills: ['response-letter-bootstrap-skill'] },
  { task: '学术 PPT 制作', skills: ['beamer-skill', 'latex-document-skill'] },
  { task: '数学建模论文', skills: ['mathmodel-skill', 'paper-orchestra'] },
  { task: '嵌入式论文写作', skills: ['codex-claude-academic-skills', 'research-paper-writing-skills', 'latex-document-skill', 'paper-maker'] },
]

// ============================================================
// 主流程
// ============================================================

const { action } = args
const SKILLS_DIR = '~/.claude/skills'
const REGISTRY_PATH = '~/.claude/tool-layer/registry.json'

phase('解析')
log(`工具层请求: ${action}`)

// ============================================================
// Action: list
// ============================================================

if (action === 'list') {
  phase('扫描')
  log('扫描 skills 目录...')

  const registryRaw = await agent(`
    读取注册表文件 ${REGISTRY_PATH}。
    如果文件存在，输出其完整 JSON 内容，不要加任何额外格式。
    如果文件不存在，输出 {}。
  `, {
    label: '读取注册表',
    phase: '扫描',
  })

  let registry = { version: 1, skills: [] }
  try {
    let raw = (typeof registryRaw === 'string') ? registryRaw : JSON.stringify(registryRaw)
    raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      registry = { version: 1, skills: parsed }
    } else if (parsed && Array.isArray(parsed.skills)) {
      registry = parsed
    }
  } catch (e) {
    log('注册表读取失败: ' + e.message)
  }

  const registeredNames = new Set(registry.skills.map(s => s.name))

  log('扫描所有 SKILL.md 文件...')

  const result = await agent(`
    扫描 ${SKILLS_DIR} 下所有 SKILL.md（递归）。

    对于每个文件，读取 YAML frontmatter 提取:
    - name, description(第一行), version, depends_on, source

    确定 category:
    - /engineering/ -> engineering
    - /productivity/ -> productivity
    - /misc/ -> misc
    - /_archive/ -> _archive
    - else -> root

    status 设为空字符串 ""。
    path: 相对于 skills/ 的路径。

    返回 { total: 数量, skills: [...] }，按 name 排序。
  `, {
    label: '扫描所有 Skill',
    phase: '扫描',
    schema: LIST_RESULT_SCHEMA,
  })

  const skills = (result.skills || []).map(s => {
    if (s.category === '_archive') return { ...s, status: 'archived' }
    if (registeredNames.has(s.name)) return { ...s, status: 'registered' }
    return { ...s, status: 'orphaned' }
  })

  const registered = skills.filter(s => s.status === 'registered')
  const orphaned = skills.filter(s => s.status === 'orphaned')
  const archived = skills.filter(s => s.status === 'archived')

  phase('输出')
  log(`Skills: ${skills.length} (registered: ${registered.length}, orphaned: ${orphaned.length}, archived: ${archived.length})`)

  return {
    total: skills.length,
    registered: registered.length,
    orphaned: orphaned.length,
    archived: archived.length,
    skills,
    action_items: getToolActionItems('list', null, { registered: registered.length, orphaned: orphaned.length, archived: archived.length }),
    state: { produced: getToolState('list', { total: skills.length, registered: registered.length, orphaned: orphaned.length }) },
  }
}

// ============================================================
// Action: install
// ============================================================

if (action === 'install') {
  const { source, name } = args
  if (!source) throw new Error('install 需要 source 参数')

  phase('执行')
  log(`安装: ${source}`)

  const result = await agent(`
    安装技能: ${source}

    1. git clone ${source} 到临时目录
    2. 找到 SKILL.md，提取 name/version/depends_on
    3. 检查冲突
    4. 复制到 ${SKILLS_DIR}/<name>/
    5. 更新注册表 ${REGISTRY_PATH}

    返回: { success, name, version, depends_on, missing_deps, path, error }
  `, {
    label: '安装',
    phase: '执行',
    schema: INSTALL_RESULT_SCHEMA,
  })

  phase('输出')
  if (result.success) {
    log(`${result.name} v${result.version} installed`)
  } else {
    log(`install failed: ${result.error}`)
  }
  return { ...result, action_items: getToolActionItems('install', result), state: { produced: getToolState('install', result) } }
}

// ============================================================
// Action: remove
// ============================================================

if (action === 'remove') {
  const { name, force } = args
  if (!name) throw new Error('remove 需要 name 参数')

  phase('执行')
  log(`卸载: ${name}`)

  const result = await agent(`
    卸载技能 ${name}. Force: ${!!force}

    1. 检查 ${SKILLS_DIR}/${name}/ 是否存在
    2. 扫描其他 SKILL.md 是否有 depends_on 引用 ${name}
    3. 删除目录
    4. 更新注册表

    返回: { success, name, dependents, has_dependents, needs_force, error }
  `, {
    label: '卸载',
    phase: '执行',
    schema: REMOVE_RESULT_SCHEMA,
  })

  phase('输出')
  if (result.needs_force) {
    log(`${name} is depended on. Use force: true to override.`)
  } else if (result.success) {
    log(`${name} removed`)
  } else {
    log(`remove failed: ${result.error}`)
  }
  return { ...result, action_items: getToolActionItems('remove', result), state: { produced: getToolState('remove', result) } }
}

// ============================================================
// Action: deps-tree
// ============================================================

if (action === 'deps-tree') {
  phase('扫描')
  log('分析依赖关系...')

  const result = await agent(`
    分析 ${SKILLS_DIR} 下所有 SKILL.md 的 depends_on 字段。
    构建依赖树，检查缺失依赖。

    返回: { total_with_deps, total_reverse_deps, missing_deps_count, missing_deps, most_depended_on, tree_nodes }
  `, {
    label: '依赖分析',
    phase: '扫描',
  })

  phase('输出')
  if (!result.total_with_deps) {
    log('No depends_on declared yet.')
  }
  return { ...result, action_items: getToolActionItems('deps_tree', result), state: { produced: getToolState('deps_tree', result) } }
}

// ============================================================
// Action: adopt
// ============================================================

if (action === 'adopt') {
  const { name, source } = args
  if (!name) throw new Error('adopt 需要 name 参数')

  phase('执行')
  log(`收养: ${name}`)

  const result = await agent(`
    将 ${name} 注册到工具层管理。

    1. 确认 ${SKILLS_DIR}/${name}/SKILL.md 存在
    2. 读取 version
    3. 添加到 ${REGISTRY_PATH}

    注册表格式: { version: 1, skills: [{ name, version, source, installed_at, updated_at }] }

    返回: { success, name, version, source, error }
  `, {
    label: '收养',
    phase: '执行',
    schema: ADOPT_RESULT_SCHEMA,
  })

  phase('输出')
  if (result.success) {
    log(`${result.name} v${result.version} adopted`)
  } else {
    log(`adopt failed: ${result.error}`)
  }
  return { ...result, action_items: getToolActionItems('adopt', result), state: { produced: getToolState('adopt', result) } }
}

// ============================================================
// Action: update — 更新 Skill
// 参数: { name: 'skill-name', confirm?: true }
// 第一次调用显示 diff，带上 confirm: true 执行更新
// ============================================================

if (action === 'update') {
  const { name, confirm } = args
  if (!name) throw new Error('update 需要 name 参数')

  if (!confirm) {
    phase('扫描')
    log(`检查更新: ${name}`)

    const result = await agent(`
      检查技能 ${name} 的可用更新。

      技能目录: ${SKILLS_DIR}/${name}/
      注册表: ${REGISTRY_PATH}

      步骤:
      1. 读取 ${REGISTRY_PATH}，找到 ${name} 的 source 字段
      2. 如果 source 为空，返回 { success: false, error: "no_source" }
      3. 从 source（Git URL）克隆最新版本到临时目录
      4. 读取最新版 SKILL.md，解析 version
      5. 对比新旧版本的文件差异
      6. 列出需要更新的文件

      返回: { success, name, current_version, new_version, source, files_changed, diff_summary, needs_confirmation, error }
    `, {
      label: `检查 ${name} 更新`,
      phase: '扫描',
      schema: SHOW_DIFF_SCHEMA,
    })

    phase('输出')
    if (result.error === 'no_source') {
      log(`${name} 没有记录来源，无法更新。`)
    } else if (result.success) {
      log(`${name}: ${result.current_version} -> ${result.new_version}`)
      log(`来源: ${result.source}`)
      log(`变更: ${result.diff_summary}`)
      log(`文件: ${result.files_changed?.join(', ') || '无'}`)
      log(`确认: Workflow({ scriptPath: '.claude/workflows/tool-layer.js', args: { action: 'update', name: '${name}', confirm: true } })`)
    } else {
      log(`update check failed: ${result.error}`)
    }
    return { ...result, action_items: getToolActionItems('update', result, { confirm: false }), state: { produced: getToolState('update', result) } }
  }

  phase('执行')
  log(`执行更新: ${name}`)

  const result = await agent(`
    执行 ${name} 的确认更新。

    1. 读取 ${REGISTRY_PATH}，获取 source
    2. 从 source 克隆最新版到临时目录
    3. 替换 ${SKILLS_DIR}/${name}/
    4. 读取新 version
    5. 更新注册表

    返回: { success, name, version, files_updated, error }
  `, {
    label: `应用 ${name} 更新`,
    phase: '执行',
    schema: APPLY_UPDATE_SCHEMA,
  })

  phase('输出')
  if (result.success) {
    log(`${name} 更新到 v${result.version}`)
  } else {
    log(`update failed: ${result.error}`)
  }
  return { ...result, action_items: getToolActionItems('update', result, { confirm: true }), state: { produced: getToolState('update', result) } }
}

// ============================================================
// Action: map — 技能分类地图
// 参数: { category?: '通信协议'|'MCU 架构'|... } — 筛选分类
//       { task?: 'I2C 设备调试'|... } — 按任务推荐技能
// ============================================================

if (action === 'map') {
  phase('扫描')
  const categoryFilter = args.category || null
  const taskFilter = args.task || null

  if (taskFilter) {
    const taskLower = taskFilter.toLowerCase()
    const recommendations = TASK_SKILL_RECOMMENDATIONS.filter(r =>
      taskLower.includes(r.task.toLowerCase().slice(0, 4)) ||
      r.task.toLowerCase().includes(taskLower)
    )
    log(`任务推荐: "${taskFilter}" → ${recommendations.length} 个匹配`)
    for (const r of recommendations) {
      log(`  ${r.task}: ${r.skills.join(', ')}`)
    }
    if (recommendations.length === 0) log('  （无精确匹配，浏览全部分类后选择）')
    phase('输出')
    return {
      mode: 'task_recommendation', task: taskFilter, recommendations,
      action_items: getToolActionItems('map', { categories: SKILL_CATEGORIES, total: countSkills() }),
      state: { produced: getToolState('map', { categories: SKILL_CATEGORIES, total: countSkills() }) },
    }
  }

  let categories = SKILL_CATEGORIES
  if (categoryFilter) {
    categories = SKILL_CATEGORIES.filter(c => c.name === categoryFilter)
    if (categories.length === 0) log('未找到分类 "' + categoryFilter + '"，可用: ' + SKILL_CATEGORIES.map(c => c.name).join(' / '))
  }

  const total = categories.reduce((sum, cat) => sum + cat.children.reduce((s, child) => s + child.skills.length, 0), 0)
  phase('输出')
  log('技能分类地图: ' + categories.length + ' 个分类, ' + total + ' 个技能')
  for (const cat of categories) {
    log('[' + cat.name + ']')
    for (const child of cat.children) log('  ' + child.name + ': ' + child.skills.map(s => s.name).join(', '))
  }
  if (!categoryFilter && !taskFilter) log('可用参数: category="<分类名>" 筛选 | task="<任务名>" 推荐技能')

  return {
    mode: categoryFilter ? 'category_filter' : 'full_map', categories, total, filter: categoryFilter || null,
    action_items: getToolActionItems('map', { categories, total }),
    state: { produced: getToolState('map', { categories, total }) },
  }
}

function countSkills() {
  return SKILL_CATEGORIES.reduce((sum, cat) => sum + cat.children.reduce((s, child) => s + child.skills.length, 0), 0)
}

// ============================================================
// Action: version — 版本身份清单
// ============================================================

if (action === 'version') {
  phase('扫描')
  log('扫描所有技能版本...')
  log('注: tool-layer version = 技能版本。ops-layer version = 系统组件版本。')

  const result = await agent('扫描 ' + SKILLS_DIR + ' 下所有 SKILL.md，读取 version 字段。返回 { total, versioned, unversioned, outdated, detail }。无版本标记为 "N/A"。', {
    label: '扫描技能版本', phase: '扫描',
  })

  phase('输出')
  const summary = (typeof result === 'string') ? { total: 0, detail: result } : result
  log('版本身份清单: ' + (summary.total || '?') + ' 个技能')
  if (summary.unversioned > 0) log('  ⚠️ 无版本: ' + summary.unversioned)
  if (summary.outdated > 0) log('  🔄 可更新: ' + summary.outdated)
  if (summary.detail) log(summary.detail.substring(0, 1000))

  return { ...summary, action_items: getToolActionItems('version', summary), state: { produced: getToolState('version', summary) } }
}

// ============================================================
// Action: check — 批量检查更新
// ============================================================

if (action === 'check') {
  phase('扫描')
  log('批量检查可更新技能...')

  const result = await agent('读取 ' + REGISTRY_PATH + '，找到有 source 字段的技能，检查最新版本。返回 { checked, updatable, skills: [...] }。', {
    label: '批量检查更新', phase: '扫描',
    schema: { type: 'object', properties: { checked: { type: 'number' }, updatable: { type: 'number' }, skills: { type: 'array', items: { type: 'object' } } }, required: ['checked', 'updatable'] },
  })

  phase('输出')
  if (result.checked === 0) { log('没有技能有来源（source），无法检查更新。') }
  else {
    log('检查结果: ' + result.checked + ' 个技能, ' + result.updatable + ' 个可更新')
    if (result.skills) for (const s of result.skills) { if (s.current_version !== s.new_version) log('  ' + s.name + ': ' + (s.current_version || '?') + ' -> ' + (s.new_version || '?')) }
  }
  return { ...result, action_items: getToolActionItems('check', result), state: { produced: getToolState('check', result) } }
}

// ============================================================
// Action: license-check — 许可证兼容性检查
// ============================================================

if (action === 'license-check') {
  phase('扫描')
  log('扫描技能许可证...')

  const result = await agent({
    prompt: `你是许可证检查员。扫描 ${SKILLS_DIR} 下所有 SKILL.md 文件。

对每个 SKILL.md：
1. 读取 frontmatter 中的 license / source / upstream 字段
2. 如果 license 缺失，标记为 "未声明"
3. 如果有 source 或 upstream URL，提取域名和仓库名
4. 检查已知的"需关注"许可证：
   - MIT / BSD / Apache-2.0 → 兼容
   - GPL / LGPL / AGPL → 需关注（病毒式传染）
   - CC-BY-NC / 自定义 → 需关注（非商业限制）
   - 未声明 → 需关注（无法判断兼容性）

返回 JSON:
{
  "total": N,
  "licensed": N,
  "unlicensed": N,
  "attention_needed": [{"name": "skill-name", "license": "GPL", "source": "url", "reason": "GPL 传染性许可证"}],
  "upstream_issues": [{"skill": "build-keil", "upstream": "Keil MDK", "license": "商业软件", "compatible": false, "note": "需用户自备 Keil 许可证"}],
  "detail": "summary text"
}`,
    label: 'license-check',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        licensed: { type: 'number' },
        unlicensed: { type: 'number' },
        attention_needed: { type: 'array', items: { type: 'object' } },
        upstream_issues: { type: 'array', items: { type: 'object' } },
        detail: { type: 'string' },
      },
      required: ['total', 'licensed', 'unlicensed'],
    },
  })

  phase('输出')
  const summary = result || { total: 0, licensed: 0, unlicensed: 0, attention_needed: [], upstream_issues: [] }
  log('许可证检查: ' + summary.total + ' 个技能')
  log('  有声明: ' + summary.licensed + ' | 未声明: ' + summary.unlicensed)
  if (summary.attention_needed?.length > 0) {
    log('  关注:')
    for (const a of summary.attention_needed) log('    [' + (a.license || '?') + '] ' + a.name + ' — ' + (a.reason || ''))
  }
  if (summary.upstream_issues?.length > 0) {
    log('  上游:')
    for (const u of summary.upstream_issues) log('    ' + u.skill + ' -> ' + (u.upstream || '?') + ' (' + (u.license || '?') + ')')
  }

  return {
    ...summary,
    action_items: [{
      step: 1, action: 'review',
      title: '审查许可证检查结果',
      detail: summary.attention_needed?.length > 0 || summary.upstream_issues?.length > 0
        ? summary.attention_needed?.length + ' 个技能需关注, ' + summary.upstream_issues?.length + ' 个上游问题'
        : '所有技能许可证兼容',
      depends_on: [],
    }],
    state: {
      produced: {
        action: 'license-check',
        total_skills: summary.total,
        licensed: summary.licensed,
        unlicensed: summary.unlicensed,
        attention_count: summary.attention_needed?.length || 0,
        upstream_issues: summary.upstream_issues?.length || 0,
      },
    },
  }
}

// ============================================================
// Fallback
// ============================================================

if (action) throw new Error('Unknown action: "' + action + '". Supported: list, install, remove, update, deps-tree, adopt, map, version, check, license-check.')
// No registered name when action is undefined (engine name resolution)
