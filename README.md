# 重庆邮电大学定时健康打卡脚本

![School](https://img.shields.io/badge/School-CQUPT-green.svg)
![Language](https://img.shields.io/badge/language-Node-yellow.svg)
![GitHub stars](https://img.shields.io/github/stars/ourongxing/CQUPT-Health-ClockIn)
![GitHub forks](https://img.shields.io/github/forks/ourongxing/CQUPT-Health-ClockIn)

### 事先声明

**本打卡脚本仅供学习交流使用，请勿过分依赖。开发者对使用或不使用本脚本造成的问题不负任何责任，不对脚本执行效果做出任何担保，原则上不提供任何形式的技术支持。**

### 功能介绍

利用 Github Aciton 实现每天定时自动打卡，并将打卡信息推送到微信。所有私密信息均存放在 Githb Secrets。
工作原理就是发送一个 POST 请求到 WE 重邮的服务器，这个 POST 请求的上传的信息包括
| 键名                        | 备注                                        | 默认值           |
| :-------------------------: | :--------------------------------------:    | :----------:     |
| openid                      | 个人唯一的身份标示                          | **自行抓包获得** |
| mrdkkey                     | 不清楚用途，但每个人不同                    | **自行抓包获得** |
| timestamp                   | 当前时间戳                                  | 自动获取         |
| xh                          | 学号                                        | **手动输入**     |
| name                        | 姓名                                        | 自动获取         |
| xb                          | 性别                                        | 自动获取         |
| szdq                        | 填写的地址                                  | 自动获取         |
| xxdz                        | 填写的详细地址                              | **手动输入**     |
| localtionBig                | GPS 定位生成的位置信息                      | 自动获取         |
| localtionSmall              | GPS 定位生成的位置信息                      | 自动获取         |
| latitude                    | GPS 定位生成的纬度                          | 自动获取         |
| longitude                   | GPS 定位生成的经度                          | 自动获取         |
| ywjcqzbl                    | 新冠肺炎风险等级，非低风险地区请勿使用      | 低风险           |
| ywjchblj                    | 14 天内是否有中高风险地区旅居史             | 无               |
| xjzdywqzbl                  | 14 天内是否接触过有中高风险地区旅居史的人员 | 无               |
| twsfzc                      | 今日体温是否正常                            | 是               |
| ywytdzz                     | 今日是否有与新冠病毒感染有关的症状          | 无               |
| beizhu                      | 备注                                        | 无               |

你需要填写的值仅`openid`,`mrdkkey`,`xh`,`xxdz`

### 使用方法
1. Star 并 Fork 本仓库，进入 Action 界面，手动启用 Action 服务。
2. 在 Settings-Secrets 中添加以下四个值，填写时请注意不要有换行
  - OPEN_ID：自行抓包获得，抓包工具 iOS 推荐 Stream，Android 推荐 HttpCanary，为了避免脚本被滥用，所以在此我不提供抓包方法，请自行研究。
  - MRDK_KEY：自行抓包获得。
  - STUDENT_NUM：学号。
  - ADDRESS：详细住址，填写到区县一级即可，比如南岸区重庆邮电大学。
  - PUSH_KEY：本脚本通过 [Sever 酱](http://sc.ftqq.com/) 来实现推送打卡信息到微信，如果你需要开启这个服务，就按照网站首页提示即可，你会获得一个 SCKEY，你需要填入 PUSH_KEY 中。如果你不需要推送，则可以不填。
![](https://img.imgdb.cn/item/600331ea3ffa7d37b3262a3d.jpg)
3. 修改脚本执行时间，先要将仓库 Clone 到本地，修改 `CQUPT_Health_ClockIn/.github/workflows/work.yaml`。Github 定时执行会有延迟，大概是 10 到 20 分钟。

### 在本地运行测试
```js
// 建议先 fork 到自己仓库再 clone
git clone https://github.com/ourongxing/CQUPT-Health-ClockIn.git
cd CQUPT-Health-ClockIn
yarn
node index.js
```
