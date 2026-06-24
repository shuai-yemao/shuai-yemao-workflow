/**
 * 平台配置生成器
 *
 * 职责：
 * - 生成 GitHub Actions 配置
 * - 生成 GitLab CI 配置
 * - 生成 Jenkins 配置
 * - 生成本地 CI 脚本
 */

class ConfigGenerator {
  /**
   * 生成配置
   */
  generate(platform, options) {
    switch (platform) {
      case 'github-actions':
        return this.generateGitHubActions(options);
      case 'gitlab-ci':
        return this.generateGitLabCI(options);
      case 'jenkins':
        return this.generateJenkins(options);
      case 'local':
        return this.generateLocalCI(options);
      default:
        throw new Error(`不支持的平台: ${platform}`);
    }
  }

  /**
   * 生成 GitHub Actions 配置
   */
  generateGitHubActions(options) {
    const content = `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  BUILD_TYPE: Release
  TARGET: arm-none-eabi

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y gcc-arm-none-eabi cmake

      - name: Run unit tests
        run: |
          mkdir -p build/test
          cd build/test
          cmake ../..
          make
          ctest --output-on-failure

      - name: Check coverage
        run: |
          gcovr --root ../.. --print-summary

  quality:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3

      - name: Run static analysis
        run: |
          cppcheck --enable=all --error-exitcode=1 src/

      - name: Check code style
        run: |
          clang-format --dry-run --Werror src/**/*.c

  build:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v3

      - name: Build firmware
        run: |
          mkdir -p build/release
          cd build/release
          cmake -DCMAKE_BUILD_TYPE=Release ../..
          make

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: firmware
          path: build/release/output/

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: firmware

      - name: Deploy
        run: |
          echo "Deploying firmware..."
`;

    return {
      filename: 'ci.yml',
      content,
      platform: 'github-actions'
    };
  }

  /**
   * 生成 GitLab CI 配置
   */
  generateGitLabCI(options) {
    const content = `stages:
  - test
  - quality
  - build
  - deploy

variables:
  BUILD_TYPE: "Release"

unit-test:
  stage: test
  image: gcc:latest
  script:
    - mkdir -p build/test && cd build/test
    - cmake ../..
    - make
    - ctest --output-on-failure
  coverage: '/Total\\s*:\\s*(\\d+\\.\\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: build/test/coverage.xml

code-quality:
  stage: quality
  image: cppcheck:latest
  script:
    - cppcheck --enable=all --error-exitcode=1 src/
  allow_failure: false

build:
  stage: build
  image: gcc-arm-none-eabi:latest
  script:
    - mkdir -p build/release && cd build/release
    - cmake -DCMAKE_BUILD_TYPE=Release ../..
    - make
  artifacts:
    paths:
      - build/release/output/
    expire_in: 1 week

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - echo "Deploying firmware..."
  only:
    - main
  when: manual
`;

    return {
      filename: '.gitlab-ci.yml',
      content,
      platform: 'gitlab-ci'
    };
  }

  /**
   * 生成 Jenkins 配置
   */
  generateJenkins(options) {
    const content = `pipeline {
    agent any

    environment {
        BUILD_TYPE = 'Release'
        TOOLCHAIN = '/usr/bin/arm-none-eabi-gcc'
    }

    stages {
        stage('Test') {
            steps {
                sh '''
                    mkdir -p build/test
                    cd build/test
                    cmake ../..
                    make
                    ctest --output-on-failure
                '''
            }
        }

        stage('Quality') {
            steps {
                sh '''
                    cppcheck --enable=all --error-exitcode=1 src/
                    clang-format --dry-run --Werror src/**/*.c
                '''
            }
        }

        stage('Build') {
            steps {
                sh '''
                    mkdir -p build/release
                    cd build/release
                    cmake -DCMAKE_BUILD_TYPE=Release ../..
                    make
                '''
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo 'Deploying firmware...'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'build/release/output/**', allowEmptyArchive: true
        }
    }
}
`;

    return {
      filename: 'Jenkinsfile',
      content,
      platform: 'jenkins'
    };
  }

  /**
   * 生成本地 CI 脚本
   */
  generateLocalCI(options) {
    const content = `#!/bin/bash

# 本地 CI/CD 脚本
set -e

echo "🚀 开始执行 CI/CD 流水线..."

# 测试
echo "🧪 执行单元测试..."
mkdir -p build/test
cd build/test
cmake ../..
make
ctest --output-on-failure
cd ../..

# 代码质量
echo "📊 执行代码质量检查..."
cppcheck --enable=all --error-exitcode=1 src/

# 构建
echo "🔨 构建固件..."
mkdir -p build/release
cd build/release
cmake -DCMAKE_BUILD_TYPE=Release ../..
make

echo "✅ CI/CD 流水线执行完成!"
`;

    return {
      filename: 'ci.sh',
      content,
      platform: 'local'
    };
  }
}

module.exports = ConfigGenerator;
