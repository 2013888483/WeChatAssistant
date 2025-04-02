# 微信智能助手插件系统

微信智能助手插件系统是一个模块化、可扩展的框架，允许通过插件形式添加新功能，而不是直接修改核心代码。

## 架构设计

该系统采用以下架构：

1. **核心模块**：`core.js` - 负责插件加载、管理和消息路由
2. **插件加载器**：`plugin-loader.js` - 负责初始化插件目录和监控插件变化
3. **配置系统**：`config.json` - 全局配置文件，管理插件启用状态和参数
4. **插件目录**：`plugins/` - 包含所有功能插件，每个插件有自己的目录

## 配置驱动设计

所有功能都通过配置文件驱动，而非硬编码实现：

1. 全局配置文件 (`config.json`) 控制启用哪些插件
2. 每个插件有自己的默认配置
3. 配置可通过Web界面或命令修改
4. 配置变更自动通知相关插件

## 插件接口

每个插件必须实现以下接口：

```javascript
module.exports = {
  // 插件元数据
  meta: {
    name: "插件名称",
    version: "1.0.0",
    description: "插件描述",
    author: "作者"
  },
  
  // 默认配置
  defaultConfig: {
    // 插件配置项
  },
  
  // 初始化函数
  initialize: async function(core, pluginConfig) {
    // 初始化代码
    return true;
  },
  
  // 命令列表
  commands: [
    {
      name: "command_name",
      pattern: /^\/command (.+)$/,
      handler: async function(sender, match) {
        // 处理命令
      }
    }
  ],
  
  // 卸载函数
  unload: async function() {
    // 清理代码
    return true;
  }
};
```

## 当前插件

系统默认包含以下插件：

1. **天气插件**：提供天气查询功能
   - `/weather 城市名` - 查询实时天气
   - `/forecast 城市名` - 查询天气预报

2. **AI聊天插件**：提供AI对话功能
   - `/chat 内容` - 与AI对话
   - `/model list` - 列出可用AI模型
   - `/model use 模型名` - 切换AI模型
   - `/model config 模型名 参数名 参数值` - 配置AI模型参数
   - `/clear` - 清除聊天历史

3. **其他插件**：根据需求可以添加更多插件

## 添加新插件

添加新插件的步骤：

1. 在 `plugins/` 目录下创建新的插件目录
2. 创建 `index.js` 并实现插件接口
3. 可选：创建 `config.json` 配置文件
4. 在全局配置中启用插件

## 插件管理命令

管理员可以使用以下命令管理插件：

- `/plugins list` - 列出所有插件
- `/plugins enable 插件名` - 启用插件
- `/plugins disable 插件名` - 禁用插件
- `/plugins reload 插件名` - 重新加载插件

## 开发新插件

请参考 `plugins/example` 目录中的示例插件，了解如何创建新插件。

## 注意事项

1. 插件之间通过事件机制通信，避免直接依赖
2. 配置更改会自动保存到数据库
3. 代码变更会自动重新加载插件
4. 请勿直接修改核心模块，应通过插件扩展功能 