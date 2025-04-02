/**
 * @author shuaijin
 * @name 微信智能助手核心模块
 * @team shuaijin
 * @origin bncr
 * @version 1.0.0
 * @description 微信智能助手核心模块，负责插件加载和管理
 * @rule ^/plugins (list|enable|disable|reload)( .+)?$
 * @admin true
 * @public true
 * @priority 100
 * @disable false
 */

// 导入所需模块
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// 获取全局变量
const sysMethod = global.sysMethod;
const router = sysMethod.router;
const BncrDB = global.BncrDB;

// 创建数据库实例
const configDB = new BncrDB('wechat_assistant_config');
const pluginsDB = new BncrDB('wechat_assistant_plugins');

// 创建事件发射器
class WechatAssistantCore extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map(); // 存储已加载的插件
    this.commands = new Map(); // 存储注册的命令
    this.baseDir = path.join(__dirname); // 插件基础目录
    this.pluginsDir = path.join(this.baseDir, 'plugins'); // 插件目录
    this.defaultConfig = {
      enabledPlugins: [], // 默认启用的插件
    };
    this.config = {}; // 全局配置
  }

  // 初始化
  async initialize() {
    // 确保插件目录存在
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
    }

    // 加载全局配置
    this.config = await configDB.get('core:config', this.defaultConfig);
    
    // 加载所有插件
    await this.loadPlugins();
    
    // 设置命令处理
    this.setupCommandHandlers();
    
    // 初始化成功
    console.log('[微信助手核心] 初始化完成');
    return true;
  }

  // 加载所有插件
  async loadPlugins() {
    console.log('[微信助手核心] 开始加载插件');
    
    try {
      // 读取插件目录中的所有文件夹
      const pluginFolders = fs.readdirSync(this.pluginsDir).filter(file => {
        return fs.statSync(path.join(this.pluginsDir, file)).isDirectory();
      });
      
      // 只加载enabledPlugins中的插件
      const enabledPlugins = this.config.enabledPlugins || [];
      console.log(`[微信助手核心] 启用的插件: ${enabledPlugins.join(', ') || '无'}`);
      
      // 加载每个启用的插件
      for (const pluginName of enabledPlugins) {
        // 检查插件目录是否存在
        if (pluginFolders.includes(pluginName)) {
          await this.loadPlugin(pluginName);
        } else {
          console.error(`[微信助手核心] 启用的插件目录不存在: ${pluginName}`);
        }
      }
      
      console.log(`[微信助手核心] 成功加载 ${this.plugins.size} 个插件`);
    } catch (error) {
      console.error(`[微信助手核心] 加载插件出错: ${error.message}`);
    }
  }

  // 加载单个插件
  async loadPlugin(pluginName) {
    try {
      const pluginPath = path.join(this.pluginsDir, pluginName, 'index.js');
      
      // 检查插件是否存在
      if (!fs.existsSync(pluginPath)) {
        console.error(`[微信助手核心] 插件不存在: ${pluginName}`);
        return false;
      }
      
      // 清除缓存，确保获取最新版本
      delete require.cache[require.resolve(pluginPath)];
      
      // 导入插件
      const plugin = require(pluginPath);
      
      // 检查插件结构
      if (!plugin.meta || !plugin.initialize || !plugin.commands) {
        console.error(`[微信助手核心] 插件格式不正确: ${pluginName}`);
        return false;
      }
      
      // 获取插件配置
      const pluginConfig = await configDB.get(`plugin:${pluginName}`, plugin.defaultConfig || {});
      
      // 检查是否启用
      const isEnabled = this.config.enabledPlugins.includes(pluginName);
      if (!isEnabled) {
        console.log(`[微信助手核心] 插件未启用: ${pluginName}`);
        return false;
      }
      
      // 初始化插件
      const initResult = await plugin.initialize(this, pluginConfig);
      if (!initResult) {
        console.error(`[微信助手核心] 插件初始化失败: ${pluginName}`);
        return false;
      }
      
      // 存储插件
      this.plugins.set(pluginName, {
        instance: plugin,
        config: pluginConfig,
        meta: plugin.meta
      });
      
      // 注册命令
      for (const command of plugin.commands) {
        this.registerCommand(pluginName, command);
      }
      
      console.log(`[微信助手核心] 插件加载成功: ${pluginName} v${plugin.meta.version}`);
      return true;
    } catch (error) {
      console.error(`[微信助手核心] 加载插件 ${pluginName} 时出错: ${error.message}`);
      return false;
    }
  }

  // 注册命令
  registerCommand(pluginName, command) {
    const commandKey = `${pluginName}:${command.name}`;
    this.commands.set(commandKey, {
      ...command,
      pluginName
    });
    console.log(`[微信助手核心] 注册命令: ${commandKey}`);
  }

  // 设置命令处理器
  setupCommandHandlers() {
    // 处理帮助命令
    this.registerCommand('core', {
      name: 'help',
      pattern: /^\/help$/,
      description: '显示所有可用命令',
      handler: async function(sender) {
        // 获取所有已加载插件的命令列表
        const helpSections = [];
        
        // 添加核心帮助信息
        helpSections.push(`🤖 【微信智能助手 v1.0.0】命令列表`);
        
        // 按插件分组整理命令
        const pluginCommands = new Map();
        
        // 将命令按插件归类
        for (const [commandKey, command] of this.commands.entries()) {
          const pluginName = command.pluginName;
          if (!pluginCommands.has(pluginName)) {
            pluginCommands.set(pluginName, []);
          }
          pluginCommands.get(pluginName).push(command);
        }
        
        // 整理每个插件的命令列表
        for (const [pluginName, commands] of pluginCommands.entries()) {
          // 特殊处理core插件
          if (pluginName === 'core') {
            const coreInfo = `\n🛠️ 【核心功能】`;
            const cmdList = commands.map(cmd => {
              // 将正则模式转换为实际命令
              let cmdText = cmd.pattern.toString();
              // 提取命令，通常格式为 /^\/command(.+)$/
              const match = cmdText.match(/\^\\\/([a-zA-Z0-9_]+)/);
              let pattern = match ? `/${match[1]}` : cmdText;
              
              // 处理各种参数格式
              pattern = this.formatCommandPattern(pattern, cmdText);
              
              return `  ➤ ${pattern}`;
            }).join('\n');
            helpSections.push(`${coreInfo}\n${cmdList}`);
            continue;
          }
          
          const plugin = this.plugins.get(pluginName);
          if (plugin) {
            const pluginInfo = `\n📌 【${plugin.meta.name || pluginName} v${plugin.meta.version || '1.0.0'}】`;
            const cmdList = commands.map(cmd => {
              // 将正则模式转换为实际命令
              let cmdText = cmd.pattern.toString();
              // 提取命令，通常格式为 /^\/command(.+)$/
              const match = cmdText.match(/\^\\\/([a-zA-Z0-9_]+)/);
              let pattern = match ? `/${match[1]}` : cmdText;
              
              // 处理各种参数格式
              pattern = this.formatCommandPattern(pattern, cmdText);
              
              return `  ➤ ${pattern}`;
            }).join('\n');
            helpSections.push(`${pluginInfo}\n${cmdList}`);
          }
        }
        
        // 添加管理命令
        if (await sender.isAdmin()) {
          helpSections.push(`\n🔧 【管理员命令】
  ➤ /plugins list - 查看所有插件
  ➤ /plugins enable <插件名> - 启用插件
  ➤ /plugins disable <插件名> - 禁用插件
  ➤ /plugins reload <插件名> - 重新加载插件`);
        }
        
        // 发送帮助信息
        await sender.reply(helpSections.join('\n'));
      }
    });
  }
  
  // 格式化命令参数
  formatCommandPattern(pattern, regexStr) {
    // 针对不同命令类型进行特殊处理
    
    // 处理API命令
    if (pattern === '/api') {
      if (regexStr.includes('help')) {
        return '/api help - 显示API工具箱的帮助信息';
      } else if (regexStr.includes('list')) {
        return '/api list - 显示可用的API列表';
      } else {
        return '/api <API名称> - 调用指定的API服务';
      }
    }
    
    // 处理聊天命令
    if (pattern === '/chat') {
      return '/chat <内容> - 与AI进行对话交流';
    }
    
    // 处理天气命令
    if (pattern === '/weather') {
      return '/weather <城市名> - 查询指定城市的当前天气状况';
    }
    
    // 处理天气预报命令
    if (pattern === '/forecast') {
      return '/forecast <城市名> - 查看指定城市的未来天气预报';
    }
    
    // 处理模型命令
    if (pattern === '/model') {
      if (regexStr.includes('list')) {
        return '/model list - 显示所有可用的AI模型列表';
      } else if (regexStr.includes('use')) {
        return '/model use <模型名> - 切换使用指定的AI模型';
      } else if (regexStr.includes('config')) {
        return '/model config <模型名> <参数名> <参数值> - 配置AI模型参数';
      }
      return '/model <list|use|config> - 管理AI模型';
    }
    
    // 处理测速命令
    if (pattern === '/speedtest') {
      if (regexStr.includes('info')) {
        return '/speedtest info - 查看测速插件的配置和上次测试结果';
      } else if (regexStr.includes('config')) {
        return '/speedtest config <参数名> <参数值> - 配置测速参数';
      }
      return '/speedtest - 测试所有AI模型的响应速度';
    }
    
    // 处理配置命令
    if (pattern === '/config') {
      if (regexStr.includes('list')) {
        return '/config list - 查看个人配置';
      } else if (regexStr.includes('set')) {
        return '/config set <键名> <值> - 设置配置项';
      } else if (regexStr.includes('get')) {
        return '/config get <键名> - 获取配置项值';
      } else if (regexStr.includes('del')) {
        return '/config del <键名> - 删除配置项';
      }
      return '/config <list|set|get|del> - 管理个人配置';
    }
    
    // 处理默认正则参数
    return pattern
      .replace(/\(\.[\+\*]\)/g, "<参数>")
      .replace(/\(\.\+\)/g, "<参数>")
      .replace(/\(list\|enable\|disable\|reload\)/, "<list|enable|disable|reload>")
      .replace(/\(list\|set\|get\|del\)/, "<list|set|get|del>")
      .replace(/\(list\|use\|config\)/, "<list|use|config>")
      .replace(/\(help\|list\|[a-zA-Z0-9_]+\)/, "<命令|API名称>");
  }

  // 处理消息
  async handleMessage(sender) {
    const message = sender.getMsg();
    const userId = sender.getUserId();
    
    // 触发消息事件，让插件可以处理
    this.emit('message', { sender, message, userId });
    
    // 检查是否匹配命令
    for (const [commandKey, command] of this.commands.entries()) {
      const match = message.match(command.pattern);
      if (match) {
        try {
          // 判断是否为核心命令（core插件）
          if (command.pluginName === 'core') {
            // 对于核心命令，直接使用this作为上下文
            await command.handler.call(this, sender, match);
          } else {
            // 获取插件实例
            const plugin = this.plugins.get(command.pluginName).instance;
            
            // 调用命令处理函数
            await command.handler.call(plugin, sender, match);
          }
          
          // 记录命令使用
          this.recordCommandUsage(command.pluginName, command.name);
          
          return true;
        } catch (error) {
          console.error(`[微信助手核心] 处理命令 ${commandKey} 时出错: ${error.message}`);
        }
      }
    }
    
    return false;
  }

  // 记录命令使用
  async recordCommandUsage(pluginName, commandName) {
    const today = new Date().toISOString().split('T')[0];
    const statsKey = `stats:${today}`;
    
    try {
      // 获取今日统计
      const stats = await configDB.get(statsKey, { commands: {} });
      
      // 更新命令计数
      const commandKey = `${pluginName}:${commandName}`;
      stats.commands[commandKey] = (stats.commands[commandKey] || 0) + 1;
      
      // 保存统计
      await configDB.set(statsKey, stats);
    } catch (error) {
      console.error(`[微信助手核心] 记录命令使用统计失败: ${error.message}`);
    }
  }

  // 启用插件
  async enablePlugin(pluginName) {
    // 检查插件是否已在启用列表中
    if (this.config.enabledPlugins.includes(pluginName)) {
      return false; // 已经启用
    }
    
    // 检查插件是否存在
    const pluginPath = path.join(this.pluginsDir, pluginName, 'index.js');
    if (!fs.existsSync(pluginPath)) {
      console.error(`[微信助手核心] 插件不存在: ${pluginName}`);
      return false;
    }
    
    // 添加到启用列表
    this.config.enabledPlugins.push(pluginName);
    await configDB.set('core:config', this.config);
    
    // 加载插件
    return await this.loadPlugin(pluginName);
  }

  // 禁用插件
  async disablePlugin(pluginName) {
    if (this.config.enabledPlugins.includes(pluginName)) {
      this.config.enabledPlugins = this.config.enabledPlugins.filter(name => name !== pluginName);
      await configDB.set('core:config', this.config);
      
      // 如果插件已加载，则卸载它
      if (this.plugins.has(pluginName)) {
        const plugin = this.plugins.get(pluginName).instance;
        if (typeof plugin.unload === 'function') {
          await plugin.unload();
        }
        
        // 移除插件的命令
        for (const [commandKey, command] of this.commands.entries()) {
          if (command.pluginName === pluginName) {
            this.commands.delete(commandKey);
          }
        }
        
        this.plugins.delete(pluginName);
      }
      return true;
    }
    return false;
  }

  // 重新加载插件
  async reloadPlugin(pluginName) {
    // 先卸载
    if (this.plugins.has(pluginName)) {
      const plugin = this.plugins.get(pluginName).instance;
      if (typeof plugin.unload === 'function') {
        await plugin.unload();
      }
      
      // 移除插件的命令
      for (const [commandKey, command] of this.commands.entries()) {
        if (command.pluginName === pluginName) {
          this.commands.delete(commandKey);
        }
      }
      
      this.plugins.delete(pluginName);
    }
    
    // 检查插件是否启用
    if (!this.config.enabledPlugins.includes(pluginName)) {
      console.log(`[微信助手核心] 插件未启用，无法重新加载: ${pluginName}`);
      return false;
    }
    
    // 重新加载
    return await this.loadPlugin(pluginName);
  }
}

// 创建核心实例
const core = new WechatAssistantCore();

// 导出模块
module.exports = async (sender) => {
  // 如果尚未初始化，则初始化
  if (!core.initialized) {
    core.initialized = await core.initialize();
  }
  
  const message = sender.getMsg();
  const isAdmin = await sender.isAdmin();
  
  // 处理插件管理命令
  if (isAdmin && message.startsWith('/plugins')) {
    const match = message.match(/^\/plugins (list|enable|disable|reload)( .+)?$/);
    if (match) {
      const action = match[1];
      const pluginName = match[2] ? match[2].trim() : null;
      
      switch (action) {
        case 'list':
          // 列出所有插件
          try {
            // 读取插件目录中的所有文件夹
            const pluginFolders = fs.readdirSync(core.pluginsDir).filter(file => {
              return fs.statSync(path.join(core.pluginsDir, file)).isDirectory();
            });
            
            const pluginList = [];
            
            // 遍历插件目录
            for (const folderName of pluginFolders) {
              try {
                const pluginPath = path.join(core.pluginsDir, folderName, 'index.js');
                
                // 检查插件文件是否存在
                if (!fs.existsSync(pluginPath)) {
                  continue;
                }
                
                // 如果插件已加载，使用已加载的信息
                if (core.plugins.has(folderName)) {
                  const plugin = core.plugins.get(folderName);
                  pluginList.push(`【${folderName}】 ${plugin.meta.description} (v${plugin.meta.version}) - ${core.config.enabledPlugins.includes(folderName) ? '已启用' : '已禁用'}`);
                } else {
                  // 否则尝试读取插件信息
                  try {
                    const requireCache = require.cache[require.resolve(pluginPath)];
                    if (requireCache) {
                      delete require.cache[require.resolve(pluginPath)];
                    }
                    
                    const plugin = require(pluginPath);
                    if (plugin.meta) {
                      pluginList.push(`【${folderName}】 ${plugin.meta.description || '无描述'} (v${plugin.meta.version || '1.0.0'}) - ${core.config.enabledPlugins.includes(folderName) ? '已启用' : '未启用'}`);
                    } else {
                      pluginList.push(`【${folderName}】 无法获取描述信息 - ${core.config.enabledPlugins.includes(folderName) ? '已启用' : '未启用'}`);
                    }
                  } catch (error) {
                    pluginList.push(`【${folderName}】 插件加载错误: ${error.message} - ${core.config.enabledPlugins.includes(folderName) ? '已启用' : '未启用'}`);
                  }
                }
              } catch (error) {
                console.error(`[微信助手核心] 获取插件 ${folderName} 信息失败: ${error.message}`);
              }
            }
            
            if (pluginList.length === 0) {
              await sender.reply('当前没有任何可用插件');
            } else {
              await sender.reply(`可用插件列表：\n${pluginList.join('\n')}`);
            }
          } catch (error) {
            console.error(`[微信助手核心] 列出插件时出错: ${error.message}`);
            await sender.reply(`列出插件时出错: ${error.message}`);
          }
          break;
          
        case 'enable':
          // 启用插件
          if (!pluginName) {
            await sender.reply('请指定要启用的插件名');
            return;
          }
          
          const enableResult = await core.enablePlugin(pluginName);
          await sender.reply(enableResult ? `插件 ${pluginName} 已启用` : `启用插件 ${pluginName} 失败或已启用`);
          break;
          
        case 'disable':
          // 禁用插件
          if (!pluginName) {
            await sender.reply('请指定要禁用的插件名');
            return;
          }
          
          const disableResult = await core.disablePlugin(pluginName);
          await sender.reply(disableResult ? `插件 ${pluginName} 已禁用` : `禁用插件 ${pluginName} 失败或已禁用`);
          break;
          
        case 'reload':
          // 重新加载插件
          if (!pluginName) {
            await sender.reply('请指定要重新加载的插件名');
            return;
          }
          
          const reloadResult = await core.reloadPlugin(pluginName);
          await sender.reply(reloadResult ? `插件 ${pluginName} 已重新加载` : `重新加载插件 ${pluginName} 失败`);
          break;
      }
      
      return;
    }
  }
  
  // 处理普通消息
  return await core.handleMessage(sender);
}; 