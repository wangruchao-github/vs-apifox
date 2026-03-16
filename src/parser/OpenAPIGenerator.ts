// openapi-generator.js
export class OpenAPIGenerator {
  openapi: any;
  constructor() {
    this.openapi = {
      openapi: "3.0.0",
      info: {
        title: "API Documentation",
        version: "1.0.0",
      },
      title: 'VS-APIFOX',
      paths: {},
      components: {
        schemas: {},
      },
    };
  }

  // 添加接口路径和方法
  addPath(method: string, path: string, operation: any) {
    if (!this.openapi.paths[path]) {
      this.openapi.paths[path] = {};
    }
    this.openapi.paths[path][method] = operation;
  }

  // 添加嵌套对象的 schema
  addSchema(className: string, schema: any) {
    this.openapi.components.schemas[className] = schema;
  }

  // 检查是否已存在 schema
  hasSchema(className: string) {
    return !!this.openapi.components.schemas[className];
  }

  // 生成最终 JSON
  build() {
    return JSON.stringify(this.openapi, null, 2);
  }
}
