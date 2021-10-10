const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser'); // 将代码转成抽象语法树AST
const traverse = require('@babel/traverse').default; // 对抽象语法树AST进行遍历
const babel = require('@babel/core'); // babel核心模块，进行代码转换
const presetEnv = require('@babel/preset-env'); // 可根据配置的目标浏览器或者运行环境来自动将 ES2015 + 的代码转换为 es5
const prettier = require('prettier'); // 对输出代码进行格式化，方便阅读
const webpackConfig = require('./mini-webpack.config');

class MiniWebpack {
    constructor(config) {
        this.config = config;
    }

    // 代码转换：使用fs读取文件，使用parser将代码转换成AST语法树，再使用 traverse 遍历抽象语法树
    parser(filename) {
        // 读取入口文件
        const fileBuffer = fs.readFileSync(filename, 'utf-8');
        // 转换成抽象语法树AST
        const ast = parser.parse(fileBuffer, {
            sourceType: 'module' // 解析ESM语法
        })

        // 依赖收集
        const dependencies = {};
        // 对AST语法树进行遍历
        traverse(ast, {
            // 处理ImportDeclaration节点
            ImportDeclaration({ node }) {
                const dirname = path.dirname(filename);
                const newDirname = './' + path.join(dirname, node.source.value).replace('\\', '/');
                dependencies[node.source.value] = newDirname;
            }
        })
        // 将抽象语法树转换成代码
        const { code } = babel.transformFromAst(ast, null, {
            presets: ['@babel/preset-env']
        })
        return {
            code,
            dependencies,
            filename
        }
    }

    // 分析依赖关系：从入口文件开始，分析各个文件的依赖关系，返回以文件名为key, 以包含依赖关系和编译后模块代码对象为value的对象
    analyse(entry) {
        // 解析入口文件
        const entryModule = this.parser(entry);
        const graphArr = [entryModule];
        // 循环解析模块  保存信息
        for (let i = 0; i < graphArr.length; i++) {
            const { dependencies } = graphArr[i];
            Object.keys(dependencies).forEach((filename) => {
                graphArr.push(this.parser(dependencies[filename]));
            })
        }
        // 生成依赖图谱对象
        const graph = {}; // key:每个文件的路径  value: 文件的依赖和编码后的代码组成的对象
        graphArr.forEach(({ filename, dependencies, code }) => {
            graph[filename] = { dependencies, code };
        })
        return graph;
    }

    // 生成打包代码：生成依赖图谱对象，作为参数传入一个自执行函数当中；自执行函数中有个 require 函数，它的作用是通过调用 eval 执行模块代码来获取模块内部 export 出来的值，最终我们返回打包的代码
    generate(graph, entry) {
        return `
        (function(graph){
            function require(filename){
                function localRequire(relativePath){
                    return require(graph[filename].dependencies[relativePath]);
                }
                const exports = {};
                (function(require, exports, code){
                    eval(code);
                })(localRequire, exports, graph[filename].code)
                return exports;
            }
            
            require('${entry}');
        })(${graph})
        `
    }

    // 输出output文件:通过获取webpackConfig中的output的配置信息，将打包代码输出到对应的文件中
    fileOutPut(output, code) {
        const {path: dirPath, filename} = output;
        // 判断输出目录是否存在  若不存则先创建
        const isExist = fs.existsSync(dirPath);
        if(!isExist) {
            fs.mkdirSync(dirPath)
        }
        // 把代码写入文件
        const outputPath = path.join(dirPath, filename);
        fs.writeFileSync(outputPath, prettier.format(code, {parser: 'babel'}), 'utf-8');
    }

    // 模拟run函数: 将上边的流程都集中到run函数中，通过调用该函数来执行整个打包流程
    run() {
        const { entry, output } = this.config;
        const graph = this.analyse(entry); // 根据入口文件生成依赖树
        const graphStr = JSON.stringify(graph); // 转为json字符串，防止使用模板字符串时执行toString()报错
        const code = this.generate(graphStr, entry); // 生成打包后的代码
        this.fileOutPut(output, code); // 输出打包文件
    }
}

// 生成实例，执行run方法
const webpack = new MiniWebpack(webpackConfig);
webpack.run();
