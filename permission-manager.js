/**
 * @name 权限管理模块
 * @description permission-manager
 * @version 1.0.0
 * @author shuaijin
 * @team shuaijin
 * @rule none
 * @admin true
 * @public false
 * @disable true
 */

const fs = require('fs');
const path = require('path');

class PermissionManager {
  constructor() {
    this.configPath = path.join(__dirname, 'config.json');
    this.config = null;
    this.adminUsers = '';
    this.loadConfig();
  }

  // 加载配置
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configContent);
        
        // 处理 adminUsers 字段，统一转为字符串格式
        if (this.config.adminUsers !== undefined) {
          if (Array.isArray(this.config.adminUsers)) {
            // 如果是数组，转换为逗号分隔的字符串
            this.adminUsers = this.config.adminUsers.join(',');
            // 也更新配置对象，确保保存时是字符串
            this.config.adminUsers = this.adminUsers;
          } else if (typeof this.config.adminUsers === 'string') {
            this.adminUsers = this.config.adminUsers;
          } else {
            this.adminUsers = '';
          }
        } else {
          this.adminUsers = '';
        }
        
        console.log(`[权限管理] 已加载管理员用户: ${this.adminUsers || '无'}`);
      } else {
        console.error('[权限管理] 配置文件不存在');
        this.config = { adminUsers: '' };
        this.adminUsers = '';
      }
    } catch (error) {
      console.error(`[权限管理] 加载配置失败: ${error.message}`);
      this.config = { adminUsers: '' };
      this.adminUsers = '';
    }
  }

  // 保存配置
  saveConfig() {
    try {
      // 确保adminUsers已更新到config对象
      this.config.adminUsers = this.adminUsers;
      
      // 写入文件
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      
      console.log(`[权限管理] 配置已保存，管理员用户: ${this.adminUsers || '无'}`);
      return true;
    } catch (error) {
      console.error(`[权限管理] 保存配置失败: ${error.message}`);
      return false;
    }
  }

  // 检查是否为管理员
  isAdmin(userId) {
    if (!this.adminUsers) return false;
    return this.adminUsers.split(',').includes(userId);
  }

  // 添加管理员
  addAdmin(userId) {
    if (this.isAdmin(userId)) {
      return false; // 已经是管理员
    }
    
    if (this.adminUsers) {
      this.adminUsers += ',' + userId;
    } else {
      this.adminUsers = userId;
    }
    return this.saveConfig();
  }

  // 移除管理员
  removeAdmin(userId) {
    if (!this.isAdmin(userId)) {
      return false; // 不是管理员
    }
    
    const admins = this.adminUsers.split(',').filter(id => id !== userId);
    this.adminUsers = admins.join(',');
    return this.saveConfig();
  }

  // 获取所有管理员
  getAllAdmins() {
    return this.adminUsers ? this.adminUsers.split(',') : [];
  }

  // 检查权限
  checkPermission(userId, permission) {
    // 目前只实现了admin权限，未来可以扩展更多权限类型
    if (permission === 'admin') {
      return this.isAdmin(userId);
    }
    
    // 默认返回false，未来可以实现更细粒度的权限
    return false;
  }

  // 重新加载配置
  reload() {
    this.loadConfig();
    return true;
  }
}

// 创建单例
const permissionManager = new PermissionManager();

module.exports = permissionManager; 