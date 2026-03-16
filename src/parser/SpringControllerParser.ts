import * as vscode from "vscode";
import { Buffer } from "buffer";
import { ApiEndpoint, ApiParameter } from "../types/index.js";
import { randomUUID } from "crypto";
import { JavaParser } from './JavaParser';
import { CharStreams, CommonTokenStream } from "antlr4ts";
import { JavaLexer } from "./JavaLexer";
import { ParseTreeWalker } from "antlr4ts/tree";
import { SpringControllerListener } from "./SpringControllerListener";
import { CommentListener } from "./CommentListener";
import { OpenAPIGenerator } from "./OpenAPIGenerator.js";

export class SpringControllerParser {
  private code: string = "";
  private javaParser: JavaParser;

  constructor() {
    // 创建词法分析器和语法分析器
    const lexer = new JavaLexer(CharStreams.fromString(""));
    const tokenStream = new CommonTokenStream(lexer);
    this.javaParser = new JavaParser(tokenStream);
  }

  async parse(): Promise<ApiEndpoint[]> {
    const files = await this.findControllerFiles();
    const endpoints: ApiEndpoint[] = [];
    // 创建监听器
    const openapiGenerator = new OpenAPIGenerator();
    const controllerListener = new SpringControllerListener(openapiGenerator);
    for (const file of files) {
      try {
        this.code = await this.readFile(file);
        console.log("解析文件:", file.fsPath);
        controllerListener.setFilePath(file.fsPath)
        // 创建词法分析器和token流
        const chars = CharStreams.fromString(this.code);
        const lexer = new JavaLexer(chars);
        const tokens = new CommonTokenStream(lexer);
        
        // 创建语法分析器
        const parser = new JavaParser(tokens);
        const tree = parser.compilationUnit();
        
        const commentListener = new CommentListener(tokens.getTokens(), controllerListener);
        
        // 遍历语法树
        ParseTreeWalker.DEFAULT.walk(commentListener as any, tree);
        ParseTreeWalker.DEFAULT.walk(controllerListener as any, tree);
        
      } catch (error) {
        console.error("解析失败:", file.fsPath, error);
      }
    }
    if(controllerListener.endpoints.length > 0){
      controllerListener.endpoints[0].schemas = openapiGenerator.openapi.components.schemas;
    }
    return controllerListener.endpoints;
  }

  private parseApifoxFolder(): string {
    // 先尝试获取类级别的注释
    const classCommentRegex = /@apiFolder(.*)/;
    const classMatch = this.code.match(classCommentRegex);
    if (classMatch) {
      return classMatch[1]
        .trim()
        .replace(/\s*\*\s*/g, " ")
        .trim();
    }

    // 如果没有注释,则提取类名
    const classNameRegex = /class\s+(\w+)Controller/;
    const classNameMatch = this.code.match(classNameRegex);
    if (classNameMatch) {
      return classNameMatch[1];
    }

    return "";
  }

  private parseMethodComment(method: string): string {
    // 在this.code中匹配method,获取method方法上面的注释
    const methodIndex = this.code.indexOf(method);
    const methodBeforeContent = this.code.substring(0, methodIndex).trim();
    let braceIndex = methodBeforeContent.lastIndexOf("}", methodIndex);
    if (braceIndex == -1) {
      braceIndex = methodBeforeContent.indexOf("{");
    }
    const comment = methodBeforeContent
      .substring(braceIndex + 1, methodBeforeContent.length)
      .trim();
    // 匹配单行注释 // 和多行注释 /* */
    const singleLineCommentRegex = /\/\/\s*(.*?)(?=\n|$)/;
    const multiLineCommentRegex = /\/\*\s*([\s\S]*?)\s*\*\//;
    const singleLineMatch = comment.match(singleLineCommentRegex);
    const multiLineMatch = comment.match(multiLineCommentRegex);
    // 优先使用单行注释，如果没有则使用多行注释
    if (singleLineMatch) {
      return singleLineMatch[1].trim();
    } else if (multiLineMatch) {
      // 处理多行注释，去除每行开头的 * 并合并
      const cleanComment = multiLineMatch[1]
        .split("\n")
        .map((line) => line.trim().replace(/^\*\s*/, ""))
        .filter((line) => line)
        .join(" ");
      return cleanComment;
    } else {
      return "";
    }
  }

  private parseFieldComment(code: string, field: string): string {
    // 在this.code中匹配field,获取field方法上面的注释
    const fieldIndex = code.indexOf(field);
    const fieldBeforeContent = code.substring(0, fieldIndex).trim();
    let braceIndex = fieldBeforeContent.lastIndexOf(";", fieldIndex);
    if (braceIndex == -1) {
      braceIndex = fieldBeforeContent.indexOf("{");
    }
    const comment = fieldBeforeContent
      .substring(braceIndex + 1, fieldBeforeContent.length)
      .trim();
    // 匹配单行注释 // 和多行注释 /* */
    const singleLineCommentRegex = /\/\/\s*(.*?)(?=\n|$)/;
    const multiLineCommentRegex = /\/\*\s*([\s\S]*?)\s*\*\//;
    const singleLineMatch = comment.match(singleLineCommentRegex);
    const multiLineMatch = comment.match(multiLineCommentRegex);
    // 优先使用单行注释，如果没有则使用多行注释
    if (singleLineMatch) {
      return singleLineMatch[1].trim();
    } else if (multiLineMatch) {
      // 处理多行注释，去除每行开头的 * 并合并
      const cleanComment = multiLineMatch[1]
        .split("\n")
        .map((line) => line.trim().replace(/^\*\s*/, ""))
        .filter((line) => line)
        .join(" ");
      return cleanComment;
    } else {
      return "";
    }
  }

  private parseRootPath(): string {
    const rootPathRegex = /@RequestMapping\((.*?)\)/;
    const match = this.code.match(rootPathRegex);
    return match ? match[1].replace(/"|'/g, "") : "";
  }

  private async findControllerFiles(): Promise<vscode.Uri[]> {
    return vscode.workspace.findFiles("**/src/main/java/**/*.java");
  }

  private async findFileByPackagePath(
    packagePath: string
  ): Promise<vscode.Uri[]> {
    return vscode.workspace.findFiles(`**/src/main/java/${packagePath}.java`);
  }

  private parseClassLevelPath(): string {
    const classRegex = /@RestController.*?(@RequestMapping\(.*?\))/;
    const match = this.code.match(classRegex);
    if (!match) return "";

    const annotationContent = match[1]
      .replace(/@RequestMapping\(([^)]+)\)/, "$1")
      .replace(/"|'/g, "");

    return this.extractPathValue(annotationContent);
  }

  private extractPathValue(content: string): string {
    const pathRegex = /(value|path)\s*:\s*\[?([^\]}]+)\]?/;
    const match = content.match(pathRegex);
    return match
      ? match[2].split(",").map((p) => p.trim().replace(/"/g, ""))[0]
      : "";
  }

  private parseMethods(): string[] {
    const methodRegex =
      /(@(GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)[\s\S]*?public[\s\S]*?{)/g;
    const methods: string[] = [];
    let match;
    let isFirst = true;

    while ((match = methodRegex.exec(this.code)) !== null) {
      if (match[2] === "RequestMapping" && isFirst) {
        isFirst = false;
        continue;
      }
      methods.push(match[1]);
    }

    return methods;
  }

  private parseHttpMethod(methodCode: string): string {
    const methodRegex =
      /@(GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)/;
    const match = methodCode.match(methodRegex);
    if (!match) return "GET";

    const annotation = match[1];
    return annotation === "RequestMapping"
      ? this.parseRequestMappingMethod(methodCode)
      : annotation.replace("Mapping", "").toUpperCase();
  }

  private parseRequestMappingMethod(methodCode: string): string {
    const methodRegex = /method\s*=\s*RequestMethod\.(\w+)/;
    const match = methodCode.match(methodRegex);
    return match ? match[1].toUpperCase() : "GET";
  }

  private parseMethodPath(methodCode: string): string {
    const pathRegex = /@\w+Mapping\(\s*(?:value\s*=\s*)?"([^"]+)"/;
    const match = methodCode.match(pathRegex);
    if (!match) return "";
    return match[1].replace(/"/g, "");
  }

  private async parseParameters(methodCode: string): Promise<ApiParameter[]> {
    const params: ApiParameter[] = [];

    // 解析路径参数
    const pathParamRegex =
      /@PathVariable\s*(?:\(\s*(?:value\s*=\s*)?["'](\w+)["']\s*\))?\s*(\w+)\s+(\w+)/g;
    let match;

    while ((match = pathParamRegex.exec(methodCode)) !== null) {
      params.push({
        name: match[3],
        type: match[2],
        required: !match[1] || !match[1].includes("required = false"),
        parameterType: "path",
      });
    }

    // 解析请求参数
    const reqParamRegex = /@RequestParam\s*(\(\s*[^)]+\s*\))?\s+(\w+)\s+(\w+)/g;
    while ((match = reqParamRegex.exec(methodCode)) !== null) {
      params.push({
        name: match[3],
        type: match[2],
        required: !match[1] || !match[1].includes("required = false"),
        parameterType: "query",
      });
    }

    // 解析请求体
    const reqBodyRegex = /@RequestBody\s*(\(\s*[^)]+\s*\))?\s+(\w+)\s+(\w+)/g;
    while ((match = reqBodyRegex.exec(methodCode)) !== null) {
      // 查找请求体对应的文件（根据code中导入的包路径）
      const reqBodyFileContent = await this.findReqBodyFile(
        this.code,
        match[2]
      );
      // 解析实体中的参数
      const entityParamRegex = /private\s+(\w+)\s+(\w+)\s*;/g;
      const body = {};
      let entityMatch;
      if (reqBodyFileContent != null) {
        while (
          (entityMatch = entityParamRegex.exec(reqBodyFileContent)) !== null
        ) {
        (body as any)[entityMatch[2]] = {
          type: entityMatch[1],
          required: true,
          description: this.parseFieldComment(
            reqBodyFileContent,
            entityMatch[0]
          ),
          };
        }
      }
      params.push({
        name: match[2],
        type: "object",
        required: !match[1] || !match[1].includes("required = false"),
        parameterType: "body",
        object: body,
      });
    }
    // 解析请求体
    const reqParamsRegex = /\((.*?)\)/;
    const paramsMatch = methodCode.match(reqParamsRegex);
    if (paramsMatch) {
      const reqParams = paramsMatch[1].split(",");
      for (const param of reqParams) {        
        if (
          param.indexOf("@PathVariable") === -1 &&
          param.indexOf("@RequestParam") === -1 &&
          param.indexOf("@RequestBody") === -1
        ) {
          const paramArr = param.trim().split(" ");
          if((paramArr.length > 1 && paramArr[1] == "=") || paramArr.length <= 1) {
            continue;
          }
          const reqBodyFileContent = await this.findReqBodyFile(
            this.code,
            paramArr[0]
          );
          if (reqBodyFileContent !== "") {
            const entityParamRegex = /private\s+(\w+)\s+(\w+)\s*;/g;
            let entityMatch;
            while (
              (entityMatch = entityParamRegex.exec(reqBodyFileContent)) !==
              null
            ) {
              params.push({
                name: entityMatch[2],
                type: entityMatch[1],
                required: true,
                parameterType: "query",
                description: this.parseFieldComment(
                  reqBodyFileContent,
                  entityMatch[0]
                ),
              });
            }
          } else {
            params.push({
              name: paramArr[1],
              type: paramArr[0],
              required: true,
              parameterType: "query",
            });
          }
        }
      }
    }
    return params;
  }

  private async findReqBodyFile(code: string, type: string): Promise<string> {
    try {
      const typeIndex = code.indexOf(type) + type.length;
      const typeBeforeContent = code.substring(0, typeIndex).trim();
      const lastImportIndex = typeBeforeContent.lastIndexOf("import");
      const importContent = typeBeforeContent
        .substring(lastImportIndex, typeBeforeContent.length)
        .trim();
      const importContentArray = importContent.split(" ");
      const files = await this.findFileByPackagePath(
        importContentArray[1].replace(/\./g, "/")
      );
      console.log("files:", files);
      const fileContent = await this.readFile(files[0]);
      return fileContent;
    } catch (error: any) {
      return "";
    }
  }

  private parseReturnType(methodCode: string): string {
    const returnRegex = /public\s+(\w+(?:<[^>]+>)?)\s+\w+\s*\(/;
    const match = methodCode.match(returnRegex);
    return match ? match[1] : "void";
  }

  private joinPaths(basePath: string, methodPath: string): string {
    let path = "";
    if (basePath) {
      path += basePath.startsWith("/") ? basePath : "/" + basePath;
    }
    if (methodPath) {
      path += methodPath.startsWith("/") ? methodPath : "/" + methodPath;
    }
    return path || "/";
  }

  private async readFile(uri: vscode.Uri): Promise<string> {
    const content = await vscode.workspace.fs.readFile(uri);
    return (
      Buffer.from(content)
        .toString("utf-8")
        // .replace(/\/\*[\s\S]*?\*\//g, '')  // 删除块注释
        // .replace(/\/\/.*/g, '')           // 删除行注释
        // .replace(/\s+/g, " ") // 压缩空格
        // .replace(/@\s+/g, "@")
    ); // 清理注解格式
  }

  private getMethodLocation(methodCode: string): { line: number; character: number } {
    const methodIndex = this.code.indexOf(methodCode);
    const codeBeforeMethod = this.code.substring(0, methodIndex);
    const lines = codeBeforeMethod.split('\n');
    return {
      line: lines.length - 1,
      character: lines[lines.length - 1].length
    };
  }
}
