import { ApiEndpoint, ApiParameter } from '../types/index.js';

export class SwaggerConverter {
    constructor(private projectName: string = 'Spring API Documentation') {}

    convert(apiDocs: ApiEndpoint[]) {
        const paths: any = {};
        // 遍历所有接口
        for (const endpoint of apiDocs) {
            const pathItem = paths[endpoint.path] || {};
            // 转换HTTP方法
            pathItem[endpoint.method.toLowerCase()] = {
                summary: endpoint.description || '',
                description: endpoint.description || '',
                tags: [this.projectName],
                parameters: this.convertParameters(endpoint.parameters),
                responses: {
                    '200': {
                        description: 'successful operation',
                        content: {
                            'application/json': {
                                schema: {
                                    type: this.getSchemaType(endpoint.responseType)
                                }
                            }
                        }
                    }
                }
            };
            paths[endpoint.path] = pathItem;
        }

        // 构建OpenAPI文档
        return {
            openapi: '3.0.1',
            info: {
                title: this.projectName,
                description: 'API documentation generated from Spring Controllers',
                version: '1.0.0'
            },
            servers: [
                {
                    url: '/'
                }
            ],
            paths,
            components: {
                schemas: {}
            }
        };
    }

    private convertParameters(params: ApiParameter[]) {
        return params.map(param => ({
            name: param.name,
            in: this.getParameterIn(param.type),
            description: param.description || '',
            required: param.required,
            schema: {
                type: this.getSchemaType(param.type)
            }
        }));
    }

    private getParameterIn(type: string): string {
        if (type === 'body') return 'requestBody';
        if (type === 'path') return 'path';
        return 'query';
    }

    private getSchemaType(type: string): string {
        const typeMap: { [key: string]: string } = {
            'String': 'string',
            'Integer': 'integer',
            'Long': 'integer',
            'Boolean': 'boolean',
            'Double': 'number',
            'Float': 'number',
            'Date': 'string',
            'LocalDate': 'string',
            'LocalDateTime': 'string',
            'BigDecimal': 'number'
        };
        return typeMap[type] || 'object';
    }
} 