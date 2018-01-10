## matryoshka.js
Generate your file like a [Matryoshka](https://en.wikipedia.org/wiki/Matryoshka_doll)

### What is this?

`matryoshka.js` is your generator-watcher and generate files on `ctx.fs.writeFile` call.

1. run `mat` to start `matryoshka.js`
2. write your generator(under the `generators` directory) and call `ctx.fs.writeFile` to create file.
3. then `matryoshka.js` generates your file under the `dest(/src)` directory.

### Generator file syntax

minimum `generator file` will be one `default exported function` 
and put that under the `generators` directory.

See [generators/example.js] for working example.

```jsx harmony
export default (ctx) => {
  const { filePath, fileName, fs } = ctx
  // simply use ctx.fs.writeFile to write file
  return fs.writeFile(`${filePath}/${fileName}`, 'file content goes here')
}
```

### How it works

`matryoshka.js` handles `File System(fs)` event by [virtual-fs](lib/utils/virtual-fs.js)

`virtual-fs` queues `fs.writeFile` call and batch executes `fs.writeFile` at `vfs.perform` call.

At `vfs.perform` we cache `writeFile` results to detect each file status (`created` or `updated` or `deleted`) 
and at the end of `vfs.perform` call, we deletes unnecessary files for keep generated file structure clean with minimum `fs` operation

`vfs` will works like a `virtual-dom` of [React](https://reactjs.org/)! 

### How to use

```bash
# mat --help

 Usage: mat [options]

 Watch your generator files and put generated files to dest on file changes :)


 Options:

   -V, --version            output the version number
   -d, --dest <value>       destination directory name `default: src`
   -g, --generator <value>  generator directory name `default: generators`
   -s, --single-run         single run (no-watch) `default: false`
   -h, --help               output usage information
```

### How to develop

```bash
npm i
npm run watch # will start generator-watcher

# run bin with your snippets.
node dist/mat.js -S @subuta/snippets

npm test # will run tests by AVA.
```

