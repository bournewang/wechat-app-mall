const WXAPI = require('apifm-wxapi')
const AUTH = require('../../../utils/auth')
const wxpay = require('../../../utils/pay.js')

Page({
  data: {
    wxlogin: true,
    userInfo: {},

    applyStatus: -2, // -1 表示未申请，0 审核中 1 不通过 2 通过
    applyInfo: {},
    canvasHeight: 0
  },
  onLoad: function (options) {
    this.setting()
  },
  onShow() {
    AUTH.checkHasLogined().then(isLogined => {
      if (isLogined) {
        this.doneShow();
      }
    })
  },
  async doneShow() {
    const _this = this
    // const userDetail = await WXAPI.userDetail(wx.getStorageSync('token'))
    // this.data.userInfo = wx.getStorageSync('userInfo')
    this.setData({
      userInfo: wx.getStorageSync('userInfo')
    })
  },
  goForm: function (e) {
    wx.navigateTo({
      url: "/packageFx/pages/apply/form"
    })
  },
  goShop: function (e) {
    wx.switchTab({
      url: '/pages/index/index',
    })
  },
  goFx: function (e) {
    wx.redirectTo({
      url: '/packageFx/pages/index/index',
    })
  },
  async setting() {
    const res = await WXAPI.fxSetting()
    if (res.code == 0) {
      this.setData({
        setting: res.data
      })
    }
  },
  async buy() {
    const token = wx.getStorageSync('token')
    let res = await WXAPI.userAmount(token)
    if (res.code != 0) {
      wx.showToast({
        title: res.msg,
        icon: 'none'
      })
      return
    }
    if (res.data.balance >= this.data.setting.price) {
      // 余额足够
      res = await WXAPI.fxBuy(token)
      if (res.code != 0) {
        wx.showToast({
          title: res.msg,
          icon: 'none'
        })
        return
      }
      wx.showToast({
        title: '升级成功',
      })
      setTimeout(() => {
        wx.redirectTo({
          url: '/packageFx/pages/index/index',
        })
      }, 1000);
    } else {
      let price = this.data.setting.price - res.data.balance
      price = price.toFixed(2)
      wxpay.wxpay('fxsBuy', price, 0, "/packageFx/pages/index/index");
    }
  }
})