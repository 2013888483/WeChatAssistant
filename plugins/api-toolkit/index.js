  /**
   * @name API工具箱
   * @version 1.0.0
   * @description 提供多种API调用功能，支持自定义扩展
   * @author shuaijin
   */

  // 导入模块
  const axios = require('axios');
  const fs = require('fs');
  const path = require('path');

  // 插件元数据
  exports.meta = {
    name: "API工具箱",
    version: "1.0.0",
    description: "提供多种API调用功能，支持自定义扩展",
    author: "shuaijin"
  };

  // 插件配置路径
  const configPath = path.join(__dirname, 'config.json');

  // 加载配置
  function loadConfig() {
    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configContent);
      }
      console.error('[API工具箱] 配置文件不存在，使用默认配置');
      return {
        enabled: true,
        commandPrefix: "api",
        apis: {},
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
      console.error('[API工具箱] 加载配置出错:', error);
      return {
        enabled: true,
        commandPrefix: "api",
        apis: {},
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

  // 保存配置
  function saveConfig(config) {
    try {
      const configContent = JSON.stringify(config, null, 2);
      fs.writeFileSync(configPath, configContent, 'utf8');
      return true;
    } catch (error) {
      console.error('[API工具箱] 保存配置出错:', error);
      return false;
    }
  }

  // 调用API
  async function callAPI(apiKey, config, userParams = {}) {
    const apiConfig = config.apis[apiKey];
    if (!apiConfig || !apiConfig.enabled) {
      console.error(`[API工具箱] API "${apiKey}" 不存在或已禁用`);
      return { success: false, message: `API "${apiKey}" 不存在或已禁用` };
    }
    
    try {
      console.log(`[API工具箱][调试] =================== API请求开始 ===================`);
      console.log(`[API工具箱][调试] 调用API "${apiKey}", URL: ${apiConfig.url}`);
      console.log(`[API工具箱][调试] 请求方法: ${apiConfig.method || 'GET'}`);
      
      // 合并配置参数和用户参数（用户参数优先）
      const apiParams = { ...(apiConfig.params || {}), ...userParams };
      console.log(`[API工具箱][调试] 合并后的参数:`, JSON.stringify(apiParams));
      console.log(`[API工具箱][调试] 请求头:`, JSON.stringify(apiConfig.headers || { 'User-Agent': 'WechatAssistant/1.0' }));
      
      // 打印完整请求信息
      const fullUrl = apiConfig.url + 
        (Object.keys(apiParams).length > 0 ? 
          `?${Object.entries(apiParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}` : 
          '');
      console.log(`[API工具箱][调试] 完整URL: ${fullUrl}`);
      
      // 发送API请求
      console.log(`[API工具箱][调试] 开始发送HTTP请求...`);
      
      // 构建完整URL与参数，用于调试
      const requestConfig = {
        method: apiConfig.method || 'GET',
        url: apiConfig.url,
        headers: apiConfig.headers || {
          'User-Agent': 'WechatAssistant/1.0'
        },
        params: apiParams,
        data: apiConfig.data || {},
        timeout: 30000 // 30秒超时
      };
      
      // 打印完整的请求配置
      console.log(`[API工具箱][调试] 完整请求配置:`, JSON.stringify(requestConfig));
      
      // 打印axios最终会发送的URL (手动构建用于调试)
      let finalUrl = apiConfig.url;
      if (Object.keys(apiParams).length > 0) {
        const queryString = Object.entries(apiParams)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
      }
      console.log(`[API工具箱][调试] 最终请求URL: ${finalUrl}`);
      
      // 发送请求
      try {
        console.log(`[API工具箱][调试] 即将发送请求...`);
        const response = await axios(requestConfig);
        
        console.log(`[API工具箱][调试] HTTP请求已完成`);
        console.log(`[API工具箱][调试] 响应状态码: ${response.status}`);
        console.log(`[API工具箱][调试] 响应头:`, JSON.stringify(response.headers));
        
        // 打印响应数据，但限制长度
        const responseDataStr = JSON.stringify(response.data);
        console.log(`[API工具箱][调试] 响应数据: ${responseDataStr.length <= 500 ? responseDataStr : responseDataStr.substring(0, 500) + '... (已截断)'}`);
        
        // 处理响应数据
        return processAPIResponse(response, apiKey, apiConfig);
      } catch (error) {
        console.error(`[API工具箱][调试] 发送请求失败: ${error.message}`);
        
        if (error.response) {
          console.error(`[API工具箱][调试] 错误状态: ${error.response.status}`);
          console.error(`[API工具箱][调试] 错误数据: ${JSON.stringify(error.response.data)}`);
          
          return {
            success: false,
            message: `API请求失败: 服务器返回 ${error.response.status} 错误`
          };
        } else if (error.request) {
          console.error(`[API工具箱][调试] 请求已发送但未收到响应`);
          
          return {
            success: false,
            message: `API请求失败: 服务器未响应，可能是网络问题或API服务不可用`
          };
        } else {
          console.error(`[API工具箱][调试] 请求配置错误:`, error.config);
          
          return {
            success: false,
            message: `API请求失败: ${error.message}`
          };
        }
      }
    } catch (outerError) {
      console.error(`[API工具箱][调试] 调用API "${apiKey}" 出错:`, outerError.message);
      console.log(`[API工具箱][调试] =================== API请求结束 ===================`);
      return {
        success: false,
        message: `API请求异常: ${outerError.message}`
      };
    }
  }

  // 用户调用频率限制
  const userRateLimits = new Map();

  // 检查用户是否超出调用限制
  function checkRateLimit(userId, config) {
    if (!config.rateLimit.enabled) {
      return true; // 未启用限制
    }
    
    const now = Date.now();
    const userLimit = userRateLimits.get(userId) || {
      count: 0,
      resetTime: now + config.rateLimit.timeWindow
    };
    
    // 如果重置时间已过，重置计数
    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + config.rateLimit.timeWindow;
    }
    
    // 检查是否达到限制
    if (userLimit.count >= config.rateLimit.perUser) {
      return false;
    }
    
    // 增加计数
    userLimit.count++;
    userRateLimits.set(userId, userLimit);
    return true;
  }

  // 缓存系统
  const apiCache = new Map();

  // 验证和修正URL
  function normalizeMediaUrl(url) {
    console.log(`[API工具箱] 开始规范化URL: ${url}`);
    
    if (!url) {
      return url;
    }
    
    // 确保URL有协议头
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
      console.log(`[API工具箱] 添加了HTTPS协议头: ${url}`);
    }
    
    // 尝试编码URL中的特殊字符
    try {
      // 先分解URL，只对路径部分进行编码
      const urlObj = new URL(url);
      
      // 对路径部分进行处理
      if (urlObj.pathname) {
        // 保留正斜杠，但编码其他特殊字符
        const parts = urlObj.pathname.split('/');
        const encodedParts = parts.map(part => {
          if (part) {
            return encodeURIComponent(part);
          }
          return '';
        });
        
        urlObj.pathname = encodedParts.join('/');
        console.log(`[API工具箱] 编码了URL路径部分`);
      }
      
      // 从URL对象重建完整URL
      const normalizedUrl = urlObj.toString();
      console.log(`[API工具箱] 规范化后的URL: ${normalizedUrl}`);
      return normalizedUrl;
    } catch (error) {
      console.error(`[API工具箱] URL规范化出错: ${error.message}, 使用原始URL`);
      return url;
    }
  }

  // 尝试使用多种方式发送图片
  async function sendImageWithFallback(sender, imageUrl) {
    // 规范化URL
    imageUrl = normalizeMediaUrl(imageUrl);
    console.log(`[API工具箱] 尝试多种方式发送图片: ${imageUrl}`);
    
    // 记录每种尝试方法
    const attempts = [];
    
    // 方法1: 使用推荐的对象格式带path属性
    try {
      attempts.push("path参数模式");
      await sender.reply({
        type: 'image',
        path: imageUrl,
        msg: '图片来啦'
      });
      console.log(`[API工具箱] 成功使用path参数模式发送图片`);
      return true;
    } catch (error) {
      console.error(`[API工具箱] path参数模式发送失败: ${error.message}`);
    }
    
    // 方法2: 使用兼容的对象格式
    try {
      attempts.push("url参数模式");
      await sender.reply({
        type: 'image',
        url: imageUrl
      });
      console.log(`[API工具箱] 成功使用url参数模式发送图片`);
      return true;
    } catch (error) {
      console.error(`[API工具箱] url参数模式发送失败: ${error.message}`);
    }
    
    // 方法3: 尝试使用简化对象格式
    try {
      attempts.push("简化对象模式");
      await sender.reply({
        msg: imageUrl
      });
      console.log(`[API工具箱] 成功使用简化对象模式发送图片`);
      return true;
    } catch (error) {
      console.error(`[API工具箱] 简化对象模式发送失败: ${error.message}`);
    }
    
    // 方法4: 尝试使用纯字符串URL
    try {
      attempts.push("纯字符串URL");
      await sender.reply(imageUrl);
      console.log(`[API工具箱] 成功使用纯字符串URL发送图片`);
      return true;
    } catch (error) {
      console.error(`[API工具箱] 纯字符串URL发送失败: ${error.message}`);
    }
    
    // 方法5: 最终回退 - 发送文本形式
    try {
      attempts.push("文本消息格式");
      await sender.reply({
        type: 'text',
        msg: `图片地址: ${imageUrl}`
      });
      console.log(`[API工具箱] 成功使用文本消息格式发送图片URL`);
      return true;
    } catch (error) {
      console.error(`[API工具箱] 文本消息格式发送失败: ${error.message}`);
    }
    
    // 所有方法都失败，发送失败信息和图片URL
    console.error(`[API工具箱] 所有图片发送方法都失败: ${attempts.join(', ')}`);
    try {
      await sender.reply(`❌ 无法直接发送图片，请使用此链接查看: ${imageUrl}`);
    } catch (finalError) {
      console.error(`[API工具箱] 最终错误通知也失败: ${finalError.message}`);
    }
    
    return false;
  }

  // 尝试使用多种方式发送视频
  async function sendVideoWithFallback(sender, videoUrl) {
    // 规范化URL
    videoUrl = normalizeMediaUrl(videoUrl);
    console.log(`[API工具箱] 尝试多种方式发送视频: ${videoUrl}`);
    
    // 记录每种尝试方法
    const attempts = [];
    
    // 方法1: 使用推荐的对象格式带path属性
    try {
      attempts.push("path参数模式");
      await sender.reply({
        type: 'video',
        path: videoUrl,
        msg: '视频来啦'
      });
      console.log(`[API工具箱] 成功使用path参数模式发送视频`);
      return true;
    } catch (error) {
      console.error(`[API工具箱] path参数模式发送失败: ${error.message}`);
    }
    
    // 方法2: 使用内置的sendVideo方法
    try {
      attempts.push("sendVideo方法");
      await sender.sendVideo(videoUrl);
      console.log(`[API工具箱] 成功使用sendVideo方法发送视频`);
      return true;
    } catch (error) {
      console.error(`[API工具箱] sendVideo方法发送失败: ${error.message}`);
    }
    
    // 方法3: 使用兼容的对象格式带url属性
    try {
      attempts.push("url参数模式");
      await sender.reply({
        type: 'video',
        url: videoUrl
      });
      console.log(`[API工具箱] 成功使用url参数模式发送视频`);
      return true;
    } catch (error) {
      console.error(`[API工具箱] url参数模式发送失败: ${error.message}`);
    }
    
    // 方法4: 使用简化对象格式
    try {
      attempts.push("简化对象模式");
      await sender.reply({
        msg: videoUrl,
        type: 'video'
      });
      console.log(`[API工具箱] 成功使用简化对象模式发送视频`);
      return true;
    } catch (error) {
      console.error(`[API工具箱] 简化对象模式发送失败: ${error.message}`);
    }
    
    // 方法5: 尝试使用通用回复直接发送URL，依靠框架自动识别
    try {
      attempts.push("直接URL模式");
      await sender.reply(videoUrl);
      console.log(`[API工具箱] 成功使用直接URL模式发送视频`);
      return true;
    } catch (error) {
      console.error(`[API工具箱] 直接URL模式发送失败: ${error.message}`);
    }
    
    // 方法6: 使用XML格式特殊消息
    try {
      attempts.push("XML特殊消息");
      const xmlMsg = `<msg><video url="${videoUrl}"/></msg>`;
      await sender.reply({
        type: 'xml',
        msg: xmlMsg
      });
      console.log(`[API工具箱] 成功使用XML特殊消息格式发送视频`);
      return true;
    } catch (error) {
      console.error(`[API工具箱] XML特殊消息格式发送失败: ${error.message}`);
    }
    
    // 所有方法都失败，发送失败信息和视频URL
    console.error(`[API工具箱] 所有视频发送方法都失败: ${attempts.join(', ')}`);
    try {
      await sender.reply(`⚠️ 无法直接播放视频，请点击链接查看: ${videoUrl}`);
    } catch (finalError) {
      console.error(`[API工具箱] 最终错误通知也失败: ${finalError.message}`);
    }
    
    return false;
  }

  // 从缓存获取结果，若无则调用API并缓存
  async function getAPIWithCache(apiKey, userId, config, userParams = {}) {
    // 获取API配置
    const apiConfig = config.apis[apiKey];
    
    // 如果有用户参数，或缓存已禁用，或是图片/视频类型API，禁用缓存
    const isMediaType = apiConfig && (apiConfig.type === 'image' || apiConfig.type === 'video');
    
    // 对于图片类API，每次添加一个随机参数以避免获取相同的图片
    if (isMediaType) {
      // 添加随机时间戳参数
      userParams._t = Date.now();
      // 添加随机数参数
      userParams._r = Math.floor(Math.random() * 10000000);
      
      console.log(`[API工具箱] 媒体类型API(${apiKey})添加随机参数防止缓存: _t=${userParams._t}, _r=${userParams._r}`);
    }
    
    if (Object.keys(userParams).length > 0 || !config.cache.enabled || isMediaType) {
      const reason = Object.keys(userParams).length > 0 
        ? '存在用户参数' 
        : !config.cache.enabled 
          ? '缓存已禁用' 
          : '媒体类型API不缓存';
          
      console.log(`[API工具箱] ${reason}，直接调用API ${apiKey}`);
      return await callAPI(apiKey, config, userParams);
    }
    
    const cacheKey = `${apiKey}-${userId}`;
    const cached = apiCache.get(cacheKey);
    
    // 检查缓存是否有效
    if (cached && cached.expiry > Date.now()) {
      console.log(`[API工具箱] 使用缓存的API ${apiKey} 结果`);
      return cached.data;
    }
    
    console.log(`[API工具箱] 缓存未命中或已过期，调用API ${apiKey}`);
    
    // 调用API
    const result = await callAPI(apiKey, config, userParams);
    
    // 缓存结果
    if (result.success) {
      console.log(`[API工具箱] 缓存API ${apiKey} 调用结果`);
      apiCache.set(cacheKey, {
        data: result,
        expiry: Date.now() + config.cache.expiry
      });
    }
    
    return result;
  }

  // 清理过期缓存
  function cleanExpiredCache() {
    const now = Date.now();
    
    for (const [key, value] of apiCache.entries()) {
      if (value.expiry < now) {
        apiCache.delete(key);
      }
    }
  }

  // 获取可用API列表
  function getAPIList(config) {
    const apiList = [];
    
    for (const [key, api] of Object.entries(config.apis)) {
      if (api.enabled) {
        apiList.push({
          key,
          name: api.name,
          description: api.description,
          type: api.type
        });
      }
    }
    
    return apiList;
  }

  // 解析命令参数
  function parseCommandParams(paramsString) {
    if (!paramsString || paramsString.trim() === '') {
      return {};
    }
    
    const params = {};
    try {
      // 尝试解析JSON格式参数 {"key":"value", "key2":"value2"}
      if (paramsString.trim().startsWith('{') && paramsString.trim().endsWith('}')) {
        return JSON.parse(paramsString);
      }
      
      // 解析键值对格式 key=value&key2=value2
      const pairs = paramsString.split('&');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key.trim()] = value.trim();
        }
      }
    } catch (error) {
      console.error(`[API工具箱] 解析参数出错:`, error);
    }
    
    return params;
  }

  // 规范化API键名，处理大小写和特殊字符问题
  function normalizeApiKey(apiKey, config) {
    console.log(`[API工具箱][调试] 规范化API键，原始值: "${apiKey}"`);
    
    if (!apiKey) {
      console.log(`[API工具箱][调试] API键为空或undefined`);
      return apiKey;
    }
    
    // 原始输入的键名
    const originalKey = apiKey;
    
    // 转换为小写进行比较
    const lowerApiKey = apiKey.toLowerCase();
    
    // 1. 准确匹配（区分大小写）
    if (config.apis[apiKey]) {
      console.log(`[API工具箱][调试] 找到精确匹配(区分大小写): "${apiKey}"`);
      return apiKey;
    }
    
    // 2. 准确匹配（不区分大小写）
    const exactMatchKey = Object.keys(config.apis).find(key => 
      key.toLowerCase() === lowerApiKey);
    
    if (exactMatchKey) {
      console.log(`[API工具箱][调试] 找到精确匹配(不区分大小写): "${exactMatchKey}"`);
      return exactMatchKey;
    }
    
    // 3. 直接检查常见API名称
    const commonApis = ['acg-pc', 'acg-wap', '4k-acg', '4k-wallpaper'];
    for (const commonApi of commonApis) {
      if (lowerApiKey === commonApi.toLowerCase()) {
        const matchKey = Object.keys(config.apis).find(key => 
          key.toLowerCase() === commonApi.toLowerCase());
        if (matchKey) {
          console.log(`[API工具箱][调试] 匹配常见API: "${matchKey}"`);
          return matchKey;
        }
      }
    }
    
    // 4. 处理连字符问题
    if (apiKey.includes('-')) {
      console.log(`[API工具箱][调试] API键包含连字符，尝试特殊处理`);
      
      // 4.1 直接匹配配置中的键
      const hyphenKeys = Object.keys(config.apis).filter(key => key.includes('-'));
      for (const key of hyphenKeys) {
        if (key.toLowerCase() === lowerApiKey) {
          console.log(`[API工具箱][调试] 找到连字符精确匹配: "${key}"`);
          return key;
        }
      }
      
      // 4.2 尝试部分匹配
      const parts = apiKey.split('-');
      if (parts.length === 2) {
        const [prefix, suffix] = parts;
        
        // 查找同前缀的键
        const prefixMatches = Object.keys(config.apis).filter(key => 
          key.toLowerCase().startsWith(prefix.toLowerCase() + '-'));
        
        if (prefixMatches.length > 0) {
          console.log(`[API工具箱][调试] 找到前缀匹配: ${prefixMatches.join(', ')}`);
          
          // 在前缀匹配中查找后缀匹配
          const fullMatch = prefixMatches.find(key => {
            const keyParts = key.split('-');
            return keyParts.length === 2 && keyParts[1].toLowerCase() === suffix.toLowerCase();
          });
          
          if (fullMatch) {
            console.log(`[API工具箱][调试] 找到完整的前缀-后缀匹配: "${fullMatch}"`);
            return fullMatch;
          }
          
          // 如果没有完全匹配，返回第一个前缀匹配
          console.log(`[API工具箱][调试] 使用第一个前缀匹配: "${prefixMatches[0]}"`);
          return prefixMatches[0];
        }
      }
    }
    
    // 5. 尝试查找没有连字符的变体
    const keyWithoutHyphen = apiKey.replace(/-/g, '');
    const matchWithoutHyphen = Object.keys(config.apis).find(key => 
      key.toLowerCase() === keyWithoutHyphen.toLowerCase());
    
    if (matchWithoutHyphen) {
      console.log(`[API工具箱][调试] 找到无连字符匹配: "${matchWithoutHyphen}"`);
      return matchWithoutHyphen;
    }
    
    // 6. 模糊匹配 - 检查是否是一个API的前缀
    const possiblePrefixMatch = Object.keys(config.apis).find(key => 
      key.toLowerCase().startsWith(lowerApiKey) || 
      (key.includes('-') && key.split('-')[0].toLowerCase() === lowerApiKey));
    
    if (possiblePrefixMatch) {
      console.log(`[API工具箱][调试] 找到前缀匹配: "${possiblePrefixMatch}"`);
      return possiblePrefixMatch;
    }
    
    // 7. 最后尝试查找部分匹配
    const partialMatches = Object.keys(config.apis).filter(key => 
      key.toLowerCase().includes(lowerApiKey) || 
      lowerApiKey.includes(key.toLowerCase()));
    
    if (partialMatches.length > 0) {
      console.log(`[API工具箱][调试] 找到部分匹配: "${partialMatches[0]}"`);
      return partialMatches[0];
    }
    
    // 如果所有匹配都失败，返回原始键
    console.log(`[API工具箱][调试] 未找到匹配，使用原始键: "${originalKey}"`);
    return originalKey;
  }

  // 处理API命令
  async function handleAPICommand(apiKey, sender, config, paramsString = '') {
    const userId = sender.getUserId();
    
    // 规范化API键名
    const normalizedApiKey = normalizeApiKey(apiKey, config);
    
    // 从配置中获取API
    if (!normalizedApiKey || !config.apis[normalizedApiKey]) {
      console.log(`[API工具箱] API ${apiKey} 未找到，尝试展示帮助信息`);
      // API不存在，展示帮助信息
      if (apiKey === 'help' || apiKey === '?' || apiKey === 'list') {
        sender.reply(generateAPIListText(config));
        return true;
      }
      await sender.reply(`❌ API "${apiKey}" 不存在或已禁用。\n请使用 /${config.commandPrefix} help 查看可用API列表`);
      return false;
    }
    
    // API存在，检查是否启用
    const apiConfig = config.apis[normalizedApiKey];
    if (!apiConfig.enabled) {
      await sender.reply(`❌ API "${normalizedApiKey}" 已禁用。`);
      return false;
    }

    console.log(`[API工具箱] 收到API请求: ${normalizedApiKey}, 用户ID: ${userId}`);
    
    // 检查调用频率限制
    if (!checkRateLimit(userId, config)) {
      const timeLeft = Math.ceil((userRateLimits.get(userId).resetTime - Date.now()) / 1000);
      await sender.reply(`⏱️ 您的API调用太频繁，请在${timeLeft}秒后再试。`);
      return false;
    }
    
    // 对于特殊的聚合热搜API，直接在这里处理，不进行HTTP请求
    if (normalizedApiKey === 'allhot' || normalizedApiKey === 'hot') {
      // 发送加载中消息
      let loadingMsg = await sender.reply(`⏳ 正在聚合热搜数据，请稍候...`);
      
      try {
        // 热搜API列表
        const hotSearchApis = ['weibohot', 'douyinhot', 'baiduhot', 'bilibilihot'];
        let allResults = [];
        let failedApis = [];
        
        // 并行获取所有热搜API数据
        const promises = hotSearchApis.map(async (api) => {
          try {
            if (config.apis[api]) {
              const result = await getAPIWithCache(api, userId, config, {});
              if (result.success && result.data) {
                return {
                  api: api,
                  data: result.data
                };
              } else {
                failedApis.push(api);
                return null;
              }
            } else {
              return null;
            }
          } catch (error) {
            console.error(`[API工具箱] 获取${api}数据失败: ${error.message}`);
            failedApis.push(api);
            return null;
          }
        });
        
        // 等待所有API请求完成
        const results = await Promise.all(promises);
        
        // 删除加载消息
        if (loadingMsg) {
          await sender.delMsg(loadingMsg);
        }
        
        // 处理结果
        let combinedMessage = `📊 全网热搜聚合 (${new Date().toLocaleString()})\n\n`;
        
        // 过滤掉失败的请求
        allResults = results.filter(r => r !== null);
        
        if (allResults.length === 0) {
          await sender.reply(`❌ 获取热搜数据失败，请稍后再试。`);
          return false;
        }
        
        // 按照API列表顺序格式化内容
        for (const result of allResults) {
          if (result && result.data) {
            // 每个API只展示前5条结果
            const formattedData = await formatHotSearchData(result.api, result.data, 5);
            combinedMessage += formattedData + "\n\n";
          }
        }
        
        // 添加提示信息
        if (failedApis.length > 0) {
          combinedMessage += `注：${failedApis.join(', ')} 数据获取失败。\n`;
        }
        
        // 添加完整查看提示
        combinedMessage += `提示：使用 /api weibohot、/api douyinhot 等命令可查看完整榜单。`;
        
        // 发送合并的消息
        await sender.reply(combinedMessage);
        return true;
        
      } catch (error) {
        console.error(`[API工具箱] 聚合热搜出错: ${error.message}`);
        await sender.reply(`❌ 聚合热搜出错: ${error.message}`);
        return false;
      }
    }
    
    // 解析用户传入的参数
    const userParams = {};
    if (paramsString && paramsString.trim()) {
      console.log(`[API工具箱][调试] 解析参数字符串: "${paramsString}"`);
      try {
        // 分析参数格式
        if (paramsString.includes('=')) {
          // 键值对格式 (如 "key1=value1 key2=value2")
          const pairs = paramsString.split(/\s+/);
          for (const pair of pairs) {
            if (pair.includes('=')) {
              const [key, value] = pair.split('=', 2);
              if (key && value) {
                userParams[key.trim()] = value.trim();
              }
            }
          }
        } else {
          // 单一参数格式，使用API配置中的第一个参数名作为键
          const paramKeys = Object.keys(apiConfig.params || {});
          if (paramKeys.length > 0) {
            userParams[paramKeys[0]] = paramsString.trim();
          } else {
            // 如果API没有预定义参数，尝试使用通用参数名
            userParams['query'] = paramsString.trim();
          }
        }
        
        console.log(`[API工具箱][调试] 解析后的用户参数:`, JSON.stringify(userParams));
      } catch (parseError) {
        console.error(`[API工具箱] 解析参数错误: ${parseError.message}`);
        await sender.reply(`❌ 参数格式错误: ${parseError.message}`);
        return false;
      }
    }
    
    // 发送加载中消息
    let loadingMsg = null;
    try {
      loadingMsg = await sender.reply(`⏳ 正在获取${apiConfig.name || normalizedApiKey}，请稍候...`);
      console.log(`[API工具箱] 发送了加载消息，ID: ${loadingMsg}`);
    } catch (loadingErr) {
      console.error(`[API工具箱] 发送加载消息失败: ${loadingErr.message}`);
    }
    
    // 设置超时
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('API请求超时(30秒)'));
      }, 30000);
    });
    
    try {
      // 获取API结果，传递用户参数，添加超时处理
      console.log(`[API工具箱][调试] 开始调用API ${normalizedApiKey}，配置:`, JSON.stringify(config.apis[normalizedApiKey]));
      
      // 使用Promise.race实现超时
      const result = await Promise.race([
        getAPIWithCache(normalizedApiKey, userId, config, userParams),
        timeoutPromise
      ]);
      
      // 清除超时计时器
      clearTimeout(timeoutId);
      
      console.log(`[API工具箱][调试] API调用结果: ${JSON.stringify(result)}`);
      
      if (!result.success) {
        console.error(`[API工具箱] API调用失败: ${result.message}`);
        // 删除加载消息
        try {
          if (loadingMsg) {
            await sender.delMsg(loadingMsg);
          }
        } catch (delErr) {
          console.error(`[API工具箱] 删除加载消息失败: ${delErr.message}`);
        }
        await sender.reply(`❌ ${result.message}`);
        return false;
      }
      
      // 根据API类型处理结果
      console.log(`[API工具箱][调试] 处理API结果，类型: ${result.type}`);
      
      // 删除加载消息
      try {
        if (loadingMsg) {
          await sender.delMsg(loadingMsg);
          console.log(`[API工具箱] 成功删除加载消息`);
        }
      } catch (delErr) {
        console.error(`[API工具箱] 删除加载消息失败: ${delErr.message}`);
      }
      
      // 切换多种发送方式尝试
      let sendSuccess = false;

      // 处理text类型返回
      if (result.type === 'text') {
        try {
          // 如果是数组，格式化成列表
          if (Array.isArray(result.data)) {
            // 针对不同API进行特殊处理
            if (normalizedApiKey === 'douyinhot') {
              // 抖音热搜榜特殊处理
              let formattedText = `📊 抖音热搜榜 TOP 15：\n\n`;
              // 限制显示前15条
              const topItems = result.data.slice(0, 15);
              topItems.forEach((item, index) => {
                if (item && typeof item === 'object') {
                  // 提取热搜词和热度值
                  const word = item.word || '未知';
                  const hotValue = item.hot_value ? Math.floor(item.hot_value / 10000) : 0;
                  formattedText += `${index + 1}. ${word} ${hotValue > 0 ? `(${hotValue}万热度)` : ''}\n`;
                }
              });
              await sender.reply(formattedText);
              sendSuccess = true;
            } else if (normalizedApiKey === 'weibohot') {
              // 微博热搜榜特殊处理
              let formattedText = `🔥 微博热搜榜 TOP 15：\n\n`;
              // 限制显示前15条
              const topItems = result.data.slice(0, 15);
              topItems.forEach((item, index) => {
                if (item && typeof item === 'object') {
                  // 提取热搜词和热度值
                  const title = item.title || item.hot_word || '未知';
                  const hotValue = item.hot || item.hot_value;
                  let hotText = '';
                  
                  if (hotValue) {
                    if (hotValue > 10000) {
                      hotText = `(${Math.floor(hotValue / 10000)}万)`;
                    } else {
                      hotText = `(${hotValue})`;
                    }
                  }
                  
                  // 添加标签信息
                  let tag = '';
                  if (item.icon_desc || item.label) {
                    tag = item.icon_desc || item.label;
                    tag = ` [${tag}]`;
                  }
                  
                  formattedText += `${index + 1}. ${title}${tag} ${hotText}\n`;
                }
              });
              await sender.reply(formattedText);
              sendSuccess = true;
            } else if (normalizedApiKey === 'zhihuhot') {
              // 知乎热搜榜特殊处理
              let formattedText = `❓ 知乎热榜 TOP 15：\n\n`;
              // 限制显示前15条
              const topItems = result.data.slice(0, 15);
              topItems.forEach((item, index) => {
                if (item && typeof item === 'object') {
                  // 提取标题和热度
                  const title = item.title || item.question || '未知';
                  const hotValue = item.hot || item.score;
                  let hotText = '';
                  
                  if (hotValue) {
                    hotText = ` (${hotValue})`;
                  }
                  
                  formattedText += `${index + 1}. ${title}${hotText}\n`;
                }
              });
              await sender.reply(formattedText);
              sendSuccess = true;
            } else if (/^(bilibili|bili)(hot|rank)$/.test(normalizedApiKey) || normalizedApiKey === 'bilibilihot') {
              // B站热门或排行榜
              console.log(`[API工具箱][调试] 处理B站热榜数据`, result.data ? `(共${result.data.length}条)` : '');
              
              // 直接尝试作为字符串数组处理
              let formattedText = `📺 B站热搜榜 TOP 15：\n\n`;
              
              try {
                if (Array.isArray(result.data) && result.data.length > 0) {
                  // 限制显示前15条
                  const items = result.data.slice(0, 15);
                  
                  // 生成格式化文本
                  items.forEach((item, index) => {
                    if (typeof item === 'string') {
                      formattedText += `${index + 1}. ${item}\n`;
                    } else if (item && typeof item === 'object') {
                      const title = item.title || item.name || item.word || '未知';
                      formattedText += `${index + 1}. ${title}\n`;
                    }
                  });
                  
                  console.log(`[API工具箱][调试] 成功格式化B站热搜榜数据`);
                } else {
                  formattedText += "未获取到热榜数据或数据格式错误";
                  console.log(`[API工具箱][错误] B站热榜数据不是有效数组`);
                }
                
                // 发送结果
                await sender.reply(formattedText);
                sendSuccess = true;
              } catch (error) {
                console.error(`[API工具箱][错误] 处理B站热榜数据失败:`, error);
                await sender.reply(`📺 B站热搜榜：\n\n获取数据失败: ${error.message}`);
                sendSuccess = true;
              }
            } else if (normalizedApiKey === 'toutiaohot') {
              // 今日头条热搜榜特殊处理
              let formattedText = `📰 今日头条热搜 TOP 15：\n\n`;
              // 限制显示前15条
              const topItems = result.data.slice(0, 15);
              topItems.forEach((item, index) => {
                if (item && typeof item === 'object') {
                  // 提取标题和热度
                  const title = item.title || item.name || '未知';
                  const hotValue = item.hot_value || item.hotValue;
                  let hotText = '';
                  
                  if (hotValue) {
                    if (hotValue > 10000) {
                      hotText = ` (${Math.floor(hotValue / 10000)}万热度)`;
                    } else {
                      hotText = ` (${hotValue}热度)`;
                    }
                  }
                  
                  formattedText += `${index + 1}. ${title}${hotText}\n`;
                }
              });
              await sender.reply(formattedText);
              sendSuccess = true;
            } else if (normalizedApiKey === 'baiduhot') {
              // 百度热搜榜特殊处理
              let formattedText = `🔍 百度热搜榜 TOP 15：\n\n`;
              // 限制显示前15条
              const topItems = result.data.slice(0, 15);
              topItems.forEach((item, index) => {
                if (item && typeof item === 'object') {
                  // 提取标题和热度
                  const title = item.title || '未知';
                  const hotValue = item.hot || '';
                  let hotText = '';
                  
                  if (hotValue) {
                    if (hotValue > 10000) {
                      hotText = ` (${Math.floor(hotValue / 10000)}万)`;
                    } else {
                      hotText = ` (${hotValue})`;
                    }
                  }
                  
                  // 添加描述信息
                  let desc = '';
                  if (item.desc && item.desc.trim()) {
                    desc = `\n   ${item.desc}`;
                  }
                  
                  formattedText += `${index + 1}. ${title}${hotText}${desc}\n`;
                }
              });
              await sender.reply(formattedText);
              sendSuccess = true;
            } else if (normalizedApiKey === 'allhot') {
              // 热搜聚合，获取多个热搜API的数据
              sendSuccess = true; // 预设为成功，如果有错误再修改
              
              // 发送加载中消息
              let loadingMsg = await sender.reply(`⏳ 正在聚合热搜数据，请稍候...`);
              
              try {
                // 热搜API列表
                const hotSearchApis = ['weibohot', 'douyinhot', 'baiduhot', 'bilibilihot'];
                let allResults = [];
                let failedApis = [];
                
                // 并行获取所有热搜API数据
                const promises = hotSearchApis.map(async (api) => {
                  try {
                    if (config.apis[api]) {
                      const result = await getAPIWithCache(api, userId, config, {});
                      if (result.success && result.data) {
                        return {
                          api: api,
                          data: result.data
                        };
                      } else {
                        failedApis.push(api);
                        return null;
                      }
                    } else {
                      return null;
                    }
                  } catch (error) {
                    console.error(`[API工具箱] 获取${api}数据失败: ${error.message}`);
                    failedApis.push(api);
                    return null;
                  }
                });
                
                // 等待所有API请求完成
                const results = await Promise.all(promises);
                
                // 删除加载消息
                if (loadingMsg) {
                  await sender.delMsg(loadingMsg);
                }
                
                // 处理结果
                let combinedMessage = `📊 全网热搜聚合 (${new Date().toLocaleString()})\n\n`;
                
                // 过滤掉失败的请求
                allResults = results.filter(r => r !== null);
                
                if (allResults.length === 0) {
                  await sender.reply(`❌ 获取热搜数据失败，请稍后再试。`);
                  return false;
                }
                
                // 按照API列表顺序格式化内容
                for (const result of allResults) {
                  if (result && result.data) {
                    // 每个API只展示前5条结果
                    const formattedData = await formatHotSearchData(result.api, result.data, 5);
                    combinedMessage += formattedData + "\n\n";
                  }
                }
                
                // 添加提示信息
                if (failedApis.length > 0) {
                  combinedMessage += `注：${failedApis.join(', ')} 数据获取失败。\n`;
                }
                
                // 添加完整查看提示
                combinedMessage += `提示：使用 /api weibohot、/api douyinhot 等命令可查看完整榜单。`;
                
                // 发送合并的消息
                await sender.reply(combinedMessage);
                
              } catch (error) {
                console.error(`[API工具箱] 聚合热搜出错: ${error.message}`);
                await sender.reply(`❌ 聚合热搜出错: ${error.message}`);
                sendSuccess = false;
              }
            } else if (/^(douban|movie)/.test(normalizedApiKey)) {
              // 豆瓣电影/电影排行榜
              let formattedText = `🎬 电影推荐 TOP 10：\n\n`;
              // 限制显示前10条
              const topItems = result.data.slice(0, 10);
              topItems.forEach((item, index) => {
                if (item && typeof item === 'object') {
                  // 提取电影信息
                  const title = item.title || item.name || '未知';
                  const year = item.year ? `(${item.year})` : '';
                  const rating = item.rating || item.score || item.rate;
                  let ratingText = '';
                  
                  if (rating) {
                    ratingText = ` ⭐${rating}`;
                  }
                  
                  // 提取导演和演员
                  let director = '';
                  if (item.director) {
                    if (Array.isArray(item.director)) {
                      director = item.director.join('/');
                    } else {
                      director = item.director;
                    }
                  }
                  
                  let actors = '';
                  if (item.actors || item.cast) {
                    const actorList = item.actors || item.cast;
                    if (Array.isArray(actorList)) {
                      actors = actorList.slice(0, 3).join('/');
                      if (actorList.length > 3) {
                        actors += '...';
                      }
                    } else {
                      actors = actorList;
                    }
                  }
                  
                  let info = '';
                  if (director || actors) {
                    const parts = [];
                    if (director) parts.push(`导演: ${director}`);
                    if (actors) parts.push(`演员: ${actors}`);
                    info = ` (${parts.join(' | ')})`;
                  }
                  
                  formattedText += `${index + 1}. ${title}${year}${ratingText}\n`;
                  if (info) {
                    formattedText += `   ${info}\n`;
                  }
                }
              });
              await sender.reply(formattedText);
              sendSuccess = true;
            } else {
              // 其他数组类型的通用处理
              let formattedText = `📋 ${apiConfig.name || normalizedApiKey}：\n\n`;
              // 限制条目数，避免消息过长
              const maxItems = 20;
              const displayItems = result.data.slice(0, maxItems);
              
              // 尝试智能识别数据类型，适配不同的格式化方式
              const sampleItem = displayItems[0];
              let isNewsList = false;
              let isSimpleList = false;
              
              if (sampleItem && typeof sampleItem === 'object') {
                // 判断是否为新闻列表类型
                if (sampleItem.title && (sampleItem.time || sampleItem.date || sampleItem.datetime)) {
                  isNewsList = true;
                }
                // 判断是否为简单列表（只有一个主要属性）
                const stringProps = Object.keys(sampleItem).filter(key => 
                  typeof sampleItem[key] === 'string' && sampleItem[key].length < 100
                );
                if (stringProps.length === 1) {
                  isSimpleList = true;
                }
              }
              
              if (isNewsList) {
                // 新闻列表格式化
                displayItems.forEach((item, index) => {
                  const title = item.title || '未知标题';
                  let time = '';
                  if (item.time) {
                    time = item.time;
                  } else if (item.date) {
                    time = item.date;
                  } else if (item.datetime) {
                    time = item.datetime;
                  }
                  
                  if (time) {
                    // 尝试格式化时间
                    if (time.length === 10 && /^\d+$/.test(time)) {
                      // Unix时间戳
                      time = new Date(parseInt(time) * 1000).toLocaleString();
                    } else if (time.length === 13 && /^\d+$/.test(time)) {
                      // 毫秒时间戳
                      time = new Date(parseInt(time)).toLocaleString();
                    }
                    
                    time = ` [${time}]`;
                  }
                  
                  formattedText += `${index + 1}. ${title}${time}\n`;
                });
              } else if (isSimpleList) {
                // 简单列表格式化
                const mainProp = Object.keys(sampleItem).filter(key => 
                  typeof sampleItem[key] === 'string'
                )[0];
                
                displayItems.forEach((item, index) => {
                  formattedText += `${index + 1}. ${item[mainProp]}\n`;
                });
              } else {
                // 标准处理方式
                displayItems.forEach((item, index) => {
                  // 如果item是对象，尝试智能提取关键信息
                  if (item && typeof item === 'object') {
                    // 优先级：title > name > word > content > 第一个非空字符串属性
                    let displayText = '';
                    if (item.title) {
                      displayText = item.title;
                    } else if (item.name) {
                      displayText = item.name;
                    } else if (item.word) {
                      displayText = item.word;
                    } else if (item.content) {
                      displayText = item.content;
                    } else {
                      // 尝试找到第一个字符串属性
                      for (const key in item) {
                        if (typeof item[key] === 'string' && item[key].trim()) {
                          displayText = item[key];
                          break;
                        }
                      }
                      
                      // 如果还没找到，使用JSON
                      if (!displayText) {
                        // 限制JSON长度避免消息过长
                        const json = JSON.stringify(item);
                        displayText = json.length > 50 ? json.substring(0, 50) + '...' : json;
                      }
                    }
                    
                    formattedText += `${index + 1}. ${displayText}\n`;
                  } else if (item) {
                    // 字符串或其他简单类型直接显示
                    formattedText += `${index + 1}. ${item.toString()}\n`;
                  }
                });
              }
              
              // 如果结果被截断，添加提示
              if (result.data.length > maxItems) {
                formattedText += `\n...共${result.data.length}条结果，仅显示前${maxItems}条`;
              }
              
              await sender.reply(formattedText);
              sendSuccess = true;
            }
          } else if (typeof result.data === 'object') {
            // 如果是对象，尝试提取有用信息，或美化JSON后发送
            
            // 检查是否为天气数据
            if (
              (result.data.weather || result.data.forecast || result.data.daily) &&
              (result.data.city || result.data.cityInfo || result.data.cityid)
            ) {
              // 处理天气数据
              let weatherInfo = '';
              let cityName = '';
              
              // 提取城市名称
              if (result.data.city) {
                cityName = typeof result.data.city === 'string' ? result.data.city : result.data.city.name || '';
              } else if (result.data.cityInfo) {
                cityName = result.data.cityInfo.city || '';
              }
              
              // 提取当天天气
              let todayWeather = {};
              if (result.data.weather) {
                todayWeather = result.data.weather;
              } else if (result.data.data && result.data.data.forecast) {
                todayWeather = result.data.data.forecast[0] || {};
              } else if (result.data.daily && result.data.daily[0]) {
                todayWeather = result.data.daily[0];
              }
              
              // 构建天气信息
              if (cityName) {
                weatherInfo += `🌤️ ${cityName}天气预报\n\n`;
              } else {
                weatherInfo += `🌤️ 天气预报\n\n`;
              }
              
              // 今日天气
              let temperature = '';
              if (todayWeather.temperature || todayWeather.temp) {
                temperature = todayWeather.temperature || todayWeather.temp;
              } else if (todayWeather.high && todayWeather.low) {
                temperature = `${todayWeather.low}~${todayWeather.high}`;
              } else if (todayWeather.max && todayWeather.min) {
                temperature = `${todayWeather.min}~${todayWeather.max}`;
              }
              
              // 加上温度单位
              if (temperature && !temperature.includes('°C') && !temperature.includes('℃')) {
                temperature += '℃';
              }
              
              let weatherDesc = todayWeather.weather || todayWeather.type || todayWeather.text || '';
              let wind = todayWeather.wind || '';
              if (todayWeather.windDirection && todayWeather.windPower) {
                wind = `${todayWeather.windDirection}${todayWeather.windPower}`;
              }
              
              let date = todayWeather.date || new Date().toLocaleDateString();
              weatherInfo += `今日(${date})：${weatherDesc} ${temperature} ${wind}\n`;
              
              // 提示信息
              if (result.data.tips || (result.data.data && result.data.data.ganmao)) {
                const tips = result.data.tips || result.data.data.ganmao;
                weatherInfo += `\n📌 温馨提示：${tips}\n`;
              }
              
              // 未来几天天气预报
              let forecast = [];
              if (result.data.forecast) {
                forecast = result.data.forecast.slice(1); // 从第二条开始，第一条通常是今天
              } else if (result.data.data && result.data.data.forecast) {
                forecast = result.data.data.forecast.slice(1);
              } else if (result.data.daily) {
                forecast = result.data.daily.slice(1, 5); // 最多显示4天
              }
              
              if (forecast.length > 0) {
                weatherInfo += '\n未来几天天气：\n';
                forecast.forEach(day => {
                  let dayInfo = '';
                  
                  // 日期
                  if (day.date) {
                    dayInfo += day.date;
                  } else if (day.fxDate) {
                    dayInfo += day.fxDate;
                  }
                  
                  // 天气描述
                  let dayWeather = day.weather || day.type || day.text || '';
                  if (dayWeather) {
                    dayInfo += ` ${dayWeather}`;
                  }
                  
                  // 温度
                  let dayTemp = '';
                  if (day.temperature || day.temp) {
                    dayTemp = day.temperature || day.temp;
                  } else if (day.high && day.low) {
                    dayTemp = `${day.low}~${day.high}`;
                  } else if (day.tempMax && day.tempMin) {
                    dayTemp = `${day.tempMin}~${day.tempMax}`;
                  }
                  
                  // 加上温度单位
                  if (dayTemp && !dayTemp.includes('°C') && !dayTemp.includes('℃')) {
                    dayTemp += '℃';
                  }
                  
                  if (dayTemp) {
                    dayInfo += ` ${dayTemp}`;
                  }
                  
                  weatherInfo += `· ${dayInfo}\n`;
                });
              }
              
              await sender.reply(weatherInfo);
              sendSuccess = true;
            } else {
              // 提取常见字段显示，如果没有就显示整个对象
              let formattedText = `📄 ${apiConfig.name || normalizedApiKey}：\n\n`;
              const usefulKeys = ['title', 'name', 'content', 'message', 'description', 'text', 'url'];
              let hasUsefulInfo = false;
              
              for (const key of usefulKeys) {
                if (result.data[key] && typeof result.data[key] === 'string') {
                  formattedText += `${key}: ${result.data[key]}\n`;
                  hasUsefulInfo = true;
                }
              }
              
              // 如果没有提取到有用信息，使用格式化的JSON
              if (!hasUsefulInfo) {
                // 限制JSON长度
                const json = JSON.stringify(result.data, null, 2);
                formattedText = json.length > 2000 
                  ? "```json\n" + json.substring(0, 2000) + "\n...(内容太长已截断)\n```" 
                  : "```json\n" + json + "\n```";
              }
              
              await sender.reply(formattedText);
              sendSuccess = true;
            }
          } else {
            // 字符串直接发送
            await sender.reply(result.data.toString());
            sendSuccess = true;
          }
        } catch (textErr) {
          console.error(`[API工具箱] 发送文本消息失败: ${textErr.message}`);
          // 降级处理，尝试简单文本方式发送
          try {
            const simpleText = typeof result.data === 'object' 
              ? '数据太复杂，无法显示。请查看日志了解详情。' 
              : result.data.toString().substring(0, 500) + (result.data.toString().length > 500 ? '...(已截断)' : '');
            await sender.reply(simpleText);
            sendSuccess = true;
          } catch (fallbackErr) {
            console.error(`[API工具箱] 降级发送也失败: ${fallbackErr.message}`);
          }
        }
      }
      // 处理图片类型
      else if (result.type === 'image') {
        try {
          console.log(`[API工具箱] 尝试发送图片: ${result.data}`);
          // 尝试使用多种方式发送图片
          sendSuccess = await sendImageWithFallback(sender, result.data);
        } catch (imgErr) {
          console.error(`[API工具箱] 所有发送图片方式均失败: ${imgErr.message}，尝试发送链接`);
          try {
            await sender.reply(`🖼️ 图片链接: ${result.data}\n\n请复制链接查看图片`);
            sendSuccess = true;
          } catch (linkErr) {
            console.error(`[API工具箱] 发送图片链接也失败: ${linkErr.message}`);
          }
        }
      } 
      // 处理视频类型
      else if (result.type === 'video') {
        try {
          console.log(`[API工具箱] 尝试发送视频: ${result.data}`);
          // 尝试使用多种方式发送视频
          sendSuccess = await sendVideoWithFallback(sender, result.data);
        } catch (videoErr) {
          console.error(`[API工具箱] 所有发送视频方式均失败: ${videoErr.message}，尝试发送链接`);
          try {
            await sender.reply(`🎬 视频链接: ${result.data}\n\n请复制链接查看视频`);
            sendSuccess = true;
          } catch (linkErr) {
            console.error(`[API工具箱] 发送视频链接也失败: ${linkErr.message}`);
          }
        }
      }
      // 其他未知类型
      else {
        try {
          console.log(`[API工具箱] 未知类型(${result.type})，尝试作为文本发送: ${result.data}`);
          await sender.reply(`API返回数据(${result.type}类型): ${result.data}`);
          sendSuccess = true;
        } catch (unknownErr) {
          console.error(`[API工具箱] 发送未知类型数据失败: ${unknownErr.message}`);
        }
      }
      
      // 判断是否发送成功
      if (sendSuccess) {
        console.log(`[API工具箱] ${normalizedApiKey} 结果发送成功`);
        return true;
      } else {
        console.error(`[API工具箱] 所有发送方式均失败`);
        await sender.reply(`❌ 无法发送API结果，请报告管理员`);
        return false;
      }
    
    } catch (error) {
      // 清除超时计时器
      clearTimeout(timeoutId);
      
      console.error(`[API工具箱] 调用API出错: ${error.message}`);
      
      // 删除加载消息
      try {
        if (loadingMsg) {
          await sender.delMsg(loadingMsg);
        }
      } catch (delErr) {
        console.error(`[API工具箱] 删除加载消息失败: ${delErr.message}`);
      }
      
      await sender.reply(`❌ 调用API出错: ${error.message}`);
      return false;
    }
  }

  // 生成API详细信息文本
  function generateAPIInfoText(config, apiKey) {
    const apiConfig = config.apis[apiKey];
    
    if (!apiConfig) {
      return `❌ API "${apiKey}" 不存在`;
    }
    
    let infoText = `📌 【${apiConfig.name}】详细信息\n\n`;
    infoText += `🔑 API键值: ${apiKey}\n`;
    infoText += `📝 描述: ${apiConfig.description}\n`;
    infoText += `🔗 URL: ${apiConfig.url}\n`;
    infoText += `🛠️ 请求方法: ${apiConfig.method || 'GET'}\n`;
    infoText += `📊 返回类型: ${apiConfig.type}\n`;
    infoText += `⚙️ 状态: ${apiConfig.enabled ? '✅ 已启用' : '❌ 已禁用'}\n`;
    
    // 显示默认参数
    if (apiConfig.params && Object.keys(apiConfig.params).length > 0) {
      infoText += `\n📋 默认参数:\n`;
      for (const [key, value] of Object.entries(apiConfig.params)) {
        infoText += `• ${key}: ${value}\n`;
      }
      
      // 添加使用示例
      const paramExample = Object.entries(apiConfig.params)
        .map(([key, _]) => `${key}=值`)
        .join('&');
      
      infoText += `\n💡 调用示例:\n`;
      infoText += `1️⃣ 键值对格式: /api ${apiKey} ${paramExample}\n`;
      
      // JSON格式示例
      const jsonExample = JSON.stringify(
        Object.fromEntries(
          Object.entries(apiConfig.params).map(([key, _]) => [key, "值"])
        )
      );
      infoText += `2️⃣ JSON格式: /api ${apiKey} ${jsonExample}\n`;
    } else {
      infoText += `\n📋 默认参数: 无\n`;
      infoText += `\n💡 调用示例: /api ${apiKey}\n`;
    }
    
    // 如果有dataPath，显示数据路径
    if (apiConfig.dataPath) {
      infoText += `\n🔍 数据路径: ${apiConfig.dataPath}\n`;
      infoText += `   (系统会从API返回的数据中提取此路径的内容)\n`;
    }
    
    return infoText;
  }

  // 生成帮助信息
  function generateHelpText(config) {
    const apiList = getAPIList(config);
    
    let helpText = `🛠️ API工具箱使用指南\n\n`;
    helpText += `指令格式: \n`;
    helpText += `• 基本格式: /${config.commandPrefix} <API名称>\n`;
    helpText += `• 带参数: /${config.commandPrefix} <API名称> <参数>\n`;
    helpText += `• 参数示例: key1=value1&key2=value2 或 {"key1":"value1","key2":"value2"}\n`;
    helpText += `• 查看详情: /${config.commandPrefix} info <API名称>\n\n`;
    helpText += `可用API列表:\n`;
    
    // 按类型分组
    const typeGroups = {};
    
    for (const api of apiList) {
      if (!typeGroups[api.type]) {
        typeGroups[api.type] = [];
      }
      typeGroups[api.type].push(api);
    }
    
    // 生成分组列表
    for (const [type, apis] of Object.entries(typeGroups)) {
      helpText += `\n【${type === 'image' ? '图片' : type === 'video' ? '视频' : '其他'}类】\n`;
      
      // 对相同前缀的API进行分组显示（如4k-acg和4k-wallpaper）
      const groupedApis = {};
      for (const api of apis) {
        const prefix = api.key.split('-')[0]; // 获取前缀（如"4k"或"acg"）
        if (!groupedApis[prefix]) {
          groupedApis[prefix] = [];
        }
        groupedApis[prefix].push(api);
      }
      
      // 先显示没有变体的API
      const singleApis = apis.filter(api => !api.key.includes('-'));
      for (const api of singleApis) {
        // 显示API是否有默认参数
        const apiConfig = config.apis[api.key];
        const hasParams = apiConfig && apiConfig.params && Object.keys(apiConfig.params).length > 0;
        
        let paramText = '';
        if (hasParams) {
          const paramKeys = Object.keys(apiConfig.params);
          if (paramKeys.length === 1) {
            // 如果只有一个参数，直接显示参数名
            const paramKey = paramKeys[0];
            paramText = ` [参数:${paramKey}]`;
          } else if (paramKeys.length > 1) {
            // 如果有多个参数，列出所有参数名
            paramText = ` [参数:${paramKeys.join(',')}]`;
          }
        }
        
        helpText += `• /${config.commandPrefix} ${api.key}${paramText} - ${api.name}: ${api.description}\n`;
      }
      
      // 然后显示有变体的API，按前缀分组
      for (const [prefix, variantApis] of Object.entries(groupedApis)) {
        if (variantApis.length > 1 && variantApis.some(api => api.key.includes('-'))) {
          // 如果有多个变体，显示分组
          helpText += `• ${variantApis[0].name} (有多个变体):\n`;
          for (const api of variantApis.filter(a => a.key.includes('-'))) {
            const apiConfig = config.apis[api.key];
            const hasParams = apiConfig && apiConfig.params && Object.keys(apiConfig.params).length > 0;
            
            let paramText = '';
            if (hasParams) {
              const paramKeys = Object.keys(apiConfig.params);
              if (paramKeys.length === 1) {
                // 如果只有一个参数，直接显示参数名
                const paramKey = paramKeys[0];
                paramText = ` [参数:${paramKey}]`;
              } else if (paramKeys.length > 1) {
                // 如果有多个参数，列出所有参数名
                paramText = ` [参数:${paramKeys.join(',')}]`;
              }
            }
            
            helpText += `  - /${config.commandPrefix} ${api.key}${paramText} - ${api.description}\n`;
          }
        } else if (variantApis.length === 1 && variantApis[0].key.includes('-')) {
          // 单个带连字符的API
          const api = variantApis[0];
          const apiConfig = config.apis[api.key];
          const hasParams = apiConfig && apiConfig.params && Object.keys(apiConfig.params).length > 0;
          
          let paramText = '';
          if (hasParams) {
            const paramKeys = Object.keys(apiConfig.params);
            if (paramKeys.length === 1) {
              // 如果只有一个参数，直接显示参数名
              const paramKey = paramKeys[0];
              paramText = ` [参数:${paramKey}]`;
            } else if (paramKeys.length > 1) {
              // 如果有多个参数，列出所有参数名
              paramText = ` [参数:${paramKeys.join(',')}]`;
            }
          }
          
          helpText += `• /${config.commandPrefix} ${api.key}${paramText} - ${api.name}: ${api.description}\n`;
        }
      }
    }
    
    // 添加管理命令
    helpText += `\n【管理命令】\n`;
    helpText += `• /${config.commandPrefix} list - 查看可用API列表\n`;
    helpText += `• /${config.commandPrefix} info <API名称> - 查看API详细信息\n`;
    helpText += `• /${config.commandPrefix} help - 显示此帮助信息\n`;
    
    return helpText;
  }

  // 生成API列表文本
  function generateAPIListText(config) {
    const apiList = getAPIList(config);
    
    let listText = `📋 API工具箱 - 可用API列表 (${apiList.length}个)\n\n`;
    
    // 按类型分组
    const typeGroups = {};
    
    for (const api of apiList) {
      if (!typeGroups[api.type]) {
        typeGroups[api.type] = [];
      }
      typeGroups[api.type].push(api);
    }
    
    // 生成分组列表
    for (const [type, apis] of Object.entries(typeGroups)) {
      listText += `\n【${type === 'image' ? '图片' : type === 'video' ? '视频' : '其他'}类】\n`;
      
      // 对相同前缀的API进行分组显示（如4k-acg和4k-wallpaper）
      const groupedApis = {};
      for (const api of apis) {
        const prefix = api.key.split('-')[0]; // 获取前缀（如"4k"或"acg"）
        if (!groupedApis[prefix]) {
          groupedApis[prefix] = [];
        }
        groupedApis[prefix].push(api);
      }
      
      // 先显示没有变体的API
      const singleApis = apis.filter(api => !api.key.includes('-'));
      for (const api of singleApis) {
        const apiConfig = config.apis[api.key];
        const hasParams = apiConfig.params && Object.keys(apiConfig.params).length > 0;
        
        let paramText = '';
        if (hasParams) {
          const paramKeys = Object.keys(apiConfig.params);
          if (paramKeys.length === 1) {
            // 如果只有一个参数，直接显示参数名和默认值
            const paramKey = paramKeys[0];
            paramText = ` [参数:${paramKey}=${apiConfig.params[paramKey]}]`;
          } else if (paramKeys.length > 1) {
            // 如果有多个参数，列出所有参数名
            paramText = ` [参数:${paramKeys.join(',')}]`;
          }
        }
        
        listText += `• ${api.name} (/${config.commandPrefix} ${api.key})${paramText}\n`;
      }
      
      // 然后显示有变体的API，按前缀分组
      for (const [prefix, variantApis] of Object.entries(groupedApis)) {
        if (variantApis.length > 1 && variantApis.some(api => api.key.includes('-'))) {
          // 如果有多个变体，显示分组
          listText += `• ${variantApis[0].name} (有多个变体):\n`;
          for (const api of variantApis.filter(a => a.key.includes('-'))) {
            const apiConfig = config.apis[api.key];
            const hasParams = apiConfig.params && Object.keys(apiConfig.params).length > 0;
            
            let paramText = '';
            if (hasParams) {
              const paramKeys = Object.keys(apiConfig.params);
              if (paramKeys.length === 1) {
                // 如果只有一个参数，直接显示参数名和默认值
                const paramKey = paramKeys[0];
                paramText = ` [参数:${paramKey}=${apiConfig.params[paramKey]}]`;
              } else if (paramKeys.length > 1) {
                // 如果有多个参数，列出所有参数名
                paramText = ` [参数:${paramKeys.join(',')}]`;
              }
            }
            
            listText += `  - /${config.commandPrefix} ${api.key}: ${api.description}${paramText}\n`;
          }
        } else if (variantApis.length === 1 && variantApis[0].key.includes('-')) {
          // 单个带连字符的API
          const api = variantApis[0];
          const apiConfig = config.apis[api.key];
          const hasParams = apiConfig.params && Object.keys(apiConfig.params).length > 0;
          
          let paramText = '';
          if (hasParams) {
            const paramKeys = Object.keys(apiConfig.params);
            if (paramKeys.length === 1) {
              // 如果只有一个参数，直接显示参数名和默认值
              const paramKey = paramKeys[0];
              paramText = ` [参数:${paramKey}=${apiConfig.params[paramKey]}]`;
            } else if (paramKeys.length > 1) {
              // 如果有多个参数，列出所有参数名
              paramText = ` [参数:${paramKeys.join(',')}]`;
            }
          }
          
          listText += `• ${api.name} (/${config.commandPrefix} ${api.key})${paramText}\n`;
        }
      }
    }
    
    return listText;
  }

  // 格式化命令参数
  function formatCommandPattern(pattern, regexStr) {
    // 针对不同命令类型进行特殊处理
    
    // 处理API命令
    if (pattern === '/api') {
      if (regexStr.includes('help')) {
        return '/api help - 显示API工具箱的帮助信息';
      } else if (regexStr.includes('list')) {
        return '/api list - 显示可用的API列表';
      } else if (regexStr.includes('info')) {
        return '/api info <API名称> - 查看API详细信息';
      } else {
        return '/api <API名称> [参数] - 调用指定的API服务';
      }
    }
    
    // ... rest of the function ...
  }

  // 处理API响应数据
  function processAPIResponse(response, apiKey, apiConfig) {
    try {
      console.log(`[API工具箱][调试] 处理API "${apiKey}" 响应数据`);
      
      // 默认为文本类型
      const dataType = apiConfig.type || 'text';
      
      // 检查响应状态
      if (response.status < 200 || response.status >= 300) {
        console.error(`[API工具箱][调试] API "${apiKey}" 响应错误状态码: ${response.status}`);
        return {
          success: false,
          message: `API响应错误: HTTP ${response.status}`
        };
      }

      // 如果是视频类型，处理视频URL
      if (dataType === 'video') {
        console.log(`[API工具箱][调试] 处理视频类型响应`);
        
        // 尝试从响应中提取视频URL
        let videoUrl = null;
        
        // 1. 如果配置了dataPath，优先使用
        if (apiConfig.dataPath) {
          try {
            const pathParts = apiConfig.dataPath.split('.');
            let data = response.data;
            
            for (const part of pathParts) {
              if (data && typeof data === 'object' && part in data) {
                data = data[part];
              } else {
                data = null;
                break;
              }
            }
            
            if (data && typeof data === 'string' && (data.startsWith('http') || data.startsWith('//'))) {
              videoUrl = data;
            }
          } catch (error) {
            console.error(`[API工具箱][调试] 通过dataPath提取视频URL失败: ${error.message}`);
          }
        }
        
        // 2. 如果没有通过dataPath找到，检查常见字段
        if (!videoUrl) {
          const videoFields = ['url', 'video', 'src', 'data', 'videoUrl', 'video_url', 'path'];
          
          if (typeof response.data === 'object') {
            // 检查顶层字段
            for (const field of videoFields) {
              if (response.data[field] && typeof response.data[field] === 'string') {
                videoUrl = response.data[field];
                break;
              }
            }
            
            // 如果顶层没找到，检查data字段内部
            if (!videoUrl && response.data.data) {
              if (typeof response.data.data === 'string') {
                videoUrl = response.data.data;
              } else if (typeof response.data.data === 'object') {
                for (const field of videoFields) {
                  if (response.data.data[field] && typeof response.data.data[field] === 'string') {
                    videoUrl = response.data.data[field];
                    break;
                  }
                }
              }
            }
          } else if (typeof response.data === 'string') {
            // 如果响应直接是字符串，检查是否是URL
            if (response.data.startsWith('http') || response.data.startsWith('//')) {
              videoUrl = response.data;
            }
          }
        }
        
        // 处理相对URL
        if (videoUrl && videoUrl.startsWith('//')) {
          videoUrl = 'https:' + videoUrl;
        }
        
        if (videoUrl) {
          console.log(`[API工具箱][调试] 成功提取视频URL: ${videoUrl}`);
          return {
            success: true,
            type: 'video',
            data: videoUrl
          };
        }
        
        return {
          success: false,
          message: '无法从API响应提取视频URL'
        };
      }
      
      // 如果是图片类型，处理图片URL
      if (dataType === 'image') {
        console.log(`[API工具箱][调试] 处理图片类型响应`);
        
        // 1. 检查响应类型是否为图片
        const contentType = response.headers['content-type'];
        if (contentType && contentType.startsWith('image/')) {
          console.log(`[API工具箱][调试] 响应是图片，内容类型: ${contentType}`);
          
          // 返回图片URL
          return {
            success: true,
            type: 'image',
            data: response.config.url
          };
        }
        
        // 2. 检查响应是否为JSON，且有图片URL
        if (typeof response.data === 'object') {
          console.log(`[API工具箱][调试] 响应是JSON对象，尝试提取图片URL`);
          
          // 检查是否有dataPath配置
          let imageUrl = null;
          if (apiConfig.dataPath) {
            console.log(`[API工具箱][调试] 使用dataPath: ${apiConfig.dataPath} 提取图片URL`);
            
            // 通过路径提取数据
            const pathParts = apiConfig.dataPath.split('.');
            let data = response.data;
            
            try {
              for (const part of pathParts) {
                if (data && typeof data === 'object' && part in data) {
                  data = data[part];
                } else {
                  console.log(`[API工具箱][调试] 路径 ${part} 不存在于数据中`);
                  data = null;
                  break;
                }
              }
              
              if (data && typeof data === 'string' && (data.startsWith('http') || data.startsWith('//'))) {
                imageUrl = data;
                console.log(`[API工具箱][调试] 通过路径提取到图片URL: ${imageUrl}`);
              }
            } catch (error) {
              console.error(`[API工具箱][调试] 提取图片URL出错: ${error.message}`);
            }
          }
          
          // 如果没有通过路径找到，尝试常见的图片字段
          if (!imageUrl) {
            console.log(`[API工具箱][调试] 尝试从常见字段中查找图片URL`);
            
            const imgFields = ['url', 'image', 'img', 'src', 'pic', 'picture', 'imageUrl', 'imgUrl', 'picUrl', 'data'];
            
            // 递归查找对象中的图片URL
            const findImageUrl = (obj, depth = 0) => {
              if (depth > 3) return null; // 限制递归深度
              
              // 如果是字符串并且看起来像URL，直接返回
              if (typeof obj === 'string' && (obj.startsWith('http') || obj.startsWith('//'))) {
                return obj;
              }
              
              // 如果是对象，查找常见字段
              if (obj && typeof obj === 'object') {
                // 先检查顶层常见字段
                for (const field of imgFields) {
                  if (obj[field]) {
                    if (typeof obj[field] === 'string' && (obj[field].startsWith('http') || obj[field].startsWith('//'))) {
                      return obj[field];
                    }
                  }
                }
                
                // 递归检查子对象
                for (const key in obj) {
                  if (obj[key] && typeof obj[key] === 'object') {
                    const found = findImageUrl(obj[key], depth + 1);
                    if (found) return found;
                  }
                }
              }
              
              return null;
            };
            
            imageUrl = findImageUrl(response.data);
            if (imageUrl) {
              console.log(`[API工具箱][调试] 从对象中找到图片URL: ${imageUrl}`);
            }
          }
          
          if (imageUrl) {
            // 确保URL格式正确
            if (imageUrl.startsWith('//')) {
              imageUrl = 'https:' + imageUrl;
              console.log(`[API工具箱][调试] 修正相对URL: ${imageUrl}`);
            }
            
            return {
              success: true,
              type: 'image',
              data: imageUrl
            };
          }
          
          // 如果无法找到图片URL，返回错误
          console.error(`[API工具箱][调试] 无法从响应提取图片URL`);
          return {
            success: false,
            message: '无法从API响应提取图片URL'
          };
        }
        
        // 3. 如果响应是字符串，看看是否是图片URL
        if (typeof response.data === 'string') {
          const responseData = response.data.trim();
          if (responseData.startsWith('http') || responseData.startsWith('//')) {
            console.log(`[API工具箱][调试] 响应数据看起来是图片URL: ${responseData}`);
            
            let imageUrl = responseData;
            // 处理相对URL
            if (imageUrl.startsWith('//')) {
              imageUrl = 'https:' + imageUrl;
            }
            
            return {
              success: true,
              type: 'image',
              data: imageUrl
            };
          }
        }
        
        // 4. 尝试使用响应URL作为图片URL
        console.log(`[API工具箱][调试] 无法找到图片URL，尝试使用响应URL`);
        return {
          success: true,
          type: 'image',
          data: response.config.url
        };
      }
      
      // 处理文本类型
      if (dataType === 'text') {
        // 尝试从不同的响应格式中提取数据
        let textData = null;
        let responseMessage = '成功';
        
        // 如果配置了dataPath，尝试从指定路径提取数据
        if (apiConfig.dataPath) {
          try {
            const pathParts = apiConfig.dataPath.split('.');
            let currentData = response.data;
            
            for (const part of pathParts) {
              if (currentData && typeof currentData === 'object' && part in currentData) {
                currentData = currentData[part];
              } else {
                currentData = null;
                break;
              }
            }
            
            if (currentData !== null && currentData !== undefined) {
              textData = currentData;
            }
          } catch (error) {
            console.error(`[API工具箱][调试] 提取数据路径出错: ${error.message}`);
          }
        }
        
        // 如果没有通过dataPath找到数据，尝试其他常见字段
        if (textData === null) {
          if (response.data.data !== undefined) {
            textData = response.data.data;
          } else if (response.data.result !== undefined) {
            textData = response.data.result;
          } else if (response.data.content !== undefined) {
            textData = response.data.content;
          } else {
            textData = response.data;
          }
        }
        
        // 提取响应消息
        if (response.data.msg !== undefined) {
          responseMessage = response.data.msg;
        } else if (response.data.message !== undefined) {
          responseMessage = response.data.message;
        }
        
        return {
          success: true,
          type: 'text',
          data: textData,
          message: responseMessage
        };
      }
      
      // 未知类型，返回原始数据
      return {
        success: true,
        type: dataType,
        data: response.data
      };
      
    } catch (error) {
      console.error(`[API工具箱] 处理API响应数据出错: ${error.message}`);
      return {
        success: false,
        message: `API响应处理失败: ${error.message}`
      };
    }
  }

  // 插件命令
  exports.commands = [
    {
      name: "api-help",
      pattern: /^\/api\s*help$/i,  // 更灵活的空格匹配
      description: "显示API工具箱的帮助信息",
      handler: async function(sender, match) {
        console.log(`[API工具箱][优先] 匹配到 help 命令，完整匹配: "${match[0]}"`);
        const config = loadConfig();
        const helpText = generateHelpText(config);
        await sender.reply(helpText);
        return true;
      }
    },
    {
      name: "api-list",
      pattern: /^\/api\s*list$/i,  // 更灵活的空格匹配
      description: "显示可用的API列表",
      handler: async function(sender, match) {
        console.log(`[API工具箱][优先] 匹配到 list 命令，完整匹配: "${match[0]}"`);
        const config = loadConfig();
        const listText = generateAPIListText(config);
        await sender.reply(listText);
        return true;
      }
    },
    {
      name: "api-info",
      pattern: /^\/api\s*info\s+([a-zA-Z0-9_\-]+)$/i,  // 更灵活的空格匹配
      description: "显示指定API的详细信息",
      handler: async function(sender, match) {
        console.log(`[API工具箱][优先] 匹配到 info 命令，参数: ${match[1]}，完整匹配: "${match[0]}"`);
        const apiKey = match[1].toLowerCase();
        const config = loadConfig();
        const infoText = generateAPIInfoText(config, apiKey);
        await sender.reply(infoText);
        return true;
      }
    },
    {
      name: "api-command",
      pattern: /^\/api\s*([a-zA-Z0-9_\-]+)(?:\s+(.+))?$/,
      description: "调用指定的API服务",
      handler: async function(sender, match) {
        console.log(`[API工具箱][调试] 匹配到API命令，原始匹配:`, JSON.stringify(match));
        const rawApiKey = match[1];
        const paramsString = match[2] || ''; // 获取命令参数
        
        console.log(`[API工具箱][调试] 处理API命令: "${rawApiKey}", 参数: "${paramsString}"`);
        console.log(`[API工具箱][调试] 原始匹配完整内容: "${match[0]}"`);
        
        const config = loadConfig();
        console.log(`[API工具箱][调试] 已加载配置，可用API:`, Object.keys(config.apis).join(', '));
        
        // 处理特殊命令（这里需要单独处理，确保能与pattern匹配）
        const lowerApiKey = rawApiKey.toLowerCase();
        
        if (lowerApiKey === 'help') {
          console.log(`[API工具箱][调试] 转发到 help 命令处理`);
          const helpText = generateHelpText(config);
          await sender.reply(helpText);
          return true;
        } else if (lowerApiKey === 'list') {
          console.log(`[API工具箱][调试] 转发到 list 命令处理`);
          const listText = generateAPIListText(config);
          await sender.reply(listText);
          return true;
        } else if (lowerApiKey === 'info' && paramsString) {
          console.log(`[API工具箱][调试] 转发到 info 命令处理: ${paramsString}`);
          const infoText = generateAPIInfoText(config, paramsString);
          await sender.reply(infoText);
          return true;
        } else if (lowerApiKey === 'info') {
          console.log(`[API工具箱][调试] info 命令缺少参数`);
          await sender.reply(`请提供要查询的API名称，例如: /api info acg-pc`);
          return true;
        }
        
        // 检查API键是否是直接的API名称
        if (config.apis[rawApiKey]) {
          console.log(`[API工具箱][调试] 精确匹配到API: "${rawApiKey}"`);
          return await handleAPICommand(rawApiKey, sender, config, paramsString);
        }
        
        // 使用规范化函数处理API键名
        console.log(`[API工具箱][调试] 尝试规范化API键名: "${rawApiKey}"`);
        const normalizedApiKey = normalizeApiKey(rawApiKey, config);
        
        console.log(`[API工具箱][调试] 规范化后的API键: "${normalizedApiKey}"`);
        
        // 处理API调用，传递参数
        return await handleAPICommand(normalizedApiKey, sender, config, paramsString);
      }
    },
    // 通用捕获所有/api命令的处理
    {
      name: "api-fallback",
      pattern: /^\/api(.*)$/,
      description: "API工具箱通用命令",
      handler: async function(sender, match) {
        console.log(`[API工具箱][后备] 匹配到通用API命令，原始内容: "${match[0]}", 参数部分: "${match[1]}"`);
        
        // 转换可能的全角空格和其他不可见字符为普通空格
        const cleanedInput = match[1].replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ');
        console.log(`[API工具箱][后备] 清理后的输入: "${cleanedInput}"`);
        
        // 去除前导空格
        const remainingText = cleanedInput.trim();
        console.log(`[API工具箱][后备] 整理后的文本: "${remainingText}"`);
        
        // 如果没有参数，显示帮助信息
        if (!remainingText) {
          console.log(`[API工具箱][后备] 没有参数，显示帮助信息`);
          const config = loadConfig();
          const helpText = generateHelpText(config);
          await sender.reply(helpText);
          return true;
        }
        
        // 尝试解析可能的API命令
        const parts = remainingText.split(/\s+/);
        console.log(`[API工具箱][后备] 分割后的部分:`, JSON.stringify(parts));
        
        if (parts.length > 0) {
          const possibleApiKey = parts[0];
          const possibleParams = parts.slice(1).join(' ');
          
          console.log(`[API工具箱][后备] 尝试解析为API命令: apiKey="${possibleApiKey}", params="${possibleParams}"`);
          
          const config = loadConfig();
          console.log(`[API工具箱][后备] 加载的API列表:`, Object.keys(config.apis).join(', '));
          
          // 检查是否是特殊命令
          if (possibleApiKey.toLowerCase() === 'help') {
            console.log(`[API工具箱][后备] 识别为help命令`);
            const helpText = generateHelpText(config);
            await sender.reply(helpText);
            return true;
          } else if (possibleApiKey.toLowerCase() === 'list') {
            console.log(`[API工具箱][后备] 识别为list命令`);
            const listText = generateAPIListText(config);
            await sender.reply(listText);
            return true;
          } else if (possibleApiKey.toLowerCase() === 'info' && possibleParams) {
            console.log(`[API工具箱][后备] 识别为info命令，参数: ${possibleParams}`);
            const infoText = generateAPIInfoText(config, possibleParams.trim());
            await sender.reply(infoText);
            return true;
          }
          
          // 直接尝试精确匹配
          if (config.apis[possibleApiKey]) {
            console.log(`[API工具箱][后备] 精确匹配到API: "${possibleApiKey}"`);
            return await handleAPICommand(possibleApiKey, sender, config, possibleParams);
          }
          
          // 不区分大小写匹配
          const lowercaseMatch = Object.keys(config.apis).find(key => 
            key.toLowerCase() === possibleApiKey.toLowerCase());
          
          if (lowercaseMatch) {
            console.log(`[API工具箱][后备] 忽略大小写匹配到API: "${lowercaseMatch}"`);
            return await handleAPICommand(lowercaseMatch, sender, config, possibleParams);
          }
          
          // 尝试作为API调用处理，使用规范化
          const normalizedApiKey = normalizeApiKey(possibleApiKey, config);
          if (config.apis[normalizedApiKey]) {
            console.log(`[API工具箱][后备] 通用命令找到匹配的API: "${normalizedApiKey}"`);
            return await handleAPICommand(normalizedApiKey, sender, config, possibleParams);
          }
          
          // 最后尝试查找相似的API
          console.log(`[API工具箱][后备] 尝试查找相似的API`);
          const availableKeys = Object.keys(config.apis);
          const similarKeys = availableKeys.filter(key => 
            key.includes(possibleApiKey) || possibleApiKey.includes(key) || 
            key.toLowerCase().includes(possibleApiKey.toLowerCase()) || 
            possibleApiKey.toLowerCase().includes(key.toLowerCase())
          );
          
          if (similarKeys.length > 0) {
            console.log(`[API工具箱][后备] 找到相似的API: ${similarKeys.join(', ')}`);
            // 使用第一个相似的API
            console.log(`[API工具箱][后备] 使用第一个相似的API: "${similarKeys[0]}"`);
            return await handleAPICommand(similarKeys[0], sender, config, possibleParams);
          }
        }
        
        // 尝试直接作为API名称处理（可能没有空格）
        const directApiKey = remainingText.replace(/\s+/g, '');
        if (directApiKey && directApiKey.length > 0) {
          console.log(`[API工具箱][后备] 尝试直接作为API键处理: "${directApiKey}"`);
          
          const config = loadConfig();
          
          // 尝试精确匹配
          if (config.apis[directApiKey]) {
            console.log(`[API工具箱][后备] 直接匹配到API: "${directApiKey}"`);
            return await handleAPICommand(directApiKey, sender, config, '');
          }
          
          // 尝试不区分大小写匹配
          const directLowercaseMatch = Object.keys(config.apis).find(key => 
            key.toLowerCase() === directApiKey.toLowerCase());
          
          if (directLowercaseMatch) {
            console.log(`[API工具箱][后备] 直接忽略大小写匹配到API: "${directLowercaseMatch}"`);
            return await handleAPICommand(directLowercaseMatch, sender, config, '');
          }
          
          // 最后尝试规范化
          const directNormalizedKey = normalizeApiKey(directApiKey, config);
          if (config.apis[directNormalizedKey]) {
            console.log(`[API工具箱][后备] 直接通过规范化找到API: "${directNormalizedKey}"`);
            return await handleAPICommand(directNormalizedKey, sender, config, '');
          }
        }
        
        // 提示用户正确的命令格式
        await sender.reply(`无法识别API命令: "${match[0]}"，请使用正确的格式: /api <API名称> [参数]\n例如: /api acg-pc\n\n可用API列表:\n${Object.keys(config.apis).slice(0, 5).map(key => `- ${key}: ${config.apis[key].name}`).join('\n')}\n\n输入 /api help 查看完整帮助信息`);
        return true;
      }
    }
  ];

  // 插件默认配置
  exports.defaultConfig = loadConfig();

  // 插件初始化方法
  exports.initialize = async function(core, pluginConfig) {
    // 存储core引用和配置
    this.core = core;
    this.config = pluginConfig;
    
    // 设置定期清理缓存任务
    setInterval(() => {
      cleanExpiredCache();
    }, 3600000); // 每小时清理一次
    
    console.log('[API工具箱] 插件已初始化');
    return true;
  };

  // 配置更新处理
  exports.onConfigUpdate = async function(newConfig) {
    this.config = newConfig;
    console.log('[API工具箱] 配置已更新');
    return true;
  }; 

  // 格式化各类热搜数据的通用函数
  async function formatHotSearchData(apiKey, data, limit = 5) {
    let formattedText = '';
    let items = [];
    
    if (!data || !Array.isArray(data)) {
      return `获取${apiKey}数据失败或格式不正确`;
    }
    
    // 限制显示数量
    const topItems = data.slice(0, limit);
    
    switch(apiKey) {
      case 'weibohot':
        formattedText = `🔥 微博热搜：\n`;
        topItems.forEach((item, index) => {
          if (item && typeof item === 'object') {
            const title = item.title || '未知';
            const hot = item.hot || '';
            let hotText = '';
            
            if (hot) {
              hotText = ` (${hot})`;
            }
            
            items.push(`${index + 1}. ${title}${hotText}`);
          }
        });
        break;
        
      case 'douyinhot':
        formattedText = `📱 抖音热搜：\n`;
        topItems.forEach((item, index) => {
          if (item && typeof item === 'object') {
            const word = item.word || item.title || '未知';
            const hotValue = item.hot_value || item.hotValue;
            let hotText = '';
            
            if (hotValue) {
              if (hotValue > 10000) {
                hotText = ` (${Math.floor(hotValue / 10000)}万)`;
              } else {
                hotText = ` (${hotValue})`;
              }
            }
            
            items.push(`${index + 1}. ${word}${hotText}`);
          }
        });
        break;
        
      case 'baiduhot':
        formattedText = `🔍 百度热搜：\n`;
        topItems.forEach((item, index) => {
          if (item && typeof item === 'object') {
            const title = item.title || '未知';
            const hot = item.hot || '';
            let hotText = '';
            
            if (hot) {
              hotText = ` (${hot})`;
            }
            
            items.push(`${index + 1}. ${title}${hotText}`);
          }
        });
        break;
        
      case 'zhihuhot':
        formattedText = `❓ 知乎热榜：\n`;
        topItems.forEach((item, index) => {
          if (item && typeof item === 'object') {
            const title = item.title || item.question || '未知';
            const hot = item.hot || item.score;
            let hotText = '';
            
            if (hot) {
              hotText = ` (${hot})`;
            }
            
            items.push(`${index + 1}. ${title}${hotText}`);
          }
        });
        break;
        
      case 'bilibilihot':
        formattedText = `📺 B站热门：\n`;
        topItems.forEach((item, index) => {
          if (item && typeof item === 'object') {
            const title = item.title || '未知';
            items.push(`${index + 1}. ${title}`);
          } else if (typeof item === 'string') {
            items.push(`${index + 1}. ${item}`);
          }
        });
        break;
        
      case 'toutiaohot':
        formattedText = `📰 今日头条：\n`;
        topItems.forEach((item, index) => {
          if (item && typeof item === 'object') {
            const title = item.title || item.name || '未知';
            items.push(`${index + 1}. ${title}`);
          }
        });
        break;
        
      default:
        formattedText = `${apiKey} 热搜：\n`;
        topItems.forEach((item, index) => {
          if (item && typeof item === 'object') {
            const title = item.title || item.name || item.word || item.content || '未知内容';
            items.push(`${index + 1}. ${title}`);
          } else if (typeof item === 'string') {
            items.push(`${index + 1}. ${item}`);
          }
        });
    }
    
    return formattedText + items.join('\n');
  } 