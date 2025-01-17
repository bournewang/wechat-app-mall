const WXAPI = require('apifm-wxapi')
const AUTH = require('../../utils/auth')
Page({
  data: {

  },
  onLoad: function (options) {

  },
  onShow: function () {
    AUTH.wxaCode().then(code => {
      this.data.code = code
    })
    this.getUserApiInfo()
  },
  async getUserApiInfo() {
    const res = await WXAPI.userDetail(wx.getStorageSync('token'))
    if (res.code == 0) {
      let _data = {}
      _data.userInfo = res.data
      if (res.data.base.telephone) {
        _data.usertelephone = res.data.base.telephone
      }
      if (this.data.order_hx_uids && this.data.order_hx_uids.indexOf(res.data.base.id) != -1) {
        _data.canHX = true // 具有扫码核销的权限
      }
      const adminUserIds = wx.getStorageSync('adminUserIds')
      if (adminUserIds && adminUserIds.indexOf(res.data.base.id) != -1) {
        _data.isAdmin = true
      }
      if (res.data.peisongMember && res.data.peisongMember.status == 1) {
        _data.memberChecked = false
      } else {
        _data.memberChecked = true
      }
      this.setData(_data);
    }
  },
  getPhoneNumber: function(e) {
    if (!e.detail.errMsg || e.detail.errMsg != "getPhoneNumber:ok") {
      wx.showModal({
        title: '提示',
        content: e.detail.errMsg,
        showCancel: false
      })
      return;
    }
    WXAPI.bindMobileWxapp(wx.getStorageSync('token'), this.data.code, e.detail.encryptedData, e.detail.iv).then(res => {
      AUTH.wxaCode().then(code => {
        this.data.code = code
      })
      if (res.code === 10002) {
        AUTH.login(this)
        return
      }
      if (res.code == 0) {
        wx.showToast({
          title: '绑定成功',
          icon: 'success',
          duration: 2000
        })
        this.getUserApiInfo();
      } else {
        wx.showModal({
          title: '提示',
          content: res.msg,
          showCancel: false
        })
      }
    })
  },
})