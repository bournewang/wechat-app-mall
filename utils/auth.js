const WXAPI = require('apifm-wxapi')
import Dialog from '@vant/weapp/dialog/dialog'

async function checkSession(){
  return new Promise((resolve, reject) => {
    wx.checkSession({
      success() {
        return resolve(true)
      },
      fail() {
        return resolve(false)
      }
    })
  })
}

async function bindSeller() {
  const token = wx.getStorageSync('token')
  const referrer = wx.getStorageSync('referrer')
  if (!token) {
    return
  }
  if (!referrer) {
    return
  }
  const res = await WXAPI.bindSeller({
    token,
    uid: referrer
  })
}

// 检测登录状态，返回 true / false
async function checkHasLogined() {
  const token = wx.getStorageSync('token')
  return !!token
  if (!token) {
    return false
  }
  const loggined = await checkSession()
  if (!loggined) {
    wx.removeStorageSync('token')
    return false
  }
  const checkTokenRes = await WXAPI.checkToken(token)
  if (checkTokenRes.code != 0) {
    wx.removeStorageSync('token')
    return false
  }
  return true
}

async function wxaCode(){
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        return resolve(res.code)
      },
      fail() {
        wx.showToast({
          title: '获取code失败',
          icon: 'none'
        })
        return resolve('获取code失败')
      }
    })
  })
}

function afterLogin(data) {
  console.log("==== after Login")
  wx.setStorageSync('token', data.api_token)
  wx.setStorageSync('uid', data.id)
  wx.setStorageSync('userInfo', data)
  // _this.bindSeller()
  // if ( page ) {
  //   page.onShow()
  // }
}
async function register(session_key, page){
  wx.getUserInfo({
    success: function(res) {
      console.log(res)
      res.session_key = session_key
      WXAPI.register_wx(res).then(function(res){
        console.log(res)
        if (res.success) {
          // afterLogin(res.data)
          var data = res.data
          wx.setStorageSync('token', data.api_token)
          wx.setStorageSync('uid', data.id)
          wx.setStorageSync('userInfo', data)
        }                  
      })
    },
    fail: function(res) {
      console.log("register fail ==== ")
    }
  })
}

async function login(page){
  const _this = this
  console.log("======== call wx.login")
  wx.login({
    fail: function() {
      wx.showModal({
        title: '无法登录',
        content: res.msg,
        showCancel: false
      })
      return
    },
    success: function (res) {
      console.log(res)
      var code = res.code
        WXAPI.login_wx(res.code).then(function (res) {        
          if (!res.success) {
            // 去注册
            var session_key = res.data.session_key
            console.log("session_key: "+res.data.session_key)
            register(res.data.session_key, page)
            return;
          }
          
          // afterLogin(res.data)
          var data = res.data
          wx.setStorageSync('token', data.api_token)
          wx.setStorageSync('uid', data.id)
          wx.setStorageSync('userInfo', data)
        })
    }
  })
}

async function authorize() {
  // const code = await wxaCode()
  // const resLogin = await WXAPI.login_wx(code)
  // if (resLogin.code == 0) {
  //   wx.setStorageSync('token', resLogin.data.token)
  //   wx.setStorageSync('uid', resLogin.data.uid)
  //   return resLogin
  // }
  console.log("==== authorize ")
  const that = this
  // if (checkHasLogined()) {
  //   console.log("has login, return")
  //   return
  // }
  return new Promise((resolve, reject) => {
    
    wx.login({
      success: function (res) {
        const code = res.code
        let referrer = '' // 推荐人
        let referrer_storge = wx.getStorageSync('referrer');
        if (referrer_storge) {
          referrer = referrer_storge;
        }
        // 下面开始调用注册接口
          WXAPI.authorize({
            code: code,
            referrer: referrer
          }).then(function (res) {
            console.log("==== authorize response ")

            if (!res.success) {
              // 去注册
              var session_key = res.data.session_key
              console.log("session_key: "+res.data.session_key)
              register(res.data.session_key, page)
              return;
            }
            console.log("==== authorize response success, call afterLogin ")
            // afterLogin(res.data, page)
            var data = res.data
            console.log("set storage sync token: "+data.api_token)
            wx.setStorageSync('token', data.api_token)
            wx.setStorageSync('uid', data.id)
            wx.setStorageSync('userInfo', data)
          })
      },
      fail: err => {
        reject(err)
      }
    })
  })
}

function loginOut(){
  wx.removeStorageSync('token')
  wx.removeStorageSync('uid')
}

async function checkAndAuthorize (scope) {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success(res) {
        if (!res.authSetting[scope]) {
          wx.authorize({
            scope: scope,
            success() {
              resolve() // 无返回参数
            },
            fail(e){
              console.error(e)
              // if (e.errMsg.indexof('auth deny') != -1) {
              //   wx.showToast({
              //     title: e.errMsg,
              //     icon: 'none'
              //   })
              // }
              wx.showModal({
                title: '无权操作',
                content: '需要获得您的授权',
                showCancel: false,
                confirmText: '立即授权',
                confirmColor: '#e64340',
                success(res) {
                  wx.openSetting();
                },
                fail(e){
                  console.error(e)
                  reject(e)
                },
              })
            }
          })
        } else {
          resolve() // 无返回参数
        }
      },
      fail(e){
        console.error(e)
        reject(e)
      }
    })
  })  
}

module.exports = {
  checkHasLogined: checkHasLogined,
  wxaCode: wxaCode,
  login: login,
  loginOut: loginOut,
  checkAndAuthorize: checkAndAuthorize,
  authorize: authorize,
  bindSeller: bindSeller
}