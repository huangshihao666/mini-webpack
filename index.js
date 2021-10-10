const webpackConfig = require('./mini-webpack.config');

class MiniWebpack {
    constructor(config) {
        this.config = config;
    }

    // 代码转换：使用fs读取文件，使用parser将代码转换成AST语法树，再使用 traverse 遍历抽象语法树
    parser() {}

    // 分析依赖关系：从入口文件开始，分析各个文件的依赖关系，返回以文件名为key, 以包含依赖关系和编译后模块代码对象为value的对象
    analyse() {}

    // 生成打包代码：生成依赖图谱对象，作为参数传入一个自执行函数当中；自执行函数中有个 require 函数，它的作用是通过调用 eval 执行模块代码来获取模块内部 export 出来的值，最终我们返回打包的代码
    generate() {}

    // 输出output文件:通过获取webpackConfig中的output的配置信息，将打包代码输出到对应的文件中
    fileOutPut() {}

    // 模拟run函数: 将上边的流程都集中到run函数中，通过调用该函数来执行整个打包流程
    run() {}
}

