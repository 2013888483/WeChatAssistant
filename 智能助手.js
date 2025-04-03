/**
 * @author shuaijin
 * @name 智能助手
 * @team shuaijin
 * @origin bncr
 * @version 1.0.3
 * @description 智能微信助手，支持天气播报、AI对话、每日提醒等功能
 * @rule ^/plugins (list|enable|disable|reload)( .+)?$
 * @rule ^/help$
 * @rule ^/weather (.+)$
 * @rule ^/forecast (.+)$
 * @rule ^/chat (.+)$
 * @rule ^/subscribe$
 * @rule ^/unsubscribe$
 * @rule ^/config (list|set|get|del)( .+)?$
 * @rule ^/model (list|use|config)( .+)?$
 * @rule ^/speedtest( info)?$
 * @rule ^/speedtest config (.+) (.+)$
 * @rule ^/api help$
 * @rule ^/api list$
 * @rule ^/api ([a-zA-Z0-9_]+)$
 * @rule ^/clear$
 * @rule ^/admin list$
 * @rule ^/admin add (\S+)$
 * @rule ^/admin remove (\S+)$
 * @rule ^/weconfig$
 * @rule ^/weconfig set (.+) (.+)$
 * @rule ^/weconfig get (.+)$
 * @admin false
 * @public true
 * @priority 100
 * @disable false
 * @cron 0 0 7 * * * 
 * @classification 工具
 */

// 导入所需模块
const fs = require('fs');
const path = require('path');

// 获取全局变量
const sysMethod = global.sysMethod;
const router = sysMethod.router;
const BncrDB = global.BncrDB;

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, 'config.json');

// 创建Schema配置
try {
  console.log('[智能助手] 检测到BNCR无界环境，尝试注册Schema配置');
  
  // 先读取现有配置
  let existingConfig = {};
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      existingConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      console.log('[智能助手] 成功读取现有配置文件', JSON.stringify(existingConfig));
      
      // 处理嵌套对象结构
      // 如果 'ai-chat' 在顶层不存在，但在pluginSettings中存在，则移动到顶层
      for (const key of ['weather', 'ai-chat', 'morning-alert', 'ai-speedtest']) {
        if (!existingConfig[key] && existingConfig.pluginSettings && existingConfig.pluginSettings[key]) {
          existingConfig[key] = existingConfig.pluginSettings[key];
        }
      }
      
      // 深度读取AI聊天模型配置
      if (existingConfig['ai-chat'] && existingConfig['ai-chat'].models) {
        // 确保每个模型都有配置对象
        if (!existingConfig['ai-chat'].models.openai) existingConfig['ai-chat'].models.openai = {};
        if (!existingConfig['ai-chat'].models.deepseek) existingConfig['ai-chat'].models.deepseek = {};
        if (!existingConfig['ai-chat'].models.siliconflow) existingConfig['ai-chat'].models.siliconflow = {};
        
        // 提取apiKey和enabled状态
        const models = existingConfig['ai-chat'].models;
        for (const model of ['openai', 'deepseek', 'siliconflow']) {
          if (models[model]) {
            // 确保apiKey存在
            if (models[model].apiKey === undefined && models[model].name) {
              // 旧格式，将某些字段转换为新格式
              console.log(`[智能助手] 转换${model}配置为新格式`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[智能助手] 读取现有配置文件失败:', error);
  }
  
  // 转换数组为字符串格式
  if (Array.isArray(existingConfig.enabledPlugins)) {
    existingConfig.enabledPlugins = existingConfig.enabledPlugins.join(',');
  }
  
  if (Array.isArray(existingConfig.adminUsers)) {
    existingConfig.adminUsers = existingConfig.adminUsers.join(',');
  }
  
  // 创建Schema配置
  const jsonSchema = BncrCreateSchema.object({
    enabledPlugins: BncrCreateSchema.string()
      .setTitle('启用的插件')
      .setDescription('选择要启用的插件，用逗号分隔，如: weather,ai-chat,morning-alert')
      .setDefault(existingConfig.enabledPlugins || 'weather,ai-chat'),
    
    // 天气插件配置
    weather: BncrCreateSchema.object({
      api: BncrCreateSchema.string()
        .setTitle('天气API')
        .setDescription('选择天气API提供商')
        .setDefault(existingConfig.weather?.api || 'amap'),
      key: BncrCreateSchema.string()
        .setTitle('API密钥')
        .setDescription('API提供商的密钥')
        .setDefault(existingConfig.weather?.key || ''),
      defaultCity: BncrCreateSchema.string()
        .setTitle('默认城市')
        .setDescription('默认查询的城市')
        .setDefault(existingConfig.weather?.defaultCity || '北京')
    }).setTitle('天气插件设置'),
    
    // AI聊天插件配置
    'ai-chat': BncrCreateSchema.object({
      defaultModel: BncrCreateSchema.string()
        .setTitle('默认模型')
        .setDescription('默认使用的AI模型名称，必须与下方"模型配置"中的模型名称完全一致，如：deepseek、openai或siliconflow')
        .setDefault(existingConfig['ai-chat']?.defaultModel || 'deepseek'),
      models: BncrCreateSchema.object({
        openai: BncrCreateSchema.object({
          apiKey: BncrCreateSchema.string()
            .setTitle('API密钥')
            .setDescription('OpenAI的API密钥')
            .setDefault(existingConfig['ai-chat']?.models?.openai?.apiKey || ''),
          enabled: BncrCreateSchema.boolean()
            .setTitle('启用状态')
            .setDescription('是否启用此模型')
            .setDefault(existingConfig['ai-chat']?.models?.openai?.enabled || false)
        }).setTitle('OpenAI配置'),
        deepseek: BncrCreateSchema.object({
          apiKey: BncrCreateSchema.string()
            .setTitle('API密钥')
            .setDescription('DeepSeek的API密钥')
            .setDefault(existingConfig['ai-chat']?.models?.deepseek?.apiKey || ''),
          enabled: BncrCreateSchema.boolean()
            .setTitle('启用状态')
            .setDescription('是否启用此模型')
            .setDefault(existingConfig['ai-chat']?.models?.deepseek?.enabled || true)
        }).setTitle('DeepSeek配置'),
        siliconflow: BncrCreateSchema.object({
          apiKey: BncrCreateSchema.string()
            .setTitle('API密钥')
            .setDescription('硅基流动的API密钥')
            .setDefault(existingConfig['ai-chat']?.models?.siliconflow?.apiKey || ''),
          model: BncrCreateSchema.string()
            .setTitle('模型名称')
            .setDescription('指定具体的模型版本，如：deepseek-ai/DeepSeek-V3')
            .setDefault(existingConfig['ai-chat']?.models?.siliconflow?.model || 'deepseek-ai/DeepSeek-V3'),
          enabled: BncrCreateSchema.boolean()
            .setTitle('启用状态')
            .setDescription('是否启用此模型')
            .setDefault(existingConfig['ai-chat']?.models?.siliconflow?.enabled || false)
        }).setTitle('硅基流动配置')
      }).setTitle('模型配置（如需使用其他模型，请到config.js中配置）')
    }).setTitle('AI聊天插件设置'),
    
    // 每日提醒插件配置
    'morning-alert': BncrCreateSchema.object({
      enabled: BncrCreateSchema.boolean()
        .setTitle('是否启用')
        .setDescription('是否启用每日提醒')
        .setDefault(existingConfig['morning-alert']?.enabled || false),
      time: BncrCreateSchema.string()
        .setTitle('提醒时间')
        .setDescription('每日提醒的时间，格式为HH:MM')
        .setDefault(existingConfig['morning-alert']?.time || '07:00')
    }).setTitle('每日提醒插件设置'),
    
    // AI模型测速插件
    'ai-speedtest': BncrCreateSchema.object({
      enabled: BncrCreateSchema.boolean()
        .setTitle('是否启用')
        .setDescription('是否启用AI模型测速')
        .setDefault(existingConfig['ai-speedtest']?.enabled || true),
      interval: BncrCreateSchema.number()
        .setTitle('测试间隔')
        .setDescription('自动测试的间隔（分钟）')
        .setDefault(existingConfig['ai-speedtest']?.interval || 60)
    }).setTitle('AI模型测速插件'),
    
    adminUsers: BncrCreateSchema.string()
      .setTitle('管理员用户')
      .setDescription('管理员用户ID列表，用逗号分隔，如: 12345,67890')
      .setDefault(existingConfig.adminUsers || '')
  }).setTitle('微信智能助手配置');

  // 创建配置管理器
  const ConfigDB = new BncrPluginConfig(jsonSchema);
  
  // 配置更新后保存到文件
  function onConfigUpdate(config) {
    try {
      console.log('[智能助手] 配置被更新，准备保存:', JSON.stringify(config));
      
      // 转换配置格式，确保正确处理数组
      const configToSave = JSON.parse(JSON.stringify(config));
      
      // 将字符串格式的列表转换为数组
      if (typeof configToSave.enabledPlugins === 'string' && configToSave.enabledPlugins.trim() !== '') {
        configToSave.enabledPlugins = configToSave.enabledPlugins.split(',').filter(item => item.trim() !== '');
      } else if (!Array.isArray(configToSave.enabledPlugins)) {
        configToSave.enabledPlugins = [];
      }
      
      if (typeof configToSave.adminUsers === 'string' && configToSave.adminUsers.trim() !== '') {
        configToSave.adminUsers = configToSave.adminUsers.split(',').filter(item => item.trim() !== '');
      } else if (!Array.isArray(configToSave.adminUsers)) {
        configToSave.adminUsers = [];
      }
      
      // 检查是否需要保持原有结构(将插件配置放入pluginSettings对象)
      const readConfig = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : {};
      
      // 如果原配置使用了pluginSettings结构，保持兼容
      if (readConfig.pluginSettings) {
        configToSave.pluginSettings = {};
        
        // 转移插件配置到pluginSettings
        for (const key of ['weather', 'ai-chat', 'morning-alert', 'ai-speedtest']) {
          if (configToSave[key]) {
            configToSave.pluginSettings[key] = configToSave[key];
            // 删除顶层的配置避免重复
            // delete configToSave[key]; // 保留顶层配置以保证双向兼容
          }
        }
      }
      
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2), 'utf8');
      console.log('[智能助手] 配置更新已保存到文件');
    } catch (error) {
      console.error('[智能助手] 保存配置到文件失败:', error);
    }
  }
  
  // 注册配置
  BncrRegisterSchema('微信智能助手', jsonSchema, onConfigUpdate);
  
} catch (e) {
  console.log('[智能助手] BncrRegisterSchema或相关函数未定义，使用文件配置模式');
  console.error(e);
}

// 读取配置
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(configData);
      
      // 处理字符串格式的插件列表和管理员列表
      if (typeof config.enabledPlugins === 'string') {
        config.enabledPlugins = config.enabledPlugins.split(',').filter(item => item.trim() !== '');
      } else if (!Array.isArray(config.enabledPlugins)) {
        config.enabledPlugins = [];
      }
      
      if (typeof config.adminUsers === 'string') {
        config.adminUsers = config.adminUsers.split(',').filter(item => item.trim() !== '');
      } else if (!Array.isArray(config.adminUsers)) {
        config.adminUsers = [];
      }
      
      return config;
    }
  } catch (error) {
    console.error('[智能助手] 读取配置文件失败:', error);
  }
  
  // 如果读取失败，返回默认配置
  return {
    enabledPlugins: [],
    pluginSettings: {},
    adminUsers: []
  };
}

// 保存配置
function saveConfig(config) {
  try {
    // 确保config是深拷贝，不影响原始数据
    const configToSave = JSON.parse(JSON.stringify(config));
    
    // 如果界面配置使用字符串格式，转换为字符串存储
    if (Array.isArray(configToSave.enabledPlugins)) {
      configToSave.enabledPlugins = configToSave.enabledPlugins.join(',');
    }
    
    if (Array.isArray(configToSave.adminUsers)) {
      configToSave.adminUsers = configToSave.adminUsers.join(',');
    }
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[智能助手] 保存配置文件失败:', error);
    return false;
  }
}

// 获取或创建插件配置
function getPluginConfig(config, pluginName) {
  if (!config.pluginSettings) {
    config.pluginSettings = {};
  }
  
  if (!config.pluginSettings[pluginName]) {
    config.pluginSettings[pluginName] = {};
  }
  
  return config.pluginSettings[pluginName];
}

// 格式化配置显示
function formatConfig(config) {
  let result = '📋 微信助手配置:\n\n';
  
  // 启用的插件
  result += '🔌 启用的插件:\n';
  if (config.enabledPlugins && config.enabledPlugins.length > 0) {
    config.enabledPlugins.forEach(plugin => {
      result += `- ${plugin}\n`;
    });
  } else {
    result += '- 无\n';
  }
  
  // 插件设置
  result += '\n⚙️ 插件设置:\n';
  if (config.pluginSettings && Object.keys(config.pluginSettings).length > 0) {
    for (const [pluginName, settings] of Object.entries(config.pluginSettings)) {
      result += `\n💠 ${pluginName}:\n`;
      
      if (typeof settings === 'object' && settings !== null) {
        for (const [key, value] of Object.entries(settings)) {
          if (typeof value === 'object' && value !== null) {
            result += `  📊 ${key}: [复合配置]\n`;
          } else {
            result += `  🔹 ${key}: ${value}\n`;
          }
        }
      } else {
        result += '  - 无配置\n';
      }
    }
  } else {
    result += '- 无\n';
  }
  
  // 管理员用户
  result += '\n👤 管理员用户:\n';
  if (config.adminUsers && config.adminUsers.length > 0) {
    config.adminUsers.forEach(user => {
      result += `- ${user}\n`;
    });
  } else {
    result += '- 无\n';
  }
  
  return result;
}

// 处理配置命令
async function handleConfigCommand(sender) {
  try {
    const msg = sender.getMsg();
    const param1 = sender.param(1); // 子命令(set/get)
    const param2 = sender.param(2); // 键
    const param3 = sender.param(3); // 值(如果是set命令)
    
    console.log(`[智能助手] 收到配置命令: ${msg}`);
    
    // 读取当前配置
    const config = readConfig();
    
    // 处理命令
    if (msg === '/weconfig') {
      // 显示所有配置
      const configText = formatConfig(config);
      await sender.reply(configText);
      return true;
    } else if (param1 === 'set') {
      // 设置配置
      try {
        // 解析路径 (如 weather.api 或 ai-chat.defaultModel)
        const parts = param2.split('.');
        const pluginName = parts[0];
        
        if (parts.length === 1) {
          // 设置顶级配置
          if (pluginName === 'enabledPlugins' || pluginName === 'adminUsers') {
            // 解析数组
            try {
              const valueArray = JSON.parse(param3);
              if (Array.isArray(valueArray)) {
                config[pluginName] = valueArray;
                if (saveConfig(config)) {
                  await sender.reply(`✅ 成功设置 ${pluginName} = ${JSON.stringify(valueArray)}`);
                } else {
                  await sender.reply('❌ 保存配置失败');
                }
              } else {
                await sender.reply(`❌ ${param3} 不是有效的数组`);
              }
            } catch (e) {
              await sender.reply(`❌ 无法解析 ${param3} 为数组，请使用JSON格式，如: ["weather","ai-chat"]`);
            }
          } else {
            await sender.reply(`❌ 未知的顶级配置: ${pluginName}`);
          }
        } else if (parts.length === 2) {
          // 设置插件配置
          const key = parts[1];
          let pluginConfig = getPluginConfig(config, pluginName);
          
          // 尝试解析值
          let value = param3;
          try {
            // 尝试解析为JSON
            value = JSON.parse(param3);
          } catch (e) {
            // 如果不是有效的JSON，保持原始字符串
          }
          
          pluginConfig[key] = value;
          
          if (saveConfig(config)) {
            await sender.reply(`✅ 成功设置 ${pluginName}.${key} = ${JSON.stringify(value)}`);
          } else {
            await sender.reply('❌ 保存配置失败');
          }
        } else {
          await sender.reply('❌ 配置路径格式错误，应为 pluginName.key');
        }
      } catch (error) {
        console.error('[智能助手] 设置配置失败:', error);
        await sender.reply(`❌ 设置配置失败: ${error.message}`);
      }
      return true;
    } else if (param1 === 'get') {
      // 获取特定配置
      try {
        const parts = param2.split('.');
        const pluginName = parts[0];
        
        if (parts.length === 1) {
          // 获取顶级配置
          if (config[pluginName] !== undefined) {
            await sender.reply(`${pluginName}: ${JSON.stringify(config[pluginName], null, 2)}`);
          } else {
            await sender.reply(`❌ 配置 ${pluginName} 不存在`);
          }
        } else if (parts.length === 2) {
          // 获取插件配置
          const key = parts[1];
          if (config.pluginSettings && 
              config.pluginSettings[pluginName] && 
              config.pluginSettings[pluginName][key] !== undefined) {
            const value = config.pluginSettings[pluginName][key];
            await sender.reply(`${pluginName}.${key}: ${JSON.stringify(value, null, 2)}`);
          } else {
            await sender.reply(`❌ 配置 ${pluginName}.${key} 不存在`);
          }
        } else {
          await sender.reply('❌ 配置路径格式错误，应为 pluginName.key');
        }
      } catch (error) {
        console.error('[智能助手] 获取配置失败:', error);
        await sender.reply(`❌ 获取配置失败: ${error.message}`);
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[智能助手] 执行配置命令错误:', error);
    await sender.reply(`❌ 执行配置命令出错: ${error.message}`);
    return false;
  }
}

// 检查配置文件
console.log('[智能助手] 初始化中，检查配置文件');
const config = readConfig();
console.log(`[智能助手] 已加载配置，启用的插件: ${config.enabledPlugins.join(', ')}`);

// 加载核心模块
let core = null;
try {
  core = require('./core.js');
  console.log('[智能助手] 成功加载插件系统核心模块');
} catch (error) {
  console.error(`[智能助手] 加载插件系统核心模块失败: ${error.message}`);
  console.error(error.stack);
  // 错误处理将继续使用兼容模式
}

// 导出插件入口
module.exports = async (sender) => {
  try {
    // 处理配置命令
    const msg = sender.getMsg();
    if (msg.startsWith('/weconfig')) {
      return await handleConfigCommand(sender);
    }
    
    if (core) {
      // 使用新的插件系统处理消息
      return await core(sender);
    } else {
      // 兼容模式：使用旧版本逻辑处理消息
      await sender.reply("插件系统尚未正确加载，将使用兼容模式处理请求。如需使用全部功能，请联系管理员。");
      return await handleMessageLegacy(sender);
    }
  } catch (error) {
    console.error(`[智能助手] 处理消息时出错: ${error.message}`);
    await sender.reply(`处理消息时发生错误: ${error.message}\n请联系管理员检查插件系统。`);
    return false;
  }
};

// 兼容模式：旧版本的消息处理函数
async function handleMessageLegacy(sender) {
  const message = sender.getMsg();
  const userId = sender.getUserId();
  
  // 简化版的旧功能，以便在新系统出现问题时仍能提供基本服务
  if (message === '/help') {
    const helpText = `智能助手使用指南：
/weather 城市 - 查询实时天气
/forecast 城市 - 查询天气预报
/chat 内容 - 与AI对话
/subscribe - 订阅早间提醒
/unsubscribe - 取消订阅早间提醒
/clear - 清除聊天历史
/model list - 查看可用AI模型
/model use 模型名 - 切换AI模型
/config list - 查看个人配置
/speedtest - 测试所有AI模型的响应速度
/speedtest info - 查看测速插件的配置和上次测试结果
/speedtest config 参数名 参数值 - 配置测速参数(需管理员权限)
/api help - 查看API工具箱帮助
/api list - 查看可用API列表
/api 名称 - 调用指定API`;
    
    await sender.reply(helpText);
    return true;
  }
  
  // 其他命令将显示未实现信息
  await sender.reply("兼容模式下，此功能暂时不可用。请联系管理员解决插件系统问题。");
  return false;
} 