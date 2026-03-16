import { ApiEndpoint } from '../types/index.js';

interface OpenAPISpec {
    openapi: string;
    info: {
        title: string;
        version: string;
        description: string;
    };
    servers: Array<{
        url: string;
        description: string;
    }>;
    paths: {
        [key: string]: {
            [key: string]: any;
        };
    };
    components: {
        schemas: {
            [key: string]: any;
        };
    };
}

export class OpenAPIConverter {
    private projectName: string;
    private schemas: { [key: string]: any } = {};

    constructor(projectName: string = 'Spring API Documentation') {
        this.projectName = projectName;
    }

    convert(apiDocs: ApiEndpoint[]): OpenAPISpec {
        const openApiSpec: OpenAPISpec = {
            openapi: '3.0.1',
            info: {
                title: this.projectName,
                version: '1.0.0',
                description: 'Spring API Documentation'
            },
            servers: [
                {
                    url: 'http://localhost:8080',
                    description: 'local'
                }
            ],
            paths: {},
            components: {
                schemas: {}
            }
        };

        // 处理每个API端点
        apiDocs.forEach(api => {
            const path = api.path;
            const method = api.method.toLowerCase();

            if (!openApiSpec.paths[path]) {
                openApiSpec.paths[path] = {};
            }

            // 构建操作对象
            const operation = {
                tags: [this.projectName + "/" + api.apifoxFolder],
                summary: api.description || '',
                description: api.description || '',
                operationId: `${method}_${path.replace(/\//g, '_')}`,
                parameters: api.parameters,
                responses: api.responses,
                requestBody: api.requestBody
            };

            openApiSpec.paths[path][method] = operation;
        });

        // 添加schemas
        if (apiDocs[0]?.schemas) {
            openApiSpec.components.schemas = apiDocs[0].schemas;
        }

        return openApiSpec;
    }

} 