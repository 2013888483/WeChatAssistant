/**
 * @name AI模型测速插件
 * @version 1.0.0
 * @description 测试多个AI模型的响应速度并自动选择最快模型
 * @author shuaijin
 */

// 插件元数据
exports.meta = {
  name: "AI模型测速",
  version: "1.0.0",
  description: "测试多个AI模型的响应速度并自动选择最快模型",
  author: "shuaijin"
};

// 插件默认配置
exports.defaultConfig = {
  enabled: true,
  testInterval: 3600000, // 默认每小时测试一次 (毫秒)
  testPrompt: "用一句话简明扼要地回答：今天天气好吗？", // 测试用的提问
  testTimeout: 15000, // 测试超时时间 (毫秒)
  autoSwitch: true, // 是否自动切换到最快的模型
  skipDisabled: true, // 是否跳过已禁用的模型
  excludeModels: [], // 要排除的模型列表
  currentFastest: null, // 当前最快的模型
  lastTestTime: 0, // 上次测试时间
  testResults: {} // 测试结果
};

// 定时任务
let speedTestInterval = null;

// 插件初始化方法
exports.initialize = async function(core, pluginConfig) {
  // 存储core引用和配置
  this.core = core;
  this.config = pluginConfig;
  
  // 如果已经有最快模型的记录，直接设置
  if (this.config.currentFastest && this.config.autoSwitch) {
    console.log(`[AI模型测速] 使用上次测试结果：${this.config.currentFastest}是最快的模型`);
  }
  
  // 设置定时测速任务
  this.setupSpeedTest();
  
  // 输出调试信息
  console.log('[AI模型测速] 插件已初始化');
  console.log('[AI模型测速] 可用插件列表:', Array.from(core.plugins.keys()).join(', '));
  
  // 尝试获取ai-chat插件
  const aiChatPlugin = core.plugins.get('ai-chat');
  if (aiChatPlugin) {
    console.log('[AI模型测速] 成功找到AI聊天插件');
  } else {
    console.warn('[AI模型测速] 警告: 未找到AI聊天插件，请确保ai-chat插件已加载');
    // 尝试其他可能的名称
    const possibleNames = ['ai-chat', 'ai_chat', 'ai.chat', 'aichat', 'AI-chat', 'ai'];
    for (const name of possibleNames) {
      if (core.plugins.has(name)) {
        console.log(`[AI模型测速] 发现可能的AI聊天插件: ${name}`);
      }
    }
  }
  
  return true;
};

// 设置定时测速任务
exports.setupSpeedTest = function() {
  // 清除现有的定时任务
  if (speedTestInterval) {
    clearInterval(speedTestInterval);
  }
  
  // 设置新的定时任务
  speedTestInterval = setInterval(() => {
    this.runSpeedTest();
  }, this.config.testInterval);
  
  console.log(`[AI模型测速] 已设置定时测速任务，间隔 ${this.config.testInterval / 60000} 分钟`);
};

// 获取可测试的AI模型列表
function getTestableModels(aiConfig, testConfig) {
  const result = [];
  const { skipDisabled, excludeModels } = testConfig;
  
  // 确保aiConfig和aiConfig.models存在
  if (!aiConfig || !aiConfig.models) {
    console.log(`[AI模型测速] AI配置或模型配置不存在`);
    return result;
  }
  
  // 检查是否使用数组格式的模型配置
  if (Array.isArray(aiConfig.models)) {
    // 处理数组格式
    for (const modelConfig of aiConfig.models) {
      const modelName = modelConfig.id; // 使用id作为模型名称
      
      // 检查模型是否要排除
      if (excludeModels.includes(modelName)) {
        console.log(`[AI模型测速] 模型 ${modelName} 在排除列表中，跳过测试`);
        continue;
      }
      
      // 检查模型是否已禁用且需要跳过
      if (skipDisabled && !(modelConfig.enable || modelConfig.enabled)) {
        console.log(`[AI模型测速] 模型 ${modelName} 已禁用，跳过测试`);
        continue;
      }
      
      // 检查模型是否有API密钥
      if (!modelConfig.apiKey) {
        console.log(`[AI模型测速] 模型 ${modelName} 未配置API密钥，跳过测试`);
        continue;
      }
      
      // 添加到可测试模型列表
      result.push(modelName);
    }
  } else {
    // 处理对象格式（旧格式）
    for (const [modelName, modelConfig] of Object.entries(aiConfig.models)) {
      // 检查模型是否要排除
      if (excludeModels.includes(modelName)) {
        console.log(`[AI模型测速] 模型 ${modelName} 在排除列表中，跳过测试`);
        continue;
      }
      
      // 检查模型是否已禁用且需要跳过
      if (skipDisabled && !(modelConfig.enable || modelConfig.enabled)) {
        console.log(`[AI模型测速] 模型 ${modelName} 已禁用，跳过测试`);
        continue;
      }
      
      // 检查模型是否有API密钥
      if (!modelConfig.apiKey) {
        console.log(`[AI模型测速] 模型 ${modelName} 未配置API密钥，跳过测试`);
        continue;
      }
      
      // 添加到可测试模型列表
      result.push(modelName);
    }
  }
  
  return result;
}

// 运行模型测速
exports.runSpeedTest = async function(sender = null) {
  try {
    console.log(`[AI模型测速] 开始测速测试，sender:`, sender ? '用户触发' : '自动触发');
    console.log(`[AI模型测速] 可用插件列表:`, Array.from(this.core.plugins.keys()).join(', '));
    
    // 获取AI插件 - 尝试多个可能的名称
    let aiChatPlugin = null;
    const possibleNames = ['ai-chat', 'ai_chat', 'ai.chat', 'aichat', 'AI-chat', 'ai'];
    
    for (const name of possibleNames) {
      const plugin = this.core.plugins.get(name);
      if (plugin?.instance) {
        aiChatPlugin = plugin.instance;
        console.log(`[AI模型测速] 使用插件名称 "${name}" 找到AI聊天插件`);
        break;
      }
    }
    
    if (!aiChatPlugin) {
      const error = "AI聊天插件未加载或不可用";
      console.error(`[AI模型测速] ${error}`);
      if (sender) await sender.reply(`❌ ${error}`);
      return;
    }
    
    // 确保chatWithAI函数存在并且可以调用
    if (typeof aiChatPlugin.chatWithAI !== 'function') {
      console.error(`[AI模型测速] AI聊天插件结构:`, Object.keys(aiChatPlugin));
      
      // 查找可能的聊天方法
      let chatMethod = null;
      for (const key of Object.keys(aiChatPlugin)) {
        if (typeof aiChatPlugin[key] === 'function' && 
            (key.includes('chat') || key.includes('talk') || key.includes('ask'))) {
          chatMethod = key;
          console.log(`[AI模型测速] 发现可能的聊天方法: ${key}`);
        }
      }
      
      const error = `AI聊天插件的chatWithAI方法不可用${chatMethod ? `，但找到可能的方法: ${chatMethod}` : ''}`;
      console.error(`[AI模型测速] ${error}`);
      if (sender) await sender.reply(`❌ ${error}`);
      return;
    }
    
    // 获取AI配置
    const aiConfig = aiChatPlugin.config;
    if (!aiConfig) {
      const error = "AI聊天插件配置不可用";
      console.error(`[AI模型测速] ${error}`);
      if (sender) await sender.reply(`❌ ${error}`);
      return;
    }
    
    console.log(`[AI模型测速] AI配置加载成功，配置项:`, Object.keys(aiConfig));
    
    // 检查模型配置
    if (!aiConfig.models) {
      console.log(`[AI模型测速] 警告: 未找到models配置，尝试自动填充默认模型`);
      
      // 尝试使用defaultModel创建一个临时模型配置
      if (aiConfig.defaultModel) {
        // 创建临时模型配置
        if (Array.isArray(aiConfig.models)) {
          aiConfig.models = [
            {
              id: aiConfig.defaultModel,
              name: aiConfig.defaultModel,
              enable: true,
              enabled: true, // 兼容旧版本
              apiKey: '已配置' // 假设已经在内部配置
            }
          ];
        } else {
          aiConfig.models = {
            [aiConfig.defaultModel]: { 
              enable: true,
              enabled: true, // 兼容旧版本
              apiKey: '已配置' // 假设已经在内部配置
            }
          };
        }
        console.log(`[AI模型测速] 使用默认模型创建临时配置: ${aiConfig.defaultModel}`);
      } else {
        const error = "AI聊天插件缺少模型配置";
        console.error(`[AI模型测速] ${error}`);
        if (sender) await sender.reply(`❌ ${error}`);
        return;
      }
    }
    
    // 从AI聊天插件配置中获取可测试的模型
    const modelsToTest = getTestableModels(aiConfig, this.config);
    
    if (modelsToTest.length === 0) {
      const error = "没有可用的模型可供测试";
      console.error(`[AI模型测速] ${error}`);
      if (sender) await sender.reply(`❌ ${error}`);
      return;
    }
    
    // 如果是手动触发，发送测试开始消息
    let statusMsg = null;
    if (sender) {
      statusMsg = await sender.reply(`🔍 开始测试模型响应速度: ${modelsToTest.join(', ')}...`);
    }
    
    console.log(`[AI模型测速] 开始测试模型响应速度: ${modelsToTest.join(', ')}`);
    
    // 测试结果
    const results = {};
    
    // 测试每个模型
    for (const modelName of modelsToTest) {
      try {
        console.log(`[AI模型测速] 测试模型: ${modelName}`);
        
        // 测试响应时间
        const startTime = Date.now();
        
        // 设置超时处理
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('请求超时')), this.config.testTimeout);
        });
        
        // 使用一个唯一的用户ID，避免使用聊天历史的缓存
        const testUserId = `speedtest_${Date.now()}`;
        console.log(`[AI模型测速] 使用测试用户ID: ${testUserId}`);
        
        // 正确调用chatWithAI
        // 确保使用正确的上下文(this)，绑定到aiChatPlugin
        const chatWithAIBound = aiChatPlugin.chatWithAI.bind(aiChatPlugin);
        
        console.log(`[AI模型测速] 准备调用chatWithAI，prompt: "${this.config.testPrompt.substring(0, 30)}..."`);
        
        // 发送请求
        const responsePromise = chatWithAIBound(
          this.config.testPrompt, 
          testUserId,
          modelName, 
          aiConfig
        );
        
        // 等待响应或超时
        const response = await Promise.race([responsePromise, timeoutPromise]);
        console.log(`[AI模型测速] 收到响应: "${response.substring(0, 30)}..."`);
        
        // 计算响应时间
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // 记录结果
        results[modelName] = {
          responseTime,
          status: 'success',
          message: `响应时间: ${responseTime}ms`
        };
        
        console.log(`[AI模型测速] 模型 ${modelName} 响应时间: ${responseTime}ms`);
      } catch (error) {
        // 记录错误
        results[modelName] = {
          responseTime: Infinity,
          status: 'error',
          message: error.message || '未知错误'
        };
        
        console.error(`[AI模型测速] 模型 ${modelName} 测试失败:`, error.message || '未知错误');
      }
    }
    
    // 找出响应最快的模型
    let fastestModel = null;
    let fastestTime = Infinity;
    
    for (const [modelName, result] of Object.entries(results)) {
      if (result.status === 'success' && result.responseTime < fastestTime) {
        fastestModel = modelName;
        fastestTime = result.responseTime;
      }
    }
    
    // 更新配置
    this.config.testResults = results;
    this.config.lastTestTime = Date.now();
    
    // 如果找到最快的模型
    if (fastestModel) {
      this.config.currentFastest = fastestModel;
      console.log(`[AI模型测速] 最快的模型是: ${fastestModel} (${fastestTime}ms)`);
      
      // 如果启用了自动切换，设置为默认模型
      if (this.config.autoSwitch) {
        try {
          const originalDefault = aiConfig.defaultModel;
          aiConfig.defaultModel = fastestModel;
          
          // 保存AI插件配置
          await this.core.emit('config_updated', { 
            pluginName: 'ai-chat', 
            config: aiConfig
          });
          
          console.log(`[AI模型测速] 已将默认模型从 ${originalDefault} 切换为 ${fastestModel}`);
        } catch (error) {
          console.error(`[AI模型测速] 更新默认模型失败:`, error.message || '未知错误');
        }
      }
    } else {
      console.warn(`[AI模型测速] 所有模型测试都失败`);
    }
    
    // 保存测速插件配置
    try {
      await this.core.emit('config_updated', { 
        pluginName: 'ai-speedtest', 
        config: this.config
      });
    } catch (error) {
      console.error(`[AI模型测速] 保存测速插件配置失败:`, error.message || '未知错误');
    }
    
    // 如果是手动触发，发送测试结果
    if (sender) {
      // 格式化结果
      let resultMsg = "🚀 AI模型速度测试结果:\n\n";
      
      for (const [modelName, result] of Object.entries(results)) {
        const status = result.status === 'success' ? '✅' : '❌';
        resultMsg += `${status} ${modelName}: ${result.message}\n`;
      }
      
      if (fastestModel) {
        resultMsg += `\n🏆 最快的模型: ${fastestModel} (${fastestTime}ms)`
        
        if (this.config.autoSwitch) {
          resultMsg += `\n✨ 已自动将默认模型切换为 ${fastestModel}`;
        }
      } else {
        resultMsg += "\n⚠️ 所有模型测试都失败";
      }
      
      // 发送结果
      try {
        if (statusMsg) {
          await sender.delMsg(statusMsg);
        }
        await sender.reply(resultMsg);
      } catch (error) {
        console.error(`[AI模型测速] 发送测试结果失败:`, error.message || '未知错误');
        try {
          await sender.reply(`❌ 发送测试结果失败: ${error.message || '未知错误'}`);
        } catch (e) {
          // 忽略最终错误
        }
      }
    }
    
    return fastestModel;
  } catch (error) {
    console.error(`[AI模型测速] 测速过程出错:`, error.message || '未知错误');
    if (sender) {
      try {
        await sender.reply(`❌ 测速失败: ${error.message || '未知错误'}`);
      } catch (e) {
        // 忽略最终错误
      }
    }
    return null;
  }
};

// 插件命令列表
exports.commands = [
  {
    name: "speedtest",
    pattern: /^\/speedtest$/i,
    description: "测试所有AI模型的响应速度",
    handler: async function(sender, match) {
      try {
        // 记录消息信息
        const message = sender.getMsg();
        const userId = sender.getUserId();
        console.log(`[AI模型测速] 接收到用户 ${userId} 的测速命令: ${message}`);
        
        console.log(`[AI模型测速] 开始执行/speedtest命令`);
        
        // 先发送一条提示消息
        const responseMsg = await sender.reply("正在准备AI模型速度测试，这可能需要几分钟时间...");
        console.log(`[AI模型测速] 已发送准备消息，ID: ${responseMsg || 'unknown'}`);
        
        // 获取AI插件，先检查是否可用
        const aiChatPlugin = this.core.plugins.get('ai-chat')?.instance;
        if (!aiChatPlugin) {
          console.error(`[AI模型测速] AI聊天插件未加载或不可用`);
          await sender.reply(`❌ 无法执行测速: AI聊天插件未加载或不可用`);
          return;
        }
        
        console.log(`[AI模型测速] 成功获取AI聊天插件: ${typeof aiChatPlugin}`);
        
        // 检查方法是否存在
        if (typeof this.runSpeedTest !== 'function') {
          console.error(`[AI模型测速] runSpeedTest方法不存在或不是函数`);
          await sender.reply(`❌ 插件错误: 测速核心方法不可用，请联系管理员`);
          return;
        }
        
        console.log(`[AI模型测速] runSpeedTest方法检查通过`);
        
        if (typeof aiChatPlugin.chatWithAI !== 'function') {
          console.error(`[AI模型测速] AI聊天插件的chatWithAI方法不是函数`);
          await sender.reply(`❌ 无法执行测速: AI聊天插件的对话功能不可用`);
          return;
        }
        
        console.log(`[AI模型测速] AI聊天插件的chatWithAI方法检查通过`);
        
        // 确保配置有效
        if (!this.config) {
          console.error(`[AI模型测速] 插件配置不可用`);
          await sender.reply(`❌ 无法执行测速: 插件配置不可用`);
          return;
        }
        
        console.log(`[AI模型测速] 插件配置检查通过，开始执行测速测试`);
        
        // 执行测速
        try {
          console.log(`[AI模型测速] 调用 this.runSpeedTest(sender)`);
          await this.runSpeedTest(sender);
          console.log(`[AI模型测速] 测速测试完成`);
        } catch (speedTestError) {
          console.error(`[AI模型测速] 执行测速过程中出错:`, speedTestError);
          await sender.reply(`❌ 测速过程中出错: ${speedTestError.message || '未知错误'}\n如果问题持续存在，请尝试使用 /speedtest info 查看配置`);
        }
      } catch (error) {
        console.error(`[AI模型测速] 执行测速命令失败:`, error);
        try {
          await sender.reply(`❌ 执行测速命令失败: ${error.message || '未知错误'}\n${error.stack || ''}`);
        } catch (e) {
          console.error(`[AI模型测速] 发送错误消息失败:`, e);
        }
      }
    }
  },
  {
    name: "speedtest_config",
    pattern: /^\/speedtest config (.+) (.+)$/i,
    description: "配置测速参数(参数名 参数值)",
    handler: async function(sender, match) {
      try {
        const isAdmin = await sender.isAdmin();
        if (!isAdmin) {
          await sender.reply("❌ 只有管理员可以配置测速参数");
          return;
        }
        
        const paramName = match[1].toLowerCase();
        const paramValue = match[2];
        
        try {
          switch (paramName) {
            case 'interval':
              // 设置测试间隔（分钟转毫秒）
              const interval = parseInt(paramValue) * 60000;
              if (isNaN(interval) || interval < 60000) {
                await sender.reply("❌ 测试间隔必须大于等于1分钟");
                return;
              }
              this.config.testInterval = interval;
              this.setupSpeedTest(); // 重新设置定时任务
              break;
              
            case 'prompt':
              // 设置测试用的提问
              this.config.testPrompt = paramValue;
              break;
              
            case 'timeout':
              // 设置超时时间（秒转毫秒）
              const timeout = parseInt(paramValue) * 1000;
              if (isNaN(timeout) || timeout < 1000) {
                await sender.reply("❌ 超时时间必须大于等于1秒");
                return;
              }
              this.config.testTimeout = timeout;
              break;
              
            case 'autoswitch':
              // 设置是否自动切换
              this.config.autoSwitch = paramValue.toLowerCase() === 'true';
              break;
              
            case 'skipdisabled':
              // 设置是否跳过已禁用的模型
              this.config.skipDisabled = paramValue.toLowerCase() === 'true';
              break;
              
            case 'exclude':
              // 设置要排除的模型列表
              const models = paramValue ? paramValue.split(',').map(m => m.trim()) : [];
              this.config.excludeModels = models;
              break;
              
            default:
              await sender.reply(`❌ 未知的参数 "${paramName}"`);
              return;
          }
          
          // 保存配置
          await this.core.emit('config_updated', { 
            pluginName: 'ai-speedtest', 
            config: this.config
          });
          
          await sender.reply(`✅ 已更新测速参数 ${paramName} 为 ${paramValue}`);
        } catch (error) {
          await sender.reply(`❌ 配置更新失败: ${error.message || '未知错误'}`);
        }
      } catch (error) {
        console.error(`[AI模型测速] 处理配置命令失败:`, error.message || '未知错误');
        try {
          await sender.reply(`❌ 处理配置命令失败: ${error.message || '未知错误'}`);
        } catch (e) {
          // 忽略最终错误
        }
      }
    }
  },
  {
    name: "speedtest_info",
    pattern: /^\/speedtest info$/i,
    description: "查看测速插件的配置和上次测试结果",
    handler: async function(sender, match) {
      try {
        console.log(`[AI模型测速] 执行/speedtest info命令`);
        
        // 获取AI插件配置
        const aiChatPlugin = this.core.plugins.get('ai-chat')?.instance;
        if (!aiChatPlugin) {
          await sender.reply("❌ AI聊天插件未加载或不可用");
          return;
        }
        
        // 获取可测试的模型列表
        const aiConfig = aiChatPlugin.config;
        const modelsToTest = getTestableModels(aiConfig, this.config);
        
        // 格式化配置信息
        const { testInterval, testTimeout, autoSwitch, skipDisabled, excludeModels, currentFastest, lastTestTime, testResults } = this.config;
        
        let info = "⚙️ AI模型测速插件配置:\n\n";
        
        info += `测试间隔: ${testInterval / 60000} 分钟\n`;
        info += `测试超时: ${testTimeout / 1000} 秒\n`;
        info += `自动切换: ${autoSwitch ? '✅ 启用' : '❌ 禁用'}\n`;
        info += `跳过禁用模型: ${skipDisabled ? '✅ 是' : '❌ 否'}\n`;
        
        if (excludeModels.length > 0) {
          info += `排除模型: ${excludeModels.join(', ')}\n`;
        }
        
        info += `可测试模型: ${modelsToTest.join(', ') || '无'}\n`;
        
        // 添加上次测试结果
        if (lastTestTime > 0) {
          const lastTestDate = new Date(lastTestTime).toLocaleString();
          info += `\n📊 上次测试时间: ${lastTestDate}\n`;
          
          if (currentFastest) {
            info += `🏆 最快模型: ${currentFastest}`;
            if (testResults[currentFastest]) {
              info += ` (${testResults[currentFastest].responseTime}ms)\n`;
            } else {
              info += "\n";
            }
          }
          
          // 添加详细结果
          if (Object.keys(testResults).length > 0) {
            info += "\n📈 测试结果:\n";
            
            for (const [modelName, result] of Object.entries(testResults)) {
              const status = result.status === 'success' ? '✅' : '❌';
              info += `${status} ${modelName}: ${result.message}\n`;
            }
          }
        } else {
          info += "\n⚠️ 尚未进行过测试";
        }
        
        await sender.reply(info);
        console.log(`[AI模型测速] /speedtest info命令完成`);
      } catch (error) {
        console.error(`[AI模型测速] 获取信息失败:`, error.message || '未知错误');
        try {
          await sender.reply(`❌ 获取信息失败: ${error.message || '未知错误'}`);
        } catch (e) {
          // 忽略最终错误
        }
      }
    }
  }
];

// 插件卸载方法
exports.unload = async function() {
  // 清除定时任务
  if (speedTestInterval) {
    clearInterval(speedTestInterval);
    speedTestInterval = null;
  }
  
  console.log('[AI模型测速] 插件已卸载');
  return true;
};

// 保存配置
async function saveConfig(plugin) {
  try {
    // 使用BNCR事件系统更新配置
    if (plugin.core) {
      await plugin.core.emit('config_updated', { 
        pluginName: 'ai-speedtest', 
        config: plugin.config
      });
      console.log('[AI模型测速] 已通过事件系统更新配置');
      return true;
    }
    
    // 如果没有core引用，返回失败
    console.warn('[AI模型测速] 未找到core引用，无法保存配置');
    return false;
  } catch (error) {
    console.error('[AI模型测速] 保存配置失败:', error);
    return false;
  }
} 