#!/usr/bin/env python3
"""
小智AI 用药提醒推送脚本
通过 Coze API 发送提醒到智能体
"""

import requests
import json
import sys

# Coze API 配置
COZE_TOKEN = "pat_eqeqL1npvgcABiPn7DVcqAbSXv01ap0UQFlitrvaNGkKR7S0HG7y0mHR5edbC0du"
WORKFLOW_ID = "7609302058391142400"
API_URL = "https://api.coze.cn/v1/workflow/stream_run"

# 提醒消息模板
REMINDER_MESSAGES = {
    "morning": "爷爷，早上好！该吃早上的药了，记得用温水送服。",
    "noon": "爷爷，中午好！该吃中午的药了，饭后半小时服用哦。",
    "evening": "爷爷，晚上好！该吃晚上的药了，睡前记得服用。"
}

def send_reminder(time_slot="morning", custom_message=None):
    """
    发送用药提醒
    
    Args:
        time_slot: morning/noon/evening
        custom_message: 自定义消息，不传则使用默认模板
    """
    message = custom_message or REMINDER_MESSAGES.get(time_slot, REMINDER_MESSAGES["morning"])
    
    headers = {
        "Authorization": f"Bearer {COZE_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "workflow_id": WORKFLOW_ID,
        "parameters": {
            "input": message
        }
    }
    
    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        
        print(f"✅ 提醒发送成功 [{time_slot}]")
        print(f"   消息: {message}")
        print(f"   响应: {response.status_code}")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 提醒发送失败 [{time_slot}]")
        print(f"   错误: {e}")
        return False

def main():
    """主函数 - 根据命令行参数发送不同时间段的提醒"""
    if len(sys.argv) > 1:
        time_slot = sys.argv[1]
    else:
        time_slot = "morning"
    
    # 支持自定义消息
    custom_msg = sys.argv[2] if len(sys.argv) > 2 else None
    
    success = send_reminder(time_slot, custom_msg)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
