/** @jsx h */

import { toBuilder, print, format, h, components, shorthand } from 'js-to-builder'
import _ from 'lodash'

// import * as types from 'ast-types'
// const {namedTypes: n, builders: b} = types

// expose h to window for eval
const {
  Program,

  ForStatement,
  ForInStatement,
  ForOfStatement,
  DebuggerStatement,
  ReturnStatement,
  ExpressionStatement,

  CallExpression,
  ArrayExpression,
  ObjectExpression,
  ArrowFunctionExpression,
  MemberExpression,
  BinaryExpression,
  AssignmentExpression,
  UpdateExpression,
  FunctionExpression,

  BlockStatement,
  IfStatement,
  LabeledStatement,
  BreakStatement,
  DoWhileStatement,
  WhileStatement,
  ContinueStatement,

  Property,

  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,

  ExportDefaultDeclaration,
  ExportNamedDeclaration,

  AssignmentPattern,
  ObjectPattern,

  VariableDeclaration,
  VariableDeclarator,

  Identifier,
  Literal,
} = components

const {
  Const,
  Let,
  Var,
  ArrowFn,
  Fn,
  FnStatement,
  FnCall,
  Value
} = shorthand

import Action from './_builders/Action'

export default (ctx) => {
  const { filePath, fileName, fs } = ctx

  const data = format(print(
    <Program>
      <Action name="piyo"/>
    </Program>
  ))

  return fs.writeFile(`${filePath}/${fileName}`, data)
}
