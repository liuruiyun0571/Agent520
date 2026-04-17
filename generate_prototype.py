#!/usr/bin/env python3
"""Generate bank compliance prototype using PIL"""
from PIL import Image, ImageDraw, ImageFont
import math

# Create image
width, height = 1440, 1080
img = Image.new('RGB', (width, height), '#0a1628')
draw = ImageDraw.Draw(img)

# Gradient background
for y in range(height):
    r = int(10 + (26-10) * y / height)
    g = int(22 + (42-22) * y / height)
    b = int(40 + (45-40) * y / height)
    draw.line([(0, y), (width, y)], fill=(r, g, b))

try:
    font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 64)
    font_num = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
    font_card = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
except:
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()
    font_large = ImageFont.load_default()
    font_num = ImageFont.load_default()
    font_card = ImageFont.load_default()

# Colors
gold = '#c9a227'
gold_light = '#f0d878'
green = '#00d26a'
blue_light = '#6495ed'
text_gray = '#8a9ab0'
text_dark = '#5a6a80'
white = '#ffffff'

def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

# Header background
draw_rounded_rect(draw, (40, 40, 1400, 120), 16, fill=(255,255,255,13), outline=(255,255,255,26), width=1)

# Logo box
draw_rounded_rect(draw, (60, 55, 110, 105), 12, fill=gold)
draw.text((73, 63), "金", font=font_title, fill='#0a1628')

# Bank name
draw.text((125, 60), "某大型商业银行", font=font_sub, fill=text_gray)
draw.text((125, 80), "GoldenBank", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18) if 'font_title' in locals() else font_sub, fill=white)

# Title
draw.text((520, 65), "智能合规审查系统 · Intelligent Compliance Review", font=font_title, fill=white)

# Badge
draw_rounded_rect(draw, (1230, 60, 1380, 100), 30, fill=green)
draw.text((1245, 72), "✓ 已通过生产验证", font=font_sub, fill=white)

# Left panel - Skill Flow
draw_rounded_rect(draw, (40, 150, 700, 520), 20, fill=(255,255,255,8), outline=(255,255,255,20), width=1)
draw.rectangle((55, 170, 59, 188), fill=gold)  # Title bar
draw.text((70, 170), "Skill 调用流程", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16) if 'font_title' in locals() else font_sub, fill=text_gray)

flow_items = [
    ("1", "送审材料接入", "多格式文档自动解析与标准化", green),
    ("2", "Skill 智能审查", "全方位合规规则引擎自动检测", gold),
    ("3", "风险评估分析", "AI 驱动的多维度风险量化", blue_light),
    ("4", "合规报告生成", "结构化审计报告一键输出", text_gray)
]

y = 210
for num, title, desc, color in flow_items:
    # Item bg
    draw_rounded_rect(draw, (60, y, 680, y+50), 12, fill=(255,255,255,13))
    draw.rectangle((60, y, 63, y+50), fill=color)  # Left border
    
    # Icon circle
    draw.ellipse((75, y+10, 105, y+40), fill=(0,0,0,50), outline=color, width=2)
    draw.text((82, y+15), num, font=font_sub, fill=color)
    
    # Text
    draw.text((120, y+8), title, font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13) if 'font_title' in locals() else font_sub, fill=white)
    draw.text((120, y+28), desc, font=font_sub, fill=text_gray)
    
    # Status
    status = "运行中" if num == "2" else "完成"
    status_color = green if status == "完成" else gold
    draw_rounded_rect(draw, (600, y+15, 660, y+38), 15, fill=(0,0,0,30))
    draw.text((610, y+20), status, font=font_sub, fill=status_color)
    
    y += 65

# Right panel - Metrics
draw_rounded_rect(draw, (740, 150, 1400, 520), 20, fill=(255,255,255,8), outline=(255,255,255,20), width=1)
draw.rectangle((755, 170, 759, 188), fill=gold)
draw.text((770, 170), "全方位审核维度", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16) if 'font_title' in locals() else font_sub, fill=text_gray)

metrics = [
    ("完整", "文档完整性审查", 780, 210),
    ("合规", "法规政策符合性", 1070, 210),
    ("安全", "数据安全与隐私", 780, 330),
    ("准确", "财务数据准确性", 1070, 330),
    ("一致", "内部流程一致性", 780, 450),
    ("实时", "风险预警监控", 1070, 450)
]

for title, desc, x, y in metrics:
    draw_rounded_rect(draw, (x, y, x+260, y+100), 14, fill=(255,255,255,13), outline=(255,255,255,10), width=1)
    
    # Value
    draw.text((x+90, y+20), title, font=font_card, fill=gold)
    
    # Label
    draw.text((x+80, y+60), desc, font=font_sub, fill=text_gray)

# Bottom left - Pass Rate
draw_rounded_rect(draw, (40, 550, 920, 1000), 20, fill=(0,210,106,10), outline=green, width=2)

# Circle with 100%
cx, cy = 480, 750
radius = 100
# Outer ring
draw.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), outline=green, width=8)
# Inner circle
draw.ellipse((cx-radius+20, cy-radius+20, cx+radius-20, cy+radius-20), fill='#0a1628')

# Text
draw.text((cx-75, cy-35), "100%", font=font_large, fill=green)
draw.text((cx-45, cy+35), "审计通过率", font=font_sub, fill=text_gray)

# Description
draw.text((280, 870), "送审材料经 Skill 智能审查引擎 全方位审核", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18) if 'font_title' in locals() else font_sub, fill=white)
draw.text((310, 900), "合规性、完整性、准确性三重保障", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18) if 'font_title' in locals() else font_sub, fill=white)

# Tags
tags = ["金融级安全", "实时审查", "AI 驱动"]
x = 320
for tag in tags:
    draw_rounded_rect(draw, (x, 940, x+110, 970), 20, fill=(201,162,39,38))
    draw.text((x+15, 948), tag, font=font_sub, fill=gold)
    x += 125

# Bottom right - Stats
draw_rounded_rect(draw, (940, 550, 1400, 780), 20, fill=(255,255,255,8), outline=(255,255,255,20), width=1)

stats = [
    ("今日审查文档", "2,847", gold),
    ("平均审查时长", "3.2分钟", white),
    ("人工复核率", "0%", gold),
    ("系统可用性", "99.99%", white),
    ("累计审查文档", "128万+", gold)
]

y = 575
for label, value, color in stats:
    draw_rounded_rect(draw, (960, y, 1380, y+55), 12, fill=(255,255,255,13))
    draw.text((980, y+18), label, font=font_sub, fill=text_gray)
    draw.text((1280, y+15), value, font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18) if 'font_title' in locals() else font_sub, fill=color)
    y += 70

# Footer
draw.text((450, 1040), "GoldenBank 智能合规审查系统 | 采用先进的 Skill 技术架构 | 让合规审查更智能、更高效、更可靠", font=font_sub, fill=text_dark)

# Save
img.save('/root/.openclaw/workspace/bank-compliance-v2.png', 'PNG')
print("Saved: bank-compliance-v2.png")
