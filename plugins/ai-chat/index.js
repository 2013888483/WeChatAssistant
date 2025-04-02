/**
 * @name AI聊天插件
 * @version 1.0.0
 * @description 提供AI聊天功能，支持多种AI模型
 * @author shuaijin
 */

// 导入模块
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 插件元数据
exports.meta = {
  name: "AI聊天",
  version: "1.0.0",
  description: "提供AI聊天功能，支持多种AI模型",
  author: "shuaijin"
};

// 加载主配置文件
function loadGlobalConfig() {
  try {
    const configPath = path.join(__dirname, '../../config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent);
    }
  } catch (error) {
    console.error('[AI聊天] 加载全局配置文件失败:', error.message);
  }
  return null;
}

// 插件默认配置
exports.defaultConfig = (() => {
  const globalConfig = loadGlobalConfig();
  
  // 如果成功读取了全局配置，使用其中的AI聊天配置
  if (globalConfig && globalConfig.pluginSettings && globalConfig.pluginSettings['ai-chat']) {
    console.log('[AI聊天] 从全局配置文件加载配置');
    return globalConfig.pluginSettings['ai-chat'];
  }
  
  // 否则使用默认配置
  console.log('[AI聊天] 使用默认配置');
  return {
    enabled: true,
    defaultModel: "deepseek",
    models: {
      deepseek: {
        name: "DeepSeek",
        apiKey: "sk-xxxxxxxxxxxxxxxx",
        enabled: true
      },
      siliconflow: {
        name: "SiliconFlow",
        apiKey: "sk-xxxxxxxxxxxxxxxxxxxx",
        enabled: true,
        model: "deepseek-ai/DeepSeek-V3"
      },
      openai: {
        name: "OpenAI",
        apiKey: "",
        enabled: false
      }
    },
    chatTimeout: 7200000 // 聊天记录保存2小时(毫秒)
  };
})();

// 聊天历史记录缓存
const chatHistories = new Map();

// 插件初始化方法
exports.initialize = async function(core, pluginConfig) {
  // 存储core引用和配置
  this.core = core;
  
  // 合并配置 - 如果pluginConfig为空，使用defaultConfig
  this.config = pluginConfig && Object.keys(pluginConfig).length > 0 
    ? pluginConfig 
    : this.defaultConfig;
    
  // 确保有效的模型配置
  if (!this.config.models) {
    console.warn('[AI聊天] 配置中缺少models，使用默认配置');
    this.config.models = this.defaultConfig.models;
  }
  
  // 确保有默认模型
  if (!this.config.defaultModel || !this.config.models[this.config.defaultModel]) {
    console.warn('[AI聊天] 默认模型无效，将使用第一个可用模型');
    const availableModels = Object.keys(this.config.models);
    if (availableModels.length > 0) {
      this.config.defaultModel = availableModels[0];
    } else {
      console.error('[AI聊天] 没有可用的AI模型');
      return false;
    }
  }
  
  // 定期清理过期的聊天历史
  setInterval(() => {
    this.cleanupChatHistories();
  }, 3600000); // 每小时检查一次
  
  console.log(`[AI聊天] 插件已初始化，默认模型: ${this.config.defaultModel}`);
  return true;
};

// 清理过期的聊天历史
exports.cleanupChatHistories = function() {
  const now = Date.now();
  const timeout = this.config.chatTimeout || 7200000;
  
  for (const [userId, history] of chatHistories.entries()) {
    if (now - history.lastUpdate > timeout) {
      chatHistories.delete(userId);
      console.log(`[AI聊天] 已清理用户 ${userId} 的聊天历史`);
    }
  }
};

// 获取或创建用户的聊天历史
function getUserChatHistory(userId) {
  if (!chatHistories.has(userId)) {
    chatHistories.set(userId, {
      messages: [],
      lastUpdate: Date.now(),
      currentModel: null
    });
  }
  
  const history = chatHistories.get(userId);
  history.lastUpdate = Date.now();
  
  return history;
}

// 使用DeepSeek模型聊天
async function chatWithDeepSeek(message, history, apiKey) {
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是一个友好的AI助手，名叫小助手。请用中文回答问题，简明扼要地回复，不要太长。" },
        ...history.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 800
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API调用出错:', error.response?.data || error.message);
    throw new Error(`DeepSeek模型请求失败: ${error.response?.data?.error?.message || error.message}`);
  }
}

// 使用SiliconFlow模型聊天
async function chatWithSiliconFlow(message, history, config) {
  try {
    const response = await axios.post('https://api.siliconflow.cn/v1/chat/completions', {
      model: config.model || "deepseek-ai/DeepSeek-V3",
      messages: [
        { role: "system", content: "你是一个友好的AI助手，名叫小助手。请用中文回答问题，简明扼要地回复，不要太长。" },
        ...history.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 800
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      }
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('SiliconFlow API调用出错:', error.response?.data || error.message);
    throw new Error(`SiliconFlow模型请求失败: ${error.response?.data?.error?.message || error.message}`);
  }
}

// 使用OpenAI模型聊天
async function chatWithOpenAI(message, history, apiKey) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "你是一个友好的AI助手，名叫小助手。请用中文回答问题，简明扼要地回复，不要太长。" },
        ...history.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 800
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API调用出错:', error.response?.data || error.message);
    throw new Error(`OpenAI模型请求失败: ${error.response?.data?.error?.message || error.message}`);
  }
}

// 调用AI聊天
async function chatWithAI(message, userId, modelName, config) {
  // 获取用户的聊天历史
  const historyObj = getUserChatHistory(userId);
  const { messages } = historyObj;
  
  // 如果指定了模型，更新用户当前使用的模型
  if (modelName) {
    historyObj.currentModel = modelName;
  } else if (!historyObj.currentModel) {
    // 如果用户没有设置过模型，使用默认模型
    historyObj.currentModel = config.defaultModel || "deepseek";
  }
  
  // 使用当前模型
  const currentModel = historyObj.currentModel;
  const modelConfig = config.models[currentModel];
  
  if (!modelConfig) {
    throw new Error(`未知的AI模型: ${currentModel}`);
  }
  
  if (!modelConfig.enabled) {
    throw new Error(`AI模型 ${modelConfig.name || currentModel} 已禁用`);
  }
  
  if (!modelConfig.apiKey) {
    throw new Error(`AI模型 ${modelConfig.name || currentModel} 未配置API密钥，请在config.json中配置`);
  }
  
  console.log(`[AI聊天] 使用模型 ${modelConfig.name || currentModel} 回复用户 ${userId}`);
  
  // 根据模型类型调用不同的API
  let reply;
  try {
    switch (currentModel) {
      case 'deepseek':
        reply = await chatWithDeepSeek(message, messages, modelConfig.apiKey);
        break;
      case 'siliconflow':
        reply = await chatWithSiliconFlow(message, messages, modelConfig);
        break;
      case 'openai':
        reply = await chatWithOpenAI(message, messages, modelConfig.apiKey);
        break;
      default:
        throw new Error(`不支持的AI模型类型: ${currentModel}`);
    }
    
    // 更新聊天历史
    messages.push({ role: "user", content: message });
    messages.push({ role: "assistant", content: reply });
    
    // 限制历史记录长度，防止过长
    if (messages.length > 20) {
      messages.splice(0, 2); // 移除最早的一问一答
    }
    
    return reply;
  } catch (error) {
    console.error(`[AI聊天] 模型 ${currentModel} 调用失败: ${error.message}`);
    throw new Error(`AI请求失败: ${error.message}`);
  }
}

// 确保函数被导出
exports.chatWithAI = chatWithAI;

// 清除用户聊天历史
function clearUserChatHistory(userId) {
  if (chatHistories.has(userId)) {
    const history = chatHistories.get(userId);
    history.messages = [];
    history.lastUpdate = Date.now();
    return true;
  }
  return false;
}

// 插件命令列表
exports.commands = [
  {
    name: "chat",
    pattern: /^\/chat (.+)$/,
    description: "与AI进行对话交流",
    handler: async function(sender, match) {
      try {
        const userId = sender.getUserId();
        const message = match[1];
        
        console.log(`[AI聊天] 收到用户 ${userId} 的聊天请求: ${message}`);
        
        // 发送正在思考的提示
        const thinkingMsg = await sender.reply("🤔 小助手正在思考中...");
        
        // 调用AI获取回复
        console.log(`[AI聊天] 准备调用AI模型，用户ID: ${userId}, 配置:`, JSON.stringify(this.config));
        const reply = await chatWithAI(message, userId, null, this.config);
        console.log(`[AI聊天] AI回复: ${reply.substring(0, 100)}${reply.length > 100 ? '...' : ''}`);
        
        // 撤回思考消息并发送回复
        await sender.delMsg(thinkingMsg);
        await sender.reply(reply);
        
        // 记录命令使用统计
        this.core.emit('command_used', { 
          pluginName: 'ai-chat', 
          commandName: 'chat',
          userId: userId,
          model: getUserChatHistory(userId).currentModel
        });
      } catch (error) {
        console.error(`[AI聊天] 处理聊天请求时出错:`, error);
        await sender.reply(`AI聊天失败: ${error.message}`);
      }
    }
  },
  {
    name: "clear",
    pattern: /^\/clear$/,
    description: "清除当前的聊天历史记录",
    handler: async function(sender) {
      const userId = sender.getUserId();
      const result = clearUserChatHistory(userId);
      await sender.reply(result ? "✅ 聊天记录已清除" : "❌ 没有找到聊天记录");
    }
  },
  {
    name: "model_list",
    pattern: /^\/model list$/,
    description: "显示所有可用的AI模型列表",
    handler: async function(sender) {
      const userId = sender.getUserId();
      const models = this.config.models;
      
      // 获取用户当前使用的模型
      const userHistory = getUserChatHistory(userId);
      const currentModel = userHistory.currentModel || this.config.defaultModel;
      
      // 构建模型列表消息
      let reply = "🤖 可用的AI模型列表:\n\n";
      
      for (const [key, model] of Object.entries(models)) {
        const status = model.enabled ? "✅ 已启用" : "❌ 已禁用";
        const current = key === currentModel ? "【当前使用】" : "";
        reply += `${key} (${model.name}) ${status} ${current}\n`;
      }
      
      reply += "\n使用 /model use <model_name> 切换模型";
      
      await sender.reply(reply);
    }
  },
  {
    name: "model_use",
    pattern: /^\/model use (.+)$/,
    description: "切换使用指定的AI模型",
    handler: async function(sender, match) {
      const userId = sender.getUserId();
      const modelName = match[1].toLowerCase();
      
      // 检查模型是否存在
      if (!this.config.models[modelName]) {
        await sender.reply(`❌ 未找到模型 "${modelName}"，使用 /model list 查看可用模型`);
        return;
      }
      
      // 检查模型是否启用
      if (!this.config.models[modelName].enabled) {
        await sender.reply(`❌ 模型 "${modelName}" 已被禁用`);
        return;
      }
      
      // 检查模型API密钥是否配置
      if (!this.config.models[modelName].apiKey) {
        await sender.reply(`❌ 模型 "${modelName}" 未配置API密钥`);
        return;
      }
      
      // 更新用户的模型设置
      const history = getUserChatHistory(userId);
      history.currentModel = modelName;
      
      await sender.reply(`✅ 已切换到 ${this.config.models[modelName].name} 模型`);
    }
  },
  {
    name: "model_config",
    pattern: /^\/model config (.+) (.+) (.+)$/,
    description: "配置AI模型参数(模型名 参数名 参数值)",
    handler: async function(sender, match) {
      const isAdmin = await sender.isAdmin();
      if (!isAdmin) {
        await sender.reply("❌ 只有管理员可以配置模型参数");
        return;
      }
      
      const modelName = match[1].toLowerCase();
      const paramName = match[2].toLowerCase();
      const paramValue = match[3];
      
      // 检查模型是否存在
      if (!this.config.models[modelName]) {
        await sender.reply(`❌ 未找到模型 "${modelName}"`);
        return;
      }
      
      // 更新模型参数
      try {
        switch (paramName) {
          case 'apikey':
            this.config.models[modelName].apiKey = paramValue;
            break;
          case 'enabled':
            this.config.models[modelName].enabled = paramValue.toLowerCase() === 'true';
            break;
          case 'model':
            if (modelName === 'siliconflow') {
              this.config.models[modelName].model = paramValue;
            } else {
              await sender.reply(`❌ 模型 "${modelName}" 不支持自定义模型类型`);
              return;
            }
            break;
          default:
            await sender.reply(`❌ 未知的参数 "${paramName}"`);
            return;
        }
        
        // 保存配置
        try {
          // 尝试使用事件来更新全局配置
          await this.core.emit('config_updated', { 
            pluginName: 'ai-chat', 
            config: this.config
          });
          
          // 同时更新全局配置文件
          const globalConfig = loadGlobalConfig();
          if (globalConfig) {
            if (!globalConfig.pluginSettings) {
              globalConfig.pluginSettings = {};
            }
            globalConfig.pluginSettings['ai-chat'] = this.config;
            
            // 保存更新后的全局配置
            const configPath = path.join(__dirname, '../../config.json');
            fs.writeFileSync(configPath, JSON.stringify(globalConfig, null, 2), 'utf8');
            console.log('[AI聊天] 已更新全局配置文件');
          }
          
          await sender.reply(`✅ 已更新模型 ${this.config.models[modelName].name || modelName} 的 ${paramName} 参数`);
        } catch (saveError) {
          console.error('[AI聊天] 保存配置失败:', saveError);
          await sender.reply(`⚠️ 已更新内存中的配置，但保存配置文件失败: ${saveError.message}`);
        }
      } catch (error) {
        await sender.reply(`❌ 配置更新失败: ${error.message}`);
      }
    }
  }
];

// 插件卸载方法
exports.unload = async function() {
  // 清理资源
  chatHistories.clear();
  console.log('[AI聊天] 插件已卸载');
  return true;
}; 
