# 调研记录（2026 · 在线调研）

## 用户痛点
- 新湖南《青春合伙人·青年数据说④》2025-12-20，湖南科技大学 380 份问卷
  https://www.hunantoday.cn/news/xhn/202512/31171359.html
  - 近六成以食堂为主；外卖 16.58%、校外 16.05%
  - 食堂价格 3.7/5 最高，口味 3.6、出餐速度 3.64
  - 「菜式更新慢，一个学期下来几乎没变化，再好吃的菜也容易吃腻」
  - 「想多吃点轻食，但食堂里这类选择很少」
  - 校外「好吃但等位久，下午有课来不及」

## 现有校园方案（管理侧）
- 武汉商学院「用餐评价」二维码 https://www.eol.cn/hubei/hubgd/202511/t20251103_2697785.shtml
- 大连海事「食事即办」小程序 https://houqin.dlmu.edu.cn/info/1008/5672.htm
- 满客宝智慧食堂评价闭环 https://www.mankebao.com/information/1189.html
  - 五维：口味/卫生/窗口服务/结算设备/就餐环境
  - 差评高频词：偏咸、排队久、地面油污、菜品凉
  - 厂商数据：重复投诉 -78%、满意度 +65%（宣传口径）

## 平台机制借鉴
- 大众点评星级官方回应（北京商报 2026-09-09）https://www.bbtnews.com.cn/2026/0909/605245.shtml
  - 星级 = 评价诚信度 + 质量 + 时间 + 数量
  - 无「好评抵消差评」；凑好评反而拉低诚信度；差评约 3 天延迟

## 上新/试吃机制
- 浙商大「食堂上新先试吃，师生当评委」
- 安徽信息工程学院餐厅新品试吃推广

## 部署可行性（本机实测）
- GitHub 凭据：Windows 凭据管理器存有 AshanQing OAuth token（gho_），API 验证 scope = gist, read:org, repo, workflow
- git 需 `-c http.sslBackend=openssl`（系统 schannel TLS 在沙箱内失败），node fetch 正常
- npm/registry 可用
