import { ApiEndpoint, ApiParameter, Definitions } from "../types/index.js";

export class SwaggerConverter {
  constructor(private projectName: string = "Spring API Documentation") {}

  convert(apiDocs: ApiEndpoint[]) {
    const paths: any = {};
    const tags = this.getTags(apiDocs);

    // 遍历所有接口
    for (const endpoint of apiDocs) {
      const pathItem = paths[endpoint.path] || {};

      // 转换HTTP方法
      pathItem[endpoint.method.toLowerCase()] = {
        tags: [this.projectName + "/" + endpoint.apifoxFolder],
        summary: endpoint.description || "",
        description: endpoint.description || "",
        operationId: this.getOperationId(endpoint),
        produces: ["application/json"],
        consumes: ["application/json"],
        parameters: this.convertParameters(endpoint.parameters),
        "x-apifox-folder": endpoint.apifoxFolder,
        responses: {
          "200": {
            description: "successful operation",
            schema: this.getResponseSchema(endpoint.responseType),
          }
        },
      };

      paths[endpoint.path] = pathItem;
    }

    // 构建OpenAPI文档
    return {
      swagger: "2.0",
      info: {
        title: this.projectName,
        description: "API documentation generated from Spring Controllers",
        version: "1.0.0",
        contact: {
          email: "",
        },
        license: {
          name: "Apache 2.0",
          url: "http://www.apache.org/licenses/LICENSE-2.0.html",
        },
      },
      host: "",
      basePath: "/",
      tags: tags,
      schemes: ["http", "https"],
      paths,
      securityDefinitions: {
        api_key: {
          type: "apiKey",
          name: "Authorization",
          in: "header",
        },
      },
      definitions: this.getDefinitions(apiDocs),
    };
  }

  private getTags(apiDocs: ApiEndpoint[]) {
    const uniqueFolders = [...new Set(apiDocs.map((doc) => doc.apifoxFolder))];
    return uniqueFolders.map((folder) => ({
      name: folder,
      description: `APIs in ${folder}`,
    }));
  }

  private getOperationId(endpoint: ApiEndpoint): string {
    return `${endpoint.method.toLowerCase()}${endpoint.path.replace(
      /[\/\-{}]/g,
      "_"
    )}`;
  }

  private convertParameters(params: ApiParameter[]) {
    return params.map((param) => {
      if (param.parameterType === "body") {
        return {
          in: "body",
          name: "body",
          description: param.description || "",
          required: param.required,
          schema: {
            $ref: `#/definitions/${param.name}`,
          },
        };
      }

      return {
        name: param.name,
        in: param.parameterType,
        description: param.description || "",
        required: param.required,
        type: this.getParameterType(param.type),
        format: this.getParameterFormat(param.type),
      };
    });
  }

  private getParameterType(type: string): string {
    const typeMap: { [key: string]: string } = {
      String: "string",
      Integer: "integer",
      Long: "integer",
      Boolean: "boolean",
      Double: "number",
      Float: "number",
      Date: "string",
      LocalDate: "string",
      LocalDateTime: "string",
      BigDecimal: "number",
    };
    return typeMap[type] || "string";
  }

  private getParameterFormat(type: string): string | undefined {
    const formatMap: { [key: string]: string } = {
      Integer: "int32",
      Long: "int64",
      Double: "double",
      Float: "float",
      Date: "date",
      LocalDate: "date",
      LocalDateTime: "date-time",
    };
    return formatMap[type];
  }

  private getResponseSchema(type: string): any {
    if (
      type.startsWith("List<") ||
      type.startsWith("Set<") ||
      type.startsWith("Collection<")
    ) {
      const itemType = type.match(/<(.+)>/)?.[1] || "Object";
      return {
        type: "array",
        items: {
          type: this.getParameterType(itemType),
        },
      };
    }

    if (type === "void") {
      return {
        type: "object",
      };
    }

    return {
      type: this.getParameterType(type),
    };
  }

  private getDefinitions(apiDocs: ApiEndpoint[]): Definitions {
    const params = apiDocs.map((doc) => doc.parameters).flat();
    const definitions: Definitions = {};

    params
      .filter((param) => param.type === "object" && param.object)
      .forEach((param) => {
        const properties: any = {};

        Object.entries(param.object as any).forEach(
          ([key, value]: [string, any]) => {
            properties[key] = {
              type: this.getParameterType(value.type),
              format: this.getParameterFormat(value.type),
              description: value.description || "",
            };
          }
        );

        definitions[param.name] = {
          type: "object",
          properties,
          xml: {
            name: param.name,
          },
        };
      });

    return definitions;
  }
}
