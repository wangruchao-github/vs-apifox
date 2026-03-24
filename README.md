# VS Apifox Helper

一个用于解析 Java Web 接口并生成 OpenAPI 文档的 VS Code 插件，支持 Spring MVC 以及 JBoss 常见的 JAX-RS 注解，并可一键同步到 Apifox 平台。

## 功能特性

- 自动解析 Spring MVC Controller 和 JAX-RS Resource 中的 API 接口
- 支持 `@GetMapping`、`@PostMapping`、`@PutMapping`、`@DeleteMapping`、`@RequestMapping` 等注解
- 支持 JAX-RS/JBoss 常见的 `@Path`、`@GET`、`@POST`、`@PUT`、`@DELETE` 注解
- 自动提取 `@PathVariable`、`@RequestParam`、`@RequestBody` 参数信息
- 自动提取 `@PathParam`、`@QueryParam` 参数信息
- 生成 OpenAPI 3.0.1 规范文档
- 一键同步 API 文档到 Apifox 平台
- 侧边栏 API 列表视图，支持搜索和分类
- 支持跳转到 API 定义位置

## 安装

### 从 VS Code 插件市场安装

在 VS Code 插件市场搜索 `wangrc.vs-apifox-helper` 并安装。

### 从源码安装

```bash
# 克隆项目
git clone https://github.com/wangruchao-github/vs-apifox.git
cd vs-apifox

# 安装依赖
npm install

# 编译
npm run compile

# 打包为 .vsix 文件
npm run package

# 手动安装 .vsix 文件
# 在 VS Code 中按 Ctrl+Shift+P，输入 "Extensions: Install from VSIX..."
```

## 开发调试

```bash
# 安装依赖
npm install

# 编译项目
npm run compile

# 监听模式（开发时使用）
npm run watch
```

在 VS Code 中按 `F5` 启动调试，将打开一个新的扩展开发主机窗口加载插件。

## 使用教程

### 1. 配置 Apifox

首次使用需要配置 Apifox 的 API Key 和项目信息：

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 `Spring API Helper: 配置Apifox`
3. 按提示输入：
   - **API Key**: 在 Apifox 个人设置中获取
   - **项目 ID**: Apifox 项目的 ID
   - **项目名称**: 自定义项目名称

配置将保存在工作区根目录的 `.spring-api-helper.json` 文件中。

```json
{
  "apiKey": "",
  "projectId": "",
  "projectName": ""
}
```

### 2. 查看 API 列表

插件激活后，左侧活动栏会出现 Spring API Helper 图标，点击可查看当前工作区所有解析到的 API 接口。

- 接口按 `@apiFolder` 注解分组显示
- 支持搜索功能（搜索路径、方法、描述）
- 点击接口可跳转到代码定义位置

### 3. 上传 API 文档到 Apifox

**方式一：上传全部接口**

1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 `Spring API Helper: 上传API文档到Apifox`
3. 等待上传完成

**方式二：选择性同步**

1. 在左侧 API 列表中，点击接口前的选择按钮选中需要同步的接口
2. 点击列表顶部的同步按钮（云上传图标）
3. 等待同步完成

### 4. API 分组注解

在 Controller 类上添加 `@apiFolder` 注释来为 API 分组：

```java
/**
 * @apiFolder 用户管理
 */
@RestController
@RequestMapping("/api/users")
public class UserController {
    // ...
}
```

### 5. API 描述注释

在方法上添加注释，将作为 API 的描述信息：

```java
/**
 * 根据ID获取用户信息
 */
@GetMapping("/{id}")
public User getUserById(@PathVariable Long id) {
    // ...
}
```

## 支持的注解

### 类级别注解

- `@RestController` - 标识为控制器类
- `@Controller` - 标识为控制器类
- `@RequestMapping` - 类级别的基础路径
- `@Path` - JAX-RS 资源类基础路径

### 方法级别注解

- `@GetMapping`
- `@PostMapping`
- `@PutMapping`
- `@DeleteMapping`
- `@RequestMapping`
- `@GET`
- `@POST`
- `@PUT`
- `@DELETE`
- `@Path`

### 参数注解

- `@PathVariable` - 路径参数
- `@RequestParam` - 查询参数
- `@RequestBody` - 请求体
- `@PathParam` - JAX-RS 路径参数
- `@QueryParam` - JAX-RS 查询参数

## 命令列表

| 命令 | 说明 |
|------|------|
| `spring-api-helper.generateDocs` | 生成 API 文档 |
| `spring-api-helper.uploadApiDocs` | 上传 API 文档到 Apifox |
| `spring-api-helper.configureApifox` | 配置 Apifox |
| `spring-api-helper.refreshApiList` | 刷新 API 列表 |
| `spring-api-helper.searchApi` | 搜索 API |
| `spring-api-helper.syncSelectedApis` | 同步选中的接口 |
| `spring-api-helper.gotoDefinition` | 跳转到定义 |

## 项目结构

```
src/
├── extension.ts              # 插件入口
├── parser/                   # Java 解析器（ANTLR4）
│   ├── SpringControllerParser.ts
│   ├── SpringControllerListener.ts
│   └── ...
├── providers/                # VS Code 提供器
│   ├── ApiTreeProvider.ts    # 侧边栏树视图
│   └── ApiDocumentProvider.ts
├── services/                 # 服务层
│   ├── ApifoxService.ts      # Apifox API 调用
│   └── ConfigService.ts      # 配置管理
├── converters/               # 格式转换器
│   └── OpenAPIConverter.ts   # OpenAPI 转换
└── types/                    # 类型定义
    └── index.ts
```

## 许可证

MIT License
