import { CharStreams, CommonTokenStream } from "antlr4ts";
import { ParseTreeListener, ParseTreeWalker } from "antlr4ts/tree";
import { Lexer } from "antlr4ts";
import { JavaLexer } from "./JavaLexer";
import { JavaParser } from "./JavaParser";
import {
  ClassDeclarationContext,
  MethodDeclarationContext,
} from "./JavaParser";
import { CommentListener } from "./CommentListener";
import { SpringControllerListener } from "./SpringControllerListener";
import { OpenAPIGenerator } from "./OpenAPIGenerator";


const code = `
/**
 * 用户信息
 */
public class User {
  /**
   * 用户ID
   */
  private String userId;

  /**
   * 用户名
   */
  private String username;

  /**
   * 用户地址
   */
  private Address address;

  /**
   * 用户角色列表
   */
  private List<Role> roles;
}

/**
 * 地址信息
 */
public class Address {
  /**
   * 城市
   */
  private String city;

  /**
   * 街道
   */
  private String street;
}

/**
 * 用户角色
 */
public enum Role {
  ADMIN, USER, GUEST
}
/**
 * 用户控制器
 */
@RestController
@RequestMapping("/api")
public class UserController {
  /**
   * 根据ID获取用户信息
   * @param userId 用户ID
   * @return 用户对象
   */
  @GetMapping("/users/{userId}")
  public User getUser(@PathVariable String userId) {
    return userService.findUser(userId);
  }

  /**
   * 创建新用户
   * @param user 用户数据
   */
  @PostMapping("/users")
  public void createUser(@RequestBody User user) {
    userService.save(user);
  }
}
`;

// 初始化生成器和监听器
const openapiGenerator = new OpenAPIGenerator();
const controllerListener = new SpringControllerListener(openapiGenerator);
// 创建词法分析器和解析器
const inputStream = CharStreams.fromString(code);
const lexer = new JavaLexer(inputStream);
const tokenStream = new CommonTokenStream(lexer);
const parser = new JavaParser(tokenStream);
// 获取 AST（从编译单元的根开始）
const tree = parser.compilationUnit();

// 关联注释监听器
const commentListener = new CommentListener(tokenStream.getTokens(), controllerListener);

// 遍历 AST - 修改遍历顺序
ParseTreeWalker.DEFAULT.walk(commentListener, tree);  // 先处理注释
ParseTreeWalker.DEFAULT.walk(controllerListener, tree);  // 再处理控制器

// 输出 OpenAPI 文档
console.log(openapiGenerator.build());
