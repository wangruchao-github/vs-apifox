# 更新日志

所有重要的更改都将记录在此文件中。

## [3.0.0] - 2026-03-16

### 新增功能

- **支持嵌套泛型类型解析**：支持解析 `ApiResponse<PageResponse<User>>` 等多层嵌套泛型结构
- **智能注释提取**：优先识别 Javadoc 注释，过滤分隔线注释（如 `// ========...`）
- **方法名智能描述生成**：当方法没有注释时，自动根据方法名生成中文描述（如 `getUserById` → "获取用户ById"）
- **支持任意泛型包装类**：不仅限于预定义的 `ApiResponse`、`Result` 等，支持任意自定义泛型类

### 修复问题

- **@apiFolder 注解识别**：修复类注释中 `@apiFolder` 未正确提取的问题
- **接口名称识别异常**：修复取到分隔线注释而非实际方法注释的问题
- **@RequestBody 泛型参数**：修复 `@RequestBody List<Long>` 等集合类型未正确识别的问题
- **响应数据结构识别**：修复响应体中的泛型类型未正确解析的问题
- **Integer/Long 类型映射**：修复 `Integer`、`Long` 等包装类型被错误识别为 `object` 的问题，现正确映射为 `integer`
- **User 模型字段类型**：修复模型中的 `Integer` 字段（如 `age`）在 Apifox 中显示为 `object` 的问题

### 改进优化

- 重构 `CommentListener` 注释解析逻辑，提高注释提取准确性
- 优化 `parseRequestBodySchema` 方法，支持递归解析嵌套类型
- 优化 `parseResponseSchema` 方法，支持任意泛型包装类
- 新增 `generateGenericWrapperSchema` 方法，动态生成泛型包装类的 OpenAPI Schema
- 新增 `getCommonWrapperFields` 方法，支持常见响应包装类的字段定义

## [2.0.0] - 2025-XX-XX

### 新增功能

- 使用 ANTLR4 重构 Java 解析器
- 支持 Spring Boot 注解解析
- 支持 OpenAPI 3.0.1 文档生成
- 支持一键同步到 Apifox 平台
- 侧边栏 API 列表视图
- 支持搜索和分类功能

## [1.0.0] - 初始版本

- 基础 API 解析功能