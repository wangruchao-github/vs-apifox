import { MockRule } from '../types/index.js';

export class MockDataGenerator {
    generate(): MockRule[] {
        const rules: MockRule[] = [];
        // TODO: 实现Java类解析和Mock数据生成逻辑
        return rules;
    }

    private parseJavaClass(content: string): MockRule[] {
        // TODO: 解析Java类的属性和类型
        return [];
    }

    private generateMockRule(fieldName: string, fieldType: string): MockRule {
        return {
            fieldName,
            fieldType,
            rule: this.getDefaultRule(fieldType)
        };
    }

    private getDefaultRule(fieldType: string): string {
        switch (fieldType.toLowerCase()) {
            case 'string':
                return '@string';
            case 'integer':
            case 'int':
                return '@integer(0,100)';
            case 'boolean':
                return '@boolean';
            default:
                return '@string';
        }
    }
} 