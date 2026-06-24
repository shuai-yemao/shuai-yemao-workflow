/**
 * 追踪管理模块
 * 用于追踪认证进度和证书状态
 */

const fs = require('fs');
const path = require('path');
const CertificationManager = require('../utils/certification-manager');

class TrackingManagement {
  constructor(options = {}) {
    this.options = options;
    this.manager = new CertificationManager();
  }

  async execute(config) {
    const { outputDir, inputData } = config;
    console.log('  [TrackingManagement] 开始追踪管理...');

    this.validateInput(inputData);
    const tracking = this.trackProgress(inputData);
    const markdown = this.generateMarkdown(tracking, inputData.product);
    const output = { product: inputData.product, tracking, summary: this.generateSummary(tracking) };

    this.saveOutput(outputDir, output, markdown);
    console.log(`  [TrackingManagement] 完成，追踪了 ${tracking.certifications.length} 个认证`);

    return { success: true, tracking, summary: output.summary, markdown };
  }

  validateInput(inputData) {
    if (!inputData.product) throw new Error('Product information is required');
    if (!inputData.certifications || !Array.isArray(inputData.certifications)) throw new Error('Certifications array is required');
  }

  trackProgress(inputData) {
    const certifications = inputData.certifications.map(cert => {
      const progress = this.calculateProgress(cert);
      const isOverdue = this.checkOverdue(cert);
      const daysRemaining = this.calculateDaysRemaining(cert.targetDate);
      const expiringSoon = this.checkExpiringSoon(cert);

      return { ...cert, progress, isOverdue, daysRemaining, expiringSoon, lastUpdate: new Date().toISOString() };
    });

    return { certifications, summary: this.generateTrackingSummary(certifications) };
  }

  calculateProgress(cert) {
    const statusProgress = { 'planned': 0, 'in-progress': 50, 'obtained': 100, 'expired': 100, 'suspended': 50 };
    return cert.progress || statusProgress[cert.status] || 0;
  }

  checkOverdue(cert) {
    if (!cert.targetDate || cert.status === 'obtained') return false;
    return new Date() > new Date(cert.targetDate);
  }

  calculateDaysRemaining(targetDate) {
    if (!targetDate) return null;
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  checkExpiringSoon(cert) {
    if (!cert.expiryDate || cert.status !== 'obtained') return false;
    const daysUntilExpiry = this.calculateDaysRemaining(cert.expiryDate);
    return daysUntilExpiry !== null && daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  }

  generateTrackingSummary(certifications) {
    return {
      total: certifications.length,
      byStatus: {
        planned: certifications.filter(c => c.status === 'planned').length,
        'in-progress': certifications.filter(c => c.status === 'in-progress').length,
        obtained: certifications.filter(c => c.status === 'obtained').length,
        expired: certifications.filter(c => c.status === 'expired').length
      },
      overdue: certifications.filter(c => c.isOverdue).length,
      expiringSoon: certifications.filter(c => c.expiringSoon).length,
      averageProgress: certifications.length > 0 ? Math.round(certifications.reduce((sum, c) => sum + c.progress, 0) / certifications.length) : 0
    };
  }

  generateSummary(tracking) { return tracking.summary; }

  generateMarkdown(tracking, product) {
    const summary = tracking.summary;
    let md = `# 认证追踪报告\n\n**产品**: ${product.name} (${product.id})\n**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;

    md += `## 追踪概览\n\n| 指标 | 值 |\n|------|----|\n`;
    md += `| 总认证数 | ${summary.total} |\n`;
    md += `| 待执行 | ${summary.byStatus.planned} |\n`;
    md += `| 执行中 | ${summary.byStatus['in-progress']} |\n`;
    md += `| 已获得 | ${summary.byStatus.obtained} |\n`;
    md += `| 已过期 | ${summary.byStatus.expired} |\n`;
    md += `| 逾期 | ${summary.overdue} |\n`;
    md += `| 即将过期 | ${summary.expiringSoon} |\n`;
    md += `| 平均进度 | ${summary.averageProgress}% |\n\n`;

    // 逾期认证
    const overdueCerts = tracking.certifications.filter(c => c.isOverdue);
    if (overdueCerts.length > 0) {
      md += `## ⚠️ 逾期认证\n\n| 认证名称 | 地区 | 目标日期 | 逾期天数 |\n|----------|------|----------|----------|\n`;
      for (const cert of overdueCerts) { md += `| ${cert.regulationName} | ${cert.region} | ${cert.targetDate} | ${Math.abs(cert.daysRemaining)} 天 |\n`; }
      md += `\n`;
    }

    // 即将过期
    const expiringCerts = tracking.certifications.filter(c => c.expiringSoon);
    if (expiringCerts.length > 0) {
      md += `## ⏰ 即将过期认证\n\n| 认证名称 | 地区 | 过期日期 | 剩余天数 |\n|----------|------|----------|----------|\n`;
      for (const cert of expiringCerts) { md += `| ${cert.regulationName} | ${cert.region} | ${cert.expiryDate} | ${cert.daysRemaining} 天 |\n`; }
      md += `\n`;
    }

    // 所有认证状态
    md += `## 认证状态\n\n| 认证名称 | 地区 | 状态 | 进度 | 目标日期 |\n|----------|------|------|------|----------|\n`;
    for (const cert of tracking.certifications) {
      const statusIcon = cert.status === 'obtained' ? '✅' : cert.status === 'in-progress' ? '🔄' : cert.status === 'expired' ? '❌' : '⏳';
      md += `| ${cert.regulationName} | ${cert.region} | ${statusIcon} ${cert.status} | ${cert.progress}% | ${cert.targetDate || '-'} |\n`;
    }

    return md;
  }

  saveOutput(outputDir, output, markdown) {
    const dirPath = path.join(outputDir, '00_Project_Management/04_法规认证', 'tracking-management');
    if (!fs.existsSync(dirPath)) { fs.mkdirSync(dirPath, { recursive: true }); }
    fs.writeFileSync(path.join(dirPath, 'tracking-status.json'), JSON.stringify(output, null, 2), 'utf8');
    fs.writeFileSync(path.join(dirPath, 'tracking-report.md'), markdown, 'utf8');
  }
}

module.exports = TrackingManagement;
