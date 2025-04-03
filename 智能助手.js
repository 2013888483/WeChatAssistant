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

// 创建配置Schema
const jsonSchema = BncrCreateSchema.object({
  // 天气插件配置
  weather: BncrCreateSchema.object({
    enable: BncrCreateSchema.boolean()
      .setTitle('启用状态')
      .setDescription('是否启用天气插件')
      .setDefault(true),
    api: BncrCreateSchema.string()
      .setTitle('天气API')
      .setDescription('选择天气API提供商')
      .setDefault('amap'),
    key: BncrCreateSchema.string()
      .setTitle('API密钥')
      .setDescription('API提供商的密钥')
      .setDefault(''),
    defaultCity: BncrCreateSchema.string()
      .setTitle('默认城市')
      .setDescription('默认查询的城市')
      .setDefault('北京')
  }).setTitle('天气插件设置'),
  
  // AI聊天插件配置
  'ai-chat': BncrCreateSchema.object({
    enable: BncrCreateSchema.boolean()
      .setTitle('启用状态')
      .setDescription('是否启用AI聊天插件')
      .setDefault(true),
    defaultModel: BncrCreateSchema.string()
      .setTitle('默认模型')
      .setDescription('默认使用的AI模型ID，必须与下方"模型列表"中的某个模型ID一致')
      .setDefault('deepseek'),
    event: BncrCreateSchema.array(
      BncrCreateSchema.object({
        enable: BncrCreateSchema.boolean().setTitle('启用').setDescription('是否启用此模型').setDefault(true),
        rule: BncrCreateSchema.object({
                id: BncrCreateSchema.string().setTitle('模型ID').setDescription('模型唯一标识符，用于引用此模型').setDefault(''),
                name: BncrCreateSchema.string().setTitle('模型名称').setDescription('模型的显示名称').setDefault(''),
                url: BncrCreateSchema.string().setTitle('接口地址').setDescription('API接口地址，例如: https://api.deepseek.com/v1').setDefault(''),
                apiKey: BncrCreateSchema.string().setTitle('API密钥').setDescription('访问模型所需的API密钥').setDefault(''),
                model: BncrCreateSchema.string().setTitle('模型标识').setDescription('部分API需要指定具体模型名称').setDefault(''),
        }),
    })).setTitle('模型列表')
      .setDescription('配置可用的AI聊天模型列表')
      .setDefault([
        {
          enable: false,
          rule:{
          id: 'openai',
          name: 'OpenAI',
          url: 'https://api.openai.com/v1',
          apiKey: '',
          model: ''
        }},
        {
          enable: true,
          rule:{
          id: 'deepseek',
          name: 'DeepSeek',
          url: 'https://api.deepseek.com/v1',
          apiKey: '',
          model: ''
        }},
        {
          enable: false,
          rule:{
          id: 'siliconflow',
          name: 'SiliconFlow',
          url: 'https://api.siliconflow.com/v1',
          apiKey: '',
          model: 'deepseek-ai/DeepSeek-V3'
        }}
      ])
  }).setTitle('AI聊天插件设置'),
  
  // 每日提醒插件配置
  'morning-alert': BncrCreateSchema.object({
    enable: BncrCreateSchema.boolean()
      .setTitle('启用状态')
      .setDescription('是否启用每日提醒插件')
      .setDefault(false),
    time: BncrCreateSchema.string()
      .setTitle('提醒时间')
      .setDescription('每日提醒的时间，格式为HH:MM')
      .setDefault('07:00')
  }).setTitle('每日提醒插件设置'),
  
  // AI模型测速插件
  'ai-speedtest': BncrCreateSchema.object({
    enable: BncrCreateSchema.boolean()
      .setTitle('启用状态')
      .setDescription('是否启用AI模型测速插件')
      .setDefault(true),
    interval: BncrCreateSchema.number()
      .setTitle('测试间隔')
      .setDescription('自动测试的间隔（分钟）')
      .setDefault(60)
  }).setTitle('AI模型测速插件'),
  
  // API工具箱插件
  'api-toolkit': BncrCreateSchema.object({
    enable: BncrCreateSchema.boolean()
      .setTitle('启用状态')
      .setDescription('是否启用API工具箱插件')
      .setDefault(true)
  }).setTitle('API工具箱插件'),
  
  // 管理员用户列表
  adminUsers: BncrCreateSchema.string()
    .setTitle('管理员用户')
    .setDescription('管理员用户ID，多个用户用逗号分隔')
    .setDefault('')
});

// 创建配置管理器 - 使用纯Schema方式
const ConfigDB = new BncrPluginConfig(jsonSchema);

// 初始化配置 
let config = null;

// 导出插件
module.exports = async (sender) => {
  try {
    // 初始化配置
    if (!config) {
      config = await initConfig();
    }
    
    // 处理配置命令
    if (sender.getMsg().startsWith('/weconfig')) {
      return await handleConfigCommand(sender);
    }
    
    // 处理其他命令
    const msg = sender.getMsg();
    const userId = sender.getUserId();
    
    // 检查是否为管理员
    const isAdmin = config.adminUsers && config.adminUsers.split(',').includes(userId);
    
    // 处理插件管理命令
    if (msg.startsWith('/plugins')) {
      if (!isAdmin) {
        await sender.reply('您没有管理员权限，无法执行插件管理命令');
        return true;
      }
      
      const match = msg.match(/^\/plugins (list|enable|disable|reload)( .+)?$/);
      if (match) {
        const action = match[1];
        const pluginName = match[2] ? match[2].trim() : null;
        
        switch (action) {
          case 'list':
            // 列出所有插件
            const pluginList = [];
            for (const pluginName of ['weather', 'ai-chat', 'morning-alert', 'ai-speedtest', 'api-toolkit']) {
              const settings = getPluginConfig(pluginName);
              pluginList.push(`【${pluginName}】 ${settings.enable ? '已启用' : '已禁用'}`);
            }
            await sender.reply(`可用插件列表：\n${pluginList.join('\n')}`);
            break;
            
          case 'enable':
            // 启用插件
            if (!pluginName) {
              await sender.reply('请指定要启用的插件名');
              return true;
            }
            
            const pluginConfig = getPluginConfig(pluginName);
            if (pluginConfig) {
              pluginConfig.enable = true;
              await ConfigDB.set(config);
              await sender.reply(`插件 ${pluginName} 已启用`);
            } else {
              await sender.reply(`插件 ${pluginName} 不存在`);
            }
            break;
            
          case 'disable':
            // 禁用插件
            if (!pluginName) {
              await sender.reply('请指定要禁用的插件名');
              return true;
            }
            
            const pluginConfig2 = getPluginConfig(pluginName);
            if (pluginConfig2) {
              pluginConfig2.enable = false;
              await ConfigDB.set(config);
              await sender.reply(`插件 ${pluginName} 已禁用`);
            } else {
              await sender.reply(`插件 ${pluginName} 不存在`);
            }
            break;
            
          case 'reload':
            // 重新加载插件
            if (!pluginName) {
              await sender.reply('请指定要重新加载的插件名');
              return true;
            }
            
            const pluginConfig3 = getPluginConfig(pluginName);
            if (pluginConfig3) {
              // 重新加载配置
              config = await initConfig();
              await sender.reply(`插件 ${pluginName} 已重新加载`);
            } else {
              await sender.reply(`插件 ${pluginName} 不存在`);
            }
            break;
        }
        return true;
      }
    }
    
    // 处理管理员命令
    if (msg.startsWith('/admin')) {
      if (!isAdmin) {
        await sender.reply('您没有管理员权限，无法执行管理员命令');
        return true;
      }
      
      const match = msg.match(/^\/admin (list|add|remove)( .+)?$/);
      if (match) {
        const action = match[1];
        const userId = match[2] ? match[2].trim() : null;
        
        switch (action) {
          case 'list':
            // 列出所有管理员
            if (config.adminUsers && config.adminUsers.length > 0) {
              await sender.reply(`管理员列表：\n${config.adminUsers}`);
            } else {
              await sender.reply('当前没有配置任何管理员');
            }
            break;
            
          case 'add':
            // 添加管理员
            if (!userId) {
              await sender.reply('请指定要添加的用户ID');
              return true;
            }
            
            if (config.adminUsers && config.adminUsers.split(',').includes(userId)) {
              await sender.reply(`用户 ${userId} 已经是管理员`);
              return true;
            }
            
            config.adminUsers = config.adminUsers ? `${config.adminUsers},${userId}` : userId;
            await ConfigDB.set(config);
            await sender.reply(`已成功添加管理员：${userId}`);
            break;
            
          case 'remove':
            // 移除管理员
            if (!userId) {
              await sender.reply('请指定要移除的用户ID');
              return true;
            }
            
            if (!config.adminUsers || !config.adminUsers.split(',').includes(userId)) {
              await sender.reply(`用户 ${userId} 不是管理员`);
              return true;
            }
            
            config.adminUsers = config.adminUsers.split(',').filter(id => id !== userId).join(',');
            await ConfigDB.set(config);
            await sender.reply(`已成功移除管理员：${userId}`);
            break;
        }
        return true;
      }
    }
    
    // 处理帮助命令
    if (msg === '/help') {
      return await handleMessageLegacy(sender);
    }
    
    // 转发到相应的子插件处理
    // 天气插件命令
    if (msg.startsWith('/weather') || msg.startsWith('/forecast')) {
      const weatherConfig = getPluginConfig('weather');
      if (weatherConfig && weatherConfig.enable) {
        try {
          const weatherPlugin = require('./plugins/weather/index.js');
          // 检查插件导出格式
          if (typeof weatherPlugin === 'function') {
            return await weatherPlugin(sender);
          } else if (weatherPlugin && typeof weatherPlugin.main === 'function') {
            return await weatherPlugin.main(sender);
          } else if (weatherPlugin && weatherPlugin.meta) {
            // 插件使用exports对象格式，需要直接处理命令
            console.log('[智能助手] 天气插件使用exports格式');
            
            // 获取查询的城市名称
            let city = '';
            if (msg.startsWith('/weather')) {
              city = msg.substring('/weather'.length).trim();
            } else if (msg.startsWith('/forecast')) {
              city = msg.substring('/forecast'.length).trim();
            }
            
            if (!city && weatherConfig.defaultCity) {
              city = weatherConfig.defaultCity;
            }
            
            if (!city) {
              await sender.reply('请指定城市名称，例如: /weather 北京');
              return true;
            }
            
            // 确保插件配置正确
            if (!weatherPlugin.config) {
              weatherPlugin.config = weatherConfig;
            }
            
            // 发送"正在查询"提示
            const loadingMsg = await sender.reply(`⏳ 正在查询${city}的天气，请稍候...`);
            
            try {
              // 优先使用handleWeatherCommand方法
              if (typeof weatherPlugin.handleWeatherCommand === 'function') {
                console.log(`[智能助手] 调用天气插件的handleWeatherCommand方法查询: ${city}`);
                // 添加发送方信息，包含插件对象
                sender.plugin = {
                  config: config
                };
                const weatherResult = await weatherPlugin.handleWeatherCommand(city, sender);
                
                // 删除加载消息
                if (loadingMsg) {
                  await sender.delMsg(loadingMsg);
                }
                
                // 发送天气信息
                await sender.reply(weatherResult);
                return true;
              } 
              // 备用：调用getWeather方法
              else if (typeof weatherPlugin.getWeather === 'function') {
                console.log(`[智能助手] 调用天气插件的getWeather方法查询: ${city}`);
                const weatherResult = await weatherPlugin.getWeather(city);
                
                // 删除加载消息
                if (loadingMsg) {
                  await sender.delMsg(loadingMsg);
                }
                
                // 发送天气信息
                await sender.reply(weatherResult);
                return true;
              } else {
                if (loadingMsg) {
                  await sender.delMsg(loadingMsg);
                }
                await sender.reply('天气插件未正确导出天气查询方法，无法查询天气。');
                return true;
              }
            } catch (error) {
              console.error(`[智能助手] 查询天气出错: ${error.message}`);
              
              // 删除加载消息
              if (loadingMsg) {
                await sender.delMsg(loadingMsg);
              }
              
              await sender.reply(`查询天气失败: ${error.message}`);
              return true;
            }
          } else {
            console.error('[智能助手] 天气插件格式不兼容');
            await sender.reply('天气查询功能暂时不可用，请联系管理员检查插件格式。');
            return true;
          }
        } catch (error) {
          console.error('[智能助手] 加载天气插件出错:', error);
          await sender.reply('天气查询功能暂时不可用，请稍后再试。');
          return true;
        }
      } else {
        await sender.reply('天气插件未启用，请联系管理员启用此功能。');
        return true;
      }
    }
    
    // AI聊天插件命令
    if (msg.startsWith('/chat') || msg.startsWith('/model') || msg === '/clear') {
      const aiChatConfig = getPluginConfig('ai-chat');
      if (aiChatConfig && aiChatConfig.enable) {
        try {
          const aiChatPlugin = require('./plugins/ai-chat/index.js');
          // 检查插件导出格式
          if (typeof aiChatPlugin === 'function') {
            return await aiChatPlugin(sender);
          } else if (aiChatPlugin && typeof aiChatPlugin.main === 'function') {
            return await aiChatPlugin.main(sender);
          } else if (aiChatPlugin && aiChatPlugin.meta) {
            // 插件使用exports对象格式，需要创建处理函数
            console.log('[智能助手] AI聊天插件使用exports格式');
            if (msg.startsWith('/chat')) {
              const content = msg.slice(6).trim();
              await sender.reply(`抱歉，AI聊天组件格式不兼容，无法处理您的请求: ${content}`);
            } else if (msg.startsWith('/model')) {
              await sender.reply('抱歉，AI聊天组件格式不兼容，无法处理模型管理请求。');
            } else if (msg === '/clear') {
              await sender.reply('抱歉，AI聊天组件格式不兼容，无法清除聊天历史。');
            }
            return true;
          } else {
            console.error('[智能助手] AI聊天插件格式不兼容');
            await sender.reply('AI聊天功能暂时不可用，请联系管理员检查插件格式。');
            return true;
          }
        } catch (error) {
          console.error('[智能助手] 加载AI聊天插件出错:', error);
          await sender.reply('AI聊天功能暂时不可用，请稍后再试。');
          return true;
        }
      } else {
        await sender.reply('AI聊天插件未启用，请联系管理员启用此功能。');
        return true;
      }
    }
    
    // 早间提醒插件命令
    if (msg === '/subscribe' || msg === '/unsubscribe') {
      const morningAlertConfig = getPluginConfig('morning-alert');
      if (morningAlertConfig && morningAlertConfig.enable) {
        try {
          const morningAlertPlugin = require('./plugins/morning-alert/index.js');
          // 检查插件导出格式
          if (typeof morningAlertPlugin === 'function') {
            return await morningAlertPlugin(sender);
          } else if (morningAlertPlugin && typeof morningAlertPlugin.main === 'function') {
            return await morningAlertPlugin.main(sender);
          } else if (morningAlertPlugin && morningAlertPlugin.meta) {
            // 插件使用exports对象格式，提供临时响应
            console.log('[智能助手] 早间提醒插件使用exports格式');
            if (msg === '/subscribe') {
              await sender.reply('抱歉，早间提醒组件格式不兼容，无法订阅提醒。');
            } else if (msg === '/unsubscribe') {
              await sender.reply('抱歉，早间提醒组件格式不兼容，无法取消订阅。');
            }
            return true;
          } else {
            console.error('[智能助手] 早间提醒插件格式不兼容');
            await sender.reply('早间提醒功能暂时不可用，请联系管理员检查插件格式。');
            return true;
          }
        } catch (error) {
          console.error('[智能助手] 加载早间提醒插件出错:', error);
          await sender.reply('早间提醒功能暂时不可用，请稍后再试。');
          return true;
        }
      } else {
        await sender.reply('早间提醒插件未启用，请联系管理员启用此功能。');
        return true;
      }
    }
    
    // AI速度测试插件命令
    if (msg.startsWith('/speedtest')) {
      const speedtestConfig = getPluginConfig('ai-speedtest');
      if (speedtestConfig && speedtestConfig.enable) {
        try {
          const speedtestPlugin = require('./plugins/ai-speedtest/index.js');
          // 检查插件导出格式
          if (typeof speedtestPlugin === 'function') {
            return await speedtestPlugin(sender);
          } else if (speedtestPlugin && typeof speedtestPlugin.main === 'function') {
            return await speedtestPlugin.main(sender);
          } else if (speedtestPlugin && speedtestPlugin.meta) {
            // 插件使用exports对象格式，通过runSpeedTest方法处理
            console.log('[智能助手] AI速度测试插件使用exports对象格式');
            
            if (speedtestPlugin.runSpeedTest) {
              if (msg === '/speedtest' || msg === '/speedtest ') {
                await sender.reply('正在测试AI模型速度，请稍候...');
                try {
                  // 直接调用runSpeedTest方法进行测试
                  await speedtestPlugin.runSpeedTest(sender);
                  return true;
                } catch (testError) {
                  console.error('[智能助手] 运行速度测试出错:', testError);
                  await sender.reply(`运行速度测试出错: ${testError.message}`);
                  return true;
                }
              } else if (msg.startsWith('/speedtest info')) {
                // 返回测试信息
                if (speedtestPlugin.config) {
                  const lastTestTime = speedtestPlugin.config.lastTestTime ? 
                    new Date(speedtestPlugin.config.lastTestTime).toLocaleString() : 
                    '从未测试';
                  const currentFastest = speedtestPlugin.config.currentFastest || '未知';
                  
                  const infoText = `📊 AI模型速度测试信息:
上次测试时间: ${lastTestTime}
当前最快模型: ${currentFastest}
测试间隔: ${(speedtestPlugin.config.testInterval || 3600000) / 60000} 分钟
自动切换: ${speedtestPlugin.config.autoSwitch ? '已启用' : '已禁用'}`;
                  
                  await sender.reply(infoText);
                } else {
                  await sender.reply('无法获取测速配置信息。');
                }
                return true;
              }
            } else {
              await sender.reply('AI速度测试插件格式不兼容，未找到runSpeedTest方法。');
              return true;
            }
          } else {
            console.error('[智能助手] AI速度测试插件格式不兼容');
            await sender.reply('AI速度测试功能暂时不可用，请联系管理员检查插件格式。');
            return true;
          }
        } catch (error) {
          console.error('[智能助手] 加载AI速度测试插件出错:', error);
          await sender.reply('AI速度测试功能暂时不可用，请稍后再试。');
          return true;
        }
      } else {
        await sender.reply('AI速度测试插件未启用，请联系管理员启用此功能。');
        return true;
      }
    }
    
    // API工具箱插件命令
    if (msg.startsWith('/api')) {
      const apiToolkitConfig = getPluginConfig('api-toolkit');
      if (apiToolkitConfig && apiToolkitConfig.enable) {
        try {
          const apiToolkitPlugin = require('./plugins/api-toolkit/index.js');
          // 检查插件导出格式
          if (typeof apiToolkitPlugin === 'function') {
            return await apiToolkitPlugin(sender);
          } else if (apiToolkitPlugin && typeof apiToolkitPlugin.main === 'function') {
            return await apiToolkitPlugin.main(sender);
          } else if (apiToolkitPlugin && apiToolkitPlugin.meta) {
            console.log(`[智能助手] API工具箱插件使用exports格式`);
            
            // 加载API工具箱配置
            let apiConfig;
            
            // 1. 首先尝试使用插件内置的loadConfig方法
            if (apiToolkitPlugin.loadConfig && typeof apiToolkitPlugin.loadConfig === 'function') {
              console.log(`[智能助手][调试] 使用插件内置的loadConfig方法`);
              apiConfig = apiToolkitPlugin.loadConfig();
            } else {
              // 2. 否则尝试自己加载配置文件
              apiConfig = loadApiConfig();
            }
            
            // 处理API命令
            if (msg === '/api help') {
              // 显示帮助信息
              const helpText = apiToolkitPlugin.generateHelpText ? 
                apiToolkitPlugin.generateHelpText(apiConfig) :
                `API工具箱使用指南:
/api list - 查看可用API列表
/api <名称> - 调用指定API`;
              
              await sender.reply(helpText);
              return true;
            } else if (msg === '/api list') {
              // 显示API列表
              const listText = apiToolkitPlugin.generateAPIListText ? 
                apiToolkitPlugin.generateAPIListText(apiConfig) :
                '抱歉，无法获取API列表。';
              
              await sender.reply(listText);
              return true;
            } else if (msg.match(/^\/api ([a-zA-Z0-9_]+)$/)) {
              // 调用指定API
              const apiKey = msg.split(' ')[1].trim();
              
              console.log(`[智能助手][调试] 准备调用API: ${apiKey}`);
              // 检查apiConfig中是否存在该API
              if (apiConfig.apis && apiConfig.apis[apiKey]) {
                console.log(`[智能助手][调试] 找到API: ${apiKey}, URL: ${apiConfig.apis[apiKey].url}`);
              } else {
                console.warn(`[智能助手][调试] 警告: 配置中不存在API: ${apiKey}`);
                console.log(`[智能助手][调试] 可用API列表: ${Object.keys(apiConfig.apis || {}).join(', ')}`);
              }
              
              // 关键修改: 首先检查插件是否提供了handleAPICommand方法
              if (apiToolkitPlugin.handleAPICommand && typeof apiToolkitPlugin.handleAPICommand === 'function') {
                console.log(`[智能助手][调试] 使用插件提供的handleAPICommand方法`);
                try {
                  await apiToolkitPlugin.handleAPICommand(apiKey, sender, apiConfig);
                  console.log(`[智能助手][调试] API命令处理完成: ${apiKey}`);
                  return true;
                } catch (error) {
                  console.error(`[智能助手][调试] 调用API时出错: ${error.message}`);
                  await sender.reply(`调用API时出错: ${error.message}`);
                  return true;
                }
              } else {
                console.error(`[智能助手][调试] 插件未提供handleAPICommand方法`);
                await sender.reply(`抱歉，API工具箱插件未正确导出handleAPICommand方法，无法调用API: ${apiKey}`);
                return true;
              }
            }
            
            // 其他API相关命令
            await sender.reply('抱歉，无法识别的API命令。请使用 /api help 查看帮助。');
            return true;
          } else {
            console.error('[智能助手] API工具箱插件格式不兼容');
            await sender.reply('API工具箱功能暂时不可用，请联系管理员检查插件格式。');
            return true;
          }
        } catch (error) {
          console.error('[智能助手] 加载API工具箱插件出错:', error);
          await sender.reply('API工具箱功能暂时不可用，请稍后再试。');
          return true;
        }
      } else {
        await sender.reply('API工具箱插件未启用，请联系管理员启用此功能。');
        return true;
      }
    }
    
    // 配置命令
    if (msg.startsWith('/config')) {
      await sender.reply('配置功能已移至 /weconfig 命令，请使用 /weconfig 查看配置。');
      return true;
    }
    
    // 未处理的命令
    console.log(`[智能助手] 未处理的命令: ${msg}`);
    return false;
  } catch (error) {
    console.error('[智能助手] 处理消息时出错:', error);
    await sender.reply(`处理消息时出错: ${error.message}`);
    return false;
  }
};

// 初始化配置
async function initConfig() {
  try {
    // 从BNCR Schema读取配置
    await ConfigDB.get();
    config = ConfigDB.userConfig;
    console.log('[智能助手] 从Schema读取配置成功');
    
    // 如果配置为空，尝试从本地文件读取一次
    if (!config || Object.keys(config).length === 0) {
      const configFile = path.join(__dirname, 'config.json');
      if (fs.existsSync(configFile)) {
        try {
          const fileConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
          console.log('[智能助手] 从本地文件读取配置成功，将导入到Schema');
          
          // 转换旧版配置格式
          if (fileConfig.enabledPlugins && Array.isArray(fileConfig.enabledPlugins)) {
            // 旧版使用enabledPlugins数组，转换为每个插件的enabled属性
            const pluginNames = ['weather', 'ai-chat', 'morning-alert', 'ai-speedtest', 'api-toolkit'];
            pluginNames.forEach(name => {
              if (!fileConfig[name]) {
                fileConfig[name] = {};
              }
              // 检查插件是否在启用列表中
              fileConfig[name].enable = fileConfig.enabledPlugins.includes(name);
            });
            // 可以删除旧的enabledPlugins数组
            delete fileConfig.enabledPlugins;
          }
          
          // 转换管理员用户列表为字符串格式
          if (fileConfig.adminUsers && Array.isArray(fileConfig.adminUsers)) {
            fileConfig.adminUsers = fileConfig.adminUsers.join(',');
          }
          
          // 如果使用旧版AI模型配置，转换为新的数组格式
          if (fileConfig['ai-chat'] && fileConfig['ai-chat'].models && !Array.isArray(fileConfig['ai-chat'].models)) {
            const oldModels = fileConfig['ai-chat'].models;
            const newModels = [];
            
            // 处理旧版中的每个模型
            ['openai', 'deepseek', 'siliconflow'].forEach(id => {
              if (oldModels[id]) {
                newModels.push({
                  id: id,
                  name: oldModels[id].name || id.charAt(0).toUpperCase() + id.slice(1),
                  url: oldModels[id].url || `https://api.${id}.com/v1`,
                  apiKey: oldModels[id].apiKey || '',
                  enable: oldModels[id].enable || oldModels[id].enabled || false,
                  model: oldModels[id].model || '',
                });
              }
            });
            
            // 如果没有找到任何模型，添加默认模型
            if (newModels.length === 0) {
              newModels.push({
                id: 'deepseek',
                name: 'DeepSeek',
                url: 'https://api.deepseek.com/v1',
                apiKey: '',
                enable: true,
                model: ''
              });
            }
            
            // 更新配置
            fileConfig['ai-chat'].models = newModels;
          }
          
          await ConfigDB.set(fileConfig);
          config = fileConfig;
        } catch (e) {
          console.error('[智能助手] 从文件读取配置失败:', e);
        }
      }
    }
    
    if (!config) {
      config = {}; // 确保config是对象
    }
    
    // 确保基本配置项存在
    if (!config.adminUsers) config.adminUsers = '';
    
  } catch (err) {
    console.error('[智能助手] 初始化配置失败:', err);
    // 如果Schema方式失败，尝试使用本地文件
    config = loadConfigFromFile();
  }
  
  const enabledPlugins = getEnabledPlugins();
  console.log(`[智能助手] 已加载配置，启用的插件: ${enabledPlugins.join(', ')}`);
  return config;
}

// 备用：从本地文件加载配置
function loadConfigFromFile() {
  try {
    const configFile = path.join(__dirname, 'config.json');
    if (fs.existsSync(configFile)) {
      const configData = fs.readFileSync(configFile, 'utf8');
      return JSON.parse(configData);
    }
  } catch (err) {
    console.error('[智能助手] 从文件加载配置失败:', err);
  }
  
  // 默认配置
  return {
    adminUsers: '',
    pluginSettings: {
      weather: { api: 'amap', key: '', defaultCity: '北京' },
      'ai-chat': { defaultModel: 'deepseek' }
    }
  };
}

// 获取已启用的插件列表
function getEnabledPlugins() {
  const pluginNames = ['weather', 'ai-chat', 'morning-alert', 'ai-speedtest', 'api-toolkit'];
  return pluginNames.filter(name => {
    // 检查插件配置中的enable字段
    return config[name] && config[name].enable === true;
  });
}

// 获取插件配置
function getPluginConfig(pluginName) {
  // 先从顶级配置获取
  if (config[pluginName]) {
    return config[pluginName];
  }
  
  // 兼容旧版配置：尝试从pluginSettings获取
  if (config.pluginSettings && config.pluginSettings[pluginName]) {
    // 如果没有enable字段，默认添加为true
    const pluginConfig = config.pluginSettings[pluginName];
    if (pluginConfig.enable === undefined) {
      pluginConfig.enable = true;
    }
    return pluginConfig;
  }
  
  // 返回默认配置
  return { enable: false };
}

// 格式化配置显示
function formatConfig() {
  let result = '📋 微信助手配置:\n\n';
  
  // 启用的插件
  result += '🔌 启用的插件:\n';
  const enabledPlugins = getEnabledPlugins();
  if (enabledPlugins.length > 0) {
    enabledPlugins.forEach(plugin => {
      result += `- ${plugin}\n`;
    });
  } else {
    result += '- 无\n';
  }
  
  // 插件设置
  result += '\n⚙️ 插件设置:\n';
  for (const pluginName of ['weather', 'ai-chat', 'morning-alert', 'ai-speedtest', 'api-toolkit']) {
    const settings = getPluginConfig(pluginName);
    if (settings && Object.keys(settings).length > 0) {
      result += `\n💠 ${pluginName} (${settings.enable ? '已启用' : '已禁用'}):\n`;
      
      // 处理嵌套对象，跳过enable属性
      for (const [key, value] of Object.entries(settings)) {
        if (key === 'enable') continue; // 跳过enable属性，已在插件名称后显示
        
        if (key === 'models' && Array.isArray(value)) {
          // 特殊处理AI模型列表
          result += `  📊 模型列表:\n`;
          value.forEach(model => {
            result += `    🤖 ${model.name} (${model.id}) [${model.enable ? '已启用' : '已禁用'}]\n`;
            if (model.url) result += `      🔗 URL: ${model.url}\n`;
            if (model.model) result += `      📋 模型版本: ${model.model}\n`;
            // 不显示apiKey，保护敏感信息
          });
        } else if (typeof value === 'object' && value !== null) {
          result += `  📊 ${key}: [复合配置]\n`;
        } else {
          result += `  🔹 ${key}: ${value}\n`;
        }
      }
    }
  }
  
  // 管理员用户
  result += '\n👤 管理员用户:\n';
  if (config.adminUsers && config.adminUsers.length > 0) {
    result += `- ${config.adminUsers}\n`;
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
    
    // 处理命令
    if (msg === '/weconfig') {
      // 显示所有配置
      const configText = formatConfig();
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
          if (pluginName === 'adminUsers') {
            // 直接设置字符串值
            config[pluginName] = param3;
            await ConfigDB.set(config);
            await sender.reply(`✅ 成功设置 ${pluginName} = ${param3}`);
          } else {
            await sender.reply(`❌ 未知的顶级配置: ${pluginName}`);
          }
        } else if (parts.length === 2) {
          // 设置插件配置
          const key = parts[1];
          
          // 确保插件配置对象存在
          if (!config[pluginName]) {
            config[pluginName] = {};
          }
          
          // 尝试解析值
          let value = param3;
          try {
            // 尝试解析为JSON
            value = JSON.parse(param3);
          } catch (e) {
            // 如果不是有效的JSON，保持原始字符串
          }
          
          config[pluginName][key] = value;
          await ConfigDB.set(config);
          
          await sender.reply(`✅ 成功设置 ${pluginName}.${key} = ${JSON.stringify(value)}`);
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
          const pluginConfig = getPluginConfig(pluginName);
          
          if (pluginConfig && pluginConfig[key] !== undefined) {
            const value = pluginConfig[key];
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

// 获取AI模型配置
function getAIModelConfig(modelId) {
  // 获取ai-chat插件配置
  const aiChatConfig = getPluginConfig('ai-chat');
  
  // 检查models是否为数组
  if (aiChatConfig && Array.isArray(aiChatConfig.models)) {
    // 在数组中查找指定ID的模型
    const model = aiChatConfig.models.find(m => m.id === modelId);
    if (model) {
      return model;
    }
  }
  
  // 兼容旧版：从对象格式中查找
  if (aiChatConfig && aiChatConfig.models && typeof aiChatConfig.models === 'object') {
    if (aiChatConfig.models[modelId]) {
      return aiChatConfig.models[modelId];
    }
  }
  
  // 如果找不到指定的模型，返回默认配置
  return {
    id: modelId,
    name: modelId.charAt(0).toUpperCase() + modelId.slice(1),
    url: `https://api.${modelId}.com/v1`,
    apiKey: '',
    enable: false,
    model: ''
  };
}

// 获取默认AI模型
function getDefaultAIModel() {
  const aiChatConfig = getPluginConfig('ai-chat');
  
  // 获取默认模型ID
  const defaultModelId = aiChatConfig.defaultModel || 'deepseek';
  
  // 尝试获取默认模型配置
  const modelConfig = getAIModelConfig(defaultModelId);
  
  // 如果默认模型被禁用或不存在，尝试找一个启用的模型
  if (!modelConfig.enable && Array.isArray(aiChatConfig.models)) {
    const enabledModel = aiChatConfig.models.find(m => m.enable);
    if (enabledModel) {
      return enabledModel;
    }
  }
  
  return modelConfig;
}

// 获取所有启用的AI模型
function getEnabledAIModels() {
  const aiChatConfig = getPluginConfig('ai-chat');
  
  if (aiChatConfig && Array.isArray(aiChatConfig.models)) {
    return aiChatConfig.models.filter(model => model.enable);
  }
  
  // 兼容旧版：从对象格式中提取
  if (aiChatConfig && aiChatConfig.models && typeof aiChatConfig.models === 'object') {
    const models = [];
    for (const [id, model] of Object.entries(aiChatConfig.models)) {
      if (model.enable || model.enabled) {
        models.push({
          id,
          name: model.name || id.charAt(0).toUpperCase() + id.slice(1),
          apiKey: model.apiKey || '',
          url: model.url || `https://api.${id}.com/v1`,
          enable: true,
          model: model.model || '',
          ...model
        });
      }
    }
    return models;
  }
  
  return [];
}

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

// 加载API工具箱配置的辅助函数
function loadApiConfig() {
  try {
    // 尝试加载插件自身的配置文件
    const pluginConfigPath = path.join(__dirname, 'plugins', 'api-toolkit', 'config.json');
    console.log(`[智能助手][调试] 尝试加载API工具箱配置: ${pluginConfigPath}`);
    if (fs.existsSync(pluginConfigPath)) {
      console.log(`[智能助手][调试] 配置文件存在，开始读取`);
      const configContent = fs.readFileSync(pluginConfigPath, 'utf8');
      console.log(`[智能助手][调试] 配置文件内容长度: ${configContent.length} 字节`);
      const pluginConfig = JSON.parse(configContent);
      console.log(`[智能助手][调试] 成功解析配置文件，API数量: ${Object.keys(pluginConfig.apis || {}).length}`);
      
      // 检查必要的属性是否存在
      if (!pluginConfig.apis) {
        console.warn(`[智能助手][调试] 警告: 配置文件中没有apis属性，添加空对象`);
        pluginConfig.apis = {};
      }
      
      return pluginConfig;
    } else {
      console.warn(`[智能助手][调试] 配置文件不存在: ${pluginConfigPath}`);
    }
    
    // 返回默认配置
    return {
      enabled: true,
      commandPrefix: "api",
      apis: {
        // 添加一些常用API作为后备
        baisi: {
          name: "白丝图片",
          url: "https://v2.xxapi.cn/api/baisi",
          method: "GET",
          type: "image",
          enabled: true,
          description: "随机返回白丝图片"
        },
        heisi: {
          name: "黑丝图片",
          url: "https://v2.xxapi.cn/api/heisi",
          method: "GET", 
          type: "image",
          enabled: true,
          description: "随机返回黑丝图片"
        }
      },
      rateLimit: {
        perUser: 10,
        timeWindow: 60000,
        enabled: true
      },
      cache: {
        enabled: true,
        expiry: 3600000
      }
    };
  } catch (error) {
    console.error(`[智能助手][调试] 加载API工具箱配置出错:`, error);
    // 返回带有常用API的默认配置
    return { 
      enabled: true, 
      commandPrefix: "api", 
      apis: {
        // 添加一些常用API作为后备
        baisi: {
          name: "白丝图片",
          url: "https://v2.xxapi.cn/api/baisi",
          method: "GET",
          type: "image",
          enabled: true,
          description: "随机返回白丝图片"
        }
      },
      rateLimit: {
        perUser: 10,
        timeWindow: 60000,
        enabled: true
      },
      cache: {
        enabled: true,
        expiry: 3600000
      }
    };
  }
} 