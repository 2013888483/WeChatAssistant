/**
 * @name 早间提醒插件
 * @version 1.0.0
 * @description 提供每日早间提醒服务，包含天气和AI生活建议
 * @author shuaijin
 */

// 导入模块
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');

// 创建订阅用户存储
const subscribedUsers = new Map();

// 插件元数据
exports.meta = {
  name: "早间提醒",
  version: "1.0.0",
  description: "提供每日早间提醒服务，包含天气和AI生活建议",
  author: "shuaijin"
};

// 插件默认配置
exports.defaultConfig = {
  enabled: true,
  time: "07:00", // 默认早上7点发送提醒
  defaultCity: "北京", // 默认城市
  templates: {
    morning: "早上好，今天是 {{date}}，{{holiday}}。\n\n今日天气：\n{{weather}}\n\n{{forecast}}\n\nAI生活建议：\n{{advice}}"
  }
};

// 定时任务
let morningJob = null;

// 加载订阅用户
function loadSubscribedUsers() {
  try {
    const dataPath = path.join(__dirname, 'subscribers.json');
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      
      // 转换数据为Map
      for (const [userId, userData] of Object.entries(data)) {
        subscribedUsers.set(userId, userData);
      }
      
      console.log(`[早间提醒] 已加载 ${subscribedUsers.size} 个订阅用户`);
    }
  } catch (error) {
    console.error('[早间提醒] 加载订阅用户数据失败:', error);
  }
}

// 保存订阅用户
function saveSubscribedUsers() {
  try {
    const dataPath = path.join(__dirname, 'subscribers.json');
    const data = Object.fromEntries(subscribedUsers);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('[早间提醒] 保存订阅用户数据失败:', error);
  }
}

// 获取天气数据
async function getWeatherData(city, core) {
  try {
    // 获取天气插件实例
    const weatherPlugin = core.plugins.get('weather')?.instance;
    if (!weatherPlugin) {
      throw new Error('天气插件未加载或不可用');
    }
    
    // 调用天气插件的方法获取数据
    const config = weatherPlugin.config;
    const { getWeather, getWeatherForecast, formatWeatherInfo, formatForecastInfo } = weatherPlugin;
    
    // 获取当天天气和预报
    const weatherData = await getWeather(city, config);
    const forecastData = await getWeatherForecast(city, config);
    
    return {
      weather: weatherData,
      forecast: forecastData
    };
  } catch (error) {
    console.error(`[早间提醒] 获取天气数据失败:`, error);
    throw error;
  }
}

// 获取AI生活建议
async function getAIAdvice(weatherData, forecastData, core) {
  try {
    // 获取AI聊天插件实例
    const aiChatPlugin = core.plugins.get('ai-chat')?.instance;
    if (!aiChatPlugin) {
      throw new Error('AI聊天插件未加载或不可用');
    }
    
    // 构建提示信息
    const today = forecastData.forecasts[0];
    const prompt = `根据今天的天气情况：${weatherData.city}，天气${weatherData.weather}，温度${weatherData.temperature}°C，${weatherData.windDirection}风${weatherData.windPower}级，湿度${weatherData.humidity}%。
预计白天${today.dayWeather}，${today.dayTemp}°C，晚上${today.nightWeather}，${today.nightTemp}°C。
请针对这种天气，给出今日穿着、出行和健康建议，简明扼要，不超过150字。`;
    
    // 使用AI生成建议
    const userId = 'system_morning_alert'; // 系统用户ID
    const advice = await aiChatPlugin.chatWithAI(prompt, userId, null, aiChatPlugin.config);
    
    return advice;
  } catch (error) {
    console.error(`[早间提醒] 获取AI生活建议失败:`, error);
    return "抱歉，无法获取今日生活建议。";
  }
}

// 格式化提醒消息
function formatMorningMessage(weatherData, forecastData, advice, template) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    weekday: 'long' 
  });
  
  // 节假日信息（示例，实际可以接入节假日API）
  const holiday = "";
  
  // 当天天气
  const weather = `${weatherData.city}，${weatherData.weather}，${weatherData.temperature}°C
风向：${weatherData.windDirection}，风力：${weatherData.windPower}级
湿度：${weatherData.humidity}%`;
  
  // 未来天气预报（仅显示今明两天）
  let forecastStr = "未来天气预报：\n";
  for (let i = 0; i < Math.min(2, forecastData.forecasts.length); i++) {
    const f = forecastData.forecasts[i];
    const day = i === 0 ? "今天" : "明天";
    forecastStr += `${day}：白天 ${f.dayWeather} ${f.dayTemp}°C，夜间 ${f.nightWeather} ${f.nightTemp}°C\n`;
  }
  
  // 替换模板
  return template
    .replace('{{date}}', dateStr)
    .replace('{{holiday}}', holiday)
    .replace('{{weather}}', weather)
    .replace('{{forecast}}', forecastStr)
    .replace('{{advice}}', advice);
}

// 发送早间提醒
async function sendMorningAlert(core) {
  console.log('[早间提醒] 开始发送早间提醒...');
  
  // 检查是否有订阅用户
  if (subscribedUsers.size === 0) {
    console.log('[早间提醒] 没有用户订阅，跳过发送');
    return;
  }
  
  try {
    // 获取默认城市的天气数据
    const city = exports.config.defaultCity;
    const weatherResult = await getWeatherData(city, core);
    
    // 获取AI生活建议
    const advice = await getAIAdvice(weatherResult.weather, weatherResult.forecast, core);
    
    // 发送给每个订阅用户
    for (const [userId, userData] of subscribedUsers.entries()) {
      try {
        // 获取用户配置的城市，如果没有则使用默认城市
        const userCity = userData.city || city;
        
        // 如果用户城市与默认城市不同，获取用户城市的天气
        let userWeatherResult = weatherResult;
        if (userCity !== city) {
          userWeatherResult = await getWeatherData(userCity, core);
        }
        
        // 获取模板
        const template = exports.config.templates.morning;
        
        // 格式化消息
        const message = formatMorningMessage(
          userWeatherResult.weather, 
          userWeatherResult.forecast, 
          advice, 
          template
        );
        
        // 发送消息
        await core.sendMsg(userId, message);
        console.log(`[早间提醒] 已向用户 ${userId} 发送早间提醒`);
      } catch (error) {
        console.error(`[早间提醒] 向用户 ${userId} 发送提醒失败:`, error);
      }
    }
    
    console.log('[早间提醒] 早间提醒发送完成');
  } catch (error) {
    console.error('[早间提醒] 发送早间提醒失败:', error);
  }
}

// 初始化定时任务
function initScheduleJob(core) {
  // 取消之前的任务
  if (morningJob) {
    morningJob.cancel();
  }
  
  // 设置新任务
  const time = exports.config.time.split(':');
  const hour = parseInt(time[0]);
  const minute = parseInt(time[1]);
  
  morningJob = schedule.scheduleJob(`${minute} ${hour} * * *`, function() {
    sendMorningAlert(core);
  });
  
  console.log(`[早间提醒] 定时任务已设置，将在每天 ${exports.config.time} 发送提醒`);
}

// 插件初始化方法
exports.initialize = async function(core, pluginConfig) {
  // 存储core引用和配置
  this.core = core;
  
  // 使用传入的pluginConfig，因为它现在应来自Schema
  exports.config = pluginConfig || this.defaultConfig;
  
  // 验证配置的重要字段
  if (!exports.config.time) {
    console.warn('[早间提醒] 警告: 提醒时间未配置，使用默认值"07:00"');
    exports.config.time = "07:00";
  }
  
  if (!exports.config.templates || !exports.config.templates.morning) {
    console.warn('[早间提醒] 警告: 提醒模板未配置，使用默认模板');
    exports.config.templates = exports.config.templates || {};
    exports.config.templates.morning = this.defaultConfig.templates.morning;
  }
  
  // 加载订阅用户
  loadSubscribedUsers();
  
  // 初始化定时任务
  initScheduleJob(core);
  
  console.log(`[早间提醒] 插件已初始化，将在每天 ${exports.config.time} 发送提醒`);
  return true;
};

// 插件命令列表
exports.commands = [
  {
    name: "subscribe",
    pattern: /^\/subscribe$/,
    description: "订阅每日早间提醒服务",
    handler: async function(sender, match) {
      const userId = sender.getUserId();
      
      // 检查是否已订阅
      if (subscribedUsers.has(userId)) {
        await sender.reply("✅ 您已订阅早间提醒服务");
        return;
      }
      
      // 添加订阅
      subscribedUsers.set(userId, {
        subscribeTime: new Date().toISOString(),
        city: null // 默认使用全局配置的城市
      });
      
      // 保存订阅数据
      saveSubscribedUsers();
      
      await sender.reply("✅ 您已成功订阅早间提醒服务，将在每天早上收到天气和生活建议");
    }
  },
  {
    name: "unsubscribe",
    pattern: /^\/unsubscribe$/,
    description: "取消订阅每日早间提醒服务",
    handler: async function(sender, match) {
      const userId = sender.getUserId();
      
      // 检查是否已订阅
      if (!subscribedUsers.has(userId)) {
        await sender.reply("❌ 您尚未订阅早间提醒服务");
        return;
      }
      
      // 取消订阅
      subscribedUsers.delete(userId);
      
      // 保存订阅数据
      saveSubscribedUsers();
      
      await sender.reply("✅ 您已取消订阅早间提醒服务");
    }
  }
];

// 插件卸载方法
exports.unload = async function() {
  // 取消定时任务
  if (morningJob) {
    morningJob.cancel();
    morningJob = null;
  }
  
  console.log('[早间提醒] 插件已卸载');
  return true;
};

// 保存插件配置
async function saveConfig(plugin) {
  try {
    // 使用BNCR事件系统更新配置
    if (plugin.core) {
      await plugin.core.emit('config_updated', { 
        pluginName: 'morning-alert', 
        config: exports.config
      });
      console.log('[早间提醒] 已通过事件系统更新配置');
      return true;
    }
    
    // 如果没有core引用，返回失败
    console.warn('[早间提醒] 未找到core引用，无法保存配置');
    return false;
  } catch (error) {
    console.error('[早间提醒] 保存配置失败:', error);
    return false;
  }
} 