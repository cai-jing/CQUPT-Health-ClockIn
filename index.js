// version v1.1
// create by ourongxing
// detail url: https://github.com/ourongxing/CQUPT-Health-ClockIn

const { getMrdkKey } = require("./mrdkkey.js");
const ax = require("axios");

// 获取北京时间
const getLocalTime = () => new Date(Date.now() + 8 * 60 * 60 * 1000);
// 获取格式化后时间
const getFormatTime = () =>
  `${dateFormat(getLocalTime(), "%H:%M:%S", true)} | `;
// 获取当前时间戳
const getTimeStamp = () => Math.floor(Date.now() / 1000);

// 私密信息，通过 Github secrets 填入
const secret_keys = {
  openid: process.env.OPEN_ID,
  student_num: process.env.STUDENT_NUM,
  name: process.env.NAME,
  gender: process.env.GENDER,
  address: process.env.ADDRESS,
  push_key: process.env.PUSH_KEY,
  push_key_qq: process.env.PUSH_KEY_QQ,
};

// 修改默认的 console.log() 函数，集成多个功能，请使用 console.error()
let logs = "";
console.oldLog = console.log;
console.log = function(str) {
  console.oldLog(getFormatTime() + str);
  logs += getFormatTime() + str + "  \n";
  if (str.indexOf("自动打卡失败") != -1) {
    logs +=
      "\n打卡失败的原因还可能有  \n" +
      "1、填写的信息出错  \n" +
      "2、地址简写或过于偏僻  \n" +
      "3、如确定未出现以上已知的问题，请前往 Github 提 Issue";
    sendNotification("自动打卡失败，点击查看详情");
  }
  if (str.indexOf("自动打卡成功") != -1) {
    sendNotification("自动打卡成功");
  }
  if (str.indexOf("今天已完成打卡") != -1) {
    sendNotification("今天已完成打卡");
  }
  if (str.indexOf("检测重复打卡失败") != -1) {
    sendNotification("检测重复打卡失败");
  }
};

// 超时重试
ax.interceptors.response.use(undefined, function axiosRetryInterceptor(err) {
  const config = err.config;
  if (!config || !config.retry) return Promise.reject(err);
  config.__retryCount = config.__retryCount || 0;
  if (config.__retryCount >= config.retry) {
    return Promise.reject(err);
  }
  config.__retryCount += 1;
  const backoff = new Promise(function(resolve) {
    setTimeout(function() {
      resolve();
    }, config.retryDelay || 1);
  });
  return backoff.then(() => ax(config));
});

//默认超时时间
ax.defaults.timeout = 15000;
//默认重试次数
ax.defaults.retry = 5;
//默认间隔时间
ax.defaults.retryDelay = 2000;

// 检查重复打卡
function checkRepeatClock() {
  if (!secret_keys.student_num | !secret_keys.gender | !secret_keys.name | !secret_keys.openid) {
    console.log("信息请填写完整");
    console.log("自动打卡失败");
    return;
  }
  const key = {
    xh: secret_keys.student_num,
    timestamp: getTimeStamp()
  };
  const key_base64 = new Buffer.from(JSON.stringify(key)).toString("base64");
  const options = {
    url: "https://we.cqu.pt/api/mrdk/get_mrdk_flag.php",
    method: "POST",
    data: {
      key: key_base64
    }
  };
  ax(options)
    .then(res => {
      if (res.data.status == 200) {
        let count = res.data.data.count;
        if (count == "0") {
          console.log("检测重复打卡-今日首次打卡");
          getLocation();
        } else {
          console.log("检测重复打卡");
          console.log("今天已完成打卡");
        }
      } else {
        console.log("检测重复打卡失败");
      }
    })
    .catch(() => {
      console.log("检测重复打卡失败");
    });
}

// 获取学生信息
function getStudentInfo() {
  const options = {
    url:
      "https://cyxbsmobile.redrock.team/cyxbsMobile/index.php/home/searchPeople/peopleList",
    method: "GET",
    params: {
      stu: secret_keys.student_num
    }
  };
  ax(options)
    .then(res => {
      if (res.data.status == 200) {
        let data = res.data.data[0];
        secret_keys.name = data.name;
        secret_keys.gender = data.gender;
        console.log("获取学生信息成功");
        getLocation();
      } else {
        console.log("获取学生信息失败");
        console.log("自动打卡失败");
      }
    })
    .catch(() => {
      console.log("获取学生信息失败");
      console.log("自动打卡失败");
    });
}

// 获取位置信息
function getLocation() {
  const options = {
    url: "https://apis.map.qq.com/ws/geocoder/v1/",
    method: "GET",
    params: {
      address: secret_keys.address,
      key: "PULBZ-BSEWU-MAEVV-2IAJR-ZCAS3-53F4O"
    }
  };
  ax(options)
    .then(res => {
      if (res.data.status == 0) {
        let result = res.data.result;
        secret_keys.lng = result.location.lng;
        secret_keys.lat = result.location.lat;
        secret_keys.addressBig = `${result.address_components.province},${result.address_components.city},${result.address_components.district}`;
        secret_keys.locationSmall =
          result.address_components.city +
          result.address_components.district +
          result.title;
        secret_keys.locationBig = `中国,${result.address_components.province},${result.address_components.city},${result.address_components.district}`;
        console.log("获取地址成功");
        clockIn();
      } else {
        console.log("获取地址失败");
        console.log("自动打卡失败");
      }
    })
    .catch(() => {
      console.log("获取地址失败");
      console.log("自动打卡失败");
    });
}

// 打卡
function clockIn() {
  //生成从10到99的随机数，用于每天小幅改变经纬度
  const random = (min, max) => {
    return parseInt(Math.random() * (max - min + 1) + min, 10);
  };
  const key = {
    name: secret_keys.name.replace(/[\r\n]/g, ""),
    xh: secret_keys.student_num.replace(/[\r\n]/g, ""),
    xb: secret_keys.gender.replace(/[\r\n]/g, ""),
    openid: secret_keys.openid.replace(/[\r\n]/g, ""),
    locationBig: secret_keys.locationBig,
    locationSmall: secret_keys.locationSmall,
    // 浮点数的加减乘除要把我给整吐了
    latitude: parseFloat((secret_keys.lat + random(10, 99) * 0.000001).toFixed(6)),
    longitude: parseFloat((secret_keys.lng + random(10, 99) * 0.000001).toFixed(6)),
    szdq: secret_keys.addressBig,
    xxdz: secret_keys.address,

    // 新冠肺炎风险等级，非低风险地区请勿使用
    ywjcqzbl: "低风险",
    // 14 天内是否有中高风险地区旅居史
    ywjchblj: "无",
    // 14 天内是否接触过有中高风险地区旅居史的人员
    xjzdywqzbl: "无",
    // 今日体温是否正常
    twsfzc: "是",
    // 今日是否有与新冠病毒感染有关的症状
    ywytdzz: "无",
    // 备注
    beizhu: "无",
    mrdkkey: getMrdkKey(
      getLocalTime().getUTCDate(),
      getLocalTime().getUTCHours()
    ),
    // 当前时间戳
    timestamp: getTimeStamp(),
  };
  const key_base64 = new Buffer.from(JSON.stringify(key)).toString("base64");
  const options = {
    url: "https://we.cqu.pt/api/mrdk/post_mrdk_info.php",
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.62 XWEB/2693 MMWEBSDK/201001 Mobile Safari/537.36 MMWEBID/7311 MicroMessenger/7.0.20.1781(0x27001439) Process/appbrand2 WeChat/arm64 NetType/4G Language/zh_CN ABI/arm64",
      Referer: "https://servicewechat.com/wx8227f55dc4490f45/76/page-frame.html"
    },
    data: {
      key: key_base64
    }
  };
  ax(options)
    .then(res => {
      if (res.data.status == 200) {
        console.log("自动打卡成功");
      } else {
        console.log("自动打卡失败");
      }
    })
    .catch(() => {
      console.log("自动打卡失败");
    });
}

// 推送消息，填写哪一个的 PUSH_KEY 就使用哪一个，如果都填写则默认使用 Qmsg 酱推送到 QQ
function sendNotification(text) {
  if (secret_keys.push_key_qq) {
    const push_key_qq = secret_keys.push_key_qq.replace(/[\r\n]/g, "");
    const options = {
      url: "https://qmsg.zendee.cn/send/" + push_key_qq,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      data: {
        msg: "自动健康打卡\n\n" + logs
      },
      transformRequest: [data => `msg=${data.msg}`]
    };
    ax(options)
      .then(res => {
        if (res.data.success) {
          console.log("发送通知成功");
        } else {
          console.log("发送通知失败");
        }
      })
      .catch(() => {
        console.log("发送通知失败");
      });
  } else if (secret_keys.push_key) {
    const push_key = secret_keys.push_key.replace(/[\r\n]/g, "");
    const options = {
      url: `https://sc.ftqq.com/${push_key}.send`,
      method: "GET",
      params: {
        text: text,
        desp: logs
      }
    };
    ax(options)
      .then(res => {
        const code = res.data.errno;
        if (code == 0) {
          console.log("发送通知成功");
        } else {
          console.log("发送通知失败：" + res.data.errmsg);
        }
      })
      .catch(() => {
        console.log("发送通知失败");
      });
  } else {
    return;
  }
}

// 时间格式化
function dateFormat(date, fstr, utc) {
  utc = utc ? "getUTC" : "get";
  return fstr.replace(/%[YmdHMS]/g, function(m) {
    switch (m) {
      case "%Y":
        return date[utc + "FullYear"]();
      case "%m":
        m = 1 + date[utc + "Month"]();
        break;
      case "%d":
        m = date[utc + "Date"]();
        break;
      case "%H":
        m = date[utc + "Hours"]();
        break;
      case "%M":
        m = date[utc + "Minutes"]();
        break;
      case "%S":
        m = date[utc + "Seconds"]();
        break;
      default:
        return m.slice(1);
    }
    return ("0" + m).slice(-2);
  });
}

checkRepeatClock();
