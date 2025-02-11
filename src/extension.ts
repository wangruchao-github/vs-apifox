import * as vscode from 'vscode';
import { ApiDocumentProvider } from './providers/ApiDocumentProvider.js';
import { SpringControllerParser } from './parser/SpringControllerParser.js';
import { MockDataGenerator } from './generators/MockDataGenerator.js';
import { ApifoxService } from './services/ApifoxService.js';
import { ConfigService } from './services/ConfigService.js';

export function activate(context: vscode.ExtensionContext) {
    console.log('扩展已激活');

    // 注册API文档生成命令
    let generateDocsDisposable = vscode.commands.registerCommand('spring-api-helper.generateDocs', async () => {
        console.log('开始生成API文档');
        const parser = new SpringControllerParser();
        const apiDocs = await parser.parse();
        console.log('解析结果:', apiDocs);
        ApiDocumentProvider.createOrShow(context.extensionUri, apiDocs);
    });

    // 配置Apifox
    let configureApifoxDisposable = vscode.commands.registerCommand('spring-api-helper.configureApifox', async () => {
        try {
            const config = await ConfigService.promptForConfig();
            if (config) {
                vscode.window.showInformationMessage('Apifox配置已保存');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`配置失败: ${error}`);
        }
    });

    // 修改上传命令
    let uploadApiDocsDisposable = vscode.commands.registerCommand('spring-api-helper.uploadApiDocs', async () => {
        try {
            // 尝试获取已保存的配置
            let config = await ConfigService.getConfig();
            
            // 如果没有配置，提示用户配置
            if (!config) {
                config = await ConfigService.promptForConfig();
                if (!config) {
                    vscode.window.showErrorMessage('请先配置Apifox');
                    return;
                }
            }

            // 解析API文档
            const parser = new SpringControllerParser();
            const apiDocs = await parser.parse();

            // 上传到Apifox
            const apifoxService = new ApifoxService(config.apiKey, config.projectId);
            const res = await apifoxService.uploadApiDocs(apiDocs);
            console.log('apifox上传结果:', res);

            vscode.window.showInformationMessage('API文档已成功上传到Apifox');
        } catch (error) {
            vscode.window.showErrorMessage(`上传失败: ${error}`);
        }
    });

    // 注册HTTP请求发送命令
    let sendRequestDisposable = vscode.commands.registerCommand('spring-api-helper.sendRequest', () => {
        // TODO: 实现HTTP请求发送逻辑
    });

    // 注册Mock数据生成命令
    let generateMockDisposable = vscode.commands.registerCommand('spring-api-helper.generateMock', () => {
        const generator = new MockDataGenerator();
        generator.generate();
    });

    // 将所有命令添加到订阅列表
    context.subscriptions.push(generateDocsDisposable);
    context.subscriptions.push(sendRequestDisposable);
    context.subscriptions.push(generateMockDisposable);
    context.subscriptions.push(configureApifoxDisposable);
    context.subscriptions.push(uploadApiDocsDisposable);
}

export function deactivate() {
    console.log('Spring API Helper 扩展已停用');
} 