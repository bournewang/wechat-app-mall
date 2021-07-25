const WXAPI = require('apifm-wxapi')

Page({

  /**
   * 页面的初始数据
   */
  data: {
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.adPosition()
  },
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    const _this = this
    // WXAPI.userDetail(wx.getStorageSync('token')).then(res => {
    //   if (res.code === 0) {
    //     _this.setData({
    //       userDetail: res.data
    //     })
    //   }
    // })
    var userInfo = wx.getStorageSync('userInfo')
    console.log("on form, get storage info, ")
    console.log(userInfo)
    // this.data.name = userInfo.name
    // this.data.mobile = userInfo.telephone
    this.setData({
      name: userInfo.nickname,
      mobile: userInfo.mobile
    })
  },
  async adPosition() {
    const res = await WXAPI.adPosition('fx-top-pic')
    if (res.code == 0) {
      this.setData({
        adPositionFxTopPic: res.data
      })
    }
  },
  nameChange(e){
    this.data.name = e.detail.value
  },
  mobileChange(e){
    this.data.mobile = e.detail.value
  },
  bindSave(){
    this.bindSaveDone()
  },
  bindSaveDone: function () {
    const name = this.data.name
    const mobile = this.data.mobile
    console.log("name "+name)
    console.log("mobile "+mobile)
    if (!name) {
      wx.showToast({
        title: '请输入真实姓名',
        icon: 'none'
      })
      return
    }
    if (!mobile) {
      wx.showToast({
        title: '请输入手机号码',
        icon: 'none'
      })
      return
    }
    WXAPI.fxApply(name, mobile).then(res => {
      if (res.code != 0) {
        wx.showToast({
          title: res.msg,
          icon: 'none'
        })
        return
      }
      wx.setStorageSync('userInfo', res.data)
      wx.redirectTo({
        url: "/packageFx/pages/apply/index"
      })
    })
  },
})