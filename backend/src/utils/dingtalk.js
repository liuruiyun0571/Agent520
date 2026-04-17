/**
 * 钉钉通知工具
 * 支持文本消息、Markdown消息、卡片消息
 */

const axios = require('axios');
const crypto = require('crypto');

class DingTalkNotifier {
  constructor() {
    this.webhookUrl = process.env.DINGTALK_WEBHOOK_URL;
    this.secret = process.env.DINGTALK_SECRET;
  }

  /**
   * 生成签名
   */
  _generateSign(timestamp) {
    if (!this.secret) return '';
    
    const stringToSign = `${timestamp}\n${this.secret}`;
    const sign = crypto
      .createHmac('sha256', this.secret)
      .update(stringToSign)
      .digest('base64');
    
    return encodeURIComponent(sign);
  }

  /**
   * 发送请求
   */
  async _send(message) {
    if (!this.webhookUrl) {
      console.log('[钉钉通知] Webhook未配置，跳过发送');
      console.log('[钉钉通知] 消息内容:', JSON.stringify(message, null, 2));
      return { success: true, simulated: true };
    }

    try {
      const timestamp = Date.now();
      const sign = this._generateSign(timestamp);
      const url = `${this.webhookUrl}&timestamp=${timestamp}&sign=${sign}`;

      const response = await axios.post(url, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data?.errcode === 0) {
        console.log('[钉钉通知] 发送成功');
        return { success: true, data: response.data };
      } else {
        console.error('[钉钉通知] 发送失败:', response.data);
        return { success: false, error: response.data };
      }
    } catch (error) {
      console.error('[钉钉通知] 请求失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送文本消息
   * @param {string} content 消息内容
   * @param {object} options 选项 { atAll, atMobiles }
   */
  async sendText(content, options = {}) {
    const message = {
      msgtype: 'text',
      text: { content }
    };

    if (options.atAll || options.atMobiles?.length > 0) {
      message.at = {
        atMobiles: options.atMobiles || [],
        isAtAll: options.atAll || false
      };
    }

    return this._send(message);
  }

  /**
   * 发送Markdown消息
   * @param {string} title 标题
   * @param {string} text Markdown内容
   * @param {object} options 选项
   */
  async sendMarkdown(title, text, options = {}) {
    const message = {
      msgtype: 'markdown',
      markdown: { title, text }
    };

    if (options.atAll || options.atMobiles?.length > 0) {
      message.at = {
        atMobiles: options.atMobiles || [],
        isAtAll: options.atAll || false
      };
    }

    return this._send(message);
  }

  /**
   * 发送动作卡片消息
   * @param {object} params 参数
   */
  async sendActionCard({ title, markdown, singleTitle, singleURL }) {
    const message = {
      msgtype: 'action_card',
      action_card: {
        title,
        markdown,
        single_title: singleTitle || '查看详情',
        single_url: singleURL
      }
    };

    return this._send(message);
  }

  /**
   * 发送审批通知
   * @param {object} approval 审批信息
   */
  async sendApprovalNotification(approval) {
    const { type, title, applicant, amount, date, actionUrl, approvers } = approval;
    
    const typeMap = {
      payment: '回款审批',
      cost: '成本确认',
      project: '项目立项'
    };

    const markdown = `### ${typeMap[type] || '审批通知'}
**申请人:** ${applicant}  
**申请事项:** ${title}  
**金额:** ¥${(amount / 10000).toFixed(2)}万  
**申请日期:** ${date}

请及时处理审批事项。
`;

    return this.sendActionCard({
      title: typeMap[type] || '审批通知',
      markdown,
      singleTitle: '去审批',
      singleURL: actionUrl
    });
  }

  /**
   * 发送预警通知
   * @param {object} warning 预警信息
   */
  async sendWarningNotification(warning) {
    const { type, teamName, ratio, balance, month } = warning;
    
    const typeMap = {
      overdraft: '超支预警',
      freeze: '账户冻结',
      protection: '保护期提醒'
    };

    const colorMap = {
      overdraft: '#FF6B6B',
      freeze: '#EE5A6F',
      protection: '#9B59B6'
    };

    const markdown = `### <font color="${colorMap[type] || '#FF6B6B'}">${typeMap[type] || '预警通知'}</font>
**团队:** ${teamName}  
**统计月份:** ${month}  
**透支比例:** ${ratio}%  
**当前余额:** ¥${(balance / 10000).toFixed(2)}万

请及时关注团队资金状况。
`;

    return this.sendMarkdown(typeMap[type] || '预警通知', markdown, { atAll: false });
  }

  /**
   * 发送系统通知
   * @param {string} title 标题
   * @param {string} content 内容
   */
  async sendSystemNotification(title, content) {
    const markdown = `### ${title}
${content}
`;

    return this.sendMarkdown(title, markdown);
  }
}

// 导出单例
module.exports = new DingTalkNotifier();
