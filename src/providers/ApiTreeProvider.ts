import * as vscode from 'vscode';
import { ApiEndpoint } from '../types/index.js';
import { SpringControllerParser } from '../parser/SpringControllerParser.js';
import { ApifoxService } from '../services/ApifoxService.js';
import { ConfigService } from '../services/ConfigService.js';

export class ApiTreeProvider implements vscode.TreeDataProvider<ApiTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ApiTreeItem | undefined | null | void> = new vscode.EventEmitter<ApiTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ApiTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private apiDocs: ApiEndpoint[] = [];
    private selectedApis: Set<string> = new Set();
    private searchText: string = '';

    constructor() {
        this.refresh();
    }

    getTreeItem(element: ApiTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ApiTreeItem): Thenable<ApiTreeItem[]> {
        if (!element) {
            // 根节点，按文件夹分组
            let apis = this.apiDocs;
            if (this.searchText) {
                apis = this.apiDocs.filter(api => 
                    api.path.toLowerCase().includes(this.searchText.toLowerCase()) ||
                    api.method.toLowerCase().includes(this.searchText.toLowerCase()) ||
                    api.description?.toLowerCase().includes(this.searchText.toLowerCase()) ||
                    api.apifoxFolder.toLowerCase().includes(this.searchText.toLowerCase())
                );
            }
            const folders = [...new Set(apis.map(api => api.apifoxFolder))];
            return Promise.resolve(folders.map(folder => {
                // 检查该文件夹下的所有API是否都被选中
                const folderApis = apis.filter(api => api.apifoxFolder === folder);
                const allSelected = folderApis.every(api => this.selectedApis.has(api.id));
                return new ApiTreeItem(
                    folder,
                    folder,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'apiFolder',
                    undefined,
                    folderApis.length,
                    allSelected
                );
            }));
        } else if (element.contextValue === 'apiFolder') {
            // 文件夹节点，显示该文件夹下的接口
            let apis = this.apiDocs.filter(api => api.apifoxFolder === element.id);
            if (this.searchText) {
                apis = apis.filter(api => 
                    api.path.toLowerCase().includes(this.searchText.toLowerCase()) ||
                    api.method.toLowerCase().includes(this.searchText.toLowerCase()) ||
                    api.description?.toLowerCase().includes(this.searchText.toLowerCase())
                );
            }
            return Promise.resolve(apis.map(api => {
                return new ApiTreeItem(
                    `${api.method.toUpperCase()} ${api.description || api.path}`,
                    api.id,
                    vscode.TreeItemCollapsibleState.None,
                    'aDfGkMpQrStU',
                    undefined,
                    undefined,
                    this.selectedApis.has(api.id),
                    api.path
                );
            }));
        }
        return Promise.resolve([]);
    }

    async refresh(): Promise<void> {
        const parser = new SpringControllerParser();
        this.apiDocs = await parser.parse();
        this.selectedApis.clear();
        this._onDidChangeTreeData.fire();
    }

    toggleSelect(api: ApiEndpoint | any) {
        if (api.contextValue === 'apiFolder') {
            // 处理文件夹选择
            const folderApis = this.apiDocs.filter(a => a.apifoxFolder === api.id);
            const allSelected = folderApis.every(a => this.selectedApis.has(a.id));
            
            if (allSelected) {
                // 如果全部选中，则取消所有选中
                folderApis.forEach(a => this.selectedApis.delete(a.id));
            } else {
                // 如果未全部选中，则选中所有
                folderApis.forEach(a => this.selectedApis.add(a.id));
            }
        } else {
            // 处理单个API选择
            if (this.selectedApis.has(api.id)) {
                this.selectedApis.delete(api.id);
            } else {
                this.selectedApis.add(api.id);
            }
        }
        this._onDidChangeTreeData.fire();
    }

    async syncSelected() {
        try {
            if (this.selectedApis.size === 0) {
                vscode.window.showWarningMessage('请先选择要同步的接口');
                return;
            }

            let config = await ConfigService.getConfig();
            if (!config) {
                const result = await vscode.window.showWarningMessage(
                    '未配置Apifox，是否现在配置？',
                    '是',
                    '否'
                );
                if (result === '是') {
                    config = await ConfigService.promptForConfig();
                }
                if (!config) {
                    return;
                }
            }

            const selectedApis = this.apiDocs.filter(api => 
                this.selectedApis.has(`${api.id}`)
            );

            const apifoxService = new ApifoxService(
                config.apiKey,
                config.projectId,
                config.projectName
            );
            if(selectedApis.length > 0){
                selectedApis[0].schemas = this.apiDocs[0].schemas;
            }
            await apifoxService.uploadApiDocs(selectedApis);
            vscode.window.showInformationMessage(`成功同步 ${selectedApis.length} 个接口`);
            this.selectedApis.clear();
            this._onDidChangeTreeData.fire();
        } catch (error) {
            vscode.window.showErrorMessage(`同步失败: ${error}`);
        }
    }

    async gotoDefinition(apiItem: ApiTreeItem) {
        try {
            console.log('正在查找API定义:', apiItem.id);
            const api = this.apiDocs.find(api => api.id === apiItem.id);
            if (!api) {
                vscode.window.showErrorMessage('找不到对应的API');
                return;
            }

            console.log('API位置信息:', api.location);
            if (!api.location.filePath) {
                vscode.window.showErrorMessage('API定义位置信息不完整');
                return;
            }

            const document = await vscode.workspace.openTextDocument(api.location.filePath);
            const position = new vscode.Position(api.location.line - 1, api.location.character); // 行号从0开始
            const selection = new vscode.Selection(position, position);
            
            const editor = await vscode.window.showTextDocument(document);
            editor.selection = selection;
            editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
        } catch (error) {
            console.error('跳转失败:', error);
            vscode.window.showErrorMessage(`无法打开文件: ${error}`);
        }
    }

    async search(text: string) {
        this.searchText = text;
        this._onDidChangeTreeData.fire();
    }
}

class ApiTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly command?: vscode.Command,
        public readonly childCount?: number,
        public readonly checked?: boolean,
        description?: string
    ) {
        super(label, collapsibleState);
        
        this.resourceUri = vscode.Uri.parse(`apifox-helper:${label}`);
        this.tooltip = description || label;
        this.description = description || (childCount !== undefined ? `(${childCount})` : '');
        
        this.iconPath = contextValue === 'apiFolder' 
            ? new vscode.ThemeIcon('folder')
            : new vscode.ThemeIcon(checked ? 'check' : 'circle-outline');

        // 添加右侧按钮
        this.contextValue = contextValue;
    }
} 