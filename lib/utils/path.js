import path from 'path';

export const ROOT_PATH = path.resolve(__dirname, '../../');

export const absolutePath = module => path.resolve(ROOT_PATH, module);
