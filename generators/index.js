import { toBuilder } from 'js-to-builder'

export default () => {
  return toBuilder(`
  // ${new Date()}
  const hoge = "fuga";
  `).code
}
