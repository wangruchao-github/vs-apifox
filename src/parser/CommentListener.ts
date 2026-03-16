import { Lexer } from "antlr4ts";
import { JavaLexer } from "./JavaLexer";
import { MethodDeclarationContext } from "./JavaParser";
import { ParseTreeListener } from "antlr4ts/tree";
import { table } from "console";

export class CommentListener implements ParseTreeListener {
    tokens: any;
    controllerListener: any;
    constructor(tokens: any, controllerListener: any) {
      this.tokens = tokens; // 词法分析器的令牌列表
      this.controllerListener = controllerListener;
      // 初始化 comments Map
      this.controllerListener.comments = new Map();
    }
    enterMethodDeclaration(ctx: MethodDeclarationContext) {
      const startTokenIndex = ctx.start.tokenIndex;
      const comments = this.getLeadingComments(startTokenIndex);
      // 选择最佳注释（优先 Javadoc）
      const bestComment = this.selectBestComment(comments);
      const processedComments = bestComment ? this.processComment(bestComment) : [];

      // 使用方法签名作为 key
      const methodKey = ctx.text;
      this.controllerListener.comments.set(methodKey, processedComments);
    }

    // 获取紧邻的注释（从近到远）
    getLeadingComments(tokenIndex: number): string[] {
      const comments: string[] = [];
      let index = tokenIndex - 1;

      while (index >= 0) {
        const token = this.tokens[index];

        // 如果是注释，收集它
        if (token.type === JavaLexer.COMMENT ||
            token.type === JavaLexer.LINE_COMMENT) {
          comments.push(token.text);  // 添加到末尾（近的在前）
        }
        // 遇到 } 或 ; 表示到了上一个方法/语句的结束，停止
        else if (token.text === '}' || token.text === ';') {
          break;
        }
        // 其他 token（空白、换行、注解、修饰符等）继续向前查找
        // 但如果已经收集了注释，且遇到非空白/换行/注解/修饰符的 token，也停止
        else if (comments.length > 0 && !this.isSkippableToken(token)) {
          break;
        }

        index--;
      }

      return comments;
    }

    // 判断是否为可跳过的 token（空白、换行、注解、修饰符）
    private isSkippableToken(token: any): boolean {
      // 空白
      if (token.text.trim() === '') return true;
      // HIDDEN channel
      if (token.channel === Lexer.HIDDEN) return true;
      // 修饰符
      if (this.isModifier(token.type)) return true;
      // 注解（以 @ 开头）
      if (token.text.startsWith('@')) return true;

      return false;
    }

    // 处理单个注释
    private processComment(comment: string): string[] {
      // 移除注释标记
      let processed = comment
        .replace(/\/\*\*|\*\/|\*/g, '')  // 移除 Javadoc 标记
        .replace(/\/\//g, '')             // 移除单行注释标记
        .split('\n')                      // 按行分割
        .map(line => line.trim())         // 清理每行空白
        .filter(line => line.length > 0)  // 移除空行
        .join(' ');                       // 合并为一行

      return processed ? [processed] : [];
    }

    // 判断是否为分隔线注释
    private isDividerComment(comment: string): boolean {
      const content = comment
        .replace(/\/\*\*|\*\/|\*/g, '')
        .replace(/\/\//g, '')
        .trim();

      // 分隔线注释特征：主要由 =、-、*、# 等字符组成
      const dividerPattern = /^[=\-*#\s]+$/;
      return dividerPattern.test(content);
    }

    // 判断是否为 Javadoc 注释
    private isJavadocComment(comment: string): boolean {
      return comment.trim().startsWith('/**');
    }

    // 选择最佳注释：优先 Javadoc，其次非分隔线注释
    private selectBestComment(comments: string[]): string | null {
      if (comments.length === 0) return null;

      // 遍历注释（从近到远）
      for (const comment of comments) {
        // 优先选择 Javadoc
        if (this.isJavadocComment(comment)) {
          return comment;
        }
      }

      // 没有 Javadoc，找第一个非分隔线注释
      for (const comment of comments) {
        if (!this.isDividerComment(comment)) {
          return comment;
        }
      }

      // 都是分隔线注释，返回 null
      return null;
    }

    // 判断是否为修饰符
    private isModifier(type: number): boolean {
      return [
        JavaLexer.PUBLIC,
        JavaLexer.PRIVATE,
        JavaLexer.PROTECTED,
        JavaLexer.STATIC,
        JavaLexer.FINAL,
        JavaLexer.ABSTRACT,
        JavaLexer.SYNCHRONIZED,
        JavaLexer.VOLATILE,
        JavaLexer.TRANSIENT,
        JavaLexer.NATIVE,
        JavaLexer.STRICTFP,
      ].includes(type);
    }

    // 实现 ParseTreeListener 接口所需的其他方法
    enterEveryRule(ctx: any): void {}
    exitEveryRule(ctx: any): void {}
    visitTerminal(node: any): void {}
    visitErrorNode(node: any): void {}

    // 处理类声明
    enterClassDeclaration(ctx: any) {
      const startTokenIndex = ctx.start.tokenIndex;
      const comments = this.getLeadingComments(startTokenIndex);
      const bestComment = this.selectBestComment(comments);
      const processedComments = bestComment ? this.processComment(bestComment) : [];

      const classKey = ctx.text;
      this.controllerListener.comments.set(classKey, processedComments);
    }

    // 处理字段声明
    enterFieldDeclaration(ctx: any) {
      const startTokenIndex = ctx.start.tokenIndex;
      const comments = this.getLeadingComments(startTokenIndex);
      const bestComment = this.selectBestComment(comments);
      const processedComments = bestComment ? this.processComment(bestComment) : [];

      const fieldKey = ctx.text;
      this.controllerListener.comments.set(fieldKey, processedComments);
    }
  }