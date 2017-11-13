/** @jsx h */

import { toBuilder, print, format, h, components, shorthand } from 'js-to-builder'

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
  Value,
  ArrowFn,
  FnStatement,
  FnCall
} = shorthand

// export default (props) => {
//   return (
//     <Const name={props.name}>
//       <ArrowFn>
//         <Identifier>str</Identifier>
//         <BlockStatement>
//           <ReturnStatement>
//             <Value>
//               {{
//                 type: 'HOGE',
//                 payload: 'PIYO'
//               }}
//             </Value>
//           </ReturnStatement>
//         </BlockStatement>
//       </ArrowFn>
//     </Const>
//   )
// }

export default 'fuga'
