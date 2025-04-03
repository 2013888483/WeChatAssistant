/**
 * @name 天气服务插件
 * @version 1.0.0
 * @description 提供天气查询功能
 * @author shuaijin
 */

// 导入模块
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 插件元数据
exports.meta = {
  name: "天气服务",
  version: "1.0.0",
  description: "提供天气查询功能，支持实时天气和天气预报",
  author: "shuaijin"
};

// 添加标记，表明这是正确支持的导出格式
exports.exportFormat = "object";

// 插件默认配置
exports.defaultConfig = {
  enabled: true,
  api: 'amap',
  key: '',
  defaultCity: '北京',
  showAIAdvice: false
};

// 初始化config属性，以便在智能助手中直接使用
exports.config = exports.defaultConfig;

// 插件初始化方法
exports.initialize = async function(core, pluginConfig) {
  // 存储core引用和配置
  this.core = core;
  
  // 合并配置 - 使用传入的pluginConfig，因为它现在应来自Schema
  this.config = pluginConfig || this.defaultConfig;
    
  // 验证配置
  if (!this.config.key) {
    console.warn('[天气服务] 警告: API密钥未配置，天气服务可能无法正常工作');
  }
  
  if (!this.config.api) {
    console.warn('[天气服务] 警告: API类型未配置，使用默认值"amap"');
    this.config.api = 'amap';
  }
  
  console.log(`[天气服务] 插件已初始化，API: ${this.config.api}, 默认城市: ${this.config.defaultCity || '未设置'}`);
  return true;
};

// 保存配置
async function saveConfig(config) {
  try {
    // 使用BNCR事件系统更新配置
    if (config.core) {
      await config.core.emit('config_updated', { 
        pluginName: 'weather', 
        config: config
      });
      console.log('[天气服务] 已通过事件系统更新配置');
      return true;
    }
    
    // 如果没有core引用，返回失败
    console.warn('[天气服务] 未找到core引用，无法保存配置');
    return false;
  } catch (error) {
    console.error('[天气服务] 保存配置失败:', error);
    return false;
  }
}

// 处理命令
exports.onMessage = async function(message) {
  // 简单的命令解析，你可以使用更复杂的解析方式
  const content = message.content.trim();
  const [command, ...args] = content.split(/\s+/);
  
  // 处理天气查询指令
  if (command === '/天气' || command === '/weather') {
    // 获取城市参数，如果没有提供则使用默认城市
    let city = args.join(' ').trim();
    if (!city) {
      city = this.config.defaultCity;
      if (!city) {
        return '请指定城市名称，例如: /天气 北京';
      }
    }
    
    try {
      const weatherData = await this.getWeather(city);
      return weatherData;
    } catch (error) {
      console.error('[天气服务] 获取天气失败:', error);
      return `获取天气信息失败: ${error.message || '未知错误'}`;
    }
  }
  
  // 处理配置命令
  if (command === '/天气配置' || command === '/weather_config') {
    const subCommand = args[0];
    
    // 显示当前配置
    if (!subCommand || subCommand === 'show') {
      const configInfo = `当前天气服务配置:
- API类型: ${this.config.api || '未设置'}
- 默认城市: ${this.config.defaultCity || '未设置'}
- API密钥: ${this.config.key ? '已设置' : '未设置'}
- 显示AI建议: ${this.config.showAIAdvice ? '是' : '否'}`;
      return configInfo;
    }
    
    // 设置配置项
    if (subCommand === 'set') {
      const key = args[1];
      const value = args.slice(2).join(' ');
      
      if (!key || !value) {
        return '用法: /天气配置 set [选项] [值]\n可用选项: api, defaultCity, key, showAIAdvice';
      }
      
      // 更新配置
      if (['api', 'defaultCity', 'key'].includes(key)) {
        this.config[key] = value;
        const saved = await saveConfig(this);
        if (saved) {
          return `已更新配置: ${key} = ${key === 'key' ? '******' : value}`;
        } else {
          return `配置已更新，但保存失败: ${key} = ${key === 'key' ? '******' : value}`;
        }
      } else if (key === 'showAIAdvice') {
        this.config[key] = value.toLowerCase() === 'true';
        const saved = await saveConfig(this);
        if (saved) {
          return `已更新配置: ${key} = ${this.config[key]}`;
        } else {
          return `配置已更新，但保存失败: ${key} = ${this.config[key]}`;
        }
      } else {
        return `无效的配置选项: ${key}\n可用选项: api, defaultCity, key, showAIAdvice`;
      }
    }
    
    return '未知的天气配置命令，可用命令: show, set';
  }
  
  // 如果不是本插件处理的命令，返回null表示不处理
  return null;
};

// 获取实时天气
exports.getWeather = async function(city) {
  if (!this.config.key) {
    // 使用测试模式，返回模拟数据
    console.log('[天气服务] API密钥未配置，使用模拟数据');
    return this.getMockWeather(city);
  }
  
  try {
    let weather;
    if (this.config.api === 'amap') {
      weather = await this.getAmapWeather(city);
    } else if (this.config.api === 'openweather') {
      weather = await this.getOpenWeatherData(city);
    } else {
      throw new Error(`不支持的API类型: ${this.config.api}`);
    }
    return weather;
  } catch (error) {
    console.error(`[天气服务] 获取天气失败: ${error.message}`);
    throw error;
  }
};

// 获取模拟天气数据
exports.getMockWeather = function(city) {
  const now = new Date();
  const temp = Math.floor(Math.random() * 10) + 15; // 15-25度之间
  const conditions = ['晴朗', '多云', '阴天', '小雨', '晴间多云'][Math.floor(Math.random() * 5)];
  const wind = ['东北', '东南', '西北', '西南', '北', '南', '东', '西'][Math.floor(Math.random() * 8)];
  const humidity = Math.floor(Math.random() * 30) + 40; // 40-70%之间
  
  // 生成未来几天的日期
  const days = [];
  for (let i = 0; i < 3; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    days.push(day);
  }
  
  let weatherInfo = `📍 ${city} 天气信息 (模拟数据)\n`;
  weatherInfo += `🌡️ 当前温度: ${temp}°C\n`;
  weatherInfo += `🌤️ 天气: ${conditions}\n`;
  weatherInfo += `💨 风向: ${wind}风 ${Math.floor(Math.random() * 5) + 1}级\n`;
  weatherInfo += `💧 湿度: ${humidity}%\n\n`;
  
  weatherInfo += `🔮 未来天气预报 (模拟数据):\n`;
  
  // 添加未来几天的天气预报
  for (let i = 0; i < 3; i++) {
    const date = days[i];
    const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    const formattedDate = `${date.getMonth() + 1}月${date.getDate()}日`;
    const dayTemp = Math.floor(Math.random() * 10) + 20; // 20-30度之间
    const nightTemp = dayTemp - Math.floor(Math.random() * 8) - 5; // 白天温度减5-13度
    const weather = ['晴朗', '多云', '阴天', '小雨', '晴间多云'][Math.floor(Math.random() * 5)];
    
    weatherInfo += `${formattedDate} ${dayOfWeek}: ${weather} ${dayTemp}°C ~ ${nightTemp}°C\n`;
  }
  
  weatherInfo += `\n⚠️ 注意: 这是模拟数据，API密钥未配置。请使用 /weconfig set weather.key 您的密钥 配置API密钥获取真实天气。\n`;
  
  return weatherInfo;
};

// 获取高德地图天气数据
exports.getAmapWeather = async function(city) {
  try {
    // 请求高德地图API获取城市编码
    const cityUrl = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(city)}&key=${this.config.key}`;
    const cityResponse = await axios.get(cityUrl);
    const cityData = cityResponse.data;
    
    if (cityData.status !== '1' || !cityData.geocodes || cityData.geocodes.length === 0) {
      throw new Error(`找不到城市: ${city}`);
    }
    
    const adcode = cityData.geocodes[0].adcode;
    const formattedAddress = cityData.geocodes[0].formatted_address;
    
    // 请求高德地图天气API
    const weatherUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${this.config.key}&extensions=all`;
    const weatherResponse = await axios.get(weatherUrl);
    const weatherData = weatherResponse.data;
    
    if (weatherData.status !== '1' || !weatherData.forecasts || weatherData.forecasts.length === 0) {
      throw new Error(`获取天气信息失败: ${weatherData.info || '未知错误'}`);
    }
    
    // 获取实时天气数据
    const liveUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${this.config.key}&extensions=base`;
    const liveResponse = await axios.get(liveUrl);
    const liveData = liveResponse.data;
    
    if (liveData.status !== '1' || !liveData.lives || liveData.lives.length === 0) {
      throw new Error(`获取实时天气信息失败: ${liveData.info || '未知错误'}`);
    }
    
    // 格式化天气信息
    const forecast = weatherData.forecasts[0];
    const live = liveData.lives[0];
    
    let weatherInfo = `📍 ${formattedAddress} 天气信息\n`;
    weatherInfo += `🌡️ 当前温度: ${live.temperature}°C\n`;
    weatherInfo += `🌤️ 天气: ${live.weather}\n`;
    weatherInfo += `💨 风向: ${live.winddirection}风 ${live.windpower}级\n`;
    weatherInfo += `💧 湿度: ${live.humidity}%\n\n`;
    
    weatherInfo += `🔮 未来天气预报:\n`;
    
    // 添加未来几天的天气预报
    for (let i = 0; i < Math.min(forecast.casts.length, 3); i++) {
      const day = forecast.casts[i];
      const date = new Date(day.date);
      const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
      const formattedDate = `${date.getMonth() + 1}月${date.getDate()}日`;
      
      weatherInfo += `${formattedDate} ${dayOfWeek}: ${day.dayweather} ${day.daytemp}°C ~ ${day.nighttemp}°C\n`;
    }
    
    // 如果启用了AI建议，获取并添加
    if (this.config.showAIAdvice) {
      try {
        const aiAdvice = await this.getAIAdvice(live, forecast);
        if (aiAdvice) {
          weatherInfo += `\n🤖 AI建议: ${aiAdvice}\n`;
        }
      } catch (error) {
        console.error('[天气服务] 获取AI建议失败:', error);
      }
    }
    
    return weatherInfo;
  } catch (error) {
    console.error('[天气服务] 高德地图API调用失败:', error);
    throw error;
  }
};

// 获取OpenWeather数据
exports.getOpenWeatherData = async function(city) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${this.config.key}&units=metric&lang=zh_cn`;
    const response = await axios.get(url);
    const data = response.data;
    
    if (data.cod !== '200') {
      throw new Error(data.message || '未知错误');
    }
    
    // 获取当前天气
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${this.config.key}&units=metric&lang=zh_cn`;
    const currentResponse = await axios.get(currentUrl);
    const currentData = currentResponse.data;
    
    if (currentData.cod !== 200) {
      throw new Error(currentData.message || '未知错误');
    }
    
    // 格式化天气信息
    let weatherInfo = `📍 ${data.city.name}, ${data.city.country} 天气信息\n`;
    weatherInfo += `🌡️ 当前温度: ${currentData.main.temp.toFixed(1)}°C (体感温度: ${currentData.main.feels_like.toFixed(1)}°C)\n`;
    weatherInfo += `🌤️ 天气: ${currentData.weather[0].description}\n`;
    weatherInfo += `💨 风速: ${currentData.wind.speed} m/s\n`;
    weatherInfo += `💧 湿度: ${currentData.main.humidity}%\n`;
    weatherInfo += `☁️ 云量: ${currentData.clouds.all}%\n\n`;
    
    weatherInfo += `🔮 未来天气预报:\n`;
    
    // 获取未来几天不同时间的天气预报
    const forecastsByDay = {};
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const day = date.toISOString().split('T')[0];
      
      if (!forecastsByDay[day]) {
        forecastsByDay[day] = [];
      }
      
      forecastsByDay[day].push(item);
    });
    
    // 取每天的中午左右时间的预报作为当天的代表
    Object.keys(forecastsByDay).slice(0, 3).forEach(day => {
      const forecasts = forecastsByDay[day];
      // 尝试找中午12点左右的预报
      let midday = forecasts.reduce((prev, curr) => {
        const date = new Date(curr.dt * 1000);
        const hours = date.getHours();
        const prevHours = new Date(prev.dt * 1000).getHours();
        
        return Math.abs(hours - 12) < Math.abs(prevHours - 12) ? curr : prev;
      }, forecasts[0]);
      
      const date = new Date(midday.dt * 1000);
      const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
      const formattedDate = `${date.getMonth() + 1}月${date.getDate()}日`;
      
      weatherInfo += `${formattedDate} ${dayOfWeek}: ${midday.weather[0].description} ${midday.main.temp_min.toFixed(1)}°C ~ ${midday.main.temp_max.toFixed(1)}°C\n`;
    });
    
    // 如果启用了AI建议，获取并添加
    if (this.config.showAIAdvice) {
      try {
        // 构造一个类似高德API返回的数据结构供AI建议使用
        const liveData = {
          weather: currentData.weather[0].description,
          temperature: currentData.main.temp.toFixed(1),
          windpower: (currentData.wind.speed * 2).toFixed(0), // 粗略转换为风力等级
          humidity: currentData.main.humidity,
          city: data.city.name
        };
        
        const forecastData = {
          casts: [{
            dayweather: data.list[0].weather[0].description,
            daytemp: data.list[0].main.temp_max.toFixed(1),
            nighttemp: data.list[0].main.temp_min.toFixed(1)
          }]
        };
        
        const aiAdvice = await this.getAIAdvice(liveData, forecastData);
        if (aiAdvice) {
          weatherInfo += `\n🤖 AI建议: ${aiAdvice}\n`;
        }
      } catch (error) {
        console.error('[天气服务] 获取AI建议失败:', error);
      }
    }
    
    return weatherInfo;
  } catch (error) {
    console.error('[天气服务] OpenWeather API调用失败:', error);
    throw error;
  }
};

// 获取AI生活建议
exports.getAIAdvice = async function(weatherData, forecastData) {
  try {
    // 获取AI聊天插件实例
    const aiChatPlugin = this.core?.plugins?.get('ai-chat')?.instance;
    if (!aiChatPlugin) {
      console.log('[天气服务] AI聊天插件未加载或不可用，使用本地生成建议');
      // 如果AI聊天插件不可用，提供一个基于天气状况的简单建议
      return generateLocalAdvice(weatherData, forecastData);
    }
    
    // 构建提示信息
    const today = forecastData.casts[0];
    const prompt = `根据今天的天气情况：${weatherData.city}，天气${weatherData.weather}，温度${weatherData.temperature}°C，湿度${weatherData.humidity}%。
预计白天${today.dayweather}，最高温度${today.daytemp}°C，最低温度${today.nighttemp}°C。
请针对这种天气，给出今日穿着、出行和健康建议，简明扼要，不超过100字。`;
    
    // 使用AI生成建议
    const userId = 'system_weather_service'; // 系统用户ID
    const advice = await aiChatPlugin.chatWithAI(prompt, userId, null, aiChatPlugin.config);
    
    return advice;
  } catch (error) {
    console.error(`[天气服务] 获取AI生活建议失败:`, error);
    // 出错时也使用本地生成的建议
    return generateLocalAdvice(weatherData, forecastData);
  }
};

// 本地生成天气建议的函数
function generateLocalAdvice(weatherData, forecastData) {
  try {
    const weather = weatherData.weather?.toLowerCase() || '';
    const temp = parseFloat(weatherData.temperature) || 0;
    
    let clothingAdvice = '';
    let travelAdvice = '';
    let healthAdvice = '';
    
    // 根据温度给出穿衣建议
    if (temp >= 30) {
      clothingAdvice = '穿轻薄透气的衣物，注意防晒';
    } else if (temp >= 25) {
      clothingAdvice = '穿短袖短裤等夏季服装';
    } else if (temp >= 20) {
      clothingAdvice = '穿薄长袖或短袖';
    } else if (temp >= 15) {
      clothingAdvice = '穿长袖衬衫或薄外套';
    } else if (temp >= 10) {
      clothingAdvice = '穿外套或薄毛衣';
    } else if (temp >= 5) {
      clothingAdvice = '穿保暖外套、毛衣、围巾';
    } else {
      clothingAdvice = '穿厚外套、保暖内衣、手套、围巾等保暖装备';
    }
    
    // 根据天气状况给出出行建议
    if (weather.includes('雨')) {
      travelAdvice = '记得带伞，最好穿防水鞋';
    } else if (weather.includes('雪')) {
      travelAdvice = '注意道路结冰，穿防滑鞋';
    } else if (weather.includes('雾') || weather.includes('霾')) {
      travelAdvice = '外出佩戴口罩，开车注意安全';
    } else if (weather.includes('晴') && temp > 28) {
      travelAdvice = '外出做好防晒措施，多补充水分';
    } else if (weather.includes('多云')) {
      travelAdvice = '天气较为舒适，适宜外出活动';
    } else {
      travelAdvice = '注意随时关注天气变化';
    }
    
    // 健康建议
    if (temp > 30) {
      healthAdvice = '避免长时间户外活动，多喝水，防止中暑';
    } else if (temp < 5) {
      healthAdvice = '注意保暖，预防感冒';
    } else if (weather.includes('雨') || weather.includes('雪')) {
      healthAdvice = '保持室内空气流通，防止湿气';
    } else {
      healthAdvice = '适当户外运动，增强身体抵抗力';
    }
    
    return `${clothingAdvice}；${travelAdvice}；${healthAdvice}。`;
  } catch (e) {
    console.error('[天气服务] 生成本地建议失败:', e);
    return '今日穿着适当，出行注意安全，保持良好心情。';
  }
}

// 方便其他插件调用的兼容API
exports.getWeatherForecast = async function(city) {
  // 转发到新的API实现
  return this.getWeather(city);
};

// 插件卸载方法
exports.unload = async function() {
  console.log('[天气服务] 插件已卸载');
  return true;
};

// 处理天气命令
exports.handleWeatherCommand = async function(city, sender) {
  if (!city && this.config.defaultCity) {
    city = this.config.defaultCity;
  }
  
  if (!city) {
    throw new Error('请指定城市名称，例如: /weather 北京');
  }
  
  try {
    console.log(`[天气服务] 处理天气查询命令，城市: ${city}`);
    
    // 检查配置是否存在，如果不存在则尝试从sender获取配置
    if (!this.config.key) {
      console.log('[天气服务] API密钥未配置，尝试从智能助手配置中读取');
      
      // 尝试从sender的额外配置中获取配置
      const configFromSender = sender?.plugin?.config?.weather;
      if (configFromSender && configFromSender.key) {
        console.log('[天气服务] 从智能助手配置中获取到API密钥');
        this.config.key = configFromSender.key;
        this.config.api = configFromSender.api || this.config.api;
        this.config.defaultCity = configFromSender.defaultCity || this.config.defaultCity;
      }
    }
    
    // 启用AI建议功能
    this.config.showAIAdvice = true;
    
    const weatherData = await this.getWeather(city);
    return weatherData;
  } catch (error) {
    console.error('[天气服务] 获取天气失败:', error);
    throw error;
  }
}; 