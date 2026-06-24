/**
 * HTML 生成模块
 * 用于生成产品宣传页面、演示文稿、动态展示等
 */

const fs = require('fs');
const path = require('path');

class HtmlGenerator {
  constructor(options = {}) {
    this.options = options;
    this.templates = this.initTemplates();
  }

  initTemplates() {
    return {
      presentation: this.getPresentationTemplate(),
      productPage: this.getProductPageTemplate(),
      dashboard: this.getDashboardTemplate(),
      report: this.getReportTemplate()
    };
  }

  async execute(config) {
    const { outputDir, inputData, type, projectName } = config;
    console.log('  [HtmlGenerator] 开始生成 HTML...');

    let html;

    switch (type) {
      case 'presentation':
        html = this.generatePresentation(inputData);
        break;
      case 'product':
        html = this.generateProductPage(inputData);
        break;
      case 'dashboard':
        html = this.generateDashboard(inputData);
        break;
      case 'report':
        html = this.generateReport(inputData);
        break;
      default:
        html = this.generatePresentation(inputData);
    }

    // 保存输出
    const fileName = `${projectName || type || 'output'}-${Date.now()}`;
    this.saveOutput(outputDir, html, fileName);

    console.log('  [HtmlGenerator] 完成');
    return { success: true, html, fileName };
  }

  // ==================== 演示文稿 ====================

  generatePresentation(data) {
    const { title, slides, author, date } = data;

    let html = this.templates.presentation
      .replace('{{TITLE}}', title || '产品演示')
      .replace('{{AUTHOR}}', author || '')
      .replace('{{DATE}}', date || new Date().toLocaleDateString('zh-CN'));

    // 生成幻灯片内容
    let slidesHtml = '';
    if (slides) {
      slides.forEach((slide, index) => {
        slidesHtml += this.generateSlide(slide, index);
      });
    }
    html = html.replace('{{SLIDES}}', slidesHtml);

    return html;
  }

  generateSlide(slide, index) {
    const { title, content, type, image, bullets, chart } = slide;

    let slideHtml = `<section class="slide" ${index === 0 ? 'class="active"' : ''}>`;
    slideHtml += `<div class="slide-content">`;

    if (title) {
      slideHtml += `<h2>${title}</h2>`;
    }

    if (type === 'bullets' && bullets) {
      slideHtml += `<ul>`;
      bullets.forEach(bullet => {
        slideHtml += `<li>${bullet}</li>`;
      });
      slideHtml += `</ul>`;
    } else if (type === 'image' && image) {
      slideHtml += `<img src="${image}" alt="${title || ''}" class="slide-image">`;
    } else if (type === 'chart' && chart) {
      slideHtml += `<div class="chart-container" data-chart='${JSON.stringify(chart)}'></div>`;
    } else if (content) {
      slideHtml += `<div class="content">${content}</div>`;
    }

    slideHtml += `</div></section>`;
    return slideHtml;
  }

  // ==================== 产品宣传页 ====================

  generateProductPage(data) {
    const { title, features, specs, images, cta } = data;

    let html = this.templates.productPage
      .replace('{{TITLE}}', title || '产品介绍');

    // 生成特性部分
    let featuresHtml = '';
    if (features) {
      featuresHtml = '<div class="features">';
      features.forEach(feature => {
        featuresHtml += `
          <div class="feature-card">
            <div class="feature-icon">${feature.icon || '✨'}</div>
            <h3>${feature.title}</h3>
            <p>${feature.description}</p>
          </div>`;
      });
      featuresHtml += '</div>';
    }
    html = html.replace('{{FEATURES}}', featuresHtml);

    // 生成规格部分
    let specsHtml = '';
    if (specs) {
      specsHtml = '<table class="specs-table">';
      specs.forEach(spec => {
        specsHtml += `<tr><td>${spec.label}</td><td>${spec.value}</td></tr>`;
      });
      specsHtml += '</table>';
    }
    html = html.replace('{{SPECS}}', specsHtml);

    return html;
  }

  // ==================== 仪表盘 ====================

  generateDashboard(data) {
    const { title, widgets, charts, stats } = data;

    let html = this.templates.dashboard
      .replace('{{TITLE}}', title || '数据仪表盘');

    // 生成统计卡片
    let statsHtml = '';
    if (stats) {
      statsHtml = '<div class="stats-grid">';
      stats.forEach(stat => {
        statsHtml += `
          <div class="stat-card">
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
            ${stat.trend ? `<div class="stat-trend ${stat.trend > 0 ? 'up' : 'down'}">${stat.trend > 0 ? '↑' : '↓'} ${Math.abs(stat.trend)}%</div>` : ''}
          </div>`;
      });
      statsHtml += '</div>';
    }
    html = html.replace('{{STATS}}', statsHtml);

    return html;
  }

  // ==================== 报告 ====================

  generateReport(data) {
    const { title, sections, author, date } = data;

    let html = this.templates.report
      .replace('{{TITLE}}', title || '项目报告')
      .replace('{{AUTHOR}}', author || '')
      .replace('{{DATE}}', date || new Date().toLocaleDateString('zh-CN'));

    // 生成章节
    let sectionsHtml = '';
    if (sections) {
      sections.forEach(section => {
        sectionsHtml += `
          <div class="section">
            <h2>${section.title}</h2>
            <div class="section-content">${section.content}</div>
          </div>`;
      });
    }
    html = html.replace('{{SECTIONS}}', sectionsHtml);

    return html;
  }

  // ==================== 模板 ====================

  getPresentationTemplate() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft YaHei', sans-serif; background: #1a1a2e; color: #fff; }
        .presentation { width: 100vw; height: 100vh; overflow: hidden; }
        .slide { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; padding: 60px; }
        .slide-content { max-width: 1200px; text-align: center; }
        .slide h2 { font-size: 3em; margin-bottom: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .slide ul { text-align: left; font-size: 1.8em; line-height: 2; }
        .slide li { margin-bottom: 20px; }
        .slide-image { max-width: 80%; max-height: 60vh; border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        .controls { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 20px; }
        .controls button { padding: 15px 30px; font-size: 1.2em; border: none; border-radius: 5px; cursor: pointer; background: #667eea; color: #fff; }
        .controls button:hover { background: #764ba2; }
        .progress { position: fixed; bottom: 0; left: 0; height: 5px; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s; }
    </style>
</head>
<body>
    <div class="presentation">
        {{SLIDES}}
    </div>
    <div class="controls">
        <button onclick="prevSlide()">上一页</button>
        <button onclick="nextSlide()">下一页</button>
    </div>
    <div class="progress" id="progress"></div>

    <script>
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        const totalSlides = slides.length;

        function showSlide(n) {
            slides.forEach(s => s.style.display = 'none');
            slides[n].style.display = 'flex';
            document.getElementById('progress').style.width = ((n + 1) / totalSlides * 100) + '%';
        }

        function nextSlide() {
            if (currentSlide < totalSlides - 1) {
                currentSlide++;
                showSlide(currentSlide);
            }
        }

        function prevSlide() {
            if (currentSlide > 0) {
                currentSlide--;
                showSlide(currentSlide);
            }
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
        });

        showSlide(0);
    </script>
</body>
</html>`;
  }

  getProductPageTemplate() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft YaHei', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .hero { text-align: center; padding: 100px 20px; color: #fff; }
        .hero h1 { font-size: 4em; margin-bottom: 20px; }
        .hero p { font-size: 1.5em; opacity: 0.9; }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; padding: 60px; max-width: 1400px; margin: 0 auto; }
        .feature-card { background: #fff; border-radius: 15px; padding: 40px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2); transition: transform 0.3s; }
        .feature-card:hover { transform: translateY(-10px); }
        .feature-icon { font-size: 3em; margin-bottom: 20px; }
        .feature-card h3 { font-size: 1.5em; margin-bottom: 15px; color: #333; }
        .feature-card p { color: #666; line-height: 1.6; }
        .specs { background: #fff; padding: 60px; max-width: 800px; margin: 0 auto; border-radius: 15px; }
        .specs-table { width: 100%; border-collapse: collapse; }
        .specs-table td { padding: 15px; border-bottom: 1px solid #eee; }
        .specs-table td:first-child { font-weight: bold; color: #667eea; }
    </style>
</head>
<body>
    <section class="hero">
        <h1>{{TITLE}}</h1>
        <p>重新定义智能体验</p>
    </section>
    <section class="features">
        {{FEATURES}}
    </section>
    <section class="specs">
        <h2 style="text-align:center;margin-bottom:30px;color:#333;">技术规格</h2>
        {{SPECS}}
    </section>
</body>
</html>`;
  }

  getDashboardTemplate() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft YaHei', sans-serif; background: #f5f7fa; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 30px 60px; }
        .header h1 { font-size: 2em; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; padding: 40px 60px; }
        .stat-card { background: #fff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .stat-value { font-size: 2.5em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 10px; }
        .stat-trend { margin-top: 10px; font-size: 0.9em; }
        .stat-trend.up { color: #4caf50; }
        .stat-trend.down { color: #f44336; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{TITLE}}</h1>
    </div>
    {{STATS}}
</body>
</html>`;
  }

  getReportTemplate() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft YaHei', sans-serif; background: #fff; color: #333; line-height: 1.8; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 60px; text-align: center; }
        .header h1 { font-size: 3em; margin-bottom: 20px; }
        .header p { opacity: 0.9; }
        .content { max-width: 1000px; margin: 0 auto; padding: 60px; }
        .section { margin-bottom: 50px; }
        .section h2 { font-size: 1.8em; color: #667eea; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
        .section-content { font-size: 1.1em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{TITLE}}</h1>
        <p>作者: {{AUTHOR}} | 日期: {{DATE}}</p>
    </div>
    <div class="content">
        {{SECTIONS}}
    </div>
</body>
</html>`;
  }

  saveOutput(outputDir, html, fileName) {
    const dirPath = path.join(outputDir, '00_Project_Management', '00_需求导入_QFD');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(path.join(dirPath, `${fileName}.html`), html, 'utf8');
  }
}

module.exports = HtmlGenerator;
