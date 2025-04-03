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
 * @admin false
 * @public true
 * @priority 100
 * @disable false
 * @cron 0 0 7 * * * 
 */

// 导入所需模块
const fs = require('fs');
const path = require('path');

// 获取全局变量
const sysMethod = global.sysMethod;
const router = sysMethod.router;
const BncrDB = global.BncrDB;

// 检查配置Schema支持
try {
  // 不在这里尝试加载schema，让config-schema.js自己处理
  if (global.BncrCreateSchema) {
    console.log('[智能助手] 检测到BNCR无界环境，配置UI应在独立插件中加载');
  }
} catch (error) {
  console.warn('[智能助手] 检查Schema支持出错:', error.message);
}

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