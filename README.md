# 微信智能助手插件系统

一个为无界BNCR框架设计的模块化、可扩展的微信智能助手插件系统，支持天气查询、AI聊天、API工具箱等多种功能。

## 主要功能

- 🌤️ **天气服务**：查询实时天气和天气预报，自动提供AI生活建议
- 🤖 **AI聊天**：支持多种AI模型（DeepSeek、SiliconFlow、OpenAI等）
- 🔧 **API工具箱**：提供各种实用API服务，包括搞笑图片、一言等
- ⏱️ **早报提醒**：每日定时推送信息
- 🚀 **网速测试**：测试AI接口响应速度
- 🔒 **权限管理**：基本的管理员权限控制
- 🔄 **多种插件兼容**：支持函数式和对象式两种插件导出格式

## 安装方法

### 前置要求

- 无界BNCR框架环境
- Node.js (建议v14.0.0+)

### 安装步骤

1. 进入无界BNCR插件目录新建文件夹WeChatAssistant

2. 克隆仓库，将本仓库所有代码放置到文件夹中
```bash
git clone https://github.com/2013888483/WeChatAssistant.git
```

3. 去插件配置页面配置参数
4. 重启无界BNCR服务，插件将自动加载

## 使用方法

### 基础命令

- `/help` - 显示帮助信息
- `/plugins list` - 列出所有可用插件 (需管理员权限)
- `/plugins enable <插件名>` - 启用指定插件 (需管理员权限)
- `/plugins disable <插件名>` - 禁用指定插件 (需管理员权限)
- `/plugins reload <插件名>` - 重新加载插件 (需管理员权限)
- `/admin list` - 查看当前管理员列表 (需管理员权限)
- `/admin add <用户ID>` - 添加新管理员 (需管理员权限)
- `/admin remove <用户ID>` - 移除管理员 (需管理员权限)

### 天气服务

- `/天气 <城市名>` 或 `/weather <城市名>` - 查询指定城市的实时天气
- `/天气配置` 或 `/weather_config` - 查看当前天气服务配置
- `/天气配置 set api <API类型>` - 设置天气API类型（amap或openweather）
- `/天气配置 set key <API密钥>` - 设置API密钥
- `/天气配置 set defaultCity <城市名>` - 设置默认城市
- `/天气配置 set showAIAdvice <true/false>` - 设置是否显示AI生活建议

### AI聊天

- `/chat <内容>` - 与AI对话
- `/model list` - 查看可用AI模型
- `/model use <模型名>` - 切换AI模型
- `/model config <模型名> <参数名> <参数值>` - 设置模型参数

### API工具箱

- `/api list` - 列出所有可用API
- `/api <API名称> <参数>` - 调用指定API

### 早报提醒

- `/morning on` - 开启每日早报
- `/morning off` - 关闭每日早报
- `/morning time <时间>` - 设置早报时间，格式如 07:30

可以执行插件管理和系统管理命令

## 插件机制

该系统支持两种插件导出格式：

### 1. 对象式导出 (推荐)

```javascript
// 对象式导出
exports.meta = {
  name: "插件名称",
  version: "1.0.0",
  description: "插件描述",
  author: "作者"
};

// 添加标记，表明这是正确支持的导出格式
exports.exportFormat = "object";

// 插件默认配置
exports.defaultConfig = {
  enabled: true,
  // 其他配置项
};

// 初始化config属性
exports.config = exports.defaultConfig;

// 插件初始化方法
exports.initialize = async function(core, pluginConfig) {
  // 插件初始化代码
  return true;
};

// 命令处理
exports.onMessage = async function(message) {
  // 消息处理代码
  return response;
};

// 自定义方法
exports.customMethod = async function() {
  // 自定义功能
};

// 卸载函数
exports.unload = async function() {
  // 清理代码
  return true;
};
```

### 2. 函数式导出 (兼容模式)

```javascript
// 函数式导出
module.exports = async function(core, pluginConfig) {
  return {
    name: "插件名称",
    description: "插件描述",
    commands: [
      {
        command: /^\/command/,
        handler: async (message, sender) => {
          // 处理逻辑
          return '响应';
        }
      }
    ],
    initialize: async () => {
      // 初始化逻辑
      return true;
    },
    // 其他方法
  };
};
```

系统会自动识别插件的导出格式并正确处理。

## 新增功能

### 1. 模拟天气数据

当未配置天气API密钥时，天气插件会自动返回模拟天气数据，方便测试和演示。模拟数据包括：
- 当前温度、天气状况、风向和湿度
- 未来3天的天气预报
- 使用说明提示

### 2. AI生活建议

天气服务现在会根据天气情况自动提供AI生活建议，包括：
- 穿着建议
- 出行建议
- 健康提示

即使未安装AI聊天插件，系统也会使用内置逻辑生成基本的生活建议。

### 3. 插件兼容性增强

智能助手现在支持多种插件导出格式，提高了与第三方插件的兼容性：
- 对象式导出（直接导出属性和方法）
- 函数式导出（返回插件对象的函数）

## 自定义开发

您可以通过开发新插件来扩展系统功能：

1. 在 `plugins/` 目录下创建新的插件目录
2. 实现上述插件结构（对象式或函数式）
3. 在 `config.json` 的 `enabledPlugins` 数组中添加插件名称
4. 修改智能助手.js中的@rule规则
5. 重启无界BNCR框架或使用 `/plugins reload <插件名>` 命令加载插件

## 权限管理系统

当前系统实现了基本的权限管理机制，主要通过`config.json`文件中的`adminUsers`数组配置：

```json
{
  "adminUsers": ["wxid_ao7xxx0iz3m822", "user123"]
}
```

### 管理员权限

拥有管理员权限的用户可以执行以下操作：
- 插件管理（启用/禁用/重载）
- 管理员用户管理（添加/删除管理员）
- 修改全局配置
- 执行特权命令

### 权限相关命令

- `/admin list` - 查看当前管理员列表（仅管理员可用）
- `/admin add <用户ID>` - 添加管理员（仅管理员可用）
- `/admin remove <用户ID>` - 移除管理员（仅管理员可用）

### 权限系统实现

权限系统基于`permission-manager.js`模块实现，该模块提供了以下功能：
- 从`config.json`文件加载管理员列表
- 提供管理员身份验证
- 管理员添加和移除
- 保存权限更改到配置文件

权限检查已集成到所有需要管理员权限的命令中，未授权用户将收到权限不足的提示。

## 更新日志

### 2023年4月3日
- 修复了天气配置命令不能正常工作的问题
- 增强了系统对core对象的获取方式，提高了稳定性
- 优化了天气插件配置保存逻辑，增加了多重备选方案
- 解决了"Cannot read properties of undefined (reading 'core')"错误

### 1. 错误修复

- 解决了智能助手.js中core对象undefined导致的配置保存失败问题
- 增加了多路径获取core对象的逻辑，提高了系统健壮性
- 修复了天气插件中saveConfig函数的调用问题

### 2. 系统增强

- 优化了插件通信机制，提高了跨插件调用的稳定性
- 改进了配置保存逻辑，即使在core对象不可用的情况下也能保持基本功能
- 添加了更详细的错误日志，便于排查问题

## 故障排除

### 插件无法加载

1. 检查插件结构是否符合规范
2. 确认插件在 `enabledPlugins` 列表中
3. 查看日志输出，确认错误信息
4. 使用 `/plugins reload <插件名>` 尝试重新加载

### 天气插件返回错误

1. 检查API密钥是否已配置
   - 使用 `/天气配置 set key <您的密钥>` 设置API密钥
   - 无API密钥也可获取模拟数据
2. 确认城市名称是否正确
3. 验证API类型设置（amap或openweather）

### API工具箱调用失败

1. 确认API配置是否正确
2. 检查API endpoints是否可访问
3. 查看网络连接是否正常
4. 使用 `/api list` 确认API是否启用

### 权限问题

1. 使用 `/admin list` 确认管理员列表
2. 检查您的用户ID是否在管理员列表中


## 常见问题

**Q: 如何添加新的管理员？**  
A: 有两种方法：
   1. 使用命令：管理员可以执行 `/admin add wxid_xxx` 命令添加新管理员
   2. 编辑配置：修改 `config.json` 文件，在 `adminUsers` 数组中添加用户ID，格式: `"adminUsers": ["wxid_ao7xxx0iz3m822"]`

**Q: 插件不工作怎么办？**  
A: 检查以下几点：
1. 确认插件在 `enabledPlugins` 列表中
2. 查看插件配置是否正确（特别是API密钥）
3. 使用 `/plugins reload <插件名>` 重新加载插件（需管理员权限）
4. 检查无界BNCR的日志输出

**Q: 如何更新插件系统？**  
A: 进入插件目录，执行 `git pull` 拉取最新代码，然后重启无界BNCR框架。

**Q: 提示您没有管理员权限**  
A: 进入config.json配置adminUsers，格式: "adminUsers": ["wxid_ao7xxx0iz3m822"]

**Q: 天气查询没有生活建议怎么办？**  
A: 有两种方法开启AI生活建议：
   1. 使用命令：执行 `/天气配置 set showAIAdvice true` 开启生活建议功能
   2. 编辑配置：在 `config.json` 中设置 `weather.showAIAdvice` 为 `true`

**Q: 使用不同的插件导出格式有什么影响？**  
A: 智能助手支持两种插件格式：
   1. 对象式导出：更简洁，直接导出属性和方法，推荐新插件使用
   2. 函数式导出：兼容模式，适用于一些旧插件或特殊需求场景

## 免责声明

本项目仅供学习和个人使用，请遵守相关法律法规和微信使用条款。

## 许可证

本项目采用 MIT 许可证。 