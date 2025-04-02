/**
 * @name 权限管理模块
 * @description 管理用户权限和访问控制
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

class PermissionManager {
  constructor() {
    this.configPath = path.join(__dirname, 'config.json');
    this.config = null;
    this.adminUsers = [];
    this.loadConfig();
  }

  // 加载配置
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configContent);
        this.adminUsers = this.config.adminUsers || [];
        console.log(`[权限管理] 已加载${this.adminUsers.length}个管理员用户`);
      } else {
        console.error('[权限管理] 配置文件不存在');
        this.config = { adminUsers: [] };
        this.adminUsers = [];
      }
    } catch (error) {
      console.error(`[权限管理] 加载配置失败: ${error.message}`);
      this.config = { adminUsers: [] };
      this.adminUsers = [];
    }
  }

  // 保存配置
  saveConfig() {
    try {
      // 确保adminUsers已更新到config对象
      this.config.adminUsers = this.adminUsers;
      
      // 写入文件
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      console.log('[权限管理] 配置已保存');
      return true;
    } catch (error) {
      console.error(`[权限管理] 保存配置失败: ${error.message}`);
      return false;
    }
  }

  // 检查是否为管理员
  isAdmin(userId) {
    return this.adminUsers.includes(userId);
  }

  // 添加管理员
  addAdmin(userId) {
    if (this.isAdmin(userId)) {
      return false; // 已经是管理员
    }
    
    this.adminUsers.push(userId);
    return this.saveConfig();
  }

  // 移除管理员
  removeAdmin(userId) {
    if (!this.isAdmin(userId)) {
      return false; // 不是管理员
    }
    
    this.adminUsers = this.adminUsers.filter(id => id !== userId);
    return this.saveConfig();
  }

  // 获取所有管理员
  getAllAdmins() {
    return [...this.adminUsers];
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