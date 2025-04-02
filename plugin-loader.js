/**
 * @author shuaijin
 * @name 微信智能助手插件加载器
 * @team shuaijin
 * @origin bncr
 * @version 1.0.0
 * @description 负责加载和管理微信智能助手的插件模块
 */

const fs = require('fs');
const path = require('path');

class PluginLoader {
  constructor(core) {
    this.core = core;
    this.pluginDir = path.join(__dirname, 'plugins');
    this.loadedPlugins = new Map();
  }

  // 获取所有可用插件
  async getAvailablePlugins() {
    try {
      // 确保插件目录存在
      if (!fs.existsSync(this.pluginDir)) {
        fs.mkdirSync(this.pluginDir, { recursive: true });
        return [];
      }

      // 读取所有插件目录
      const pluginDirs = fs.readdirSync(this.pluginDir).filter(file => {
        const stats = fs.statSync(path.join(this.pluginDir, file));
        return stats.isDirectory();
      });

      // 收集插件信息
      const availablePlugins = [];
      for (const dir of pluginDirs) {
        const pluginPath = path.join(this.pluginDir, dir);
        const indexPath = path.join(pluginPath, 'index.js');
        const configPath = path.join(pluginPath, 'config.json');
        
        // 检查插件文件是否存在
        if (!fs.existsSync(indexPath)) {
          console.warn(`插件 ${dir} 缺少 index.js 文件`);
          continue;
        }

        try {
          // 尝试加载插件信息
          delete require.cache[require.resolve(indexPath)];
          const plugin = require(indexPath);

          // 读取配置
          let config = {};
          if (fs.existsSync(configPath)) {
            try {
              const configContent = fs.readFileSync(configPath, 'utf8');
              config = JSON.parse(configContent);
            } catch (configError) {
              console.error(`解析插件 ${dir} 配置文件时出错:`, configError.message);
              config = {};
            }
          }

          // 检查插件格式是否正确
          if (!plugin.meta || !plugin.meta.name) {
            console.warn(`插件 ${dir} 格式不正确，缺少 meta.name`);
            continue;
          }

          availablePlugins.push({
            id: dir,
            name: plugin.meta.name,
            description: plugin.meta.description || '暂无描述',
            version: plugin.meta.version || '0.0.1',
            enabled: config.enabled !== false, // 默认启用
            path: pluginPath,
            config: config
          });
        } catch (error) {
          console.error(`加载插件 ${dir} 信息时出错:`, error);
        }
      }

      return availablePlugins;
    } catch (error) {
      console.error('获取可用插件列表出错:', error);
      return [];
    }
  }

  // 加载插件
  async loadPlugin(pluginId) {
    try {
      // 检查插件是否已加载
      if (this.loadedPlugins.has(pluginId)) {
        return this.loadedPlugins.get(pluginId);
      }

      const pluginPath = path.join(this.pluginDir, pluginId);
      const indexPath = path.join(pluginPath, 'index.js');

      // 检查插件是否存在
      if (!fs.existsSync(indexPath)) {
        console.error(`插件 ${pluginId} 不存在`);
        return null;
      }

      // 加载插件
      delete require.cache[require.resolve(indexPath)];
      const plugin = require(indexPath);

      // 检查插件结构
      if (!plugin.meta || !plugin.initialize) {
        console.error(`插件 ${pluginId} 格式不正确，缺少必要的组件`);
        return null;
      }

      // 读取配置
      const configPath = path.join(pluginPath, 'config.json');
      let config = {};
      if (fs.existsSync(configPath)) {
        try {
          const configContent = fs.readFileSync(configPath, 'utf8');
          config = JSON.parse(configContent);
        } catch (configError) {
          console.error(`解析插件 ${pluginId} 配置文件时出错:`, configError.message);
          config = {};
        }
      }

      // 初始化插件
      try {
        await plugin.initialize(this.core, config);
        console.log(`插件 ${plugin.meta.name} (${pluginId}) v${plugin.meta.version} 加载成功`);
        
        // 存储已加载的插件
        this.loadedPlugins.set(pluginId, {
          id: pluginId,
          instance: plugin,
          config: config,
          meta: plugin.meta
        });
        
        return this.loadedPlugins.get(pluginId);
      } catch (initError) {
        console.error(`初始化插件 ${pluginId} 失败:`, initError);
        return null;
      }
    } catch (error) {
      console.error(`加载插件 ${pluginId} 时出错:`, error);
      return null;
    }
  }

  // 卸载插件
  async unloadPlugin(pluginId) {
    // 检查插件是否已加载
    if (!this.loadedPlugins.has(pluginId)) {
      console.warn(`插件 ${pluginId} 未加载，无需卸载`);
      return false;
    }

    const plugin = this.loadedPlugins.get(pluginId);

    // 调用插件的卸载方法（如果有）
    try {
      if (typeof plugin.instance.unload === 'function') {
        await plugin.instance.unload();
      }
      
      // 从加载列表中移除
      this.loadedPlugins.delete(pluginId);
      
      // 清除缓存
      const indexPath = path.join(this.pluginDir, pluginId, 'index.js');
      delete require.cache[require.resolve(indexPath)];
      
      console.log(`插件 ${plugin.meta.name} (${pluginId}) 已卸载`);
      return true;
    } catch (error) {
      console.error(`卸载插件 ${pluginId} 时出错:`, error);
      return false;
    }
  }

  // 重新加载插件
  async reloadPlugin(pluginId) {
    // 先卸载插件
    await this.unloadPlugin(pluginId);
    
    // 再加载插件
    return await this.loadPlugin(pluginId);
  }

  // 保存插件配置
  async savePluginConfig(pluginId, config) {
    try {
      const configPath = path.join(this.pluginDir, pluginId, 'config.json');
      const configContent = JSON.stringify(config, null, 2);
      
      fs.writeFileSync(configPath, configContent, 'utf8');
      
      // 如果插件已加载，更新其配置
      if (this.loadedPlugins.has(pluginId)) {
        const plugin = this.loadedPlugins.get(pluginId);
        plugin.config = config;
        
        // 如果插件有配置更新方法，调用它
        if (typeof plugin.instance.onConfigUpdate === 'function') {
          await plugin.instance.onConfigUpdate(config);
        }
      }
      
      console.log(`插件 ${pluginId} 配置已保存`);
      return true;
    } catch (error) {
      console.error(`保存插件 ${pluginId} 配置时出错:`, error);
      return false;
    }
  }

  // 加载所有启用的插件
  async loadEnabledPlugins() {
    try {
      const availablePlugins = await this.getAvailablePlugins();
      
      for (const plugin of availablePlugins) {
        if (plugin.enabled) {
          await this.loadPlugin(plugin.id);
        }
      }
      
      console.log(`已加载 ${this.loadedPlugins.size} 个启用的插件`);
      return true;
    } catch (error) {
      console.error('加载启用的插件时出错:', error);
      return false;
    }
  }
}

module.exports = PluginLoader; 