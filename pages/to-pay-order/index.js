const app = getApp()
const CONFIG = require('../../config.js')
const WXAPI = require('apifm-wxapi')
const AUTH = require('../../utils/auth')
const wxpay = require('../../utils/pay.js')

Page({
  data: {
    cart: {},
    totalScoreToPay: 0,
    goodsList: [],
    isNeedLogistics: 0, // 是否需要物流信息
    yunPrice: 0,
    allGoodsAndYunPrice: 0,
    goodsJsonStr: "",
    orderType: "", //订单类型，购物车下单或立即支付下单，默认是购物车，
    pingtuanOpenId: undefined, //拼团的话记录团号

    hasNoCoupons: true,
    coupons: [],
    couponAmount: 0, //优惠券金额
    curCoupon: null, // 当前选择使用的优惠券
    curCouponShowText: '请选择使用优惠券', // 当前选择使用的优惠券
    peisongType: 'kd', // 配送方式 kd,zq 分别表示快递/到店自取
    remark: '',
    shopIndex: -1,
    pageIsEnd: false,


    bindtelephoneStatus: 0, // 0 未判断 1 已绑定手机号码 2 未绑定手机号码
    userScore: 0, // 用户可用积分
    deductionScore: '0', // 本次交易抵扣的积分数
    shopCarType: 0 //0自营购物车，1云货架购物车
  },
  onShow() {
    if (this.data.pageIsEnd) {
      return
    }
    AUTH.checkHasLogined().then(isLogined => {
      if (isLogined) {
        this.doneShow()
      } else {
        AUTH.authorize().then(res => {
          AUTH.bindSeller()
          this.doneShow()
        })
      }
    })
    AUTH.wxaCode().then(code => {
      this.data.code = code
    })
  },
  async initShippingAddress() {
    // const res = await WXAPI.defaultAddress(wx.getStorageSync('token'))
    const res = await WXAPI.currentAddress()
    if (res.code == 0) {
      this.setData({
        curAddressData: res.data
      });
    } else {
      this.setData({
        curAddressData: null
      });
    }
    // this.processYunfei();
  },
  async doneShow() {
    let goodsList = [];
    const token = wx.getStorageSync('token')
    //立即购买下单
    if ("buyNow" == this.data.orderType) {
      var buyNowInfoMem = wx.getStorageSync('buyNowInfo');
      this.data.kjId = buyNowInfoMem.kjId;
      if (buyNowInfoMem && buyNowInfoMem.shopList) {
        goodsList = buyNowInfoMem.shopList
      }
    } else {
      //购物车下单
      // if (this.data.shopCarType == 0) {//自营购物车
        var res = await WXAPI.shippingCarInfo(token)
      // } else if (this.data.shopCarType == 1) {//云货架购物车
        // var res = await WXAPI.jdvopCartInfo(token)
      // }
      this.setData({cart: res.data})
      if (res.code == 0) {
        goodsList = res.data.items.filter(ele => {
          return ele.selected
        })
      }
    }
    this.setData({
      goodsList,
      peisongType: this.data.peisongType
    });
    this.initShippingAddress()
    // this.userAmount()
  },

  onLoad(e) {
    let _data = {
      isNeedLogistics: 1
    }
    if (e.orderType) {
      _data.orderType = e.orderType
    }
    if (e.pingtuanOpenId) {
      _data.pingtuanOpenId = e.pingtuanOpenId
    }
    if (e.shopCarType) {
      _data.shopCarType = e.shopCarType
    }
    this.setData(_data)
    this.getUserApiInfo()
  },
  async userAmount() {
    const res = await WXAPI.userAmount(wx.getStorageSync('token'))
    if (res.code == 0) {
      this.setData({
        balance: res.data.balance,
        userScore: res.data.score
      })
    }
  },
  getDistrictId: function (obj, aaa) {
    if (!obj) {
      return "";
    }
    if (!aaa) {
      return "";
    }
    return aaa;
  },
  remarkChange(e) {
    this.data.remark = e.detail.value
  },
  async goCreateOrder() {
    console.log("---- goCreateOrder")
    // 检测实名认证状态
    // if (wx.getStorageSync('needIdCheck') == 1) {
     if (0) { 
      console.log(123);

      const res = await WXAPI.userDetail(wx.getStorageSync('token'))
      if (res.code == 0 && !res.data.base.isIdcardCheck) {
        wx.navigateTo({
          url: '/pages/idCheck/index',
        })
        return
      }
    }
    const subscribe_ids = wx.getStorageSync('subscribe_ids')
    if (subscribe_ids) {
      wx.requestSubscribeMessage({
        tmplIds: subscribe_ids.split(','),
        success(res) {

        },
        fail(e) {
          console.error(e)
        },
        complete: (e) => {
          this.createOrder(true)
        },
      })
    } else {
      this.createOrder(true)
    }
  },
  createOrder: function (e) {
    var that = this;
    let postData = that.data.curAddressData
    // postData.comment = this.data.remark
    if (this.data.shopCarType == 1) {
      // vop 需要地址来计算运费
      postData.address = that.data.curAddressData.street;
      postData.consignee = that.data.curAddressData.consignee;
      postData.telephone = that.data.curAddressData.telephone;
      postData.code = that.data.curAddressData.code;
    }
    if (e && that.data.isNeedLogistics > 0 && postData.peisongType == 'kd') {
      if (!that.data.curAddressData) {
        wx.hideLoading();
        wx.showToast({
          title: '请设置收货地址',
          icon: 'none'
        })
        return;
      }
      if (postData.peisongType == 'kd') {
        postData.address = that.data.curAddressData.address;
        postData.consignee = that.data.curAddressData.consignee;
        postData.telephone = that.data.curAddressData.telephone;
        postData.code = that.data.curAddressData.code;
      }
    }
    if (that.data.curCoupon) {
      postData.couponId = that.data.curCoupon.id;
    }
    if (!e) {
      postData.calculate = "true";
    } else {
      if (postData.peisongType == 'zq' && this.data.shops && this.data.shopIndex == -1) {
        wx.showToast({
          title: '请选择自提门店',
          icon: 'none'
        })
        return;
      }
      const extJsonStr = {}
      if (postData.peisongType == 'zq') {
        if (!this.data.name) {
          wx.showToast({
            title: '请填写联系人',
            icon: 'none'
          })
          return;
        }
        if (!this.data.telephone) {
          wx.showToast({
            title: '请填写联系电话',
            icon: 'none'
          })
          return;
        }
        extJsonStr['联系人'] = this.data.name
        extJsonStr['联系电话'] = this.data.telephone
      }
      if (postData.peisongType == 'zq' && this.data.shops) {
        postData.shopIdZt = this.data.shops[this.data.shopIndex].id
        postData.shopNameZt = this.data.shops[this.data.shopIndex].name
      }
      postData.extJsonStr = JSON.stringify(extJsonStr)
    }

    WXAPI.orderCreate(postData).then(function (res) {
      that.data.pageIsEnd = true
      if (res.code != 0) {
        that.data.pageIsEnd = false
        wx.showModal({
          title: '错误',
          content: res.msg,
          showCancel: false
        })
        return;
      }

      wx.navigateTo({
        url: "/pages/order-details/index?id="+res.data
      })

      // if (e && "buyNow" != that.data.orderType) {
      //   // 清空购物车数据
      //   const keyArrays = []
      //   that.data.goodsList.forEach(ele => {
      //     keyArrays.push(ele.key)
      //   })
      //   if (that.data.shopCarType == 0) { //自营购物车
      //     WXAPI.shippingCarInfoRemoveItem(loginToken, keyArrays.join())
      //   } else if (that.data.shopCarType == 1) {//云货架购物车
      //     WXAPI.jdvopCartRemove(loginToken, keyArrays.join())
      //   }
      // }
      // if (!e) {
        // let hasNoCoupons = true
        // let coupons = null
        // if (res.data.couponUserList) {
        //   hasNoCoupons = false
        //   res.data.couponUserList.forEach(ele => {
        //     let moneyUnit = '元'
        //     if (ele.moneyType == 1) {
        //       moneyUnit = '%'
        //     }
        //     if (ele.moneyHreshold) {
        //       ele.nameExt = ele.name + ' [面值' + ele.money + moneyUnit + '，满' + ele.moneyHreshold + '元可用]'
        //     } else {
        //       ele.nameExt = ele.name + ' [面值' + ele.money + moneyUnit + ']'
        //     }
        //   })
        //   coupons = res.data.couponUserList
        // }
        // 计算积分抵扣规则 userScore
        // let scoreDeductionRules = res.data.scoreDeductionRules
        // if (scoreDeductionRules) {
        //   // 如果可叠加，计算可抵扣的最大积分数
        //   scoreDeductionRules.forEach(ele => {
        //     if (ele.loop) {
        //       let loopTimes = Math.floor(that.data.userScore / ele.score) // 按剩余积分取最大
        //       let loopTimesMax = Math.floor((res.data.amountTotle + res.data.deductionMoney) / ele.money) // 按金额取最大
        //       if (loopTimes > loopTimesMax) {
        //         loopTimes = loopTimesMax
        //       }
        //       ele.score = ele.score * loopTimes
        //       ele.money = ele.money * loopTimes
        //     }
        //   })
        //   // 剔除积分数为0的情况
        //   scoreDeductionRules = scoreDeductionRules.filter(ele => {
        //     return ele.score > 0
        //   })
        // }

      //   that.setData({
      //     totalScoreToPay: res.data.score,
      //     isNeedLogistics: 1, //res.data.isNeedLogistics,
      //     allGoodsAndYunPrice: res.data.amountReal,
      //     yunPrice: res.data.amountLogistics,
      //     hasNoCoupons,
      //     coupons,
      //     deductionMoney: res.data.deductionMoney,
      //     couponAmount: res.data.couponAmount,
      //     scoreDeductionRules
      //   });
      //   that.data.pageIsEnd = false
      //   return;
      // }
      // that.processAfterCreateOrder(res.data)
    })
  },
  async processAfterCreateOrder(data) {
    // 直接弹出支付，取消支付的话，去订单列表

        // wx.showModal({
        //   title: '请确认支付',
        //   content: `您当前可用余额¥${balance}，仍需支付¥${data.orderAmount}`,
        //   confirmText: "确认支付",
        //   cancelText: "暂不付款",
        //   success: res2 => {
        //     if (res2.confirm) {
        //       // 使用余额支付
        //       wxpay.wxpay('order', data.orderAmount, data.id, "/pages/order-list/index");
        //     } else {
        //       wx.redirectTo({
        //         url: "/pages/order-list/index"
        //       })
        //     }
        //   }
        // })
      // }
    // } else {
      // 没余额
      wxpay.wxpay('order', data.orderAmount, data.id, "/pages/order-list/index");
    // }
  },
  addAddress: function () {
    wx.navigateTo({
      url: "/pages/address-add/index"
    })
  },
  selectAddress: function () {
    wx.navigateTo({
      url: "/pages/select-address/index"
    })
  },
  cancelLogin() {
    wx.navigateBack()
  },
  async fetchShops() {
    const res = await WXAPI.fetchShops()
    if (res.code == 0) {
      let shopIndex = this.data.shopIndex
      const shopInfo = wx.getStorageSync('shopInfo')
      if (shopInfo) {
        shopIndex = res.data.findIndex(ele => {
          return ele.id == shopInfo.id
        })
      }
      this.setData({
        shops: res.data,
        shopIndex
      })
    }
  },
  shopSelect(e) {
    this.setData({
      shopIndex: e.detail.value
    })
  },
  goMap() {
    const _this = this
    const shop = this.data.shops[this.data.shopIndex]
    const latitude = shop.latitude
    const longitude = shop.longitude
    wx.openLocation({
      latitude,
      longitude,
      scale: 18
    })
  },
  calltelephone() {
    const shop = this.data.shops[this.data.shopIndex]
    wx.makePhoneCall({
      phoneNumber: shop.linkPhone,
    })
  },
  async getUserApiInfo() {
    const res = await WXAPI.userDetail(wx.getStorageSync('token'))
    if (res.code == 0) {
      this.setData({
        bindtelephoneStatus: res.data.mobile ? 1 : 2, // 账户绑定的手机号码状态
        telephone: res.data.mobile,
      })
    }
  },
  async getPhoneNumber(e) {
    if (!e.detail.errMsg || e.detail.errMsg != "getPhoneNumber:ok") {
      wx.showToast({
        title: e.detail.errMsg,
        icon: 'none'
      })
      return;
    }
    const res = await WXAPI.bindMobileWxapp(this.data.code, e.detail.encryptedData, e.detail.iv)
    AUTH.wxaCode().then(code => {
      this.data.code = code
    })
    if (res.code == 0) {
      wx.setStorageSync('userInfo', res.data)
      this.setData({
        bindtelephoneStatus: res.data.mobile ? 1 : 2, // 账户绑定的手机号码状态
        telephone: res.data.mobile,
      })
    } else {
      wx.showToast({
        title: res.msg,
        icon: 'none'
      })
    }
  }
})