class Element {
    constructor(tagName, attributes = {}, children = []) {
        this.tagName = tagName
        this.attributes = attributes
        this.children = children
    }

    render() {
        let element = document.createElement(this.tagName)

        let attributes = this.attributes
        for (let key in attributes) {
            setAttribute(element, key, attributes[key])
        }

        let children = this.children
        children.forEach(child => {
            let childElement = child instanceof Element ? child.render() : document.createTextNode(child)
            element.appendChild(childElement)
        })

        return element
    }
}

const setAttribute = (node, key, value) => {
    switch (key) {
        case 'style':
            node.style.cssText = value
            break;
        case 'value':
            let tagName = node.tagName || ''
            tagName = tagName.toLowerCase()
            if (tagName === 'input' || tagName === 'textarea') {
                node.value = value
            } else {
                node.setAttribute(key, value)
            }
            break
        default:
            node.setAttribute(key, value)
    }
}

/**
 * 生成虚拟DOM
 * @param {*} tagName DOM标签类型
 * @param {*} attributes DOM节点属性对象
 * @param {*} children DOM子节点集合
 * @returns 虚拟DOM实例
 */
function element(tagName, attributes, children) {
    return new Element(tagName, attributes, children)
}

const renderDom = (element, target) => {
    target.appendChild(element)
}

const chapterListVirtualDom = element('ul', { id: 'list' }, [
    element('li', { class: 'chapter' }, ['chapter1']),
    element('li', { class: 'chapter' }, ['chapter2']),
    element('li', { class: 'chapter' }, ['chapter3'])
])

const dom = chapterListVirtualDom.render()

// 虚拟DOM渲染为真实DOM，并挂载到页面上
renderDom(dom, document.body)

/**
 * 虚拟DOM比对
 * @param {*} oldVirtualDom 旧虚拟DOM
 * @param {*} newVirtualDom 新虚拟DOM
 * @returns 最小化差异集合
 */
const diff = (oldVirtualDom, newVirtualDom) => {
    let patches = {}
    walkToDiff(oldVirtualDom, newVirtualDom, initialIndex, patches)
    return patches
}

let initialIndex = 0 // 用于patch计数

const walkToDiff = (oldVirtualDom, newVirtualDom, index, patches) => {
    let diffResult = []

    if (!newVirtualDom) {
        diffResult.push({
            type: 'REMOVE',
        })
    }

    else if (!oldVirtualDom) {
        // 暂时忽略增加节点情况
    }

    else if (typeof oldVirtualDom === 'string' && typeof newVirtualDom === 'string') {
        if (oldVirtualDom !== newVirtualDom) {
            diffResult.push({
                type: 'MODIFY_TEXT',
                data: newVirtualDom,
            })
        }
    }

    else if (oldVirtualDom.tagName === newVirtualDom.tagName) {
        let diffAttributeResult = {}

        for (let key in oldVirtualDom) {
            if (oldVirtualDom[key] !== newVirtualDom[key]) {
                // 这里的比较是存在问题的，attributes和children是对象，即使无变化也会计入
                diffAttributeResult[key] = newVirtualDom[key]
            }
        }

        for (let key in newVirtualDom) {
            if (!oldVirtualDom.hasOwnProperty(key)) {
                diffAttributeResult[key] = newVirtualDom[key]
            }
        }

        if (Object.keys(diffAttributeResult).length > 0) {
            diffResult.push({
                type: 'MODIFY_ATTRIBUTES',
                diffAttributeResult
            })
        }

        oldVirtualDom.children.forEach((child, index) => {
            walkToDiff(child, newVirtualDom.children[index], ++initialIndex, patches)
        });
    }

    else {
        diffResult.push({
            type: 'REPLACE',
            newVirtualDom
        })
    }

    if (diffResult.length) {
        patches[index] = diffResult
    }
}

const chapterListVirtualDomNew = element('ul', { id: 'list-new' }, [
    element('li', { class: 'chapter-new' }, ['chapter1-new']),
    element('li', { class: 'chapter-new', style: 'color:blue' }, ['chapter2-new']),
    element('h1', { class: 'chapter-new' }, ['chapter3-new']),
])

// 计算虚拟DOM差异
const patches = diff(chapterListVirtualDom, chapterListVirtualDomNew)

/**
 * 最小化差异应用
 * @param {*} node 待更新的真实DOM节点
 * @param {*} patches 最小化差异集合
 */
const patch = (node, patches) => {
    let walker = { index: 0 }
    walk(node, walker, patches)
}

const walk = (node, walker, patches) => {
    let currentPatch = patches[walker.index]
    let childNodes = node.childNodes
    childNodes.forEach(child => {
        walker.index++
        walk(child, walker, patches)
    })
    if (currentPatch) {
        doPatch(node, currentPatch)
    }
}

const doPatch = (node, patches) => {
    patches.forEach(patch => {
        switch (patch.type) {
            case 'MODIFY_ATTRIBUTES':
                const attributes = patch.diffAttributeResult.attributes
                for (let key in attributes) {
                    if (node.nodeType !== 1) return
                    const value = attributes[key]
                    if (value != undefined) {
                        setAttribute(node, key, value)
                    } else {
                        node.removeAttribute(key)
                    }
                }
                break
            case 'MODIFY_TEXT':
                node.textContent = patch.data
                break
            case 'REPLACE':
                let { newVirtualDom } = patch
                let newNode = (newVirtualDom instanceof Element) ? newVirtualDom.render() : document.createTextNode(newVirtualDom)
                node.parentNode.replaceChild(newNode, node)
                break
            case 'REMOVE':
                node.parentNode.removeChild(node)
                break
        }
    })
}

// 完成虚拟DOM差异更新
patch(document.getElementById('list'), patches)
