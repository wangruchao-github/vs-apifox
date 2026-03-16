// spring-controller-listener.js
import { ParseTreeListener } from "antlr4ts/tree";
import {
  ClassDeclarationContext,
  MethodDeclarationContext,
} from "./JavaParser";

import { ApiEndpoint, ApiParameter } from "../types/index.js";

export class SpringControllerListener implements ParseTreeListener {
  openapi: any;
  currentClass: string | null;
  currentClassComment: string | null;
  basePath: string;
  currentMethod: any;
  comments: Map<string, string[]>; // 改为 Map 类型
  classDefinitions: { [key: string]: any }; // 存储类定义
  endpoints: ApiEndpoint[];
  filePath: string;

  // 添加必需的 ParseTreeListener 接口方法
  visitTerminal(): void {}
  visitErrorNode(): void {}
  enterEveryRule(): void {}
  exitEveryRule(): void {}
  exitClassDeclaration(): void {}

  constructor(openapiGenerator: any) {
    this.openapi = openapiGenerator;
    this.currentClass = null;
    this.currentClassComment = null;
    this.basePath = "";
    this.currentMethod = null;
    this.comments = new Map();
    this.classDefinitions = {}; // 存储类定义
    this.endpoints = [];
    this.filePath = '';
  }

  public setFilePath(filePath: string){
    this.filePath = filePath;
  }

  // 修改获取注释的辅助方法
  private getComment(ctx: any): string {
    const comments = this.comments.get(ctx.text);
    return comments && comments.length > 0 ? comments[0].replace("//", "").trim() : "";
  }

  // 从注释中提取 @apiFolder 的值
  private extractApiFolder(comments: string[]): string {
    if (!comments || comments.length === 0) return "";

    // 遍历所有注释行，查找 @apiFolder
    for (const comment of comments) {
      const match = comment.match(/@apiFolder\s+(.+)/);
      if (match) {
        return match[1].trim();
      }
    }
    return "";
  }

  // 获取类的 apiFolder（从注释中提取）
  private getClassApiFolder(ctx: any): string {
    const comments = this.comments.get(ctx.text);
    return this.extractApiFolder(comments || []);
  }

  // 修改获取参数注释的辅助方法
  private findParamComment(ctx: any, paramName: string): string {
    const comments = this.comments.get(ctx.text);
    return comments && comments.length > 0 ? comments[0].replace("//", "").trim() : "";
  }

  // 从方法名生成可读的描述（驼峰转空格分隔）
  private generateDescriptionFromMethodName(methodName: string): string {
    if (!methodName) return "";

    // 常见方法名前缀映射
    const prefixMap: { [key: string]: string } = {
      "get": "获取",
      "find": "查找",
      "query": "查询",
      "list": "列表",
      "add": "添加",
      "create": "创建",
      "save": "保存",
      "update": "更新",
      "modify": "修改",
      "edit": "编辑",
      "delete": "删除",
      "remove": "移除",
      "batch": "批量",
      "export": "导出",
      "import": "导入",
      "upload": "上传",
      "download": "下载",
      "check": "检查",
      "verify": "验证",
      "validate": "校验",
      "send": "发送",
      "receive": "接收",
      "process": "处理",
      "execute": "执行",
      "run": "运行",
      "start": "启动",
      "stop": "停止",
      "enable": "启用",
      "disable": "禁用",
      "login": "登录",
      "logout": "登出",
      "register": "注册",
      "reset": "重置",
    };

    // 驼峰转空格分隔
    const words = methodName.replace(/([A-Z])/g, ' $1').trim().toLowerCase().split(' ');
    const prefix = words[0];
    const restWords = words.slice(1);

    // 如果有匹配的前缀翻译
    if (prefixMap[prefix]) {
      const translatedPrefix = prefixMap[prefix];
      if (restWords.length > 0) {
        return `${translatedPrefix}${restWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
      }
      return translatedPrefix;
    }

    // 没有匹配的前缀，直接返回格式化后的方法名
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // 进入类声明（捕获 @RestController 和基础路径）
  enterClassDeclaration(ctx: ClassDeclarationContext) {
    const className = ctx.identifier().text;
    // 直接从类声明获取修饰符
    const classAnnotations =
      ctx.parent?.children
        ?.filter(
          (child) =>
            child.constructor.name === "ClassOrInterfaceModifierContext"
        )
        .flat() || [];

    console.debug("Class annotations:", {
      className: ctx.identifier()?.text,
      annotations: classAnnotations.map((a: any) => a.text),
    });

    // 检查是否是 Spring 控制器
    const isController = classAnnotations.some(
      (annot: any) =>
        annot.text.includes("RestController") ||
        annot.text.includes("Controller")
    );

    // 检查是否是 Spring 控制器
    const isService = classAnnotations.some(
      (annot: any) =>
        annot.text.includes("Service") ||
        annot.text.includes("ServiceImpl")
    );

    // 检查是否是 Spring 控制器
    const isRepository = classAnnotations.some(
      (annot: any) =>
        annot.text.includes("Mapper") ||
        annot.text.includes("Repository") ||
        annot.text.includes("Dao")
    );

    if (isController) {
      this.currentClass = ctx.identifier().text;
      // 优先从 @apiFolder 注释中提取，如果没有则使用普通注释
      const apiFolder = this.getClassApiFolder(ctx);
      this.currentClassComment = apiFolder || this.getComment(ctx);
      // 提取类级别的 @RequestMapping 路径
      const requestMapping = classAnnotations.find((annot: any) =>
        annot.text.startsWith("@RequestMapping")
      );
      if (requestMapping) {
        this.basePath = this.extractAnnotationValue(requestMapping.text);
      }
    } else if (isService || isRepository) {
      // 如果是服务类或者仓储类，则不解析其字段作为 schema
    } else {
      // 如果是普通类，解析其字段作为 schema
      this.parseClassSchema(className, ctx);
    }
  }

  // 解析类定义并生成 schema
  parseClassSchema(className: string, ctx: ClassDeclarationContext) {
    if (this.openapi.hasSchema(className)) return; // 避免重复解析
    const schema: {
      type: string;
      properties: { [key: string]: any };
      description: string;
    } = {
      type: "object",
      properties: {},
      description: "",
    };

    // 获取类注释
    const classComment = this.getComment(ctx);
    if (classComment) {
      schema.description = classComment;
    }

    // 遍历类体，提取字段
    ctx
      .classBody()
      .classBodyDeclaration()
      .forEach((decl) => {
        const fieldDecl = decl.memberDeclaration()?.fieldDeclaration();
        if (fieldDecl) {
          const fieldType = fieldDecl.typeType().text;
          const fieldName = fieldDecl
            .variableDeclarators()
            .variableDeclarator(0)
            .variableDeclaratorId()
            .identifier().text;

          // 获取字段注释
          const fieldComment = this.findParamComment(fieldDecl, fieldName);

          // schema.properties[fieldName] = {
          //   type: this.mapJavaTypeToOpenAPI(fieldType),
          //   description: fieldComment ? fieldComment.trim() : "",
          // };
          schema.properties[fieldName] = this.parseFieldSchema(fieldType, fieldDecl);
        }
      });

    // 注册 schema
    this.openapi.addSchema(className, schema);
  }

  // 解析字段类型（支持嵌套对象、集合类型和枚举）
  parseFieldSchema(fieldType: string, decl: any) {
    const schema: {
      type?: string;
      description?: string;
      items?: any;
      $ref?: string;
      enum?: any[];
    } = {
      type: this.mapJavaTypeToOpenAPI(fieldType),
      description: this.findParamComment(decl, fieldType),
    };

    // 处理集合类型（如 List<User>）
    if (fieldType.startsWith("List<") || fieldType.startsWith("Set<") || fieldType.startsWith("Collection<")) {
      const itemType = fieldType.match(/<([^>]+)>/)?.[1];
      if (itemType) {
        schema.type = "array";
        schema.items = this.parseFieldSchema(itemType, decl);
      }
    }
    // 处理数组类型（如 String[], User[]）
    else if (fieldType.endsWith("[]")) {
      const baseType = fieldType.slice(0, -2);
      schema.type = "array";
      schema.items = this.parseFieldSchema(baseType, decl);
    }
    // 处理 Map<K, V> 类型
    else if (fieldType.startsWith("Map<")) {
      schema.type = "object";
    }
    // 判断是否为 Java 基本类型或包装类，如果是则不需要 $ref
    else if (this.isBasicType(fieldType)) {
      // 已经在上面设置了 type，不需要额外处理
    }
    // 处理嵌套对象（如 User）- 自定义类型
    else if (/^[A-Z]/.test(fieldType)) {
      if (!this.openapi.hasSchema(fieldType)) {
        const classCtx = this.classDefinitions[fieldType];
        if (classCtx) {
          this.parseClassSchema(fieldType, classCtx);
        }
      }
      schema.$ref = `#/components/schemas/${fieldType}`;
      // 删除 type，因为使用了 $ref
      delete schema.type;
    }
    // 处理枚举类型
    else if (fieldType.endsWith("Enum")) {
      schema.enum = this.parseEnumValues(fieldType);
    }

    return schema;
  }

  // 判断是否为 Java 基本类型或包装类
  private isBasicType(type: string): boolean {
    const basicTypes = [
      // 基本类型
      "int", "long", "short", "byte", "float", "double", "boolean", "char",
      // 包装类
      "Integer", "Long", "Short", "Byte", "Float", "Double", "Boolean", "Character",
      // 常用类型
      "String", "BigDecimal", "BigInteger",
      "LocalDateTime", "LocalDate", "LocalTime", "Date", "Timestamp", "Object"
    ];
    return basicTypes.includes(type);
  }

  // 解析枚举值
  parseEnumValues(enumType: string) {
    // 在实际项目中，可以通过遍历 AST 查找枚举定义
    return []; // 这里简化实现
  }

  // 解析请求体的 schema（支持泛型类型）
  private parseRequestBodySchema(paramType: string): any {
    // 处理 List<T>、Set<T> 等集合类型
    const collectionMatch = paramType.match(/^(List|Set|Collection)<(.+)>$/);
    if (collectionMatch) {
      const itemType = collectionMatch[2];
      return {
        type: "array",
        items: this.parseRequestBodySchema(itemType),
      };
    }

    // 处理 Map<K, V> 类型
    const mapMatch = paramType.match(/^Map<(.+),\s*(.+)>$/);
    if (mapMatch) {
      return {
        type: "object",
        additionalProperties: this.parseRequestBodySchema(mapMatch[2]),
      };
    }

    // 处理数组类型（如 String[], Long[]）
    if (paramType.endsWith("[]")) {
      const baseType = paramType.slice(0, -2);
      return {
        type: "array",
        items: this.parseRequestBodySchema(baseType),
      };
    }

    // 判断是否为 Java 基本类型或包装类
    const basicTypes = [
      "int", "Integer", "long", "Long", "float", "Float", "double", "Double",
      "boolean", "Boolean", "String", "BigDecimal", "BigInteger",
      "LocalDateTime", "LocalDate", "LocalTime", "Date", "Object"
    ];

    if (basicTypes.includes(paramType)) {
      return {
        type: this.mapJavaTypeToOpenAPI(paramType),
      };
    }

    // 其他类型使用 $ref 引用 schema
    return {
      $ref: `#/components/schemas/${paramType}`,
    };
  }

  // 解析响应类型的 schema（支持泛型包装类）
  private parseResponseSchema(returnType: string): any {
    // 处理 ResponseEntity<T> 包装类
    if (returnType.startsWith("ResponseEntity<") && returnType.endsWith(">")) {
      const innerType = returnType.slice(14, -1); // 去掉 ResponseEntity< 和 >
      return this.parseResponseSchema(innerType);
    }

    // 处理 List<T>、Set<T> 等集合类型
    const collectionMatch = returnType.match(/^(List|Set|Collection)<(.+)>$/);
    if (collectionMatch) {
      const itemType = collectionMatch[2];
      return {
        type: "array",
        items: this.parseResponseSchema(itemType),
      };
    }

    // 处理 Map<K, V> 类型
    const mapMatch = returnType.match(/^Map<(.+),\s*(.+)>$/);
    if (mapMatch) {
      return {
        type: "object",
        additionalProperties: this.parseResponseSchema(mapMatch[2]),
      };
    }

    // 处理数组类型（如 String[], User[]）
    if (returnType.endsWith("[]")) {
      const baseType = returnType.slice(0, -2);
      return {
        type: "array",
        items: this.parseResponseSchema(baseType),
      };
    }

    // 处理常见的泛型包装类（如 ApiResponse<T>, Result<T>, R<T>, AjaxResult 等）
    const genericWrapperMatch = returnType.match(/^(ApiResponse|Result|R|AjaxResult|Response|CommonResult)<(.+)>$/);
    if (genericWrapperMatch) {
      const wrapperName = genericWrapperMatch[1];
      const genericType = genericWrapperMatch[2];
      // 生成具体的泛型 schema（如 ApiResponse_User）
      return this.generateGenericWrapperSchema(wrapperName, genericType);
    }

    // 处理其他泛型类（如 PageResponse<User>, CustomWrapper<T> 等）
    const genericMatch = returnType.match(/^([A-Z][a-zA-Z0-9]*)<(.+)>$/);
    if (genericMatch) {
      const wrapperName = genericMatch[1];
      const genericType = genericMatch[2];
      // 为任意泛型类生成 schema
      return this.generateGenericWrapperSchema(wrapperName, genericType);
    }

    // 判断是否为 Java 基本类型或包装类
    const basicTypes = [
      "int", "Integer", "long", "Long", "float", "Float", "double", "Double",
      "boolean", "Boolean", "String", "BigDecimal", "BigInteger",
      "LocalDateTime", "LocalDate", "LocalTime", "Date", "Object", "void", "Void"
    ];

    if (basicTypes.includes(returnType)) {
      return {
        type: this.mapJavaTypeToOpenAPI(returnType),
      };
    }

    // 其他自定义类型使用 $ref 引用 schema
    return {
      $ref: `#/components/schemas/${returnType}`,
    };
  }

  // 生成泛型包装类的具体 schema（如 ApiResponse<User> -> ApiResponse_User）
  private generateGenericWrapperSchema(wrapperName: string, genericType: string): any {
    // 生成具体的 schema 名称
    const specificSchemaName = `${wrapperName}_${genericType.replace(/[<>,\s]/g, '_')}`;

    // 如果已经存在，直接返回引用
    if (this.openapi.hasSchema(specificSchemaName)) {
      return { $ref: `#/components/schemas/${specificSchemaName}` };
    }

    // 创建新的 schema
    const schema: any = {
      type: "object",
      properties: {},
      description: `${wrapperName}<${genericType}>`,
    };

    // 常见的包装类字段
    const commonFields = this.getCommonWrapperFields(wrapperName);

    // 设置每个字段
    for (const [fieldName, fieldType] of Object.entries(commonFields)) {
      if (fieldType === 'T' || fieldType === 'DATA') {
        // 泛型字段，使用实际类型
        schema.properties[fieldName] = this.parseResponseSchema(genericType);
      } else if (typeof fieldType === 'string') {
        schema.properties[fieldName] = { type: fieldType };
      }
    }

    // 注册 schema
    this.openapi.addSchema(specificSchemaName, schema);

    return { $ref: `#/components/schemas/${specificSchemaName}` };
  }

  // 获取常见包装类的字段定义
  private getCommonWrapperFields(wrapperName: string): { [key: string]: any } {
    // 常见的响应包装类字段映射
    const wrapperFieldsMap: { [key: string]: { [key: string]: any } } = {
      'ApiResponse': {
        'code': 'integer',
        'message': 'string',
        'msg': 'string',
        'data': 'T',
      },
      'Result': {
        'code': 'integer',
        'message': 'string',
        'msg': 'string',
        'data': 'T',
      },
      'R': {
        'code': 'integer',
        'message': 'string',
        'msg': 'string',
        'data': 'T',
      },
      'Response': {
        'code': 'integer',
        'message': 'string',
        'msg': 'string',
        'data': 'T',
      },
      'AjaxResult': {
        'code': 'integer',
        'message': 'string',
        'msg': 'string',
        'data': 'T',
      },
      'CommonResult': {
        'code': 'integer',
        'message': 'string',
        'msg': 'string',
        'data': 'T',
      },
    };

    return wrapperFieldsMap[wrapperName] || { 'data': 'T' };
  }

  // 进入方法声明（捕获 @GetMapping/@PostMapping 等）
  enterMethodDeclaration(ctx: MethodDeclarationContext) {
    console.debug("Entering method declaration", {
      methodName: ctx.identifier()?.text,
      currentClass: this.currentClass,
    });
    if (!this.currentClass) return;

    // 修复 modifier 访问方式
    const methodAnnotations =
      ctx.parent?.parent?.children
        ?.filter((child) => child.constructor.name === "ModifierContext")
        .map((mod: any) => mod.classOrInterfaceModifier()?.annotation())
        .filter(Boolean)
        .flat() || [];

    const httpMethodAnnotation = methodAnnotations.find((annot: any) =>
      [
        "GetMapping",
        "PostMapping",
        "PutMapping",
        "DeleteMapping",
        "RequestMapping",
      ].some((name) => annot.text.startsWith(`@${name}`))
    );

    if (!httpMethodAnnotation) {
      return; // 不清空 currentMethod，只是返回
    }

    // 解析 HTTP 方法和路径
    const annotationText = httpMethodAnnotation.text;
    const httpMethod = this.extractHttpMethod(annotationText);
    const path = this.basePath + this.extractAnnotationValue(annotationText);

    // 初始化 OpenAPI Operation 对象
    this.currentMethod = {
      path,
      method: httpMethod.toLowerCase(),
      operation: {
        summary: "",
        tags: ["VS-APIFOX" + "/" + this.currentClassComment],
        description: "",
        parameters: [],
        responses: {
          200: { description: "OK" },
        },
      },
    };

    // 获取方法注释
    const methodComment = this.getComment(ctx);
    const methodName = ctx.identifier()?.text || "";
    if (methodComment) {
      this.currentMethod.operation.description = methodComment;
      this.currentMethod.operation.summary = methodComment;
    } else {
      // 如果没有注释，使用方法名生成描述
      const generatedDesc = this.generateDescriptionFromMethodName(methodName);
      this.currentMethod.operation.description = generatedDesc;
      this.currentMethod.operation.summary = generatedDesc;
    }

    // 提取方法参数
    const paramsCtx = ctx.formalParameters().formalParameterList();
    if (paramsCtx) {
      paramsCtx.formalParameter().forEach((paramCtx) => {
        const paramAnnotations = paramCtx
          .variableModifier()
          ?.flatMap((mod) => mod.annotation()?.text || []);
        const paramType = paramCtx.typeType().text;
        const paramName = paramCtx.variableDeclaratorId().identifier().text;

        // 解析参数位置和类型
        let paramLocation = "query";
        if (paramAnnotations?.some((a) => a.includes("PathVariable"))) {
          paramLocation = "path";
        } else if (paramAnnotations?.some((a) => a.includes("RequestBody"))) {
          paramLocation = "body";
          // 处理 @RequestBody 的 schema
          this.currentMethod.operation.requestBody = {
            content: {
              "application/json": {
                schema: this.parseRequestBodySchema(paramType),
              },
            },
          };
        }

        this.currentMethod.operation.parameters.push({
          name: paramName,
          in: paramLocation,
          schema: { type: this.mapJavaTypeToOpenAPI(paramType) },
          description: "", // 从注释中提取描述
        });
      });
    }

    // 提取返回类型 - 修改为使用 $ref
    const returnType = ctx.typeTypeOrVoid().text;
    if (returnType !== "void" && returnType !== "Void") {
      const responseSchema = this.parseResponseSchema(returnType);
      if (responseSchema) {
        this.currentMethod.operation.responses["200"].content = {
          "application/json": {
            schema: responseSchema,
          },
        };
      }
    }
  }

  // 辅助方法：映射 Java 类型到 OpenAPI 类型
  mapJavaTypeToOpenAPI(javaType: string) {
    const typeMap: { [key: string]: string } = {
      int: "integer",
      Integer: "integer",
      long: "integer",
      Long: "integer",
      short: "integer",
      Short: "integer",
      byte: "integer",
      Byte: "integer",
      float: "number",
      Float: "number",
      double: "number",
      Double: "number",
      BigDecimal: "number",
      BigInteger: "integer",
      String: "string",
      boolean: "boolean",
      Boolean: "boolean",
      List: "array",
      Set: "array",
      Collection: "array",
      Map: "object",
      Object: "object",
      LocalDateTime: "string",
      LocalDate: "string",
      LocalTime: "string",
      Date: "string",
      Timestamp: "string",
    };
    return typeMap[javaType] || "object";
  }

  // 提取注解值（如 @GetMapping("/users") → "/users"）
  extractAnnotationValue(annotationText: string): string {
    // 先尝试匹配 value 属性
    const valueMatch = annotationText.match(/value\s*=\s*"([^"]+)"/);
    if (valueMatch) return valueMatch[1];

    // 再尝试匹配直接的路径字符串
    const pathMatch = annotationText.match(/@[^(]+\("([^"]+)"\)/);
    if (pathMatch) return pathMatch[1];

    return "";
  }

  // 提取 HTTP 方法（如 @GetMapping → get）
  extractHttpMethod(annotationText: string): string {
    if (annotationText.startsWith("@GetMapping")) return "get";
    if (annotationText.startsWith("@PostMapping")) return "post";
    if (annotationText.startsWith("@PutMapping")) return "put";
    if (annotationText.startsWith("@DeleteMapping")) return "delete";
    if (annotationText.startsWith("@RequestMapping")) {
      // 尝试从 method 属性获取
      const methodMatch = annotationText.match(/method\s*=\s*([^,\s)]+)/);
      if (methodMatch) {
        return methodMatch[1].toLowerCase();
      }
    }
    return "get"; // 默认为 GET
  }

  // 退出方法时保存到 OpenAPI
  exitMethodDeclaration(ctx: MethodDeclarationContext) {
    // 添加日志以便调试
    console.debug("Exiting method declaration", {
      hasCurrentMethod: !!this.currentMethod,
      methodName: ctx.identifier()?.text,
    });

    if (this.currentMethod) {
      try {
        this.openapi.addPath(
          this.currentMethod.method,
          this.currentMethod.path,
          this.currentMethod.operation
        );
        this.endpoints.push({
          id: `${this.currentMethod.method}  ${this.currentMethod.path}`,
          path: `${this.currentMethod.path}`,
          method: `${this.currentMethod.method}`,
          description: `${this.currentMethod.operation.description}`,
          parameters: this.currentMethod.operation.parameters,
          responses: this.currentMethod.operation.responses,
          requestBody: this.currentMethod.operation.requestBody,
          apifoxFolder: `${this.currentClassComment}`,
          location: {
            filePath: this.filePath,
            line: ctx.start.line,
            character: ctx.start.startIndex
          }
        })
      } catch (error) {
        console.error("Error adding path to OpenAPI:", error);
      }
      this.currentMethod = null;
    }
  }

}
