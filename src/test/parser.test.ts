import * as assert from "node:assert/strict";
import { CharStreams, CommonTokenStream } from "antlr4ts";
import { ParseTreeWalker } from "antlr4ts/tree";
import { CommentListener } from "../parser/CommentListener.js";
import { JavaLexer } from "../parser/JavaLexer.js";
import { JavaParser } from "../parser/JavaParser.js";
import { OpenAPIGenerator } from "../parser/OpenAPIGenerator.js";
import { SpringControllerListener } from "../parser/SpringControllerListener.js";
import { ApiEndpoint } from "../types/index.js";

function parseSource(code: string, filePath: string): ApiEndpoint[] {
  const openapiGenerator = new OpenAPIGenerator();
  const controllerListener = new SpringControllerListener(openapiGenerator);
  controllerListener.setFilePath(filePath);

  const inputStream = CharStreams.fromString(code);
  const lexer = new JavaLexer(inputStream);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new JavaParser(tokenStream);
  const tree = parser.compilationUnit();
  const commentListener = new CommentListener(tokenStream.getTokens(), controllerListener);

  ParseTreeWalker.DEFAULT.walk(commentListener as any, tree);
  ParseTreeWalker.DEFAULT.walk(controllerListener as any, tree);

  if (controllerListener.endpoints.length > 0) {
    controllerListener.endpoints[0].schemas = openapiGenerator.openapi.components.schemas;
  }

  return controllerListener.endpoints;
}

function getEndpoint(endpoints: ApiEndpoint[], method: string, path: string): ApiEndpoint {
  const endpoint = endpoints.find(
    (item) => item.method === method && item.path === path
  );

  assert.ok(endpoint, `Expected endpoint ${method.toUpperCase()} ${path} to exist`);
  return endpoint;
}

function runSpringAssertions() {
  const code = `
/**
 * @apiFolder 用户管理
 */
@RestController
@RequestMapping("/api/users")
public class UserController {
  /**
   * 根据ID获取用户
   */
  @GetMapping("/{id}")
  public User getUser(@PathVariable("id") Long userId) {
    return null;
  }

  /**
   * 创建用户
   */
  @PostMapping
  public User createUser(@RequestBody CreateUserRequest request) {
    return null;
  }
}

public class CreateUserRequest {
  private String name;
}

public class User {
  private Long id;
}
`;

  const endpoints = parseSource(code, "/fixtures/SpringController.java");
  assert.equal(endpoints.length, 2, "Spring fixture should expose two endpoints");

  const getUser = getEndpoint(endpoints, "get", "/api/users/{id}");
  assert.equal(getUser.parameters.length, 1);
  assert.equal((getUser.parameters[0] as any).name, "id");
  assert.equal((getUser.parameters[0] as any).in, "path");
  assert.equal((getUser.parameters[0] as any).required, true);

  const createUser = getEndpoint(endpoints, "post", "/api/users");
  assert.equal(createUser.parameters.length, 0);
  assert.ok(createUser.requestBody, "Spring @RequestBody should populate requestBody");
  assert.equal(
    createUser.requestBody?.content?.["application/json"]?.schema?.$ref,
    "#/components/schemas/CreateUserRequest"
  );
}

function runJaxRsAssertions() {
  const code = `
/**
 * 用户资源
 */
@Path("/users/")
public class UserResource {
  /**
   * 根据ID查询用户
   */
  @GET
  @Path("/{id}")
  public User getUser(@PathParam("id") Long userId, @QueryParam("expand") String expand) {
    return null;
  }

  /**
   * 创建用户
   */
  @POST
  public User createUser(CreateUserRequest request) {
    return null;
  }
}

public class CreateUserRequest {
  private String name;
}

public class User {
  private Long id;
}
`;

  const endpoints = parseSource(code, "/fixtures/JaxRsResource.java");
  assert.equal(endpoints.length, 2, "JAX-RS fixture should expose two endpoints");

  const getUser = getEndpoint(endpoints, "get", "/users/{id}");
  assert.equal(getUser.parameters.length, 2);
  assert.deepEqual(
    getUser.parameters.map((param: any) => ({
      name: param.name,
      in: param.in,
      required: param.required,
    })),
    [
      { name: "id", in: "path", required: true },
      { name: "expand", in: "query", required: false },
    ]
  );

  const createUser = getEndpoint(endpoints, "post", "/users");
  assert.equal(createUser.parameters.length, 0);
  assert.ok(createUser.requestBody, "Unannotated JAX-RS complex parameter should become requestBody");
  assert.equal(
    createUser.requestBody?.content?.["application/json"]?.schema?.$ref,
    "#/components/schemas/CreateUserRequest"
  );
}

runSpringAssertions();
runJaxRsAssertions();

console.log("Parser regression tests passed");
