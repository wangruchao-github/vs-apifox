import * as vscode from 'vscode';
import { ApiEndpoint, ApiParameter } from '../types/index.js';

export class ApiDocumentProvider {
    private static panel: vscode.WebviewPanel | undefined;

    public static createOrShow(extensionUri: vscode.Uri, apiDocs: ApiEndpoint[]) {
        if (ApiDocumentProvider.panel) {
            ApiDocumentProvider.panel.reveal();
            return;
        }

        ApiDocumentProvider.panel = vscode.window.createWebviewPanel(
            'apiDocs',
            'API文档',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        ApiDocumentProvider.panel.webview.html = this.getWebviewContent(apiDocs);

        ApiDocumentProvider.panel.onDidDispose(
            () => {
                ApiDocumentProvider.panel = undefined;
            },
            null
        );
    }

    private static getWebviewContent(apiDocs: ApiEndpoint[]): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>API文档</title>
            </head>
            <body>
                <h1>API文档</h1>
                <div id="api-docs">
                    ${this.renderApiDocs(apiDocs)}
                </div>
            </body>
            </html>
        `;
    }

    private static renderApiDocs(apiDocs: ApiEndpoint[]): string {
        return apiDocs.map(endpoint => `
            <div class="endpoint">
                <h2>${endpoint.method} ${endpoint.path}</h2>
                ${endpoint.description ? `<p>${endpoint.description}</p>` : ''}
                <h3>参数</h3>
                <ul>
                    ${endpoint.parameters.map((param: ApiParameter) => `
                        <li>
                            ${param.name} (${param.type})
                            ${param.required ? ' - 必填' : ' - 可选'}
                            ${param.description ? ` - ${param.description}` : ''}
                        </li>
                    `).join('')}
                </ul>
                <h3>返回类型</h3>
                <pre>${endpoint.responseType}</pre>
            </div>
        `).join('');
    }
} 