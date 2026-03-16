# VS Code 扩展调试指南

## 问题诊断和解决方案

### 1. 确保VS Code已正确安装
- 确认您使用的是Visual Studio Code（不是其他编辑器）
- 扩展开发需要VS Code，不能在其他编辑器中调试

### 2. 调试步骤

#### 方法一：使用F5调试
1. 在VS Code中打开项目文件夹：`/Volumes/work/code/github/vs-apifox`
2. 按 `F5` 键
3. 如果出现错误，查看"调试控制台"中的错误信息

#### 方法二：使用命令面板
1. 按 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
2. 输入 "Debug: Start Debugging"
3. 选择 "Run Extension" 配置

#### 方法三：使用侧边栏
1. 点击左侧活动栏的"运行和调试"图标（三角形图标）
2. 在顶部下拉菜单中选择 "Run Extension"
3. 点击绿色的播放按钮

### 3. 常见问题解决

#### 问题1：找不到调试配置
- 解决方案：已创建 `.vscode/launch.json` 文件

#### 问题2：编译错误
- 运行：`npm run compile`
- 检查 `out/` 目录是否有编译输出

#### 问题3：扩展无法激活
- 检查 `package.json` 中的 `activationEvents`
- 当前配置：`"onStartupFinished"`

#### 问题4：权限问题
- 确保VS Code有读取项目文件的权限
- 在macOS上，可能需要给VS Code完全磁盘访问权限

### 4. 验证扩展是否正常工作

调试启动后，会打开一个新的VS Code窗口（扩展开发主机），您应该能看到：

1. **侧边栏**：左侧活动栏应该有"Spring API Helper"图标
2. **命令面板**：按 `Ctrl+Shift+P`，输入 "Spring API Helper" 应该看到相关命令
3. **开发者控制台**：按 `Ctrl+Shift+I` 打开开发者工具查看日志

### 5. 调试技巧

- 在代码中设置断点
- 使用 `console.log()` 输出调试信息
- 查看VS Code开发者控制台的错误信息
- 使用 `Ctrl+R` 重新加载扩展

### 6. 如果仍然无法调试

请提供以下信息：
1. VS Code版本号
2. 操作系统版本
3. 具体的错误信息（从调试控制台复制）
4. 是否能看到"运行和调试"面板
