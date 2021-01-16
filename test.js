const ax = require("axios");
const crypto = require('crypto');
const md5 = crypto.createHash('md5');

const loc_api_url = "https://apis.map.qq.com/ws/geocoder/v1/";
const key = "PULBZ-BSEWU-MAEVV-2IAJR-ZCAS3-53F4O";

const options = {
  url: loc_api_url,
  method: "GET",
  params: 
  {
    address: "北京市海淀区彩和坊路海淀西大街74号",
    key: key,
  }
};
ax(options).then(res => {
  console.log(res.data);
});
