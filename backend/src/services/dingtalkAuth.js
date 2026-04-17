/**
 * 钉钉登录服务
 * 处理钉钉扫码登录、获取用户信息
 */

const axios = require('axios');
const crypto = require('crypto');

class DingTalkAuthService {
  constructor() {
    this.corpId = process.env.DINGTALK_CORP_ID;
    this.agentId = process.env.DINGTALK_AGENT_ID;
    this.appKey = process.env.DINGTALK_APP_KEY;
    this.appSecret = process.env.DINGTALK_APP_SECRET;
    this.apiToken = process.env.DINGTALK_API_TOKEN;
    
    this.accessToken = null;
    this.tokenExpireTime = 0;
  }

  /**
   * 获取钉钉 AccessToken
   */
  async getAccessToken() {
    // Token 未过期直接返回
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const response = await axios.get('https://oapi.dingtalk.com/gettoken', {
        params: {
          appkey: this.appKey,
          appsecret: this.appSecret
        }
      });

      if (response.data?.access_token) {
        this.accessToken = response.data.access_token;
        // Token 有效期 2 小时，提前 5 分钟刷新
        this.tokenExpireTime = Date.now() + (response.data.expires_in - 300) * 1000;
        return this.accessToken;
      } else {
        throw new Error('获取 AccessToken 失败: ' + JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('[钉钉登录] 获取 AccessToken 失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取用户授权信息（通过临时授权码）
   * @param {string} code 临时授权码
   */
  async getUserInfoByCode(code) {
    try {
      const accessToken = await this.getAccessToken();
      
      // 1. 获取用户 userid
      const userResponse = await axios.post('https://oapi.dingtalk.com/topapi/v2/user/getuserinfo', {
        code: code
      }, {
        params: { access_token: accessToken }
      });

      if (userResponse.data?.errcode !== 0) {
        throw new Error(userResponse.data?.errmsg || '获取用户信息失败');
      }

      const userId = userResponse.data.result.userid;
      
      // 2. 获取用户详细信息
      const userDetail = await this.getUserDetail(userId);
      
      return {
        userId: userId,
        unionId: userDetail.unionId,
        name: userDetail.name,
        mobile: userDetail.mobile,
        avatar: userDetail.avatar,
        email: userDetail.email,
        title: userDetail.title,
        deptId: userDetail.dept_id_list?.[0]
      };
    } catch (error) {
      console.error('[钉钉登录] 获取用户信息失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取用户详细信息
   * @param {string} userId 用户ID
   */
  async getUserDetail(userId) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.post('https://oapi.dingtalk.com/topapi/v2/user/get', {
        userid: userId
      }, {
        params: { access_token: accessToken }
      });

      if (response.data?.errcode !== 0) {
        throw new Error(response.data?.errmsg || '获取用户详情失败');
      }

      return response.data.result;
    } catch (error) {
      console.error('[钉钉登录] 获取用户详情失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取 JSAPI Ticket（用于前端 JS-SDK）
   */
  async getJsapiTicket() {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get('https://oapi.dingtalk.com/get_jsapi_ticket', {
        params: { access_token: accessToken }
      });

      if (response.data?.errcode !== 0) {
        throw new Error(response.data?.errmsg || '获取 JSAPI Ticket 失败');
      }

      return response.data.ticket;
    } catch (error) {
      console.error('[钉钉登录] 获取 JSAPI Ticket 失败:', error.message);
      throw error;
    }
  }

  /**
   * 生成 JS-SDK 配置
   * @param {string} url 当前页面 URL
   */
  async generateJsConfig(url) {
    try {
      const ticket = await this.getJsapiTicket();
      const nonceStr = Math.random().toString(36).substring(2, 15);
      const timeStamp = Date.now();
      
      // 生成签名
      const stringToSign = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timeStamp}&url=${url}`;
      const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

      return {
        agentId: this.agentId,
        corpId: this.corpId,
        timeStamp: timeStamp,
        nonceStr: nonceStr,
        signature: signature
      };
    } catch (error) {
      console.error('[钉钉登录] 生成 JS 配置失败:', error.message);
      throw error;
    }
  }
}

module.exports = new DingTalkAuthService();
