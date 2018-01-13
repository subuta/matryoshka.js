import path from 'path';
import _ from 'lodash';

export const ROOT_PATH = path.resolve(__dirname, '../../');

export const absolutePath = module => path.resolve(ROOT_PATH, module);

// calculate most parent dir of difference
export const calculatePathDiff = (baseDir, anotherDir) => {
  if (baseDir === anotherDir) return ''
  let basePaths = baseDir.split(path.sep)
  let anotherPaths = anotherDir.split(path.sep)

  // swap paths if basePaths is deeper than anotherPaths.
  if (basePaths.length > anotherPaths.length) {
    [basePaths, anotherPaths] = [anotherPaths, basePaths]
  }

  // compare path and push
  let intersection = _.intersection(basePaths, anotherPaths)

  if (anotherPaths[intersection.length]) {
    intersection = [...intersection, anotherPaths[intersection.length]]
  }

  return intersection.join(path.sep)
}

// detect file is children of anotherDir
export const isChildrenOf = (fileName, anotherDir) => {
  if (fileName === anotherDir) return false // if both is same.
  const dir = path.dirname(fileName)
  return _.startsWith(dir, anotherDir)
}

// merge nested paths
export const mergePaths = (paths) => {
  // sortBy longer path
  const sortedPaths =  _.sortedUniq(_.sortBy(paths, (path) => path.length)).reverse()
  // then combine paths by startsWith.
  return _.uniqWith(sortedPaths, (p, ap) => _.startsWith(ap, p))
}
