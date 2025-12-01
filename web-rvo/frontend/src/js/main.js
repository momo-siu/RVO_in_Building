import axios from 'axios'
// import global from '../\\Configure\\GlobalPage.vue'
import * as echarts from 'echarts';
import * as XLSX from 'xlsx'
import saveAs from 'file-saver'
// import Heatmap from 'heatmap.js';
import simpleheat from 'simpleheat';
import html2canvas from 'html2canvas' 
// import { Statistic } from 'element-ui';

// import heatmap from 'heatmap.js';

  const restweburl = window.config.baseURL;
  const wsip = window.config.ws;
  // alert(restweburl);    

  export default {
    data() {
      return {
        TID:0,//软件总状态
        /**
         * -1:未连接服务器
         * 0:默认
         * 1:选中房间
         * 2:拖动房间
         * 3:拖动房间内元素
         * 4:拖动导航点
         * 5:新建房间
         * 6:新建导航点
         * 7:新建出口
         * 8:新建人群(将弃用)
         * 10:提交演算
         * 11:动画渲染
         * 12:光标置于房间
         * 13:房间内直线焦点(废弃)
         * 14:房间内直线焦点
         * 15:光标置于导航点
         * 16:光标置于出口
         * 17:出口选中
         * 18:背景拖动
         * 19:渲染中
         * 20:密度区域划定
         * 21:房间旋转
         */
        isDrawing:0,//是否处于渲染
        isUpdate:0,//是否处于更新

        /** 表示状态是否开始 0-未开始 1-已开始 */
        createNewRoom:0,//新建房屋
        createNewExit:0,//新建出口
        createNewLocal:0,//新建框

        numMoving:-1,//拖动房间内点的数组位置
        numMovingNav:-1,//拖动导航点的数组位置
        numMovingExit:-1,//准备删除的出口点的数组位置

        ksd:[],

        roomRule:{
            currentID:-1,
            currentViewID:-1,
            oldX:0,//房屋移动原点
            oldY:0,//房屋移动原点
            oldXBuff:0,//房屋移动原点(用于缓冲)
            oldYBuff:0,//房屋移动原点(用于缓冲)
            numLine:0,//选中的边
            temp:{
              allSpot:[],//用于人群生成的点矩阵
            },
        },

        pointsNav: [],//导航点
        pointsNavView: [],//导航点连线渲染
        backImg:[],

        rooms:[],
        exits:[],
        ks:[],

        //提交演算
        up:{
          precent:0,
          timer:null,
        },

        at1:false,

        //结果展示
        show:{
          numClip:1,//当前所在分片数
          nowTime:0,//当前时间
          totalTime:0,//总时间
          clips:[],//分片信息
          clipData:[],//缓存的clip
          showPeople:[],//待渲染的人物
          busy:0,//是否正在缓冲
          nowBusy:0,//当前是否卡顿
          isMove:0,//是否渲染时拖动
          dx:0,//平移量x
          dy:0,//平移量y,
          frameNum:0,//当前请求帧数
          sc:1,
          yx:0,
          yx2:10,
          yy:0,
          yy2:10
        },

        //缩放
        nST:{
          sT:1,
          sTX:1,
        },

        //比例尺
        bST:{
          bTX:1,
        },

        //数据备份
        backup:{
          rooms:[],
          exits:[],
          pointsNav:[],
          pointsNavView:[],
          viewInfo:null,
        },

        canvas: null,
        ctx: null,
        canvasBuffer:null,
        ctxBuffer:null, 

        canvas_heat: null,
        ctx_heat: null,

        heatmapInstance:null,
        d:null,

        //是否绘制
        // isDrawing: false,
        // isDragging: false,//绘制时是否

        
        viewInfo:{
          isViewRoom:true,
          isViewNav:true,
          isViewPeos:true,
          isViewHeat:false,
          isViewRoomId:true,
          isViewExportId:true,
          isViewRoomName:true,
          isViewExportName:true,
          isViewBorder:true,
          isViewImg :true,

          sT:0,//比例尺显示
          scale:0,//真实比例差距(1:?)
          imgX0:0,
          imgX1:0,
          imgY0:0,
          imgY1:0,
          fontSize:20,
        },
        copyT:-1,
        myImg:new Image(),
        color: 'rgba(19, 206, 102, 0.8)',
        dialogVisible_attr:false,
        dialogVisible_attr_2:false,

        navEdit:{
          active:false,
          showPoints:false,
          selectedIndex:-1,
          prevViewNav:false,
        },

        drawConfig:[
          {element:"房间墙壁",r:1,state:true,default:1,color:'rgb(0,0,0)'},
          {element:"墙壁交点",r:1,state:true,default:1,color:'rgb(0,0,0)'},
          {element:"人口点",r:1,state:false,default:1,color:''},
          {element:"导航点",r:5,state:true,default:5,color:'rgb(255,0,0)'},
          {element:"导航线",r:1,state:true,default:1,color:'rgb(180,20,20)'},
          {element:"房间颜色",r:1,state:true,default:1,color:'rgb(180,20,20)'}],

        data: [
          { x: 471, y: 277, value: 25 },
          { x: 438, y: 375, value: 97 },
          { x: 373, y: 19, value: 71 },
          { x: 473, y: 42, value: 63 },
          { x: 463, y: 95, value: 97 },
          { x: 590, y: 437, value: 34 },
          { x: 377, y: 442, value: 66 },
          { x: 171, y: 254, value: 20 },
          { x: 6, y: 582, value: 64 },
          { x: 387, y: 477, value: 14 },
          { x: 300, y: 300, value: 80 },
          { x: 40, y: 40, value: 18 },
          { x: 80, y: 40, value: 19 },
        ],
          defaultColorStops: {
            0: "#0ff",
            0.2: "#0f0",
            0.4: "#ff0",
            1: "#f00",
          },
          // 图例
          widthPal: 20,
          heightPal: 256,
          // 热力图范围
          widthImg: 600,
          heightImg: 600,
          radius: 1, // 径向渐变半径
          // 热力图代表的最大最小值
          max: 10,
          min: 5,
          imageData: null,
          alpha: null,

          dialogVisible_attr_show:false,
          dialogVisible_attr_show_1:false,
          dialogVisible_attr_show_2:false,
          dialogVisible_attr_show_3:false,

          tabPosition:'graph',
          table_raw:[],//原始数据
          table_raw_label:[],//原始数据列表生成,

          typeChoose:'介绍',

          socketState:0,
          dialogVisible:false,

          xg:{
            name:"",
            description:"",
            addr:"",
          },
          xgname:"",
          xgdescription:"",
          xgaddr:"",
          throttle:false,
          tsty:"z-index:10;position:absolute;top:0;width: 1526px; height: 598px;",

          isValid:false,

          d5:[2,3,4,5,6],

          dat:'',
          dialogVisible_2:false,
          dialogVisible_3:false,
          radio_mode:'在线模式',

          newarea:{
            x0:0,y0:0,x1:0,y1:0,x2:0,y2:0,x3:0,y3:0,
          },

          smode:'人数',
          isEdit:false,

          statistic:false,
          totalNum:0,
      };

      //解决人物错位问题
      
      
    },

    //创建时初始化
    created(){
      document.title='复杂建筑行人疏散模拟程序'; 
          const loading = this.$loading({
            lock: true,
            text: '正在连接服务器',
            spinner: 'el-icon-loading',
            background: 'rgba(0, 0, 0, 0.7)',
          });
          var url = restweburl + 'getBlueprint';
          var params = new URLSearchParams();
          params.append('bID',this.$route.params.bID);
          axios.post(url,params)
          .then((res) => {
            //首次打开项目
            if(res.data.data==null){
              this.$notify({
                title: '成功',
                message: '正在初始化项目，请稍等',
                type: 'success'
              });
              //获取比例尺
              var url = restweburl + 'getSize';
              axios({
                  url: url,
                  method: "post",
                  data:{
                      bID:this.$route.params.bID,
                  }
              })
              .then((res) => {
                  if(res.data.msg==='success'){
                      //比例尺更新
                      if(res.data.data.width<res.data.data.height){
                        this.bST.bTX=res.data.data.height/this.canvas.height;
                        this.viewInfo.sT=this.bST.bTX*70;
                        this.viewInfo.imgX0=(this.canvas.width-res.data.data.width/this.bST.bTX)/2;
                        this.viewInfo.imgX1=this.viewInfo.imgX0+res.data.data.width/this.bST.bTX;
                        this.viewInfo.imgY0=0;
                        this.viewInfo.imgY1=this.canvas.height;
                      }
                      else{
                        this.viewInfo.scale=res.data.data.width/this.canvas.width;
                        this.bST.bTX=res.data.data.width/this.canvas.width;
                        this.viewInfo.sT=this.bST.bTX*70;
                        this.viewInfo.imgX0=0;
                        this.viewInfo.imgX1=this.canvas.width;
                        this.viewInfo.imgY0=(this.canvas.height-res.data.data.height/this.bST.bTX)/2;
                        this.viewInfo.imgY1=this.viewInfo.imgY0+res.data.data.height/this.bST.bTX;
                      }
                      this.draw();
                      //底图加载
                      url = restweburl + 'getBackground';
                      axios({
                          url: url,
                          method: "post",
                          data:{
                              bID:this.$route.params.bID,
                          }
                      })
                      .then((res) => {
                          if(res.data.msg==='success'){
                              this.myImg.src =  restweburl+res.data.data;
                              this.myImg.onload=()=>
                              {
                                this.ctxBuffer.drawImage(this.myImg, this.viewInfo.imgX0, this.viewInfo.imgY0, this.viewInfo.imgX1-this.viewInfo.imgX0, this.viewInfo.imgY1-this.viewInfo.imgY0);
                                this.draw();
                                this.save();
                                setTimeout(() => {
                                  loading.close();
                                  this.draw();
                                  location.reload();
                                }, 3000);
                              }
                          }
                          else{
                              this.$notify({
                                  title: '注意',
                                  message: res.data.msg,
                                  type: 'warning',
                                  offset: 100
                              });
                              this.isUpdate=0;
                          }
                      }).catch((error) =>{
                        this.$notify.error({
                            title: '错误',
                            message: error,
                            duration: 0,
                            offset: 100
                        });
                      });
                  }
                  else{
                      this.$notify({
                          title: '注意',
                          message: res.data.msg,
                          type: 'warning',
                          offset: 100
                      });
                      this.isUpdate=0;
                  }

              }).catch((error) =>{
                this.$notify.error({
                    title: '错误',
                    message: error,
                    duration: 0,
                    offset: 100
                });
              });
              
              return;
            }

            //正常加载
            //底图加载
            url = restweburl + 'getBackground';
            axios({
                url: url,
                method: "post",
                data:{
                    bID:this.$route.params.bID,
                }
            })
            .then((res) => {
                if(res.data.msg==='success'){
                    this.myImg.src =  restweburl+res.data.data;
                    this.myImg.onload=()=>
                    {
                      this.ctxBuffer.drawImage(this.myImg, this.viewInfo.imgX0, this.viewInfo.imgY0, this.viewInfo.imgX1-this.viewInfo.imgX0, this.viewInfo.imgY1-this.viewInfo.imgY0);
                      setTimeout(() => {
                        loading.close();
                        this.draw();
                      }, 2000);
                    }
                }
                else{
                    this.$notify({
                        title: '注意',
                        message: res.data.msg,
                        type: 'warning',
                        offset: 100
                    });
                    this.isUpdate=0;
                }
            }).catch((error) =>{
              this.$notify.error({
                  title: '错误',
                  message: error,
                  duration: 0,
                  offset: 100
              });
            });
            //其余信息加载
            this.pointsNav= res.data.data.pointsNav;//导航点
            this.pointsNavView= res.data.data.pointsNavView;//导航点
            this.exits= res.data.data.exits;//门点
            this.rooms=res.data.data.rooms;
            this.viewInfo= res.data.data.viewInfo;
            this.drawConfig= res.data.data.drawConfig;
            this.drawConfig[2].state=false;
            this.drawConfig_color= res.data.data.drawConfig_color;
            this.nST = res.data.data.nST;
            this.bST = res.data.data.bST;
            if(res.data.data.ks!=undefined){
              this.ks = res.data.data.ks;
            }
            // this.show = res.data.data.show;
            
          }).catch((error)=>{
            this.$notify.error({
              title: '错误',
              message: error,
              duration:0,
            });
          });
          
          
    },
    watch:{
      'viewInfo.isViewRoom'(){
        this.draw();
      },
      'viewInfo.isViewNav'(){
        this.draw();
      },
      'viewInfo.isViewPeos'(){
        this.draw();
      },
      'navEdit.showPoints'(val){
        if(this.navEdit.active){
          if(val && !this.viewInfo.isViewNav){
            this.viewInfo.isViewNav = true;
          } else if(!val && this.viewInfo.isViewNav){
            this.viewInfo.isViewNav = false;
          }
          this.draw();
        }
      }
    },
    mounted() {
      this.canvas = this.$refs.canvas;  
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';

      this.canvasBuffer = document.createElement("canvas"); 
      this.ctxBuffer = this.canvasBuffer.getContext('2d');

      this.canvas_heat = document.getElementById("heatmap"); 
      this.ctx_heat = this.canvas_heat.getContext('2d');

      this.ctxBuffer.imageSmoothingEnabled = true;
      this.ctxBuffer.imageSmoothingQuality = 'high';

      this.canvas.addEventListener('mousedown', this.handleMouseDown);
      this.canvas.addEventListener('dblclick', this.handleDbMouseDown);
      this.canvas.addEventListener('mouseup', this.handleMouseUp);
      this.canvas.addEventListener('mousemove', this.handleMouseMove);
      this.canvas.addEventListener('contextmenu', this.handleContextMenu);

      window.addEventListener('keydown', this.handleKey);

      window.addEventListener('keydown', this.saveContent)
      window.addEventListener('copy', this.handleCopy);
      window.addEventListener('paste', this.handlePaste);
      window.addEventListener('resize', this.resize)
      this.canvas.addEventListener("mousewheel", this.handleScroll, true);

      this.initCanvasSize();
      this.refresh();
      window.requestAnimationFrame(this.refresh);

      this.heatmapInstance  = simpleheat(document.getElementById("heatmap"));

      window.addEventListener('wheel', this.handleMouseWheel, {
        passive: false,
      })
      // 禁止鼠标右键
      window.oncontextmenu = function () { return false; };
    },

    methods: {
      startNavEdit(){
        if(!this.navEdit.active){
          this.navEdit.active = true;
          this.navEdit.prevViewNav = this.viewInfo.isViewNav;
        }
        this.setNavSelection(-1);
        this.navEdit.showPoints = true;
        this.viewInfo.isViewNav = true;
        this.TID = 6;
        this.draw();
      },
      finishNavEdit(){
        if(!this.navEdit.active){
          this.viewInfo.isViewNav = this.navEdit.prevViewNav;
          this.draw();
          return;
        }
        this.navEdit.active = false;
        this.navEdit.showPoints = false;
        this.viewInfo.isViewNav = this.navEdit.prevViewNav;
        this.setNavSelection(-1);
        this.TID = 0;
        this.draw();
      },
      deleteSelectedNavPoint(){
        if(!this.navEdit.active){
          return;
        }
        const index = this.navEdit.selectedIndex;
        if(index < 0 || index >= this.pointsNav.length){
          return;
        }
        this.pointsNav.splice(index,1);
        this.setNavSelection(-1);
        this.updateNav(false);
        this.draw();
      },
      setNavSelection(index){
        this.numMovingNav = index;
        if(this.navEdit.active){
          this.navEdit.selectedIndex = index;
        }
      },
      calc(){
        this.totalNum=0;
        for(let i=0;i<this.rooms.length;i++){
          this.totalNum+=this.rooms[i].peos.length;
        }
      },
      oninput(){
        this.$forceUpdate();
      },
      clearK(){
        this.ks=[];
      },
      densityCommit(){
        this.ksd=[];
        this.at1=true;
        let url = restweburl+'addRect';
        let inp={bID:this.$route.params.bID,
        imgX0:this.viewInfo.imgX0,
        imgX1:this.viewInfo.imgX1,
        imgY0:this.viewInfo.imgY0,
        imgY1:this.viewInfo.imgY1,
        rect:[]};
        for(let i =0;i<this.ks.length;i++){
          inp.rect.push({
            begin:parseFloat(this.ks[i].attr.startTime),
            end:parseFloat(this.ks[i].attr.endTime),
            x0:this.ks[i].area.x0,
            y0:this.ks[i].area.y0,
            x1:this.ks[i].area.x1,
            y1:this.ks[i].area.y0,
            x2:this.ks[i].area.x1,
            y2:this.ks[i].area.x1,
            x3:this.ks[i].area.x0,
            y3:this.ks[i].area.y1,
          });
        }
        
        axios({
          url: url,
          method: "post",
          data:inp
        }).then((res) => {
            //成功修改
            if(res.data.msg=="success"){
                let url = restweburl+'getDensity';
                axios({
                  url: url,
                  method: "post",
                  data:{bID:this.$route.params.bID}
                }).then((res) => {
                  this.ksd=[];
                  for(let i = 0;i<res.data.data.length;i++){
                    this.ksd.push({value:res.data.data[i]});
                  }
                  this.at1=false;
                }).catch(()=>{
                  this.$notify.error({
                    title: '错误',
                    message: '错误',
                    duration:0,
                  });
                });
            }
            else{
                this.$notify.error({
                    title: '错误',
                    message: '错误',
                    duration:0,
                });
            }
        }).catch(()=>{
          this.$notify.error({
            title: '错误',
            message: '错误',
            duration:0,
          });
        });
      },
      isChineseChar(char) {
        const reg = /[\u3400-\u4dbf\u4e00-\u9fff]/;
        return reg.test(char);
      },
      cal_font_len(str){
        let len=0;
        for(let i=0;i<str.length;i++){
          if(this.isChineseChar(str[i])){len+=1;}
          else{len+=0.5;}
        }
        return len;
      },
      download(){
        window.open(restweburl+'source/'+this.$route.params.bID+'/result-json.rvo', '_blank');
      },
      readLocal(){
        const reader = new FileReader();
        reader.onload = function(e) {
          const content = e.target.result;
          document.getElementById('fileContent').textContent = content;
        };

      },
      te(){
        this.TID=11;
        this.show.clipData=[];
      },
      //自适应框架
      resize(){
          this.canvas.width = window.innerWidth-10;
          this.canvas.height = window.innerHeight-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
  
          this.canvasBuffer.width = window.innerWidth-10;
          this.canvasBuffer.height = window.innerHeight-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
  
          this.canvas_heat.width = window.innerWidth-10;
          this.canvas_heat.height = window.innerHeight-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
          this.widthImg = window.innerWidth-10;
          this.heightImg = window.innerHeight-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
  
          this.viewInfo.baseX1=window.innerWidth-10;
          this.viewInfo.baseY1=window.innerHeight-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
          
          this.viewInfo.width=window.innerWidth-10;
          this.viewInfo.height=window.innerHeight-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
          this.draw();
      },
      changeProject(){
        let formdata = new FormData();
        formdata.append('bID', this.$route.params.bID);
        formdata.append('name', this.xg.name);
        formdata.append('description', this.xg.description);
        formdata.append('addr', this.xg.addr);
        axios({
            url: restweburl+'updateBlueprint',
            method: 'post',
            data:formdata
        }).then((res) => {
            //成功修改
            if(res.data.msg=="success"){
                this.loading=false;
                this.dialogVisible = false;
                this.$notify({
                    title: '成功',
                    message: '修改项目成功',
                    type: 'success'
                });
            }
            else{
                this.$notify.error({
                    title: '错误',
                    message: '修改失败',
                    duration:0,
                });
            }
        }).catch(()=>{
          this.$notify.error({
            title: '错误',
            message: '修改失败',
            duration:0,
          });
        });
      },
      handleFullScreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        }
        // alert(document.fullscreenElement)
        // this.canvas = this.$refs.canvas;  
        // this.ctx = this.canvas.getContext('2d');
        // this.ctx.imageSmoothingEnabled = true;
        // this.ctx.imageSmoothingQuality = 'high';
  
        // this.canvasBuffer = document.createElement("canvas"); 
        // this.ctxBuffer = this.canvasBuffer.getContext('2d');
  
        // this.canvas_heat = document.createElement("canvas"); 
        // this.ctx_heat = this.canvas_heat.getContext('2d');
  
        // this.ctxBuffer.imageSmoothingEnabled = true;
        // this.ctxBuffer.imageSmoothingQuality = 'high';
        
        // this.initCanvasSizeFull();
        // this.refresh();
      },
      handleClose(){
        window.close();
      },
      handleMouseWheel(e) {
        if (!window.scrollY) {
          // 禁止页面滚动
          e.preventDefault()
        }
      },
      initWebSocket(){
        this.socket = new WebSocket(wsip+this.$route.params.bID);
        // 监听socket连接
        this.socket.onopen = this.open;
        // 监听socket错误信息
        this.socket.onerror = this.error;
        // 监听socket消息
        this.socket.onmessage = this.getMessage;
      },
      open(){
        // alert("socket连接成功");
      },
      error(){
        this.$notify.error({
          title: '错误',
          message: 'socket连接失败，请稍后重试',
          duration:0,
        });
        // this.TID=0;
      },
      getMessage(msg){
        // alert(msg.data);
        console.log(msg.data);
        let data=JSON.parse(msg.data);
        this.show.clipData.push(data);
        console.log("222",this.show.clipData);
        this.socketState=0;
      },
      sendSocket(msg){
        // this.socket.send(msg);
        this.socket.send(JSON.stringify(msg));
      },
        drawHeatMap() {          
          // 配置参数
          if(this.show.nowTime/10>=this.data.length){return;}
          // var data = {
          //   data: this.data[Math.floor(this.show.nowTime/10)],
          // };data
          // this.heatmapInstance.max(1);
          // var data = [this.data[Math.floor(this.show.nowTime/10)][0]];
          this.heatmapInstance.max(15);
          this.heatmapInstance.resize();
          var data=[];
          for(let i=0;i<this.data[Math.floor(this.show.nowTime/10)].length;i++){
            var temp=[];
            temp.push(this.data[Math.floor(this.show.nowTime/10)][i].x);
            temp.push(this.data[Math.floor(this.show.nowTime/10)][i].y);
            temp.push(this.data[Math.floor(this.show.nowTime/10)][i].value);
            data.push(temp);
          }
          console.log(data)
          // alert(data)
          // const data = [
          //   { x: 100, y: 100, value: 1 },
          //   { x: 200, y: 300, value: 0.5 },
          //   { x: 300, y: 200, value: 0.1 },
          // ];
          this.heatmapInstance.data(data);
          this.heatmapInstance.draw();

          const startTime = new Date();
          // this.heatmapInstance.setData(data);

          // this.heatmapInstance.update();
          const endTime = new Date();
          const executionTime = endTime - startTime;executionTime
          // alert(`代码执行时间：${executionTime} 毫秒`);
        },
        exportExcel(){
          const workbook = XLSX.utils.book_new()
          const worksheet = XLSX.utils.json_to_sheet(this.table_raw)
          XLSX.utils.book_append_sheet(workbook,worksheet,'Sheet1')
          const excelData = XLSX.write(workbook,{bookType:'xlsx',type:'array'})
          const blob = new Blob([excelData],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
          saveAs(blob,'data.xlsx')
        },
    
        check(){
          this.isValid=false;
          var that = this;
          if(this.pointsNav.length==0){ 
            that.$notify({
              title: '注意',
              message: "没有导航点",
              type: 'warning',
              offset: 100
            });
            return;
          }
          
          var url = restweburl + 'getLines';
          axios({
              url: url,
              method: "post",
              data:{
                  exit:this.exits,
                  rooms:this.rooms,
                  navPos:this.pointsNav,
              }
          })
          .then(async (res) => {
              if(res.data.msg==='success'){
                  // this.pointsNavView = res.data.data.lines;
                  // this.isUpdate=0;
                  // this.draw();
                  if(res.data.data.can==true){
                    this.$notify({
                      title: '成功',
                      message: '参数校验完毕',
                      type: 'success'
                    });
                    this.isValid=true;
                  }
                  else{
                    that.$notify({
                        title: '注意',
                        message: "某个房间未连接到出口",
                        type: 'warning',
                        offset: 100
                    });
                    // this.isUpdate=0;
                  }
              }
              else{
                  that.$notify({
                      title: '注意',
                      message: res.data.msg,
                      type: 'warning',
                      offset: 100
                  });
                  // this.isUpdate=0;
              }
          }).catch((error) =>{
              this.$notify.error({
                  title: '错误',
                  message: error,
                  duration: 0,
                  offset: 100
              });
              // this.isUpdate=-1;
          });
        },
        selectShow(targetName){
          targetName
          //获取数据
          // var url = restweburl + 'getExportStatistics';
          // axios({
          //     url: url,
          //     method: "post",
          //     data:{
          //       bID:this.$route.params.bID,
          //     }
          // })
          // .then(async (res) => {
          //     if(res.data.msg==='success'){
          //       if(this.tabPosition=='graph'){
          //         // 基于准备好的dom，初始化echarts实例
          //         var myChart;
          //         myChart = echarts.init(document.getElementById(targetName.label));
          //         // 绘制图表
          //         var dat = {
          //           title: {
          //             text: targetName.label
          //           },
          //           tooltip: {},
          //           xAxis: {
          //             type:'category',
          //             data: res.data.data.time
          //           },
          //           yAxis: {
          //             type:'value',
          //             scale:true,
          //           },
          //           legend: {
          //             data: []
          //           },
          //           series: [],
          //           toolbox: {
          //               show: true,
          //               feature: {
          //                   mark: {show: true},
          //                   saveAsImage: {show: true},
          //               }
          //           },

          //         };

          //         //图表数据载入
          //         for(let i=0;i<res.data.data.exits.length;i++){
          //           // alert(res.data.data.exits[i].name)
          //           dat.legend.data.push(res.data.data.exits[i].name);
          //         }
          //         for(let i=0;i<res.data.data.exits.length;i++){
          //           dat.series.push({name:res.data.data.exits[i].name,type:'line',data:res.data.data.exits[i].data});
          //         }
          //         myChart.setOption(dat);
          //       }
          //       else if(this.tabPosition=='data'){
          //         this.table_raw=[];this.table_raw_label=[];
          //         //原始数据载入
          //         for(let i=0;i<res.data.data.exits.length;i++){
          //           this.table_raw_label.push({label:res.data.data.exits[i].name,prop:res.data.data.exits[i].name});
          //         }
          //         let dat_2=[];
          //         for(let i=0;i<res.data.data.time.length;i++){
          //           let dat_3={};
          //           for(let j=0;j<res.data.data.exits.length;j++){
          //             dat_3[res.data.data.exits[j].name]=res.data.data.exits[j].data[i];
          //           }
          //           dat_2.push(dat_3);
          //         }
          //         this.table_raw=dat_2;
          //       }
          //     }
          //     else{
          //         this.$notify({
          //             title: '注意',
          //             message: res.data.msg,
          //             type: 'warning',
          //             offset: 100
          //         });
          //         this.isUpdate=0;
          //     }
          // }).catch((error) =>{
          //     this.$notify.error({
          //         title: '错误',
          //         message: error,
          //         duration: 0,
          //         offset: 100
          //     });
          //     this.isUpdate=-1;
          // });
        },
        agreeChange(val){
          let that = this 
          this.initShow();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow();
          }
        },
        agreeChange_2(val){
          let that = this 
          this.initShow_2();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_2();
          }
        },
        agreeChange_3(val){
          alert(2)
          let that = this 
          this.initShow_3();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_3();
          }
        },
        initShow(){
          //获取数据
          var url = restweburl + 'getExportStatistics';
          axios({
              url: url,
              method: "post",
              data:{
                bID:this.$route.params.bID,
              }
          })
          .then(async (res) => {
              if(res.data.msg==='success'){
                if(this.tabPosition=='graph'){
                  // 基于准备好的dom，初始化echarts实例
                  var myChart;
                  myChart = echarts.init(document.getElementById('撤离人数-时间'));
                  // 绘制图表
                  var dat = {
                    title: {
                      text: '撤离人数-时间'
                    },
                    tooltip: {},
                    xAxis: {
                      type:'category',
                      data: res.data.data.time
                    },
                    yAxis: {
                      type:'value',
                      scale:true,
                    },
                    legend: {
                      data: []
                    },
                    series: [],
                    toolbox: {
                        show: true,
                        feature: {
                            mark: {show: true},
                            saveAsImage: {show: true},
                        }
                    },

                  };

                  //图表数据载入
                  for(let i=0;i<res.data.data.exits.length;i++){
                    // alert(res.data.data.exits[i].name)
                    dat.legend.data.push(res.data.data.exits[i].name);
                  }
                  for(let i=0;i<res.data.data.exits.length;i++){
                    dat.series.push({name:res.data.data.exits[i].name,type:'line',data:res.data.data.exits[i].data});
                  }
                  myChart.setOption(dat);
                }
                else if(this.tabPosition=='data'){
                  this.table_raw=[];this.table_raw_label=[];
                  //原始数据载入
                  for(let i=0;i<res.data.data.exits.length;i++){
                    this.table_raw_label.push({label:res.data.data.exits[i].name,prop:res.data.data.exits[i].name});
                  }
                  let dat_2=[];
                  for(let i=0;i<res.data.data.time.length;i++){
                    let dat_3={};
                    for(let j=0;j<res.data.data.exits.length;j++){
                      dat_3[res.data.data.exits[j].name]=res.data.data.exits[j].data[i];
                    }
                    dat_2.push(dat_3);
                  }
                  this.table_raw=dat_2;
                }
              }
              else{
                  this.$notify({
                      title: '注意',
                      message: res.data.msg,
                      type: 'warning',
                      offset: 100
                  });
                  this.isUpdate=0;
              }
          }).catch((error) =>{
              this.$notify.error({
                  title: '错误',
                  message: error,
                  duration: 0,
                  offset: 100
              });
              this.isUpdate=-1;
          });
        },
        initShow_2(){
          //获取数据
          var url = restweburl + 'getGRD';
          axios({
              url: url,
              method: "post",
              data:{
                bID:this.$route.params.bID,
              }
          })
          .then(async (res) => {
              if(res.data.msg==='success'){
                if(this.tabPosition=='graph'){
                  // 基于准备好的dom，初始化echarts实例
                  var myChart;
                  myChart = echarts.init(document.getElementById('受照剂量-时间'));
                  // 绘制图表
                  var dat = {
                    title: {
                      text: '受照剂量-时间'
                    },
                    tooltip: {},
                    xAxis: {
                      type:'category',
                      data: res.data.data.time
                    },
                    yAxis: {
                      type:'value',
                      scale:true,
                    },
                    legend: {
                      data: ['grd']
                    },
                    series: [],
                    toolbox: {
                        show: true,
                        feature: {
                            mark: {show: true},
                            saveAsImage: {show: true},
                        }
                    },
                  };

                  //图表数据载入
                  // for(let i=0;i<res.data.data.exits.length;i++){
                  //   // alert(res.data.data.exits[i].name)
                  //   dat.legend.data.push(res.data.data.exits[i].name);
                  // }
                  for(let i=0;i<res.data.data.time.length;i++){
                    dat.series.push({name:'test',type:'line',data:res.data.data.grd[i]});
                  }
                  myChart.setOption(dat);
                }
                else if(this.tabPosition=='data'){
                  this.table_raw=[];this.table_raw_label=[];
                  //原始数据载入
                  for(let i=0;i<1;i++){
                    this.table_raw_label.push({label:'剂量',prop:'剂量'});
                  }
                  let dat_2=[];
                  for(let i=0;i<res.data.data.time.length;i++){
                    let dat_3={};
                    for(let j=0;j<res.data.data.time.length;j++){
                      dat_3['剂量']=res.data.data.grd[j];
                    }
                    dat_2.push(dat_3);
                  }
                  this.table_raw=dat_2;
                }
              }
              else{
                  this.$notify({
                      title: '注意',
                      message: res.data.msg,
                      type: 'warning',
                      offset: 100
                  });
                  this.isUpdate=0;
              }
          }).catch((error) =>{
              this.$notify.error({
                  title: '错误',
                  message: error,
                  duration: 0,
                  offset: 100
              });
              this.isUpdate=-1;
          });
        },
        initShow_3(){
          alert(2)
          //获取数据
          var url = restweburl + 'getDensity';
          axios({
              url: url,
              method: "post",
              data:{
                bID:this.$route.params.bID,
              }
          })
          .then(async (res) => {
              if(res.data.msg==='success'){
                if(this.tabPosition=='graph'){
                  // 基于准备好的dom，初始化echarts实例
                  var myChart;
                  alert(document.getElementById('区域密度-时间'))
                  myChart = echarts.init(document.getElementById('区域密度-时间'));
                  // 绘制图表
                  var dat = {
                    title: {
                      text: '区域密度-时间'
                    },
                    tooltip: {},
                    xAxis: {
                      type:'category',
                      data: res.data.data.time
                    },
                    yAxis: {
                      type:'value',
                      scale:true,
                    },
                    legend: {
                      data: ['grd']
                    },
                    series: [],
                    toolbox: {
                        show: true,
                        feature: {
                            mark: {show: true},
                            saveAsImage: {show: true},
                        }
                    },
                  };

                  //图表数据载入
                  // for(let i=0;i<res.data.data.exits.length;i++){
                  //   // alert(res.data.data.exits[i].name)
                  //   dat.legend.data.push(res.data.data.exits[i].name);
                  // }
                  for(let i=0;i<res.data.data.time.length;i++){
                    dat.series.push({name:'test',type:'line',data:res.data.data.grd[i]});
                  }
                  myChart.setOption(dat);
                }
                else if(this.tabPosition=='data'){
                  this.table_raw=[];this.table_raw_label=[];
                  //原始数据载入
                  for(let i=0;i<1;i++){
                    this.table_raw_label.push({label:'剂量',prop:'剂量'});
                  }
                  let dat_2=[];
                  for(let i=0;i<res.data.data.time.length;i++){
                    let dat_3={};
                    for(let j=0;j<res.data.data.time.length;j++){
                      dat_3['剂量']=res.data.data.grd[j];
                    }
                    dat_2.push(dat_3);
                  }
                  this.table_raw=dat_2;
                }
              }
              else{
                  this.$notify({
                      title: '注意',
                      message: res.data.msg,
                      type: 'warning',
                      offset: 100
                  });
                  this.isUpdate=0;
              }
          }).catch((error) =>{
              this.$notify.error({
                  title: '错误',
                  message: error,
                  duration: 0,
                  offset: 100
              });
              this.isUpdate=-1;
          });
        },
        heatInit () {
          const colorStops = this.defaultColorStops;
          // 创建canvas
          const ctx = this.ctx_heat;
    
          // 创建线性渐变色
          const linearGradient = ctx.createLinearGradient(0, 0, 0, this.heightPal);
          for (const key in colorStops) {
            linearGradient.addColorStop(key, colorStops[key]);
          }
    
          // 绘制渐变色条
          ctx.fillStyle = linearGradient;
          ctx.fillRect(0, 0, this.widthPal, this.heightPal);
    
          // 读取像素数据
          this.imageData = ctx.getImageData(0, 0, 1, this.heightPal).data;
        },

        colorPicker (position) {
          return this.imageData.slice(position * 4, position * 4 + 3);
        },
        heatDraw () {
          const startTime = performance.now();
          const radius = this.radius
          const max = this.max
          const min = this.min
          let context = this.ctx_heat;
          console.log(this.show.nowTime,this.show.nowTime/10)
          if(this.show.nowTime/10>=this.data.length){
            // alert(1)
            return;
          }
          this.data[this.show.nowTime/10].forEach(point => {
            let { x, y, value } = point;
            context.beginPath();
            context.arc(x, y, radius, 0, 2 * Math.PI);
            context.closePath();
     
            // 创建渐变色: r,g,b取值比较自由，我们只关注alpha的数值
            let radialGradient = context.createRadialGradient(x, y, 0, x, y, radius);
            radialGradient.addColorStop(0.0, "rgba(0,0,0,1)");
            radialGradient.addColorStop(1.0, "rgba(0,0,0,0)");
            context.fillStyle = radialGradient;
     
            // 设置globalAlpha: 需注意取值需规范在0-1之间
            let globalAlpha = (value - min) / (max - min);
            context.globalAlpha = Math.max(Math.min(globalAlpha, 1), 0);
            // 填充颜色
            context.fill();

            let imageData = context.getImageData(0, 0, this.widthImg, this.heightImg);
            let data = imageData.data;
            for (var i = 3; i < data.length; i += 4) {
              if(data[i]==0){continue;}
              let alpha = data[i];
              data[i - 3] = this.imageData[alpha*4];
              data[i - 2] = this.imageData[alpha*4+1];
              data[i - 1] = this.imageData[alpha*4+2];
            }
            context.putImageData(imageData, 0, 0);
          });
          const endTime = performance.now();
          const duration = endTime - startTime;duration
          // alert(duration+'ms');
        },
      

        refresh(){
          setInterval(() => {
            this.buffDraw();
          }, 20)
          
        },
        buffDraw(){
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.ctx.drawImage(this.canvasBuffer,0,0);
          // window.requestAnimationFrame(this.buffDraw);
        },
        //导航连线更新
        updateNav(state){
            this.isValid=false;
            if(this.pointsNav.length==0)
              return;
            var that = this;
            this.isUpdate=1;
            var url = restweburl + 'getLines';
            axios({
                url: url,
                method: "post",
                data:{
                    exit:this.exits,
                    rooms:this.rooms,
                    navPos:this.pointsNav
                }
            })
            .then(async (res) => {
                if(res.data.msg==='success'){
                    this.pointsNavView = res.data.data.lines;
                    this.isUpdate=0;
                    this.draw();
                }
                else{
                  if(state){
                    that.$notify({
                      title: '注意',
                      message: res.data.msg,
                      type: 'warning',
                      offset: 100
                  });
                  }
                    this.isUpdate=0;
                }
            }).catch((error) =>{
              if(state){
                this.$notify.error({
                    title: '错误',
                    message: error,
                    duration: 0,
                    offset: 100
                });
              }
                this.isUpdate=-1;
              });
        },

      saveContent(e) {
        const key = window.event.keyCode ? window.event.keyCode : window.event.which
        if(this.dialogVisible_attr || this.dialogVisible_attr_2 || this.dialogVisible_3 || this.dialogVisible || this.dialogVisible_attr_show_3)return;
        e.preventDefault()
        if (key === 83 && e.ctrlKey) {
          this.save();
        }
      },

      //删除出口
      delExport(){
        this.TID=0; 
        this.exits.splice(this.numMovingExit,1);
        this.TID=0;
        this.updateNav(false);
        this.dialogVisible_3 = false;
      },

      //删除构件
      deleteRoomDot(){
        if(this.TID==1){//删除房间
            this.TID=0;
            this.rooms.splice(this.roomRule.currentID,1);
            this.updateNav(false);
        }
        if(this.TID==14){//删除房内组件
            this.rooms[this.roomRule.currentID].walls.splice(this.roomRule.numLine,0,{x:-10000,y:-10000});
        }
        //删除导航点
        if(this.TID==15){
            if(this.numMovingNav>=this.pointsNav.length)
              return;
            this.pointsNav.splice(this.numMovingNav,1);
            this.TID=0;
            this.updateNav(false);
        }
        //删除出口
        if(this.TID==17){
            this.TID=0;
            this.exits.splice(this.numMovingExit,1);
            this.TID=0;
            this.updateNav(false);
        }
        this.draw();
        this.$message({
          type: 'success',
          message: '删除成功!'
        });
    },

    //视图还原预览
    recovery(){
      this.rooms=JSON.parse(JSON.stringify(this.backup.rooms));
      this.exits=JSON.parse(JSON.stringify(this.backup.exits));
      this.pointsNav=JSON.parse(JSON.stringify(this.backup.pointsNav));
      this.pointsNavView=JSON.parse(JSON.stringify(this.backup.pointsNavView));
      this.viewInfo=JSON.parse(JSON.stringify(this.backup.viewInfo));
      this.show=JSON.parse(JSON.stringify(this.backup.show));
      this.nST=JSON.parse(JSON.stringify(this.backup.nST));
      this.bST=JSON.parse(JSON.stringify(this.backup.bST));
      
      this.show.dx=0;
      this.show.dy=0;
      this.show.nowBusy=0;

      this.show.nowTime=0;

      this.draw();
    },

    //滚轮事件
    handleScroll(e){
        if (e.deltaY < 0){
            console.log("向上滚轮");
            this.viewInfo.scale=2;
            this.scale(this.viewInfo.x,this.viewInfo.y);
        }
        else{
            console.log("向下滚轮");
            this.viewInfo.scale=0.5;
            this.scale(this.viewInfo.x,this.viewInfo.y);
        }
        if (document.documentElement && document.documentElement.scrollTop) {
          document.documentElement.scrollTop = 0
        } else if (document.body) {
          document.body.scrollTop = 0
        }
    },
    //缩放
    scale(x,y){
        if(this.viewInfo.scale>1){//放大
            if(this.nST.sTX>=32)return;
            this.show.sT/=2;
            this.nST.sT/=2;
            this.nST.sTX*=2;
            this.viewInfo.sT= this.nST.sT*this.bST.bTX*70;
        }
        else if(this.viewInfo.scale<1){//缩小
          if(this.nST.sTX<=0.25)return;
            this.show.sT*=2;
            this.nST.sT*=2;
            this.nST.sTX/=2;
            this.viewInfo.sT= this.nST.sT*this.bST.bTX*70;
        }

        //基准点
        this.viewInfo.baseX0=this.viewInfo.scale*this.viewInfo.baseX0+(1-this.viewInfo.scale)*x;
        this.viewInfo.baseY0=this.viewInfo.scale*this.viewInfo.baseY0+(1-this.viewInfo.scale)*y;
        this.viewInfo.baseX1=this.viewInfo.scale*this.viewInfo.baseX1+(1-this.viewInfo.scale)*x;
        this.viewInfo.baseY1=this.viewInfo.scale*this.viewInfo.baseY1+(1-this.viewInfo.scale)*y;

        //底图
        this.viewInfo.imgX0=this.viewInfo.scale*this.viewInfo.imgX0+(1-this.viewInfo.scale)*x;
        this.viewInfo.imgX1=this.viewInfo.scale*this.viewInfo.imgX1+(1-this.viewInfo.scale)*x;
        this.viewInfo.imgY0=this.viewInfo.scale*this.viewInfo.imgY0+(1-this.viewInfo.scale)*y;
        this.viewInfo.imgY1=this.viewInfo.scale*this.viewInfo.imgY1+(1-this.viewInfo.scale)*y;


        // 渲染时人物缩放
        if(this.TID==11 || this.TID==19){
          this.show.yx= (this.viewInfo.scale*this.show.yx+(1-this.viewInfo.scale)*x);
          this.show.yx2= (this.viewInfo.scale*this.show.yx2+(1-this.viewInfo.scale)*x);
          this.show.yy= (this.viewInfo.scale*this.show.yy+(1-this.viewInfo.scale)*y);
          this.show.yy2= (this.viewInfo.scale*this.show.yy2+(1-this.viewInfo.scale)*y);
        }

        //渲染时  
        //热力图
        for(let i=0;i<this.data.length;i++){
          for(let j=0;j<this.data[i].length;j++){
            this.data[i][j].x=(this.viewInfo.scale*this.data[i][j].x+(1-this.viewInfo.scale)*x);
            this.data[i][j].y=(this.viewInfo.scale*this.data[i][j].y+(1-this.viewInfo.scale)*y);
            if(this.data[i][j].radius==undefined){this.data[i][j].radius=40;}
            this.data[i][j].radius=this.viewInfo.scale*this.data[i][j].radius;
          }
        }
        this.drawHeatMap();
        
        //房间
        for(let i=0;i<this.rooms.length;i++){
            //墙壁
            for(let j=0;j<this.rooms[i].walls.length;j++){
            if(this.rooms[i].walls[j].x===-10000){
                continue;
            }
            this.rooms[i].walls[j].x= (this.viewInfo.scale*this.rooms[i].walls[j].x+(1-this.viewInfo.scale)*x);
            this.rooms[i].walls[j].y= (this.viewInfo.scale*this.rooms[i].walls[j].y+(1-this.viewInfo.scale)*y);
            }

            //人群
            for(let j=0;j<this.rooms[i].peos.length;j++){
            this.rooms[i].peos[j].x= (this.viewInfo.scale*this.rooms[i].peos[j].x+(1-this.viewInfo.scale)*x);
            this.rooms[i].peos[j].y= (this.viewInfo.scale*this.rooms[i].peos[j].y+(1-this.viewInfo.scale)*y);
            }

            //属性
            this.rooms[i].lca.X0= (this.viewInfo.scale*this.rooms[i].lca.X0+(1-this.viewInfo.scale)*x);
            this.rooms[i].lca.Y0= (this.viewInfo.scale*this.rooms[i].lca.Y0+(1-this.viewInfo.scale)*y);
            this.rooms[i].lca.X1= (this.viewInfo.scale*this.rooms[i].lca.X1+(1-this.viewInfo.scale)*x);
            this.rooms[i].lca.Y1= (this.viewInfo.scale*this.rooms[i].lca.Y1+(1-this.viewInfo.scale)*y);
            this.rooms[i].lca.Xm= (this.viewInfo.scale*this.rooms[i].lca.Xm+(1-this.viewInfo.scale)*x);
            this.rooms[i].lca.Ym= (this.viewInfo.scale*this.rooms[i].lca.Ym+(1-this.viewInfo.scale)*y);
        }

        //选定框
        for(let i=0;i<this.ks.length;i++){
          this.ks[i].area.x0=(this.viewInfo.scale*this.ks[i].area.x0+(1-this.viewInfo.scale)*x);
          this.ks[i].area.x1=(this.viewInfo.scale*this.ks[i].area.x1+(1-this.viewInfo.scale)*x);
          this.ks[i].area.y0=(this.viewInfo.scale*this.ks[i].area.y0+(1-this.viewInfo.scale)*y);
          this.ks[i].area.y1=(this.viewInfo.scale*this.ks[i].area.y1+(1-this.viewInfo.scale)*y);
        }

        //导航点
        for(let i=0;i<this.pointsNav.length;i++){
            this.pointsNav[i].x=this.viewInfo.scale*this.pointsNav[i].x+(1-this.viewInfo.scale)*x;
            this.pointsNav[i].y=this.viewInfo.scale*this.pointsNav[i].y+(1-this.viewInfo.scale)*y;
        }
        for(let i=0;i<this.pointsNavView.length;i++){
            this.pointsNavView[i].x=this.viewInfo.scale*this.pointsNavView[i].x+(1-this.viewInfo.scale)*x;
            this.pointsNavView[i].y=this.viewInfo.scale*this.pointsNavView[i].y+(1-this.viewInfo.scale)*y;
        }

        //出口
        for(let i=0;i<this.exits.length;i++){
            this.exits[i].x0=this.viewInfo.scale*this.exits[i].x0+(1-this.viewInfo.scale)*x;
            this.exits[i].x1=this.viewInfo.scale*this.exits[i].x1+(1-this.viewInfo.scale)*x;
            this.exits[i].x2=this.viewInfo.scale*this.exits[i].x2+(1-this.viewInfo.scale)*x;
            this.exits[i].x3=this.viewInfo.scale*this.exits[i].x3+(1-this.viewInfo.scale)*x;
            this.exits[i].y0=this.viewInfo.scale*this.exits[i].y0+(1-this.viewInfo.scale)*y;
            this.exits[i].y1=this.viewInfo.scale*this.exits[i].y1+(1-this.viewInfo.scale)*y;
            this.exits[i].y2=this.viewInfo.scale*this.exits[i].y2+(1-this.viewInfo.scale)*y;
            this.exits[i].y3=this.viewInfo.scale*this.exits[i].y3+(1-this.viewInfo.scale)*y;
        }
        this.draw();
    },

    //删除房间2
    delRoom(){
      console.log(222); 
      this.$confirm('此操作将永久删除该组件, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        if(this.TID==1){//删除房间
            this.TID=0;
            this.rooms.splice(this.roomRule.currentID,1);
            this.updateNav(false);
            this.$message({
              message: '删除房间成功',
              type: 'success'
            });
        }
        else{
          this.$message({
            showClose: true,
            message: '删除失败，请重试',
            type: 'warning'
          });
        }
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    },
      //渲染房间单元人群
      drawRoomPeo(){
        for(let k=this.rooms[this.roomRule.currentID].lca.X0;k<this.rooms[this.roomRule.currentID].lca.X1;k++){
            
            for(let l=this.rooms[this.roomRule.currentID].lca.Y0;l<this.rooms[this.roomRule.currentID].lca.Y1;l++){
                var flag=true;
                let i=this.roomRule.currentID;
                let num=0;
                for(let j=1;j<this.rooms[i].walls.length+1;j++){
                  let x1=this.rooms[i].walls[j-1].x;
                  let y1=this.rooms[i].walls[j-1].y;
                  let x2=0;
                  let y2=0;
                  if(j==this.rooms[i].walls.length){
                    x2=this.rooms[i].walls[0].x;
                    y2=this.rooms[i].walls[0].y;
                  }
                  else{
                    x2=this.rooms[i].walls[j].x;
                    y2=this.rooms[i].walls[j].y;
                    while(this.rooms[i].walls[j].x==-10000){
                      j++;
                      x2=this.rooms[i].walls[j].x;
                      y2=this.rooms[i].walls[j].y;
                    }
                  }
                  
                  let l1={x1:0,y1:0,x2:k,y2:l};
                  let l2={
                    x1:x1,
                    y1:y1,
                    x2:x2,
                    y2:y2
                  };
                    let x1_=k-l2.x1;
                    let y1_=l-l2.y1;
                    // let a=(x1_,y1_);

                    let x2_=l2.x1-l2.x2;
                    let y2_=l2.y1-l2.y2;
                    // let b=(x2_,y2_);
                    
                    let d=(x1_*y2_-x2_*y1_)/Math.sqrt(x2_*x2_+y2_*y2_);
                    if(d<8&& d>-8) flag=false;
  
                    //快速排斥实验
                    if ((l1.x1 > l1.x2 ? l1.x1 : l1.x2) < (l2.x1 < l2.x2 ? l2.x1 : l2.x2) ||
                        (l1.y1 > l1.y2 ? l1.y1 : l1.y2) < (l2.y1 < l2.y2 ? l2.y1 : l2.y2) ||
                        (l2.x1 > l2.x2 ? l2.x1 : l2.x2) < (l1.x1 < l1.x2 ? l1.x1 : l1.x2) ||
                        (l2.y1 > l2.y2 ? l2.y1 : l2.y2) < (l1.y1 < l1.y2 ? l1.y1 : l1.y2))
                    {
                      continue;
                    }
                    //跨立实验
                    if ((((l1.x1 - l2.x1)*(l2.y2 - l2.y1) - (l1.y1 - l2.y1)*(l2.x2 - l2.x1))*
                        ((l1.x2 - l2.x1)*(l2.y2 - l2.y1) - (l1.y2 - l2.y1)*(l2.x2 - l2.x1))) > 0 ||
                        (((l2.x1 - l1.x1)*(l1.y2 - l1.y1) - (l2.y1 - l1.y1)*(l1.x2 - l1.x1))*
                        ((l2.x2 - l1.x1)*(l1.y2 - l1.y1) - (l2.y2 - l1.y1)*(l1.x2 - l1.x1))) > 0)
                    {
                      continue;
                    }
                    
                    num+=1;
                }
                if(num%2==1 && flag==true){//奇数在内
                  this.roomRule.temp.allSpot.push({x:k,y:l});
                }
              
            }
        }
        if(this.rooms[this.roomRule.currentID].peos.length===this.rooms[this.roomRule.currentID].attr.peoNum)
            return;
        let result=[];
        for(let i=0;i<this.rooms[this.roomRule.currentID].attr.peoNum;i++){
            let num = Math.ceil(Math.random()*(this.roomRule.temp.allSpot.length));
            result.push({id:this.totalPeoNum,x:this.roomRule.temp.allSpot[num].x,y:this.roomRule.temp.allSpot[num].y});
            this.totalPeoNum+=1;
        }
        console.log("添加成功");
        this.rooms[this.roomRule.currentID].peos=result;
        console.log(this.rooms[this.roomRule.currentID]);
        this.rooms[this.roomRule.currentID].attr.peoNum=this.rooms[this.roomRule.currentID].peos.length;
        this.draw();
      },

      //双击事件
      handleDbMouseDown(){
        //双击房间
        if(this.TID==1){
            this.dialogVisible_attr=true;
            //初始化点矩阵
            let temp=[];
            this.roomRule.temp.allSpot=temp;
        }

        //双击出口
        if(this.TID==17){
            // this.TID=0;
            // this.exits.splice(this.numMovingExit,1);
            // this.TID=0;
            // this.updateNav();
            this.dialogVisible_3=true;
            // alert(2);
        }
      },
      handleKey(event) {
        if (event.key === 'Delete') {
          if(this.roomRule.currentID==-1 && this.numMovingNav==-1 &&this.numMovingNav>=this.pointsNav.length &&this.numMovingExit==-1 &&this.numMovingExit>=this.exits.length)
            return; 
          console.log(222); 
          this.$confirm('此操作将永久删除该组件, 是否继续?', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(() => {
            this.deleteRoomDot();
          }).catch(() => {
            this.$message({
              type: 'info',
              message: '已取消删除'
            });
          });
        }
        
      },
      //项目另存为
      copy(){
        var url = restweburl + 'copy';
        axios({
            url: url,
            method: "post",
            headers:{"bID":this.$route.params.bID},
            data:{
              bID:this.$route.params.bID,
            }
        })
        .then(async (res) => {
            if(res.data.msg==='success'){
              this.$notify({
                title: '成功',
                message: '项目另存为成功',
                type: 'success'
              });
            }
            else{
              this.$notify.error({
                title: '失败  ',
                message: res.data.msg,
                duration: 0
              });
            }
        }).catch((error) =>{
          this.$notify.error({
            title: '失败',
            message:'项目另存为失败,原因：'+error,
            duration: 0
          });
        });
      },
      handleCopy() {
        this.copyT=this.roomRule.currentID;
      },
      handlePaste() {
        if(this.copyT==-1){
          return;
        }
        var newRoom = JSON.parse(JSON.stringify(this.rooms[this.copyT]));
        
        this.rooms.push(newRoom);

        this.rooms[this.rooms.length-1].rid=1;

        for(let i =0;i<this.rooms[this.rooms.length-1].walls.length;i++){
          if(this.rooms[this.rooms.length-1].walls[i].x==-10000){
            continue;
          }
          this.rooms[this.rooms.length-1].walls[i].x+=50;
          this.rooms[this.rooms.length-1].walls[i].y+=50;
        }

        for(let i=0;i<this.rooms[this.rooms.length-1].peos.length;i++){
          this.rooms[this.rooms.length-1].peos[i].x+=50;
          this.rooms[this.rooms.length-1].peos[i].y+=50;
        }

        this.rooms[this.rooms.length-1].lca.X0+=50;
        this.rooms[this.rooms.length-1].lca.Y0+=50;
        this.rooms[this.rooms.length-1].lca.X1+=50;
        this.rooms[this.rooms.length-1].lca.Y1+=50;
        this.rooms[this.rooms.length-1].lca.Xm+=50;
        this.rooms[this.rooms.length-1].lca.Ym+=50;
        console.log(this.rooms);
        this.draw();
      },

      //鼠标按下事件
      handleMouseDown(event) {
        event.preventDefault();
        event.stopPropagation()   
        const {
            offsetX,
            offsetY
        } = event;

        //密度区域划定
        if(this.TID==20){
          // this.createNewLocal=1;
          // this.newarea.x0=offsetX;
          // this.newarea.y0=offsetY;
          // this.newarea.x1=offsetX;
          // this.newarea.y1=offsetY;
          // this.newarea.x2=offsetX;
          // this.newarea.y2=offsetY;
          // this.newarea.x3=offsetX;
          // this.newarea.y3=offsetY;
          this.ks.push({
              kid:this.ks.length+1,
              area:{
                  x0:offsetX,
                  y0:offsetY,
                  x1:offsetX,
                  y1:offsetY,
              },
              attr:{
                startTime:0,
                endTime:0,
              }
          });
          this.createNewLocal=1;
          return;
        }

        /**出口类 */
        //新建出口
        if(this.TID==7){
            this.exits.push({x0: offsetX, y0: offsetY,x1: offsetX, y1: offsetY,
                x2: offsetX, y2: offsetY,x3: offsetX, y3: offsetY,id:this.exits.length+1,name:'新建集合点'+(this.exits.length+1)});
            this.createNewExit=1;
        }
        //选中出口
        if(this.TID==16){
            this.TID=17;
            this.draw();
        }
        if(this.TID==17){
            let flag=false;
            for(let i=0;i<this.exits.length;i++){
                if(offsetX>=this.exits[i].x0&&offsetX<=this.exits[i].x1&&offsetY>=this.exits[i].y0&&offsetY<=this.exits[i].y2){
                    if(i==this.numMovingExit)
                        return;
                }
                else{
                    flag=true;
                }
            }
            if(flag==true)
                this.TID=0;
        }

        /**导航点类 */
        if(this.TID==0 || this.TID==15){
            let maxD = 1000 * 1000;
            for (let i = 0; i < this.pointsNav.length; i++) {
                const point = this.pointsNav[i];
                let temp = (offsetX - point.x) * (offsetX - point.x) + (offsetY - point.y) * (offsetY - point.y);
                if (temp <= 20 && maxD > temp) {
                    this.TID=4;
                    maxD = temp;
                    this.numMovingNav = i;
                    return;
                }
            }
        }

        /**房间类 */
        //新建房间
        if(this.TID==5){
            this.rooms.push({
                rid:this.rooms.length,
                walls:[],
                peos:[],
                lca:{
                    Xm:0,
                    Ym:0,
                    X0:offsetX,
                    Y0:offsetY,
                    X1:offsetX,
                    Y1:offsetY,
                },
                attr:{
                    peoNum:0,
                    speed:'2',
                    startTime:"0",
                    color:'rgba(80, 168, 225, 0.2)',
                }
            });
            this.createNewRoom=1;
            return;
        }
        //房间选中
        if(this.TID==0 || this.TID==12 || this.TID==1){
            let flag=1;
            for(let i=0;i<this.rooms.length;i++){
                let num=0;
                for(let j=1;j<this.rooms[i].walls.length+1;j++){
                    let x1=this.rooms[i].walls[j-1].x;
                    let y1=this.rooms[i].walls[j-1].y;
                    let x2=0;
                    let y2=0;
                    if(j==this.rooms[i].walls.length){
                        x2=this.rooms[i].walls[0].x;
                        y2=this.rooms[i].walls[0].y;
                    }
                    else{
                        x2=this.rooms[i].walls[j].x;
                        y2=this.rooms[i].walls[j].y;
                        while(this.rooms[i].walls[j].x==-10000){
                            j++;
                            x2=this.rooms[i].walls[j].x;
                            y2=this.rooms[i].walls[j].y;
                        }
                    }
                    
                    let l1={x1:-10000,y1:-10000,x2:offsetX,y2:offsetY};
                    let l2={
                        x1:x1,
                        y1:y1,
                        x2:x2,
                        y2:y2
                    };

                    //快速排斥实验
                    if ((l1.x1 > l1.x2 ? l1.x1 : l1.x2) < (l2.x1 < l2.x2 ? l2.x1 : l2.x2) ||
                        (l1.y1 > l1.y2 ? l1.y1 : l1.y2) < (l2.y1 < l2.y2 ? l2.y1 : l2.y2) ||
                        (l2.x1 > l2.x2 ? l2.x1 : l2.x2) < (l1.x1 < l1.x2 ? l1.x1 : l1.x2) ||
                        (l2.y1 > l2.y2 ? l2.y1 : l2.y2) < (l1.y1 < l1.y2 ? l1.y1 : l1.y2))
                    {
                        continue;
                    }
                    //跨立实验
                    if ((((l1.x1 - l2.x1)*(l2.y2 - l2.y1) - (l1.y1 - l2.y1)*(l2.x2 - l2.x1))*
                        ((l1.x2 - l2.x1)*(l2.y2 - l2.y1) - (l1.y2 - l2.y1)*(l2.x2 - l2.x1))) > 0 ||
                        (((l2.x1 - l1.x1)*(l1.y2 - l1.y1) - (l2.y1 - l1.y1)*(l1.x2 - l1.x1))*
                        ((l2.x2 - l1.x1)*(l1.y2 - l1.y1) - (l2.y2 - l1.y1)*(l1.x2 - l1.x1))) > 0)
                    {
                        continue;
                    }
                    num+=1;
                }
                if(num%2==1){//奇数
                    this.TID=1;
                    this.roomRule.currentID=i;
                    flag=0;
                    this.draw();
                }
            }
            if(flag==1){
                this.TID=0;
                this.roomRule.currentID=-1;
                this.draw();
            }
        }
        //房间选中后的操作-内外部拖动(开始)
        if(this.TID==1 || this.TID==14){
            if (event.button != 2){
                let maxD = 1000 * 1000
                if(this.roomRule.currentID!=-1){
                    for (let i = 0; i < this.rooms[this.roomRule.currentID].walls.length; i++) {
                        const point = this.rooms[this.roomRule.currentID].walls[i];
                        let temp = (offsetX - point.x) * (offsetX - point.x) + (offsetY - point.y) * (offsetY - point.y);
                        if (temp <= 20 && maxD > temp) {
                            maxD = temp;
                            this.numMoving = i;
                            this.TID=3;//内部拖动
                            return;
                        }
                        else{
                            this.roomRule.oldX=offsetX;
                            this.roomRule.oldY=offsetY;
                            this.roomRule.oldXBuff=0;
                            this.roomRule.oldYBuff=0;
                            // this.roomRule.oldXBuff=this.rooms[this.roomRule.currentID].lca.Xm;
                            // this.roomRule.oldYBuff=this.rooms[this.roomRule.currentID].lca.Ym;
                            this.TID=2;//外部拖动
                        }
                    }
                }
            }
            else if(event.button === 2){
                //切割点
                if(this.TID==14){
                    if (this.roomRule.numLine!=0){//右键
                        this.rooms[this.roomRule.currentID].walls.splice(this.roomRule.numLine,0,{x:offsetX,y:offsetY});
                        this.draw();
                        this.TID=1;
                    }
                }
            }
        }

        /**导航点类 */
        //添加导航点
        if(this.TID==6){
            if (event.button === 0) {
                this.pointsNav.push({
                    x: offsetX,
                    y: offsetY
                });
                this.updateNav(false);
            }
            this.draw();
        }

        /**拖动背景 */
        if(this.TID==0){
            this.TID=18;
            this.roomRule.oldX=offsetX;
            this.roomRule.oldY=offsetY;
            this.roomRule.oldXBuff=0;
            this.roomRule.oldYBuff=0;
            // this.roomRule.oldXBuff=offsetX;
            // this.roomRule.oldYBuff=offsetY;
            this.draw();
        }
        /**渲染时拖动背景 */
        if(this.TID==19 || this.TID==11){
          this.show.isMoving=1;
          this.roomRule.oldX=offsetX;
          this.roomRule.oldY=offsetY;
          this.draw();
        }
    },
    interface(){

    },
    // 鼠标抬起事件
    handleMouseUp(event) {
        const {
            offsetX,
            offsetY
        } = event;
        offsetX;offsetY

        /**背景拖动结束 */
        if(this.TID==18){
            this.TID=0;

            // let dx = offsetX-this.roomRule.oldXBuff;
            // let dy = offsetY-this.roomRule.oldYBuff;
            let dx = this.roomRule.oldXBuff;
            let dy = this.roomRule.oldYBuff;
            //人群缓冲
            for(let i=0;i<this.rooms.length;i++){
              for(let j=0;j<this.rooms[i].peos.length;j++){
                this.rooms[i].peos[j].x= (this.rooms[i].peos[j].x+dx);
                this.rooms[i].peos[j].y= (this.rooms[i].peos[j].y+dy);
              }
            }
            this.draw();
        }

        /**渲染时背景拖动结束 */
        if((this.TID==19||this.TID==11)&&this.show.isMoving==1){
          this.show.isMoving=0;
          this.draw();
      }

        /**拖动导航点状态结束 */
        if(this.TID==4){
            this.TID=0;
            this.updateNav(false);
        }

        //密度区域划定结束
        if(this.TID==20){
          this.TID=0;
          this.createNewLocal=0;
          // this.dialogVisible_attr_show_3=true;
        }

        /**新建出口状态结束 */
        if(this.TID==7 && this.createNewExit==1){
            this.createNewExit=0;
            this.TID=0;
            this.updateNav(false);
        }

        /**新建房间状态结束 */
        if(this.TID==5 && this.createNewRoom==1){
            let width=this.rooms[this.rooms.length-1].lca.X1-this.rooms[this.rooms.length-1].lca.X0;
            let height=this.rooms[this.rooms.length-1].lca.Y1-this.rooms[this.rooms.length-1].lca.Y0;
            if(width<30 && height<30){
                this.rooms.splice(this.rooms.length-1,1);
                this.createNewRoom=0;
                this.TID=0;
                this.draw();
                return;
            }
            //初始化房间内墙壁点
            this.rooms[this.rooms.length-1].walls.push({x:this.rooms[this.rooms.length-1].lca.X0+Math.floor(width/3),y:this.rooms[this.rooms.length-1].lca.Y0+height});
            this.rooms[this.rooms.length-1].walls.push({x:this.rooms[this.rooms.length-1].lca.X0,y:this.rooms[this.rooms.length-1].lca.Y0+Math.floor(2*height/3)});
            this.rooms[this.rooms.length-1].walls.push({x:this.rooms[this.rooms.length-1].lca.X0,y:this.rooms[this.rooms.length-1].lca.Y0});
            this.rooms[this.rooms.length-1].walls.push({x:this.rooms[this.rooms.length-1].lca.X0+width,y:this.rooms[this.rooms.length-1].lca.Y0});
            this.rooms[this.rooms.length-1].walls.push({x:this.rooms[this.rooms.length-1].lca.X0+width,y:this.rooms[this.rooms.length-1].lca.Y0+Math.floor(2*height/3)});
            this.rooms[this.rooms.length-1].walls.push({x:this.rooms[this.rooms.length-1].lca.X0+Math.floor(2*width/3),y:this.rooms[this.rooms.length-1].lca.Y0+height});
            this.rooms[this.rooms.length-1].attr.id=this.rooms.length;

            this.rooms[this.rooms.length-1].attr.name="新建房间"+this.rooms.length;

            this.createNewRoom=0;
            this.draw();
            this.updateNav(false);
        }
        /**房间拖动结束 */
        if(this.TID==2){
            //缓冲渲染
            // let dx = offsetX-this.roomRule.oldX;
            // let dx = offsetX-this.roomRule.oldXBuff;
            // let dy = offsetY-this.roomRule.oldYBuff;
            // let dy = offsetY-this.roomRule.oldY;
            let dx = this.roomRule.oldXBuff;
            let dy = this.roomRule.oldYBuff;

            for(let i=0;i<this.rooms[this.roomRule.currentID].peos.length;i++){
              this.rooms[this.roomRule.currentID].peos[i].x+=dx;
              this.rooms[this.roomRule.currentID].peos[i].y+=dy;
            }
            this.TID=1;
            this.draw();
            this.updateNav(false);
        }
        /**房间内元素拖动结束 */
        if(this.TID==3){
            this.TID=1;
            this.draw();
            this.updateNav(false);
        }
    },

    start_(e){
      e.preventDefault();
      // alert(1)
    },

    // 鼠标移动事件
    handleMouseMove(event) {
        event.preventDefault();   
        if(this.throttle==true)return;

        const {
            offsetX,
            offsetY
        } = event;

        this.viewInfo.x=offsetX;
        this.viewInfo.y=offsetY;

        //复位
        if(this.TID==12)
            this.TID=0;
        if(this.TID==14){
            this.TID=1;
        }
        if(this.TID==15)
            this.TID=0;
        if(this.TID==16)
            this.TID=0;
        this.draw();

        /**渲染时拖动背景 */
        if((this.TID==19 || this.TID==11)&& this.show.isMoving){
            let dx = offsetX-this.roomRule.oldX;
            let dy = offsetY-this.roomRule.oldY;
            this.roomRule.oldX=offsetX;
            this.roomRule.oldY=offsetY;

            //基准点
            this.viewInfo.baseX0=this.viewInfo.baseX0+dx;
            this.viewInfo.baseY0=this.viewInfo.baseY0+dy;
            this.viewInfo.baseX1=this.viewInfo.baseX1+dx;
            this.viewInfo.baseY1=this.viewInfo.baseY1+dy;

            //底图
            this.viewInfo.imgX0+=dx;
            this.viewInfo.imgX1+=dx;
            this.viewInfo.imgY0+=dy;
            this.viewInfo.imgY1+=dy;

            //人物
            this.show.yx= (this.show.yx+dx);
            this.show.yx2= (this.show.yx2+dx);
            this.show.yy= (this.show.yy+dy);
            this.show.yy2= (this.show.yy2+dy);

            //房间
            for(let i=0;i<this.rooms.length;i++){
                //墙壁
                for(let j=0;j<this.rooms[i].walls.length;j++){
                    if(this.rooms[i].walls[j].x===-10000){
                        continue;
                    }
                    this.rooms[i].walls[j].x= (this.rooms[i].walls[j].x+dx);
                    this.rooms[i].walls[j].y= (this.rooms[i].walls[j].y+dy);
                }

                //属性
                this.rooms[i].lca.X0= (this.rooms[i].lca.X0+dx);
                this.rooms[i].lca.Y0= (this.rooms[i].lca.Y0+dy);
                this.rooms[i].lca.X1= (this.rooms[i].lca.X1+dx);
                this.rooms[i].lca.Y1= (this.rooms[i].lca.Y1+dy);
                this.rooms[i].lca.Xm= (this.rooms[i].lca.Xm+dx);
                this.rooms[i].lca.Ym= (this.rooms[i].lca.Ym+dy);
            }

            //导航点
            for(let i=0;i<this.pointsNav.length;i++){
                this.pointsNav[i].x+=dx;
                this.pointsNav[i].y+=dy;
            }
            for(let i=0;i<this.pointsNavView.length;i++){
                this.pointsNavView[i].x+=dx;
                this.pointsNavView[i].y+=dy;
            }

            //出口
            for(let i=0;i<this.exits.length;i++){
                this.exits[i].x0+=dx;
                this.exits[i].x1+=dx;
                this.exits[i].x2+=dx;
                this.exits[i].x3+=dx;
                this.exits[i].y0+=dy;
                this.exits[i].y1+=dy;
                this.exits[i].y2+=dy;
                this.exits[i].y3+=dy;
            }

            //热力图
            for(let i=0;i<this.data.length;i++){
              for(let j=0;j<this.data[i].length;j++){
                this.data[i][j].x+=dx;
                this.data[i][j].y+=dy;
              }
            }
            this.show.dx+=dx;
            this.show.dy+=dy;
            this.drawHeatMap(); 
            this.draw();
        }

        /**拖动背景 */
        if(this.TID==18){
            let dx = offsetX-this.roomRule.oldX;
            let dy = offsetY-this.roomRule.oldY;
            this.roomRule.oldX=offsetX;
            this.roomRule.oldY=offsetY;

            this.roomRule.oldXBuff+=dx;
            this.roomRule.oldYBuff+=dy;

            //基准点
            this.viewInfo.baseX0=this.viewInfo.baseX0+dx;
            this.viewInfo.baseY0=this.viewInfo.baseY0+dy;
            this.viewInfo.baseX1=this.viewInfo.baseX1+dx;
            this.viewInfo.baseY1=this.viewInfo.baseY1+dy;

            //底图
            this.viewInfo.imgX0+=dx;
            this.viewInfo.imgX1+=dx;
            this.viewInfo.imgY0+=dy;
            this.viewInfo.imgY1+=dy;

            //房间
            for(let i=0;i<this.rooms.length;i++){
                //墙壁
                for(let j=0;j<this.rooms[i].walls.length;j++){
                    if(this.rooms[i].walls[j].x===-10000){
                        continue;
                    }
                    this.rooms[i].walls[j].x= (this.rooms[i].walls[j].x+dx);
                    this.rooms[i].walls[j].y= (this.rooms[i].walls[j].y+dy);
                }

                //属性
                this.rooms[i].lca.X0= (this.rooms[i].lca.X0+dx);
                this.rooms[i].lca.Y0= (this.rooms[i].lca.Y0+dy);
                this.rooms[i].lca.X1= (this.rooms[i].lca.X1+dx);
                this.rooms[i].lca.Y1= (this.rooms[i].lca.Y1+dy);
                this.rooms[i].lca.Xm= (this.rooms[i].lca.Xm+dx);
                this.rooms[i].lca.Ym= (this.rooms[i].lca.Ym+dy);
            }

            //选定框
            for(let i=0;i<this.ks.length;i++){
              this.ks[i].area.x0+=dx;
              this.ks[i].area.x1+=dx;
              this.ks[i].area.y0+=dy;
              this.ks[i].area.y1+=dy;
            }

            //导航点
            for(let i=0;i<this.pointsNav.length;i++){
                this.pointsNav[i].x+=dx;
                this.pointsNav[i].y+=dy;
            }
            for(let i=0;i<this.pointsNavView.length;i++){
                this.pointsNavView[i].x+=dx;
                this.pointsNavView[i].y+=dy;
            }

            //出口
            for(let i=0;i<this.exits.length;i++){
                this.exits[i].x0+=dx;
                this.exits[i].x1+=dx;
                this.exits[i].x2+=dx;
                this.exits[i].x3+=dx;
                this.exits[i].y0+=dy;
                this.exits[i].y1+=dy;
                this.exits[i].y2+=dy;
                this.exits[i].y3+=dy;
            }

            this.draw();
        }
        

        /**导航点类 */
        if(this.TID==0){
            let maxD = 1000 * 1000;
            for (let i = 0; i < this.pointsNav.length; i++) {
                const point = this.pointsNav[i];
                let temp = (offsetX - point.x) * (offsetX - point.x) + (offsetY - point.y) * (offsetY - point.y);
                if (temp <= 20 && maxD > temp) {
                    this.TID=15;
                    maxD = temp;
                    this.numMovingNav = i;
                    this.draw();
                }
            }
        }
        if(this.TID==4){
            this.pointsNav[this.numMovingNav] = {
                x: offsetX,
                y: offsetY
            };
            this.draw();
        }

        /**出口类 */
        if(this.TID==0){
            for (let i = 0; i < this.exits.length; i++) {
                if(offsetX>=this.exits[i].x0&&offsetX<=this.exits[i].x1&&offsetY>=this.exits[i].y0&&offsetY<=this.exits[i].y2){
                    this.TID=16;
                    this.numMovingExit = i;
                    this.draw();
                }
            }
        }

        //密度区域划定
        if(this.TID==20 && this.createNewLocal==1){         
          this.ks[this.ks.length-1].area.x1=offsetX;
          this.ks[this.ks.length-1].area.y1=offsetY;
        }

        /**出口类 */
        //新建出口框拖动
        if(this.TID==7&&this.createNewExit==1){
            this.exits[this.exits.length-1].x1 =offsetX;
            this.exits[this.exits.length-1].x2 =offsetX;
            this.exits[this.exits.length-1].y2 =offsetY;
            this.exits[this.exits.length-1].y3 =offsetY;
            this.draw();
        }

        /**房间类 */
        //新建房间框拖动
        if(this.TID==5 && this.createNewRoom==1){
            this.rooms[this.rooms.length-1].lca.X1=offsetX;
            this.rooms[this.rooms.length-1].lca.Y1=offsetY;
            this.rooms[this.rooms.length-1].lca.Xm=(this.rooms[this.rooms.length-1].lca.X1-this.rooms[this.rooms.length-1].lca.X0)/2;
            this.rooms[this.rooms.length-1].lca.Ym=(this.rooms[this.rooms.length-1].lca.Y1-this.rooms[this.rooms.length-1].lca.Y0)/2;
            this.draw();
        }
          
        //房间预览
        if(this.TID==0){
            // 选择房屋元
            let flag=1;
            for(let i=0;i<this.rooms.length;i++){
                let num=0;
                for(let j=1;j<this.rooms[i].walls.length+1;j++){
                    let x1=this.rooms[i].walls[j-1].x;
                    let y1=this.rooms[i].walls[j-1].y;
                    let x2=0;
                    let y2=0;
                    if(j==this.rooms[i].walls.length){
                        x2=this.rooms[i].walls[0].x;
                        y2=this.rooms[i].walls[0].y;
                    }
                    else{
                        x2=this.rooms[i].walls[j].x;
                        y2=this.rooms[i].walls[j].y;
                        while(this.rooms[i].walls[j].x==-10000){
                        j++;
                        x2=this.rooms[i].walls[j].x;
                        y2=this.rooms[i].walls[j].y;
                        }
                    }
                    
                    let l1={x1:-10000,y1:-10000,x2:offsetX,y2:offsetY};
                    let l2={
                        x1:x1,
                        y1:y1,
                        x2:x2,
                        y2:y2
                    };

                    //快速排斥实验
                    if ((l1.x1 > l1.x2 ? l1.x1 : l1.x2) < (l2.x1 < l2.x2 ? l2.x1 : l2.x2) ||
                        (l1.y1 > l1.y2 ? l1.y1 : l1.y2) < (l2.y1 < l2.y2 ? l2.y1 : l2.y2) ||
                        (l2.x1 > l2.x2 ? l2.x1 : l2.x2) < (l1.x1 < l1.x2 ? l1.x1 : l1.x2) ||
                        (l2.y1 > l2.y2 ? l2.y1 : l2.y2) < (l1.y1 < l1.y2 ? l1.y1 : l1.y2))
                    {
                        continue;
                    }
                    //跨立实验
                    if ((((l1.x1 - l2.x1)*(l2.y2 - l2.y1) - (l1.y1 - l2.y1)*(l2.x2 - l2.x1))*
                        ((l1.x2 - l2.x1)*(l2.y2 - l2.y1) - (l1.y2 - l2.y1)*(l2.x2 - l2.x1))) > 0 ||
                        (((l2.x1 - l1.x1)*(l1.y2 - l1.y1) - (l2.y1 - l1.y1)*(l1.x2 - l1.x1))*
                        ((l2.x2 - l1.x1)*(l1.y2 - l1.y1) - (l2.y2 - l1.y1)*(l1.x2 - l1.x1))) > 0)
                    {
                        continue;
                    }
                    num+=1;
                }
                if(num%2==1){//奇数
                    this.TID=12;
                    this.roomRule.currentViewID=i;
                    flag=0;
                    this.draw();
                }
            }
            if(flag==1){
                this.TID=0;
                this.roomRule.currentViewID=-1;
                this.draw();
            }
        }
        /**拖动*/
        //元素拖动
        if(this.TID==3){
            if(this.roomRule.currentID===-1){
                return;
            }
            this.rooms[this.roomRule.currentID].walls[this.numMoving] = {
                x: offsetX,
                y: offsetY
            };
            let xs=[];
            let ys=[];
            console.log(this.rooms[this.roomRule.currentID]);
            for(let i=0;i<this.rooms[this.roomRule.currentID].walls.length;i++){
                if(this.rooms[this.roomRule.currentID].walls[i].x===-10000){
                continue;
                }
                xs.push(this.rooms[this.roomRule.currentID].walls[i].x);
                ys.push(this.rooms[this.roomRule.currentID].walls[i].y);
            }
            var Xmax=Math.max.apply(null,xs);
            var Xmin=Math.min.apply(null,xs);
            var Ymax=Math.max.apply(null,ys);
            var Ymin=Math.min.apply(null,ys);
            this.rooms[this.roomRule.currentID].lca.X0=Xmin;
            this.rooms[this.roomRule.currentID].lca.X1=Xmax;
            this.rooms[this.roomRule.currentID].lca.Y0=Ymin;
            this.rooms[this.roomRule.currentID].lca.Y1=Ymax;
            this.draw();
        }
        //房间拖动
        else if(this.TID==2){
            let dx = offsetX-this.roomRule.oldX;
            let dy = offsetY-this.roomRule.oldY;
            this.roomRule.oldX=offsetX;
            this.roomRule.oldY=offsetY;

            this.roomRule.oldXBuff+=dx;
            this.roomRule.oldYBuff+=dy;

            //墙壁移动
            if(this.roomRule.currentID===-1){
                return;
            }
            for(let i=0;i<this.rooms[this.roomRule.currentID].walls.length;i++){
                if(this.rooms[this.roomRule.currentID].walls[i].x === -10000){
                continue;
                }
                this.rooms[this.roomRule.currentID].walls[i].x+=dx;
                this.rooms[this.roomRule.currentID].walls[i].y+=dy;
            }
            //人物移动
            // for(let i=0;i<this.rooms[this.roomRule.currentID].peos.length;i++){
            //     this.rooms[this.roomRule.currentID].peos[i].x+=dx;
            //     this.rooms[this.roomRule.currentID].peos[i].y+=dy;
            // }

            //位置更新
            this.rooms[this.roomRule.currentID].lca.Xm+=dx;
            this.rooms[this.roomRule.currentID].lca.Ym+=dy;
            this.rooms[this.roomRule.currentID].lca.X0+=dx;
            this.rooms[this.roomRule.currentID].lca.Y0+=dy;
            this.rooms[this.roomRule.currentID].lca.X1+=dx;
            this.rooms[this.roomRule.currentID].lca.Y1+=dy;
            this.draw();
        }
        //房屋内移动选边
        if(this.TID==1){
            let maxD = 1000;
            let j=this.roomRule.currentID;
            if(this.roomRule.currentID===-1){
                return;
            }
            let num=0;
            for (let i = 1; i < this.rooms[j].walls.length; i++) {
                const point1 = this.rooms[j].walls[i - 1];
                const point2 = this.rooms[j].walls[i];
                if(point1.x===-10000 || point2.x===-10000){
                    continue;
                }
                let old=maxD;
                if(Math.sqrt((offsetX - point1.x) * (offsetX - point1.x) + (offsetY - point1.y) * (offsetY - point1.y))<=15){
                        maxD=maxD<Math.sqrt((offsetX - point1.x) * (offsetX - point1.x) + (offsetY - point1.y) * (offsetY - point1.y))?maxD:Math.sqrt((offsetX - point1.x) * (offsetX - point1.x) + (offsetY - point1.y) * (offsetY - point1.y));
                }
                else if(Math.sqrt((offsetX - point2.x) * (offsetX - point2.x) + (offsetY - point2.y) * (offsetY - point2.y))<=15){
                        maxD=maxD<Math.sqrt((offsetX - point2.x) * (offsetX - point2.x) + (offsetY - point2.y) * (offsetY - point2.y))?maxD:Math.sqrt((offsetX - point2.x) * (offsetX - point2.x) + (offsetY - point2.y) * (offsetY - point2.y));
                }
                else{
                    if(point1.x==point2.x && offsetY>=(point1.y>point2.y?point2.y:point1.y)&&offsetY<=(point1.y>point2.y?point1.y:point2.y)){
                        maxD=maxD<Math.abs(offsetX-point1.x)? maxD:Math.abs(offsetX-point1.x);
                        console.log(maxD,i);
                    }
                    else if(point1.y==point2.y && offsetX>=(point1.x>point2.x?point2.x:point1.x)&&offsetX<=(point1.x>point2.x?point1.x:point2.x)){
                        maxD=maxD<Math.abs(offsetY-point1.y)? maxD:Math.abs(offsetY-point1.y);
                    }
                    
                    else if(point1.x!=point2.x && point1.y!=point2.y && (offsetX>=(point1.x>point2.x?point2.x:point1.x))
                        && (offsetX<=(point1.x>point2.x?point1.x:point2.x)
                        && (offsetY>=(point1.y>point2.y?point2.y:point1.y))
                        && (offsetY<=(point1.y>point2.y?point1.y:point2.y)))){
                        let k, b;
                        k = (point2.y - point1.y) / (point2.x - point1.x);
                        b = point1.y - k * point1.x;
                        maxD=(maxD<Math.abs((k * offsetX - offsetY + b) / Math.sqrt(1 + k * k)))?maxD:Math.abs((k * offsetX - offsetY + b) / Math.sqrt(1 + k * k));
                        console.log(maxD,i);
                    }
              }
              if(old!=maxD){
                num=i;
              }
            }
            
            if(maxD<=15){
                this.roomRule.numLine=num;
                this.TID=14;
                this.draw();
                return;
            }
            else{
                this.TID=1;
                this.roomRule.numLine=-1;
            }
        }
    },

    // 处理右键菜单事件，阻止默认行为
    handleContextMenu(event) {
      event.preventDefault();
      // alert(1)
    },

    // 绘制画布
    draw() {
        const startTime = new Date();
        this.isDrawing=1;//渲染标识
        // 清除画布
        this.ctxBuffer.clearRect(0, 0, this.canvas.width, this.canvas.height);

        //绘制底图
        if(this.myImg!=null && this.viewInfo.isViewImg){
          this.ctxBuffer.drawImage(this.myImg,this.viewInfo.imgX0, this.viewInfo.imgY0, this.viewInfo.imgX1-this.viewInfo.imgX0, this.viewInfo.imgY1-this.viewInfo.imgY0);
          
        }
        if(this.viewInfo.isViewBorder){
          this.ctxBuffer.strokeStyle = 'black';
          this.ctxBuffer.strokeRect(this.viewInfo.imgX0-1,this.viewInfo.imgY0+1,this.viewInfo.imgX1-this.viewInfo.imgX0+2,this.viewInfo.imgY1-this.viewInfo.imgY0+2);
        }


        //绘制比例尺
        this.ctxBuffer.font = '10px Arial';
        this.ctxBuffer.strokeStyle = 'black'; // 设置线的颜色为蓝色
        this.ctxBuffer.lineWidth = 1; // 设置线的宽度为1
        this.ctxBuffer.beginPath();
        this.ctxBuffer.moveTo(this.canvas.width-110, 15);
        this.ctxBuffer.lineTo(this.canvas.width-110, 22);
        this.ctxBuffer.lineTo(this.canvas.width-40, 22);
        this.ctxBuffer.lineTo(this.canvas.width-40, 15);
        this.ctxBuffer.stroke();
        this.ctxBuffer.strokeText(0, this.canvas.width-110-5, 10, 20)
        let a = this.viewInfo.sT
        a = (a*1).toFixed(2)
        this.ctxBuffer.strokeText(a+"m", this.canvas.width-40-10, 10, 40)

        /**绘制选定框 */
        this.ctxBuffer.fillStyle = "rgba(251,204,12,0.4)";
        for(let i=0;i<this.ks.length;i++){
          this.ctxBuffer.fillRect(this.ks[i].area.x0,this.ks[i].area.y0,this.ks[i].area.x1-this.ks[i].area.x0,this.ks[i].area.y1-this.ks[i].area.y0);
        }

        /**绘制房间类*/
        //新建房间框拖动
        if(this.TID==5 && this.createNewRoom==1){
            //外部框
            let j = this.rooms.length-1;
            this.ctxBuffer.fillStyle = "rgba(204, 232, 255,0.4)";
            this.ctxBuffer.beginPath();
            this.ctxBuffer.fillRect(this.rooms[j].lca.X0-10, this.rooms[j].lca.Y0-10,this.rooms[j].lca.X1-this.rooms[j].lca.X0+20, this.rooms[j].lca.Y1-this.rooms[j].lca.Y0+20);
            this.ctxBuffer.closePath();
        }
        //静态房间绘制
        if(this.viewInfo.isViewRoom){
            //有房间被选中
            if(this.TID==1||this.TID==2||this.TID==3||this.TID==13||this.TID==14){
                this.ctxBuffer.fillStyle = "rgba(173, 216, 230,0.6)"
                this.ctxBuffer.lineWidth = 1; // 设置线的宽度为2
                let i=this.roomRule.currentID;

                this.ctxBuffer.beginPath()
                this.ctxBuffer.fillRect(this.rooms[i].lca.X0-10*this.nST.sTX, this.rooms[i].lca.Y0-10*this.nST.sTX,this.rooms[i].lca.X1-this.rooms[i].lca.X0+20*this.nST.sTX, this.rooms[i].lca.Y1-this.rooms[i].lca.Y0+20*this.nST.sTX);
                this.ctxBuffer.closePath()
            }
            //有房间被光标覆盖
            else if(this.TID==12){
                this.ctxBuffer.fillStyle = "rgba(204, 232, 255,0.4)";
                let i=this.roomRule.currentViewID;
                this.ctxBuffer.beginPath()
                this.ctxBuffer.fillRect(this.rooms[i].lca.X0-10*this.nST.sTX, this.rooms[i].lca.Y0-10*this.nST.sTX,this.rooms[i].lca.X1-this.rooms[i].lca.X0+20*this.nST.sTX, this.rooms[i].lca.Y1-this.rooms[i].lca.Y0+20*this.nST.sTX)
                this.ctxBuffer.closePath()
            }
            //房间主体
            for(let j=0;j<this.rooms.length;j++){
                //绘制背景
                this.ctxBuffer.beginPath();
                if(this.rooms[j].walls.length==0){
                  continue;
                }
                this.ctxBuffer.moveTo(this.rooms[j].walls[0].x,this.rooms[j].walls[0].y);
                for (let i = 1; i < this.rooms[j].walls.length; i++) {
                    // const point1 = this.rooms[j].walls[i - 1];
                    const point2 = this.rooms[j].walls[i];
                    if(point2.x==-10000){
                        continue;
                    }
                    this.ctxBuffer.lineTo(point2.x, point2.y);
                }
                this.ctxBuffer.closePath();
                this.ctxBuffer.strokeStyle="rgba(0, 0, 0, 0)";
                this.ctxBuffer.stroke();
                this.ctxBuffer.fillStyle = this.rooms[j].attr.color;
                this.ctxBuffer.fill();

                //房间墙壁
                if(this.drawConfig[0].state){
                  for (let i = 1; i < this.rooms[j].walls.length; i++) {
                      const point1 = this.rooms[j].walls[i - 1];
                      const point2 = this.rooms[j].walls[i];
                      if(point1.x==-10000 || point2.x==-10000){
                          continue;
                      }
                      if(this.TID==14&&this.roomRule.currentID==j&&this.roomRule.numLine===i){
                          this.ctxBuffer.strokeStyle = 'red';
                      }
                      else{
                          this.ctxBuffer.strokeStyle = this.drawConfig[0].color;
                      }
                      this.ctxBuffer.beginPath();
                      this.ctxBuffer.moveTo(point1.x, point1.y);
                      this.ctxBuffer.lineTo(point2.x, point2.y);
                      this.ctxBuffer.closePath();
                      this.ctxBuffer.lineWidth = this.drawConfig[0].r*this.nST.sTX;
                      this.ctxBuffer.stroke();

                      //墙壁点绘制
                      if(this.drawConfig[1].state){
                        this.ctxBuffer.strokeStyle = this.drawConfig[1].color;
                        this.ctxBuffer.beginPath();
                        this.ctxBuffer.arc(point1.x, point1.y, this.drawConfig[1].r*this.nST.sTX, 0, Math.PI * 2);
                        this.ctxBuffer.closePath();
                        this.ctxBuffer.stroke();
                        this.ctxBuffer.fillStyle = this.drawConfig[1].color;
                        this.ctxBuffer.fill();
                        this.ctxBuffer.strokeStyle = this.drawConfig[1].color;
                        this.ctxBuffer.beginPath();
                        this.ctxBuffer.arc(point2.x, point2.y, this.drawConfig[1].r*this.nST.sTX, 0, Math.PI * 2);
                        this.ctxBuffer.closePath();
                        this.ctxBuffer.stroke();
                        this.ctxBuffer.fillStyle = this.drawConfig[1].color;
                        this.ctxBuffer.fill();
                      }
                  }
                }
                

                //房间人群
                if(this.viewInfo.isViewPeos && this.TID==0 && this.drawConfig[2].state ){
                    this.ctxBuffer.fillStyle = 'green';
                    for (let i = 0; i < this.rooms[j].peos.length; i+=2) {
                      this.ctxBuffer.beginPath();
                      this.ctxBuffer.arc(this.rooms[j].peos[i].x, this.rooms[j].peos[i].y, this.drawConfig[2].r*this.nST.sTX, 0, Math.PI * 2);
                      this.ctxBuffer.fill();
                      
                    }
                    this.ctxBuffer.fillStyle = 'blue';
                    for (let i = 1; i < this.rooms[j].peos.length; i+=2) {
                        this.ctxBuffer.beginPath();
                        this.ctxBuffer.arc(this.rooms[j].peos[i].x, this.rooms[j].peos[i].y, this.drawConfig[2].r*this.nST.sTX, 0, Math.PI * 2);
                        this.ctxBuffer.fill();
                    }
                }

                //房间编号+名称
                if(this.viewInfo.isViewRoomId&&this.viewInfo.isViewRoomName){
                  this.ctxBuffer.fillStyle = 'black';
                  this.ctxBuffer.font = this.viewInfo.fontSize*this.nST.sTX+'px 微软雅黑 Narrow';
                  if (this.rooms[j].attr.id==undefined){continue;}
                  let str = (this.rooms[j].attr.id).toString()+"#";
                  let len = this.cal_font_len(str);
                  this.ctxBuffer.fillText(str, (this.rooms[j].lca.X1+this.rooms[j].lca.X0)/2-len*20*this.nST.sTX/2, (this.rooms[j].lca.Y1+this.rooms[j].lca.Y0)/2-8*this.nST.sTX);
                  if (this.rooms[j].attr.name==undefined){continue;}
                  str = (this.rooms[j].attr.name).toString()+'('+this.rooms[j].peos.length+'人)';
                  len = this.cal_font_len(str);
                  this.ctxBuffer.fillText(str, (this.rooms[j].lca.X1+this.rooms[j].lca.X0)/2-len*20*this.nST.sTX/2, (this.rooms[j].lca.Y1+this.rooms[j].lca.Y0)/2+14*this.nST.sTX);
                }
                else{
                  if(this.viewInfo.isViewRoomId){
                    this.ctxBuffer.fillStyle = 'black';
                    this.ctxBuffer.font = this.viewInfo.fontSize*this.nST.sTX+'px 微软雅黑 Narrow';
                    if (this.rooms[j].attr.id==undefined){continue;}
                    let str = (this.rooms[j].attr.id).toString()+"#";
                    let len = this.cal_font_len(str);
                    this.ctxBuffer.fillText(str, (this.rooms[j].lca.X1+this.rooms[j].lca.X0)/2-len*20*this.nST.sTX/2, (this.rooms[j].lca.Y1+this.rooms[j].lca.Y0)/2+5*this.nST.sTX);
                  } 
                  if(this.viewInfo.isViewRoomName){
                    this.ctxBuffer.fillStyle = 'black';
                    this.ctxBuffer.font = this.viewInfo.fontSize*this.nST.sTX+'px 微软雅黑 Narrow';
                    if (this.rooms[j].attr.name==undefined){continue;}
                    let str = (this.rooms[j].attr.name).toString()+'('+this.rooms[j].peos.length+'人)'  ;
                    let len = this.cal_font_len(str);
                    this.ctxBuffer.fillText(str, (this.rooms[j].lca.X1+this.rooms[j].lca.X0)/2-len*20*this.nST.sTX/2, (this.rooms[j].lca.Y1+this.rooms[j].lca.Y0)/2+5*this.nST.sTX);
                  }
                }
                this.ctxBuffer.stroke();
            }
        }

        /**绘制导航点类 */
        const showNav = this.viewInfo.isViewNav || (this.navEdit.active && this.navEdit.showPoints);
        if(showNav){
          //绘制导航点鼠标标识
            if(this.TID==6){
              this.ctxBuffer.fillStyle = this.drawConfig[3].color; // 设置点的颜色为深蓝色
              this.ctxBuffer.beginPath();
              this.ctxBuffer.arc(this.viewInfo.x, this.viewInfo.y, this.drawConfig[3].r*this.nST.sTX, 0, Math.PI * 2);
              this.ctxBuffer.fill();
            }
            // //绘制已放置导航点
            if(this.drawConfig[3].state || this.navEdit.active){
              this.ctxBuffer.fillStyle = this.drawConfig[3].color; // 设置点的颜色为深蓝色
              for (const point of this.pointsNav) {
                  this.ctxBuffer.beginPath();
                  if(point.x==null)
                    continue;
                  this.ctxBuffer.arc(point.x, point.y, this.drawConfig[3].r*this.nST.sTX, 0, Math.PI * 2);
                  this.ctxBuffer.fill();
              }
            }

            //绘制导航线条
            if((this.drawConfig[4].state || this.navEdit.active) && this.isDrawing==0){
              this.ctxBuffer.strokeStyle = this.drawConfig[4].color; 
              this.ctxBuffer.lineWidth = this.drawConfig[4].r*this.nST.sTX;
              for (let i = 0; i < this.pointsNavView.length; i++) {
                  if(this.pointsNavView[i].a>=this.pointsNav.length || this.pointsNavView[i].b>=this.pointsNav.length)
                      continue;
                  const point1 = this.pointsNav[this.pointsNavView[i].a];
                  const point2 = this.pointsNav[this.pointsNavView[i].b];
                  if(point1.x==null||point2.x==null)
                    continue;
                  if(point1.x===-10000 || point2.x===-10000){
                      continue;
                  }
                  this.ctxBuffer.beginPath();
                  this.ctxBuffer.moveTo(point1.x, point1.y);
                  this.ctxBuffer.lineTo(point2.x, point2.y);
                  this.ctxBuffer.stroke();
              }
            }
            
            if(this.drawConfig[3].state){
              //被选中导航点
              this.ctxBuffer.fillStyle = 'blue';
              if(this.TID==15 || this.TID==4){
                  this.ctxBuffer.beginPath();
                  if(this.numMovingNav>this.pointsNav.length-1){
                    // alert(this.numMovingNav)
                    // alert(this.pointsNav.length)
                  }
                  this.ctxBuffer.arc(this.pointsNav[this.numMovingNav].x, this.pointsNav[this.numMovingNav].y, this.drawConfig[3].r*this.nST.sTX, 0, Math.PI * 2);
                  this.ctxBuffer.fill();
              }
            }
        }

        /**绘制出口 */
        //出口框指示
        if(this.TID==16){
            //外部框
            this.ctxBuffer.fillStyle = "rgba(204, 232, 255,0.4)";
            this.ctxBuffer.lineWidth = 1*this.nST.sTX;
            this.ctxBuffer.beginPath();
            this.ctxBuffer.fillRect(this.exits[this.numMovingExit].x0-10*this.nST.sTX, this.exits[this.numMovingExit].y0-10*this.nST.sTX,this.exits[this.numMovingExit].x1-this.exits[this.numMovingExit].x0+20*this.nST.sTX, this.exits[this.numMovingExit].y2-this.exits[this.numMovingExit].y0+20*this.nST.sTX);
            this.ctxBuffer.closePath();
            this.ctxBuffer.fill();
        }
        //出口框选中
        if(this.TID==17){
            this.ctxBuffer.fillStyle = "rgba(173, 216, 230,0.6)"
            this.ctxBuffer.lineWidth = 1*this.nST.sTX; // 设置线的宽度为2
            // let i=this.roomRule.currentID;

            this.ctxBuffer.beginPath()
            this.ctxBuffer.fillRect(this.exits[this.numMovingExit].x0-10*this.nST.sTX, this.exits[this.numMovingExit].y0-10*this.nST.sTX,this.exits[this.numMovingExit].x1-this.exits[this.numMovingExit].x0+20*this.nST.sTX, this.exits[this.numMovingExit].y2-this.exits[this.numMovingExit].y0+20*this.nST.sTX);
            this.ctxBuffer.closePath()

            this.ctxBuffer.beginPath()
            this.ctxBuffer.fillStyle = "rgb(255,165,0)";
            this.ctxBuffer.fillRect(this.exits[this.numMovingExit].x0-10*this.nST.sTX, this.exits[this.numMovingExit].y0-10*this.nST.sTX,this.exits[this.numMovingExit].x1-this.exits[this.numMovingExit].x0+20*this.nST.sTX, this.exits[this.numMovingExit].y2-this.exits[this.numMovingExit].y0+20*this.nST.sTX);
            this.ctxBuffer.closePath()
            this.ctxBuffer.fillStyle = "rgba(204, 232, 255,0.4)"
        }
        //出口本体
        this.ctxBuffer.strokeStyle = 'blue'; // 设置线的颜色为蓝色
        this.ctxBuffer.lineWidth = 1*this.nST.sTX; // 设置线的宽度为2
        for (let i = 0; i < this.exits.length; i++) {
            this.ctxBuffer.beginPath();
            this.ctxBuffer.moveTo(this.exits[i].x0, this.exits[i].y0);
            this.ctxBuffer.lineTo(this.exits[i].x1, this.exits[i].y1);
            this.ctxBuffer.stroke();
            this.ctxBuffer.moveTo(this.exits[i].x1, this.exits[i].y1);
            this.ctxBuffer.lineTo(this.exits[i].x2, this.exits[i].y2);
            this.ctxBuffer.stroke();
            this.ctxBuffer.moveTo(this.exits[i].x2, this.exits[i].y2);
            this.ctxBuffer.lineTo(this.exits[i].x3, this.exits[i].y3);
            this.ctxBuffer.stroke();
            this.ctxBuffer.moveTo(this.exits[i].x3, this.exits[i].y3);
            this.ctxBuffer.lineTo(this.exits[i].x0, this.exits[i].y0);
            this.ctxBuffer.stroke();

            if(this.viewInfo.isViewExportId&&this.viewInfo.isViewExportName){
              this.ctxBuffer.fillStyle = 'black';
              this.ctxBuffer.font = this.viewInfo.fontSize*this.nST.sTX+'px Arial';
              let str = this.exits[i].id+"#";
              let len = this.cal_font_len(str);
              this.ctxBuffer.fillText(str, (this.exits[i].x0+this.exits[i].x1)/2-len*20*this.nST.sTX/2, (this.exits[i].y0+this.exits[i].y3)/2-8*this.nST.sTX);
              str = this.exits[i].name;
              len = this.cal_font_len(str);
              this.ctxBuffer.fillText(str, (this.exits[i].x0+this.exits[i].x1)/2-len*20*this.nST.sTX/2, (this.exits[i].y0+this.exits[i].y3)/2+14*this.nST.sTX);
            }
            else{
              if(this.viewInfo.isViewExportId){
                this.ctxBuffer.fillStyle = 'black';
                this.ctxBuffer.font = this.viewInfo.fontSize*this.nST.sTX+'px Arial';
                let str = this.exits[i].id+"#";
                let len = this.cal_font_len(str);
                this.ctxBuffer.fillText(str, (this.exits[i].x0+this.exits[i].x1)/2-len*20*this.nST.sTX/2, (this.exits[i].y0+this.exits[i].y3)/2+5*this.nST.sTX);
              }
              if(this.viewInfo.isViewExportName){
                this.ctxBuffer.fillStyle = 'black';
                this.ctxBuffer.font = this.viewInfo.fontSize*this.nST.sTX+'px Arial';
                let str = this.exits[i].name;
                let len = this.cal_font_len(str);
                this.ctxBuffer.fillText(str, (this.exits[i].x0+this.exits[i].x1)/2-len*20*this.nST.sTX/2, (this.exits[i].y0+this.exits[i].y3)/2+5*this.nST.sTX);
              }
            }
        }
        /**结果人群渲染 */
        if((this.show.isMoving==0&&this.TID==19) || (this.show.isMoving==0&&this.TID==11)){
          this.ctxBuffer.fillStyle = 'green';
          for(let j=0;j<this.show.showPeople.length;j++){
            // 绘制人群点
            // 设置点的颜色为深蓝色
            if(this.show.showPeople[j].id%2==0)continue;
            this.ctxBuffer.beginPath();
            let x_=this.show.yx+(this.show.showPeople[j].x)/10*(this.show.yx2-this.show.yx);
            let y_=this.show.yy+(this.show.showPeople[j].y)/10*(this.show.yy2-this.show.yy);
            this.ctxBuffer.arc(x_, y_, this.drawConfig[2].r*this.nST.sTX, 0, Math.PI * 2);
            this.ctxBuffer.fill();
          }
          this.ctxBuffer.fillStyle = 'blue';
          for(let j=1;j<this.show.showPeople.length;j++){
            if(this.show.showPeople[j].id%2==1)continue;
            // 设置点的颜色为深蓝色
            this.ctxBuffer.beginPath();
            let x_=this.show.yx+(this.show.showPeople[j].x)/10*(this.show.yx2-this.show.yx);
            let y_=this.show.yy+(this.show.showPeople[j].y)/10*(this.show.yy2-this.show.yy);
            this.ctxBuffer.arc(x_, y_, this.drawConfig[2].r*this.nST.sTX, 0, Math.PI * 2);
            this.ctxBuffer.fill();
          }
          //渲染热力图
          if(!this.viewInfo.isViewHeat){
            this.ctx_heat.clearRect(0, 0, this.canvas_heat.width, this.canvas_heat.height);
          }
          if(this.show.nowTime%10==0 && this.TID==19 && this.viewInfo.isViewHeat && this.data.length>0){
            html2canvas
            this.drawHeatMap();
          }
          this.ctxBuffer.drawImage(this.canvas_heat,0,0); 
        }
        this.isDrawing=0;//渲染标识
        const endTime = new Date();
        const executionTime = endTime - startTime;
        console.log(`代码执行时间：${executionTime} 毫秒`);
      },
      // 初始化画布大小
      initCanvasSize() {
        this.canvas.width = window.innerWidth-10;
        this.canvas.height = window.innerHeight-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;

        this.canvasBuffer.width = window.innerWidth-10;
        this.canvasBuffer.height = window.innerHeight-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;

        this.canvas_heat.width = window.innerWidth-10;
        this.canvas_heat.height = window.innerHeight-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
        this.widthImg = window.innerWidth-10;
        this.heightImg = window.innerHeight-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;

        this.viewInfo.baseX1=window.innerWidth-10;
        this.viewInfo.baseY1=window.innerHeight-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
        
        this.viewInfo.width=window.innerWidth-10;
        this.viewInfo.height=window.innerHeight-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
      },
      initCanvasSizeFull() {
        this.canvas.width = window.screen.width-10;
        this.canvas.height = window.screen.height-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;

        this.canvasBuffer.width = window.screen.width-10;
        this.canvasBuffer.height =window.screen.height-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;

        this.canvas_heat.width = window.screen.width-10;
        this.canvas_heat.height = window.screen.height-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
        this.widthImg = window.screen.width-10;
        this.heightImg = window.screen.height-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;

        this.viewInfo.baseX1=window.screen.width-10;
        this.viewInfo.baseY1=window.screen.height-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
        
        this.viewInfo.width=window.screen.width-10;
        this.viewInfo.height=window.screen.height-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
      },

      async wait() {
        await new Promise(resolve => setTimeout(resolve, 34));
      },
      async deadlock() {
        await new Promise(resolve => setTimeout(resolve, 500));
      },

      //提交
      upload(){
        this.TID = 10;
        var url = restweburl + 'commit';
        axios({
          url: url,
          method: "post",
          data:{
            bID:this.$route.params.bID,
            navPos:this.pointsNav,
            exit:this.exits,
            rooms:this.rooms,
            scale:this.viewInfo.sT/70,
            viewInfo:this.viewInfo,
            nST:this.nST,
            bST:this.bST
          }
        }).then((res) => {
          if(res.data.msg=="success"){
            //定时器
            this.up.timer=setInterval(()=>{
              var url = restweburl + 'getState';
              axios({
                url: url,
                method: "post",
                data:{
                  bID:this.$route.params.bID
                }
              })
              .then((res) => {
                if(res.data.msg=="success"){
                  this.up.precent=res.data.data.schedule; 
                  if(this.up.precent==100){
                    this.up.precent=0;
                    clearInterval(this.up.timer);
                    this.TID = 0;

                    this.$notify({
                      title: '成功',
                      message: '演算完毕',
                      type: 'success'
                    });
                  }
                }
                else{
                  this.$notify.error({
                    title: '错误',
                    message: res.data.msg,
                    offset: 100,
                    duration:0,
                  });
                  clearInterval(this.up.timer);
                  this.up.precent=0;
                  this.TID = 0;
                }
              })
              .catch((error)=> {
                console.log(error);
                this.$notify.error({
                  title: '错误',
                  message: error,
                  offset: 100,
                  duration:0,
                });
                clearInterval(this.up.timer);
                this.up.precent=0;
                this.TID = 0;
              });
            },2000)
          }
          else{
            this.$notify.error({
              title: '错误',
              message: res.data.msg,
              offset: 100,
              duration:0,
            });
            clearInterval(this.up.timer);
            this.up.precent=0;
            this.TID = 0;
          }
        })
        .catch((error)=> {
          console.log(error);
          this.$notify.error({
            title: '错误',
            message: error,
            offset: 100,
            duration:0,
          });
        });
      },

      //回放功能
      playBack(){
        this.viewInfo.isViewHeat=false;
        // alert(this.radio_mode)
        
        this.heatInit();

        if(this.radio_mode=='在线模式'){
          this.initWebSocket();
        }

        const loading = this.$loading({
            lock: true,
            text: '正在加载播放所需数据...',
            spinner: 'el-icon-loading',
            background: 'rgba(0, 0, 0, 0.7)'
        });

        var url = restweburl + 'getReplayData';
        axios({
          url: url,
          method: "post",
          data:{
            bID:this.$route.params.bID
          }
        })
        .then((res) => {
          if(res.data.msg=="success"){
            this.show.clips=res.data.data.flat;
            this.show.totalTime=this.show.clips[this.show.clips.length-1].startTime+this.show.clips[this.show.clips.length-1].duration-1
            
            //备份当前数据
            this.backup.rooms=JSON.parse(JSON.stringify(this.rooms));
            this.backup.exits=JSON.parse(JSON.stringify(this.exits));
            this.backup.pointsNav=JSON.parse(JSON.stringify(this.pointsNav));
            this.backup.pointsNavView=JSON.parse(JSON.stringify(this.pointsNavView));
            this.backup.viewInfo=JSON.parse(JSON.stringify(this.viewInfo)); 
            this.show.nowBusy=0;
            this.backup.show=JSON.parse(JSON.stringify(this.show)); 
            this.backup.nST=JSON.parse(JSON.stringify(this.nST)); 
            this.backup.bST=JSON.parse(JSON.stringify(this.bST)); 
            this.show.nowBusy=0;

            //重绘所有内容(播放内容)
            this.rooms = res.data.data.frame.rooms;
            this.exits = res.data.data.frame.exit;
            this.pointsNav = res.data.data.frame.navPos;
            this.viewInfo = res.data.data.frame.viewInfo;
            this.nST = res.data.data.frame.nST;
            this.draw();

            //热力图加载
            url = restweburl + 'getHeatMap';
            axios({
              url: url,
              method: "post",
              data:{
                bID:this.$route.params.bID
              }
            })
            .then((res) => {
              this.data = res.data.data;
              //本地加载
              if(this.radio_mode=='本地模式'){
                let file = document.getElementById('fileInput').files[0];
                if (!file) {
                  return;
                }
              
                let reader = new FileReader();
                reader.readAsText(file, 'utf-8');
                reader.onload = ((e) => {
                  this.dat = e.target.result;

                  function runtimeLiteralParseHelper(d) {
                    return eval(d);
                  }
                  this.d5 = runtimeLiteralParseHelper(e.target.result);  
                });
              }
              setTimeout(() => {  
                loading.close();
            }, 1000);
            })
            .catch((error)=> {
              this.$notify.error({
                title: '错误',
                message: error,
                offset: 100,
                duration:0,
              });
            });
          }
          else{
            this.$notify.error({
              title: '错误',
              message: "当前项目还未模拟执行，无可播放动画",
              offset: 100
            });
            this.TID=0;
          }
        })
        .catch((error)=> {
          console.log(error);
          this.$notify.error({
            title: '错误',
            message: error,
            offset: 100,
            duration:0,
        });
        });
    },
    convertBlobToArray(blob) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
              if (reader.readyState === FileReader.DONE) {
                  resolve(new Uint8Array(reader.result)); // 返回Uint8Array类型的数组
              } else {
                  reject('Failed to read Blob');
              }
          };
          reader.readAsArrayBuffer(blob);
      });
    },
    handleStreamData(data) {
      data
    },
    async play(frameNum){
      this.show.isMoving=0;
      let clipNum=0;
      //本地播放
      if(this.radio_mode=='本地模式'){
        this.show.isMoving=0;
        this.show.frameNum=frameNum;
        this.TID=19;
        this.show.nowBusy=0;
        this.alwaysRun_local();
        return;
      }
      //云端播放
      //计算时间对应分片
      for(let i=0;i<this.show.clips.length;i++){
        if(frameNum>this.show.clips[i].duration){
          frameNum-=this.show.clips[i].duration;
        }
        else{
          clipNum=i+1;
          break;
        }
      }
      this.show.frameNum=frameNum;
      
      this.TID=19;
      //前n个分片(缓冲区)
      this.show.nowBusy=1;
      let buff=5;

      if(clipNum+buff>this.show.clips.length)
        buff=this.show.clips.length-clipNum;
      for(let i=clipNum;i<=clipNum+buff;i++){
        this.socketState=1;
        this.sendSocket({bID:this.$route.params.bID,flat:i});
        while(this.socketState==1){
          await this.deadlock();
        }
      }
      this.show.nowBusy=0;
      //边缓冲边渲染
      this.alwaysRun();
      for(let i=clipNum+buff+1;i<=this.show.clips.length;i++){
        this.socketState=1;
        this.sendSocket({bID:this.$route.params.bID,flat:i});
        while(this.socketState==1){
          await this.deadlock();
        }
      }
      this.socket.disconnect();
    },
    async alwaysRun_local(){
      console.log(this.d5)
      // alert(this.d5.length)
      for(let i=this.show.frameNum;i<this.d5.length;i++){
        this.show.showPeople=this.d5[i];
        this.draw();
        this.show.nowTime+=1;
        await this.wait();
        if(this.TID==11 || this.TID==0){
          return;
        }
      }
    },
    async alwaysRun(){
      let i=1;
      while(i==1){
        while(this.show.clipData.length==0){
          this.show.nowBusy=1;
          if(this.show.nowTime==this.show.totalTime){ 
            this.show.nowBusy=0;
            this.TID=11;
            return;
          }
          if(this.TID==0)return;
          await this.deadlock();
        }
        this.show.nowBusy=0;
        for(let j=this.show.frameNum;j<this.show.clipData[0].length;j++){
          this.show.showPeople=this.show.clipData[0][j];
          this.draw();
          this.show.nowTime+=1;
          await this.wait();
          if(this.TID==11 || this.TID==0){
            return;
          }
        }
        this.show.frameNum=0;//偏移复位
        this.show.clipData.shift();
      }
    },
    jump(){
      if(this.TID==11){
        return;
      }  
    },
    //保存项目
    save(){
        var url = restweburl + 'saveBlueprint';
        axios({
          url: url,
          headers:{"bID":this.$route.params.bID},
          method: "post",
          data:{
            rooms:this.rooms,
            pointsNav:this.pointsNav,
            exits:this.exits,
            pointsNavView:this.pointsNavView,
            viewInfo:this.viewInfo,
            drawConfig:this.drawConfig,
            drawConfig_color:this.drawConfig_color,
            show:this.show,
            nST:this.nST,
            bST:this.bST,
            ks:this.ks,
          }
        })
        .then((res) => {
          if(res.data.msg=='success'){
            this.$message({
              message: '保存成功',
              type: 'success'
            });
          }
          else{
            this.$message({
              message: '保存失败',
              type: 'warning'
            });
          }
        })
        .catch((error)=>{
          this.$notify.error({
            title: '错误',
            message: error,
            duration:0,
          });
        });
    },
    }
  }