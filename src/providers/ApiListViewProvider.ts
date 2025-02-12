import * as vscode from 'vscode';
import { ApiTreeProvider } from './ApiTreeProvider.js';

export class ApiListViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private apiTreeProvider: ApiTreeProvider;

    constructor(private readonly extensionUri: vscode.Uri, apiTreeProvider: ApiTreeProvider) {
        this.apiTreeProvider = apiTreeProvider;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = this.getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'search':
                    this.apiTreeProvider.search(data.value);
                    break;
            }
        });
    }

    private getHtmlForWebview() {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    .search-container {
                        padding: 8px;
                        background: var(--vscode-sideBar-background);
                        position: sticky;
                        top: 0;
                        z-index: 1;
                    }
                    .search-input {
                        width: 100%;
                        padding: 4px 8px;
                        border: 1px solid var(--vscode-input-border);
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        outline: none;
                        border-radius: 2px;
                    }
                    .search-input:focus {
                        border-color: var(--vscode-focusBorder);
                    }
                </style>
            </head>
            <body>
                <div class="search-container">
                    <input 
                        type="text" 
                        class="search-input" 
                        placeholder="搜索API..."
                        oninput="onSearch(event)"
                    >
                </div>
                <script>
                    function onSearch(event) {
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({
                            type: 'search',
                            value: event.target.value
                        });
                    }
                </script>
            </body>
            </html>`;
    }
} 