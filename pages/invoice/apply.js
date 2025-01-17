const WXAPI = require('apifm-wxapi')
const AUTH = require('../../utils/auth')

Page({

  /**
   * 页面的初始数据
   */
  data: {
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(e) {
    // 读取分享链接中的邀请人编号
    if (e && e.inviter_id) {
      wx.setStorageSync('referrer', e.inviter_id)
    }
    // 静默式授权注册/登陆
    AUTH.authorize().then(res => {
      AUTH.bindSeller()
    })
  },
  onShow() {
  },
  chooseInvoiceTitle(){
    wx.chooseInvoiceTitle({
      success: (res) => {
        this.setData({
          wxInvoiceInfo: res
        })    
      },
      fail: err => {
        console.error(err);
        wx.showToast({
          title: '读取失败',
          icon: 'none'
        })
      }
    })
  },
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {    
    return {
      title: '申请开票',
      imageUrl: 'https://cdn.it120.cc/apifactory/2019/06/13/13f5f43c-4819-414d-88f5-968e32facd79.png',
      path: '/pages/invoice/apply?inviter_id=' + wx.getStorageSync('uid')
    }
  },
  async bindSave(e) {
    // 提交保存
    let comName = e.detail.value.comName;
    let tfn = e.detail.value.tfn;
    let telephone = e.detail.value.telephone;
    let amount = e.detail.value.amount;
    let consumption = e.detail.value.consumption;
    let remark = e.detail.value.remark;
    let address = e.detail.value.address;
    let bank = e.detail.value.bank;
    if (!telephone) {
      wx.showToast({
        title: '请填写您在工厂注册的手机号码',
        icon: 'none'
      })
      return
    }
    if (!comName) {
      wx.showToast({
        title: '公司名称不能为空',
        icon: 'none'
      })
      return
    }
    if (!tfn) {
      wx.showToast({
        title: '税号不能为空',
        icon: 'none'
      })
      return
    }
    if (!consumption) {
      wx.showToast({
        title: '发票内容不能为空',
        icon: 'none'
      })
      return
    }
    if (!amount || amount*1 < 100) {
      wx.showToast({
        title: '开票金额不能低于100',
        icon: 'none'
      })
      return
    }
    const extJsonStr = {}
    extJsonStr['api工厂账号'] = telephone
    extJsonStr['地址与电话'] = address
    extJsonStr['开户行与账号'] = bank
    WXAPI.invoiceApply({
      token: wx.getStorageSync('token'),
      comName,
      tfn,
      amount,
      consumption,
      remark,
      extJsonStr: JSON.stringify(extJsonStr)
    }).then(res => {
      if (res.code == 0) {
        wx.showModal({
          title: '成功',
          content: '提交成功，请耐心等待我们处理！',
          showCancel: false,
          confirmText: '我知道了',
          success(res) {
            wx.navigateTo({
              url: "/pages/invoice/list"
            })
          }
        })
      } else {
        wx.showModal({
          title: '失败',
          content: res.msg,
          showCancel: false,
          confirmText: '我知道了'
        })
      }
    })
  },
})