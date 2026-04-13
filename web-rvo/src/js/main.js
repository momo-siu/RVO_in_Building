import axios from 'axios'
// import global from '../\\Configure\\GlobalPage.vue'
import * as echarts from 'echarts';
import * as XLSX from 'xlsx'
import saveAs from 'file-saver'
// import Heatmap from 'heatmap.js';
import simpleheat from 'simpleheat';  
import html2canvas from 'html2canvas' ;
import { ThreeFloorViewer } from '../three/ThreeFloorViewer';

// import Vue from 'vue';

// import pako from 'pako';
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
         * 14:房间内直线交点
         * 15:光标置于导航点
         * 16:光标置于出口
         * 17:出口选中
         * 18:背景拖动
         * 19:渲染中
         * 20:密度区域划定
         * 21:旋转房间
         * 22:新建人口框
         * 23:选中人口框
         * 24:光标停在人口框
         * 25:拖动人口框
         * 26:拖动人口框内元素
         * 27:人口框内直线交点
         * 28:光标置于密度区域
         * 29:选中密度区域
         * 30:拖动出口
         * 31:拖动密度区域
         */
        isDrawing:0,//是否处于渲染
        isUpdate:0,//是否处于更新

        /** 表示状态是否开始 0-未开始 1-已开始 */
        createNewRoom:0,//新建房屋
        createNewPeos:0, // 新建人口框
        createNewExit:0,//新建出口
        createNewLocal:0,//新建框

        numMoving:-1,//拖动房间内点的数组位置
        numMovingPeos:-1,//拖动人口框内点的数组位置 
        numMovingNav:-1,//拖动导航点的数组位置
        numMovingExit:-1,//准备删除的出口点的数组位置
        numMovingKs:-1,//拖动的选定框数组位置
        numMoveingex:-1, // 拖动出口数组位置
        overlapRoom:-1,
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

        exitRule:{
          currentID:-1,
          currentViewID:-1,
          oldX:0,//房屋移动原点
          oldY:0,//房屋移动原点
          oldXBuff:0,//房屋移动原点(用于缓冲)
          oldYBuff:0,//房屋移动原点(用于缓冲)
          numLine:0,//选中的边
      },
      ksRule:{
        currentID:-1,
        currentViewID:-1,
        oldX:0,//房屋移动原点
        oldY:0,//房屋移动原点
        oldXBuff:0,//房屋移动原点(用于缓冲)
        oldYBuff:0,//房屋移动原点(用于缓冲)
        numLine:0,//选中的边
    },

        PeosRule:{
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

      res1:{},
      res2:{},
      res3:{},
      selectedNumber: [],
      numberOptions:[],
      selectMethodALL_1:[],
      old_selectMethod:[],

        pointsNav: [],//导航点
        pointsNavView: [],//导航点连线渲染
        backImg:[],

        rooms:[],
        peos:[],
        random_peos:42, // 人口随机数
        exits:[],
        ks:[],  // 人口密度统计框

        // 2D 构建仅针对单层；用 store 保存所有楼层数据
        floor2D:{
          current: 0, // 内部 floorId：0=>F1, 1=>F2, -1=>B1
          floors: [0],
          store: {}, // floorId -> { rooms, peos, exits, pointsNav, pointsNavView, ks }
          initialized: false
        },
        dialogVisible_newFloor:false,
        newFloorCandidates:{ below: -1, above: 1 },
        newFloorForm:{
          targetFloor: 1,
          mode:'empty', // 'empty' | 'copy'
          templateFloor: 0
        },


        //提交演算
        up:{
          stageMessage:'',
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
          targetFps:30,
          frameInterval:1000/30,
          maxCatchupFrames:3,
          lastFrameTime:0,
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
          peos:[],
          exits:[],
          pointsNav:[],
          pointsNavView:[],
          ks:[],
          viewInfo:null,
        },

        canvas: null,
        ctx: null,
        canvasBuffer:null,
        ctxBuffer:null, 

        canvas_heat: null,
        ctx_heat: null,
        threeViewer: null,
        view3D:{
          enabled:false,
          floorHeight:150,
          floorFilter:'all',
          onlyCurrentFloor:false,
          teleportDurationMs:2000,
          occlusionGrayPerLayer:0.25,
          occlusionGrayMax:0.9,
          replayAgentStyle:'cylinder',
          agentVisualConfig:{
            cylinder:{
              radius:2,
              height:6,
              radialSegments:10
            },
            capsule:{
              radius:0.18,
              length:0.5,
              capSegments:4,
              radialSegments:8
            },
            human:{
              scale:1
            }
          }
        },
        scaleLabel:'--',
        zoomLabel:'1.0x',


        heatmapInstance:null,
        d:null,

        repeat_rooms:-1,
        repeat_peos:-1,

        //是否绘制
        // isDrawing: false,
        // isDragging: false,//绘制时是否
        // weightOptions:[
        //   {value:1,label:"0-10min"},
        //   {value:2,label:"0-20min"},
        //   {value:3,label:"0-30min"},
        //   {value:4,label:"0-40min"},
        // ],
        
        viewInfo:{
          isViewRoom:true,
          isViewNav:true,
          isViewPeos:true,
          isViewHeat:false,
          isViewRoomId:true,
          isViewPeosId:true,
          isViewExportId:true,
          isViewRoomName:true,
          isViewPeosName:true,
          isViewExportName:true,
          isViewBorder:true,
          isViewImg :true,
          isViewPeoses:true,
          preIsViewNav:true,
          isViewKs:true,  // 是否看见密度统计框

          sT:0,//比例尺显示
          scale:0,//真实比例差距(1:?)
          imgX0:0,
          imgX1:0,
          imgY0:0,
          imgY1:0,
          fontSize:20,
        },
        navEdit:{
          active:false,
          showPoints:false,
          selectedIndex:-1,
          prevViewNav:false,
        },
        copyT:-1,
        myImg:new Image(),
        color: 'rgba(19, 206, 102, 0.8)',
        dialogVisible_attr:false, // 房间
        dialogVisible_attr_2:false, // 出口
        dialogVisible_attr_3:false, // 人口框
        dialogVisible_attr_4:false, // 设置时间模拟值
        dialogVisible_attr_5:false, // 设置选择出口方案
        dialogVisible_attr_6:false, // 选择最终方案

        drawConfig:[
          {element:"房间墙壁",r:1,state:true,default:1,color:'rgb(0,0,0)'},
          {element:"墙壁交点",r:1,state:true,default:1,color:'rgb(0,0,0)'},
          {element:"人口点",r:1,state:true,default:1,color:'rgb(0,0,0)'},
          {element:"导航点",r:5,state:true,default:5,color:'rgb(255,0,0)'},
          {element:"导航线",r:1,state:true,default:1,color:'rgb(180,20,20)'},
          {element:"房间底色",r: null, state: true, default: null, color:'rgba(33, 205, 215, 0.2)'},
          {element:"蒙版颜色",r: 1, state: true, default: null, color:'rgba(0,0,0, 0.3)'},
          {element:"蒙版边框",r: 1, state: true, default: null, color:'rgb(0,0,0)'},
          {element:"背景颜色",r: null, state: true, default: null, color:'rgb(7,41,72)'},
          {element:"人物颜色1",r: null, state: true, default: null, color:'rgb(208, 247, 187)'},
          {element:"人物颜色2",r: null, state: true, default: null, color:'rgb(208, 247, 187)'},
          {element:"人口框底色",r: null, state: true, default: null, color:'rgba(33, 205, 215, 0.2)'},
          {element:"人口框交点",r:1,state:true,default:1,color:'rgb(0,0,0)'},
          {element:"人口框墙壁",r:1,state:true,default:1,color:'rgb(0,0,0)'},
        ],

        simulateConfig:[
          {argument:"集合点数量最小值",weight:1},
          {argument:"集合点数量最大值",weight:2},
        ],
        temp1:20,
        temp2:20,
        temp3:20,
        nameKs:'',
        weightKs:0,
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
          dialogVisible_attr_show_4:false,
          dialogVisible_attr_show_5:false,
          dialogVisible_attr_show_6:false,
          dialogVisible_attr_show_7:false,
          dialogVisible_attr_show_8:false,
          dialogVisible_attr_show_9:false,
          dialogVisible_attr_show_10:false,
          dialogVisible_attr_show_11:false,
          dialogVisible_attr_show_12:false,
          dialogVisible_attr_show_13:false,
          dialogVisible_attr_show_14:false,
          dialogVisible_attr_show_15:false,
          dialogVisible_attr_show_16:false,
          dialogVisible_attr_show_17:false,
          dialogVisible_attr_show_19:false,

          tabPosition:'graph',
          table_raw:[],//原始数据
          table_raw_label:[],//原始数据列表生成,
          table_raw_method:[], // 方案指标列表

          typeChoose:'介绍',

          socketState:0,
          dialogVisible:false,
          status:0,

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

          dialogVisible_7:false,
          dialogVisible_8:false,
          dialogVisible_9:false,//选定框
          radio_mode:'在线模式',
          animationSetting:{
            scheme:'time',
            plan:'',
            plans:[],
            color:''
          },
          playbackConfig:{
            scheme:'time',
            file:'1',
            status:1
          },
          animationState: 'paused', // paused, playing, finished
          playbackSpeed:1,
          playbackSpeedOptions:[
            { label:'0.5x', value:0.5 },
            { label:'1x', value:1 },
            { label:'2x', value:2 },
            { label:'3x', value:3 },
            { label:'5x', value:5 }
          ],

          newarea:{
            x0:0,y0:0,x1:0,y1:0,x2:0,y2:0,x3:0,y3:0,
          },

          selectMethod: [], // 选择的出口方案 
          selectMethodALL: [], // 所有可选出口方案 
          selectMethodALLResult: [], // 模拟结果
          selectMethodTotalNums: 0, // 全楼不同编号集合点总数
          selectMethodDetail: [],
          selectM: '',  //最终选择的方案

          smode:'人数',
          isEdit:false,

          statistic:false,
          totalNum:0,

          tempName:'',
      };
      //解决人物错位问题
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

    //创建时初始化
    created(){
      this.updateDocumentTitle();
      this.fetchProjectMeta();
      // var cached2 = this.getItem('cached1');
      // if (cached2) {
      //   var res = JSON.parse(cached2);
      //   if(res.data.msg==='success'){
      //     //比例尺更新
      //     if(res.data.data.width<res.data.data.height){
      //       this.bST.bTX=res.data.data.height/this.canvas.height;
      //       this.viewInfo.sT=this.bST.bTX*70;
      //       this.viewInfo.imgX0=(this.canvas.width-res.data.data.width/this.bST.bTX)/2;
      //       this.viewInfo.imgX1=this.viewInfo.imgX0+res.data.data.width/this.bST.bTX;
      //       this.viewInfo.imgY0=0;
      //       this.viewInfo.imgY1=this.canvas.height;
      //     }
      //     else{
      //       this.viewInfo.scale=res.data.data.width/this.canvas.width;
      //       this.bST.bTX=res.data.data.width/this.canvas.width;
      //       this.viewInfo.sT=this.bST.bTX*70;
      //       this.viewInfo.imgX0=0;
      //       this.viewInfo.imgX1=this.canvas.width;
      //       this.viewInfo.imgY0=(this.canvas.height-res.data.data.height/this.bST.bTX)/2;
      //       this.viewInfo.imgY1=this.viewInfo.imgY0+res.data.data.height/this.bST.bTX;
      //     }
      //     this.draw();
      //     var cached4 = this.getItem('cached2');
      // if(cached4) {
      //   res = JSON.parse(cached4);
      //   if(res.data.msg==='success'){
      //     this.myImg.src =  restweburl+res.data.data;
      //     this.myImg.onload=()=>
      //     {            
      //       this.ctxBuffer.drawImage(this.myImg, this.viewInfo.imgX0, this.viewInfo.imgY0, this.viewInfo.imgX1-this.viewInfo.imgX0, this.viewInfo.imgY1-this.viewInfo.imgY0);
      //       this.draw();
      //     }
      // }
      // }
      // }
      // }
      // console.log("2")
      // var cached3 = this.getItem('cached3');
      // if(cached3){
      //   res = JSON.parse(cached3);
      //   if(res.data.msg==='success'){
      //     this.myImg.src =  restweburl+res.data.data;
      //     this.myImg.onload=()=>
      //     {
      //       this.ctxBuffer.drawImage(this.myImg, this.viewInfo.imgX0, this.viewInfo.imgY0, this.viewInfo.imgX1-this.viewInfo.imgX0, this.viewInfo.imgY1-this.viewInfo.imgY0);
      //       setTimeout(() => {
      //         this.draw();
      //       }, 2000);
      //     }
      // }

      // }
      // console.log("3")
      // var cached = this.getItem('cached4');
      // if(cached){
      //   res = JSON.parse(cached);
      //   //其余信息加载
      //   this.pointsNav = res.data.data.pointsNav;//导航点
      //   this.pointsNavView= res.data.data.pointsNavView;//导航点
      //   this.exits= res.data.data.exits;//门点
      //   this.numberOptions = res.data.data.numberOptions;//门点

      //   // 如果集合点确实peoNum添加上
      //   // 颜色
      //   for (let i = 0; i < this.exits.length; i++){
      //     // 检查当前出口对象是否具有color属性
      //     if (!Object.prototype.hasOwnProperty.call(this.exits[i], 'color')) {
      //       // 如果不存在color属性，则设置默认颜色
      //       this.exits[i].color = 'rgba(255,255,255,1)';
      //     }
      //     if (!Object.prototype.hasOwnProperty.call(this.exits[i], 'peoNum')) {
      //       // 如果不存在peoNum属性，则设置默认颜色
      //       this.exits[i].peoNum = parseInt(10000);
      //     }
      //   }
      //   this.rooms=res.data.data.rooms;
      //   if (res.data.data.peos) {
      //     this.peos = res.data.data.peos;
      //   } else {
      //     this.peos = []; // 当peos不存在时，初始化为空数组
      //   }
      //   this.viewInfo= res.data.data.viewInfo;
      //   this.drawConfig= res.data.data.drawConfig;
      //   this.simulateConfig = res.data.data.simulateConfig;
      //   if(this.simulateConfig == null || this.simulateConfig.length != 3){
      //     this.simulateConfig = [
      //       {argument:"集合点数量最小值",weight:Number(1)},
      //       {argument:"集合点数量最小值",weight:Number(1)},
      //       {argument:"集合点数量最大值",weight:Number(1)},
      //     ];
      //   }
      //   if(this.simulateConfig[0].argument === "集合点数量最小值"){
      //     this.simulateConfig = [
      //       {argument:"集合点数量最小值",weight:Number(1)},
      //       {argument:"集合点数量最小值",weight:Number(1)},
      //       {argument:"集合点数量最大值",weight:Number(1)},
      //     ];
      //   }
      //   this.simulateConfig.forEach(a=>{
      //     a.weight = Number(a.weight);
      //   })

      //   this.selectMethod = res.data.data.selectMethod; // 选择的出口方案 
      //   this.selectMethodALL = res.data.data.selectMethodALL  // 所有可选出口方案 
      //   this.selectMethodALLResult = res.data.data.selectMethodALLResult;  // 模拟结果
      //   this.old_selectMethod = res.data.data.old_selectMethod;

      //   this.drawConfig[2].state=false;
      //   this.drawConfig_color= res.data.data.drawConfig_color;
      //   // 将房间编号统一
      //   for(let i = 0; i < this.rooms.length; i++){
      //     this.rooms[i].attr.id = i + 1;
      //     this.rooms[i].rid = i+ 1;
      //   }
      //   // 人口框编号统一
      //   // 将房间编号统一
      //   for(let i = 0; i < this.peos.length; i++){
      //     this.peos[i].attr.id = i + 1;
      //     this.peos[i].rid = i+ 1;
      //   }
      //   // 集合点编号统一
      //   for(let i = 0; i < this.exits.length; i++){
      //     this.exits[i].id = i+1;
      //     this.exits[i].x2 = Math.max(this.exits[i].x0,this.exits[i].x2);
      //     this.exits[i].x0 = Math.min(this.exits[i].x0,this.exits[i].x2);
      //     this.exits[i].y2 = Math.max(this.exits[i].y0,this.exits[i].y2);
      //     this.exits[i].y0 = Math.min(this.exits[i].y0,this.exits[i].y2);
      //     this.exits[i].x1 = this.exits[i].x2;
      //     this.exits[i].x3 = this.exits[i].x0;
      //     this.exits[i].y1 = this.exits[i].y0;
      //     this.exits[i].y3 = this.exits[i].y2;
      //   }

      //   // 删除废弃元素
      //   let roomColorExists = this.drawConfig.some(item => item.element === "表格颜色"|| item.element === undefined);
      //   // 如果存在，则删除"表格颜色"元素
      //   if (roomColorExists) {
      //     this.drawConfig = this.drawConfig.filter(item => item.element !== "表格颜色" || item.element !== undefined);
      //   }
        
      //   // 添加元素
      //   roomColorExists = this.drawConfig.some(item => item.element === "房间底色");
      //   // 如果不存在，则添加"房间底色"元素
      //   if (!roomColorExists) {
      //     this.drawConfig.push({
      //       element: "房间底色",
      //       r: null, // 或者适当的默认值
      //       state: true, // 或者适当的默认值
      //       default: null, // 或者适当的默认值
      //       color: 'rgba(33, 205, 215, 0.2)' // 或者适当的默认值
      //     });
      //   }
      //   roomColorExists = this.drawConfig.some(item => item.element === "蒙版颜色");

      //   // 如果不存在，则添加"蒙版颜色"元素
      //   if (!roomColorExists) {
      //     this.drawConfig.push({
      //       element: "蒙版颜色",
      //       r: 1, // 或者适当的默认值
      //       state: true, // 或者适当的默认值
      //       default: null, // 或者适当的默认值
      //       color: 'rgba(0,0,0, 0.3)' // 或者适当的默认值
      //     });
      //   }
      //   roomColorExists = this.drawConfig.some(item => item.element === "蒙版边框");

      //   // 如果不存在，则添加"蒙版边框"元素
      //   if (!roomColorExists) {
      //     this.drawConfig.push({
      //       element: "蒙版边框",
      //       r: 1, // 或者适当的默认值
      //       state: true, // 或者适当的默认值
      //       default: null, // 或者适当的默认值
      //       color: 'rgb(0,0,0)' // 或者适当的默认值
      //     });
      //   }

      //   roomColorExists = this.drawConfig.some(item => item.element === "背景颜色");
      //   // 如果不存在，则添加"背景颜色"元素
      //   if (!roomColorExists) {
      //     this.drawConfig.push({
      //       element: "背景颜色",
      //       r: null, // 或者适当的默认值
      //       state: true, // 或者适当的默认值
      //       default: null, // 或者适当的默认值
      //       color: 'rgb(7,41,72)' // 或者适当的默认值
      //     });
      //   }
        
      //   roomColorExists = this.drawConfig.some(item => item.element === "人物颜色1");
      //   // 如果不存在，则添加"人物颜色1"元素
      //   if (!roomColorExists) {
      //     this.drawConfig.push({
      //       element: "人物颜色1",
      //       r: null, // 或者适当的默认值
      //       state: true, // 或者适当的默认值
      //       default: null, // 或者适当的默认值
      //       color: 'rgb(255,0,0)'
      //     });
      //   }
      //   roomColorExists = this.drawConfig.some(item => item.element === "人物颜色2");
      //   // 如果不存在，则添加"人物颜色2"元素
      //   if (!roomColorExists) {
      //     this.drawConfig.push({
      //       element: "人物颜色2",
      //       r: null, // 或者适当的默认值
      //       state: true, // 或者适当的默认值
      //       default: null, // 或者适当的默认值
      //       color: 'rgb(0,255,0)'
      //     });
      //   }
        
      //   roomColorExists = this.drawConfig.some(item => item.element === "人口框交点");
      //   // 如果不存在，则添加"人口框交点"元素,'
      //   if (!roomColorExists) {
      //     this.drawConfig.push({
      //       element: "人口框交点",
      //       r: 1, // 或者适当的默认值
      //       state: true, // 或者适当的默认值
      //       default: 1, // 或者适当的默认值
      //       color: 'rgb(0,0,0)' // 或者适当的默认值
      //     });
      //   }

      //   roomColorExists = this.drawConfig.some(item => item.element === "人口框墙壁");
      //   // 如果不存在，则添加"人口框墙壁"元素,'
      //   if (!roomColorExists) {
      //     this.drawConfig.push({
      //       element: "人口框墙壁",
      //       r: 1, // 或者适当的默认值
      //       state: true, // 或者适当的默认值
      //       default: 1, // 或者适当的默认值
      //       color: 'rgb(0,0,0)' // 或者适当的默认值
      //     });
      //   }

      //   roomColorExists = this.drawConfig.some(item => item.element === "人口框底色");
      //   // 如果不存在，则添加"人口框底色"元素
      //   if (!roomColorExists) {
      //     this.drawConfig.push({
      //       element: "人口框底色",
      //       r: null, // 或者适当的默认值
      //       state: true, // 或者适当的默认值
      //       default: null, // 或者适当的默认值
      //       color: 'rgba(33, 205, 215, 0.2)' // 或者适当的默认值
      //     });
      //   }

      //   this.viewInfo.isViewNav = false; // 默认不显示
      //   this.nST = res.data.data.nST;
      //   this.bST = res.data.data.bST;
      //   if(res.data.data.ks!=undefined){
      //     this.ks = res.data.data.ks;
      //   }

      //   // 确保元素顺序
      //   // 定义一个顺序列表
      //   const orderList = [
      //     '房间墙壁',
      //     '墙壁交点',
      //     '人口点',
      //     '导航点',
      //     '导航线',
      //     '房间底色',
      //     '蒙版颜色',
      //     '蒙版边框',
      //     '背景颜色',
      //     '人物颜色1',
      //     '人物颜色2',
      //     '人口框底色',
      //     '人口框交点',
      //     '人口框墙壁',
      //   ];
      //   // 将this.drawConfig按要求变换顺序
      //   // 使用 map 方法创建一个新的数组，其中包含按照指定顺序排列的对象
      //   const newDrawConfig = orderList.map(element => {
      //     // 遍历原始的 drawConfig 数组，找到匹配的元素
      //     const matchingElement = this.drawConfig.find(config => config.element === element);
      //     // 确保找到匹配的元素，否则返回一个空对象
      //     return matchingElement || {};
      //   });

      //   // 将新的 drawConfig 数组赋值给 this.drawConfig
      //   this.drawConfig = newDrawConfig;

      //   // 现在 this.drawConfig 数组已经按照指定的顺序排列
      //   this.draw();
      //   console.log("初始化成功")
      //   return;
      // }
      let loading = null;
      if (this.getItem("first")){
        loading = this.$loading({
            lock: true,
            text: '正在连接服务器',
            spinner: 'el-icon-loading',
            background: 'rgba(0, 0, 0, 0.7)',
          });
      }else{
        this.setItem("first",false);
      }
          this.myImg.crossOrigin='';
      let url = restweburl + 'getBlueprint';
      const params = new URLSearchParams();

      params.append('bID',this.$route.params.bID);
      axios.post(url,params)
      .then((res) => {
        this.setItem('cached1',res);
        //首次打开项目
        if(res.data.data==null){
          this.$notify({
            title: '成功',
            message: '正在初始化项目，请稍等',
            type: 'success'
          });
          //获取比例尺
          url = restweburl + 'getSize';
          axios({
              url: url,
              method: "post",
              data:{
                  bID:this.$route.params.bID,
              }
          })
          .then((res) => {
            this.setItem('cached2',res);
            if(res.data.msg==='success'){
                const blueprintWidth = Number(res.data.data.width) || 0;
                const blueprintHeight = Number(res.data.data.height) || 0;
                if (blueprintWidth > 0 && blueprintHeight > 0) {
                  const canvasWidth = this.canvas.width;
                  const canvasHeight = this.canvas.height;
                  const widthScale = blueprintWidth / canvasWidth;
                  const heightScale = blueprintHeight / canvasHeight;
                  if (widthScale >= heightScale) {
                    this.bST.bTX = widthScale;
                    this.viewInfo.scale = widthScale;
                    this.viewInfo.sT = this.bST.bTX * 70;
                    this.viewInfo.imgX0 = 0;
                    this.viewInfo.imgX1 = canvasWidth;
                    const displayHeight = blueprintHeight / this.bST.bTX;
                    this.viewInfo.imgY0 = (canvasHeight - displayHeight) / 2;
                    this.viewInfo.imgY1 = this.viewInfo.imgY0 + displayHeight;
                  } else {
                    this.bST.bTX = heightScale;
                    this.viewInfo.scale = heightScale;
                    this.viewInfo.sT = this.bST.bTX * 70;
                    const displayWidth = blueprintWidth / this.bST.bTX;
                    this.viewInfo.imgX0 = (canvasWidth - displayWidth) / 2;
                    this.viewInfo.imgX1 = this.viewInfo.imgX0 + displayWidth;
                    this.viewInfo.imgY0 = 0;
                    this.viewInfo.imgY1 = canvasHeight;
                  }
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
                  this.setItem('cached3',res);
                    if(res.data.msg==='success'){
                        this.myImg.src =  restweburl+res.data.data;
                        this.myImg.crossOrigin = 'anonymous';
                        this.myImg.onload=()=>
                        {
                          const naturalWidth = this.myImg.naturalWidth || this.myImg.width || 0;
                          const naturalHeight = this.myImg.naturalHeight || this.myImg.height || 0;
                          this.fitBackgroundToCanvas(naturalWidth, naturalHeight, { updateBase: true });
                          this.ctxBuffer.drawImage(
                            this.myImg,
                            this.viewInfo.imgX0,
                            this.viewInfo.imgY0,
                            this.viewInfo.imgX1 - this.viewInfo.imgX0,
                            this.viewInfo.imgY1 - this.viewInfo.imgY0
                          );
                          this.draw();
                          this.save();
                          setTimeout(() => {
                            if (this.getItem("first")) loading.close();
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
        this.setItem('cached4',res);
          if(res.data.msg==='success' && res.data.data){
              this.myImg = new Image();
              this.myImg.crossOrigin = 'anonymous';
              this.myImg.onload=()=>
              {
                const naturalWidth = this.myImg.naturalWidth || this.myImg.width || 0;
                const naturalHeight = this.myImg.naturalHeight || this.myImg.height || 0;
                if (naturalWidth > 0 && naturalHeight > 0 && this.shouldAutoCenterScene()) {
                  this.fitBackgroundToCanvas(naturalWidth, naturalHeight, { updateBase: true });
                }
                this.viewInfo.isViewImg = true;
                setTimeout(() => {
                  if (this.getItem("first")) loading.close();
                  this.draw();
                }, 200);
              };
              this.myImg.onerror = () => {
                // 底图加载失败时，仅关闭 loading，继续使用无底图模式
                this.viewInfo.isViewImg = false;
                if (this.getItem("first")) loading.close();
                this.draw();
              };
              this.myImg.src =  restweburl+res.data.data;
          } else {
              // 无底图数据：允许无底图进入 project
              this.viewInfo.isViewImg = false;
              if (this.getItem("first")) loading.close();
              this.draw();
          }
      }).catch((error) =>{
        this.viewInfo.isViewImg = false;
        if (this.getItem("first")) loading.close();
        this.draw();
        this.$notify.error({
            title: '错误',
            message: error,
            duration: 0,
            offset: 100
        });
      });
      //其余信息加载
      this.pointsNav = res.data.data.pointsNav;//导航点
      this.pointsNavView= res.data.data.pointsNavView;//导航点
      this.exits= res.data.data.exits;//门点

      this.numberOptions = res.data.data.numberOptions;//门点

     // 如果集合点确实peoNum添加上
            // 颜色
            for (let i = 0; i < this.exits.length; i++){
              // 检查当前出口对象是否具有color属性
              if (!Object.prototype.hasOwnProperty.call(this.exits[i], 'color')) {
                // 如果不存在color属性，则设置默认颜色
                this.exits[i].color = 'rgba(255,255,255,1)';
              }
              if (!Object.prototype.hasOwnProperty.call(this.exits[i], 'peoNum')) {
                // 如果不存在peoNum属性，则设置默认颜色
                this.exits[i].peoNum = parseInt(10000);
              }
            }
            this.rooms=res.data.data.rooms;
            if (res.data.data.peos) {
              this.peos = res.data.data.peos;
            } else {
              this.peos = []; // 当peos不存在时，初始化为空数组
            }
            this.viewInfo= res.data.data.viewInfo;
            this.drawConfig= res.data.data.drawConfig;
            this.simulateConfig = res.data.data.simulateConfig;
            if(this.simulateConfig == null || this.simulateConfig.length != 2){
              this.simulateConfig = [
                {argument:"集合点数量最小值",weight:1},
                {argument:"集合点数量最大值",weight:2},
              ];
            }
            if(this.simulateConfig[0].argument !== "集合点数量最小值" || this.simulateConfig[1].argument !== "集合点数量最大值"){
              this.simulateConfig = [
                {argument:"集合点数量最小值",weight:1},
                {argument:"集合点数量最大值",weight:2},
              ];
            }

            this.selectMethod = res.data.data.selectMethod; // 选择的出口方案 
            this.selectMethodALL = res.data.data.selectMethodALL  // 所有可选出口方案 
            this.selectMethodALLResult = res.data.data.selectMethodALLResult;  // 模拟结果
            this.old_selectMethod = res.data.data.old_selectMethod;

            this.drawConfig[2].state=false;
            this.drawConfig_color= res.data.data.drawConfig_color;
            // 将房间编号统一
            for(let i = 0; i < this.rooms.length; i++){
              this.rooms[i].attr.id = i + 1;
              this.rooms[i].rid = i+ 1;
            }
            // 人口框编号统一
            // 将房间编号统一
            for(let i = 0; i < this.peos.length; i++){
              this.peos[i].attr.id = i + 1;
              this.peos[i].rid = i+ 1;
            }
            // 集合点编号统一 - 兼容新旧格式
            for(let i = 0; i < this.exits.length; i++){
              const existingId = this.exits[i].id;
              const isNewFormat = String(existingId).includes('-');
              if (isNewFormat) {
                const parsed = this.parseExitId(existingId);
                this.exits[i].teleportTarget = parsed.teleportTarget;
              } else {
                const floorId = Number(this.exits[i].floorId) || 0;
                const num = Number(existingId) || (i + 1);
                let teleportTarget = '';
                if (floorId !== 0) {
                  teleportTarget = String(num);
                }
                this.exits[i].id = `${floorId}-${num}-${teleportTarget}`;
                this.exits[i].teleportTarget = teleportTarget;
              }
              this.exits[i].x2 = Math.max(this.exits[i].x0,this.exits[i].x2);
              this.exits[i].x0 = Math.min(this.exits[i].x0,this.exits[i].x2);
              this.exits[i].y2 = Math.max(this.exits[i].y0,this.exits[i].y2);
              this.exits[i].y0 = Math.min(this.exits[i].y0,this.exits[i].y2);
              this.exits[i].x1 = this.exits[i].x2;
              this.exits[i].x3 = this.exits[i].x0;
              this.exits[i].y1 = this.exits[i].y0;
              this.exits[i].y3 = this.exits[i].y2;
            }

            // 初始化多楼层数据：2D 仅编辑当前楼层（默认 F1）
            this.initFloorStoreFromCurrentArrays();

            // 删除废弃元素
            let roomColorExists = this.drawConfig.some(item => item.element === "表格颜色"|| item.element === undefined);
            // 如果存在，则删除"表格颜色"元素
            if (roomColorExists) {
              this.drawConfig = this.drawConfig.filter(item => item.element !== "表格颜色" || item.element !== undefined);
            }
            
            // 添加元素
            roomColorExists = this.drawConfig.some(item => item.element === "房间底色");
            // 如果不存在，则添加"房间底色"元素
            if (!roomColorExists) {
              this.drawConfig.push({
                element: "房间底色",
                r: null, // 或者适当的默认值
                state: true, // 或者适当的默认值
                default: null, // 或者适当的默认值
                color: 'rgba(33, 205, 215, 0.2)' // 或者适当的默认值
              });
            }
            roomColorExists = this.drawConfig.some(item => item.element === "蒙版颜色");

            // 如果不存在，则添加"蒙版颜色"元素
            if (!roomColorExists) {
              this.drawConfig.push({
                element: "蒙版颜色",
                r: 1, // 或者适当的默认值
                state: true, // 或者适当的默认值
                default: null, // 或者适当的默认值
                color: 'rgba(0,0,0, 0.3)' // 或者适当的默认值
              });
            }
            roomColorExists = this.drawConfig.some(item => item.element === "蒙版边框");

            // 如果不存在，则添加"蒙版边框"元素
            if (!roomColorExists) {
              this.drawConfig.push({
                element: "蒙版边框",
                r: 1, // 或者适当的默认值
                state: true, // 或者适当的默认值
                default: null, // 或者适当的默认值
                color: 'rgb(0,0,0)' // 或者适当的默认值
              });
            }

            roomColorExists = this.drawConfig.some(item => item.element === "背景颜色");
            // 如果不存在，则添加"背景颜色"元素
            if (!roomColorExists) {
              this.drawConfig.push({
                element: "背景颜色",
                r: null, // 或者适当的默认值
                state: true, // 或者适当的默认值
                default: null, // 或者适当的默认值
                color: 'rgb(7,41,72)' // 或者适当的默认值
              });
            }
            
            roomColorExists = this.drawConfig.some(item => item.element === "人物颜色1");
            // 如果不存在，则添加"人物颜色1"元素
            if (!roomColorExists) {
              this.drawConfig.push({
                element: "人物颜色1",
                r: null, // 或者适当的默认值
                state: true, // 或者适当的默认值
                default: null, // 或者适当的默认值
                color: 'rgb(255,0,0)'
              });
            }
            roomColorExists = this.drawConfig.some(item => item.element === "人物颜色2");
            // 如果不存在，则添加"人物颜色2"元素
            if (!roomColorExists) {
              this.drawConfig.push({
                element: "人物颜色2",
                r: null, // 或者适当的默认值
                state: true, // 或者适当的默认值
                default: null, // 或者适当的默认值
                color: 'rgb(0,255,0)'
              });
            }
            
            roomColorExists = this.drawConfig.some(item => item.element === "人口框交点");
            // 如果不存在，则添加"人口框交点"元素,'
            if (!roomColorExists) {
              this.drawConfig.push({
                element: "人口框交点",
                r: 1, // 或者适当的默认值
                state: true, // 或者适当的默认值
                default: 1, // 或者适当的默认值
                color: 'rgb(0,0,0)' // 或者适当的默认值
              });
            }

            roomColorExists = this.drawConfig.some(item => item.element === "人口框墙壁");
            // 如果不存在，则添加"人口框墙壁"元素,'
            if (!roomColorExists) {
              this.drawConfig.push({
                element: "人口框墙壁",
                r: 1, // 或者适当的默认值
                state: true, // 或者适当的默认值
                default: 1, // 或者适当的默认值
                color: 'rgb(0,0,0)' // 或者适当的默认值
              });
            }

            roomColorExists = this.drawConfig.some(item => item.element === "人口框底色");
            // 如果不存在，则添加"人口框底色"元素
            if (!roomColorExists) {
              this.drawConfig.push({
                element: "人口框底色",
                r: null, // 或者适当的默认值
                state: true, // 或者适当的默认值
                default: null, // 或者适当的默认值
                color: 'rgba(33, 205, 215, 0.2)' // 或者适当的默认值
              });
            }

            this.viewInfo.isViewNav = false; // 默认不显示
            this.nST = res.data.data.nST;
            this.bST = res.data.data.bST;
            if(res.data.data.ks!=undefined){
              this.ks = res.data.data.ks;
            }

            // 确保元素顺序
            // 定义一个顺序列表
            const orderList = [
              '房间墙壁',
              '墙壁交点',
              '人口点',
              '导航点',
              '导航线',
              '房间底色',
              '蒙版颜色',
              '蒙版边框',
              '背景颜色',
              '人物颜色1',
              '人物颜色2',
              '人口框底色',
              '人口框交点',
              '人口框墙壁',
            ];
            // 将this.drawConfig按要求变换顺序
            // 使用 map 方法创建一个新的数组，其中包含按照指定顺序排列的对象
            const newDrawConfig = orderList.map(element => {
              // 遍历原始的 drawConfig 数组，找到匹配的元素
              const matchingElement = this.drawConfig.find(config => config.element === element);
              // 确保找到匹配的元素，否则返回一个空对象
              return matchingElement || {};
            });

            // 将新的 drawConfig 数组赋值给 this.drawConfig
            this.drawConfig = newDrawConfig;

            // 数据规范化处理
            for(let i = 0;i< this.ks.length;i++){
              this.ks[i].speed = Number(this.ks[i].speed);
              this.ks[i].name = String(this.ks[i].name);
            }
            for(let i = 0;i<this.simulateConfig.length;i++){
              this.simulateConfig[i].weight = Number(this.simulateConfig[i].weight);
              console.log(this.simulateConfig[i].weight);
            }
          }).catch((error)=>{
            this.$notify.error({
              title: '错误',
              message: error,
              duration:0,
            });
          });
          // this.drawRoomPeo();
          // this.drawPeosPeo();
          // this.selectMethodALL_1.forEach(item=> {
          //   console.log(item.selection);
          //   // 等表格数据加载完成后
          //      this.$nextTick(() => {
          //       if(this.selectMethodDetail.some(detail => detail.method === item.method)){
          //         this.$refs.multipleTable.toggleRowSelection(this.selectMethodALL_1[index], true);
          //         console.log("save");
          //       }                   
          //      })

          //  })
    },
    
    mounted() {
      
      this.canvas = this.$refs.canvas;
      this.dpr = window.devicePixelRatio || 1;
      const dpr = this.dpr;
      const width = this.canvas.offsetWidth;
      const height = this.canvas.offsetHeight;
      console.log("画布大小" + width);
      this.canvas.width = width*dpr;
      this.canvas.height = height*dpr;
      this.canvas.style.width = width+'px';
      this.canvas.style.height = height+'px';
      this.ctx = this.canvas.getContext('2d');
      //this.ctx.scale(dpr,dpr);
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      this.ctx.mozImageSmoothingEnabled = false;
      this.ctx.webkitImageSmoothingEnabled = false;
      this.ctx.msImageSmoothingEnabled = false;
      this.ctx.oImageSmoothingEnabled = false;
      // 创建离屏 canvas
      this.canvasBuffer = document.createElement("canvas");
      this.ctxBuffer = this.canvasBuffer.getContext('2d');
      this.canvasBuffer.width = width*dpr;
      this.canvasBuffer.height = height*dpr;
      //this.ctxBuffer.scale(dpr,dpr);
      // heatmap canvas
      this.canvas_heat = document.getElementById("heatmap");
      this.ctx_heat = this.canvas_heat.getContext('2d');
      //this.ctx_heat.scale(dpr, dpr);
      this.ctxBuffer.imageSmoothingEnabled = true;
      this.ctxBuffer.imageSmoothingQuality = 'high';

      this.bindCanvasEvents();

      window.addEventListener('keydown', this.handleKey);
      window.addEventListener('keydown', this.handleKeydown);
      window.addEventListener('keydown', this.saveContent)
      window.addEventListener('copy', this.handleCopy);
      window.addEventListener('paste', this.handlePaste);
      window.addEventListener('resize', this.resize)
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      this.canvas.addEventListener("wheel", this.handleScroll, { passive: false });

      this.initCanvasSize();
      this.refresh();
      window.requestAnimationFrame(this.refresh);

      this.heatmapInstance  = simpleheat(document.getElementById("heatmap"));
      
    },
    beforeDestroy() {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      this.unbindCanvasEvents();
      this.destroyThreeViewer();
      window.removeEventListener('keydown', this.handleKey);
      window.removeEventListener('keydown', this.handleKeydown);
      window.removeEventListener('keydown', this.saveContent);
      window.removeEventListener('copy', this.handleCopy);
      window.removeEventListener('paste', this.handlePaste);
      window.removeEventListener('resize', this.resize);
    },

    methods: {
      saveAndClose() {
        this.save();
        this.$notify({
          title: '保存成功',
          message: '项目数据已保存，正在关闭页面...',
          type: 'success'
        });
        setTimeout(() => {
          window.close();
        }, 1000);
      },
      floorIdLabel(fid){
        const n = Number(fid);
        if (Number.isNaN(n)) return 'F1';
        if (n >= 0) return `F${n + 1}`;
        return `B${Math.abs(n)}`;
      },
      parseExitId(exitId){
        if (!exitId || typeof exitId !== 'string') {
          return { floor: 0, num: Number(exitId) || 1, teleportTarget: '' };
        }
        const parts = exitId.split('-');
        if (parts.length < 2) {
          return { floor: 0, num: Number(exitId) || 1, teleportTarget: '' };
        }
        return {
          floor: Number(parts[0]) || 0,
          num: Number(parts[1]) || 1,
          teleportTarget: parts[2] || ''
        };
      },
      getExitDisplayId(exit){
        const parsed = this.parseExitId(exit.id);
        if (parsed.teleportTarget) {
          return `${parsed.num}→${parsed.teleportTarget}`;
        }
        return String(parsed.num);
      },
      sortFloorIds(ids){
        return Array.from(new Set((ids || []).map((v) => Number(v)).filter((v) => !Number.isNaN(v)))).sort((a, b) => a - b);
      },
      getFloor2DOptions(){
        if (!this.floor2D || !Array.isArray(this.floor2D.floors)) return [0];
        return this.sortFloorIds(this.floor2D.floors);
      },
      getAllFloorsSnapshot(){
        // 确保当前楼层最新编辑写回 store
        this.persistCurrentFloorToStore();
        const floors = this.getFloor2DOptions();
        const store = (this.floor2D && this.floor2D.store) ? this.floor2D.store : {};
        const all = {
          rooms: [],
          peos: [],
          exits: [],
          pointsNav: [],
          pointsNavView: [],
          ks: []
        };

        let navOffset = 0;
        floors.forEach((fid) => {
          const bucket = store[fid] || {};
          const nav = Array.isArray(bucket.pointsNav) ? bucket.pointsNav : [];
          const navView = Array.isArray(bucket.pointsNavView) ? bucket.pointsNavView : [];
          all.rooms = all.rooms.concat(Array.isArray(bucket.rooms) ? bucket.rooms : []);
          all.peos = all.peos.concat(Array.isArray(bucket.peos) ? bucket.peos : []);
          all.exits = all.exits.concat(Array.isArray(bucket.exits) ? bucket.exits : []);
          all.ks = all.ks.concat(Array.isArray(bucket.ks) ? bucket.ks : []);
          all.pointsNav = all.pointsNav.concat(nav);
          // pointsNavView 的 a/b 依赖 pointsNav 索引，合并时需要偏移
          all.pointsNavView = all.pointsNavView.concat(navView.map((ln) => ({
            ...ln,
            a: (ln && ln.a != null) ? Number(ln.a) + navOffset : ln.a,
            b: (ln && ln.b != null) ? Number(ln.b) + navOffset : ln.b
          })));
          navOffset += nav.length;
        });

        return all;
      },
      ensureFloorIdsOnLoadedData(){
        const defaultFid = 0;
        const ensure = (obj, key = 'floorId') => {
          if (!obj || typeof obj !== 'object') return;
          if (obj[key] === undefined || obj[key] === null || obj[key] === '') obj[key] = defaultFid;
          obj[key] = Number(obj[key]);
          if (Number.isNaN(obj[key])) obj[key] = defaultFid;
        };
        (this.rooms || []).forEach((r) => {
          ensure(r, 'floorId');
          if (Array.isArray(r.walls)) {
            r.walls.forEach((p) => {
              if (!p || typeof p !== 'object') return;
              if (p.floorId === undefined) p.floorId = r.floorId;
            });
          }
        });
        (this.peos || []).forEach((g) => {
          ensure(g, 'floorId');
          if (Array.isArray(g.walls)) g.walls.forEach((p) => { if (p && p.floorId === undefined) p.floorId = g.floorId; });
          if (Array.isArray(g.peos)) g.peos.forEach((p) => { if (p && p.floorId === undefined) p.floorId = g.floorId; });
        });
        (this.exits || []).forEach((e) => ensure(e, 'floorId'));
        (this.ks || []).forEach((k) => ensure(k, 'floorId'));
        (this.pointsNav || []).forEach((p) => ensure(p, 'floorId'));
      },
      initFloorStoreFromCurrentArrays(){
        this.ensureFloorIdsOnLoadedData();

        const floors = new Set([0]);
        (this.rooms || []).forEach((r) => floors.add(Number(r.floorId ?? 0)));
        (this.exits || []).forEach((e) => floors.add(Number(e.floorId ?? 0)));
        (this.peos || []).forEach((g) => floors.add(Number(g.floorId ?? 0)));
        (this.ks || []).forEach((k) => floors.add(Number(k.floorId ?? 0)));
        (this.pointsNav || []).forEach((p) => floors.add(Number(p.floorId ?? 0)));

        const floorList = this.sortFloorIds(Array.from(floors));
        const store = {};

        // 先分 nav：需要重建 pointsNavView 的索引
        const navByFloor = {};
        const navIndexMapByFloor = {};
        floorList.forEach((fid) => { navByFloor[fid] = []; navIndexMapByFloor[fid] = new Map(); });
        (this.pointsNav || []).forEach((p, idx) => {
          const fid = Number(p.floorId ?? 0);
          if (!navByFloor[fid]) { navByFloor[fid] = []; navIndexMapByFloor[fid] = new Map(); floorList.push(fid); }
          const newIdx = navByFloor[fid].length;
          navByFloor[fid].push(p);
          navIndexMapByFloor[fid].set(idx, newIdx);
        });

        const navViewByFloor = {};
        floorList.forEach((fid) => { navViewByFloor[fid] = []; });
        (this.pointsNavView || []).forEach((ln) => {
          if (!ln) return;
          const a = Number(ln.a);
          const b = Number(ln.b);
          if (Number.isNaN(a) || Number.isNaN(b) || !this.pointsNav[a] || !this.pointsNav[b]) return;
          const fa = Number(this.pointsNav[a].floorId ?? 0);
          const fb = Number(this.pointsNav[b].floorId ?? 0);
          if (fa !== fb) return;
          const map = navIndexMapByFloor[fa];
          if (!map) return;
          const na = map.get(a);
          const nb = map.get(b);
          if (na == null || nb == null) return;
          navViewByFloor[fa].push({ ...ln, a: na, b: nb });
        });

        this.floor2D = this.floor2D || {};
        this.floor2D.floors = this.sortFloorIds(floorList);
        this.floor2D.store = {};
        this.floor2D.floors.forEach((fid) => {
          store[fid] = {
            rooms: (this.rooms || []).filter((r) => Number(r.floorId ?? 0) === fid),
            peos: (this.peos || []).filter((g) => Number(g.floorId ?? 0) === fid),
            exits: (this.exits || []).filter((e) => Number(e.floorId ?? 0) === fid),
            ks: (this.ks || []).filter((k) => Number(k.floorId ?? 0) === fid),
            pointsNav: navByFloor[fid] || [],
            pointsNavView: navViewByFloor[fid] || []
          };
        });
        this.floor2D.store = store;
        this.floor2D.initialized = true;

        // 默认切到 F1（floorId=0）
        const defaultFloor = this.floor2D.floors.includes(0) ? 0 : this.floor2D.floors[0];
        this.switch2DFloor(defaultFloor);
      },
      persistCurrentFloorToStore(){
        if (!this.floor2D || !this.floor2D.initialized) return;
        const fid = Number(this.floor2D.current ?? 0);
        this.floor2D.store[fid] = {
          rooms: JSON.parse(JSON.stringify(this.rooms || [])),
          peos: JSON.parse(JSON.stringify(this.peos || [])),
          exits: JSON.parse(JSON.stringify(this.exits || [])),
          ks: JSON.parse(JSON.stringify(this.ks || [])),
          pointsNav: JSON.parse(JSON.stringify(this.pointsNav || [])),
          pointsNavView: JSON.parse(JSON.stringify(this.pointsNavView || []))
        };
      },
      resetSelectionStates(){
        this.TID = 0;
        this.roomRule.currentID = -1;
        this.roomRule.currentViewID = -1;
        this.PeosRule.currentID = -1;
        this.PeosRule.currentViewID = -1;
        this.exitRule.currentID = -1;
        this.exitRule.currentViewID = -1;
        this.ksRule.currentID = -1;
        this.ksRule.currentViewID = -1;
        this.numMoving = -1;
        this.numMovingPeos = -1;
        this.numMovingNav = -1;
        this.numMovingExit = -1;
        this.numMovingKs = -1;
      },
      switch2DFloor(nextFloor){
        const next = Number(nextFloor);
        if (!this.floor2D) return;
        if (!this.floor2D.initialized) {
          this.floor2D.current = Number.isNaN(next) ? 0 : next;
          return;
        }
        const cur = Number(this.floor2D.current ?? 0);
        if (!Number.isNaN(cur) && cur !== next) {
          this.persistCurrentFloorToStore();
        }
        if (!this.floor2D.store[next]) {
          this.floor2D.store[next] = { rooms: [], peos: [], exits: [], pointsNav: [], pointsNavView: [], ks: [] };
        }
        this.floor2D.current = next;
        const bucket = this.floor2D.store[next];
        this.rooms = JSON.parse(JSON.stringify(bucket.rooms || []));
        this.peos = JSON.parse(JSON.stringify(bucket.peos || []));
        this.exits = JSON.parse(JSON.stringify(bucket.exits || []));
        this.pointsNav = JSON.parse(JSON.stringify(bucket.pointsNav || []));
        this.pointsNavView = JSON.parse(JSON.stringify(bucket.pointsNavView || []));
        this.ks = JSON.parse(JSON.stringify(bucket.ks || []));

        // 同步 backup 为“当前楼层”的数据
        this.backup.rooms = JSON.parse(JSON.stringify(this.rooms));
        this.backup.peos = JSON.parse(JSON.stringify(this.peos));
        this.backup.exits = JSON.parse(JSON.stringify(this.exits));
        this.backup.pointsNav = JSON.parse(JSON.stringify(this.pointsNav));
        this.backup.pointsNavView = JSON.parse(JSON.stringify(this.pointsNavView));
        this.backup.ks = JSON.parse(JSON.stringify(this.ks));

        this.resetSelectionStates();
        this.draw();
      },
      recomputeNewFloorCandidates(){
        const floors = this.getFloor2DOptions();
        const minF = floors.length ? Math.min(...floors) : 0;
        const maxF = floors.length ? Math.max(...floors) : 0;
        this.newFloorCandidates = { below: minF - 1, above: maxF + 1 };
      },
      openNewFloorDialog(){
        if (!this.floor2D || !this.floor2D.initialized) {
          // 还未初始化时，先基于当前数组初始化 store（至少保证 F1）
          this.initFloorStoreFromCurrentArrays();
        }
        this.persistCurrentFloorToStore();
        this.recomputeNewFloorCandidates();
        this.newFloorForm.mode = 'empty';
        this.newFloorForm.targetFloor = this.newFloorCandidates.above;
        this.newFloorForm.templateFloor = Number(this.floor2D.current ?? 0);
        this.dialogVisible_newFloor = true;
      },
      applyFloorIdToClonedObjects(list, fid){
        (list || []).forEach((obj) => {
          if (!obj || typeof obj !== 'object') return;
          obj.floorId = fid;
          if (Array.isArray(obj.walls)) {
            obj.walls.forEach((p) => { if (p && typeof p === 'object') p.floorId = fid; });
          }
          if (Array.isArray(obj.peos)) {
            obj.peos.forEach((p) => { if (p && typeof p === 'object') p.floorId = fid; });
          }
        });
      },
      confirmCreateNewFloor(){
        const fid = Number(this.newFloorForm.targetFloor);
        if (Number.isNaN(fid)) return;
        if (!this.floor2D || !this.floor2D.initialized) return;
        if (this.floor2D.floors.includes(fid)) {
          this.$message({ type:'warning', message:'该楼层已存在' });
          return;
        }
        this.persistCurrentFloorToStore();

        let bucket = { rooms: [], peos: [], exits: [], pointsNav: [], pointsNavView: [], ks: [] };
        if (this.newFloorForm.mode === 'copy') {
          const tpl = Number(this.newFloorForm.templateFloor);
          const src = this.floor2D.store[tpl];
          if (src) {
            bucket = JSON.parse(JSON.stringify(src));
            this.applyFloorIdToClonedObjects(bucket.rooms, fid);
            this.applyFloorIdToClonedObjects(bucket.peos, fid);
            (bucket.exits || []).forEach((e) => { if (e) e.floorId = fid; });
            (bucket.ks || []).forEach((k) => { if (k) k.floorId = fid; });
            (bucket.pointsNav || []).forEach((p) => { if (p) p.floorId = fid; });
          }
        }
        this.floor2D.store[fid] = bucket;
        this.floor2D.floors = this.sortFloorIds(this.floor2D.floors.concat([fid]));
        this.dialogVisible_newFloor = false;
        this.switch2DFloor(fid);
        if (this.view3D.enabled && this.threeViewer) this.syncThreeSceneData();
      },
      bindCanvasEvents() {
        if (!this.canvas) {
          return;
        }
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('dblclick', this.handleDbMouseDown);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('contextmenu', this.handleContextMenu);
        this.canvas.addEventListener("wheel", this.handleScroll, { passive: false });
      },
      unbindCanvasEvents() {
        if (!this.canvas) {
          return;
        }
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('dblclick', this.handleDbMouseDown);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
        this.canvas.removeEventListener("wheel", this.handleScroll);
      },
      resolveThreeAgentStyle() {
        const inReplay = this.TID === 11 || this.TID === 19;
        if (!inReplay) {
          return 'cylinder';
        }
        const replayStyle = this.view3D && this.view3D.replayAgentStyle;
        if (replayStyle === 'none' || replayStyle === 'capsule') {
          return 'none';
        }
        return 'cylinder';
      },
      applyThreeAgentStyle(syncFrame = false) {
        if (!this.threeViewer) {
          return;
        }
        this.threeViewer.setAgentVisualConfig(this.view3D.agentVisualConfig);
        this.threeViewer.setAgentStyle(this.resolveThreeAgentStyle());
        if (syncFrame && this.show && Array.isArray(this.show.showPeople)) {
          this.syncThreeReplayFrame(this.show.showPeople);
        }
      },
      onReplayAgentStyleChange() {
        this.applyThreeAgentStyle(true);
      },
      onCylinderVisualChange() {
        const cfg = this.view3D && this.view3D.agentVisualConfig ? this.view3D.agentVisualConfig : null;
        if (!cfg || !cfg.cylinder) return;
        cfg.cylinder.radius = Math.min(2, Math.max(0.05, Number(cfg.cylinder.radius) || 0.18));
        cfg.cylinder.height = Math.min(6, Math.max(0.1, Number(cfg.cylinder.height) || 0.8));
        cfg.cylinder.radialSegments = Math.min(32, Math.max(3, Math.round(Number(cfg.cylinder.radialSegments) || 10)));
        this.applyThreeAgentStyle(true);
      },
      toggle3DView() {
        this.view3D.enabled = !this.view3D.enabled;
        if (this.view3D.enabled) {
          this.unbindCanvasEvents();
          this.$nextTick(() => {
            this.initThreeViewer();
            this.syncThreeSceneData();
            this.applyThreeAgentStyle(false);
            this.syncThreeReplayFrame(this.show.showPeople);
          });
        } else {
          this.bindCanvasEvents();
          this.destroyThreeViewer();
        }
      },
      initThreeViewer() {
        const container = this.$refs.threeContainer;
        if (!container) {
          return;
        }
        if (!this.threeViewer) {
          const mapWidth = Number(this.viewInfo && this.viewInfo.mapWidth ? this.viewInfo.mapWidth : 100);
          const mapHeight = Number(this.viewInfo && this.viewInfo.mapHeight ? this.viewInfo.mapHeight : 60);
          this.threeViewer = new ThreeFloorViewer({ 
            floorHeight: this.view3D.floorHeight,
            mapWidth,
            mapHeight,
            agentStyle: this.resolveThreeAgentStyle(),
            agentVisualConfig: this.view3D.agentVisualConfig,
            occlusionGrayPerLayer: this.view3D.occlusionGrayPerLayer,
            occlusionGrayMax: this.view3D.occlusionGrayMax
          });
          this.threeViewer.onZoomChange = (zoom) => {
            this.zoomLabel = `${zoom.toFixed(2)}x`;
          };
          this.threeViewer.init(container);
          this.$nextTick(() => this.applyFloorFilter());
        } else {
          this.threeViewer.occlusionGrayPerLayer = Number(this.view3D.occlusionGrayPerLayer) || 0.15;
          this.threeViewer.occlusionGrayMax = Number(this.view3D.occlusionGrayMax) || 0.9;
          this.threeViewer.resize();
          this.applyThreeAgentStyle(false);
        }
      },
      destroyThreeViewer() {
        if (this.threeViewer) {
          this.threeViewer.dispose();
          this.threeViewer = null;
        }
      },
      syncThreeSceneData() {
        if (!this.threeViewer) {
          return;
        }
        // 3D 展示需要全楼层数据
        const all = (this.floor2D && this.floor2D.initialized) ? this.getAllFloorsSnapshot() : {
          rooms: (Array.isArray(this.rooms) ? this.rooms : []),
          exits: (Array.isArray(this.exits) ? this.exits : []),
          peos: (Array.isArray(this.peos) ? this.peos : [])
        };
        this.threeViewer.setStaticScene({
          rooms: Array.isArray(all.rooms) ? all.rooms : [],
          exits: Array.isArray(all.exits) ? all.exits : [],
          peos: Array.isArray(all.peos) ? all.peos : []
        });
        this.rebuildReplay3DIndex({
          rooms: Array.isArray(all.rooms) ? all.rooms : [],
          exits: Array.isArray(all.exits) ? all.exits : [],
          peos: Array.isArray(all.peos) ? all.peos : []
        });
      },
      syncThreeReplayFrame(agents) {
        if (!this.threeViewer || !Array.isArray(agents)) {
          return;
        }
        this.threeViewer.setAgentStyle(this.resolveThreeAgentStyle());
        if (!this.replay3D || !this.replay3D.ready) {
          const all = (this.floor2D && this.floor2D.initialized) ? this.getAllFloorsSnapshot() : {
            rooms: (Array.isArray(this.rooms) ? this.rooms : []),
            exits: (Array.isArray(this.exits) ? this.exits : []),
            peos: (Array.isArray(this.peos) ? this.peos : [])
          };
          this.rebuildReplay3DIndex({
            rooms: Array.isArray(all.rooms) ? all.rooms : [],
            exits: Array.isArray(all.exits) ? all.exits : [],
            peos: Array.isArray(all.peos) ? all.peos : []
          });
        }
        const state = this.replay3D;
        const mapped = agents.map((agent) => {
          const id = Number(agent && agent.id);
          const x = Number(agent && agent.x);
          const y = Number(agent && agent.y);
          if (!Number.isFinite(id)) return null;
          const prev = state && state.prevById ? state.prevById.get(id) : null;
          const prevFloor = prev && Number.isFinite(prev.floorId) ? prev.floorId : null;
          const providedFloor = Number(agent && agent.floorId);
          const floorId = Number.isFinite(providedFloor) ? providedFloor : this.inferReplayAgentFloorId(x, y, prevFloor);
          const next = { x, y, floorId };
          const teleport = prev ? this.detectReplayTeleport(prev, next) : null;
          if (state && state.prevById) {
            state.prevById.set(id, next);
          }
          return {
            id,
            x,
            y,
            floorId,
            teleport: teleport ? {
              x: teleport.x,
              y: teleport.y,
              floorId: teleport.floorId,
              durationMs: teleport.durationMs
            } : undefined
          };
        }).filter(Boolean);
        this.threeViewer.updateAgents(mapped);
      },
      rebuildReplay3DIndex(input = {}) {
        const rooms = Array.isArray(input.rooms) ? input.rooms : [];
        const exits = Array.isArray(input.exits) ? input.exits : [];
        const peos = Array.isArray(input.peos) ? input.peos : [];

        this.replay3D = this.replay3D || {};
        this.replay3D.ready = false;
        this.replay3D.prevById = this.replay3D.prevById instanceof Map ? this.replay3D.prevById : new Map();
        this.replay3D.roomsByFloor = new Map();
        this.replay3D.peopleAreasByFloor = new Map();
        this.replay3D.exits = [];
        this.replay3D.exitsByFloorNum = new Map();
        this.replay3D.teleportLinks = [];
        this.replay3D.connectors = [];

        const addExitIndex = (floorId, num, exit) => {
          const f = Number(floorId);
          const n = Number(num);
          if (!Number.isFinite(f) || !Number.isFinite(n)) return;
          if (!this.replay3D.exitsByFloorNum.has(f)) {
            this.replay3D.exitsByFloorNum.set(f, new Map());
          }
          this.replay3D.exitsByFloorNum.get(f).set(n, exit);
        };

        const roomRidToFloor = new Map();
        rooms.forEach((room) => {
          if (!room || !Array.isArray(room.walls)) return;
          const floorId = Number(room.floorId ?? 0);
          if (Number.isFinite(Number(room.rid))) {
            roomRidToFloor.set(Number(room.rid), floorId);
          }
          const pts = this.extractReplayPolygon(room.walls);
          if (pts.length < 3) return;
          const bbox = this.computeReplayBBox(pts);
          if (!this.replay3D.roomsByFloor.has(floorId)) this.replay3D.roomsByFloor.set(floorId, []);
          this.replay3D.roomsByFloor.get(floorId).push({ points: pts, bbox });
        });

        peos.forEach((group) => {
          if (!group || !Array.isArray(group.walls)) return;
          let floorId = Number(group.floorId);
          if (!Number.isFinite(floorId)) {
            const rid = Number(group.rid);
            if (Number.isFinite(rid) && roomRidToFloor.has(rid)) {
              floorId = roomRidToFloor.get(rid);
            } else {
              floorId = 0;
            }
          }
          const pts = this.extractReplayPolygon(group.walls);
          if (pts.length < 3) return;
          const bbox = this.computeReplayBBox(pts);
          if (!this.replay3D.peopleAreasByFloor.has(floorId)) this.replay3D.peopleAreasByFloor.set(floorId, []);
          this.replay3D.peopleAreasByFloor.get(floorId).push({ points: pts, bbox });
        });

        exits.forEach((exit) => {
          if (!exit) return;
          const floorId = Number(exit.floorId ?? 0);
          const parsed = this.parseExitId(exit.id);
          const num = Number(parsed.num);
          const teleportTarget = parsed.teleportTarget ? String(parsed.teleportTarget) : '';
          const xs = [exit.x0, exit.x1, exit.x2, exit.x3].map((v) => Number(v)).filter((v) => Number.isFinite(v));
          const ys = [exit.y0, exit.y1, exit.y2, exit.y3].map((v) => Number(v)).filter((v) => Number.isFinite(v));
          if (xs.length < 2 || ys.length < 2) return;
          const minX = Math.min.apply(null, xs);
          const maxX = Math.max.apply(null, xs);
          const minZ = Math.min.apply(null, ys);
          const maxZ = Math.max.apply(null, ys);
          const centerX = (minX + maxX) / 2;
          const centerZ = (minZ + maxZ) / 2;
          const radius = Math.max((maxX - minX), (maxZ - minZ)) / 2 + 1;
          const info = {
            floorId,
            num,
            teleportTarget,
            bbox: { minX, maxX, minZ, maxZ },
            center: { x: centerX, z: centerZ },
            radius
          };
          this.replay3D.exits.push(info);
          addExitIndex(floorId, num, info);
        });

        this.replay3D.exits.forEach((from) => {
          const fromFloor = Number(from.floorId);
          if (!Number.isFinite(fromFloor) || fromFloor === 0) return;
          if (!from.teleportTarget) return;

          const targetFloor = fromFloor > 0 ? (fromFloor - 1) : (fromFloor + 1);
          const targetNum = Number(from.teleportTarget) || Number(from.num);
          if (!Number.isFinite(targetNum)) return;

          const byFloor = this.replay3D.exitsByFloorNum.get(targetFloor);
          const to = byFloor ? byFloor.get(targetNum) : null;
          if (!to) return;

          this.replay3D.teleportLinks.push({
            from,
            to,
            radius: Math.max(from.radius, to.radius, 2),
            durationMs: Number(this.view3D && this.view3D.teleportDurationMs) || 350
          });
        });

        this.replay3D.ready = true;
      },
      computeReplayBBox(points) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        points.forEach((p) => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minZ = Math.min(minZ, p.z);
          maxZ = Math.max(maxZ, p.z);
        });
        return { minX, maxX, minZ, maxZ };
      },
      extractReplayPolygon(rawWalls) {
        const segments = [];
        let current = [];
        const pushCurrent = () => {
          if (current.length >= 3) segments.push(current);
          current = [];
        };
        (Array.isArray(rawWalls) ? rawWalls : []).forEach((p) => {
          if (!p) return;
          const x = Number(p.x);
          const z = Number(p.y);
          if (!Number.isFinite(x) || !Number.isFinite(z) || x === -10000 || z === -10000) {
            pushCurrent();
            return;
          }
          const last = current[current.length - 1];
          if (last && Math.abs(last.x - x) < 1e-6 && Math.abs(last.z - z) < 1e-6) return;
          current.push({ x, z });
        });
        pushCurrent();
        if (segments.length === 0) return [];
        let pts = segments[0];
        for (let i = 1; i < segments.length; i++) {
          if (segments[i].length > pts.length) pts = segments[i];
        }
        if (pts.length >= 2) {
          const first = pts[0];
          const last = pts[pts.length - 1];
          if (Math.abs(first.x - last.x) < 1e-6 && Math.abs(first.z - last.z) < 1e-6) {
            pts = pts.slice(0, pts.length - 1);
          }
        }
        return pts;
      },
      pointInReplayPolygon(x, z, pts) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = pts[i].x;
          const zi = pts[i].z;
          const xj = pts[j].x;
          const zj = pts[j].z;
          const intersect = ((zi > z) !== (zj > z)) && (x < ((xj - xi) * (z - zi)) / (zj - zi + 0.0) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      },
      inferReplayAgentFloorId(x, y, prevFloorId) {
        const state = this.replay3D;
        if (!state || !state.ready) return Number(prevFloorId) || 0;
        const px = Number(x);
        const pz = Number(y);
        const prevFloor = Number(prevFloorId);

        const pointInExit = (exit) => {
          if (!exit || !exit.bbox) return false;
          const b = exit.bbox;
          return px >= b.minX && px <= b.maxX && pz >= b.minZ && pz <= b.maxZ;
        };

        if (Number.isFinite(prevFloor)) {
          const exits = state.exits.filter((e) => Number(e.floorId) === prevFloor);
          if (exits.some(pointInExit)) return prevFloor;
          const peopleAreas = state.peopleAreasByFloor ? (state.peopleAreasByFloor.get(prevFloor) || []) : [];
          for (let i = 0; i < peopleAreas.length; i++) {
            const r = peopleAreas[i];
            const b = r.bbox;
            if (px < b.minX || px > b.maxX || pz < b.minZ || pz > b.maxZ) continue;
            if (this.pointInReplayPolygon(px, pz, r.points)) return prevFloor;
          }
          const rooms = state.roomsByFloor.get(prevFloor) || [];
          for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            const b = r.bbox;
            if (px < b.minX || px > b.maxX || pz < b.minZ || pz > b.maxZ) continue;
            if (this.pointInReplayPolygon(px, pz, r.points)) return prevFloor;
          }
        }

        const exitMatches = state.exits.filter(pointInExit);
        if (exitMatches.length === 1) return Number(exitMatches[0].floorId) || 0;
        if (exitMatches.length > 1) {
          if (Number.isFinite(prevFloor) && exitMatches.some((e) => Number(e.floorId) === prevFloor)) return prevFloor;
          return Math.min.apply(null, exitMatches.map((e) => Number(e.floorId) || 0));
        }

        const candidateFloors = Array.from(new Set([
          ...Array.from(state.roomsByFloor.keys()),
          ...(state.peopleAreasByFloor ? Array.from(state.peopleAreasByFloor.keys()) : [])
        ]));
        const roomHitFloors = [];
        candidateFloors.forEach((fid) => {
          const peopleAreas = state.peopleAreasByFloor ? (state.peopleAreasByFloor.get(fid) || []) : [];
          for (let i = 0; i < peopleAreas.length; i++) {
            const r = peopleAreas[i];
            const b = r.bbox;
            if (px < b.minX || px > b.maxX || pz < b.minZ || pz > b.maxZ) continue;
            if (this.pointInReplayPolygon(px, pz, r.points)) {
              roomHitFloors.push(fid);
              return;
            }
          }
          const rooms = state.roomsByFloor.get(fid) || [];
          for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            const b = r.bbox;
            if (px < b.minX || px > b.maxX || pz < b.minZ || pz > b.maxZ) continue;
            if (this.pointInReplayPolygon(px, pz, r.points)) {
              roomHitFloors.push(fid);
              break;
            }
          }
        });
        if (roomHitFloors.length === 1) return Number(roomHitFloors[0]) || 0;
        if (roomHitFloors.length > 1) {
          if (Number.isFinite(prevFloor) && roomHitFloors.includes(prevFloor)) return prevFloor;
          return Math.min.apply(null, roomHitFloors.map((v) => Number(v) || 0));
        }

        // If no explicit geometric evidence is found, keep previous floor assignment.
        // This avoids random cross-floor flicker when floors overlap in 2D projection.
        if (Number.isFinite(prevFloor)) return prevFloor;
        let bestFloor = 0;
        let bestD2 = Infinity;
        state.exits.forEach((e) => {
          const dx = px - e.center.x;
          const dz = pz - e.center.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < bestD2) {
            bestD2 = d2;
            bestFloor = Number(e.floorId) || 0;
          }
        });
        return bestFloor;
      },
      detectReplayTeleport(prev, next) {
        const state = this.replay3D;
        if (!state || !state.ready) return null;
        const px = Number(prev.x);
        const pz = Number(prev.y);
        const nx = Number(next.x);
        const nz = Number(next.y);
        if (!Number.isFinite(px) || !Number.isFinite(pz) || !Number.isFinite(nx) || !Number.isFinite(nz)) return null;
        const dx = nx - px;
        const dz = nz - pz;
        const dist2 = dx * dx + dz * dz;
        if (dist2 < 25) return null;

        const near = (posX, posZ, target, radius) => {
          const ddx = posX - target.x;
          const ddz = posZ - target.z;
          return ddx * ddx + ddz * ddz <= radius * radius;
        };

        const teleportLinks = Array.isArray(state.teleportLinks) ? state.teleportLinks : [];
        for (let i = 0; i < teleportLinks.length; i++) {
          const link = teleportLinks[i];
          const r = Number(link.radius) || 2;
          if (near(px, pz, link.from.center, r) && near(nx, nz, link.to.center, r)) {
            return { x: nx, y: nz, floorId: Number(link.to.floorId) || 0, durationMs: Number(link.durationMs) || 350 };
          }
        }

        const connectors = Array.isArray(state.connectors) ? state.connectors : [];
        for (let i = 0; i < connectors.length; i++) {
          const c = connectors[i];
          const r = Number(c.radius) || 2;
          if (near(px, pz, c.entry, r) && near(nx, nz, c.exit, r)) {
            return { x: nx, y: nz, floorId: Number(c.toFloor) || 0, durationMs: Number(c.durationMs) || 350 };
          }
          if (near(px, pz, c.exit, r) && near(nx, nz, c.entry, r)) {
            return { x: nx, y: nz, floorId: Number(c.fromFloor) || 0, durationMs: Number(c.durationMs) || 350 };
          }
        }

        const pf = Number(prev.floorId);
        const nf = Number(next.floorId);
        if (Number.isFinite(pf) && Number.isFinite(nf) && pf !== nf) {
          return { x: nx, y: nz, floorId: nf, durationMs: Number(this.view3D && this.view3D.teleportDurationMs) || 350 };
        }
        return null;
      },
      getFloorFilterOptions() {
        const floors = new Set(this.getFloor2DOptions().length ? this.getFloor2DOptions() : [0]);
        (this.connectors || []).forEach((c) => { floors.add(Number(c.fromFloor)); floors.add(Number(c.toFloor)); });
        return Array.from(floors).sort((a, b) => a - b);
      },
      applyFloorFilter() {
        if (!this.threeViewer) return;
        const filter = this.view3D.floorFilter;
        const onlyCurrent = !!this.view3D.onlyCurrentFloor;
        this.threeViewer.setFloorFilter(filter === 'all' ? null : Number(filter), onlyCurrent);
      },

      fitBackgroundToCanvas(imageWidth, imageHeight, options = {}) {
        const { updateBase = false } = options;
        const canvasWidth = this.canvas ? this.canvas.width : 0;
        const canvasHeight = this.canvas ? this.canvas.height : 0;
        if (!canvasWidth || !canvasHeight || !imageWidth || !imageHeight) {
          return;
        }
        const widthRatio = canvasWidth / imageWidth;
        const heightRatio = canvasHeight / imageHeight;
        const scale = Math.min(widthRatio, heightRatio);
        const displayWidth = imageWidth * scale;
        const displayHeight = imageHeight * scale;
        const offsetX = (canvasWidth - displayWidth) / 2;
        const offsetY = (canvasHeight - displayHeight) / 2;
        
        // 记录旧的中心点坐标
        const oldCenterX = (this.viewInfo.imgX0 + this.viewInfo.imgX1) / 2;
        const oldCenterY = (this.viewInfo.imgY0 + this.viewInfo.imgY1) / 2;
        const newCenterX = offsetX + displayWidth / 2;
        const newCenterY = offsetY + displayHeight / 2;
        const dx = newCenterX - oldCenterX;
        const dy = newCenterY - oldCenterY;

        this.viewInfo.imgX0 = offsetX;
        this.viewInfo.imgY0 = offsetY;
        this.viewInfo.imgX1 = offsetX + displayWidth;
        this.viewInfo.imgY1 = offsetY + displayHeight;

        if (updateBase) {
          this.viewInfo.baseX0 = offsetX;
          this.viewInfo.baseY0 = offsetY;
          this.viewInfo.baseX1 = offsetX + displayWidth;
          this.viewInfo.baseY1 = offsetY + displayHeight;
        }

        // 同步移动所有场景元素，实现“以场景中心为页面中心”
        this.rooms.forEach(r => {
          if (Array.isArray(r.walls)) r.walls.forEach(p => { if(p.x !== -10000){ p.x += dx; p.y += dy; } });
          if (Array.isArray(r.peos)) r.peos.forEach(p => { p.x += dx; p.y += dy; });
          if (r.lca) { r.lca.X0 += dx; r.lca.Y0 += dy; r.lca.X1 += dx; r.lca.Y1 += dy; r.lca.Xm += dx; r.lca.Ym += dy; }
        });
        this.peos.forEach(g => {
          if (Array.isArray(g.walls)) g.walls.forEach(p => { if(p.x !== -10000){ p.x += dx; p.y += dy; } });
          if (Array.isArray(g.peos)) g.peos.forEach(p => { p.x += dx; p.y += dy; });
          if (g.lca) { g.lca.X0 += dx; g.lca.Y0 += dy; g.lca.X1 += dx; g.lca.Y1 += dy; g.lca.Xm += dx; g.lca.Ym += dy; }
        });
        this.exits.forEach(e => { e.x0 += dx; e.y0 += dy; e.x1 += dx; e.y1 += dy; e.x2 += dx; e.y2 += dy; e.x3 += dx; e.y3 += dy; });
        this.ks.forEach(k => { k.area.x0 += dx; k.area.y0 += dy; k.area.x1 += dx; k.area.y1 += dy; });
        this.pointsNav.forEach(p => { p.x += dx; p.y += dy; });
        
        this.draw();
      },
      shouldAutoCenterScene() {
        const hasRooms = Array.isArray(this.rooms) && this.rooms.some(room => Array.isArray(room.walls) && room.walls.length);
        const hasPeos = Array.isArray(this.peos) && this.peos.some(peo => Array.isArray(peo.walls) && peo.walls.length);
        const hasExits = Array.isArray(this.exits) && this.exits.length;
        const hasNav = Array.isArray(this.pointsNav) && this.pointsNav.length;
        const hasNavLines = Array.isArray(this.pointsNavView) && this.pointsNavView.length;
        const hasDensity = Array.isArray(this.ks) && this.ks.length;
        const hasContent = hasRooms || hasPeos || hasExits || hasNav || hasNavLines || hasDensity;
        return !hasContent;
      },
      drawCenteredLabel(text, centerX, centerY, font, color = 'black', offsetY = 0, ctx = this.ctxBuffer) {
        if (!ctx || !text) {
          return;
        }
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = font;
        const metrics = ctx.measureText(text);
        const textWidth = metrics && metrics.width ? metrics.width : 0;
        ctx.fillText(text, centerX - textWidth / 2, centerY + offsetY);
        ctx.restore();
      },
      updateDocumentTitle(name){
        if(name && typeof name === 'string' && name.trim().length > 0){
          document.title = `${name.trim()}-项目详情`;
        }else{
          document.title = '项目详情';
        }
      },
      fetchProjectMeta(){
        const url = restweburl + 'getInfo';
        axios.post(url,{ bID: String(this.$route.params.bID) })
          .then((res)=>{
            if(res.data && res.data.msg === 'success' && res.data.data){
              const info = res.data.data;
              this.xg.name = info.name || '';
              this.xg.description = info.description || '';
              this.xg.addr = info.addr || '';
              this.updateDocumentTitle(this.xg.name);
            }else{
              this.updateDocumentTitle();
            }
          })
          .catch(()=>{
            this.updateDocumentTitle();
          });
      },
      change(){
        this.$forceUpdate()
      },
      shouldIgnoreKeyEvent(event){
        if(!event){return false;}
        const target = event.target || event.srcElement;
        if(!target){return false;}
        const tagName = target.tagName ? target.tagName.toLowerCase() : '';
        const isEditable = target.isContentEditable;
        const classList = target.classList;
        const isElementInput = classList && classList.contains && classList.contains('el-input__inner');
        return tagName === 'input' || tagName === 'textarea' || isEditable || isElementInput;
      },
      calc(){
        this.totalNum=0;
        for(let i=0;i<this.rooms.length;i++){
          this.totalNum+=this.rooms[i].peos.length;
        }
        for(let i=0;i<this.peos.length;i++){
          this.totalNum+=this.peos[i].peos.length;
        }
      },
      
      rgbToRgba(){
        const rgbRegex = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/;
        const match = this.drawConfig[5].color.match(rgbRegex);
        let rgba = 'rgba(33, 205, 215, 0.2)';
        if (match) {
          // 提取RGB值
          const r = match[1];
          const g = match[2];
          const b = match[3];
          // 设置透明度
          const a = 0.2;
          rgba = `rgba(${r},${g}, ${b},${a})`;
        }
        return rgba;
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
        let rect = [];
        for(let i =0;i<this.ks.length;i++){
          rect.push({
            begin:parseFloat(this.ks[i].attr.startTime),
            end:parseFloat(this.ks[i].attr.endTime),
            x0:(this.ks[i].area.x0-this.viewInfo.imgX0)*this.nST.sT,
               y0:(this.ks[i].area.y0-this.viewInfo.imgY0)*this.nST.sT,
               x1:(this.ks[i].area.x1-this.viewInfo.imgX0)*this.nST.sT,
               y1:(this.ks[i].area.y1-this.viewInfo.imgY0)*this.nST.sT,
               x2:(this.ks[i].area.x2-this.viewInfo.imgX0)*this.nST.sT,
               y2:(this.ks[i].area.y2-this.viewInfo.imgY0)*this.nST.sT,
               x3:(this.ks[i].area.x3-this.viewInfo.imgX0)*this.nST.sT,
               y3:(this.ks[i].area.y3-this.viewInfo.imgY0)*this.nST.sT,
          });
        }
        
        let url = restweburl+'getDensity';
        axios({
          url: url,
          method: "post",
          data:{
            bID:this.$route.params.bID,
            imgX0:this.viewInfo.imgX0,
            imgX1:this.viewInfo.imgX1,
            imgY0:this.viewInfo.imgY0,
            imgY1:this.viewInfo.imgY1,
            rect:rect,
           }
         }).then((res) => {
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
        if (this.$el && this.$el.clientHeight) {
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
        }
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
                this.updateDocumentTitle(this.xg.name);
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

      },
      handleClose(){
        window.close();
      },
      handleExit(){
        // 检查是否在新标签页中打开
        if (window.opener) {
          // 如果是从其他页面打开的，关闭当前标签页
          window.close();
        } else {
          // 如果是直接访问的，跳转到首页
          this.$router.push('/');
        }
      },
      initWebSocket(file){
        this.socket = new WebSocket(wsip+this.$route.params.bID+ '/' +this.status+ '/' + file);
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
        if (!msg || typeof msg.data !== 'string' || msg.data === '' || msg.data === 'undefined' || msg.data === 'null') {
          return;
        }
        let data;
        try {
          data = JSON.parse(msg.data);
        } catch (e) {
          return;
        }
        const imgX0 = Number(this.viewInfo && this.viewInfo.imgX0) || 0;
        const imgY0 = Number(this.viewInfo && this.viewInfo.imgY0) || 0;
        const sT = Number(this.nST && this.nST.sT) || 1;
        const mapPoint = (p) => {
          if (!p || typeof p !== 'object') return;
          const x = Number(p.x);
          const y = Number(p.y);
          if (Number.isFinite(x)) p.x = x / sT + imgX0;
          if (Number.isFinite(y)) p.y = y / sT + imgY0;
        };
        if (Array.isArray(data)) {
          if (Array.isArray(data[0])) {
            data.forEach((frame) => (Array.isArray(frame) ? frame.forEach(mapPoint) : undefined));
          } else {
            data.forEach(mapPoint);
          }
        }
        if(this.show.clipData.length > 120){
          // 丢弃最旧的块，避免内存无限增长
          this.show.clipData.shift();
          this.show.bufferStartIndex = (this.show.bufferStartIndex || 0) + 1;
        }
        this.show.clipData.push(data);
        console.log("222",this.show.clipData);
        this.socketState=0;
      },
      sendSocket(msg){
        if (!this.socket || typeof this.socket.send !== 'function' || this.socket.readyState !== WebSocket.OPEN) {
          return;
        }
        this.socket.send(JSON.stringify(msg));
      },
      async fetchReplayFlat(flatIndex){
        const file = (this.playbackConfig && this.playbackConfig.file) ? this.playbackConfig.file : '1';
        const status = (this.playbackConfig && this.playbackConfig.status) ? this.playbackConfig.status : 1;
        const url = restweburl + 'getReplayFlat';
        const res = await axios({
          url,
          method: 'post',
          data: {
            bID: this.$route.params.bID,
            status,
            flat: flatIndex,
            file
          }
        });
        if (!res || !res.data || res.data.msg !== 'success') {
          throw new Error((res && res.data && res.data.msg) ? res.data.msg : '获取回放分片失败');
        }
        const clip = res.data.data;
        const imgX0 = Number(this.viewInfo && this.viewInfo.imgX0) || 0;
        const imgY0 = Number(this.viewInfo && this.viewInfo.imgY0) || 0;
        const sT = Number(this.nST && this.nST.sT) || 1;
        if (Array.isArray(clip)) {
          clip.forEach((frame) => {
            if (!Array.isArray(frame)) return;
            frame.forEach((p) => {
              if (!p || typeof p !== 'object') return;
              const x = Number(p.x);
              const y = Number(p.y);
              if (Number.isFinite(x)) p.x = x / sT + imgX0;
              if (Number.isFinite(y)) p.y = y / sT + imgY0;
            });
          });
        }
        if (this.show.clipData.length > 120) {
          this.show.clipData.shift();
          this.show.bufferStartIndex = (this.show.bufferStartIndex || 0) + 1;
        }
        this.show.clipData.push(clip);
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
          var that = this 
          if(this.pointsNav.length==0){ 
            that.$notify({
              title: '注意',
              message: "没有导航点",
              type: 'warning',
              offset: 100
            });
            return;
          }
          
          // that.$notify({
          //   title: '提示',
          //   message: '人物重分布中，正在校验人物状态...',
          //   type: 'warning',
          //   offset: 100
          // });

          // for(let i=0;i<this.rooms.length;i++){
          //   // this.roomRule.currentID=this.rooms[i].rid;
          //   this.roomRule.currentID=i;
          //   this.drawRoomPeo();
          // }

          that.$notify({
            title: '提示',
            message: '正在校验导航信息...',
            type: 'warning',
            offset: 200
          });

          var url = restweburl + 'getLines';
          axios({
              url: url,
              method: "post",
              data:{
                  exit:this.init_exit(),
                  rooms:this.init_rooms(),
                  navPos:this.init_navs(),
                  peos:this.init_poes(),
  
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
                      type: 'success',
                      offset: 150
                    });
                    this.isValid=true;
                  }
                  else{
                    that.$notify({
                        title: '注意',
                        message: res.data.data.message,
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
        setItem(key, value) {
          try {
            sessionStorage.setItem(key, JSON.stringify(value));
          } catch (error) {
            if (error && error.name === 'QuotaExceededError') {
              // 仅清理缓存类键，避免影响其他业务状态。
              ['cached1', 'cached2', 'cached3', 'cached4'].forEach((cacheKey) => {
                if (cacheKey !== key) {
                  sessionStorage.removeItem(cacheKey);
                }
              });
              try {
                sessionStorage.setItem(key, JSON.stringify(value));
              } catch (retryError) {
                // 缓存失败时降级为不缓存，不中断主流程。
              }
            }
          }
        },
        getItem(key) {
          const value = sessionStorage.getItem(key);
          if (!value) {
            return null;
          }
          try {
            const parsed = JSON.parse(value);
            // 兼容历史双重序列化的缓存内容。
            if (typeof parsed === 'string' && (parsed.startsWith('{') || parsed.startsWith('['))) {
              try {
                return JSON.parse(parsed);
              } catch (innerError) {
                return parsed;
              }
            }
            return parsed;
          } catch (error) {
            return null;
          }
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
        closeDialog() {
          this.dialogVisible_attr_show_1 = false;
        },
        closeDialog_6() {
          this.dialogVisible_attr_show_6 = false;
        },
        agreeChange_6(val){
          let that = this 
          this.initShow_6();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_6();
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
        closeDialog_2() {
          this.dialogVisible_attr_show_2 = false;
        },
        agreeChange_7(val){
          let that = this 
          this.initShow_7();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_7();
          }
        },
        closeDialog_7() {
          this.dialogVisible_attr_show_7 = false;
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
        closeDialog_3() {
          this.dialogVisible_attr_show_3 = false;
        },
        agreeChange_4(val){
          let that = this 
          this.initShow_4();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_4();
          }
        },
        closeDialog_4() {
          this.dialogVisible_attr_show_4 = false;
        },
        agreeChange_8(val){
          let that = this 
          this.initShow_8();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_8();
          }
        },
        closeDialog_8() {
          this.dialogVisible_attr_show_8 = false;
        },
        agreeChange_5(val){
          let that = this 
          this.initShow_5();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_5();
          }
        },
        closeDialog_5() {
          this.dialogVisible_attr_show_5 = false;
        },
        agreeChange_9(val){
          let that = this 
          this.initShow_9();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_9();
          }
        },
        closeDialog_9() {
          this.dialogVisible_attr_show_9 = false;
        },
        agreeChange_10(val){
          let that = this 
          this.initShow_10();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_10();
          }
        },
        closeDialog_10() {
          this.dialogVisible_attr_show_10 = false;
        },
        agreeChange_11(val){
          let that = this 
          this.initShow_11();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_11();
          }
        },
        closeDialog_11() {
          this.dialogVisible_attr_show_11 = false;
        },
        agreeChange_12(val){
          let that = this 
          this.initShow_12();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_12();
          }
        },
        closeDialog_12() {
          this.dialogVisible_attr_show_12 = false;
        },
        agreeChange_13(val){
          let that = this 
          this.initShow_13();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_13();
          }
        },
        closeDialog_13() {
          this.dialogVisible_attr_show_13 = false;
        },
        agreeChange_14(val){
          let that = this; 
          this.initShow_14();
          that.btnstatus = (val === 'graph') ? true : false;
          if(this.tabPosition != 'graph'){
            this.initShow_14();
          }
        },
        closeDialog_14() {
          this.dialogVisible_attr_show_14 = false;
        },
        agreeChange_15(val){
          let that = this; 
          this.initShow_15();
          that.btnstatus = (val === 'graph') ? true : false;
          if(this.tabPosition != 'graph'){
            this.initShow_15();
          }
        },
        closeDialog_15() {
          this.dialogVisible_attr_show_15 = false;
        },
        agreeChange_16(val){
          let that = this; 
          this.initShow_16();
          that.btnstatus = (val === 'graph') ? true : false;
          if(this.tabPosition != 'graph'){
            this.initShow_16();
          }
        },
        closeDialog_16() {
          this.dialogVisible_attr_show_16 = false;
        },
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
        closeDialog_19() {
          this.dialogVisible_attr_show_19 = false;
        },
        agreeChange_19(val){
          let that = this 
          this.initShow_19();
          that.btnstatus=(val==='graph')?true:false;
          if(this.tabPosition!='graph'){
            this.initShow_19();
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
                file:1,
                status:1
              }
          })
          .then(async (res) => {
              if(res.data.msg==='success'){
                if(this.tabPosition=='graph'){
                  // 基于准备好的dom，初始化echarts实例
                  var myChart;
                  myChart = echarts.init(document.getElementById('撤离人数-时间(时间优先)'));
                  // 绘制图表
                  var dat = {
                    tooltip: {},
                    xAxis: {
                      name:'时间/s',
                      type:'category',
                      data: res.data.data.time
                    },
                    yAxis: {
                      name:'人数/人',
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
                    grid: {
                      top: '100px', // 调整顶部距离，为图例留出空间
                      left: '3%',
                      right: '4%',
                      bottom: '3%',
                      containLabel: true
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
          this.table_raw = [];
          this.table_raw_label = [];
          this.$notify({
            title: '提示',
            message: '该统计模块已移除',
            type: 'info',
            offset: 100
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
                  myChart = echarts.init(document.getElementById('区域密度-时间'));
                  // 绘制图表
                  var dat = {
                    title: {
                      text: '区域密度-时间'
                    },
                    tooltip: {},
                    xAxis: {
                      name:'时间/s',
                      type:'category',
                      data: res.data.data.time
                    },
                    yAxis: {
                      name:'区域密度',
                      type:'value',
                      scale:true,
                    },
                    legend: {
                      data: ['density']
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
                  dat.series.push({name:'density',type:'line',data:res.data.data});
                  myChart.setOption(dat);
                }
                else if(this.tabPosition=='data'){
                  this.table_raw=[];this.table_raw_label=[];
                  //原始数据载入
                  for(let i=0;i<1;i++){
                    this.table_raw_label.push({label:'密度',prop:'密度'});
                  }
                  let dat_2=[];
                  for(let i=0;i<res.data.data.time.length;i++){
                    let dat_3={};
                    dat_3['密度']=res.data.data[i];
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
        initShow_4() {
          // 获取数据
          var url = restweburl + 'getExportStatistics';
          axios({
            url: url,
            method: "post",
            data: {
              bID: this.$route.params.bID,
              file:1,
              status:1
            }
          })
          .then(async (res) => {
            if (res.data.msg === 'success') {
              if (this.tabPosition === 'graph') {
                // 基于准备好的dom，初始化echarts实例
                var myChart = echarts.init(document.getElementById('撤离人数-时间直方图(时间优先)'));
                //let all_exit = res.data.data.exits[res.data.data.exits.length-1].data[res.data.data.exits[res.data.data.exits.length-1].data.length-1]
                let timeIntervals = res.data.data.time.filter((time, index) => index % 3 === 0);
                // 绘制图表
                var dat = {
                  title: {
                    text: '撤离人数-时间'
                  },
                  tooltip: {},
                  xAxis: {
                    name:'时间/s',
                    type:'category',
                    data: timeIntervals
                  },
                  yAxis: {
                    name:'人数/人',
                    type: 'value',
                    scale: true,
                  },
                  legend: {
                    data: []
                  },
                  series: [],
                  toolbox: {
                    show: true,
                    feature: {
                      mark: { show: true },
                      saveAsImage: { show: true },
                    }
                  },
                };
                //let all_exit = res.data.data.exits[res.data.data.exits.length-1].data[res.data.data.exits[res.data.data.exits.length-1].data.length-1]
                //图表数据载入
                for(let i=0;i<res.data.data.exits.length;i++){
                  // alert(res.data.data.exits[i].name)
                  dat.legend.data.push(res.data.data.exits[i].name);
                }
                for(let i=0;i<res.data.data.exits.length;i++){
                  let data = [];
                  for(let j=0;j<res.data.data.exits[i].data.length;j+=3){
                    if(j+2 < res.data.data.exits[i].data.length){
                      data.push((res.data.data.exits[i].data[j+2]-res.data.data.exits[i].data[j]))
                    }else if(j+1 < res.data.data.exits[i].data.length){
                      data.push((res.data.data.exits[i].data[j+1]-res.data.data.exits[i].data[j]))
                    }else{
                      data.push(0)
                    }
                  }
                  dat.series.push({name:res.data.data.exits[i].name,type:'bar',data});
                }
                myChart.setOption(dat);
                console.log(dat);
              } else if (this.tabPosition === 'data') {
                this.table_raw = []; this.table_raw_label = [];
                // 原始数据载入
                for (let i = 0; i < res.data.data.exits.length; i++) {
                  this.table_raw_label.push({ label: res.data.data.exits[i].name, prop: res.data.data.exits[i].name });
                }
                let dat_2 = [];
                //let all_exit = res.data.data.exits[res.data.data.exits.length-1].data[res.data.data.exits[res.data.data.exits.length-1].data.length-1]
                for (let i = 0; i < res.data.data.time.length; i++) {
                  let dat_3 = {};
                  for (let j = 0; j < res.data.data.exits.length; j++) {
                    if (i == 0){
                      dat_3[res.data.data.exits[j].name] = 0;
                    }else{
                      dat_3[res.data.data.exits[j].name] = (res.data.data.exits[j].data[i] - res.data.data.exits[j].data[i-1]);
                    }
                    
                  }
                  dat_2.push(dat_3);
                }
                this.table_raw = dat_2;
              }
            } else {
              this.$notify({
                title: '注意',
                message: res.data.msg,
                type: 'warning',
                offset: 100
              });
              this.isUpdate = 0;
            }
          }).catch((error) => {
            this.$notify.error({
              title: '错误',
              message: error,
              duration: 0,
              offset: 100
            });
            this.isUpdate = -1;
          });
        },
        initShow_5(){
          this.table_raw = [];
          this.table_raw_label = [];
          this.$notify({
            title: '提示',
            message: '该统计模块已移除',
            type: 'info',
            offset: 100
          });
        },
        initShow_6(){
          //获取数据
          var url = restweburl + 'getExportStatistics';
          axios({
              url: url,
              method: "post",
              data:{
                bID:this.$route.params.bID,
                file:2,
                status:2
              }
          })
          .then(async (res) => {
              if(res.data.msg==='success'){
                if(this.tabPosition=='graph'){
                  // 基于准备好的dom，初始化echarts实例
                  var myChart;
                  myChart = echarts.init(document.getElementById('撤离人数-时间(方案二)'));
                  // 绘制图表
                  var dat = {
                    title: {
                      text: '撤离人数-时间'
                    },
                    tooltip: {},
                    xAxis: {
                      name:'时间/s',
                      type:'category',
                      data: res.data.data.time
                    },
                    yAxis: {
                      name:'人数/人',
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
        initShow_7(){
          this.table_raw = [];
          this.table_raw_label = [];
          this.$notify({
            title: '提示',
            message: '该统计模块已移除',
            type: 'info',
            offset: 100
          });
        },
        initShow_8() {
          // 获取数据
          var url = restweburl + 'getExportStatistics';
          axios({
            url: url,
            method: "post",
            data: {
              bID: this.$route.params.bID,
              file:2,
              status:2
            }
          })
          .then(async (res) => {
            if (res.data.msg === 'success') {
              if (this.tabPosition === 'graph') {
                // 基于准备好的dom，初始化echarts实例
                var myChart = echarts.init(document.getElementById('撤离人数-时间直方图(方案二)'));
                //let all_exit = res.data.data.exits[res.data.data.exits.length-1].data[res.data.data.exits[res.data.data.exits.length-1].data.length-1]
                let timeIntervals = res.data.data.time.filter((time, index) => index % 3 === 0);
                // 绘制图表
                var dat = {
                  title: {
                    text: '撤离人数-时间'
                  },
                  tooltip: {},
                  xAxis: {
                    name:'时间/s',
                    type:'category',
                    data: timeIntervals
                  },
                  yAxis: {
                    name:'人数/人',
                    type: 'value',
                    scale: true,
                  },
                  legend: {
                    data: []
                  },
                  series: [],
                  toolbox: {
                    show: true,
                    feature: {
                      mark: { show: true },
                      saveAsImage: { show: true },
                    }
                  },
                };
                //let all_exit = res.data.data.exits[res.data.data.exits.length-1].data[res.data.data.exits[res.data.data.exits.length-1].data.length-1]
                //图表数据载入
                for(let i=0;i<res.data.data.exits.length;i++){
                  // alert(res.data.data.exits[i].name)
                  dat.legend.data.push(res.data.data.exits[i].name);
                }
                for(let i=0;i<res.data.data.exits.length;i++){
                  let data = [];
                  for(let j=0;j<res.data.data.exits[i].data.length;j+=3){
                    if(j+2 < res.data.data.exits[i].data.length){
                      data.push((res.data.data.exits[i].data[j+2]-res.data.data.exits[i].data[j]))
                    }else if(j+1 < res.data.data.exits[i].data.length){
                      data.push((res.data.data.exits[i].data[j+1]-res.data.data.exits[i].data[j]))
                    }else{
                      data.push(0)
                    }
                  }
                  dat.series.push({name:res.data.data.exits[i].name,type:'bar',data});
                }
                myChart.setOption(dat);
                console.log(dat);
              } else if (this.tabPosition === 'data') {
                this.table_raw = []; this.table_raw_label = [];
                // 原始数据载入
                for (let i = 0; i < res.data.data.exits.length; i++) {
                  this.table_raw_label.push({ label: res.data.data.exits[i].name, prop: res.data.data.exits[i].name });
                }
                let dat_2 = [];
                //let all_exit = res.data.data.exits[res.data.data.exits.length-1].data[res.data.data.exits[res.data.data.exits.length-1].data.length-1]
                for (let i = 0; i < res.data.data.time.length; i++) {
                  let dat_3 = {};
                  for (let j = 0; j < res.data.data.exits.length; j++) {
                    if (i == 0){
                      dat_3[res.data.data.exits[j].name] = 0;
                    }else{
                      dat_3[res.data.data.exits[j].name] = (res.data.data.exits[j].data[i] - res.data.data.exits[j].data[i-1]);
                    }
                    
                  }
                  dat_2.push(dat_3);
                }
                this.table_raw = dat_2;
              }
            } else {
              this.$notify({
                title: '注意',
                message: res.data.msg,
                type: 'warning',
                offset: 100
              });
              this.isUpdate = 0;
            }
          }).catch((error) => {
            this.$notify.error({
              title: '错误',
              message: error,
              duration: 0,
              offset: 100
            });
            this.isUpdate = -1;
          });
        },
        initShow_9(){
          this.table_raw = [];
          this.table_raw_label = [];
          this.$notify({
            title: '提示',
            message: '该统计模块已移除',
            type: 'info',
            offset: 100
          });
        },
        initShow_10(){
          //获取数据
          var url = restweburl + 'getExportStatistics';
          axios({
              url: url,
              method: "post",
              data:{
                bID:this.$route.params.bID,
                file:3,
                status:2
              }
          })
          .then(async (res) => {
              if(res.data.msg==='success'){
                if(this.tabPosition=='graph'){
                  // 基于准备好的dom，初始化echarts实例
                  var myChart;
                  myChart = echarts.init(document.getElementById('撤离人数-时间(方案三)'));
                  // 绘制图表
                  var dat = {
                    title: {
                      text: '撤离人数-时间'
                    },
                    tooltip: {},
                    xAxis: {
                      name:'时间/s',
                      type:'category',
                      data: res.data.data.time
                    },
                    yAxis: {
                      name:'人数/人',
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
        initShow_11(){
          this.table_raw = [];
          this.table_raw_label = [];
          this.$notify({
            title: '提示',
            message: '该统计模块已移除',
            type: 'info',
            offset: 100
          });
        },
        initShow_12() {
          // 获取数据
          var url = restweburl + 'getExportStatistics';
          axios({
            url: url,
            method: "post",
            data: {
              bID: this.$route.params.bID,
              file:2,
              status:2
            }
          })
          .then(async (res) => {
            if (res.data.msg === 'success') {
              if (this.tabPosition === 'graph') {
                // 基于准备好的dom，初始化echarts实例
                var myChart = echarts.init(document.getElementById('撤离人数-时间直方图(方案三)'));
                //let all_exit = res.data.data.exits[res.data.data.exits.length-1].data[res.data.data.exits[res.data.data.exits.length-1].data.length-1]
                let timeIntervals = res.data.data.time.filter((time, index) => index % 3 === 0);
                // 绘制图表
                var dat = {
                  title: {
                    text: '撤离人数-时间'
                  },
                  tooltip: {},
                  xAxis: {
                    name:'时间/s',
                    type:'category',
                    data: timeIntervals
                  },
                  yAxis: {
                    name:'人数/人',
                    type: 'value',
                    scale: true,
                  },
                  legend: {
                    data: []
                  },
                  series: [],
                  toolbox: {
                    show: true,
                    feature: {
                      mark: { show: true },
                      saveAsImage: { show: true },
                    }
                  },
                };
                //let all_exit = res.data.data.exits[res.data.data.exits.length-1].data[res.data.data.exits[res.data.data.exits.length-1].data.length-1]
                //图表数据载入
                for(let i=0;i<res.data.data.exits.length;i++){
                  // alert(res.data.data.exits[i].name)
                  dat.legend.data.push(res.data.data.exits[i].name);
                }
                for(let i=0;i<res.data.data.exits.length;i++){
                  let data = [];
                  for(let j=0;j<res.data.data.exits[i].data.length;j+=3){
                    if(j+2 < res.data.data.exits[i].data.length){
                      data.push((res.data.data.exits[i].data[j+2]-res.data.data.exits[i].data[j]))
                    }else if(j+1 < res.data.data.exits[i].data.length){
                      data.push((res.data.data.exits[i].data[j+1]-res.data.data.exits[i].data[j]))
                    }else{
                      data.push(0)
                    }
                  }
                  dat.series.push({name:res.data.data.exits[i].name,type:'bar',data});
                }
                myChart.setOption(dat);
                console.log(dat);
              } else if (this.tabPosition === 'data') {
                this.table_raw = []; this.table_raw_label = [];
                // 原始数据载入
                for (let i = 0; i < res.data.data.exits.length; i++) {
                  this.table_raw_label.push({ label: res.data.data.exits[i].name, prop: res.data.data.exits[i].name });
                }
                let dat_2 = [];
                //let all_exit = res.data.data.exits[res.data.data.exits.length-1].data[res.data.data.exits[res.data.data.exits.length-1].data.length-1]
                for (let i = 0; i < res.data.data.time.length; i++) {
                  let dat_3 = {};
                  for (let j = 0; j < res.data.data.exits.length; j++) {
                    if (i == 0){
                      dat_3[res.data.data.exits[j].name] = 0;
                    }else{
                      dat_3[res.data.data.exits[j].name] = (res.data.data.exits[j].data[i] - res.data.data.exits[j].data[i-1]);
                    }
                    
                  }
                  dat_2.push(dat_3);
                }
                this.table_raw = dat_2;
              }
            } else {
              this.$notify({
                title: '注意',
                message: res.data.msg,
                type: 'warning',
                offset: 100
              });
              this.isUpdate = 0;
            }
          }).catch((error) => {
            this.$notify.error({
              title: '错误',
              message: error,
              duration: 0,
              offset: 100
            });
            this.isUpdate = -1;
          });
        },
        initShow_13(){
          this.table_raw = [];
          this.table_raw_label = [];
          this.$notify({
            title: '提示',
            message: '该统计模块已移除',
            type: 'info',
            offset: 100
          });
        },
        // 获取方案数据
        closeMethod_1(){
          this.dialogVisible_7 = false;
        },
        closeMethod_2(){
          this.dialogVisible_8 = false;
        },
        closeMethod_3(){
          this.dialogVisible_attr_show_17 = false;
        },
        closeMethod_4(){
          this.dialogVisible_attr_show_14 = false;
        },
        closeMethod_5(){
          this.dialogVisible_attr_show_15 = false;
        },
        closeMethod_6(){
          this.dialogVisible_attr_show_16 = false;
        },
        closeMethod_7(){
          this.dialogVisible_attr_show_19 = false;
        },
        show_method_1(){
          //获取数据
          var url = restweburl + 'getMethodInfo';
          axios({
              url: url,
              method: "post",
              data:{
                bID:this.$route.params.bID,
                file:2,
              }
          })
          .then(async (res) => {
              if(res.data.msg==='success'){
                  this.table_raw_method=[];
                  //原始数据载入
                  this.table_raw_method.push({indicator:'撤离时间', simulatedData:res.data.data.evacuation.totalTime/2 + 's'})
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
        show_method_2(){
          //获取数据
          var url = restweburl + 'getMethodInfo';
          axios({
              url: url,
              method: "post",
              data:{
                bID:this.$route.params.bID,
                file:3,
              }
          })
          .then(async (res) => {
              if(res.data.msg==='success'){
                  this.table_raw_method=[];
                  //原始数据载入
                  this.table_raw_method.push({indicator:'撤离时间', simulatedData:res.data.data.evacuation.totalTime/2 + 's'})
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
        initShow_17(){
          var url = restweburl + 'getMethodInfoAll';
          axios({
              url: url,
              method: "post",
              data:{
                bID:this.$route.params.bID,
              }
          })
          .then(async (res) => {
              if(res.data.msg==='success'){
                              this.table_raw_method=[];
                              //原始数据载入
                              this.table_raw_method.push({
                                indicator:'撤离时间', 
                                method1:res.data.data.res1.evacuation.totalTime + 's',
                                method2:res.data.data.res2.evacuation.totalTime + 's',
                                method3:res.data.data.res3.evacuation.totalTime + 's',
                              })
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
        formatScientific(value) {
          return (Number(value)).toExponential(5);
        },
        initShow_14(){
          //获取数据
          var url = restweburl + 'getMethodStatistics';
          axios({
              url: url,
              method: "post",
              data:{
                bID:this.$route.params.bID,
                selectMethods:this.selectMethod,
              }
          })
          .then(async (res) => {
              if(res.data.msg==='success'){
                  // 基于准备好的dom，初始化echarts实例
                  var myChart;
                  myChart = echarts.init(document.getElementById('撤离时间对比'));
                  // 绘制图表
                  var dat = {
                    title: {
                      text: '撤离人数-时间'
                    },
                    tooltip: {},
                    xAxis: {
                      name:'时间/s',
                      type:'category',
                      data: res.data.data.time
                    },
                    yAxis: {
                      name:'人数/人',
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
                  for(let i = 1; i <= this.selectMethod.length; i++){
                    dat.legend.data.push("method "+i);
                    dat.series.push({name:"method "+i,type:'line',data:res.data.data.res[i-1].exits[res.data.data.res[i-1].exits.length-1].data});
                  }

                  myChart.setOption(dat);
                
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
        initShow_15(){
          this.$notify({
            title: '提示',
            message: '该统计模块已移除',
            type: 'info',
            offset: 100
          });
        },
        initShow_16(){
          this.$notify({
            title: '提示',
            message: '该统计模块已移除',
            type: 'info',
            offset: 100
          });
        },
        initShow_19(){
           //获取数据
           var url = restweburl + 'getMethodDen';
           // 获取所有方案指标、
           let rect = [];
           for(let i =0;i<this.ks.length;i++){
             rect.push({
               begin:parseFloat(0),
               end:parseFloat(3000),
               x0:(this.ks[i].area.x0-this.viewInfo.imgX0)*this.nST.sT,
               y0:(this.ks[i].area.y0-this.viewInfo.imgY0)*this.nST.sT,
               x1:(this.ks[i].area.x1-this.viewInfo.imgX0)*this.nST.sT,
               y1:(this.ks[i].area.y1-this.viewInfo.imgY0)*this.nST.sT,
               x2:(this.ks[i].area.x2-this.viewInfo.imgX0)*this.nST.sT,
               y2:(this.ks[i].area.y2-this.viewInfo.imgY0)*this.nST.sT,
               x3:(this.ks[i].area.x3-this.viewInfo.imgX0)*this.nST.sT,
               y3:(this.ks[i].area.y3-this.viewInfo.imgY0)*this.nST.sT,
               limit:this.ks[i].speed,
             });
           }
           const loading = this.$loading({
            lock: true,
            text: '正在统计拥堵情况',
            spinner: 'el-icon-loading',
            background: 'rgba(0, 0, 0, 0.7)'
        });
           axios({
               url: url,
               method: "post",
               data:{
                 bID:this.$route.params.bID,
                 selectMethods:this.selectMethod,
                 imgX0:this.viewInfo.imgX0,
                 imgX1:this.viewInfo.imgX1,
                 imgY0:this.viewInfo.imgY0,
                 imgY1:this.viewInfo.imgY1,
                 rect:rect,
               }
           })
           .then(async (res) => {
               if(res.data.msg==='success'){
                setTimeout(() => {  
                  loading.close();
              }, 1000);
                   // 基于准备好的dom，初始化echarts实例
                   var myChart;
                   myChart = echarts.init(document.getElementById('拥堵区域个数对比'));
                   
                  // 准备x轴数据
                  var xAxisData = [];
                  for (var i = 1; i <= this.selectMethod.length; i++) {
                      xAxisData.push('method ' + i);
                  }
 
                  // 准备y轴数据
                  var seriesData = [];
                  for (let j = 0; j < this.selectMethod.length; j++) {
                      seriesData.push(res.data.data.res[j].peo);
                  }
                    // 绘制图表
                    var dat = {
                      title: {
                          text: '拥堵区域个数对比'
                      },
                      tooltip: {},
                      legend: {
                          data: ['个数/个']
                      },
                      xAxis: {
                          data: xAxisData
                      },
                      yAxis: {},
                      series: [{
                          name: '个数',
                          type: 'bar',
                          data: seriesData
                      }]
                  };
 
                  // 图表数据载入
                  myChart.setOption(dat);
                 
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
        
        filteredSelectMethodALL() {
          // 保留之前的选项
          console.log("filteredSelectMethodALL");
            this.selectMethodALL_1 =  this.selectMethodALL.filter(item => this.selectedNumber.some(num => num == item.number));
            for(let i = 0; i < this.selectMethodALL_1.length;i++){
              if(this.selectMethodDetail.some(num=>num.method===this.selectMethodALL_1[i].method)){
                this.$refs.multipleTable.toggleRowSelection(this.selectMethodALL_1[i], true)
              }
              
            }
            
        },
        handleSelectionChange(val) {
          // 更新选中方案数组
          console.log('handleSelectionChange');
          //this.old_selectMethod = this.selectMethod;
          this.selectMethod = []; // 清空之前的选择
          //this.selectMethodDetail = [];
          val.forEach(item => {
            // 检查item.method是否已经存在于selectMethodDetail中
            if (!this.selectMethodDetail.some(detail => detail.method === item.method)) {
              // 如果不存在，则添加到selectMethod和selectMethodDetail
              this.selectMethodDetail.push(item);
            }
          });
          
          //检查this.selectMethodALL_1和this.selectMethodDetail中是否存在某个method，但在val中没有
          let temp_select = this.selectMethodALL_1.filter(item =>
            !val.some(v => v.method === item.method)
          );
          this.selectMethodDetail= this.selectMethodDetail.filter(item =>
            !temp_select.some(v => v.method === item.method)
          );
          this.selectMethodDetail.forEach(row=>{
            this.selectMethod.push(row.method);
          })
        },


        // setDefaultSelection() {
        //   console.log("选中"+this.selectMethodDetail.length)
        //   this.$nextTick(() => {
        //     this.selectMethodALL_1.forEach(row => {
        //       const isItemSelected = this.selectMethodDetail.some(detail => detail.method === row.method);
        //       if (isItemSelected) {
        //         this.$refs.multipleTable.toggleRowSelection(row, true);
        //       }
        //     });
        //   });
        // },
        formatToScientificNotation(cellValue) {
          var num = parseFloat(cellValue.value);
          if (num !== null && num !== undefined && !isNaN(num)) {
            // 格式化为科学计数法，保留5位小数
            return num.toExponential(5).replace('e', ' e').replace('E', ' E');
          }
          return num.toString();
        },
        formatToScientificNotationpre(cellValue) {
          var num = parseFloat(cellValue.value);
          if (num !== null && num !== undefined && !isNaN(num)) {
            // 格式化为科学计数法，保留5位小数
            return num.toExponential(5).replace('e', ' e').replace('E', ' E');
          }
          return num.toString();
        },
        sortNumber(a, b) {
          // 用于数字排序的方法
          return Number(a) - Number(b);
        },
        formatAssemblyMethod(method){
          if(method === null || method === undefined) return '';
          const s = String(method).trim();
          if(!s) return '';
          return `集合点 ${s}`;
        },
        initShow_18(){  
            if(!this.exits || this.exits.length === 0){
              this.$notify({
                title:'提示',
                message:'请先创建集合点后再计算出口方案',
                type:'warning',
                offset:100
              });
              return;
            }
            //获取数据
            const loading = this.$loading({
              lock: true,
              text: '正在计算出口方案...',
              spinner: 'el-icon-loading',
              background: 'rgba(0, 0, 0, 0.7)'
          });
          if (!this.rooms || this.rooms.length === 0) {
            loading.close();
            this.$notify({
              title: '提示',
              message: '请先创建房间后再计算出口方案',
              type: 'warning',
              offset: 100
            });
            return;
          }
          var url = restweburl + 'getExitMethods';
          const allFloors = (this.floor2D && this.floor2D.initialized) ? this.getAllFloorsSnapshot() : {
            rooms: this.rooms,
            peos: this.peos,
            exits: this.exits,
            pointsNav: this.pointsNav
          };
          axios({
              url: url,
              method: "post",
              data:{
                bID:this.$route.params.bID,
                exit:this.init_exit(allFloors.exits),
                navPos:this.init_navs(allFloors.pointsNav),
                rooms:this.init_rooms(allFloors.rooms),
                peos:this.init_poes(allFloors.peos),
    
                numMax:this.simulateConfig[1].weight,
                numMin:this.simulateConfig[0].weight,
                imgX0:this.viewInfo.imgX0,
                imgY0:this.viewInfo.imgY0,
                st:this.nST.sT,
              }
          }).then(async (res) => {
            if(res.data.msg==='success'){
              loading.close();
              this.dialogVisible_attr_5=true;
              this.selectMethodALL = res.data.data.ExitMethods;
              this.selectMethodALL_1 = this.selectMethodALL;
              this.selectMethodDetail = [];
              this.selectMethodTotalNums = Number(res.data.data.totalAssemblyNums || 0);
              
            }
            else{
              loading.close();
                this.$notify({
                    title: '注意',
                    message: res.data.msg,
                    type: 'warning',
                    offset: 100
                });
                this.isUpdate=0;
            }
        }).catch((error) =>{
          loading.close();
            this.$notify.error({
                title: '错误',
                message: error,
                duration: 0,
                offset: 100
            });
            this.isUpdate=-1;
        });
        },
        init_exit(exits = this.exits){
          var temp_exit = JSON.parse(JSON.stringify(exits || []));
          temp_exit.forEach(exit=>{
            if (exit.x0!== -10000){
                          exit.x0 = (exit.x0-this.viewInfo.imgX0)*this.nST.sT;
            exit.x1 = (exit.x1-this.viewInfo.imgX0)*this.nST.sT;
            exit.x2 = (exit.x2-this.viewInfo.imgX0)*this.nST.sT;
            exit.x3 = (exit.x3-this.viewInfo.imgX0)*this.nST.sT;
            exit.x4 = (exit.x4-this.viewInfo.imgX0)*this.nST.sT;
            exit.y0 = (exit.y0-this.viewInfo.imgY0)*this.nST.sT;
            exit.y1 = (exit.y1-this.viewInfo.imgY0)*this.nST.sT;
            exit.y2 = (exit.y2-this.viewInfo.imgY0)*this.nST.sT;
            exit.y3 = (exit.y3-this.viewInfo.imgY0)*this.nST.sT;
            }

          })
          return temp_exit;
        },
        
        init_poes(peos = this.peos){
          var temp_peos = JSON.parse(JSON.stringify(peos || []));
          temp_peos.forEach(peos=>{
            peos.peos.forEach(peo=>{
              peo.x = (peo.x-this.viewInfo.imgX0)*this.nST.sT;
              peo.y = (peo.y-this.viewInfo.imgY0)*this.nST.sT;
            })
            peos.walls.forEach(wall=>{
              wall.x = (wall.x-this.viewInfo.imgX0)*this.nST.sT;
              wall.y = (wall.y-this.viewInfo.imgY0)*this.nST.sT;
            })
          })
          return temp_peos;
        },
        // 修改字段，使结果正确
        init_navs(navs = this.pointsNav){
          var temp_nav = JSON.parse(JSON.stringify(navs || []));
          temp_nav.forEach(nav =>{
            if (nav.x !== -10000){
              nav.x = (nav.x-this.viewInfo.imgX0)*this.nST.sT;
            nav.y = (nav.y-this.viewInfo.imgY0)*this.nST.sT;
            }
            
          })
          return temp_nav;
        },

        init_rooms(rooms = this.rooms){
          var temp_rooms = JSON.parse(JSON.stringify(rooms || []));
          temp_rooms.forEach(room => {
            // 对lca字段进行计算
            if (room.lca.X0 !== -10000){
              room.lca.Xm = (room.lca.Xm - this.viewInfo.imgX0) * this.nST.sT;
            room.lca.Ym = (room.lca.Ym - this.viewInfo.imgY0) * this.nST.sT;
            room.lca.X0 = (room.lca.X0 - this.viewInfo.imgX0) * this.nST.sT;
            room.lca.Y0 = (room.lca.Y0 - this.viewInfo.imgY0) * this.nST.sT;
            room.lca.X1 = (room.lca.X1 - this.viewInfo.imgX0) * this.nST.sT;
            room.lca.Y1 = (room.lca.Y1 - this.viewInfo.imgY0) * this.nST.sT;
            }
            
          
            // 对walls数组中的每个元素进行计算
            room.walls.forEach(wall => {
              if(wall.x !== -10000){
                wall.x = (wall.x - this.viewInfo.imgX0) * this.nST.sT;
              wall.y = (wall.y - this.viewInfo.imgY0) * this.nST.sT;
              }
              
            });
          
            // 对peos数组中的每个元素进行计算
            room.peos.forEach(person => {
              if(person.x!== -10000){
                person.x = (person.x - this.viewInfo.imgX0) * this.nST.sT;
              person.y = (person.y - this.viewInfo.imgY0) * this.nST.sT;
              }
              
            });
          });
          return temp_rooms;
        },
        back_exit(exits,imgX0,imgY0,sT){
          var temp_exit = JSON.parse(JSON.stringify(exits));
          temp_exit.forEach(exit=>{
            if (exit.x0!== -10000){
            exit.x0 = (exit.x0)/sT+imgX0;
            exit.x1 = (exit.x1)/sT+imgX0;
            exit.x2 = (exit.x2)/sT+imgX0;
            exit.x3 = (exit.x3)/sT+imgX0;
            exit.x4 = (exit.x4)/sT+imgX0;
            exit.y0 = (exit.y0)/sT+imgY0;
            exit.y1 = (exit.y1)/sT+imgY0;
            exit.y2 = (exit.y2)/sT+imgY0;
            exit.y3 = (exit.y3)/sT+imgY0;
            }

          })
          return temp_exit;
        },
        
        back_poes(peos,imgX0,imgY0,sT){
          var temp_peos = JSON.parse(JSON.stringify(peos));
          temp_peos.forEach(peos=>{
            peos.peos.forEach(peo=>{
              peo.x = peo.x/ sT + imgX0;
              peo.y = peo.y / sT + imgY0;
            })
            peos.walls.forEach(wall => {
              wall.x = wall.x / sT + imgX0;
              wall.y = wall.y / sT + imgY0;
          });
          })
          return temp_peos;
        },
        // 修改字段，使结果正确
        back_navs(navs,imgX0,imgY0,sT){
          var temp_nav = JSON.parse(JSON.stringify(navs));
          temp_nav.forEach(nav =>{
            if (nav.x !== -10000){
              nav.x = nav.x / sT + imgX0;
            nav.y = nav.y / sT + imgY0;
            }
            
          })
          return temp_nav;
        },

        back_rooms(rooms,imgX0,imgY0,sT){
          var temp_rooms = JSON.parse(JSON.stringify(rooms));
          temp_rooms.forEach(room => {
            // 对lca字段进行计算
        if (room.lca.X0!== -10000) {
          room.lca.Xm = room.lca.Xm / sT + imgX0;
          room.lca.Ym = room.lca.Ym / sT + imgY0;
          room.lca.X0 = room.lca.X0 / sT + imgX0;
          room.lca.Y0 = room.lca.Y0 / sT + imgY0;
          room.lca.X1 = room.lca.X1 / sT + imgX0;
          room.lca.Y1 = room.lca.Y1 / sT + imgY0;
      }

      // 对walls数组中的每个元素进行计算
      room.walls.forEach(wall => {
          if (wall.x!== -10000) {
              wall.x = wall.x / sT + imgX0;
              wall.y = wall.y / sT + imgY0;
          }
      });

      // 对peos数组中的每个元素进行计算
      room.peos.forEach(person => {
          if (person.x!== -10000) {
              person.x = person.x / sT + imgX0;
              person.y = person.y / sT + imgY0;
          }
      });
          });
          return temp_rooms;
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
       
        handleOK(){
          this.old_selectMethod = this.selectMethod;
          axios({
            url: restweburl + 'deleteOldMethod',
            method:'post',
            data:{
              bID:this.$route.params.bID,
              selectMethods:this.old_selectMethod,
            }
          }).then((res) =>{
            console.log(res.data.message);
          }).catch((error) => {
            this.$message({
              type: 'info',
              message: error.msg
            });
          });
        },

        handleSelection(val) {
          this.selectM = '';
          val.forEach(item => {
            this.selectM = item.method; // 添加当前选中的行的method到selectMethod数组
          });
        },
        // 保存选择的方案
        saveMethod(){
          axios({
            url: restweburl + 'saveMethod',
            method:'post',
            data:{
              bID:this.$route.params.bID,
              selectMethod:this.selectM,
              selectMethods:[this.selectM]
            }
          }).then((res) =>{
            console.log(res.data.message);
          }).catch((error) => {
            this.$message({
              type: 'info',
              message: error.msg
            });
          });
        },

        async openAnimationSetting(){
          const projectId = this.$route.params.bID;
          try {
            const res = await axios.get(restweburl + 'api/project/listMethods/' + projectId);
            const methods = res.data || [];
            
            if(!methods.length){
              this.$notify({
                title:'提示',
                message:'暂无可播放的出口方案，请先完成“方案模拟”。',
                type:'warning',
                offset:100
              });
              return;
            }

            // 将目录名转换为选项
            this.animationSetting.plans = methods.map(name => {
              // 尝试美化名称，如果是 "1,2,3/0" 这种格式
              const parts = name.split('/');
              const exitIds = parts[0];
              const label = `方案（出口：${exitIds}）` + (parts[1] ? ` - 轮次${parts[1]}` : '');
              return {
                label: label,
                value: name
              };
            });

            if(!this.animationSetting.plans.some(opt => opt.value === this.animationSetting.plan)){
              this.animationSetting.plan = this.animationSetting.plans[0].value;
            }
            this.animationSetting.color = this.drawConfig[9].color;
            this.dialogVisible_2 = true;
          } catch (e) {
            this.$message.error('获取方案列表失败');
          }
        },
        async confirmAnimationSetting(){
          if(!this.animationSetting.plan){
            this.$message.warning('请选择出口方案');
            return;
          }
          const selectedPlan = this.animationSetting.plan;
          
          if(this.animationSetting.color){
            this.drawConfig[9].color = this.animationSetting.color;
            this.drawConfig[10].color = this.animationSetting.color;
          }
          this.playbackConfig = {
            scheme: 'time',
            file: selectedPlan,
            status: 1
          };
          this.animationState = 'paused';
          this.TID = 11;
          this.dialogVisible_2 = false;
        },
        startAnimationPlayback(config){
          const scheme = config.scheme || 'time';
          const payload = {
            file: config.file || '1',
            status: config.status || 1,
            useWebSocket: false
          };
          const map = {
            time:'playBack'
          };
          const handler = map[scheme] || 'playBack';
          // 根据当前倍速调整帧间隔
          this.applyPlaybackSpeed();
          this.animationState = 'playing';
          this.TID = 19;
          if (this.view3D.enabled) {
            this.applyThreeAgentStyle(true);
          }
          if(typeof this[handler] === 'function'){
            this[handler](payload);
          }else{
            this.$message.error('未找到对应的动画处理方法');
          }
        },
        playButtonIcon() {
          return this.animationState === 'paused'
            ? 'el-icon-video-play'
            : 'el-icon-video-pause';
        },
        togglePlayback() {
          if (this.show.nowBusy === 1) return;
          if (this.animationState === 'playing') {
            this.TID = 11; // pause
            this.animationState = 'paused';
          } else {
            this.applyPlaybackSpeed();
            this.animationState = 'playing';
            this.startAnimationPlayback(this.playbackConfig);
          }
        },
        // 调整动画播放倍速（通过帧间隔控制）
        applyPlaybackSpeed(){
          const speed = this.playbackSpeed || 1;
          const baseFps = 30;
          this.show.targetFps = Math.round(baseFps * speed);
          this.show.frameInterval = 1000 / this.show.targetFps;
        },
      
        refresh(){
          setInterval(() => {
            this.buffDraw();
          }, 20)
          
        },
        buffDraw(){
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          
          this.ctx.drawImage(this.canvasBuffer,0,0);
        // 更新比例尺文案（黑色）
        let a = this.viewInfo.sT;
        a = (a * 1).toFixed(2);
        this.scaleLabel = `${a} m`;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.shadowBlur = 0;
        this.ctx.font = '14px Arial';
        this.ctx.strokeStyle = 'black';
        this.ctx.fillStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - 130, this.canvas.height - 30);
        this.ctx.lineTo(this.canvas.width - 130, this.canvas.height - 24);
        this.ctx.lineTo(this.canvas.width - 60, this.canvas.height - 24);
        this.ctx.lineTo(this.canvas.width - 60, this.canvas.height - 30);
        this.ctx.stroke();
        this.ctx.fillText('0', this.canvas.width - 130 - 5, this.canvas.height - 34);
        this.ctx.fillText(a + 'm', this.canvas.width - 60 - 10, this.canvas.height - 34);
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
                    exit:this.init_exit(),
                    rooms:this.init_rooms(),
                    navPos:this.init_navs(),
                    peos:this.init_poes(),

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
        if(this.dialogVisible_attr || this.dialogVisible_attr_2 || this.dialogVisible_attr_3 || this.dialogVisible_3 || this.dialogVisible || this.dialogVisible_attr_show_3)return;
        if (this.shouldIgnoreKeyEvent(e)) { return; }
        const key = e.key ? e.key.toLowerCase() : '';
        if (key === 's' && e.ctrlKey) {
          e.preventDefault();
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

      //删除选定框
      delKs(){
        this.TID=0; 
        this.ks.splice(this.numMovingKs,1);
        this.TID=0;
        this.dialogVisible_9 = false;
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
        if(this.TID==23){//删除人口框
          this.TID=0;
          this.peos.splice(this.PeosRule.currentID,1);
          this.updateNav(false);
        }
        if(this.TID==27){//删除人口框内组件
          this.peos[this.PeosRule.currentID].walls.splice(this.PeosRule.numLine,1);
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
      this.peos=JSON.parse(JSON.stringify(this.backup.peos));
      this.rooms=JSON.parse(JSON.stringify(this.backup.rooms));
      this.exits=JSON.parse(JSON.stringify(this.backup.exits));
      this.pointsNav=JSON.parse(JSON.stringify(this.backup.pointsNav));
      this.pointsNavView=JSON.parse(JSON.stringify(this.backup.pointsNavView));
      this.viewInfo=JSON.parse(JSON.stringify(this.backup.viewInfo));
      this.show=JSON.parse(JSON.stringify(this.backup.show));
      this.nST=JSON.parse(JSON.stringify(this.backup.nST));
      this.bST=JSON.parse(JSON.stringify(this.backup.bST));
      this.ks=JSON.parse(JSON.stringify(this.backup.ks));
      
      this.show.dx=0;
      this.show.dy=0;
      this.show.nowBusy=0;

      this.show.nowTime=0;

      this.draw();
    },
    //退出动画演示
    exitAnimation(){
      // 关闭WebSocket连接
      if(this.socket){
        try{
          this.socket.close();
        }catch(e){
          console.log(e);
        }
        if(this.socket.readyState === WebSocket.OPEN){
          this.socket.close();
        }
      }
      // 停止播放
      this.show.nowBusy=0;
      // 恢复备份数据
      if(this.backup.peos && this.backup.peos.length >= 0){
        this.recovery();
      }
      // 重置TID
      this.TID=0;
      if (this.view3D.enabled) {
        this.applyThreeAgentStyle(false);
        this.syncThreeReplayFrame([]);
      }
      // 重绘
      this.draw();
    },

    //滚轮事件
    handleScroll(e){
      if (e && e.preventDefault) {
        e.preventDefault();
      }
      if(this.TID===2 || this.TID===18)return;
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
    },
    
    // 检测点是否在多边形内的方法(人口框)
    isPointInPolygonPeos(i, px, py) {
      let count = 0;
      let xinters;
      let p1, p2;
      let polygon = this.peos[i].walls.filter(point => point.x !== -10000);
        // 遍历多边形的每条边
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    p1 = polygon[i];
    p2 = polygon[j];

    // 检测点是否在多边形的顶点上
    if ((p1.y === py && p2.y === py) && (px <= Math.max(p1.x, p2.x) && px >= Math.min(p1.x, p2.x))) {
      return true;
    }

    // 检测点是否在水平边上
    if (py < Math.min(p1.y, p2.y) || py > Math.max(p1.y, p2.y)) {
      continue;
    }

    // 检测点是否在边的垂直投影上
    if (py > Math.min(p1.y, p2.y) && py < Math.max(p1.y, p2.y)) {
      // 计算交点的x坐标
      xinters = (py - p1.y) * (p2.x - p1.x) / (p2.y - p1.y) + p1.x;
      // 仅当交点在射线的右侧时计数
      if (xinters > px) {
        count++;
      }
    }
  }

  // 如果交点数量为奇数，则点在多边形内
  return count % 2 !== 0;
      

    },

    // 检测点是否在多边形边界上的方法(人口框)
    isPointOnBoundaryPeos(i, x, y) {
      // 添加防御性检查
      if(!this.peos[i] || !this.peos[i].walls || !Array.isArray(this.peos[i].walls) || this.peos[i].walls.length === 0){
        return false;
      }
      for (let j = 0; j < this.peos[i].walls.length; j++) {
        let nextIndex = (j + 1) % this.peos[i].walls.length;
        if (this.peos[i].walls[j].x === -10000 || this.peos[i].walls[nextIndex].x === -10000){
         continue;
       }
        let x1 = this.peos[i].walls[j].x;
       let y1 = this.peos[i].walls[j].y;
       let x2 = this.peos[i].walls[nextIndex].x;
       let y2 = this.peos[i].walls[nextIndex].y;

       if (this.isOnSegment(x1, y1, x2, y2, x, y)) {
         return true;
       }
      }
      return false;
    },

    // 检测点是否在多边形边界上的方法(房间)
    isPointOnBoundary(i, x, y) {
      // 添加防御性检查
      if(!this.rooms[i] || !this.rooms[i].walls || !Array.isArray(this.rooms[i].walls) || this.rooms[i].walls.length === 0){
        return false;
      }
      for (let j = 0; j < this.rooms[i].walls.length; j++) {
        let nextIndex = (j + 1) % this.rooms[i].walls.length;
        if (this.rooms[i].walls[j].x === -10000 || this.rooms[i].walls[nextIndex].x === -10000){
         continue;
       }
        let x1 = this.rooms[i].walls[j].x;
       let y1 = this.rooms[i].walls[j].y;
       let x2 = this.rooms[i].walls[nextIndex].x;
       let y2 = this.rooms[i].walls[nextIndex].y;

       if (this.isOnSegment(x1, y1, x2, y2, x, y)) {
         return true;
       }
      }
      return false;
    },


    // 检测点是否在直线段上的方法
    isOnSegment(x1, y1, x2, y2, px, py) {
      return (
        this.isBetween(x1, x2, px) &&
        this.isBetween(y1, y2, py) &&
        (px - x1) * (y2 - y1) === (py - y1) * (x2 - x1)
      );
    },    

    // 检测值是否在两个值之间（包括端点）
    isBetween(a, b, c) {
     return Math.min(a, b) <= c && c <= Math.max(a, b);
    },

    // 检测线段是否与射线交叉的方法
    isIntersectingSegment(x1, y1, x2, y2, px, py) {
      // 确保点不在线段的端点上
      if ((px === x1 && py === y1) || (px === x2 && py === y2)) {
        return false;
      }
    
      // 计算线段的向量
      let segVecX = x2 - x1;
      let segVecY = y2 - y1;
      
      // 计算点到线段起点的向量
      let pointVecX = px - x1;
      let pointVecY = py - y1;
      
      // 计算线段向量的单位向量
      let segVecMag = Math.sqrt(segVecX * segVecX + segVecY * segVecY);
      let segUnitVecX = segVecX / segVecMag;
      let segUnitVecY = segVecY / segVecMag;
      
      // 计算点到线段起点的向量在单位向量上的投影长度
      let t = pointVecX * segUnitVecX + pointVecY * segUnitVecY;
      
      // 如果投影长度不在线段范围内，则点不在线段上
      if (t < 0 || t > segVecMag) {
        return false;
      }
      
      // 计算垂直于线段单位向量的向量
      let perpSegUnitVecX = -segUnitVecY;
      let perpSegUnitVecY = segUnitVecX;
      
      // 计算点到线段起点的向量在垂直单位向量上的投影长度
      let dist = pointVecX * perpSegUnitVecX + pointVecY * perpSegUnitVecY;
      
      // 如果垂直投影长度为0，则点在直线上
      return Math.abs(dist) < Number.EPSILON;
    },
    // 判断点是否在多边形内
    isPointInPolygon(poly_1, x, y) {
      let poly = poly_1.filter(point => point.x !== -10000);
      let isInside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        let xi = poly[i].x, yi = poly[i].y;
        let xj = poly[j].x, yj = poly[j].y;
    
        // 判断点是否在多边形的顶点上
        if ((xi === x && yi === y) || (xj === x && yj === y)) {
          return true;
        }
    
        // 判断yi是否在y的上方，如果是，则不进行交点计算
        if (yi > y != yj > y) {
          // 计算交点的x坐标
          let xinters = (y - yi) * (xj - xi) / (yj - yi) + xi;
          // 如果交点的x坐标大于被测点的x坐标，则射线与多边形相交
          if (xinters > x) {
            isInside = !isInside;
          }
        }
      }
      return isInside;
    },

    // 完全包含,大的在前小的在后(房间)
    isPolygonCompletelyContained(poly_1, poly_2){
      let poly1 = poly_1.filter(point => point.x !== -10000);
      for (let i = 0; i < poly1.length; i++) {
        let point = poly1[i];
        if (!this.isPointInPolygon(poly_2, point.x, point.y)) {
          return false; // 如果poly_1有顶点不在poly_2内，则返回false
        }
      }
      return true;
    },
    // 完全包含,大的在前小的在后(人口框)
    isPolygonCompletelyContainedPeos(poly_1, poly_2){
      let poly1 = poly_1.filter(point => point.x !== -10000);
      for (let i = 0; i < poly1.length; i++) {
        let point = poly1[i];
        if (!this.isPointInPolygonPeos(poly_2, point.x, point.y)) {
          return false; // 如果poly_1有顶点不在poly_2内，则返回false
        }
      }
      return true;
    },

    /** 判断两个多边形是否相交 */ 
    // 线段与线段是否相交
    lineLine ( a1, a2, b1, b2 ) {
      // b1->b2向量 与 a1->b1向量的向量积
      var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
      // a1->a2向量 与 a1->b1向量的向量积
      var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
      // a1->a2向量 与 b1->b2向量的向量积
      var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
      // u_b == 0时，角度为0或者180 平行或者共线不属于相交
      if ( u_b !== 0 ) {
          var ua = ua_t / u_b;
          var ub = ub_t / u_b;
  
          if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
              return true;
          }
      }
  
      return false;
    },
    // 线段与多边形是否相交
    linePolygon ( a1, a2, b ) {
      var length = b.length;
  
      for ( var i = 0; i < length; ++i ) {
          var b1 = b[i];
          var b2 = b[(i+1)%length];
  
          if ( this.lineLine( a1, a2, b1, b2 ) )
              return true;
      }
  
      return false;
    },
    // 点在多边形内
    pointInPolygon (point, polygon) {
      //* 射线法判断点是否在多边形内
      //* 点射线（向右水平）与多边形相交点的个数为奇数则认为该点在多边形内
      //* 点射线（向右水平）与多边形相交点的个数为偶数则认为该点不在多边形内
      var inside = false;
      var x = point.x;
      var y = point.y;
  
      // use some raycasting to test hits
      // https://github.com/substack/point-in-polygon/blob/master/index.js
      var length = polygon.length;
  
      for ( var i = 0, j = length-1; i < length; j = i++ ) {
          var xi = polygon[i].x, yi = polygon[i].y,
              xj = polygon[j].x, yj = polygon[j].y,
              intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
              // (yi > y) !== (yj > y)表示此条边的两个端点的y值一个大于这个点的y一个小于这个点的y
              //  (x < (xj - xi) * (y - yi) / (yj - yi) + xi) 这个看起来像是求投影呢，还没搞明白
          if ( intersect ) inside = !inside;
      }
  
      return inside;
    },

    //两个多边形是否相交
    polygonPolygon ( a_1, b_1 ) {
      let a = a_1.filter(point => point.x !== -10000);
      let b = b_1.filter(point => point.x !== -10000);
      var i, l;
  
      // a的每条边与b的每条边做相交检测
      for ( i = 0, l = a.length; i < l; ++i ) {
          var a1 = a[i];
          var a2 = a[(i+1)%l];
  
          if ( this.linePolygon( a1, a2, b ) )
              return true;
      }
  
      // 判断两个多边形的包含关系
      for ( i = 0, l = b.length; i < l; ++i ) {
          if ( this.pointInPolygon(b[i], a) && !(this.polygonPolygonContains(a,b))&& !(this.polygonPolygonContains(b,a)))
              return true;
      }
  
      // 判断两个多边形的包含关系
      for ( i = 0, l = a.length; i < l; ++i ) {
          if ( this.pointInPolygon( a[i], b ) && !(this.polygonPolygonContains(a,b))&& !(this.polygonPolygonContains(b,a)))
              return true;
      }
  
      return false;
    },

    //  subtractPoints(p1, p2) {
    //   return { x: p1.x - p2.x, y: p1.y - p2.y };
    // }
    
    // , perp(vector) {
    //   return { x: -vector.y, y: vector.x };
    // }
    
    // , dotProduct(v1, v2) {
    //   return v1.x * v2.x + v1.y * v2.y;
    // }
    
    // , project(polygon, axis) {
    //   let min =  this.dotProduct(axis, polygon[0]);
    //   let max = min;
    //   for (let i = 1; i < polygon.length; i++) {
    //     let p =  this.dotProduct(axis, polygon[i]);
    //     if (p < min) min = p;
    //     if (p > max) max = p;
    //   }
    //   return { min, max };
    // }
    
    // polygonPolygon(a_1, b_1) {
    //   let polygon1 = a_1.filter(point => point.x !== -10000);
    //   let polygon2 = b_1.filter(point => point.x !== -10000);
    //   polygon1.push(polygon1[0]);
    //   polygon2.push(polygon2[0]);
    //   for(let i = 0 ; i < polygon1.length; i++){
    //     let point = polygon1[i];
    //     if (this.pointInPolygon(point,polygon2)) return true;
    //     if (i < polygon1.length-1 && this.linePolygon(point, polygon1[i+1],polygon2)) return true;
    //   }
    //   for(let i = 0 ; i < polygon2.length; i++){
    //     let point = polygon2[i];
    //     if (this.pointInPolygon(point,polygon1)) return true;
    //     if (i < polygon2.length-1 && this.linePolygon(point, polygon2[i+1],polygon1)) return true;
    //   }
    //   return false;
    // },
    

    // 两个多边形完全包含，a_1大b_1小
    polygonPolygonContains ( a_1, b_1 ) {
      let a = b_1.filter(point => point.x !== -10000);
      let b = a_1.filter(point => point.x !== -10000);
      // 检查a中的每个点是否都在b内
      for (let point of a) {
        if (!this.pointInPolygon(point, b)) {
          // 如果a中的某个点不在b内，则a不是b的子集
          return false;
        }
      }

     // 如果a中的所有点都在b内，则a是b的子集
     return true;
    },
    // 判断所有房间的和人口框是否重叠
    repeat_rooms_poes_all(){
      let temp_TID = this.TID;
      let temp_c_r = this.roomRule.currentID;
      let temp_c_p = this.PeosRule.currentID;
      this.roomsIDs = []
      this.peosIDs = []
      for(let i = 0 ; i < this.rooms.length; i++){
        // 添加防御性检查：确保 rooms[i] 存在且具有 walls 属性
        if(!this.rooms[i] || !this.rooms[i].walls || !Array.isArray(this.rooms[i].walls)){
          continue;
        }
        this.roomRule.currentID = i;
        this.TID == 5;
        this.ones=false;
        if(i == 23){
          console.log()
        }
        this.repeat_rooms_poes(this.rooms[i].walls);
      }
      for(let i = 0 ; i < this.peos.length; i++){
        // 添加防御性检查：确保 peos[i] 存在且具有 walls 属性
        if(!this.peos[i] || !this.peos[i].walls || !Array.isArray(this.peos[i].walls)){
          continue;
        }
        this.PeosRule.currentID = i;
        this.TID == 22;
        this.ones=false;
        this.repeat_rooms_poes(this.peos[i].walls);
      }
      let roomsIDsA = [...new Set(this.roomsIDs)];
      let peosIDsA = [...new Set(this.peosIDs)];
      for(let i = 0;i<roomsIDsA.length;i++){
        this.rooms[roomsIDsA[i]].state = false;
      }
      for(let i = 0;i<peosIDsA.length;i++){
        this.peos[peosIDsA[i]].state = false;
      }
      this.roomRule.currentID = temp_c_r;
      this.PeosRule.currentID = temp_c_p;
      this.TID == temp_TID;
      this.draw();
    },
    // 房间或人口框是否存在重叠
    repeat_rooms_poes(poly){
      // 添加防御性检查：确保 poly 是有效的数组
      if(!poly || !Array.isArray(poly) || poly.length === 0){
        return 0;
      }
      
      if(this.roomRule.currentID !== -1 || this.TID == 5){
        // 添加防御性检查：确保 rooms[currentID] 存在且具有 walls 属性
        if(!this.rooms[this.roomRule.currentID] || !this.rooms[this.roomRule.currentID].walls || !Array.isArray(this.rooms[this.roomRule.currentID].walls)){
          return 0;
        }
        if (poly.length != this.rooms[this.roomRule.currentID].walls.length){
          return 0;
        }
          let req = true;
          for(let i = 0; i < this.rooms.length; i++){
            // 添加防御性检查：确保 rooms[i] 存在且具有必要的属性
            if(!this.rooms[i] || !this.rooms[i].walls || !Array.isArray(this.rooms[i].walls)){
              continue;
            }
            this.rooms[i].state = true;
            if (i === this.roomRule.currentID) continue;
            if (this.polygonPolygon(poly,this.rooms[i].walls)){
              this.rooms[this.roomRule.currentID].state = false;
              this.rooms[i].state = false;
              this.roomsIDs.push(i);
              this.roomsIDs.push(this.roomRule.currentID);
              req = false;
            }
            // 完全包含
            if ((this.rooms[this.roomRule.currentID].lca.X1 - this.rooms[this.roomRule.currentID].lca.X0)
              >(this.rooms[i].lca.X1 - this.rooms[i].lca.X0) && (this.rooms[this.roomRule.currentID].lca.Y1 - this.rooms[this.roomRule.currentID].lca.Y0)
              >(this.rooms[i].lca.Y1 - this.rooms[i].lca.Y0)  &&
               this.polygonPolygonContains(poly,this.rooms[i].walls)){
                if(this.rooms[this.roomRule.currentID].attr.peoNum !== 0){
                  this.repeat_rooms = this.rooms[this.roomRule.currentID].rid;
                  if (confirm('房间重叠,需要将房间'+this.rooms[this.roomRule.currentID].attr.name + '的人数设为0,是否继续操作?')) {
                  this.rooms[this.roomRule.currentID].peos = [];
                  this.rooms[this.roomRule.currentID].attr.peoNum = 0;
                  this.rooms[this.roomRule.currentID].state = true;
                  this.rooms[i].state = true;
                }else{
                  this.rooms[this.roomRule.currentID].state = false;
                  this.rooms[i].state = false;
                  req = false;
                  this.roomsIDs.push(i);
                  this.roomsIDs.push(this.roomRule.currentID);
                  continue;
                }
                }else{
                  this.rooms[this.roomRule.currentID].state = true;
                  this.rooms[i].state = true;
                  this.repeat_rooms = -1;
                }
                
              }
              // 部分重叠
              if ((this.rooms[this.roomRule.currentID].lca.X1 - this.rooms[this.roomRule.currentID].lca.X0)
                <=(this.rooms[i].lca.X1 - this.rooms[i].lca.X0) && (this.rooms[this.roomRule.currentID].lca.Y1 - this.rooms[this.roomRule.currentID].lca.Y0)
                <=(this.rooms[i].lca.Y1 - this.rooms[i].lca.Y0)  && 
                this.polygonPolygonContains(this.rooms[i].walls,poly)){
                  this.repeat_rooms = this.rooms[i].rid;
                  if (this.rooms[i].attr.peoNum !== 0){
                    if (confirm('房间重叠,需要将房间'+this.rooms[i].attr.name + '的人数设为0,是否继续操作?')) {
                    this.rooms[i].peos = [];
                    this.rooms[i].attr.peoNum = 0;
                    this.rooms[this.roomRule.currentID].state = true;
                    this.rooms[i].state = true;
                  }else{
                    this.rooms[this.roomRule.currentID].state = false;
                    this.rooms[i].state = false;
                    this.roomsIDs.push(i);
                    this.roomsIDs.push(this.roomRule.currentID);
                    req = false;
                    continue;
                  }
                }else{
                  this.rooms[this.roomRule.currentID].state = true;
                  this.rooms[i].state = true;
                  this.repeat_rooms = -1;
                }
                  
                }
          }
          if(req){
            this.rooms[this.roomRule.currentID].state = true;
          }
          // 与人口框交叠
        req = true;
        for(let i = 0; i < this.peos.length; i++){
          // 添加防御性检查：确保 peos[i] 存在且具有必要的属性
          if(!this.peos[i] || !this.peos[i].walls || !Array.isArray(this.peos[i].walls) || !this.peos[i].lca){
            continue;
          }
          this.peos[i].state = true;
          if (this.polygonPolygon(poly,this.peos[i].walls)){
            this.rooms[this.roomRule.currentID].state = false;
            this.peos[i].state = false;
            req = false;
            this.peosIDs.push(i);
              this.roomsIDs.push(this.roomRule.currentID);
          }
          // 修复bug：应该是 rooms[currentID].walls 而不是 rooms[i].walls
          if ((this.rooms[this.roomRule.currentID].lca.X1 - this.rooms[this.roomRule.currentID].lca.X0)
            >(this.peos[i].lca.X1 - this.peos[i].lca.X0) && (this.rooms[this.roomRule.currentID].lca.Y1 - this.rooms[this.roomRule.currentID].lca.Y0)
            >(this.peos[i].lca.Y1 - this.peos[i].lca.Y0)  &&
             this.polygonPolygonContains(poly,this.rooms[this.roomRule.currentID].walls)){
              if(this.rooms[this.roomRule.currentID].attr.peoNum !== 0){
                this.repeat_rooms = this.rooms[this.roomRule.currentID].rid;
              if (confirm('人口框重叠,需要将房间'+this.rooms[this.roomRule.currentID].attr.name  + '的人数设为0,是否继续操作?')) {
                this.rooms[this.roomRule.currentID].peos = [];
                this.rooms[this.roomRule.currentID].attr.peoNum = 0;
                this.rooms[this.roomRule.currentID].state = true;
                this.peos[i].state = true;
              }else{
                this.rooms[this.roomRule.currentID].state = false;
                this.peos[i].state = false;
                req = false;
                this.peosIDs.push(i);
              this.roomsIDs.push(this.roomRule.currentID);
                continue;
              }
              }else{
                this.rooms[this.roomRule.currentID].state = true;
                this.peos[i].state = true;
              }
              
            }
            if ((this.rooms[this.roomRule.currentID].lca.X1 - this.rooms[this.roomRule.currentID].lca.X0)
              <=(this.peos[i].lca.X1 - this.peos[i].lca.X0) && (this.rooms[this.roomRule.currentID].lca.Y1 - this.rooms[this.roomRule.currentID].lca.Y0)
              <=(this.peos[i].lca.Y1 - this.peos[i].lca.Y0) 
              && this.polygonPolygonContains(this.peos[i].walls,poly)){
                if(this.peos[i].attr.peoNum !== 0){
                  this.repeat_peos = this.peos[i].rid;
                if (confirm('人口框重叠,需要将人口框'+ this.peos[i].attr.name + '的人数设为0,是否继续操作?')) {
                  this.peos[i].peos = [];
                  this.peos[i].attr.peoNum = 0;
                  this.rooms[this.roomRule.currentID].state = true;
                  this.peos[i].state = true;
                }else{
                  this.rooms[this.roomRule.currentID].state = false;
                  this.peos[i].state = false;
                  req = false;
                  this.peosIDs.push(i);
              this.roomsIDs.push(this.roomRule.currentID);
                  continue;
                }
                }else{
                  this.rooms[this.roomRule.currentID].state = true;
                  this.peos[i].state = true;
                }
              }
        }
        if(req){
          this.rooms[this.roomRule.currentID].state = true;
        }
        return;
      }else if(this.PeosRule.currentID !== -1 || this.TID == 22){
        // 添加防御性检查：确保 peos[currentID] 存在且具有 walls 属性
        if(!this.peos[this.PeosRule.currentID] || !this.peos[this.PeosRule.currentID].walls || !Array.isArray(this.peos[this.PeosRule.currentID].walls)){
          return 0;
        }
        if (poly.length != this.peos[this.PeosRule.currentID].walls.length){
          return 0;
        }

        let req = true;
        for(let i = 0; i < this.peos.length; i++){
          if (i === this.PeosRule.currentID) continue;
          // 添加防御性检查：确保 peos[i] 存在且具有 walls 属性
          if(!this.peos[i] || !this.peos[i].walls || !Array.isArray(this.peos[i].walls)){
            continue;
          }
          this.peos[i].state = true;
          if (this.polygonPolygon(poly,this.peos[i].walls)){
            this.peos[this.PeosRule.currentID].state = false;
            this.peos[i].state = false;
            req = false;
            this.peosIDs.push(i);
              this.peosIDs.push(this.PeosRule.currentID);
          }
          if ((this.peos[this.PeosRule.currentID].lca.X1 - this.peos[this.PeosRule.currentID].lca.X0)
            >(this.peos[i].lca.X1 - this.peos[i].lca.X0) && (this.peos[this.PeosRule.currentID].lca.Y1 - this.peos[this.PeosRule.currentID].lca.Y0)
            >(this.peos[i].lca.Y1 - this.peos[i].lca.Y0)  &&
             this.polygonPolygonContains(poly,this.rooms[i].walls)){
              if(this.peos[this.PeosRule.currentID].attr.peoNum !== 0){
                this.repeat_peos = this.peos[this.PeosRule.currentID].rid;
              if (confirm('人口框重叠,需要将人口框'+this.peos[this.PeosRule.currentID].attr.name  + '的人数设为0,是否继续操作?')) {
                this.peos[this.PeosRule.currentID].peos = [];
                this.peos[this.PeosRule.currentID].attr.peoNum = 0;
                this.peos[this.PeosRule.currentID].state = true;
                this.peos[i].state = true;
              }else{
                this.peos[this.PeosRule.currentID].state = false;
                this.peos[i].state = false;
                req = false;
                this.peosIDs.push(i);
              this.peosIDs.push(this.PeosRule.currentID);
                continue;
              }
              }else{
                this.peos[this.PeosRule.currentID].state = true;
                this.peos[i].state = true;
              }
              
            }
            if ((this.peos[this.PeosRule.currentID].lca.X1 - this.peos[this.PeosRule.currentID].lca.X0)
              <=(this.peos[i].lca.X1 - this.peos[i].lca.X0) && (this.peos[this.PeosRule.currentID].lca.Y1 - this.peos[this.PeosRule.currentID].lca.Y0)
              <=(this.peos[i].lca.Y1 - this.peos[i].lca.Y0) 
              && this.polygonPolygonContains(this.peos[i].walls,poly)){
                if(this.peos[i].attr.peoNum !== 0){
                  this.repeat_peos = this.peos[i].rid;
                if (confirm('人口框重叠,需要将人口框'+ this.peos[i].attr.name + '的人数设为0,是否继续操作?')) {
                  this.peos[i].peos = [];
                  this.peos[i].attr.peoNum = 0;
                  this.peos[this.PeosRule.currentID].state = true;
                  this.peos[i].state = true;
                }else{
                  this.peos[this.PeosRule.currentID].state = false;
                  this.peos[i].state = false;
                  this.peosIDs.push(i);
              this.peosIDs.push(this.PeosRule.currentID);
                  req = false;
                  continue;
                }
                }else{
                  this.peos[this.PeosRule.currentID].state = true;
                  this.peos[i].state = true;
                }
              }
        }
        if(req){
          this.peos[this.PeosRule.currentID].state = true;
        }
          // 与房间重叠
          req = true;
          for(let i = 0; i < this.rooms.length; i++){
            this.rooms[i].state = true;
            if (this.polygonPolygon(poly,this.rooms[i].walls)){
              this.peos[this.PeosRule.currentID].state = false;
              this.rooms[i].state = false;
              this.roomsIDs.push(i);
              this.peosIDs.push(this.PeosRule.currentID);
              req = false;
              console.log("人口框"+this.PeosRule.currentID + "与房间"+ i +"重叠")
            }
            // 完全包含
            if ((this.peos[this.PeosRule.currentID].lca.X1 - this.peos[this.PeosRule.currentID].lca.X0)
              >(this.rooms[i].lca.X1 - this.rooms[i].lca.X0) && (this.peos[this.PeosRule.currentID].lca.Y1 - this.peos[this.PeosRule.currentID].lca.Y0)
              >(this.rooms[i].lca.Y1 - this.rooms[i].lca.Y0)  &&
               this.polygonPolygonContains(poly,this.rooms[i].walls)){
                this.repeat_peos = this.peos[this.PeosRule.currentID].rid;
                if(this.peos[this.PeosRule.currentID].attr.peoNum !== 0){
                  if (confirm('房间重叠,需要将房间'+this.peos[this.PeosRule.currentID].attr.name + '的人数设为0,是否继续操作?')) {
                  this.peos[this.PeosRule.currentID].peos = [];
                  this.peos[this.PeosRule.currentID].attr.peoNum = 0;
                  this.peos[this.PeosRule.currentID].state = true;
                  this.rooms[i].state = true;
                }else{
                  this.peos[this.PeosRule.currentID].state = false;
                  this.rooms[i].state = false;
                  this.roomsIDs.push(i);
              this.peosIDs.push(this.PeosRule.currentID);
                  req = false;
                  continue;
                }
                }else{
                  this.peos[this.PeosRule.currentID].state = true;
                  this.rooms[i].state = true;
                  this.repeat_peos = -1;
                }
                
              }
              if ((this.peos[this.PeosRule.currentID].lca.X1 - this.peos[this.PeosRule.currentID].lca.X0)
                <=(this.rooms[i].lca.X1 - this.rooms[i].lca.X0) && (this.peos[this.PeosRule.currentID].lca.Y1 - this.peos[this.PeosRule.currentID].lca.Y0)
                <=(this.rooms[i].lca.Y1 - this.rooms[i].lca.Y0)  && 
                this.polygonPolygonContains(this.rooms[i].walls,poly)){
                  this.repeat_rooms = this.rooms[i].rid;
                  if (this.rooms[i].attr.peoNum !== 0){
                    if (confirm('房间重叠,需要将房间'+this.rooms[i].attr.name + '的人数设为0,是否继续操作?')) {
                    this.rooms[i].peos = [];
                    this.rooms[i].attr.peoNum = 0;
                    this.peos[this.PeosRule.currentID].state = true;
                    this.rooms[i].state = true;
                  }else{
                    this.peos[this.PeosRule.currentID].state = false;
                    this.rooms[i].state = false;
                    this.roomsIDs.push(i);
              this.peosIDs.push(this.PeosRule.currentID);
                    req = false;
                    continue;
                  }
                }else{
                  this.peos[this.PeosRule.currentID].state = true;
                  this.rooms[i].state = true;
                  this.repeat_rooms = -1;
                }
                  
                }
          }
          if(req){
            this.peos[this.PeosRule.currentID].state = true;
          }
          return;
      }
    },

    //缩放
    scale(x,y){
        if(this.viewInfo.scale>1){//放大
            if(this.nST.sTX>=32)return;
            this.show.sT/=1.5;
            this.nST.sT/=1.5;
            this.nST.sTX*=1.5;
            this.viewInfo.sT= this.nST.sT*this.bST.bTX*70;
        }
        else if(this.viewInfo.scale<1){//缩小
          if(this.nST.sTX<=0.1)return;
            this.show.sT*=1.5;
            this.nST.sT*=1.5;
            this.nST.sTX/=1.5;
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

        // 人口框
        for(let i=0;i<this.peos.length;i++){
          //墙壁
          for(let j=0;j<this.peos[i].walls.length;j++){
          if(this.peos[i].walls[j].x===-10000){
              continue;
          }
          this.peos[i].walls[j].x= (this.viewInfo.scale*this.peos[i].walls[j].x+(1-this.viewInfo.scale)*x);
          this.peos[i].walls[j].y= (this.viewInfo.scale*this.peos[i].walls[j].y+(1-this.viewInfo.scale)*y);
          }

          //人群
          for(let j=0;j<this.peos[i].peos.length;j++){
          this.peos[i].peos[j].x= (this.viewInfo.scale*this.peos[i].peos[j].x+(1-this.viewInfo.scale)*x);
          this.peos[i].peos[j].y= (this.viewInfo.scale*this.peos[i].peos[j].y+(1-this.viewInfo.scale)*y);
          }

          //属性
          this.peos[i].lca.X0= (this.viewInfo.scale*this.peos[i].lca.X0+(1-this.viewInfo.scale)*x);
          this.peos[i].lca.Y0= (this.viewInfo.scale*this.peos[i].lca.Y0+(1-this.viewInfo.scale)*y);
          this.peos[i].lca.X1= (this.viewInfo.scale*this.peos[i].lca.X1+(1-this.viewInfo.scale)*x);
          this.peos[i].lca.Y1= (this.viewInfo.scale*this.peos[i].lca.Y1+(1-this.viewInfo.scale)*y);
          this.peos[i].lca.Xm= (this.viewInfo.scale*this.peos[i].lca.Xm+(1-this.viewInfo.scale)*x);
          this.peos[i].lca.Ym= (this.viewInfo.scale*this.peos[i].lca.Ym+(1-this.viewInfo.scale)*y);
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
    handleInput_name(value){
      this.ks[this.numMovingKs].name = value;
      console.log("name");
    },
    //删除房间2
    delRoom(){
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
    // 删除人口框
    delPeos(){
     // console.log(222); 
      this.$confirm('此操作将永久删除该组件, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        if(this.TID==23){//删除人口框
            this.TID=0;
            this.peos.splice(this.PeosRule.currentID,1);
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
    changeValue1(index, value) {
      // 使用 this.$set 来更新 simulateConfig 中对应项的 weight 属性
      this.$set(this.simulateConfig[index], 'weight', value);
    },
      //渲染房间单元人群
      drawRoomPeo_all(){
        let temp = this.roomRule.currentID;
        for(let i = 0; i < this.rooms.length;i++){
          this.roomRule.currentID = i;
          this.drawRoomPeo();
        }
        this.roomRule.currentID = temp;
      },
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
                  let i = this.roomRule.currentID;
                  let isInside = false;
                  let isOnBoundary = false;
                  // 检测点是否在多边形内
                  isInside = this.isPointInPolygon(this.rooms[this.roomRule.currentID].walls, k, l);
                  // 检测点是否在多边形的边界上
                  isOnBoundary = this.isPointOnBoundary(i, k, l);
                  if (isInside && !isOnBoundary) {
                    this.roomRule.temp.allSpot.push({x:k,y:l});
                  }
                }
              
            }
        }
        let result=[];
        //确定人员坐标
        for(let i=0;i<this.rooms[this.roomRule.currentID].attr.peoNum;i++){
            let num = Math.ceil(Math.random(this.random_peos)*(this.roomRule.temp.allSpot.length));  // 随机在能取的地方取
            result.push({id:this.totalPeoNum,x:this.roomRule.temp.allSpot[num].x,y:this.roomRule.temp.allSpot[num].y});
            this.totalPeoNum+=1;
        }
        console.log("添加成功");
        // alert('添加成功');
        this.rooms[this.roomRule.currentID].peos=result;
        //onsole.log(this.rooms[this.roomRule.currentID]);
        this.rooms[this.roomRule.currentID].attr.peoNum=this.rooms[this.roomRule.currentID].peos.length;
        this.roomRule.temp.allSpot=[];
        this.draw();
      },
      drawPeosPeo_all(){
        let temp = this.PeosRule.currentID;
        for(let i = 0; i < this.peos.length;i++){
          this.PeosRule.currentID = i;
          this.drawRoomPeo();
        }
        this.PeosRule.currentID = temp;
      },
      //渲染人口框人群
      drawPeosPeo(){
        for(let k=this.peos[this.PeosRule.currentID].lca.X0;k<this.peos[this.PeosRule.currentID].lca.X1;k++){ 
            for(let l=this.peos[this.PeosRule.currentID].lca.Y0;l<this.peos[this.PeosRule.currentID].lca.Y1;l++){
                var flag=true;
                let i=this.PeosRule.currentID;
                let num=0;
                for(let j=1;j<this.peos[i].walls.length+1;j++){
                  let x1=this.peos[i].walls[j-1].x;
                  let y1=this.peos[i].walls[j-1].y;
                  let x2=0;
                  let y2=0;
                  if(j==this.peos[i].walls.length){
                    x2=this.peos[i].walls[0].x;
                    y2=this.peos[i].walls[0].y;
                  }
                  else{
                    x2=this.peos[i].walls[j].x;
                    y2=this.peos[i].walls[j].y;
                    while(this.peos[i].walls[j].x==-10000){
                      j++;
                      x2=this.peos[i].walls[j].x;
                      y2=this.peos[i].walls[j].y;
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
                  let i = this.PeosRule.currentID;
                  let isInside = false;
                  let isOnBoundary = false;
                  // 检测点是否在多边形内
                  isInside = this.isPointInPolygonPeos(i, k, l);
                  // 检测点是否在多边形的边界上
                  isOnBoundary = this.isPointOnBoundaryPeos(i, k, l);
                  if (isInside && !isOnBoundary) {
                    this.PeosRule.temp.allSpot.push({x:k,y:l});
                  }
                }
              
            }
        }
        let result=[];
        //确定人员坐标
        for(let i=0;i<this.peos[this.PeosRule.currentID].attr.peoNum;i++){
            let num = Math.ceil(Math.random(this.random_peos)*(this.PeosRule.temp.allSpot.length));  // 随机在能取的地方取
            result.push({id:this.totalPeoNum,x:this.PeosRule.temp.allSpot[num].x,y:this.PeosRule.temp.allSpot[num].y});
            this.totalPeoNum+=1;
        }
        console.log("添加成功");
        this.peos[this.PeosRule.currentID].peos=result;
        //console.log(this.peos[this.PeosRule.currentID]);
        this.peos[this.PeosRule.currentID].attr.peoNum=this.peos[this.PeosRule.currentID].peos.length;
        this.PeosRule.temp.allSpot=[];
        this.draw();
      },

      // 渲染部分人群
      drawPeosPeoAll(){
        for(let t = 0; t < this.peos.length; t++){
        for(let k=this.peos[t].lca.X0;k<this.peos[t].lca.X1;k++){ 
            for(let l=this.peos[t].lca.Y0;l<this.peos[t].lca.Y1;l++){
                var flag=true;
                let i=t;
                let num=0;
                for(let j=1;j<this.peos[i].walls.length+1;j++){
                  let x1=this.peos[i].walls[j-1].x;
                  let y1=this.peos[i].walls[j-1].y;
                  let x2=0;
                  let y2=0;
                  if(j==this.peos[i].walls.length){
                    x2=this.peos[i].walls[0].x;
                    y2=this.peos[i].walls[0].y;
                  }
                  else{
                    x2=this.peos[i].walls[j].x;
                    y2=this.peos[i].walls[j].y;
                    while(this.peos[i].walls[j].x==-10000){
                      j++;
                      x2=this.peos[i].walls[j].x;
                      y2=this.peos[i].walls[j].y;
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
                  let i = t;
                  let isInside = false;
                  let isOnBoundary = false;
                  // 检测点是否在多边形内
                  isInside = this.isPointInPolygonPeos(i, k, l);
                  // 检测点是否在多边形的边界上
                  isOnBoundary = this.isPointOnBoundaryPeos(i, k, l);
                  if (isInside && !isOnBoundary) {
                    this.PeosRule.temp.allSpot.push({x:k,y:l});
                  }
                }
              
            }
        }
        let result=[];
        //确定人员坐标
        for(let i=0;i<this.peos[t].attr.peoNum;i++){
            let num = Math.ceil(Math.random(this.random_peos)*(this.PeosRule.temp.allSpot.length));  // 随机在能取的地方取
            result.push({id:this.totalPeoNum,x:this.PeosRule.temp.allSpot[num].x,y:this.PeosRule.temp.allSpot[num].y});
            this.totalPeoNum+=1;
        }
        console.log("添加成功");
        this.peos[t].peos=result;
        //console.log(this.peos[this.PeosRule.currentID]);
        this.peos[t].attr.peoNum=this.peos[t].peos.length;
        this.PeosRule.temp.allSpot=[];
        }

        this.draw();
      },

      //双击事件
      handleDbMouseDown(){
        //双击房间
        if(this.TID==1){
            this.tempName=this.rooms[this.roomRule.currentID].attr.name;
            this.dialogVisible_attr=true;
            //初始化点矩阵
            let temp=[];
            this.roomRule.temp.allSpot=temp;
            this.TID==31;
        }
        // 双击人口框
        if(this.TID==23){
          this.tempName=this.peos[this.PeosRule.currentID].attr.name;
          this.dialogVisible_attr_3=true;
          //初始化点矩阵
          let temp=[];
          this.PeosRule.temp.allSpot=temp;
      }
      // 双击选定框
      if(this.TID==29){
        this.dialogVisible_9=true;
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
      handleClose1(){
        this.TID = 16;
      }
      ,
      handleClose2(){
        this.TID = 28;
      }
      ,
      handleKey(event) {
        if (this.shouldIgnoreKeyEvent(event)) {
          return;
        }
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
      handleKeydown(event) {
        const hasSelection = window.getSelection && window.getSelection().toString().length > 0;
        if (this.shouldIgnoreKeyEvent(event) || hasSelection) {
          return;
        }
        // 检查是否有 Ctrl 键被按下
        if (event.ctrlKey) {
          // 检查按下的键是否是 C 或 V
          if (event.key === 'c') {
            this.handleCopy(event);
          } else if (event.key === 'v') {
            this.handlePaste(event);
          }
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
      // 复制
      handleCopy(e) {
        if (e && e.defaultPrevented) {
          return;
        }
        const hasSelection = window.getSelection && window.getSelection().toString().length > 0;
        if (hasSelection) {
          return;
        }
        if (this.TID == 1)
          this.copyT=this.roomRule.currentID;
        if (this.TID == 23)
          this.copyT=this.PeosRule.currentID;
        if (this.TID == 17)
          this.copyT=this.exitRule.currentID;
      },
      //粘贴
      handlePaste(e) {
        if (e && (this.shouldIgnoreKeyEvent(e) || (window.getSelection && window.getSelection().toString().length > 0))) {
          return;
        }
        if(this.copyT==-1){
          return;
        }
        var newRoom = null
        if (this.TID ==1 && this.copyT == this.roomRule.currentID){
           newRoom = JSON.parse(JSON.stringify(this.rooms[this.copyT]));
        
        this.rooms.push(newRoom);
        if(this.rooms.length == 1){
          this.rooms[this.rooms.length-1].attr.id=this.rooms.length;
          this.rooms[this.rooms.length-1].attr.name='新建房间'+ this.rooms.length;
        }else{
          this.rooms[this.rooms.length-1].attr.id=this.rooms[this.rooms.length-2].attr.id + 1;
          this.rooms[this.rooms.length-1].attr.name='新建房间'+ this.rooms[this.rooms.length-1].attr.id;
        }
        

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
       // console.log(this.rooms);
        this.draw();
        }
        if (this.TID ==23 && this.copyT == this.PeosRule.currentID){
           newRoom = JSON.parse(JSON.stringify(this.peos[this.copyT]));
        
        this.peos.push(newRoom);
        if(this.rooms.length == 1){
          this.peos[this.peos.length-1].attr.id=this.peos.length;
          this.peos[this.peos.length-1].attr.name='新建房间'+ this.peos.length;
        }else{
          this.peos[this.peos.length-1].attr.id=this.peos[this.peos.length-2].attr.id + 1;
          this.peos[this.peos.length-1].attr.name='新建房间'+ this.peos[this.peos.length-1].attr.id;
        }
        

        for(let i =0;i<this.peos[this.peos.length-1].walls.length;i++){
          if(this.peos[this.peos.length-1].walls[i].x==-10000){
            continue;
          }
          this.peos[this.peos.length-1].walls[i].x+=50;
          this.peos[this.peos.length-1].walls[i].y+=50;
        }

        for(let i=0;i<this.peos[this.peos.length-1].peos.length;i++){
          this.peos[this.peos.length-1].peos[i].x+=50;
          this.peos[this.peos.length-1].peos[i].y+=50;
        }
        this.peos[this.peos.length-1].lca.X0+=50;
        this.peos[this.peos.length-1].lca.Y0+=50;
        this.peos[this.peos.length-1].lca.X1+=50;
        this.peos[this.peos.length-1].lca.Y1+=50;
        this.peos[this.peos.length-1].lca.Xm+=50;
        this.peos[this.peos.length-1].lca.Ym+=50;
        this.draw();
        }
        if (this.TID ==17 && this.copyT == this.exitRule.currentID){
           newRoom = JSON.parse(JSON.stringify(this.rooms[this.copyT]));
        
        this.rooms.push(newRoom);
        if(this.rooms.length == 1){
          this.rooms[this.rooms.length-1].attr.id=this.rooms.length;
          this.rooms[this.rooms.length-1].attr.name='新建人口框'+ this.rooms.length;
        }else{
          this.rooms[this.rooms.length-1].attr.id=this.rooms[this.rooms.length-2].attr.id + 1;
          this.rooms[this.rooms.length-1].attr.name='新建人口框'+ this.rooms[this.rooms.length-1].attr.id;
        }
        

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
       // console.log(this.rooms);
        this.draw();
        }
        
      },
      forceUpdate() {
        this.$forceUpdate();
      },
      //鼠标按下事件
      handleMouseDown(event) {
        event.preventDefault();
        event.stopPropagation()   
        const {
            offsetX,
            offsetY
        } = event;
        console.log('TID:',this.TID);
        //密度区域划定
        if(this.TID==20){
          this.ks.push({
              kid:this.ks.length+1,
              name:this.ks.length+1,
              floorId: Number(this.floor2D && this.floor2D.current != null ? this.floor2D.current : 0),
              speed:10,
              area:{
                  x0:offsetX,
                  y0:offsetY,
                  x1:offsetX,
                  y1:offsetY,
              },
              attr:{
                startTime:0,
                endTime:0,
              },
              color: "rgba(204, 232, 255,0.5)"
          });
          this.createNewLocal=1;
          if (this.ks.length > 1){
            this.ks[this.ks.length-1].kid = this.ks[this.ks.length-2].kid + 1;
            this.ks[this.ks.length-1].name = this.ks[this.ks.length-1].kid;
          }
          return;
        }

        if(this.TID == 28){
            this.TID=29;
            this.draw();
        }

        if(this.TID==29){
          let flag=false;
          for(let i=0;i<this.ks.length;i++){
              if(offsetX>=this.ks[i].area.x0&&offsetX<=this.ks[i].area.x1&&offsetY>=this.ks[i].area.y0&&offsetY<=this.ks[i].area.y1){
                  if(i==this.numMovingKs)
                      return;
              }
              else{
                  flag=true;
              }
          }
          if(flag==true)
              this.TID=0;
      }

        /**出口类 */
        //新建出口
        if(this.TID==7){
            const currentFloor = Number(this.floor2D && this.floor2D.current != null ? this.floor2D.current : 0);
            const exitNum = this.exits.length + 1;
            let teleportTarget = '';
            if (currentFloor !== 0) {
                let targetFloor;
                if (currentFloor < 0) {
                    targetFloor = currentFloor + 1;
                } else {
                    targetFloor = currentFloor - 1;
                }
                const targetFloorExits = this.floor2D?.store?.[targetFloor]?.exits || [];
                const hasTargetExit = targetFloorExits.some(e => {
                    const parsed = this.parseExitId(e.id);
                    return parsed.num === exitNum;
                });
                if (hasTargetExit) {
                    teleportTarget = String(exitNum);
                }
            }
            const exitId = `${currentFloor}-${exitNum}-${teleportTarget}`;
            this.exits.push({x0: offsetX, y0: offsetY,x1: offsetX, y1: offsetY,
                x2: offsetX, y2: offsetY,x3: offsetX, y3: offsetY,id:exitId,name:'新建集合点'+exitNum,
                color:'rgba(255, 255, 255, 1)',peoNum:10000,
                floorId: currentFloor, teleportTarget: teleportTarget});
            this.exits[this.exits.length-1].x2 = Math.max(this.exits[this.exits.length-1].x0,this.exits[this.exits.length-1].x2);
            this.exits[this.exits.length-1].x0 = Math.min(this.exits[this.exits.length-1].x0,this.exits[this.exits.length-1].x2);
            this.exits[this.exits.length-1].y2 = Math.max(this.exits[this.exits.length-1].y0,this.exits[this.exits.length-1].y2);
            this.exits[this.exits.length-1].y0 = Math.min(this.exits[this.exits.length-1].y0,this.exits[this.exits.length-1].y2);
            this.exits[this.exits.length-1].x1 = this.exits[this.exits.length-1].x2;
            this.exits[this.exits.length-1].x3 = this.exits[this.exits.length-1].x0;
            this.exits[this.exits.length-1].y1 = this.exits[this.exits.length-1].y0;
            this.exits[this.exits.length-1].y3 = this.exits[this.exits.length-1].y2;
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
                  this.exitRule.currentID = i;
                  console.log("选中出口" + i);
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

        /** 人口框*/
        //新建人口框
        if(this.TID==22){
          this.peos.push({
              pid:this.peos.length,
              floorId: Number(this.floor2D && this.floor2D.current != null ? this.floor2D.current : 0),
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
                color:this.drawConfig[11].color,
              },
              state:true,
          });
          if (this.peos.length > 1){
            this.peos[this.peos.length-1].pid = this.peos[this.peos.length-2].pid + 1;
          }
          this.createNewPeos=1;
          return;
      }
      //人口框选中
      if(this.TID==0 || this.TID==23 || this.TID==24){
        let flag=1;
        for(let i=0;i<this.peos.length;i++){
            let num=0;
            for(let j=1;j<this.peos[i].walls.length+1;j++){
                let x1=this.peos[i].walls[j-1].x;
                let y1=this.peos[i].walls[j-1].y;
                let x2=0;
                let y2=0;
                if(j==this.peos[i].walls.length){
                    x2=this.peos[i].walls[0].x;
                    y2=this.peos[i].walls[0].y;
                }
                else{
                    x2=this.peos[i].walls[j].x;
                    y2=this.peos[i].walls[j].y;
                    while(this.peos[i].walls[j].x==-10000){
                        j++;
                        x2=this.peos[i].walls[j].x;
                        y2=this.peos[i].walls[j].y;
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
                this.TID=23;
                this.PeosRule.currentID=i;
                flag=0;
                this.draw();
            }
        }
        if(flag==1){
            this.TID=0;
            this.PeosRule.currentID=-1;
            this.draw();
        }
      }
      //人口框选中后的操作-内外部拖动(开始)
      if(this.TID==23 || this.TID==27){
      if (event.button != 2){
          let maxD = 1000 * 1000
          if(this.PeosRule.currentID!=-1){
              for (let i = 0; i < this.peos[this.PeosRule.currentID].walls.length; i++) {
                  const point = this.peos[this.PeosRule.currentID].walls[i];
                  let temp = (offsetX - point.x) * (offsetX - point.x) + (offsetY - point.y) * (offsetY - point.y);
                  if (temp <= 50 && maxD > temp) {
                      maxD = temp;
                      this.numMovingPeos = i;
                      this.TID=26;//内部拖动
                      return;
                  }
                  else{
                      this.PeosRule.oldX=offsetX;
                      this.PeosRule.oldY=offsetY;
                      this.PeosRule.oldXBuff=0;
                      this.PeosRule.oldYBuff=0;
                      this.TID=25;//外部拖动
                  }
              }
          }
      }
      else if(event.button === 2){
          //切割点
          if(this.TID==27){
              if (this.PeosRule.numLine!=0){//右键
                  this.peos[this.PeosRule.currentID].walls.splice(this.PeosRule.numLine,0,{x:offsetX,y:offsetY});
                  this.draw();
                  this.TID=23;
              }
          }
      }
      }


        /**房间类 */
        //新建房间
        if(this.TID==5){
            this.rooms.push({
                rid:this.rooms.length,
                floorId: Number(this.floor2D && this.floor2D.current != null ? this.floor2D.current : 0),
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
                    color:this.drawConfig[5].color,
                },
                state:true,
            });
            if (this.rooms.length > 1){
              this.rooms[this.rooms.length-1].rid = this.rooms[this.rooms.length-2].rid + 1;
            }
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
            if(this.roomRule.currentID!=-1){
              if(this.rooms[this.roomRule.currentID].lca){
                // 确认点击位置是否在旋转按钮内
                // 检测是否点击在旋转按钮上
                let buttonSize = 10*this.nST.sTX; // 假设旋转按钮的大小为10像素
                let buttonX = ((this.rooms[this.roomRule.currentID].lca.X0-10*this.nST.sTX)*2+(this.rooms[this.roomRule.currentID].lca.X1-this.rooms[this.roomRule.currentID].lca.X0+5*this.nST.sTX))/2+5*this.nST.sTX
                let buttonY = this.rooms[this.roomRule.currentID].lca.Y0-20*this.nST.sTX; // 正方形按钮的Y坐标（在房间中心正上方）
                if(offsetX >= buttonX-buttonSize && offsetX <= buttonX + buttonSize &&
                offsetY >= buttonY-buttonSize && offsetY <= buttonY + buttonSize){
                    this.TID=21; // 房间旋转
                    this.draw();
                    return;
                }
                }
            }

            if(flag==1){
                this.TID=0;
                this.roomRule.currentID=-1;
                this.draw();
            }
        }
        //房间选中后的操作-内外部拖动(开始),旋转房间
        if(this.TID==1 || this.TID==14 || this.TID==21){
            if (event.button != 2){
                let maxD = 1000 * 1000
                if(this.roomRule.currentID!=-1){
                    for (let i = 0; i < this.rooms[this.roomRule.currentID].walls.length; i++) {
                        const point = this.rooms[this.roomRule.currentID].walls[i];
                        let temp = (offsetX - point.x) * (offsetX - point.x) + (offsetY - point.y) * (offsetY - point.y);
                        if (temp <= 50 && maxD > temp) {
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
                    if(this.rooms[this.roomRule.currentID].lca){
                      // 确认点击位置是否在旋转按钮内
                      // 检测是否点击在旋转按钮上
                      let buttonSize = 10*this.nST.sTX; // 假设旋转按钮的大小为10像素
                      let buttonX = ((this.rooms[this.roomRule.currentID].lca.X0-10*this.nST.sTX)*2+(this.rooms[this.roomRule.currentID].lca.X1-this.rooms[this.roomRule.currentID].lca.X0+5*this.nST.sTX))/2+5*this.nST.sTX
                      let buttonY = this.rooms[this.roomRule.currentID].lca.Y0-20*this.nST.sTX; // 正方形按钮的Y坐标（在房间中心正上方）
                      if(offsetX >= buttonX-buttonSize && offsetX <= buttonX + buttonSize &&
                      offsetY >= buttonY-buttonSize && offsetY <= buttonY + buttonSize){
                          this.TID=21; // 房间旋转
                          this.draw();
                          return;
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
            if (event.button === 0 && this.navEdit && this.navEdit.active && this.pointsNav.length){
                let nearestIndex = -1;
                let minDist = Infinity;
                const radius = this.drawConfig && this.drawConfig[3] ? this.drawConfig[3].r * this.nST.sTX : 5;
                const threshold = Math.max(20, radius * 2);
                const thresholdSq = threshold * threshold;
                for (let i = 0; i < this.pointsNav.length; i++) {
                    const point = this.pointsNav[i];
                    if(point.x == null || point.y == null){
                        continue;
                    }
                    const dx = offsetX - point.x;
                    const dy = offsetY - point.y;
                    const distSq = dx * dx + dy * dy;
                    if(distSq <= thresholdSq && distSq < minDist){
                        minDist = distSq;
                        nearestIndex = i;
                    }
                }
                if(nearestIndex !== -1){
                    this.setNavSelection(nearestIndex);
                    this.draw();
                    return;
                }
            }
            if (event.button === 0) {
                this.pointsNav.push({
                    x: offsetX,
                    y: offsetY,
                    floorId: Number(this.floor2D && this.floor2D.current != null ? this.floor2D.current : 0)
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
            this.PeosRule.oldX=offsetX;
            this.PeosRule.oldY=offsetY;
            this.PeosRule.oldXBuff=0;
            this.PeosRule.oldYBuff=0;
            this.exitRule.oldX=offsetX;
            this.exitRule.oldY=offsetY;
            this.exitRule.oldXBuff=0;
            this.exitRule.oldYBuff=0;
            this.ksRule.oldX=offsetX;
            this.ksRule.oldY=offsetY;
            this.ksRule.oldXBuff=0;
            this.ksRule.oldYBuff=0;
            // this.roomRule.oldXBuff=offsetX;
            // this.roomRule.oldYBuff=offsetY;
            this.draw();
        }
        /**渲染时拖动背景 */
        if(this.TID==19 || this.TID==11){
          this.show.isMoving=1;
          this.roomRule.oldX=offsetX;
          this.roomRule.oldY=offsetY;
          this.PeosRule.oldX=offsetX;
          this.PeosRule.oldY=offsetY;
          this.exitRule.oldX=offsetX;
          this.exitRule.oldY=offsetY;
          this.ksRule.oldX=offsetX;
          this.ksRule.oldY=offsetY;
          
          this.draw();
        }
    },
    interface(){

    },
    changeRoomName(){
      this.rooms[this.roomRule.currentID].attr.name=this.tempName;
    },
    changePeosName(){
      this.peos[this.PeosRule.currentID].attr.name=this.tempName;
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

            dx = this.PeosRule.oldXBuff;
            dy = this.PeosRule.oldYBuff;
            //人口框人群缓冲
            for(let i=0;i<this.peos.length;i++){
              for(let j=0;j<this.peos[i].peos.length;j++){
                this.peos[i].peos[j].x= (this.peos[i].peos[j].x+dx);
                this.peos[i].peos[j].y= (this.peos[i].peos[j].y+dy);
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
        // 拖动出口结束
        if(this.TID == 30){
          this.TID=16;
        }
        if(this.TID == 31){
          this.TID=28;
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
            if(this.rooms.length-1 == 0){
              this.rooms[this.rooms.length-1].attr.id=this.rooms.length;
              this.rooms[this.rooms.length-1].attr.name='新建房间'+ this.rooms.length;
            }else{
              this.rooms[this.rooms.length-1].attr.id=this.rooms[this.rooms.length-2].attr.id + 1;
              this.rooms[this.rooms.length-1].attr.name='新建房间'+ this.rooms[this.rooms.length-1].attr.id;
            }
            this.createNewRoom=0;
            this.draw();
            this.updateNav(false);
        }

        /**新建人口框状态结束 */
        if(this.TID==22 && this.createNewPeos==1 && this.peos.length-1 >= 0){
          let width=this.peos[this.peos.length-1].lca.X1-this.peos[this.peos.length-1].lca.X0;
          let height=this.peos[this.peos.length-1].lca.Y1-this.peos[this.peos.length-1].lca.Y0;
          if(width<30 && height<30){
              this.peos.splice(this.peos.length-1,1);
              this.createNewPeos=0;
              this.TID=0;
              this.draw();
              return;
          }
          //初始化人口框内墙壁点
          this.peos[this.peos.length-1].walls.push({x:this.peos[this.peos.length-1].lca.X0,y:this.peos[this.peos.length-1].lca.Y0});
          this.peos[this.peos.length-1].walls.push({x:this.peos[this.peos.length-1].lca.X0+width,y:this.peos[this.peos.length-1].lca.Y0});//
          this.peos[this.peos.length-1].walls.push({x:this.peos[this.peos.length-1].lca.X0+width,y:this.peos[this.peos.length-1].lca.Y0+height});
          this.peos[this.peos.length-1].walls.push({x:this.peos[this.peos.length-1].lca.X0,y:this.peos[this.peos.length-1].lca.Y0+height});
          if(this.peos.length-1 == 0){
            this.peos[this.peos.length-1].attr.id=this.peos.length;
            this.peos[this.peos.length-1].attr.name='新建人口框'+ this.peos.length;
          }else{
            this.peos[this.peos.length-1].attr.id=this.peos[this.peos.length-2].attr.id + 1;
            this.peos[this.peos.length-1].attr.name='新建人口框'+ this.peos[this.peos.length-1].attr.id;
          }
          this.createNewPeos=0;
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
        // /**出口拖动结束 */
        // if(this.TID==30){
        //   this.TID=17;
        //   this.draw();
        // }
        // /**统计框拖动结束 */
        // if(this.TID==31){
        //   this.TID=29;
        //   this.draw();
        // }
        /**房间内元素拖动结束 */
        if(this.TID==3){
            this.TID=1;
            this.draw();
            this.updateNav(false);
        }

        /**房间旋转结束 */
        if(this.TID==21){
          this.TID=1;
          this.draw();
          this.updateNav(false)
        }

        /**人口框拖动结束 */
        if(this.TID==25){
          //缓冲渲染
          // let dx = offsetX-this.roomRule.oldX;
          // let dx = offsetX-this.roomRule.oldXBuff;
          // let dy = offsetY-this.roomRule.oldYBuff;
          // let dy = offsetY-this.roomRule.oldY;
          let dx = this.PeosRule.oldXBuff;
          let dy = this.PeosRule.oldYBuff;

          for(let i=0;i<this.peos[this.PeosRule.currentID].peos.length;i++){
            this.peos[this.PeosRule.currentID].peos[i].x+=dx;
            this.peos[this.PeosRule.currentID].peos[i].y+=dy;
          }
          this.TID=23;
          this.draw();
          this.updateNav(false);
      }
        /**人口框元素拖动结束 */
        if(this.TID==26){
            this.TID=23;
            this.draw();
            this.updateNav(false);
        }
        // 对覆盖进行更新
        this.repeat_rooms_poes_all();
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
        if(this.TID==14)
            this.TID=1;
        if(this.TID==15)
            this.TID=0;
        if(this.TID==16)
            this.TID=0;
        if(this.TID==24)
          this.TID=0;
        if(this.TID==27)
          this.TID=23;
        if(this.TID==28)
          this.TID=0;
        
        this.draw();

        /**渲染时拖动背景 */
        if((this.TID==19 || this.TID==11)&& this.show.isMoving){
            let dx = offsetX-this.roomRule.oldX;
            let dy = offsetY-this.roomRule.oldY;
            this.roomRule.oldX=offsetX;
            this.roomRule.oldY=offsetY;
            this.PeosRule.oldX=offsetX;
            this.PeosRule.oldY=offsetY;
            this.exitRule.oldX=offsetX;
            this.exitRule.oldY=offsetY;
            this.ksRule.oldX=offsetX;
            this.ksRule.oldY=offsetY;
            

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
            // 人口框
            for(let i=0;i<this.peos.length;i++){
              //墙壁
              for(let j=0;j<this.peos[i].walls.length;j++){
                  if(this.peos[i].walls[j].x===-10000){
                      continue;
                  }
                  this.peos[i].walls[j].x= (this.peos[i].walls[j].x+dx);
                  this.peos[i].walls[j].y= (this.peos[i].walls[j].y+dy);
              }

              //属性
              this.peos[i].lca.X0= (this.peos[i].lca.X0+dx);
              this.peos[i].lca.Y0= (this.peos[i].lca.Y0+dy);
              this.peos[i].lca.X1= (this.peos[i].lca.X1+dx);
              this.peos[i].lca.Y1= (this.peos[i].lca.Y1+dy);
              this.peos[i].lca.Xm= (this.peos[i].lca.Xm+dx);
              this.peos[i].lca.Ym= (this.peos[i].lca.Ym+dy);
              //this.drawPeosPeoAll();
              for(let t = 0; t < this.peos[i].peos.length; t++){
                this.peos[i].peos[t].x +=dx;
                this.peos[i].peos[t].y +=dy;
              }
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

            // 密度框
            for(let i=0;i<this.ks.length;i++){
              this.ks[i].area.x0+=dx;
              this.ks[i].area.x1+=dx;
              this.ks[i].area.y0+=dy;
              this.ks[i].area.y1+=dy;
            }

            this.show.dx+=dx;
            this.show.dy+=dy;
            //this.drawHeatMap(); 
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

            // 人口框
            for(let i=0;i<this.peos.length;i++){
              //墙壁
              for(let j=0;j<this.peos[i].walls.length;j++){
                  if(this.peos[i].walls[j].x===-10000){
                      continue;
                  }
                  this.peos[i].walls[j].x= (this.peos[i].walls[j].x+dx);
                  this.peos[i].walls[j].y= (this.peos[i].walls[j].y+dy);
              }

              //属性
              this.peos[i].lca.X0= (this.peos[i].lca.X0+dx);
              this.peos[i].lca.Y0= (this.peos[i].lca.Y0+dy);
              this.peos[i].lca.X1= (this.peos[i].lca.X1+dx);
              this.peos[i].lca.Y1= (this.peos[i].lca.Y1+dy);
              this.peos[i].lca.Xm= (this.peos[i].lca.Xm+dx);
              this.peos[i].lca.Ym= (this.peos[i].lca.Ym+dy);
              // 人口框
              for(let t = 0; t < this.peos[i].peos.length; t++){
                this.peos[i].peos[t].x +=dx;
                this.peos[i].peos[t].y +=dy;
              }
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
        
        /**选定框类 */
        if(this.TID==0){
            for(let i=0;i<this.ks.length;i++){
              if(offsetX>=this.ks[i].area.x0&&offsetX<=this.ks[i].area.x1&&offsetY>=this.ks[i].area.y0&&offsetY<=this.ks[i].area.y1){
                this.TID=28;
                this.numMovingKs = i;
                this.draw();
              }
            }
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
                    this.exitRule.currentID = i;
                    this.draw();
                }
            }
        }
if(this.TID==17){
  if(event.button != 2){
    this.exitRule.oldX=offsetX;
                      this.exitRule.oldY=offsetY;
                      this.exitRule.oldXBuff=0;
                      this.exitRule.oldYBuff=0;
                      this.TID=30;//外部拖动
  }
}
/**出口拖动 */
if(this.TID==30||this.TID==17){
  this.TID=30;
  let dx = offsetX-this.exitRule.oldX;
  let dy = offsetY-this.exitRule.oldY;
  this.exitRule.oldX=offsetX;
  this.exitRule.oldY=offsetY;

  this.exitRule.oldXBuff+=dx;
  this.exitRule.oldYBuff+=dy;

  //位置更新
  this.exits[this.numMovingExit].x0+=dx;
  this.exits[this.numMovingExit].y0+=dy;
  this.exits[this.numMovingExit].x1+=dx;
  this.exits[this.numMovingExit].y1+=dy;
  this.exits[this.numMovingExit].x2+=dx;
  this.exits[this.numMovingExit].y2+=dy;
  this.exits[this.numMovingExit].x3+=dx;
  this.exits[this.numMovingExit].y3+=dy;
  this.draw();
}
if(this.TID==29){
  if(event.button != 2){
    this.ksRule.oldX=offsetX;
                      this.ksRule.oldY=offsetY;
                      this.ksRule.oldXBuff=0;
                      this.ksRule.oldYBuff=0;
                      this.TID=31;//外部拖动
  }
}
/**统计框拖动 */
if(this.TID==31||this.TID==29){
  this.TID=31;
  let dx = offsetX-this.ksRule.oldX;
  let dy = offsetY-this.ksRule.oldY;
  this.ksRule.oldX=offsetX;
  this.ksRule.oldY=offsetY;

  this.ksRule.oldXBuff+=dx;
  this.ksRule.oldYBuff+=dy;

  //位置更新
  this.ks[this.numMovingKs].area.x0+=dx;
  this.ks[this.numMovingKs].area.y0+=dy;
  this.ks[this.numMovingKs].area.x1+=dx;
  this.ks[this.numMovingKs].area.y1+=dy;
  this.draw();
}
        // 房间旋转
        if (this.TID == 21) {
          // 添加旋转逻辑
          // 获取旋转中心点
          let centerX = (this.rooms[this.roomRule.currentID].lca.X0 + this.rooms[this.roomRule.currentID].lca.X1)/2;
          let centerY = (this.rooms[this.roomRule.currentID].lca.Y0 + this.rooms[this.roomRule.currentID].lca.Y1)/2;
          // 计算旋转角度
          let angle = Math.atan2(event.offsetY - centerY, event.offsetX - centerX) - Math.atan2(this.roomRule.oldY - centerY,  this.roomRule.oldX - centerX);
          // 旋转房间
          for(let j = 0;j< this.rooms[this.roomRule.currentID].walls.length; j++){
            if(this.rooms[this.roomRule.currentID].walls[j].x === -10000){
              continue;
            }
              let relativeX = this.rooms[this.roomRule.currentID].walls[j].x - centerX;
              let relativeY = this.rooms[this.roomRule.currentID].walls[j].y - centerY;
              let newX = relativeX * Math.cos(angle) - relativeY * Math.sin(angle);
              let newY = relativeX * Math.sin(angle) + relativeY * Math.cos(angle);
              this.rooms[this.roomRule.currentID].walls[j].x = newX + centerX;
              this.rooms[this.roomRule.currentID].walls[j].y = newY + centerY;
          }
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
          // 更新旧坐标缓冲区
          this.roomRule.oldX = event.offsetX;
          this.roomRule.oldY = event.offsetY;
          // 重新绘制房间
          this.draw();

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

        /**选定框类 */
        // 新建选定框移动
        if(this.TID==20&&this.createNewLocal==1){
            this.ks[this.ks.length-1].x1 =offsetX;
            this.ks[this.ks.length-1].y1 =offsetY;
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

        /**人口框类 */
        // 新建人口框类拖动
        if(this.TID==22 && this.createNewPeos==1 && this.peos.length-1 >= 0){
          this.peos[this.peos.length-1].lca.X1=offsetX;
          this.peos[this.peos.length-1].lca.Y1=offsetY;
          this.peos[this.peos.length-1].lca.Xm=(this.peos[this.peos.length-1].lca.X1-this.peos[this.peos.length-1].lca.X0)/2;
          this.peos[this.peos.length-1].lca.Ym=(this.peos[this.peos.length-1].lca.Y1-this.peos[this.peos.length-1].lca.Y0)/2;
          this.draw();
        }
        //人口框预览
        if(this.TID==0){
          // 选择房屋元
          let flag=1;
          for(let i=0;i<this.peos.length;i++){
              let num=0;
              for(let j=1;j<this.peos[i].walls.length+1;j++){
                  let x1=this.peos[i].walls[j-1].x;
                  let y1=this.peos[i].walls[j-1].y;
                  let x2=0;
                  let y2=0;
                  if(j==this.peos[i].walls.length){
                      x2=this.peos[i].walls[0].x;
                      y2=this.peos[i].walls[0].y;
                  }
                  else{
                      x2=this.peos[i].walls[j].x;
                      y2=this.peos[i].walls[j].y;
                      while(this.peos[i].walls[j].x==-10000){
                      j++;
                      x2=this.peos[i].walls[j].x;
                      y2=this.peos[i].walls[j].y;
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
                  this.TID=24;
                  this.PeosRule.currentViewID=i;
                  flag=0;
                  this.draw();
              }
          }
          if(flag==1){
              this.TID=0;
              this.PeosRule.currentViewID=-1;
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
            Xmax=Math.max.apply(null,xs);
            Xmin=Math.min.apply(null,xs);
            Ymax=Math.max.apply(null,ys);
            Ymin=Math.min.apply(null,ys);
            this.rooms[this.roomRule.currentID].lca.X0=Xmin;
            this.rooms[this.roomRule.currentID].lca.X1=Xmax;
            this.rooms[this.roomRule.currentID].lca.Y0=Ymin;
            this.rooms[this.roomRule.currentID].lca.Y1=Ymax;

            // 判断移动时房间重叠
            //this.repeat_rooms_poes(this.rooms[this.roomRule.currentID].walls);

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
            // 判断移动时房间重叠
            //this.repeat_rooms_poes(this.rooms[this.roomRule.currentID].walls);
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
                // 判断移动时房间重叠
                //this.repeat_rooms_poes(this.rooms[this.roomRule.currentID].walls);
                this.roomRule.numLine=num;
                this.TID=14;
                this.draw();
                return;
            }
            else{
                // 判断移动时房间重叠
                //this.repeat_rooms_poes(this.rooms[this.roomRule.currentID].walls);
                this.TID=1;
                this.roomRule.numLine=-1;
            }
        }
        

        /**人口框拖动 */
        //元素拖动
        if(this.TID==26){
          if(this.PeosRule.currentID===-1){
            return;
        }
        this.peos[this.PeosRule.currentID].walls[this.numMovingPeos] = {
            x: offsetX,
            y: offsetY
        };
        let xs=[];
        let ys=[];
        console.log(this.peos[this.PeosRule.currentID]);
        for(let i=0;i<this.peos[this.PeosRule.currentID].walls.length;i++){
            if(this.peos[this.PeosRule.currentID].walls[i].x===-10000){
            continue;
            }
            xs.push(this.peos[this.PeosRule.currentID].walls[i].x);
            ys.push(this.peos[this.PeosRule.currentID].walls[i].y);
        }
        Xmax=Math.max.apply(null,xs);
        Xmin=Math.min.apply(null,xs);
        Ymax=Math.max.apply(null,ys);
        Ymin=Math.min.apply(null,ys);
        this.peos[this.PeosRule.currentID].lca.X0=Xmin;
        this.peos[this.PeosRule.currentID].lca.X1=Xmax;
        this.peos[this.PeosRule.currentID].lca.Y0=Ymin;
        this.peos[this.PeosRule.currentID].lca.Y1=Ymax;
        //this.repeat_rooms_poes(this.peos[this.PeosRule.currentID].walls);
        this.draw();
        }
        //人口框拖动
        else if(this.TID==25){
          let dx = offsetX-this.PeosRule.oldX;
          let dy = offsetY-this.PeosRule.oldY;
          this.PeosRule.oldX=offsetX;
          this.PeosRule.oldY=offsetY;

          this.PeosRule.oldXBuff+=dx;
          this.PeosRule.oldYBuff+=dy;

          //墙壁移动
          if(this.PeosRule.currentID===-1){
              return;
          }
          for(let i=0;i<this.peos[this.PeosRule.currentID].walls.length;i++){
              if(this.peos[this.PeosRule.currentID].walls[i].x === -10000){
              continue;
              }
              this.peos[this.PeosRule.currentID].walls[i].x+=dx;
              this.peos[this.PeosRule.currentID].walls[i].y+=dy;
          }

          //位置更新
          this.peos[this.PeosRule.currentID].lca.Xm+=dx;
          this.peos[this.PeosRule.currentID].lca.Ym+=dy;
          this.peos[this.PeosRule.currentID].lca.X0+=dx;
          this.peos[this.PeosRule.currentID].lca.Y0+=dy;
          this.peos[this.PeosRule.currentID].lca.X1+=dx;
          this.peos[this.PeosRule.currentID].lca.Y1+=dy;
          //this.repeat_rooms_poes(this.peos[this.PeosRule.currentID].walls);
          this.draw();
        }
        //人口框选边拖动
        if(this.TID==23){
          let maxD = 1000;
          let j=this.PeosRule.currentID;
          if(this.PeosRule.currentID===-1){
              return;
          }
          let num=0;
          for (let i = 1; i < this.peos[j].walls.length; i++) {
              const point1 = this.peos[j].walls[i - 1];
              const point2 = this.peos[j].walls[i];
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
            //this.repeat_rooms_poes(this.peos[this.PeosRule.currentID].walls);
              this.PeosRule.numLine=num;
              this.TID=27;
              this.draw();
              return;
          }
          else{
            //this.repeat_rooms_poes(this.peos[this.PeosRule.currentID].walls);
              this.TID=23;
              this.PeosRule.numLine=-1;
          }
        }


    },

    // 处理右键菜单事件，阻止默认行为
    handleContextMenu(event) {
      event.preventDefault();
      // alert(1)
    },
    setOptions(){
      this.numberOptions = [];
      for(let i = this.simulateConfig[0].weight; i <= this.simulateConfig[1].weight; i++){
        this.numberOptions.push(i);
        this.selectedNumber.push(i);
      }
    },

    // 绘制画布
    draw() {
        const startTime = new Date();
        this.isDrawing=1;//渲染标识
        this.ctxBuffer.width = this.canvas.width;
        this.ctxBuffer.height = this.canvas.height;
        // 清除画布
        this.ctxBuffer.clearRect(0, 0, this.canvas.width, this.canvas.height);
        

        //绘制底图（底图为可选项，需确保图片已成功加载）
        if (this.myImg && this.viewInfo.isViewImg && this.myImg.complete && this.myImg.naturalWidth > 0 && this.myImg.naturalHeight > 0) {
          // this.myImg.onload = () => {
          //   // 使用 fabric.Image 来创建图片对象
          //   const fabricImage = new fabric.Image(this.myImg);
          
          //   // 设置图片的位置和大小
          //   fabricImage.set({
          //     left: Math.round(this.viewInfo.imgX0),
          //     top: Math.round(this.viewInfo.imgY0),
          //     width: Math.round((this.viewInfo.imgX1 - this.viewInfo.imgX0)),
          //     height: Math.round((this.viewInfo.imgY1 - this.viewInfo.imgY0))
          //   });
          
          //   // 将图片添加到 canvas 中
          //   this.canvas.add(fabricImage);
          //   this.canvas.renderAll(); // 渲染 canvas 以显示图片
          // };
          this.ctxBuffer.drawImage(
            this.myImg,
            Math.round(this.viewInfo.imgX0),
            Math.round(this.viewInfo.imgY0),
            Math.round(this.viewInfo.imgX1 - this.viewInfo.imgX0),
            Math.round(this.viewInfo.imgY1 - this.viewInfo.imgY0)
          );
          
        }
        // 绘制蒙版（半透明矩形框）
        if (this.drawConfig[6].state) {
          var rgbaColor = this.drawConfig[6].color;
          var rgbaMatch = rgbaColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([01]?\.?\d*?)\)/);

          if (rgbaMatch && rgbaMatch.length === 5) {
            var r = parseInt(rgbaMatch[1], 10);
            var g = parseInt(rgbaMatch[2], 10);
            var b = parseInt(rgbaMatch[3], 10);
            var a1 = parseFloat(rgbaMatch[4]);

            // 设置绘图上下文的颜色和透明度
            var rgbaFillStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a1 + ')';
            this.ctxBuffer.fillStyle = rgbaFillStyle;
            this.ctxBuffer.strokeStyle = rgbaFillStyle; // 设置边框颜色
            this.ctxBuffer.globalAlpha = a1;

            // 绘制填充的矩形
            this.ctxBuffer.fillRect(this.viewInfo.imgX0, this.viewInfo.imgY0,( this.viewInfo.imgX1 - this.viewInfo.imgX0), (this.viewInfo.imgY1 - this.viewInfo.imgY0));
          }

          // 重置透明度，确保不影响后续绘图操作
          this.ctxBuffer.globalAlpha = 1;
        }
        // 绘制边框
        if (this.drawConfig[7].state){
          var borderColor = this.drawConfig[7].color; // 假设边框颜色存储在这里
          var borderWidth = this.drawConfig[7].r || 1; // 假设边框宽度存储在这里，默认为1
          // 设置绘图上下文的边框颜色和宽度
          this.ctxBuffer.strokeStyle = borderColor;
          this.ctxBuffer.lineWidth = borderWidth;

          // 绘制边框的矩形
          this.ctxBuffer.strokeRect(
            this.viewInfo.imgX0, this.viewInfo.imgY0, (this.viewInfo.imgX1 - this.viewInfo.imgX0), (this.viewInfo.imgY1 - this.viewInfo.imgY0)
          );
        
        }
        
        if(this.viewInfo.isViewBorder){
          this.ctxBuffer.strokeStyle = 'black';
          this.ctxBuffer.strokeRect(this.viewInfo.imgX0-1,this.viewInfo.imgY0+1,(this.viewInfo.imgX1-this.viewInfo.imgX0+2),(this.viewInfo.imgY1-this.viewInfo.imgY0+2));
        }


        // //绘制比例尺
        // let a = this.viewInfo.sT
        // a = (a*1).toFixed(2)
        // this.ctx.shadowOffsetX = 1;
        // this.ctx.shadowOffsetY = 1;
        // this.ctx.shadowBlur = 1;
        // this.ctx.font = '12px Arial';
        // this.ctx.strokeStyle = 'white'; // 设置线的颜色为蓝色
        // this.ctx.fillStyle = 'white'; // 设置线的颜色为白色
        // this.ctx.lineWidth = 1; // 设置线的宽度为2
        // this.ctx.beginPath();
        // this.ctx.moveTo(this.canvas.width-130, 22);
        // this.ctx.lineTo(this.canvas.width-130, 29);
        // this.ctx.lineTo(this.canvas.width-60, 29);
        // this.ctx.lineTo(this.canvas.width-60, 22);
        // this.ctx.stroke();
        // this.ctx.fillText(0, this.canvas.width-130-5, 17, 27);
        // this.ctx.fillText(a+"m", this.canvas.width-60-10, 17, 47);
        
        /**绘制房间类*/
        //新建房间框拖动
        if(this.TID==5 && this.createNewRoom==1){
            //外部框
            let j = this.rooms.length-1;
            this.ctxBuffer.fillStyle = "rgba(204, 232, 255,0.4)";
            this.ctxBuffer.beginPath();
            this.ctxBuffer.fillRect(this.rooms[j].lca.X0-10, this.rooms[j].lca.Y0-10,(this.rooms[j].lca.X1-this.rooms[j].lca.X0+20), (this.rooms[j].lca.Y1-this.rooms[j].lca.Y0+20));
            this.ctxBuffer.closePath();
        }
        //静态房间绘制
        if(this.viewInfo.isViewRoom){
          //有房间被选中
          if(this.TID==1||this.TID==2||this.TID==3||this.TID==13||this.TID==14||this.TID==21){
              this.ctxBuffer.fillStyle = "rgba(173, 216, 230,0.6)"
              this.ctxBuffer.lineWidth = 1; // 设置线的宽度为2
              let i=this.roomRule.currentID;

              this.ctxBuffer.beginPath()
              this.ctxBuffer.fillRect(this.rooms[i].lca.X0-10*this.nST.sTX, this.rooms[i].lca.Y0-10*this.nST.sTX,this.rooms[i].lca.X1-this.rooms[i].lca.X0+20*this.nST.sTX, this.rooms[i].lca.Y1-this.rooms[i].lca.Y0+20*this.nST.sTX);
              this.ctxBuffer.closePath()
              // 旋转方框
              if(this.TID==21){
                this.ctxBuffer.fillStyle = "rgba(255, 0, 0, 0.8)";
                this.ctxBuffer.fillRect(((this.rooms[i].lca.X0-10*this.nST.sTX)*2+(this.rooms[i].lca.X1-this.rooms[i].lca.X0+5*this.nST.sTX))/2+5*this.nST.sTX, this.rooms[i].lca.Y0-20*this.nST.sTX, 10*this.nST.sTX, 10*this.nST.sTX);
              }else{
                this.ctxBuffer.fillStyle = "rgba(0, 255, 255, 0.8)";
                this.ctxBuffer.fillRect(((this.rooms[i].lca.X0-10*this.nST.sTX)*2+(this.rooms[i].lca.X1-this.rooms[i].lca.X0+5*this.nST.sTX))/2+5*this.nST.sTX, this.rooms[i].lca.Y0-20*this.nST.sTX, 10*this.nST.sTX, 10*this.nST.sTX);
              }
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
              if(this.rooms[j].state || this.rooms[j].state === undefined){
                this.ctxBuffer.fillStyle = this.rooms[j].attr.color;
              }else{
                this.ctxBuffer.fillStyle = "red"
              }
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
              if(this.viewInfo.isViewPeos && this.TID==0 && this.drawConfig[2].state){
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
              const roomCenterX = (this.rooms[j].lca.X1 + this.rooms[j].lca.X0) / 2;
              const roomCenterY = (this.rooms[j].lca.Y1 + this.rooms[j].lca.Y0) / 2;
              if (this.viewInfo.isViewRoomId && this.rooms[j].attr && this.rooms[j].attr.id !== undefined) {
                const idText = `${this.rooms[j].attr.id}#`;
                this.drawCenteredLabel(idText, roomCenterX, roomCenterY - 10, 'bold 16px "Microsoft YaHei"');
              }
              if (this.viewInfo.isViewRoomName && this.rooms[j].attr && this.rooms[j].attr.name) {
                const nameText = `${this.rooms[j].attr.name}(${this.rooms[j].peos.length}人)`;
                this.drawCenteredLabel(nameText, roomCenterX, roomCenterY + 10, '14px "Microsoft YaHei"');
              }
              this.ctxBuffer.stroke();
          }
      }

        /**绘制人口框 */
        //新建人口框拖动
        if(this.TID==22 && this.createNewPeos==1){
          //外部框
          let j = this.peos.length-1;
          if (j >= 0){
            this.ctxBuffer.fillStyle = "rgba(204, 232, 255,0.4)";
            this.ctxBuffer.beginPath();
            this.ctxBuffer.fillRect(this.peos[j].lca.X0-10, this.peos[j].lca.Y0-10,this.peos[j].lca.X1-this.peos[j].lca.X0+20, this.peos[j].lca.Y1-this.peos[j].lca.Y0+20);
            this.ctxBuffer.closePath();
          }
      }        
      //静态人口框绘制
      if(this.viewInfo.isViewPeoses){
        //有人口框被选中
        if(this.TID==23||this.TID==25||this.TID==26||this.TID==27){
            this.ctxBuffer.fillStyle = "rgba(173, 216, 230,0.6)"
            this.ctxBuffer.lineWidth = 1; // 设置线的宽度为2
            let i=this.PeosRule.currentID;

            this.ctxBuffer.beginPath()
            this.ctxBuffer.fillRect(this.peos[i].lca.X0-10*this.nST.sTX, this.peos[i].lca.Y0-10*this.nST.sTX,this.peos[i].lca.X1-this.peos[i].lca.X0+20*this.nST.sTX, this.peos[i].lca.Y1-this.peos[i].lca.Y0+20*this.nST.sTX);
            this.ctxBuffer.closePath()
            
          }
        //有人口框被光标覆盖
        else if(this.TID==24){
            this.ctxBuffer.fillStyle = "rgba(204, 232, 255,0.4)";
            let i=this.PeosRule.currentViewID;
            this.ctxBuffer.beginPath()
            this.ctxBuffer.fillRect(this.peos[i].lca.X0-10*this.nST.sTX, this.peos[i].lca.Y0-10*this.nST.sTX,this.peos[i].lca.X1-this.peos[i].lca.X0+20*this.nST.sTX, this.peos[i].lca.Y1-this.peos[i].lca.Y0+20*this.nST.sTX)
            this.ctxBuffer.closePath()
        }
        //人口框主体
        for(let j=0;j<this.peos.length;j++){
            //绘制背景
            this.ctxBuffer.beginPath();
            if(this.peos[j].walls.length==0){
              continue;
            }
            this.ctxBuffer.moveTo(this.peos[j].walls[0].x,this.peos[j].walls[0].y);
            for (let i = 1; i < this.peos[j].walls.length; i++) {
                const point2 = this.peos[j].walls[i];
                if(point2.x==-10000){
                    continue;
                }
                this.ctxBuffer.lineTo(point2.x, point2.y);
            }
            this.ctxBuffer.closePath();
            this.ctxBuffer.strokeStyle="rgba(0, 0, 0, 0)";
            this.ctxBuffer.stroke();
            if(this.peos[j].state|| this.peos[j].state === undefined){
              this.ctxBuffer.fillStyle = this.peos[j].attr.color;
            }else{
              this.ctxBuffer.fillStyle = "red";
            }
            this.ctxBuffer.fill();

            //人口点墙壁
            if(this.drawConfig[11].state){
              for (let i = 1; i < this.peos[j].walls.length; i++) {
                  const point1 = this.peos[j].walls[i - 1];
                  const point2 = this.peos[j].walls[i];
                  if(point1.x==-10000 || point2.x==-10000){
                      continue;
                  }
                  if(this.TID==27&&this.PeosRule.currentID==j&&this.PeosRule.numLine===i){
                      this.ctxBuffer.strokeStyle = 'red';
                  }
                  else{
                      this.ctxBuffer.strokeStyle = this.drawConfig[11].color;
                  }
                  this.ctxBuffer.beginPath();
                  this.ctxBuffer.moveTo(point1.x, point1.y);
                  this.ctxBuffer.lineTo(point2.x, point2.y);
                  this.ctxBuffer.closePath();
                  this.ctxBuffer.lineWidth = this.drawConfig[11].r*this.nST.sTX;
                  this.ctxBuffer.stroke();

                  //墙壁点绘制
                  if(this.drawConfig[12].state){
                    this.ctxBuffer.strokeStyle = this.drawConfig[12].color;
                    this.ctxBuffer.beginPath();
                    this.ctxBuffer.arc(point1.x, point1.y, this.drawConfig[12].r*this.nST.sTX, 0, Math.PI * 2);
                    this.ctxBuffer.closePath();
                    this.ctxBuffer.stroke();
                    this.ctxBuffer.fillStyle = this.drawConfig[12].color;
                    this.ctxBuffer.fill();
                    this.ctxBuffer.strokeStyle = this.drawConfig[12].color;
                    this.ctxBuffer.beginPath();
                    this.ctxBuffer.arc(point2.x, point2.y, this.drawConfig[12].r*this.nST.sTX, 0, Math.PI * 2);
                    this.ctxBuffer.closePath();
                    this.ctxBuffer.stroke();
                    this.ctxBuffer.fillStyle = this.drawConfig[12].color;
                    this.ctxBuffer.fill();
                  }
              }
            }
            

            //人口框人群
            if(this.viewInfo.isViewPeos && this.TID==0 && this.drawConfig[2].state){
                this.ctxBuffer.fillStyle = 'green';
                for (let i = 0; i < this.peos[j].peos.length; i+=2) {
                  this.ctxBuffer.beginPath();
                  this.ctxBuffer.arc(this.peos[j].peos[i].x, this.peos[j].peos[i].y, this.drawConfig[2].r*this.nST.sTX, 0, Math.PI * 2);
                  this.ctxBuffer.fill();
                }
                this.ctxBuffer.fillStyle = 'blue';
                for (let i = 1; i < this.peos[j].peos.length; i+=2) {
                    this.ctxBuffer.beginPath();
                    this.ctxBuffer.arc(this.peos[j].peos[i].x, this.peos[j].peos[i].y, this.drawConfig[2].r*this.nST.sTX, 0, Math.PI * 2);
                    this.ctxBuffer.fill();
                }
            }

            //人口框编号+名称
            const peoCenterX = (this.peos[j].lca.X1 + this.peos[j].lca.X0) / 2;
            const peoCenterY = (this.peos[j].lca.Y1 + this.peos[j].lca.Y0) / 2;
            if (this.viewInfo.isViewPeosId && this.peos[j].attr && this.peos[j].attr.id !== undefined) {
              const idText = `${this.peos[j].attr.id}#`;
              this.drawCenteredLabel(idText, peoCenterX, peoCenterY - 10, 'bold 16px "Microsoft YaHei"');
            }
            if (this.viewInfo.isViewPeosName && this.peos[j].attr && this.peos[j].attr.name) {
              const nameText = `${this.peos[j].attr.name}(${this.peos[j].peos.length}人)`;
              this.drawCenteredLabel(nameText, peoCenterX, peoCenterY + 10, '14px "Microsoft YaHei"');
            }
            this.ctxBuffer.stroke();
        }
    }

        /**绘制导航点类 */
        const showNav = this.viewInfo.isViewNav || (this.navEdit.active && this.navEdit.showPoints);
        if(showNav){
          //绘制导航点鼠标标识
            if(this.TID==6){
              this.ctxBuffer.fillStyle = this.drawConfig[3].color;
              this.ctxBuffer.beginPath();
              this.ctxBuffer.arc(this.viewInfo.x, this.viewInfo.y, this.drawConfig[3].r*this.nST.sTX, 0, Math.PI * 2);
              this.ctxBuffer.fill();
            }
            //绘制已放置导航点
            if(this.drawConfig[3].state || this.navEdit.active){
              this.ctxBuffer.fillStyle = this.drawConfig[3].color;
              for (const point of this.pointsNav) {
                  this.ctxBuffer.beginPath();
                  if(point.x==null)
                    continue;
                  this.ctxBuffer.arc(point.x, point.y, this.drawConfig[3].r*this.nST.sTX, 0, Math.PI * 2);
                  this.ctxBuffer.fill();
              }
            }

            //绘制导航线条
            if (this.drawConfig[4].state || this.navEdit.active) {
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
                  if(this.numMovingNav > this.pointsNav.length - 1 || !this.pointsNav[this.numMovingNav]){
                    return;
                  }
                  this.ctxBuffer.beginPath();
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
        if(this.TID==17||this.TID==30){
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
            this.ctxBuffer.fillStyle = this.exits[i].color;
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
            // 填充形状
            this.ctxBuffer.fillRect(this.exits[i].x0, this.exits[i].y0,this.exits[i].x1-this.exits[i].x0, this.exits[i].y2-this.exits[i].y0);

            const exitCenterX = (this.exits[i].x0 + this.exits[i].x1) / 2;
            const exitCenterY = (this.exits[i].y0 + this.exits[i].y3) / 2;
            const exitFontSize = this.viewInfo.fontSize || 20;
            if (this.viewInfo.isViewExportId) {
              const idText = `${this.getExitDisplayId(this.exits[i])}#`;
              this.drawCenteredLabel(idText, exitCenterX, exitCenterY - 10, `bold ${exitFontSize}px Arial`);
            }
            if (this.viewInfo.isViewExportName && this.exits[i].name) {
              this.drawCenteredLabel(this.exits[i].name, exitCenterX, exitCenterY + 10, `${exitFontSize}px Arial`);
            }
            
        }
        /**绘制选定框 */
        this.ctxBuffer.fillStyle = "rgba(204, 232, 255,0.4)";
        if(this.TID==28){
          //外部框
          this.ctxBuffer.fillStyle = "rgba(204, 232, 255,0.4)";
          this.ctxBuffer.lineWidth = 1*this.nST.sTX;
          this.ctxBuffer.beginPath();
          this.ctxBuffer.fillRect(this.ks[this.numMovingKs].area.x0-10*this.nST.sTX, this.ks[this.numMovingKs].area.y0-10*this.nST.sTX,this.ks[this.numMovingKs].area.x1-this.ks[this.numMovingKs].area.x0+20*this.nST.sTX, this.ks[this.numMovingKs].area.y1-this.ks[this.numMovingKs].area.y0+20*this.nST.sTX);
          this.ctxBuffer.closePath();
          this.ctxBuffer.fill();
      }
      if(this.TID==29||this.TID==31){
        this.ctxBuffer.fillStyle = "rgba(173, 216, 230,0.6)"
        this.ctxBuffer.lineWidth = 1*this.nST.sTX; // 设置线的宽度为2
        // let i=this.roomRule.currentID;

        this.ctxBuffer.beginPath()
        this.ctxBuffer.fillRect(this.ks[this.numMovingKs].area.x0-10*this.nST.sTX, this.ks[this.numMovingKs].area.y0-10*this.nST.sTX,this.ks[this.numMovingKs].area.x1-this.ks[this.numMovingKs].area.x0+20*this.nST.sTX, this.ks[this.numMovingKs].area.y1-this.ks[this.numMovingKs].area.y0+20*this.nST.sTX);
        this.ctxBuffer.closePath()

        this.ctxBuffer.beginPath()
        this.ctxBuffer.fillStyle = "rgb(255,165,0)";
        this.ctxBuffer.fillRect(this.ks[this.numMovingKs].area.x0-10*this.nST.sTX, this.ks[this.numMovingKs].area.y0-10*this.nST.sTX,this.ks[this.numMovingKs].area.x1-this.ks[this.numMovingKs].area.x0+20*this.nST.sTX, this.ks[this.numMovingKs].area.y1-this.ks[this.numMovingKs].area.y0+20*this.nST.sTX);
        this.ctxBuffer.closePath()
        this.ctxBuffer.fillStyle = "rgba(204, 232, 255,0.4)"
      }
      // 静态选定框绘制
      if(this.viewInfo.isViewKs){
          for(let i=0;i<this.ks.length;i++){
            this.ctxBuffer.fillStyle = this.ks[i].color;
            this.ctxBuffer.fillRect(this.ks[i].area.x0,this.ks[i].area.y0,this.ks[i].area.x1-this.ks[i].area.x0,this.ks[i].area.y1-this.ks[i].area.y0);
          }
      }

        /**结果人群渲染 */
        if((this.TID==19) || (this.TID==11)){
          this.ctxBuffer.fillStyle = this.drawConfig[9].color;
          if( this.drawConfig[9].state){
            for(let j=0;j<this.show.showPeople.length;j++){
              // 绘制人群点
              this.ctxBuffer.beginPath();
              let x_=this.show.yx+(this.show.showPeople[j].x)/10*(this.show.yx2-this.show.yx);
              let y_=this.show.yy+(this.show.showPeople[j].y)/10*(this.show.yy2-this.show.yy);
              // let x_ = this.show.showPeople[j].x/this.nST.sT + this.viewInfo.imgX0;
              // let y_ =  this.show.showPeople[j].y/this.nST.sT + this.viewInfo.imgY0;
              // let x_ = this.show.showPeople[j].x;
              // let y_ = this.show.showPeople[j].y;
              this.ctxBuffer.arc(x_, y_, this.drawConfig[2].r*this.nST.sTX, 0, Math.PI * 2);
              this.ctxBuffer.fill();
            }
          }
          
          //渲染热力图
          if(!this.viewInfo.isViewHeat){
            this.ctx_heat.clearRect(0, 0, this.canvas_heat.width, this.canvas_heat.height);
          }
          if(this.show.nowTime%10==0 && this.TID==19 && this.viewInfo.isViewHeat && this.data.length>0){
            html2canvas
            this.drawHeatMap();
          }
          this.canvas_heat.onload = () => {
            // 使用 fabric.Image 来创建图片对象
            // const fabricImage = new fabric.Image(this.myImg);
          
            // // 设置图片的位置和大小
            // fabricImage.set({
            //   left: 0,
            //   top: 0,
            // });
            // // 将图片添加到 canvas 中
            // this.canvas.add(fabricImage);
            // this.canvas.renderAll(); // 渲染 canvas 以显示图片
            this.ctxBuffer.drawImage(this.canvas_heat,0,0); 
          };
          

        }
        //this.ctxBuffer.restore(); // 恢复到原始大小
        //this.applySharpen(this.ctxBuffer,this.canvasBuffer.width, this.canvasBuffer.height);
        this.isDrawing=0;//渲染标识
        const endTime = new Date();
        const executionTime = endTime - startTime;
        console.log(`代码执行时间：${executionTime} 毫秒`);        
      },
      
      // 初始化画布大小
      initCanvasSize() {
        const dpr = this.dpr || (window.devicePixelRatio || 1); // 获取设备像素比
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
      
        // 设置Canvas的大小为CSS像素大小
        this.canvas.style.width = screenWidth - 10 + 'px';
        this.canvas.style.height = screenHeight - this.$refs.div.clientHeight - this.$refs.div2.clientHeight - 40 + 'px';
      
        // 设置Canvas的实际绘制大小为CSS像素大小的dpr倍
        this.canvas.width = (screenWidth - 10) * dpr;
        this.canvas.height = (screenHeight - this.$refs.div.clientHeight - this.$refs.div2.clientHeight - 40) * dpr;
      
        // 对于其他Canvas同样处理
        this.canvasBuffer.style.width = screenWidth - 10 + 'px';
        this.canvasBuffer.style.height = screenHeight - this.$refs.div.clientHeight - this.$refs.div2.clientHeight - 40 + 'px';
        this.canvasBuffer.width = (screenWidth - 10) * dpr;
        this.canvasBuffer.height = (screenHeight - this.$refs.div.clientHeight - this.$refs.div2.clientHeight - 40) * dpr;
      
        this.canvas_heat.style.width = screenWidth - 10 + 'px';
        this.canvas_heat.style.height = screenHeight - this.$refs.div.clientHeight - this.$refs.div2.clientHeight - 40 + 'px';
        this.canvas_heat.width = (screenWidth - 10) * dpr;
        this.canvas_heat.height = (screenHeight - this.$refs.div.clientHeight - this.$refs.div2.clientHeight - 40) * dpr;
      
        // 设置缩放因子，确保绘制的图形大小正确
        // this.ctx.scale(dpr, dpr);
         this.ctxBuffer.scale(dpr, dpr);
        // this.ctx_heat.scale(dpr, dpr);
      
        // 更新其他相关尺寸信息
        this.widthImg = (screenWidth - 10);
        this.heightImg = (screenHeight - this.$refs.div.clientHeight - this.$refs.div2.clientHeight - 40);
        
        this.viewInfo.baseX1 = screenWidth - 10;
        this.viewInfo.baseY1 = screenHeight - this.$refs.div.clientHeight - this.$refs.div2.clientHeight - 40;
        
        this.viewInfo.width = screenWidth - 10;
        this.viewInfo.height = screenHeight - this.$refs.div.clientHeight - this.$refs.div2.clientHeight - 40;
      },
      
      initCanvasSizeFull() {
        this.canvas.width = (window.screen.width-10);
        this.canvas.height = (window.screen.height-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40);

        this.canvasBuffer.width = (window.screen.width-10);
        this.canvasBuffer.height =(window.screen.height-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40);

        this.canvas_heat.width = window.screen.width-10;
        this.canvas_heat.height = window.screen.height-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
        this.widthImg = window.screen.width-10;
        this.heightImg = window.screen.height-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;

        this.viewInfo.baseX1=window.screen.width-10;
        this.viewInfo.baseY1=window.screen.height-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
        
        this.viewInfo.width=window.screen.width-10;
        this.viewInfo.height=window.screen.height-this.$refs.div.clientHeight-this.$refs.div2.clientHeight-40;
      },
      applySharpen(context, width, height) {
        // 获取原始图像数据
        let originalImageData = context.getImageData(0, 0, width, height);
        let originalPixels = originalImageData.data;
        
        // 创建一个用于存放处理后的图像数据的 ImageData 对象
        let outputImageData = context.createImageData(width, height);
        let outputPixels = outputImageData.data;
        
        const kernel = [
          0, -1, 0,
          -1, 5, -1,
          0, -1, 0,
        ];
        
        const kernelSize = Math.sqrt(kernel.length);
        const halfKernelSize = Math.floor(kernelSize / 2);
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;
            
            for (let ky = 0; ky < kernelSize; ky++) {
              for (let kx = 0; kx < kernelSize; kx++) {
                // 考虑边缘像素
                let pixelY = y + ky - halfKernelSize;
                let pixelX = x + kx - halfKernelSize;
                
                if (pixelY < 0 || pixelY >= height || pixelX < 0 || pixelX >= width) continue;
                
                // 卷积计算
                let offset = (pixelY * width + pixelX) * 4;
                let weight = kernel[ky * kernelSize + kx];
                
                r += originalPixels[offset] * weight;
                g += originalPixels[offset + 1] * weight;
                b += originalPixels[offset + 2] * weight;
              }
            }
            
            let destOffset = (y * width + x) * 4;
            outputPixels[destOffset] = r;
            outputPixels[destOffset + 1] = g;
            outputPixels[destOffset + 2] = b;
            outputPixels[destOffset + 3] = originalPixels[destOffset + 3]; // 保持相同的 alpha 值
          }
        }
        
        // 将处理后的图像数据绘制回画布
        context.putImageData(outputImageData, 0, 0);
      },

      async wait() {
        return new Promise(resolve => {
          setTimeout(() => resolve(1), this.show.frameInterval || 33);
        });
      },
      async deadlock() {
        await new Promise(resolve => setTimeout(resolve, 500));
      },
      resolveStageMessage(schedule){
        if(Number.isNaN(schedule)){
          return '准备演算中...';
        }
        if(schedule === 99){
          return '采样中...';
        }
        if(schedule >= 100){
          return '演算完成';
        }
        if(schedule >= 90){
          return '结果保存完成...';
        }
        if(schedule >= 60){
          return '结果保存中...';
        }
        if(schedule >= 30){
          return '计算方案中...';
        }
        if(schedule >= 5){
          return '读入数据中...';
        }
        return '准备演算中...';
      },
      //提交
      upload(){
        this.TID = 10;
        this.up.stageMessage='准备演算中...';
        var url = restweburl + 'commit';
        const allFloors = (this.floor2D && this.floor2D.initialized) ? this.getAllFloorsSnapshot() : {
          rooms: this.rooms,
          peos: this.peos,
          exits: this.exits,
          pointsNav: this.pointsNav,
          ks: this.ks
        };
        // 重新加载一下人群
        // this.drawRoomPeo_all();
        // this.drawPeosPeo_all();
        this.viewInfo.preIsViewNav=this.viewInfo.isViewNav;
        this.viewInfo.isViewNav=false;
        // 获取所有方案指标、
        let rect = [];
        const ksAll = Array.isArray(allFloors.ks) ? allFloors.ks : [];
        for(let i =0;i<ksAll.length;i++){
          rect.push({
            begin:parseFloat(0),
            end:parseFloat(3000),
            x0:(ksAll[i].area.x0-this.viewInfo.imgX0)*this.nST.sT,
               y0:(ksAll[i].area.y0-this.viewInfo.imgY0)*this.nST.sT,
               x1:(ksAll[i].area.x1-this.viewInfo.imgX0)*this.nST.sT,
               y1:(ksAll[i].area.y1-this.viewInfo.imgY0)*this.nST.sT,
               x2:(ksAll[i].area.x2-this.viewInfo.imgX0)*this.nST.sT,
               y2:(ksAll[i].area.y2-this.viewInfo.imgY0)*this.nST.sT,
               x3:(ksAll[i].area.x3-this.viewInfo.imgX0)*this.nST.sT,
               y3:(ksAll[i].area.y3-this.viewInfo.imgY0)*this.nST.sT,
            limit:ksAll[i].speed,
          });
        }
        axios({
          url: url,
          method: "post",
          data:{
            bID:this.$route.params.bID,
            navPos:this.init_navs(allFloors.pointsNav),
            exit:this.init_exit(allFloors.exits),
            rooms:this.init_rooms(allFloors.rooms),
            peos:this.init_poes(allFloors.peos),

            scale:this.viewInfo.sT/70,
            viewInfo:this.viewInfo,
            sT:parseFloat(this.nST.sT),
            nST:this.nST,
            bST:this.bST,
            k:1,
            weight:1000,
            selectMethod:this.old_selectMethod,
            status:1,
            imgX0:this.viewInfo.imgX0,
            imgX1:this.viewInfo.imgX1,
            imgY0:this.viewInfo.imgY0,
            imgY1:this.viewInfo.imgY1,
            rect:rect,
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
                  const schedule = Number(res.data.data.schedule);
                  const stageMessage = res.data.data.stageMessage;
                  this.up.stageMessage = stageMessage || this.resolveStageMessage(schedule);
                  if(schedule >= 100){
                    clearInterval(this.up.timer);
                    this.TID = 0;

                    this.$notify({
                      title: '成功',
                      message: '演算完毕',
                      type: 'success'
                    });
                    const loading = this.$loading({
                      lock: true,
                      text: '方案指标统计中.',
                      spinner: 'el-icon-loading',
                      background: 'rgba(0, 0, 0, 0.7)'
                  });
                    
                    
                    axios({
                      url:restweburl + 'getScheme',
                      method:"post",
                      data:{
                        bID:this.$route.params.bID,
                        selectMethod:this.old_selectMethod,
                        imgX0:this.viewInfo.imgX0,
                        imgX1:this.viewInfo.imgX1,
                        imgY0:this.viewInfo.imgY0,
                        imgY1:this.viewInfo.imgY1,
                        rect:rect,
                      }
                    }).then((res)=>{
                      this.selectMethodALLResult = res.data.data;
                      let index = 1;
                      let time = -1;
                      for(let i = 0; i < this.selectMethodALLResult.length; i++){
                        if(time == -1){
                          time = this.selectMethodALLResult[i].time;
                          index = this.selectMethodALLResult[i].method;
                        }else{
                          if(time>this.selectMethodALLResult[i].time){
                            time = this.selectMethodALLResult[i].time;
                            index = this.selectMethodALLResult[i].method;
                          }
                        }
                      }
                      this.selectM = index;
                      console.log("保存方案" + this.selectM)
                      // 保存项目
                      this.save();
                      loading.close();
                    }).catch((error)=>{
                      this.$notify.error({
                        title: '错误',
                        message: error,
                        offset: 100,
                        duration:0,
                      });
                      loading.close();
                    })
                  }
                }
                else{
                  this.$notify.error({
                    
                    title: '错误',
                    message: "未知错误，演算结束！",
                    offset: 100,
                    duration:0,
                  });
                  clearInterval(this.up.timer);
                  this.up.stageMessage='';
                  this.TID = 0;
                }
                
              })
              .catch((error)=> {
                this.up.stageMessage='';
                clearInterval(this.up.timer);
                this.TID = 0;
                console.log(error);
                this.$notify.error({
                  title: '错误',
                  message: error,
                  offset: 100,
                  duration:0,
                });
                clearInterval(this.up.timer);
                this.up.stageMessage='';
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
            this.up.stageMessage='';
            this.TID = 0;
            
          }
          this.viewInfo.isViewNav=this.viewInfo.preIsViewNav;
        })
        .catch((error)=> {
          this.up.stageMessage='';
          clearInterval(this.up.timer);
          this.TID = 0;
          console.log(error);
          this.viewInfo.isViewNav=this.viewInfo.preIsViewNav;
          this.$notify.error({
            title: '错误',
            message: error,
            offset: 100,
            duration:0,
          });
        });
      },
      //提交
      upload_1(){
        this.TID = 10;
        var url = restweburl + 'commit';
        this.viewInfo.preIsViewNav=this.viewInfo.isViewNav;
        this.viewInfo.isViewNav=false;
        axios({
          url: url,
          method: "post",
          data:{
            bID:this.$route.params.bID,
            navPos:this.init_navs(),
            exit:this.init_exit(),
            rooms:this.init_rooms(),
            peos:this.init_poes(),

            scale:this.viewInfo.sT/70,
            viewInfo:this.viewInfo,
            nST:this.nST,
            bST:this.bST,
            k:1,
            weight:1000,
            status:2,
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
                  const schedule = Number(res.data.data.schedule);
                  this.up.stageMessage = this.resolveStageMessage(schedule);
                  if(schedule >= 100){
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
                    message: "未知错误，演算结束！",
                    offset: 100,
                    duration:0,
                  });
                  clearInterval(this.up.timer);
                  this.up.stageMessage='';
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
                this.up.stageMessage='';
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
            this.up.stageMessage='';
            this.TID = 0;
            
          }
          this.viewInfo.isViewNav=this.viewInfo.preIsViewNav;
        })
        .catch((error)=> {
          console.log(error);
          this.viewInfo.isViewNav=this.viewInfo.preIsViewNav;
          this.$notify.error({
            title: '错误',
            message: error,
            offset: 100,
            duration:0,
          });
          this.up.stageMessage='';
        });
      },

      //回放功能
      playBack(options = {}){
        const fileParam = options.file || '1';
        const statusParam = options.status || 1;
        this.viewInfo.isViewHeat=false;
        // alert(this.radio_mode)
        this.init_show();
        this.heatInit();
        this.replay3D = { ready: false, prevById: new Map() };

        const useWebSocket = options.useWebSocket === true;
        if (this.socket && !useWebSocket) {
          try { this.socket.close(); } catch (e) { this.socket = null; }
          this.socket = null;
        }

        if(this.radio_mode=='在线模式' && useWebSocket){
          this.status = statusParam;
          this.initWebSocket(fileParam);
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
            bID:this.$route.params.bID,
            file:fileParam,
            status:statusParam
          }
        })
        .then((res) => {
          if(res.data.msg=="success"){
            this.show.clips=res.data.data.flat;
            this.show.totalTime=this.show.clips[this.show.clips.length-1].startTime+this.show.clips[this.show.clips.length-1].duration-1
            
            //备份当前数据
            this.backup.peos = JSON.parse(JSON.stringify(this.peos));
            this.backup.rooms=JSON.parse(JSON.stringify(this.rooms));
            this.backup.exits=JSON.parse(JSON.stringify(this.exits));
            this.backup.pointsNav=JSON.parse(JSON.stringify(this.pointsNav));
            this.backup.pointsNavView=JSON.parse(JSON.stringify(this.pointsNavView));
            this.backup.viewInfo=JSON.parse(JSON.stringify(this.viewInfo)); 
            this.backup.ks=JSON.parse(JSON.stringify(this.ks)); 
            this.show.nowBusy=0;
            this.backup.show=JSON.parse(JSON.stringify(this.show)); 
            this.backup.nST=JSON.parse(JSON.stringify(this.nST)); 
            this.backup.bST=JSON.parse(JSON.stringify(this.bST)); 
            this.show.nowBusy=0;

            //重绘所有内容(播放内容)
            this.peos = this.back_poes(res.data.data.frame.peos,res.data.data.frame.viewInfo.imgX0,res.data.data.frame.viewInfo.imgY0,res.data.data.frame.nST.sT);
            this.rooms = this.back_rooms(res.data.data.frame.rooms,res.data.data.frame.viewInfo.imgX0,res.data.data.frame.viewInfo.imgY0,res.data.data.frame.nST.sT);
            this.exits = this.back_exit(res.data.data.frame.exit,res.data.data.frame.viewInfo.imgX0,res.data.data.frame.viewInfo.imgY0,res.data.data.frame.nST.sT);
            this.pointsNav = this.back_navs(res.data.data.frame.navPos,res.data.data.frame.viewInfo.imgX0,res.data.data.frame.viewInfo.imgY0,res.data.data.frame.nST.sT);
            this.viewInfo = res.data.data.frame.viewInfo;
            //this.viewInfo.isViewKs = false;
            this.nST = res.data.data.frame.nST;
            this.initFloorStoreFromCurrentArrays();
            this.draw();
            if (this.view3D.enabled) {
              this.syncThreeSceneData();
            }

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
              // 关闭加载框后自动从第0帧开始播放
              setTimeout(() => {  
                loading.close();
                this.play(0);
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
            loading.close();
            this.$notify.error({
              title: '错误',
              message: "当前项目还未模拟执行，无可播放动画",
              offset: 100
            });
            this.TID=0;
          }
        })
        .catch((error)=> {
          loading.close();
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
//     playBack_1(options = {}){
//       const fileParam = options.file || '2';
//       const statusParam = options.status || 2;
//       this.viewInfo.isViewHeat=false;
//       // alert(this.radio_mode)
      
//       this.heatInit();

//       if(this.radio_mode=='在线模式'){
//         this.status = statusParam;
//         this.initWebSocket(fileParam);
//       }

//       const loading = this.$loading({
//           lock: true,
//           text: '正在加载播放所需数据...',
//           spinner: 'el-icon-loading',
//           background: 'rgba(0, 0, 0, 0.7)'
//       });

//       var url = restweburl + 'getReplayData';
//       axios({
//         url: url,
//         method: "post",
//         data:{
//           bID:this.$route.params.bID,
//           file:fileParam,
//           status:statusParam
//         }
//       })
//       .then((res) => {
//         if(res.data.msg=="success"){
//           this.show.clips=res.data.data.flat;
//           this.show.totalTime=this.show.clips[this.show.clips.length-1].startTime+this.show.clips[this.show.clips.length-1].duration-1
          
//           //备份当前数据
//           this.backup.peos=JSON.parse(JSON.stringify(this.peos));
//           this.backup.rooms=JSON.parse(JSON.stringify(this.rooms));
//           this.backup.exits=JSON.parse(JSON.stringify(this.exits));
//           this.backup.connectors=JSON.parse(JSON.stringify(this.connectors));
//           this.backup.pointsNav=JSON.parse(JSON.stringify(this.pointsNav));
//           this.backup.pointsNavView=JSON.parse(JSON.stringify(this.pointsNavView));
//           this.backup.viewInfo=JSON.parse(JSON.stringify(this.viewInfo)); 
//           this.show.nowBusy=0;
//           this.backup.show=JSON.parse(JSON.stringify(this.show)); 
//           this.backup.nST=JSON.parse(JSON.stringify(this.nST)); 
//           this.backup.bST=JSON.parse(JSON.stringify(this.bST)); 
//           this.backup.ks = JSON.parse(JSON.stringify(this.ks));
//           this.show.nowBusy=0;

//           //重绘所有内容(播放内容)
//           this.peos = this.back_poes(res.data.data.frame.peos,res.data.data.frame.viewInfo.imgX0,res.data.data.frame.viewInfo.imgY0,res.data.data.frame.nST.sT);
//           this.rooms = this.back_rooms(res.data.data.frame.rooms,res.data.data.frame.viewInfo.imgX0,res.data.data.frame.viewInfo.imgY0,res.data.data.frame.nST.sT);
//           this.exits = this.back_exit(res.data.data.frame.exit,res.data.data.frame.viewInfo.imgX0,res.data.data.frame.viewInfo.imgY0,res.data.data.frame.nST.sT);
//           this.pointsNav = this.back_navs(res.data.data.frame.navPos,res.data.data.frame.viewInfo.imgX0,res.data.data.frame.viewInfo.imgY0,res.data.data.frame.nST.sT);
//           this.connectors = this.back_connectors(res.data.data.frame.connectors, res.data.data.frame.viewInfo.imgX0, res.data.data.frame.viewInfo.imgY0, res.data.data.frame.nST.sT);
//           //this.viewInfo = res.data.data.frame.viewInfo;
//           this.nST = res.data.data.frame.nST;
//           this.draw();
//           if (this.view3D.enabled) {
//             this.syncThreeSceneData();
//           }

//           //热力图加载
//           url = restweburl + 'getHeatMap';
//           axios({
//             url: url,
//             method: "post",
//             data:{
//               bID:this.$route.params.bID
//             }
//           })
//           .then((res) => {
//             this.data = res.data.data;
//             //本地加载
//             if(this.radio_mode=='本地模式'){
//               let file = document.getElementById('fileInput').files[0];
//               if (!file) {
//                 return;
//               }
            
//               let reader = new FileReader();
//               reader.readAsText(file, 'utf-8');
//               reader.onload = ((e) => {
//                 this.dat = e.target.result;

//                 function runtimeLiteralParseHelper(d) {
//                   return eval(d);
//                 }
//                 this.d5 = runtimeLiteralParseHelper(e.target.result);  
//               });
//             }
//             setTimeout(() => {  
//               loading.close();
//           }, 1000);
//           })
//           .catch((error)=> {
//             loading.close();
//             this.$notify.error({
//               title: '错误',
//               message: error,
//               offset: 100,
//               duration:0,
//             });
//           });
//         }
//         else{
//           loading.close();
//           this.$notify.error({
//             title: '错误',
//             message: "当前项目还未模拟执行，无可播放动画",
//             offset: 100
//           });
//           this.TID=0;
//         }
//       })
//       .catch((error)=> {
//         loading.close();
//         console.log(error);
//         this.$notify.error({
//           title: '错误',
//           message: error,
//           offset: 100,
//           duration:0,
//       });
//       });
//   },
//   //回放功能
//   playBack_2(options = {}){
//     const fileParam = options.file || '3';
//     const statusParam = options.status || 3;
//     this.viewInfo.isViewHeat=false;
//     // alert(this.radio_mode)
    
//     this.heatInit();

//     if(this.radio_mode=='在线模式'){
//       this.status = statusParam;
//       this.initWebSocket(fileParam);
//     }

//     const loading = this.$loading({
//         lock: true,
//         text: '正在加载播放所需数据...',
//         spinner: 'el-icon-loading',
//         background: 'rgba(0, 0, 0, 0.7)'
//     });

//     var url = restweburl + 'getReplayData';
//     axios({
//       url: url,
//       method: "post",
//       data:{
//         bID:this.$route.params.bID,
//         file:fileParam,
//         status:statusParam
//       }
//     })
//     .then((res) => {
//       if(res.data.msg=="success"){
//         this.show.clips=res.data.data.flat;
//         this.show.totalTime=this.show.clips[this.show.clips.length-1].startTime+this.show.clips[this.show.clips.length-1].duration-1
        
//         //备份当前数据
//         this.backup.peos = JSON.parse(JSON.stringify(this.peos));
//         this.backup.rooms=JSON.parse(JSON.stringify(this.rooms));
//         this.backup.exits=JSON.parse(JSON.stringify(this.exits));
//         this.backup.connectors=JSON.parse(JSON.stringify(this.connectors));
//         this.backup.pointsNav=JSON.parse(JSON.stringify(this.pointsNav));
//         this.backup.pointsNavView=JSON.parse(JSON.stringify(this.pointsNavView));
//         this.backup.viewInfo=JSON.parse(JSON.stringify(this.viewInfo)); 
//         this.show.nowBusy=0;
//         this.backup.show=JSON.parse(JSON.stringify(this.show)); 
//         this.backup.nST=JSON.parse(JSON.stringify(this.nST)); 
//         this.backup.bST=JSON.parse(JSON.stringify(this.bST)); 
//         this.show.nowBusy=0;

//         //重绘所有内容(播放内容)
//         this.peos = this.back_poes(res.data.data.frame.peos,res.data.data.frame.viewInfo.imgX0,res.data.data.frame.viewInfo.imgY0,res.data.data.frame.nST.sT);
//         this.rooms = this.back_rooms(res.data.data.frame.rooms,res.data.data.frame.viewInfo.imgX0,res.data.data.frame.viewInfo.imgY0,res.data.data.frame.nST.sT);
//         this.exits = this.back_exit(res.data.data.frame.exit,res.data.data.frame.viewInfo.imgX0,res.data.data.frame.viewInfo.imgY0,res.data.data.frame.nST.sT);
//         this.pointsNav = this.back_navs(res.data.data.frame.navPos,res.data.data.frame.viewInfo.imgX0,res.data.data.frame.viewInfo.imgY0,res.data.data.frame.nST.sT);
//         this.connectors = this.back_connectors(res.data.data.frame.connectors, res.data.data.frame.viewInfo.imgX0, res.data.data.frame.viewInfo.imgY0, res.data.data.frame.nST.sT);
//         // this.viewInfo.X1 = (this.viewInfo.X1-this.viewInfo.X0)*this.nST.sT;
//         // this.viewInfo.Y1 = (this.viewInfo.Y1-this.viewInfo.Y0)*this.nST.sT;
//         // this.viewInfo.X0 = 0;
//         // this.viewInfo.Y0 = 0;
//         // this.viewInfo.scale=1;
//         // this.viewInfo.sT=1;
//         //this.viewInfo = res.data.data.frame.viewInfo;
//         this.nST = res.data.data.frame.nST;
//         this.draw();
//         if (this.view3D.enabled) {
//           this.syncThreeSceneData();
//         }

//         //热力图加载
//         url = restweburl + 'getHeatMap';
//         axios({
//           url: url,
//           method: "post",
//           data:{
//             bID:this.$route.params.bID
//           }
//         })
//         .then((res) => {
//           this.data = res.data.data;
//           //本地加载
//           if(this.radio_mode=='本地模式'){
//             let file = document.getElementById('fileInput').files[0];
//             if (!file) {
//               return;
//             }
          
//             let reader = new FileReader();
//             reader.readAsText(file, 'utf-8');
//             reader.onload = ((e) => {
//               this.dat = e.target.result;

//               function runtimeLiteralParseHelper(d) {
//                 return eval(d);
//               }
//               this.d5 = runtimeLiteralParseHelper(e.target.result);  
//             });
//           }
//           setTimeout(() => {  
//             loading.close();
//         }, 1000);
//         })
//         .catch((error)=> {
//           loading.close();
//           this.$notify.error({
//             title: '错误',
//             message: error,
//             offset: 100,
//             duration:0,
//           });
//         });
//       }
//       else{
//         loading.close();
//         this.$notify.error({
//           title: '错误',
//           message: "当前项目还未模拟执行，无可播放动画",
//           offset: 100
//         });
//         this.TID=0;
//       }
//     })
//     .catch((error)=> {
//       loading.close();
//       console.log(error);
//       this.$notify.error({
//         title: '错误',
//         message: error,
//         offset: 100,
//         duration:0,
//     });
//     });
// },
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

      const socketOpen = this.socket && typeof this.socket.send === 'function' && this.socket.readyState === WebSocket.OPEN;
      for(let i=clipNum;i<=clipNum+buff;i++){
        this.socketState=1;
        if (socketOpen) {
          this.sendSocket({bID:this.$route.params.bID,flat:i});
          while(this.socketState==1){
            await this.deadlock();
          }
        } else {
          await this.fetchReplayFlat(i);
          this.socketState=0;
        }
      }
      this.show.nowBusy=0;
      //边缓冲边渲染
      this.alwaysRun();
      for(let i=clipNum+buff+1;i<=this.show.clips.length;i++){
        this.socketState=1;
        if (socketOpen) {
          this.sendSocket({bID:this.$route.params.bID,flat:i});
          while(this.socketState==1){
            await this.deadlock();
          }
        } else {
          await this.fetchReplayFlat(i);
          this.socketState=0;
        }
      }
      // 安全关闭 WebSocket 连接
      if(this.socket){
        try{
          if (typeof this.socket.close === 'function') {
            this.socket.close();
          } else if (typeof this.socket.disconnect === 'function') {
            this.socket.disconnect();
          }
        }catch(e){
          console.log(e);
        }
      }
    },
    async alwaysRun_local(){
      let i = this.show.frameNum;
      while(i < this.d5.length){
        this.show.showPeople=this.d5[i];
        if (this.view3D.enabled) {
          this.syncThreeReplayFrame(this.show.showPeople);
        }
        this.draw();
        this.show.nowTime+=1;
        const advance = await this.wait();
        if(this.TID==11 || this.TID==0){
          this.show.lastFrameTime = 0;
          return;
        }
        i += advance || 1;
      }
      this.show.lastFrameTime = 0;
    },
    async alwaysRun(){
      while (this.show.clipData.length > 0) {
        const currentClip = this.show.clipData[0];
        if (!currentClip) {
          this.show.clipData.shift();
          continue;
        }
    
        let frameIndex = this.show.frameNum;
        while (frameIndex < currentClip.length) {
          this.show.showPeople = currentClip[frameIndex];
          if (this.view3D.enabled) {
            this.syncThreeReplayFrame(this.show.showPeople);
          }
          this.draw();
          this.show.nowTime += 1;
    
          const advance = await this.wait();
          if (this.TID === 11 || this.TID === 0) {
            this.show.lastFrameTime = 0;
            return; // Paused or stopped
          }
          frameIndex += advance || 1;
        }
    
        this.show.frameNum = 0; // Reset for next clip
        this.show.clipData.shift();
      }
    
      // End of animation
      this.TID = 11; // Set to paused state
      this.animationState = 'finished';
      this.show.nowBusy = 0;
      this.show.lastFrameTime = 0;
    },
    // 进度条跳转：基于当前播放模式重启播放到指定时间点
    // 进度条功能已移除
    jump(){
      return;
    },
    init_show(){
      this.show = {
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
        targetFps:30,
        frameInterval:1000/30,
        maxCatchupFrames:3,
        lastFrameTime:0,
        sc:1,
        yx:0,
        yx2:10,
        yy:0,
        yy2:10
      };

    },
    //保存项目
    save(){
        var url = restweburl + 'saveBlueprint';
        const allFloors = (this.floor2D && this.floor2D.initialized) ? this.getAllFloorsSnapshot() : {
          peos: this.peos,
          rooms: this.rooms,
          pointsNav: this.pointsNav,
          pointsNavView: this.pointsNavView,
          exits: this.exits,
          ks: this.ks
        };
        axios({
          url: url,
          headers:{"bID":this.$route.params.bID},
          method: "post",
          data:{
            peos:allFloors.peos,
            rooms:allFloors.rooms,
            pointsNav:allFloors.pointsNav,
            exits:allFloors.exits,
            connectors:this.connectors,
            pointsNavView:allFloors.pointsNavView,
            viewInfo:this.viewInfo,
            drawConfig:this.drawConfig,
            drawConfig_color:this.drawConfig_color,
            simulateConfig:this.simulateConfig,
            show:this.show,
            nST:this.nST,
            bST:this.bST,
            ks:allFloors.ks,
            selectMethod:this.selectMethod, // 选择的出口方案 
            old_selectMethod:this.old_selectMethod,
            selectMethodALL:this.selectMethodALL, // 所有可选出口方案 
            selectMethodALLResult:this.selectMethodALLResult, // 模拟结果
            numberOptions:this.numberOptions,
          }
        })
        .then((res) => {
          if(res.data.msg=='success'){
            this.$message({
              message: '保存成功',
              type: 'success'
            });
            sessionStorage.clear();
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
