const fs = require('fs');
const path = require('path');

const SKILLS_DIR = 'C:/Users/zhang/.claude/skills';

const REGISTERED = new Set([
  "adc-module","aes-module","agent-packager","arm-core-registers","arm-interrupt-exception","arm-memory-architecture","ble-module","bootloader-design","brainstorming","build-cmake","build-iar","build-idf","build-keil","build-platformio","can-debug","cellular-module","chip-architecture","cmbacktrace-debug","code-porting","coding-standards","crc-module","debug-gdb-openocd","dma-module","doc-automation","dsp-module","elog-module","embedded-architect","embedded-debugger-framework","embedded-learning-notes","embedded-learning-path-framework","embedded-reviewer","embedded-skills-map","executing-plans","fatfs-module","fft-module","firmware-sign","flash-idf","flash-jlink","flash-keil","flash-module","flash-openocd","flash-platformio","freertos-module","gang-flash","gps-module","i2c-bus","kb-datasheet","kb-import","kb-record","kb-verify","knowledge-base-search","linker-scatter","lora-module","lowpower-design","lvgl-module","map-analyzer","mcu-peripheral-registers","modbus-debug","motor-control","mqtt-module","ota-package","ota-update-system","peripheral-driver","rsa-module","rtos-debug","segger-rtt-module","serial-monitor","sfud-module","skills-system-builder","spi-bus","sram-module","static-analysis","stm32-hal-development","stm32-spl-development","timer-module","uart-module","usb-module","watchdog-module","wifi-module","workflow","workflow-guide","writing-plans","ymodem-module","deep-research","agent-orchestration","memory-layer","requirements-alignment","safety-layer","tool-layer","superpowers:using-superpowers","update-config","keybindings-help","verify","code-review","simplify","fewer-permission-prompts","loop","claude-api","run","init","review","security-review"
]);

function findAllSkillMd(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findAllSkillMd(fullPath));
      } else if (entry.isFile() && entry.name === 'SKILL.md') {
        results.push(fullPath);
      }
    }
  } catch (e) {}
  return results;
}

function getRelativePath(fullPath) {
  return path.relative(SKILLS_DIR, fullPath).replace(/\\/g, '/');
}

function getCategory(relPath) {
  if (relPath.includes('/engineering/') || relPath.startsWith('engineering/')) return 'engineering';
  if (relPath.includes('/productivity/') || relPath.startsWith('productivity/')) return 'productivity';
  if (relPath.includes('/misc/') || relPath.startsWith('misc/')) return 'misc';
  if (relPath.includes('/_archive/') || relPath.startsWith('_archive/')) return '_archive';
  return 'root';
}

function getSkillName(relPath) {
  return path.dirname(relPath).replace(/\\/g, '/').split('/').pop();
}

function parseFrontmatter(content) {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let dashCount = 0;
  let startIdx = 0, endIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      dashCount++;
      if (dashCount === 1) {
        startIdx = i + 1;
      } else if (dashCount === 2) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx <= startIdx) return {};

  const fmLines = lines.slice(startIdx, endIdx);
  const result = {};

  let i = 0;
  while (i < fmLines.length) {
    const line = fmLines[i];
    const trimmed = line.trim();

    // Skip empty and comment lines
    if (trimmed === '' || trimmed.startsWith('#')) { i++; continue; }

    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) { i++; continue; }

    const key = line.substring(0, colonIdx).trim();
    let rest = line.substring(colonIdx + 1).trim();

    // Check for block scalar indicator
    const blockMatch = rest.match(/^(\|[\-\+]?|>[\-\+]?)$/);
    if (blockMatch) {
      const indicator = blockMatch[1];
      const isLiteral = indicator.startsWith('|');
      const chomp = indicator.length > 1 ? indicator[1] : null; // null=clip, -=strip, +=keep

      // Collect block content lines
      let blockLines = [];
      let blockIndent = -1;
      i++;

      while (i < fmLines.length) {
        const bline = fmLines[i];
        const btrimmed = bline.trim();

        if (btrimmed === '' || btrimmed.startsWith('#')) {
          // Empty lines inside block preserve the block
          if (blockIndent >= 0) {
            blockLines.push('');
          } else {
            // Empty lines before any content are ignored
          }
          i++;
          continue;
        }

        const bspaces = bline.search(/\S/);
        if (blockIndent < 0) {
          // First content line sets the indent
          blockIndent = bspaces;
          blockLines.push(btrimmed);
          i++;
        } else if (bspaces >= blockIndent) {
          // Continuation of block
          blockLines.push(btrimmed);
          i++;
        } else {
          // End of block
          break;
        }
      }

      let value = blockLines.join(isLiteral ? '\n' : ' ');
      // Apply chomp indicator
      if (chomp === '-') {
        value = value.replace(/\n+$/, '');
      } else if (chomp !== '+') {
        // clip: single trailing newline
        value = value.replace(/\n+$/, '\n');
      }
      // Trim trailing whitespace on each line
      value = value.replace(/ +\n/g, '\n');
      result[key] = value;
      continue;
    }

    // Regular scalar value
    let value = rest;
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
    i++;
  }

  return result;
}

function getDescription(fm) {
  const desc = String(fm.description || '');
  const firstLine = desc.split('\n')[0].trim();
  if (firstLine.length > 80) return firstLine.substring(0, 80);
  return firstLine;
}

function getDependsOn(fm) {
  const val = fm.depends_on;
  if (!val) return [];
  const trimmed = String(val).trim();
  if (trimmed === '' || trimmed === '[]' || trimmed === '[]') return [];
  return trimmed.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

function getVersion(fm) {
  const v = fm.version;
  if (!v) return '';
  let s = String(v).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  // Extract just the version number if there's trailing text
  const verMatch = s.match(/(\d+\.\d+\.\d+)/);
  if (verMatch) return verMatch[1];
  return s;
}

function getSource(fm) {
  return fm.source || '';
}

function getName(fm, relPath) {
  return fm.name || getSkillName(relPath);
}

function getStatus(name, category) {
  if (category === '_archive') return 'archived';
  if (REGISTERED.has(name)) return 'registered';
  return 'orphaned';
}

const files = findAllSkillMd(SKILLS_DIR);
const skills = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const fm = parseFrontmatter(content);
  const relPath = getRelativePath(file);
  const name = getName(fm, relPath);
  const category = getCategory(relPath);

  skills.push({
    name: name,
    description: getDescription(fm),
    version: getVersion(fm),
    depends_on: getDependsOn(fm),
    source: getSource(fm),
    category: category,
    status: getStatus(name, category),
    path: relPath
  });
}

skills.sort((a, b) => a.name.localeCompare(b.name));

const total = skills.length;
let registered = 0, orphaned = 0, archived = 0;
for (const s of skills) {
  if (s.status === 'registered') registered++;
  else if (s.status === 'orphaned') orphaned++;
  else if (s.status === 'archived') archived++;
}

const result = { total, registered, orphaned, archived, skills };
console.log(JSON.stringify(result, null, 2));
