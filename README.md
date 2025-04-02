# 微信智能助手插件系统

一个为无界BNCR框架设计的模块化、可扩展的微信智能助手插件系统，支持天气查询、AI聊天、API工具箱等多种功能。

## 主要功能

- 🌤️ **天气服务**：查询实时天气和天气预报
- 🤖 **AI聊天**：支持多种AI模型（DeepSeek、SiliconFlow、OpenAI等）
- 🔧 **API工具箱**：提供各种实用API服务
- ⏱️ **早报提醒**：每日定时推送信息
- 🚀 **网速测试**：测试AI接口响应速度

## 安装方法

### 前置要求

- 无界BNCR框架环境
- Node.js (建议v14.0.0+)

### 安装步骤

1. 进入无界BNCR插件目录
```bash
cd /path/to/无界BNCR/plugin/
```

2. 克隆仓库
```bash
git clone https://github.com/2013888483/WeChatAssistant.git
cd WeChatAssistant
```

3. 配置文件设置
```bash
# 创建配置文件
cp config.example.json config.json

# 编辑配置文件，填入API密钥等信息
nano config.json
```

4. 重启无界BNCR服务，插件将自动加载

## 使用方法

### 基础命令

- `/help` - 显示帮助信息
- `/plugins list` - 列出所有可用插件
- `/plugins enable <插件名>` - 启用指定插件
- `/plugins disable <插件名>` - 禁用指定插件
- `/plugins reload <插件名>` - 重新加载插件

### 天气服务

- `/天气 <城市名>` 或 `/weather <城市名>` - 查询指定城市的实时天气
- `/天气配置` 或 `/weather_config` - 查看当前天气服务配置
- `/天气配置 set api <API类型>` - 设置天气API类型（amap或openweather）
- `/天气配置 set key <API密钥>` - 设置API密钥
- `/天气配置 set defaultCity <城市名>` - 设置默认城市

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

## 配置文件说明

`config.json` 文件用于存储插件系统的全局配置，包括：

```json
{
  "enabledPlugins": ["weather", "ai-chat", "morning-alert", "api-toolkit", "api-speedtest"],
  "pluginSettings": {
    "weather": {
      "api": "amap",
      "key": "YOUR_API_KEY",
      "defaultCity": "北京"
    },
    "ai-chat": {
      "defaultModel": "deepseek",
      "models": {
        "deepseek": {
          "name": "DeepSeek",
          "apiKey": "YOUR_API_KEY",
          "enabled": true
        },
        "siliconflow": {
          "name": "SiliconFlow",
          "apiKey": "YOUR_API_KEY",
          "enabled": true,
          "model": "deepseek-ai/DeepSeek-V3"
        },
        "openai": {
          "name": "OpenAI",
          "apiKey": "",
          "enabled": false
        }
      }
    },
    "morning-alert": {
      "enabled": true,
      "time": "07:00"
    }
  },
  "adminUsers": []
}
```

说明：
- `enabledPlugins`: 已启用的插件列表
- `pluginSettings`: 各插件的具体配置
- `adminUsers`: 管理员用户ID列表，可以使用管理员命令

## 插件机制

该系统采用模块化插件设计，每个插件都符合以下结构：

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
    // 插件初始化代码
    return true;
  },
  
  // 命令处理
  onMessage: async function(message) {
    // 消息处理代码
    return response;
  },
  
  // 卸载函数
  unload: async function() {
    // 清理代码
    return true;
  }
};
```

## 自定义开发

您可以通过开发新插件来扩展系统功能：

1. 在 `plugins/` 目录下创建新的插件目录
2. 实现上述插件结构
3. 在 `config.json` 的 `enabledPlugins` 数组中添加插件名称
4. 重启无界BNCR框架或使用 `/plugins reload <插件名>` 命令加载插件

## 常见问题

**Q: 如何添加新的管理员？**  
A: 编辑 `config.json` 文件，在 `adminUsers` 数组中添加用户ID。

**Q: 插件不工作怎么办？**  
A: 检查以下几点：
1. 确认插件在 `enabledPlugins` 列表中
2. 查看插件配置是否正确（特别是API密钥）
3. 使用 `/plugins reload <插件名>` 重新加载插件
4. 检查无界BNCR的日志输出

**Q: 如何更新插件系统？**  
A: 进入插件目录，执行 `git pull` 拉取最新代码，然后重启无界BNCR框架。

## 免责声明

本项目仅供学习和个人使用，请遵守相关法律法规和微信使用条款。

## 许可证

本项目采用 MIT 许可证。 