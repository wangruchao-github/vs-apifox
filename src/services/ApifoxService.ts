import axios from 'axios';
import { ApiEndpoint } from '../types/index.js';
import { SwaggerConverter } from '../converters/SwaggerConverter.js';

export class ApifoxService {
    private apiKey: string;
    private projectId: string;
    private projectName: string;

    constructor(apiKey: string, projectId: string, projectName: string = 'Spring API Documentation') {
        this.apiKey = apiKey;
        this.projectId = projectId;
        this.projectName = projectName;
    }

    async uploadApiDocs(apiDocs: ApiEndpoint[]) {
        try {
            // 转换为OpenAPI格式
            const converter = new SwaggerConverter(this.projectName);
            const openApiSpec = converter.convert(apiDocs);
            // 上传到Apifox
            const response = await axios.post(
                `https://api.apifox.cn/v1/projects/${this.projectId}/import-openapi`,
                {
                    input: JSON.stringify(openApiSpec)
                },
                {
                    headers: {
                        'X-Apifox-Version': '2022-11-16',
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('上传到Apifox失败:', error);
            throw error;
        }
    }
} 