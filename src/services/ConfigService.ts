import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ApifoxConfig {
    apiKey: string;
    projectId: string;
    projectName: string;
}

export class ConfigService {
    private static CONFIG_FILE = '.spring-api-helper.json';

    static async getConfig(): Promise<ApifoxConfig | null> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return null;
            }

            const configPath = path.join(workspaceFolders[0].uri.fsPath, this.CONFIG_FILE);
            if (!fs.existsSync(configPath)) {
                return null;
            }

            const configContent = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(configContent);
        } catch (error) {
            console.error('读取配置失败:', error);
            return null;
        }
    }

    static async saveConfig(config: ApifoxConfig): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('未找到工作区');
            }

            const configPath = path.join(workspaceFolders[0].uri.fsPath, this.CONFIG_FILE);
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error('保存配置失败:', error);
            throw error;
        }
    }

    static async promptForConfig(): Promise<ApifoxConfig | null> {
        const apiKey = await vscode.window.showInputBox({
            prompt: '请输入Apifox API Key',
            password: true
        });

        if (!apiKey) {
            return null;
        }

        const projectId = await vscode.window.showInputBox({
            prompt: '请输入Apifox项目ID'
        });

        if (!projectId) {
            return null;
        }

        const projectName = await vscode.window.showInputBox({
            prompt: '请输入项目名称',
            value: 'Spring API Documentation'
        });

        if (!projectName) {
            return null;
        }

        const config: ApifoxConfig = {
            apiKey,
            projectId,
            projectName
        };

        // 保存配置
        await this.saveConfig(config);
        return config;
    }
} 