/**
 * @author shuaijin
 * @name config-schema
 * @version 1.0.0
 * @description 微信智能助手插件系统配置
 * @rule ^/schema$
 * @team shuaijin
 * @admin true
 * @public false
 * @priority 10
 * @disable false
 * @classification 配置
 */

// 确保BncrCreateSchema已定义
if (!global.BncrCreateSchema) {
  console.error('BncrCreateSchema未定义，可能BNCR无界版本较低或不支持配置UI');
  module.exports = () => false;
  return;
}

// 获取Schema构建器
const BncrCreateSchema = global.BncrCreateSchema;

try {
  // 简化的配置Schema - 按照BNCR无界支持的方式
  const jsonSchema = BncrCreateSchema.object({
    // 启用的插件列表
    enabledPlugins: BncrCreateSchema.array()
      .setTitle('启用的插件')
      .setDescription('选择要启用的插件列表')
      .setDefault(['weather', 'ai-chat']),
      
    // 管理员用户
    adminUsers: BncrCreateSchema.array()
      .setTitle('管理员用户')
      .setDescription('设置管理员用户ID列表')
      .setDefault([]),
      
    // 插件设置
    weather: BncrCreateSchema.object({
      api: BncrCreateSchema.string()
        .setTitle('天气API')
        .setDescription('选择天气服务API提供商')
        .setDefault('amap'),
      key: BncrCreateSchema.string()
        .setTitle('API密钥')
        .setDescription('输入天气服务API密钥')
        .setDefault(""),
      defaultCity: BncrCreateSchema.string()
        .setTitle('默认城市')
        .setDescription('设置默认查询的城市')
        .setDefault("北京")
    }).setTitle('天气插件配置'),
    
    // AI聊天插件
    'ai-chat': BncrCreateSchema.object({
      defaultModel: BncrCreateSchema.string()
        .setTitle('默认模型')
        .setDescription('设置默认使用的AI模型')
        .setDefault("deepseek"),
      
      // 模型配置
      models: BncrCreateSchema.object({
        deepseek: BncrCreateSchema.object({
          name: BncrCreateSchema.string()
            .setTitle('显示名称')
            .setDescription('AI模型的显示名称')
            .setDefault("DeepSeek"),
          apiKey: BncrCreateSchema.string()
            .setTitle('API密钥')
            .setDescription('AI模型API密钥')
            .setDefault(""),
          enabled: BncrCreateSchema.boolean()
            .setTitle('启用状态')
            .setDescription('是否启用此模型')
            .setDefault(true)
        }).setTitle('DeepSeek模型配置'),
        
        siliconflow: BncrCreateSchema.object({
          name: BncrCreateSchema.string()
            .setTitle('显示名称')
            .setDescription('AI模型的显示名称')
            .setDefault("SiliconFlow"),
          apiKey: BncrCreateSchema.string()
            .setTitle('API密钥')
            .setDescription('AI模型API密钥')
            .setDefault(""),
          enabled: BncrCreateSchema.boolean()
            .setTitle('启用状态')
            .setDescription('是否启用此模型')
            .setDefault(true),
          model: BncrCreateSchema.string()
            .setTitle('模型名称')
            .setDescription('具体的模型版本名称')
            .setDefault("deepseek-ai/DeepSeek-V3")
        }).setTitle('SiliconFlow模型配置'),
        
        openai: BncrCreateSchema.object({
          name: BncrCreateSchema.string()
            .setTitle('显示名称')
            .setDescription('AI模型的显示名称')
            .setDefault("OpenAI"),
          apiKey: BncrCreateSchema.string()
            .setTitle('API密钥')
            .setDescription('AI模型API密钥')
            .setDefault(""),
          enabled: BncrCreateSchema.boolean()
            .setTitle('启用状态')
            .setDescription('是否启用此模型')
            .setDefault(false)
        }).setTitle('OpenAI模型配置')
      }).setTitle('模型配置列表')
    }).setTitle('AI聊天插件配置'),
    
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
    }).setTitle('早报提醒插件配置'),
    
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
    }).setTitle('AI模型测速插件配置'),
    
    // API工具箱插件
    'api-toolkit': BncrCreateSchema.object({
      enabled: BncrCreateSchema.boolean()
        .setTitle('启用状态')
        .setDescription('是否启用API工具箱')
        .setDefault(true)
    }).setTitle('API工具箱插件配置')
  });

  // 打印调试信息
  console.log('[微信助手配置] 尝试注册Schema配置...');

  // 注册到系统中
  if (global.BncrRegisterSchema) {
    global.BncrRegisterSchema('wechat-assistant', {
      name: '微信智能助手',
      description: '模块化可扩展的微信助手插件系统',
      schema: jsonSchema
    });
    console.log('[微信助手配置] 配置UI Schema已注册成功！');
  } else {
    console.error('[微信助手配置] BncrRegisterSchema未定义，无法注册配置UI！');
  }

  // 导出Schema
  exports.configSchema = jsonSchema;
  
  // 为BNCR插件提供入口
  module.exports = async (sender) => {
    console.log('[微信助手配置] 插件被调用，执行发送回复');
    try {
      await sender.reply("微信助手配置Schema已注册，配置界面应该在「插件配置」菜单中可见");
    } catch (err) {
      console.error('[微信助手配置] 发送回复失败:', err);
    }
    return true;
  };
  
} catch (error) {
  console.error('[微信助手配置] 创建或注册Schema时出错:', error);
  console.error(error.stack);
  
  // 确保插件不会崩溃
  module.exports = async (sender) => {
    await sender.reply("微信助手配置Schema注册失败，请查看日志");
    return false;
  };
} 