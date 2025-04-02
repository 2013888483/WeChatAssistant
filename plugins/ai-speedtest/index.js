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
  
  console.log('[AI模型测速] 插件已初始化');
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
  
  // 遍历所有AI模型
  for (const [modelName, modelConfig] of Object.entries(aiConfig.models)) {
    // 检查模型是否要排除
    if (excludeModels.includes(modelName)) {
      console.log(`[AI模型测速] 模型 ${modelName} 在排除列表中，跳过测试`);
      continue;
    }
    
    // 检查模型是否已禁用且需要跳过
    if (skipDisabled && !modelConfig.enabled) {
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
  
  return result;
}

// 运行模型测速
exports.runSpeedTest = async function(sender = null) {
  try {
    // 获取AI插件
    const aiChatPlugin = this.core.plugins.get('ai-chat')?.instance;
    if (!aiChatPlugin) {
      const error = "AI聊天插件未加载或不可用";
      console.error(`[AI模型测速] ${error}`);
      if (sender) await sender.reply(`❌ ${error}`);
      return;
    }
    
    // 获取要测试的模型
    const { chatWithAI } = aiChatPlugin;
    if (!chatWithAI) {
      const error = "AI聊天插件的chatWithAI方法不可用";
      console.error(`[AI模型测速] ${error}`);
      if (sender) await sender.reply(`❌ ${error}`);
      return;
    }
    
    const aiConfig = aiChatPlugin.config;
    
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
        
        // 发送请求
        const responsePromise = chatWithAI(
          this.config.testPrompt, 
          `speedtest_${Date.now()}`, // 使用唯一ID，避免使用缓存
          modelName, 
          aiConfig
        );
        
        // 等待响应或超时
        const response = await Promise.race([responsePromise, timeoutPromise]);
        
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
        resultMsg += `\n🏆 最快的模型: ${fastestModel} (${fastestTime}ms)`;
        
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
    pattern: /^\/speedtest$/,
    description: "测试所有AI模型的响应速度",
    handler: async function(sender, match) {
      try {
        await this.runSpeedTest(sender);
      } catch (error) {
        console.error(`[AI模型测速] 执行测速命令失败:`, error.message || '未知错误');
        try {
          await sender.reply(`❌ 执行测速命令失败: ${error.message || '未知错误'}`);
        } catch (e) {
          // 忽略最终错误
        }
      }
    }
  },
  {
    name: "speedtest_config",
    pattern: /^\/speedtest config (.+) (.+)$/,
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
    pattern: /^\/speedtest info$/,
    description: "查看测速插件的配置和上次测试结果",
    handler: async function(sender, match) {
      try {
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