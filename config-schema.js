/**
 * @author shuaijin
 * @name 微信助手配置Schema
 * @version 1.0.0
 * @description 为微信助手插件系统提供可视化配置界面
 * @rule ^/schema$
 * @admin true
 * @public false
 * @priority 10
 * @disable false
 */

// 确保BncrCreateSchema已定义
if (!global.BncrCreateSchema) {
  console.error('BncrCreateSchema未定义，可能BNCR无界版本较低或不支持配置UI');
  module.exports = () => false;
  return;
}

// 获取Schema构建器
const BncrCreateSchema = global.BncrCreateSchema;

// 简化的配置Schema
try {
  // 创建基础的schema对象
  const configSchema = BncrCreateSchema.object({
    // 1. 启用的插件列表
    enabledPlugins: BncrCreateSchema.array()
      .setTitle('启用的插件')
      .setDescription('选择要启用的插件列表')
      .setItems(
        BncrCreateSchema.string()
          .setEnum(['weather', 'ai-chat', 'morning-alert', 'ai-speedtest', 'api-toolkit'])
      )
      .setDefault(['weather', 'ai-chat']),
      
    // 2. 管理员用户
    adminUsers: BncrCreateSchema.array()
      .setTitle('管理员用户')
      .setDescription('设置管理员用户ID列表')
      .setItems(BncrCreateSchema.string())
      .setDefault([]),
      
    // 3. 插件设置 - 使用简化方式
    pluginSettings: BncrCreateSchema.object({
      // 天气插件
      weather: BncrCreateSchema.object({
        api: BncrCreateSchema.string()
          .setTitle('天气API')
          .setDescription('选择天气服务API提供商')
          .setEnum(['amap', 'openweather'])
          .setDefault('amap'),
        key: BncrCreateSchema.string()
          .setTitle('API密钥')
          .setDescription('输入天气服务API密钥')
          .setDefault(""),
        defaultCity: BncrCreateSchema.string()
          .setTitle('默认城市')
          .setDescription('设置默认查询的城市')
          .setDefault("北京")
      }),
      
      // AI聊天插件
      'ai-chat': BncrCreateSchema.object({
        defaultModel: BncrCreateSchema.string()
          .setTitle('默认模型')
          .setDescription('设置默认使用的AI模型')
          .setDefault("deepseek")
      }),
      
      // 早报提醒插件  
      'morning-alert': BncrCreateSchema.object({
        enabled: BncrCreateSchema.boolean()
          .setTitle('启用状态')
          .setDescription('是否启用早报提醒')
          .setDefault(true),
        time: BncrCreateSchema.string()
          .setTitle('提醒时间')
          .setDescription('设置早报提醒时间，格式如 07:00')
          .setDefault("07:00")
      }),
      
      // AI模型测速插件
      'ai-speedtest': BncrCreateSchema.object({
        enabled: BncrCreateSchema.boolean()
          .setTitle('启用状态')
          .setDescription('是否启用AI模型测速')
          .setDefault(true),
        testInterval: BncrCreateSchema.number()
          .setTitle('测试间隔')
          .setDescription('每次测试的间隔时间(分钟)')
          .setDefault(60),
        testTimeout: BncrCreateSchema.number()
          .setTitle('测试超时')
          .setDescription('单个模型测试的超时时间(秒)')
          .setDefault(15),
        autoSwitch: BncrCreateSchema.boolean()
          .setTitle('自动切换')
          .setDescription('是否自动切换到最快的模型')
          .setDefault(true)
      }),
      
      // API工具箱插件
      'api-toolkit': BncrCreateSchema.object({
        enabled: BncrCreateSchema.boolean()
          .setTitle('启用状态')
          .setDescription('是否启用API工具箱')
          .setDefault(true)
      })
    }).setTitle('插件设置').setDescription('各插件的具体配置')
  });

  // 注册到系统中
  if (global.BncrRegisterSchema) {
    global.BncrRegisterSchema('wechat-assistant', {
      name: '微信智能助手',
      description: '模块化可扩展的微信助手插件系统',
      schema: configSchema
    });
    console.log('[微信助手] 配置UI Schema已注册');
  }

  // 导出Schema
  exports.configSchema = configSchema;
  
  // 为BNCR插件提供入口
  module.exports = async (sender) => {
    await sender.reply("微信助手配置Schema已注册");
    return true;
  };
  
} catch (error) {
  console.error('[微信助手配置Schema] 创建或注册Schema时出错:', error);
  console.error(error.stack);
  
  // 确保插件不会崩溃
  module.exports = async (sender) => {
    await sender.reply("微信助手配置Schema注册失败，请查看日志");
    return false;
  };
} 