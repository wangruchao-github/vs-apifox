以下是为开发类似Apifox Helper的VS Code插件设计的详细提示词和功能清单，结合Cursor的AI编码能力可实现高效开发：

---

### 一、功能需求清单（优先级排序）
#### 核心功能模块
1. **智能API文档生成**
   - 自动识别`@RequestMapping`/`@GetMapping`等注解
   - 支持Swagger/OpenAPI 3.0规范生成
   - 一键导出Markdown/HTML文档
   - 实时文档预览侧边栏

2. **API调试增强**
   - 在代码旁显示`Send Request`按钮
   - 自动生成CURL/Python/JavaScript请求代码
   - 响应结果格式化展示（JSON/XML高亮）
   - 环境变量管理（开发/测试/生产）

3. **智能Mock服务**
   - 根据DTO自动生成Mock规则
   - 内置Mock服务器（支持动态端口）
   - 自定义响应延迟和状态码
   - 支持正则表达式生成测试数据

4. **代码智能增强**
   - 自动补全Spring注解参数
   - 快速生成DTO/VO类模板
   - 校验注解自动生成（@NotBlank/@Pattern）
   - 接口版本差异对比

#### 高级集成功能
5. **云平台同步**
   - 一键同步到Apifox/Postman
   - 自动生成OpenAPI Spec文件
   - 团队协作时差异对比

6. **安全增强**
   - JWT令牌自动注入
   - 敏感参数自动脱敏
   - OAuth2.0流程可视化

---

### 二、AI提示词库（Cursor专用）
#### 1. 核心功能实现提示词
```markdown
@ AI: 我需要创建一个VS Code插件，主要功能包括：
1. 自动解析Spring Controller生成API文档
2. 在编辑器内直接发送HTTP请求
3. 根据Java类生成Mock数据规则
请按照以下步骤生成代码框架：
- 先创建package.json基础配置
- 实现AST解析器获取接口信息
- 添加Webview面板用于文档展示
```

#### 2. 具体模块实现提示
**AST解析器开发：**
```typescript
// 请用TypeScript编写解析Spring注解的AST遍历逻辑，要求：
// 1. 识别@RestController类
// 2. 提取@RequestMapping及其子注解
// 3. 收集方法参数中的@RequestBody等信息
// 输出结构为：{path:string, method:string, params:[]}
```

**Mock数据生成：**
```javascript
/* 根据以下Java DTO生成JS Mock规则：
@Data
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    @Pattern(regexp = "^1\\d{10}$")
    private String phone;
}
要求：
- id使用递增数字
- username用随机中文名
- email符合常见格式
- phone符合正则验证
*/
```

**请求面板开发：**
```typescript
// 创建可交互的请求面板组件，包含：
// - 动态参数表格（支持键值对/Cookie/Header）
// - 请求体编辑器（JSON/XML切换）
// - 历史记录存储功能
// 使用VS Code Webview API实现
```

#### 3. 调试优化提示词
```markdown
@ AI: 当前插件在解析嵌套的@RequestMapping时遇到路径拼接错误，请分析以下代码并提出解决方案：
// 示例Controller代码
@RestController
@RequestMapping("/api/v1")
public class UserController {
    @PostMapping("/users")
    public User createUser(@RequestBody User user) {
        // ...
    }
}
// 当前生成的路径是/users而不是/api/v1/users
```

---

### 三、技术实现路线图
#### 第一阶段（核心MVP）
1. **插件脚手架搭建**
   ```bash
   npm install -g yo generator-code
   yo code
   ```
   - 选择TypeScript模板
   - 集成Webpack打包

2. **AST解析器开发**
   - 使用TypeScript AST解析库
   - 示例代码：
     ```typescript
     const visitor = {
       ClassDeclaration(node) {
         if (hasDecorator(node, 'RestController')) {
           // 收集接口信息
         }
       }
     }
     ```

3. **基础UI实现**
   - 注册侧边栏视图容器
   - 实现Webview通信协议

#### 第二阶段（功能增强）
1. **集成Mock Server**
   - 使用Express.js创建轻量服务器
   - 动态路由注册：
     ```javascript
     app.all('/mock/:interfaceId', (req, res) => {
       // 根据规则生成响应
     })
     ```

2. **文档生成引擎**
   - 支持OpenAPI 3.0规范
   - 模板示例：
     ```yaml
     openapi: 3.0.0
     info:
       title: Generated API
     paths:
       /users:
         post:
           parameters: [...]
     ```

#### 第三阶段（高级功能）
1. **云同步功能**
   - 使用Axios调用Apifox API
   - OAuth2.0认证流程实现

2. **智能代码补全**
   - 注册VS Code语言特性
   ```typescript
   vscode.languages.registerCompletionItemProvider('java', {
     provideCompletionItems(document, position) {
       // 生成注解建议
     }
   })
   ```

---

### 四、AI辅助开发技巧
1. **代码生成三部曲**
   - 先用自然语言描述需求
   - 追加技术约束条件
   - 最后指定输出格式

2. **错误调试模板**
   ```markdown
   @ AI: 遇到[具体错误信息]当[操作场景]时，
   相关代码片段：
   ```
   
3. **性能优化提示**
   ```markdown
   @ AI: 请优化这段AST解析代码的内存使用，
   要求：
   - 使用流式处理代替全量加载
   - 添加缓存机制
   - 避免重复遍历
   ```

---

### 五、推荐开发流程
1. 在Cursor中创建新插件项目
2. 使用`Ctrl+K`生成基础框架代码
3. 通过`Ctrl+L`对话模式解决具体问题
4. 使用内置调试器（F5）测试插件
5. 用`@ AI: 生成单元测试`创建测试用例

建议结合VS Code Extension API文档（可让Cursor实时检索）进行开发，典型开发周期约2-3周。重点优先实现AST解析和文档生成模块，其余功能可后续迭代。