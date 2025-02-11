import * as vscode from 'vscode';
import { Buffer } from 'buffer';
import { ApiEndpoint, ApiParameter } from '../types/index.js';

export class SpringControllerParser {
    private code: string = '';

    async parse(): Promise<ApiEndpoint[]> {
        const files = await this.findControllerFiles();
        const endpoints: ApiEndpoint[] = [];

        for (const file of files) {
            try {
                this.code = await this.readFile(file);
                console.log('解析文件:', file.fsPath);
                // 解析根路由（第一个requestMapping中的内容）
                const rootPath = this.parseRootPath();
                console.log('根路由:', rootPath);
                // 解析类中的方法的requestMapping中的内容(GetMapping, PostMapping, PutMapping, DeleteMapping, RequestMapping)需要排除第一个
                const methods = this.parseMethods();
                for (const method of methods) {
                    const httpMethod = this.parseHttpMethod(method);
                    const methodPath = this.parseMethodPath(method);
                    // 解析方法的注释内容
                    const methodComment = this.parseMethodComment(method);
                    console.log('方法:', methodComment);
                    if (httpMethod && methodPath) {
                        const parameters = await this.parseParameters(method);
                        endpoints.push({
                            path: this.joinPaths(rootPath, methodPath),
                            method: httpMethod,
                            description: methodComment,
                            parameters: parameters,
                            responseType: this.parseReturnType(method)
                        });
                    }
                }
            } catch (error) {
                console.error('解析失败:', file.fsPath, error);
            }
        }
        
        return endpoints;
    }

    private parseMethodComment(method: string): string {
        // 在this.code中匹配method,获取method方法上面的注释
        const methodIndex = this.code.indexOf(method);
        const methodBeforeContent = this.code.substring(0, methodIndex).trim();
        let braceIndex = methodBeforeContent.lastIndexOf('}', methodIndex);
        if(braceIndex == -1){
            braceIndex = methodBeforeContent.indexOf('{');
        }
        const comment = methodBeforeContent.substring(braceIndex + 1, methodBeforeContent.length).trim();
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
                .split('\n')
                .map(line => line.trim().replace(/^\*\s*/, ''))
                .filter(line => line)
                .join(' ');
            return cleanComment;
        } else {
            return '';
        }
    }

    private parseRootPath(): string {
        const rootPathRegex = /@RequestMapping\((.*?)\)/;
        const match = this.code.match(rootPathRegex);
        return match ? match[1].replace(/"|'/g, '') : '';
    }

    private async findControllerFiles(): Promise<vscode.Uri[]> {
        return vscode.workspace.findFiles(
            '**/src/main/java/**/*Controller.java'
        );
    }

    private async findFileByPackagePath(packagePath: string): Promise<vscode.Uri[]> {
        return vscode.workspace.findFiles(
            `**/src/main/java/${packagePath}.java`
        );
    }

    private parseClassLevelPath(): string {
        const classRegex = /@RestController.*?(@RequestMapping\(.*?\))/;
        const match = this.code.match(classRegex);
        if (!match) return '';

        const annotationContent = match[1]
            .replace(/@RequestMapping\(([^)]+)\)/, '$1')
            .replace(/"|'/g, '');
        
        return this.extractPathValue(annotationContent);
    }

    private extractPathValue(content: string): string {
        const pathRegex = /(value|path)\s*:\s*\[?([^\]}]+)\]?/;
        const match = content.match(pathRegex);
        return match ? match[2].split(',').map(p => p.trim().replace(/"/g, ''))[0] : '';
    }

    private parseMethods(): string[] {
        const methodRegex = /(@(GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)[\s\S]*?public[\s\S]*?{)/g;
        const methods: string[] = [];
        let match;
        let isFirst = true;
        
        while ((match = methodRegex.exec(this.code)) !== null) {
            if (match[2] === 'RequestMapping' && isFirst) {
                isFirst = false;
                continue;
            }
            methods.push(match[1]);
        }
        
        return methods;
    }

    private parseHttpMethod(methodCode: string): string {
        const methodRegex = /@(GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)/;
        const match = methodCode.match(methodRegex);
        if (!match) return 'GET';

        const annotation = match[1];
        return annotation === 'RequestMapping' 
            ? this.parseRequestMappingMethod(methodCode) 
            : annotation.replace('Mapping', '').toUpperCase();
    }

    private parseRequestMappingMethod(methodCode: string): string {
        const methodRegex = /method\s*=\s*RequestMethod\.(\w+)/;
        const match = methodCode.match(methodRegex);
        return match ? match[1].toUpperCase() : 'GET';
    }

    private parseMethodPath(methodCode: string): string {
        const pathRegex = /@\w+Mapping\((?:value\s*=\s*)?["']([^"']+)["']\)/;
        const match = methodCode.match(pathRegex);
        if (!match) return '';
        return match[1].replace(/"/g, '');
    }

    private async parseParameters(methodCode: string): Promise<ApiParameter[]> {
        const params: ApiParameter[] = [];
        
        // 解析路径参数
        const pathParamRegex = /@PathVariable\s*(?:\(\s*(?:value\s*=\s*)?["'](\w+)["']\s*\))?\s*(\w+)\s+(\w+)/g;
        let match;
        
        while ((match = pathParamRegex.exec(methodCode)) !== null) {
            params.push({
                name: match[3],
                type: match[2],
                required: !match[1] || !match[1].includes("required = false")
            });
        }
        
        // 解析请求参数
        const reqParamRegex = /@RequestParam\s*(\(\s*[^)]+\s*\))?\s+(\w+)\s+(\w+)/g;
        while ((match = reqParamRegex.exec(methodCode)) !== null) {
            params.push({
                name: match[3],
                type: match[2],
                required: !match[1] || !match[1].includes("required = false")
            });
        }

        // 解析请求体
        const reqBodyRegex = /@RequestBody\s*(\(\s*[^)]+\s*\))?\s+(\w+)\s+(\w+)/g;        
        while ((match = reqBodyRegex.exec(methodCode)) !== null) {
            params.push({
                name: match[3],
                type: match[2],
                required: !match[1] || !match[1].includes("required = false")
            });
            // 查找请求体对应的文件（根据code中导入的包路径）
            const reqBodyFileContent = await this.findReqBodyFile(this.code, match[2]);
            // 解析实体中的参数
            const entityParamRegex = /private\s+(\w+)\s+(\w+)\s*;/g;
            let entityMatch;
            while ((entityMatch = entityParamRegex.exec(reqBodyFileContent)) !== null) {
                params.push({
                    name: entityMatch[2],
                    type: entityMatch[1],
                    required: true
                });
            }
        }    
        return params;
    }

    private async findReqBodyFile(code: string,type: string): Promise<string> {
        const typeIndex = code.indexOf(type) + type.length;
        const typeBeforeContent = code.substring(0, typeIndex).trim();
        const lastImportIndex = typeBeforeContent.lastIndexOf('import');
        const importContent = typeBeforeContent.substring(lastImportIndex, typeBeforeContent.length).trim();
        console.log('importContent:', importContent);
        const importContentArray = importContent.split(' ');
        const files = await this.findFileByPackagePath(importContentArray[1].replace(/\./g, '/'));
        console.log('files:', files);
        const fileContent = await this.readFile(files[0]);
        console.log('fileContent:', fileContent);
        return fileContent;
    }

    private parseReturnType(methodCode: string): string {
        const returnRegex = /public\s+(\w+(?:<[^>]+>)?)\s+\w+\s*\(/;
        const match = methodCode.match(returnRegex);
        return match ? match[1] : 'void';
    }

    private joinPaths(basePath: string, methodPath: string): string {
        let path = '';
        if (basePath) {
            path += basePath.startsWith('/') ? basePath : '/' + basePath;
        }
        if (methodPath) {
            path += methodPath.startsWith('/') ? methodPath : '/' + methodPath;
        }
        return path || '/';
    }

    private async readFile(uri: vscode.Uri): Promise<string> {
        const content = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(content).toString('utf-8')
            // .replace(/\/\*[\s\S]*?\*\//g, '')  // 删除块注释
            // .replace(/\/\/.*/g, '')           // 删除行注释
            .replace(/\s+/g, ' ')             // 压缩空格
            .replace(/@\s+/g, '@');           // 清理注解格式
    }
} 