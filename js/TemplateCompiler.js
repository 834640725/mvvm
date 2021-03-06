// 对 vm.$el模块进行编译
class TemplateCompiler {
    constructor (el, vm) {
        // 缓存重要的属性
        this.el = this.isElementNode(el) ? el : document.querySelector(el)
        this.vm = vm

        if (this.el) {
            // 判断视图存在
            // 解析指令 - 把模板放入内存,在内存中操作dom和页面没有关系,不会影响页面性能
            // 1. fragment.appendChild(el.firstChild) 存放内存(片段),操作完之后再从内存中返回
            // 将模板内容放入内存(片段)
            let fragment = this.node2fragment(this.el)
            // 2. 解析模板
            this.compile(fragment)
            // 3. 把内存的结果返回到页面中
            // 将解析好的模板返回到页面 this.el中
            this.el.appendChild(fragment)
        }
        
    }

    // 工具方法
    // #app || document.querySelector('#app')
    isElementNode (node) {
        return node.nodeType === 1
    }
    // 转数组
    toArray (arrList) {
        return Array.prototype.slice.call(arrList)
    }
    // 判断指令
    isDirective (name) {
        let strName = name.slice(0,2)
        return strName === 'v-'
    }

    // 核心方法
    // 把模板放入内存,等待解析
    node2fragment (node) {
        // 1.创建内存片段
        let fragment = document.createDocumentFragment()
        let child
        // 2.把模板内容丢到内存
        while ( child = node.firstChild ) {
            fragment.appendChild(child)
        }
        // 3.返回
        return fragment 
    }

    // 解析模板
    compile (parent) {
      // 1.获取内存中模板的子节点
      let childNodes = parent.childNodes
      // 2. 遍历每一个节点
      this.toArray( childNodes ).forEach((node) => {
          // 元素节点(解析指令)
          if(this.isElementNode(node)){
             this.compileElement(node)
          }else {
              //文本节点,进行解析表达式 {{message}}
              // 定义文本表达式验证规则
              let textReg = /\{\{(.+)\}\}/
              let expr = node.textContent.trim()
              if(textReg.test(expr)){
                 let exptext = expr.replace(textReg,function($0,$1){
                    return $1
                 })
                 
                 // exptext 为 {{message}}表达式中的 message
                 // 解析表达式
                 this.compileText(node, exptext)
              }
          }

      })
       
      // 3. 判断节点类型
      // 1) 属性节点(解析指令)
      // 2) 文本节点(解析指令)

      // 4. 如果还有子节点,递归
    }


    /**
     * @ compileElement: 解析元素指令 v-
     * @ compileText : 解析表达式 {{}}
     */
    compileElement (node) {

        // 1. 获取当前元素节点的所有属性
        let arrs = node.attributes;
        // 2. 遍历当前元素的所有属性
        this.toArray(arrs).forEach((arr) => {
            let arrName = arr.name;
             // 3. 判断属性是不是指令属性
            if(this.isDirective(arrName)){
                // 4. 收集
                let type = arrName.slice(2);
                
                // 符合条件指令的value
                let expr = arr.value

                // 开始数据对应到模板,动态类型
                CompilerUtils[type](node, this.vm, expr)
            }
        })
    }

    compileText (node, exptext) {
        CompilerUtils.text (node, this.vm, exptext)
    }
}

// CompilerUtils
// 解析v-指令
CompilerUtils = {
    text(node, vm, expr){
       // 1. 找到更新对象的更新方法
        let updateFn = this.updater['textUpdater']
       // 2. 执行方法
       updateFn && updateFn(node,vm.$data[expr])
       
       // 通过newValue获取最新数据值,映射到视图
       new Watcher(vm,expr,(newValue) => {
            updateFn && updateFn(node,newValue)
       })
    },

    model(node, vm, expr){
        // 1. 找到更新对象的更新方法
         let updateFn = this.updater['modelUpdater']
        // 2. 执行方法
        updateFn && updateFn(node,vm.$data[expr])

        //为model添加一个订阅者
        new Watcher(vm,expr,(newValue) => {
            updateFn && updateFn(node,newValue)
       })

        // 3. 视图到模型[观察者模式]
        node.addEventListener('input',(e) => {
            let newValue = e.target.value 
            vm.$data[expr] = newValue
        })
     },

    // 定义更新规则
    /**
     * v-text 将数据更新到html
     * v-model 将数据更新到value
     */
    updater:{
        /**
         * @node 节点
         * @value data对应的数据
         */
        textUpdater(node,value){
            node.textContent = value
        },
        modelUpdater(node,value){
            node.value = value
        }
    }
}
