/**
 * Backlog 管理器
 *
 * 职责：
 * - 管理 Sprint Backlog
 * - 追踪任务状态
 * - 持久化存储
 */

const fs = require('fs');
const path = require('path');

class BacklogManager {
  constructor(storageDir = null) {
    this.storageDir = storageDir || path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'scrum-data');
    this.ensureStorageDir();
  }

  /**
   * 确保存储目录存在
   */
  ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * 保存 Sprint Backlog
   */
  saveSprintBacklog(sprintNumber, backlog) {
    const filePath = this.getBacklogPath(sprintNumber);
    fs.writeFileSync(filePath, JSON.stringify(backlog, null, 2), 'utf-8');
    console.log(`   💾 Backlog 已保存: ${filePath}`);
  }

  /**
   * 获取 Sprint Backlog
   */
  getSprintBacklog(sprintNumber) {
    const filePath = this.getBacklogPath(sprintNumber);

    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️ 未找到 Sprint ${sprintNumber} 的 Backlog`);
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 更新 Backlog 状态
   */
  updateBacklogStatus(sprintNumber, taskUpdates) {
    const backlog = this.getSprintBacklog(sprintNumber);

    if (!backlog) {
      console.log(`   ⚠️ 无法更新：Sprint ${sprintNumber} 的 Backlog 不存在`);
      return false;
    }

    // 应用更新
    taskUpdates.forEach(update => {
      const task = backlog.tasks.find(t => t.id === update.taskId);
      if (task) {
        task.status = update.newStatus;
        task.lastUpdated = new Date().toISOString();
        task.updatedBy = update.updatedBy;
      }
    });

    // 保存更新后的 backlog
    this.saveSprintBacklog(sprintNumber, backlog);
    return true;
  }

  /**
   * 添加任务到 Backlog
   */
  addTask(sprintNumber, task) {
    const backlog = this.getSprintBacklog(sprintNumber);

    if (!backlog) {
      console.log(`   ⚠️ 无法添加任务：Sprint ${sprintNumber} 的 Backlog 不存在`);
      return false;
    }

    // 生成任务 ID
    if (!task.id) {
      task.id = `TASK-${Date.now()}`;
    }

    task.createdAt = new Date().toISOString();
    task.status = task.status || 'todo';

    backlog.tasks.push(task);
    this.saveSprintBacklog(sprintNumber, backlog);

    return true;
  }

  /**
   * 从 Backlog 移除任务
   */
  removeTask(sprintNumber, taskId) {
    const backlog = this.getSprintBacklog(sprintNumber);

    if (!backlog) {
      return false;
    }

    const initialLength = backlog.tasks.length;
    backlog.tasks = backlog.tasks.filter(t => t.id !== taskId);

    if (backlog.tasks.length < initialLength) {
      this.saveSprintBacklog(sprintNumber, backlog);
      return true;
    }

    return false;
  }

  /**
   * 获取 Backlog 统计
   */
  getBacklogStats(sprintNumber) {
    const backlog = this.getSprintBacklog(sprintNumber);

    if (!backlog) {
      return null;
    }

    const tasks = backlog.tasks || [];

    return {
      totalTasks: tasks.length,
      todoTasks: tasks.filter(t => t.status === 'todo').length,
      inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      blockedTasks: tasks.filter(t => t.status === 'blocked').length,
      totalStoryPoints: tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
      completedStoryPoints: tasks
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    };
  }

  /**
   * 获取所有 Sprint 列表
   */
  listSprints() {
    const files = fs.readdirSync(this.storageDir);
    const sprintFiles = files.filter(f => f.startsWith('sprint-') && f.endsWith('-backlog.json'));

    return sprintFiles.map(f => {
      const match = f.match(/sprint-(\d+)-backlog\.json/);
      return match ? parseInt(match[1]) : null;
    }).filter(Boolean).sort((a, b) => a - b);
  }

  /**
   * 删除 Sprint Backlog
   */
  deleteSprintBacklog(sprintNumber) {
    const filePath = this.getBacklogPath(sprintNumber);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }

    return false;
  }

  /**
   * 获取 Backlog 文件路径
   */
  getBacklogPath(sprintNumber) {
    return path.join(this.storageDir, `sprint-${sprintNumber}-backlog.json`);
  }

  /**
   * 导出 Backlog 为 Markdown
   */
  exportToMarkdown(sprintNumber) {
    const backlog = this.getSprintBacklog(sprintNumber);

    if (!backlog) {
      return null;
    }

    const lines = [
      `# Sprint ${sprintNumber} Backlog`,
      '',
      `**目标**: ${backlog.sprintGoal || '未定义'}`,
      '',
      `**开始日期**: ${backlog.startDate || '未定义'}`,
      '',
      `**结束日期**: ${backlog.endDate || '未定义'}`,
      '',
      '## 任务列表',
      '',
      '| ID | 标题 | 故事点 | 状态 | 负责人 |',
      '|----|------|--------|------|--------|',
    ];

    (backlog.tasks || []).forEach(task => {
      lines.push(
        `| ${task.id} | ${task.title} | ${task.storyPoints || '-'} | ${task.status} | ${task.assignee || '-'} |`
      );
    });

    return lines.join('\n');
  }
}

module.exports = BacklogManager;
