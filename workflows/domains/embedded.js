// 嵌入式领域配置 — 给 agent-orchestration 引擎加载
// 类型定义参考 agent-orchestration.js 的 DOMAINS 接口

const config = {
  name: 'embedded',

  // ── skill 路由表 ──
  skillCategory: {
    // debug
    'embedded-debugger-framework': 'debug', 'cmbacktrace-debug': 'debug',
    'arm-interrupt-exception': 'debug', 'interrupt-optimization': 'debug',
    'arm-memory-architecture': 'debug', 'rtos-debug': 'debug',
    'freertos-module': 'debug', 'arm-core-registers': 'debug',
    'mcu-peripheral-registers': 'debug',
    // build
    'build-cmake': 'build', 'build-keil': 'build', 'build-iar': 'build',
    'build-idf': 'build', 'build-platformio': 'build',
    'flash-openocd': 'build', 'flash-keil': 'build', 'flash-idf': 'build',
    'flash-platformio': 'build', 'flash-jlink': 'build', 'code-porting': 'build',
    'debug-gdb-openocd': 'build', 'debug-platformio': 'build',
    // monitor
    'serial-monitor': 'monitor', 'uart-module': 'monitor', 'rtt-monitor': 'monitor',
    // comm
    'can-debug': 'comm', 'modbus-debug': 'comm', 'i2c-bus': 'comm',
    'spi-bus': 'comm', 'ble-module': 'comm', 'wifi-module': 'comm',
    'lora-module': 'comm', 'cellular-module': 'comm', 'gps-module': 'comm',
    'mqtt-module': 'comm',
    // driver
    'peripheral-driver': 'driver', 'stm32-hal-development': 'driver',
    'stm32-spl-development': 'driver', 'timer-module': 'driver',
    'adc-module': 'driver', 'dma-module': 'driver', 'flash-module': 'driver',
    'usb-module': 'driver', 'sram-module': 'driver', 'motor-control': 'driver',
    // system
    'lowpower-design': 'system', 'bootloader-design': 'system',
    'ota-update-system': 'system', 'watchdog-module': 'system',
    // quality
    'static-analysis': 'quality', 'coding-standards': 'quality',
    'embedded-reviewer': 'quality', 'map-analyzer': 'quality',
    'linker-scatter': 'quality', 'doc-automation': 'quality',
    // arch
    'embedded-architect': 'arch',
    'embedded-learning-path-framework': 'arch', 'embedded-learning-notes': 'arch',
    // workflow
    'brainstorming': 'workflow', 'writing-plans': 'workflow', 'executing-plans': 'workflow',
    // analysis
    'pcb-analysis': 'analysis',
    // release
    'option-bytes': 'release', 'firmware-sign': 'release',
    'ota-package': 'release', 'gang-flash': 'release',
    // middleware
    'fatfs-module': 'middleware', 'aes-module': 'middleware', 'rsa-module': 'middleware',
    'crc-module': 'middleware', 'ymodem-module': 'middleware', 'lvgl-module': 'middleware',
    'dsp-module': 'middleware', 'fft-module': 'middleware', 'sfud-module': 'middleware',
    'segger-rtt-module': 'middleware', 'elog-module': 'middleware',
    // knowledge
    'knowledge-base-search': 'knowledge', 'kb-datasheet': 'knowledge',
    'kb-import': 'knowledge', 'kb-record': 'knowledge', 'kb-verify': 'knowledge',
  },

  // ── 类别级执行指引 ──
  categoryPrompts: {
    debug: '优先定位症状根因，再实现修复代码；使用五层模型：症状→隔离→根因→修复→验证',
    build: '确保构建脚本和链接配置正确；验证编译产物完整性',
    monitor: '配置监控通道，验证数据输出格式正确',
    comm: '按协议规范逐字节验证，注意时序和错误处理；怀疑协议问题时可抓包比对',
    driver: '封装 init/read_write/irq_callback 三层 API，编写上电自检函数',
    system: '分析系统级约束，量化方案权衡（功耗/性能/安全）',
    quality: '逐行审查代码，记录所有违规项并给出修复建议',
    arch: '从模块边界和接口契约出发设计，先定义接口再实现内部逻辑',
    workflow: '严格按流程步骤执行，不跳步骤',
    analysis: '逐网络/引脚分析，记录所有异常点和冲突',
    release: '确认所有不可逆操作前经用户批准；验证产物签名和完整性',
    middleware: '检查接口对齐和依赖版本兼容性',
    knowledge: '多来源交叉验证技术断言，标注每条信息的可信度',
    general: '按任务描述执行，确保产出符合验收标准',
  },

  // ── 排查路线图 ──
  troubleshootingMap: [
    { keywords: ['i2c', 'busy', '卡死'], step1: 'i2c-bus: 9脉冲法/SWRST复位I2C外设', step2: '检查SCL/SDA电平确认硬件连接' },
    { keywords: ['spi', 'bsy', '假死', 'stuck'], step1: 'spi-bus: CR1复位SPI外设', step2: '检查SPI_SR状态位，确认BSY标志已清除' },
    { keywords: ['hardfault', 'hard fault', '异常'], step1: 'cmbacktrace-debug: 一键分析HardFault栈回溯', step2: 'arm-core-registers: 手动解码CFSR/BFSR/UFSR' },
    { keywords: ['uart', '串口', '乱码', '收不到'], step1: 'uart-module: 核对波特率/数据位/停止位/ORE标志', step2: 'serial-monitor: 检查串口线序和电平转换' },
    { keywords: ['adc', '跳变', '不准', '抖动'], step1: 'adc-module: 检查采样时间/参考电压/校准', step2: 'stm32-hal-development: 验证ADC时钟分频' },
    { keywords: ['pwm', '无输出'], step1: 'timer-module: 检查MOE主输出使能和刹车输入', step2: 'mcu-peripheral-registers: 检查TIM_CR1/CR2配置' },
    { keywords: ['dma', '传输中断', '不完成'], step1: 'dma-module: 检查FIFO/DBM位/中断标志', step2: 'stm32-hal-development: 验证DMA与外设握手信号' },
    { keywords: ['flash', '写入失败', '编程错误'], step1: 'flash-module: 检查等待周期/解锁序列/擦除操作', step2: 'mcu-peripheral-registers: 检查FLASH_SR错误位' },
    { keywords: ['usb', '枚举失败'], step1: 'usb-module: 检查时钟配置/描述符/上拉电阻', step2: 'stm32-hal-development: 验证USB内核初始化顺序' },
    { keywords: ['rtos', '死锁', '挂起', '任务阻塞'], step1: 'rtos-debug: 检查任务状态列表和栈高水位', step2: 'freertos-module: 验证临界区和信号量使用' },
    { keywords: ['寄存器写不进', '无响应', '超时'], step1: 'mcu-peripheral-registers: 检查外设时钟使能和复位状态', step2: 'stm32-hal-development: 验证HAL初始化顺序' },
    { keywords: ['看门狗', '复位', '喂狗'], step1: 'watchdog-module: 检查RCC_CSR复位原因寄存器', step2: 'embedded-debugger-framework: 确认喂狗周期和主循环路径' },
  ],

  // ── 知识验证标准 ──
  verificationCriteria: `
=== 知识验证标准 ===
对Agent产出的技术断言进行验证:
1. 来源可信度: 参考手册(1.0) > HAL源码(0.85) > 社区(0.50) > 论坛(0.30) > 博客(0.25)
2. 危险标记: 检测 "仅供参考/TODO/可能/未经测试" — 存在即标记不可靠
3. 交叉验证: 寄存器值/API签名/时序参数必须至少2源比对
4. 版本对齐: 确认API版本与目标MCU/固件包版本匹配
5. 可信评级: ≥0.70直接采信, 0.40-0.69需交叉验证, <0.40仅作线索`,
}

// ── 安全层开关标记（规则集中在 safety-layer.js） ──
security: {
	enabled: true,
	domain: 'embedded',
	// 增强检查：嵌入式专属高风险操作 + 文件权限 + 命令黑名单
	preflight_rules: {
		check_high_risk: true,
		check_file_permissions: true,
		check_blacklist: true,
		check_embedded_constraints: true,
	},
	output_filter: {
		filter_sensitive: true,
		filter_chip_uid: true,
		filter_firmware_keys: true,
	},
	audit: {
		enabled: true,
		trace_level: 'task',  // 'task' | 'batch' | 'full'
	},
},

// eslint-disable-next-line no-unused-vars
const __domainConfig = config
