<template >
  <div class="main" style="background-color: lightyellow;">
    <div ref="div" style="display: flex;justify-content: center;top:0;;width: 100%;background-color: lightyellow;">
    <div style="display: flex;justify-content: center; margin-right: 10px;">
      <el-dropdown :disabled="TID==11||TID==19||TID==10" style="margin-left:10px">
        <el-button type="primary">
          项目管理<i class="el-icon-arrow-down el-icon--right"></i>
        </el-button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item :disabled="TID==11||TID==19||TID==10" @click.native="save()">{{"保存："+$route.params.bID+"号项目"}}</el-dropdown-item>
          <el-dropdown-item :disabled="TID==10" @click.native="handleClose()">关闭项目</el-dropdown-item>
          <el-dropdown-item :disabled="TID==10" @click.native="dialogVisible=true;">修改项目</el-dropdown-item>
          <el-dropdown-item :disabled="TID==10" @click.native="copy();">项目另存为</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <el-dropdown :disabled="TID==11||TID==19||TID==10" style="margin-left:10px">
        <el-button type="primary">
          场景构建<i class="el-icon-arrow-down el-icon--right"></i>
        </el-button>
        <el-dropdown-menu slot="dropdown">
          <!-- <h5 style="text-align:center">方式:左键新建</h5> -->
          <el-dropdown-item @click.native="TID=5" :disabled="TID==11||TID==19||TID==10">新建房间</el-dropdown-item>
          <el-dropdown-item @click.native="startNavEdit()" :disabled="TID==11||TID==19||TID==10">新建导航点</el-dropdown-item>
          <el-dropdown-item @click.native="TID=7" :disabled="TID==11||TID==19||TID==10">新建集合点</el-dropdown-item>
          <el-dropdown-item @click.native="TID=20" :disabled="TID==11||TID==19||TID==10">新建统计框</el-dropdown-item>
          <el-dropdown-item @click.native="statistic=true,calc()" :disabled="TID==11||TID==19||TID==10">统计信息</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <!-- <el-dropdown :disabled="TID==11||TID==19||TID==10" style="margin-left:10px">
        <el-button type="primary">
          模拟执行<i class="el-icon-arrow-down el-icon--right"></i>
        </el-button> -->
        <!-- <el-dropdown-menu slot="dropdown">
          <el-dropdown-item @click.native="TID=5" :disabled="TID==11||TID==19||TID==10">参数检验</el-dropdown-item>
          <el-dropdown-item @click.native="TID=6,draw()" :disabled="TID==11||TID==19||TID==10">撤离模拟</el-dropdown-item>
          <el-dropdown-item @click.native="TID=7" :disabled="TID==11||TID==19||TID==10">动画模式</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown> -->
      <el-dropdown :disabled="TID==11||TID==19||TID==10" style="margin-left:10px">
        <el-button type="primary">
          模拟执行<i class="el-icon-arrow-down el-icon--right"></i>
        </el-button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item @click.native="check()" :disabled="TID==11||TID==19||TID==10">参数检验</el-dropdown-item>
          <el-dropdown-item :disabled="!isValid || TID==11||TID==19||TID==10" @click.native="upload(),this.isOk = true,percentage=0">撤离模拟</el-dropdown-item>
          <el-dropdown-item v-if="TID!=11&& TID!=19" :disabled="TID==10" @click.native="dialogVisible_2=true">动画模拟</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <el-dropdown :disabled="TID==11||TID==19||TID==10" style="margin-left:10px">
        <el-button type="primary">
          统计结果<i class="el-icon-arrow-down el-icon--right"></i>
        </el-button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item @click.native="dialogVisible_attr_show_1=true;smode='人数';initShow()">1.撤离人数-时间</el-dropdown-item>
          <el-dropdown-item @click.native="dialogVisible_attr_show_2=true;smode='剂量';initShow_2()">2.受照剂量-时间</el-dropdown-item>
          <el-dropdown-item @click.native="dialogVisible_attr_show_3=true">3.区域密度-时间</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <el-dropdown :disabled="TID==11||TID==19||TID==10" style="margin-left:10px">
        <el-button type="primary">
          设置<i class="el-icon-arrow-down el-icon--right"></i>
        </el-button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item :disabled="TID==10" type="primary" @click.native="handleFullScreen()">全屏显示</el-dropdown-item>
          <el-dropdown-item @click.native="dialogVisible_attr_2=true" :disabled="TID==11||TID==19||TID==10">图层控制</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
        <!-- <el-button :disabled="TID==10" type="primary" 
        >{{"项目: "+$route.params.bID}}</el-button> -->
        <!-- <el-button :disabled="TID==10" type="primary" @click="handleFullScreen()"
        >全屏</el-button> -->
        <!-- <el-button :disabled="TID==10" type="primary" @click="dialogVisible=true;"
        >修改项目</el-button>
        <el-button :disabled="TID==10" type="primary" @click="handleClose()"
        >关闭</el-button> -->
    </div>
    <div  style="display: flex;justify-content: center;margin-right: 10px">
        <!-- <el-button type="success"
          @click="TID=5" :disabled="TID==11||TID==19||TID==10">新建房间</el-button>
        <el-button type="success"
          @click="TID=6,draw()" :disabled="TID==11||TID==19||TID==10">新建导航点</el-button>
        <el-button type="success"
          @click="TID=7" :disabled="TID==11||TID==19||TID==10">新建出口</el-button> -->
        <!-- <el-button type="success" @click="dialogVisible_attr_2=true" :disabled="TID==11||TID==19||TID==10"
          >图层控制</el-button> -->
    </div>
    <div style="display: flex;justify-content: center;margin-left: 10px">
        <!-- <el-button type="warning" :disabled="TID==11||TID==19||TID==10" @click="save()">保存</el-button>
        <el-button type="warning" @click="check()" :disabled="TID==11||TID==19||TID==10">参数校验</el-button>
        <el-button type="warning" class="custom-button" :disabled="!isValid || TID==11||TID==19||TID==10" @click="upload(),this.isOk = true,percentage=0">模拟执行</el-button>
        <el-button type="warning" v-if="TID!=11&& TID!=19" :disabled="TID==10" class="custom-button" @click="TID=11,playBack()">播放动画</el-button>
        <el-button type="warning" @click="dialogVisible_attr_show=true" :disabled="TID==11||TID==19||TID==10">结果分析</el-button> -->
        <el-button type="warning" v-if="TID==11 || TID==19" :disabled="TID==10" class="custom-button" @click="TID=0,recovery()">退出</el-button>
        <el-button type="danger" :disabled="TID==10" @click="TID=0">reset</el-button>
    </div>
    <div>

    </div>
    <div class="state" style="display: flex;justify-content: center;margin-left: 10px;margin-top: 10px;">
      <div v-if="isUpdate==1&& TID!=10"><i class="el-icon-loading"></i>&ensp;&ensp;更新中</div>
      <div v-if="isUpdate==0&& TID!=10" style="color: green"><i class="el-icon-success" ></i>&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;</div>
      <div v-if="isUpdate==-1&& TID!=10" style="color: red"><i class="el-icon-error" ></i>校验错误</div>
      <div v-if="isUpdate==0 && TID==10"><i class="el-icon-loading"></i>演算中.{{ this.up.precent }}%</div>
    </div>
    </div>
    
    <hr style="border:none;height:1px;background-color:rgb(203,86,6)">

    <div ref="div2">
      <!-- <el-checkbox v-model="viewInfo.isViewRoom" label="房间图层"></el-checkbox>
      <el-checkbox v-model="viewInfo.isViewNav" label="导航点图层"></el-checkbox>
      <el-checkbox v-model="viewInfo.isViewPeos" label="人群图层"></el-checkbox>
      <el-checkbox v-model="viewInfo.isViewHeat" label="热力图图层"></el-checkbox> -->
    </div>
     
    <div>
      <canvas id="canvas" ref="canvas" style="z-index:1"></canvas> 
      <canvas id="heatmap" style="margin-top: 1000px;" :width="1000" :height="600" ></canvas>
    </div>
    <div v-if="navEdit && navEdit.active" class="nav-edit-toolbar" style="position: fixed; top: 0; right: 0;">
      <span class="toolbar-title">导航点编辑</span>
      <el-switch v-model="navEdit.showPoints" active-text="显示导航点" inactive-text="隐藏导航点"></el-switch>
      <el-button type="danger" size="mini" :disabled="navEdit.selectedIndex<0" @click="deleteSelectedNavPoint">删除选中导航点</el-button>
      <el-button type="primary" size="mini" @click="finishNavEdit">结束编辑</el-button>
    </div>

    <div v-if="TID==11 || TID==19" style="display:flex;position: fixed;bottom: 0;width:100%;height:40px;background-color: rgb(56,78,62);">
      <el-button v-if="TID==11&&show.nowBusy==0" style="border: none;font-size: 12px;margin-left: 5px;margin-top: 2px;margin-bottom: 2px" @click="play(show.nowTime)" icon="el-icon-video-play" circle></el-button>
      <el-button v-if="TID==19&&show.nowBusy==0" style="border: none;font-size: 12px;margin-left: 5px;margin-top: 2px;margin-bottom: 2px" @click="TID=11" icon="el-icon-video-pause" circle></el-button>
      <el-button v-if="show.nowBusy==1" style="border: none;font-size: 12px;margin-left: 5px;margin-top: 2px;margin-bottom: 2px" icon="el-icon-loading" circle></el-button>
      <el-slider @mousedown.native="te" v-model="show.nowTime" :max="show.totalTime" style="width:90%;margin-left: 20px;"
      :change="jump()"></el-slider>
    </div>
    <div v-if="dialogVisible_attr">
      <el-dialog
      title="房间 属性"
      :visible.sync="dialogVisible_attr"
      width="40%"
      :append-to-body="true"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
      >
    <el-form v-if="this.rooms.length>0&&this.roomRule.currentID!=-1" size="mini">
      <el-form-item label="名称">
        <el-input v-model="rooms[roomRule.currentID].attr.name" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="人数">
        <el-input type="number" v-model="rooms[roomRule.currentID].attr.peoNum" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="速度 (m/s)" :label-width="formLabelWidth">
        <el-input type="number" v-model="rooms[roomRule.currentID].attr.speed" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="开始时间 (s)" :label-width="formLabelWidth">
        <el-input  v-model="rooms[roomRule.currentID].attr.startTime" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="房间颜色" :label-width="formLabelWidth">
        <el-color-picker v-model="rooms[roomRule.currentID].attr.color" show-alpha></el-color-picker>
      </el-form-item>
  </el-form>
  <div slot="footer" class="dialog-footer">
    <el-button type="danger" style="float: left;" @click="dialogVisible_attr = false,delRoom(),draw()">删除房间</el-button>
    <el-button type="primary" @click="dialogVisible_attr = false,drawRoomPeo(),draw()">确 定</el-button>
  </div>
  </el-dialog>
</div>
<div v-if="dialogVisible_attr_2">
      <el-dialog
      title="图层控制"
      :visible.sync="dialogVisible_attr_2"
      width="50%"
      :append-to-body="true"
      >
      <el-table
      size="mini"
    :data="drawConfig"
    border
    style="width: 100%"
    :header-cell-style="{ 'text-align': 'center' }"
    :cell-style="{ 'text-align': 'center' }"
    table-layout='auto'>
    <el-table-column
      prop="element"
      label="元素"
      width="120">
    </el-table-column>
    <el-table-column
      prop="r"
      label="半径/线宽"
      width="220">
      <template slot-scope="scope">
        <el-input-number v-model="scope.row.r" @change="handleChange" :min="1" :max="10" label="描述文字"></el-input-number>
      </template>
    </el-table-column>
    <el-table-column
      prop="state"
      label="显示/隐藏"
      width="220">
      <template slot-scope="scope">
        <el-radio v-model="scope.row.state" :label=true>显示</el-radio>
        <el-radio v-model="scope.row.state" :label=false>隐藏</el-radio>
      </template>
    </el-table-column>
    <el-table-column
      prop="default"
      label="默认值">
    </el-table-column>
    <el-table-column
      prop="color"
      label="颜色">
      <template slot-scope="scope">
        <el-color-picker v-model="scope.row.color"></el-color-picker>
      </template>
    </el-table-column>
  </el-table>
  <hr>
  <div ref="div2">
    <el-checkbox v-model="viewInfo.isViewRoom" label="房间图层"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewNav" label="导航点图层"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewPeos" label="人群图层"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewHeat" label="热力图图层"></el-checkbox>
    
    <el-checkbox v-model="viewInfo.isViewBorder" label="底图边框"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewImg" label="底图显示"></el-checkbox>

    <el-checkbox v-model="viewInfo.isViewRoomId" label="房间编号"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewRoomName" label="房间名称"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewExportId" label="集合点编号"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewExportName" label="集合点名称"></el-checkbox>
  </div>
  <div slot="footer" class="dialog-footer">
    <el-button type="primary" @click="dialogVisible_attr_2 = false,draw()">确 定</el-button>
  </div>
  </el-dialog>
</div>

<el-dialog
      title="集合点 属性"
      :visible.sync="dialogVisible_3"
      width="40%"
      :append-to-body="true"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
      >
    <el-form v-if="this.exits.length>0 && dialogVisible_3" size="mini">
      <el-form-item label="名称">
        <el-input v-model="exits[numMovingExit].name" autocomplete="off"></el-input>
      </el-form-item>
  </el-form>
  <div slot="footer" class="dialog-footer">
    <el-button type="danger" style="float: left;" @click="dialogVisible_3 = false;delExport();draw();">删除集合点</el-button>
    <el-button type="primary" @click="dialogVisible_3 = false;draw()">确 定</el-button>
  </div>
  </el-dialog>

  <div v-show="dialogVisible_attr_show_1">
      <el-dialog
      title="撤离人数-时间"
      :visible.sync="dialogVisible_attr_show_1"
      width="80%"
      :fullscreen="true"
      :append-to-body="false"
      >
      <el-tabs type="border-card"  :v-model="typeChoose" @tab-click="selectShow" style="height: 1000px; overflow-y: auto;">
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange()">
            <el-radio-button label="graph">图表</el-radio-button>
            <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition=='graph'" style="width: 1000px; height: 500px;" id="撤离人数-时间"></div>
        <div v-show="tabPosition=='data'">
            <el-button @click="exportExcel()">下载</el-button>
            <el-scrollbar class="bor" style="height:800px;">
              <el-table
                :data="table_raw"
                style="width: 100%">
                  <el-table-column
                    v-for="col in this.table_raw_label"
                    :key="col.prop"
                    :prop="col.prop"
                    :label="col.label"
                  ></el-table-column>
              </el-table>
          </el-scrollbar>
        </div>
      </el-tabs>
    </el-dialog>
  </div>

  <div v-show="dialogVisible_attr_show_2">
      <el-dialog
      title="受照剂量-时间"
      :visible.sync="dialogVisible_attr_show_2"
      width="80%"
      :fullscreen="true"
      :append-to-body="false"
      >
      <el-tabs type="border-card"  :v-model="typeChoose" @tab-click="selectShow" style="height: 1000px; overflow-y: auto;">
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange_2()">
            <el-radio-button label="graph" >图表</el-radio-button>
            <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition=='graph'" style="width: 1000px; height: 500px;" id="受照剂量-时间"></div>
        <div v-show="tabPosition=='data'">
            <el-button @click="exportExcel()">下载</el-button>
            <el-scrollbar class="bor" style="height:800px;">
              <el-table
                :data="table_raw"
                style="width: 100%">
                  <el-table-column
                    v-for="col in this.table_raw_label"
                    :key="col.prop"
                    :prop="col.prop"
                    :label="col.label"
                  ></el-table-column>
              </el-table>
          </el-scrollbar>
        </div>
      </el-tabs>
    </el-dialog>
  </div>

  <div v-show="dialogVisible_attr_show_3">
      <el-dialog
      title="区域密度-时间"
      :visible.sync="dialogVisible_attr_show_3"
      width="80%"
      :fullscreen="true"
      :append-to-body="false"
      >
      <!-- <el-button v-if="!isEdit" @click="isEdit=true">设置</el-button> -->
      
      <div>
          <el-form size="mini">
            <el-form-item label="区域划定">
              <el-button @click="clearK()">清除划区</el-button>
            </el-form-item>
            <el-table
              :data="this.ks">
              <el-table-column
                label="划框id"
                prop="kid">
              </el-table-column>
              <el-table-column
                label="起始时间"
                prop="attr">
                <template slot-scope="scope">
                    <el-input size="small" @input="oninput()" v-model="ks[scope.$index].attr.startTime"></el-input>
                </template>
              </el-table-column>
              <el-table-column
                label="结束时间"
                prop="attr">
                <template slot-scope="scope">
                    <el-input size="small" v-model="ks[scope.$index].attr.endTime"></el-input>
                </template>
              </el-table-column>
            </el-table>
            
          </el-form>
        </div>
        <el-button style="float:right;margin-top: 10px;" type="primary" @click="isEdit=false;densityCommit()">提交</el-button>
        <el-divider></el-divider>
        <el-table
        v-loading="at1"
              :data="this.ksd">
              <el-table-column
                label="划框id"
                prop="kid">
                <template slot-scope="scope">
                    {{ scope.$index+1 }}
                </template>
              </el-table-column>
              <el-table-column
                label="平均密度"
                prop="value">
                <template slot-scope="scope">
                    {{ ksd[scope.$index].value }}
                </template>
              </el-table-column>
            </el-table>
    </el-dialog>
  </div>


  <el-dialog
      title="修改项目"
      :visible.sync="dialogVisible"
      width="40%"
      center
      >
      <div style="text-align: center;justify-content: center;align-items: center;">
          <div style="margin-top:10px;">
              <span>项目名称：</span>
              <el-input v-model="xg.name" style="width:70%"></el-input>
          </div>
          <div style="margin-top:10px;">
              <span>项目介绍：</span>
              <el-input v-model="xg.description" style="width:70%"></el-input>
          </div>
          <div style="margin-top:10px;">
              <span>外场场址：</span>
              <el-input v-model="xg.addr" style="width:70%"></el-input>
          </div>
      </div>
      
      <span slot="footer" class="dialog-footer">
          <el-button @click="dialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="changeProject()">确 定</el-button>
      </span>
  </el-dialog>
  <!-- <div id="heat" :style="tsty">11111</div> -->
  <!-- <div id="1" style="position:absolute;top:0;">11111</div>z-index:10;position:absolute;top:0;width: 1526px; height: 598px; -->
  <el-dialog
      title="动画模拟"
      :visible.sync="dialogVisible_2"
      width="40%"
      center
      >
      <div>
        <!-- <el-radio-group v-model="radio_mode" style="display: flex;justify-content: center;">
          <el-radio-button label="在线模式"></el-radio-button>
          <el-radio-button label="本地模式"></el-radio-button>
        </el-radio-group> -->
      </div>
      <div v-if="radio_mode=='在线模式'">
        <!-- <h3 style="text-align:center">在线模式无需下载，但在大数据量情况可能造成卡顿</h3> -->
        <h3 style="text-align:center">使用动画模拟撤离全部流程</h3>
      </div>
        <!-- <div v-if="radio_mode=='本地模式'">
          <h3 style="text-align:center">本地模式需要先下载动画资料</h3>
          动画文件：<el-button @click="download()">下载</el-button>
          <div>
            已下载：<input type="file" id="fileInput">
          </div>
        </div> -->
      <span slot="footer" class="dialog-footer">
          <el-button @click="dialogVisible_2 = false">取 消</el-button>
          <el-button type="primary" @click="dialogVisible_2 = false;TID=11,playBack()">确 定</el-button>
      </span>
  </el-dialog>
  <el-dialog
    title="项目信息统计"
    :visible.sync="statistic"
    width="30%"
    >
    <!-- <div>房间总数：{{ rooms.length }}</div>
    <div>导航点数：{{ pointsNav.length }}</div>
    <div>集合点数：{{ exits.length }}</div>
    <div>人数：{{ totalNum }}</div> -->
    <el-descriptions title="用户信息" border>
      <el-descriptions-item label="房间总数">{{ rooms.length }}</el-descriptions-item>
      <el-descriptions-item label="导航点数">{{pointsNav.length}}</el-descriptions-item>
      <el-descriptions-item label="集合点数">{{exits.length}}</el-descriptions-item>
      <el-descriptions-item label="人数">
        {{totalNum}}
      </el-descriptions-item>
  </el-descriptions>
  </el-dialog>

</div>
</template>

<script src="./js/main.js"/>
<style>
  ::-webkit-scrollbar {
    /*隐藏滚轮*/
    display: none;
  }
  .main{
    touch-action: none;
    -ms-touch-action: none;
  }
</style>