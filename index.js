// version v0.1
// create by ourongxing
// detail url: https://github.com/ourongxing/CQUPT-Health-ClockIn

const ax = require("axios");
const { getMrdkKey } = require("./mrdkkey.js");

// Server酱推送 KEY
const push_key = process.env.PUSH_KEY;

// 私密信息，通过 Github secrets 填入
const secret_keys = {
  openid: process.env.OPEN_ID,
  student_num: process.env.STUDENT_NUM,
  address: process.env.ADDRESS
};

// 超时重试
ax.interceptors.response.use(undefined, function axiosRetryInterceptor(err) {
  const config = err.config;
  if(!config || !config.retry) return Promise.reject(err);
  config.__retryCount = config.__retryCount || 0;
  if(config.__retryCount >= config.retry) {
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

// 获取当前时间戳
const getTimeStamp = () => Math.floor(Date.now() / 1000);

// 检查重复打卡
function checkRepeatClock() {
  if (!secret_keys.student_num) {
    console.log("1、没有填写学号");
    console.log("2、打卡失败");
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
    },
    retry: 5, // 重试次数
    timeout: 10000, // 超时时间
    retryDelay: 1000 // 间隔时间
  };
  ax(options)
    .then(res => {
      if (res.data.status == 200) {
        let count = res.data.data.count;
        if (count == "0") {
          console.log("1、检测重复打卡-今日首次打卡");
          getStudentInfo();
        } else {
          console.log("1、检测重复打卡-今日已打卡");
          console.log("2、打卡成功");
          return;
        }
      } else {
        console.log("1、检测重复打卡失败");
        return;
      }
    })
    .catch(() => {
      console.log("1、检测重复打卡失败");
      return;
    });
}

// 获取学生信息
function getStudentInfo() {
  const options = {
    url: "https://cyxbsmobile.redrock.team/cyxbsMobile/index.php/home/searchPeople/peopleList",
    method: "GET",
    params: {
      stu: secret_keys.student_num
    },
    retry: 5,
    timeout: 10000,
    retryDelay: 1000
  };
  ax(options)
    .then(res => {
      if (res.data.status == 200) {
        let data = res.data.data[0];
        secret_keys.name = data.name;
        secret_keys.sex = data.gender;
        console.log("2、获取学生信息成功");
        getLocation();
      } else {
        console.log("2、获取学生信息失败");
        console.log("3、打卡失败");
        sendNotification("自动健康打卡失败，请手动打卡");
        return;
      }
    })
    .catch(err => {
      console.log("2、获取学生信息失败");
      console.log("3、打卡失败");
      sendNotification("自动健康打卡失败，请手动打卡");
      return;
    });
}

// 获取位置信息
function getLocation() {
  if (!secret_keys.address) {
    console.log("3、没有填写地址");
    console.log("4、打卡失败");
    return;
  }
  const options = {
    url: "https://apis.map.qq.com/ws/geocoder/v1/",
    method: "GET",
    params: {
      address: secret_keys.address,
      key: "PULBZ-BSEWU-MAEVV-2IAJR-ZCAS3-53F4O"
    },
    retry: 5,
    timeout: 10000,
    retryDelay: 1000
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
        console.log("3、获取地址成功");
        clockIn();
      } else {
        console.log("3、获取地址失败");
        console.log("4、打卡失败");
        sendNotification("自动健康打卡失败，请手动打卡");
        return;
      }
    })
    .catch(() => {
      console.log("3、获取地址失败");
      console.log("4、打卡失败");
      sendNotification("自动健康打卡失败，请手动打卡");
      return;
    });
}

// 打卡
function clockIn() {
  if (!secret_keys.openid) {
    console.log("4、没有填写 OPEN_ID");
    console.log("5、打卡失败");
    return;
  }
  const time = new Date();

  //生成从10到99的随机数，用于每天小幅改变经纬度
  const random = (min,max) => { return parseInt(Math.random()*(max-min+1)+min,10)};

  const key = {
    openid: secret_keys.openid.replace(/[\r\n]/g, ""),
    name: secret_keys.name,
    xh: secret_keys.student_num,
    xb: secret_keys.sex,
    locationBig: secret_keys.locationBig,
    locationSmall: secret_keys.locationSmall,
    latitude: secret_keys.lat+random(10,99)*0.000001,
    longitude: secret_keys.lng+random(10,99)*0.000001,
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
    // 当前时间戳
    timestamp: getTimeStamp(),
    mrdkkey: getMrdkKey(time.getDate(), time.getHours())
  };

  const key_base64 = new Buffer.from(JSON.stringify(key)).toString("base64");

  const options = {
    url: "https://we.cqu.pt/api/mrdk/post_mrdk_info.php",
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.62 XWEB/2693 MMWEBSDK/201001 Mobile Safari/537.36 MMWEBID/7311 MicroMessenger/7.0.20.1781(0x27001439) Process/appbrand2 WeChat/arm64 NetType/4G Language/zh_CN ABI/arm64",
      Referer: "https://servicewechat.com/wx8227f55dc4490f45/76/page-frame.html"
    },
    data: {
      key: key_base64
    },
    retry: 5,
    timeout: 10000,
    retryDelay: 1000
  };

  ax(options)
    .then(res => {
      if (res.data.status == 200) {
        console.log("4、打卡成功");
        sendNotification("自动健康打卡成功");
      } else {
        console.log("4、打卡失败");
        sendNotification("自动健康打卡失败，请手动打卡");
      }
    })
    .catch(() => {
      console.log("4、打卡失败");
      sendNotification("自动健康打卡失败，请手动打卡");
    });
}

// 调用 Server 酱发送打卡信息到微信
function sendNotification(text) {
  if (!push_key) {
    return;
  }

  let SCKEY = push_key.replace(/[\r\n]/g, "");

  const options = {
    url: `https://sc.ftqq.com/${SCKEY}.send`,
    method: "GET",
    params: {
      text: text
    },
    retry: 5,
    timeout: 10000,
    retryDelay: 1000
  };

  ax(options)
    .then(res => {
      const code = res.data.errno;
      if (code == 0) {
        console.log("5、发送通知成功");
      } else {
        console.log("5、发送通知失败：" + res.data.errmsg);
      }
    })
    .catch(() => {
      console.log("5、发送通知失败");
    });
}

checkRepeatClock();
