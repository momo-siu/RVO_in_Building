<template>
  <div class="main project-container" :style="{ backgroundColor: drawConfig[8].state ? drawConfig[8].color : '#f8f9fa' }">
    <div ref="div" class="project-header">
      <div class="button-row">
        <!-- 项目管理按钮组 -->
        <div class="button-group primary-group">
          <el-dropdown :disabled="TID==11||TID==19||TID==10">
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
        </div>
        
        <!-- 场景构建按钮组 -->
        <div class="button-group success-group">
          <el-dropdown :disabled="TID==11||TID==19||TID==10">
            <el-button type="success">
              场景构建<i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item @click.native="TID=5" :disabled="TID==11||TID==19||TID==10">新建房间</el-dropdown-item>
              <el-dropdown-item @click.native="startNavEdit()" :disabled="TID==11||TID==19||TID==10">新建导航点</el-dropdown-item>
              <el-dropdown-item @click.native="TID=7" :disabled="TID==11||TID==19||TID==10">新建集合点</el-dropdown-item>
              <el-dropdown-item @click.native="TID=20" :disabled="TID==11||TID==19||TID==10">新建统计框</el-dropdown-item>
              <el-dropdown-item @click.native="TID=22" :disabled="TID==11||TID==19||TID==10">新建人口框</el-dropdown-item>
              <el-dropdown-item @click.native="statistic=true,calc()" :disabled="TID==11||TID==19||TID==10">统计信息</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
        
        <!-- 模拟执行按钮组 -->
        <div class="button-group warning-group">
          <el-dropdown :disabled="TID==11||TID==19||TID==10">
            <el-button type="warning">
              模拟执行<i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item @click.native="dialogVisible_attr_4=true" :disabled="TID==11||TID==19||TID==10">出口选择参数设置</el-dropdown-item>
              <el-dropdown-item @click.native="initShow_18()" :disabled="TID==11||TID==19||TID==10">出口方案选择</el-dropdown-item>
              <el-dropdown-item @click.native="check()" :disabled="TID==11||TID==19||TID==10">参数检验</el-dropdown-item>
              <el-dropdown-item :disabled="!isValid || TID==11||TID==19||TID==10" @click.native="upload(),this.isOk = true,percentage=0">方案模拟</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
          
          <el-dropdown :disabled="TID==11||TID==19||TID==10">
            <el-button type="warning">
              方案比选<i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item @click.native="dialogVisible_attr_6=true;smode='总体对比';">总体对比</el-dropdown-item>
              <el-dropdown-item @click.native="dialogVisible_attr_show_14=true;smode='撤离时间对比';initShow_14()">撤离时间</el-dropdown-item>
              <el-dropdown-item @click.native="dialogVisible_attr_show_15=true;smode='总剂量对比';initShow_15()">总剂量</el-dropdown-item>
              <el-dropdown-item @click.native="dialogVisible_attr_show_16=true;smode='最大个人剂量';initShow_16()">最大个人剂量</el-dropdown-item>
              <el-dropdown-item @click.native="dialogVisible_attr_show_19=true;smode='拥堵区域个数';initShow_19()">拥堵区域个数</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
        
        <!-- 结果展示按钮组 -->
        <div class="button-group primary-group">
          <el-dropdown :disabled="TID==11||TID==19||TID==10">
            <el-button type="primary">
              结果展示<i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item v-if="TID!=11&& TID!=19" :disabled="TID==10" @click.native="openAnimationSetting">动画展示</el-dropdown-item>
              <el-dropdown-item v-if="TID!=11&& TID!=19" :disabled="TID==10" @click.native="dialogVisible_6=true;smode='查看方案';show_method()">查看方案</el-dropdown-item>
              <el-dropdown-item @click.native="dialogVisible_attr_show_1=true;smode='人数';initShow()">撤离人数-时间</el-dropdown-item>
              <el-dropdown-item @click.native="dialogVisible_attr_show_2=true;smode='剂量';initShow_2()">受照剂量-时间</el-dropdown-item>
              <el-dropdown-item @click.native="dialogVisible_attr_show_3=true">区域密度-时间</el-dropdown-item>
              <el-dropdown-item @click.native="dialogVisible_attr_show_4=true;smode='人数';initShow_4()">撤离时间-人数</el-dropdown-item>
              <el-dropdown-item @click.native="dialogVisible_attr_show_5=true;smpde='直方图-剂量';initShow_5()">受照剂量-人数</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
          
          <el-dropdown :disabled="TID==11||TID==19||TID==10">
            <el-button type="primary">
              设置<i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item :disabled="TID==10" type="primary" @click.native="handleFullScreen()">全屏显示</el-dropdown-item>
              <el-dropdown-item @click.native="dialogVisible_attr_2=true" :disabled="TID==11||TID==19||TID==10">图层控制</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
        
        <!-- 退出按钮 -->
        <div class="button-group danger-group">
          <el-button type="danger" :disabled="TID==10" @click="handleExit()">退出</el-button>
        </div>
      </div>
    </div>
    <div>
    </div>
    <div class="state" style="display: flex;justify-content: center;margin-left: 10px;margin-top: 10px;color:rgb(255,255,255)">
      <div v-if="isUpdate==1&& TID!=10"><i class="el-icon-loading"></i>&ensp;&ensp;更新中</div>
      <div v-if="isUpdate==0&& TID!=10" style="color: green"><i class="el-icon-success" ></i>&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;</div>
      <div v-if="isUpdate==-1&& TID!=10" style="color: red"><i class="el-icon-error" ></i>校验错误</div>
      <div v-if="isUpdate==0 && TID==10"><i class="el-icon-loading"></i>{{ up.stageMessage || '演算中' }}</div>
    </div>
    
    <hr style="border:none;height:2px;background-color:rgb(70,130,180)">

    <div ref="div2">
      <!-- <el-checkbox v-model="viewInfo.isViewRoom" label="房间图层"></el-checkbox>
      <el-checkbox v-model="viewInfo.isViewNav" label="导航点图层"></el-checkbox>
      <el-checkbox v-model="viewInfo.isViewPeos" label="人群图层"></el-checkbox>
      <el-checkbox v-model="viewInfo.isViewHeat" label="热力图图层"></el-checkbox> -->
    </div>
     
    <div>
      <canvas id="canvas" ref="canvas" :width="1000" :height="600" style="z-index:1"></canvas> 
      <canvas id="heatmap" style="margin-top: 1000px;" :width="1000" :height="600" ></canvas>
    </div>
    <div v-if="navEdit && navEdit.active" class="nav-edit-toolbar" style="position: fixed; top: 0; right: 0; z-index: 1000; background: rgba(0,0,0,0.6); padding: 8px 12px; border-radius: 4px; color: #fff; display: flex; align-items: center; gap: 8px;">
      <span class="toolbar-title">导航点编辑</span>
      <el-switch v-model="navEdit.showPoints" active-text="显示导航点" inactive-text="隐藏导航点"></el-switch>
      <el-button type="danger" size="mini" :disabled="navEdit.selectedIndex<0" @click="deleteSelectedNavPoint">删除选中导航点</el-button>
      <el-button type="primary" size="mini" @click="finishNavEdit">结束编辑</el-button>
    </div>
    <div v-if="TID==11 || TID==19" style="display:flex;position: fixed;bottom: 0;width:100%;height:40px;background-color: rgb(56,78,62);align-items: center;">
      <el-button v-if="TID==11&&show.nowBusy==0" style="border: none;font-size: 12px;margin-left: 5px;margin-top: 2px;margin-bottom: 2px" @click="play(show.nowTime)" icon="el-icon-video-play" circle></el-button>
      <el-button v-if="TID==19&&show.nowBusy==0" style="border: none;font-size: 12px;margin-left: 5px;margin-top: 2px;margin-bottom: 2px" @click="TID=11" icon="el-icon-video-pause" circle></el-button>
      <el-button v-if="show.nowBusy==1" style="border: none;font-size: 12px;margin-left: 5px;margin-top: 2px;margin-bottom: 2px" icon="el-icon-loading" circle></el-button>
      <el-slider @mousedown.native="te" v-model="show.nowTime" :max="show.totalTime" style="width:calc(100% - 180px);margin-left: 20px;"
      :change="jump()"></el-slider>
      <el-button type="danger" style="margin-right: 10px;margin-left: 10px;font-size: 12px;padding: 8px 15px;" @click="exitAnimation">停止演示</el-button>
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
        <el-input v-model="tempName" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="人数">
        <el-input type="number" v-model="rooms[roomRule.currentID].attr.peoNum" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="速度 (m/s)">
        <el-input type="number" v-model="rooms[roomRule.currentID].attr.speed" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="开始时间 (s)">
        <el-input  v-model="rooms[roomRule.currentID].attr.startTime" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="房间颜色">
        <el-color-picker v-model="rooms[roomRule.currentID].attr.color" show-alpha></el-color-picker>
      </el-form-item>
  </el-form>
  <div slot="footer" class="dialog-footer">
    <el-button type="danger" style="float: left;" @click="dialogVisible_attr = false,delRoom(),draw()">删除房间</el-button>
    <el-button type="primary" @click="dialogVisible_attr = false,changeRoomName(),drawRoomPeo(),draw()">确 定</el-button>
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
      <el-input-number v-if="scope.row.element !== '房间底色' || scope.row.element !== '背景颜色'|| scope.row.element !== '人物颜色1' || scope.row.element !== '人物颜色2' || scope.row.element !== '人口框底色'" v-model="scope.row.r"  :min="1" :max="10" label="描述文字"></el-input-number>
      <span v-else>-</span> <!-- Display a placeholder when the row is for "房间底色" -->
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
    <template slot-scope="scope">
      <span v-if="scope.row.element === '房间底色' || scope.row.element === '蒙版颜色' || scope.row.element === '背景颜色' || scope.row.element !== '人物颜色1' || scope.row.element !== '人物颜色2' || scope.row.element === '人口框底色'">-</span>
      <span v-else>{{ scope.row.default }}</span>
    </template>
  </el-table-column>
  <el-table-column
    prop="color"
    label="颜色">
    <template slot-scope="scope">
      <el-color-picker v-model="scope.row.color" show-alpha v-if="scope.row.element === '房间底色' || scope.row.element === '蒙版颜色' || scope.row.element === '人口框底色'"></el-color-picker>
      <el-color-picker v-else v-model="scope.row.color"></el-color-picker>
    </template>
  </el-table-column>
</el-table>
  <hr>
  <div ref="div2">
    <el-checkbox v-model="viewInfo.isViewRoom" label="房间图层"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewNav" label="导航点图层"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewPeos" label="人群图层"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewHeat" label="热力图图层"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewPeoses" label="人口框图层"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewBorder" label="底图边框"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewImg" label="底图显示"></el-checkbox>

    <el-checkbox v-model="viewInfo.isViewRoomId" label="房间编号"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewRoomName" label="房间名称"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewPeosId" label="人口框编号"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewPeosName" label="人口框名称"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewExportId" label="集合点编号"></el-checkbox>
    <el-checkbox v-model="viewInfo.isViewExportName" label="集合点名称"></el-checkbox>

    <el-checkbox v-model="viewInfo.isViewKs" label="统计框图层"></el-checkbox>
  </div>
  <div slot="footer" class="dialog-footer">
    <el-button type="primary" @click="dialogVisible_attr_2 = false,draw()">确 定</el-button>
  </div>
  </el-dialog>
    </div>
    <div v-if="dialogVisible_attr_3">
      <el-dialog
      title="人口框 属性"
      :visible.sync="dialogVisible_attr_3"
      width="40%"
      :append-to-body="true"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
      >
    <el-form v-if="this.peos.length>0&&this.PeosRule.currentID!=-1" size="mini">
      <el-form-item label="名称">
        <el-input v-model="tempName" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="人数">
        <el-input type="number" v-model="peos[PeosRule.currentID].attr.peoNum" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="速度 (m/s)">
        <el-input type="number" v-model="peos[PeosRule.currentID].attr.speed" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="开始时间 (s)">
        <el-input  v-model="peos[PeosRule.currentID].attr.startTime" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="人口框颜色">
        <el-color-picker v-model="peos[PeosRule.currentID].attr.color" show-alpha></el-color-picker>
      </el-form-item>
  </el-form>
  <div slot="footer" class="dialog-footer">
    <el-button type="danger" style="float: left;" @click="dialogVisible_attr_3 = false,delPeos();draw();">删除人口框</el-button>
    <el-button type="primary" @click="dialogVisible_attr_3 = false,changePeosName();drawPeosPeo();draw();">确 定</el-button>
  </div>
  </el-dialog>
    </div>
    <div v-if="dialogVisible_attr_4">
      <el-dialog
      title="出口选择参数设置"
      :visible.sync="dialogVisible_attr_4"
      width="50%"
      :append-to-body="true"
      >
      <el-table :data="simulateConfig" style="width: 100%">
        <el-table-column prop="argument" label="参数" width="400"></el-table-column>
        <el-table-column label="数值">
          <template slot-scope="scope">
            <el-input-number
              v-model="scope.row.weight"
              :min="0"
              controls-position="right"
              style="width: 200px;">
            </el-input-number>
          </template>
        </el-table-column>
      </el-table>
  <div slot="footer" class="dialog-footer">
    <el-button type="primary" @click="dialogVisible_attr_4 = false,draw(),setOptions()">确 定</el-button>
  </div>
  </el-dialog>
    </div>
  <div v-if="dialogVisible_attr_5">
    
      <el-dialog
      title="已选出口"
      :visible.sync="dialogVisible_attr_5"
      width="1240px"
      :append-to-body="true"
      >
      <div>
        <el-table
        class="dialog-scrollable"
        :data="selectMethodDetail"
        border
        style="width: 1230px;"
        :height="270"
        :header-cell-style="{ 'text-align': 'center' }"
        :cell-style="{ 'text-align': 'center' }"
        ref="selectMethodDetailTable"
        >
              <el-table-column
                type="index"
                label="序号"
              ></el-table-column>
              <el-table-column
                prop="method"
                label="出口方案"
                width="180"
                size="20px">
              </el-table-column>  
              <el-table-column
                prop="number"
                label="出口个数"
                width="180"
                sortable
                :sort-method="(a,b)=>{return a.number - b.number}"
                size="12px">
              </el-table-column>   
              <el-table-column
                prop="grd"
                label="平均剂量/mSv"
                width="180"
                sortable
                :sort-method="(a,b)=>{return a.grd - b.grd}"
                :formatter="formatToScientificNotation"
                size="20px">
              </el-table-column>
              <el-table-column
                prop="dis"
                label="平均距离/m"
                width="180"
                sortable
                :sort-method="(a,b)=>{return a.dis - b.dis}"
                size="20px">
              </el-table-column>
              <el-table-column
                prop="time"
                label="平均时间/s"
                width="180"
                sortable
                :sort-method="(a,b)=>{return a.time - b.time}"
                size="20px">
              </el-table-column>
              <el-table-column
                prop="peo"
                label="平均出口人数/人"
                width="180"
                sortable
                :sort-method="(a,b)=>{return a.peo - b.peo}"
                size="20px">
              </el-table-column>
        </el-table>
        <h3>出口个数筛选</h3>
    <el-checkbox-group v-model="selectedNumber" style="margin-top: 20px;margin-bottom: 10px;" @change="filteredSelectMethodALL">
      <el-checkbox
        v-for="item in numberOptions"
        :key="item.toString()"
        :label="item.toString()">
        {{ item.toString() }}
      </el-checkbox>
    </el-checkbox-group>
  </div>
        <el-table
        class="dialog-scrollable"
        :data="selectMethodALL_1"
        border
        style="width: 1230px;"
        :height="400"
        :header-cell-style="{ 'text-align': 'center' }"
        :cell-style="{ 'text-align': 'center' }"
        @selection-change="handleSelectionChange"
        ref="multipleTable"
        >
              <el-table-column
                type="index"
                label="序号"
              ></el-table-column>
              <el-table-column
                prop="method"
                label="出口方案"
                width="180"
                size="18px">
              </el-table-column>  
              <el-table-column
                prop="number"
                label="出口个数"
                width="180"
                sortable
                :sort-method="(a,b)=>{return a.number - b.number}"
                size="10px">
              </el-table-column>   
              <el-table-column
                prop="grd"
                label="平均剂量/mSv"
                width="180"
                sortable
                :sort-method="(a,b)=>{return a.grd - b.grd}"
                :formatter="formatToScientificNotation"
                size="18px">
              </el-table-column>
              <el-table-column
                prop="dis"
                label="平均距离/m"
                width="180"
                sortable
                :sort-method="(a,b)=>{return a.dis - b.dis}"
                size="18px">
              </el-table-column>
              <el-table-column
                prop="time"
                label="平均时间/s"
                width="180"
                sortable
                :sort-method="(a,b)=>{return a.time - b.time}"
                size="18px">
              </el-table-column>
              <el-table-column
                prop="peo"
                label="平均出口人数/人"
                width="180"
                sortable
                :sort-method="(a,b)=>{return a.peo - b.peo}"
                size="18px">
              </el-table-column>
                <el-table-column
                type="selection"
                :reserve-selection="true"
                width="55"
                size="10px">
              </el-table-column>
        </el-table>
  <div slot="footer" class="dialog-footer">
    <el-button type="primary" @click="dialogVisible_attr_5 = false,draw();handleOK()">确 定</el-button>
  </div>
  </el-dialog>
</div>

    <div v-if="dialogVisible_attr_6">
      <el-dialog
      title="方案选择"
      :visible.sync="dialogVisible_attr_6"
      width="1270px"
      :append-to-body="true"
      >
      <el-table
  class="dialog-scrollable"
  :data="selectMethodALLResult"
  border
  style="width: 1230px"
  :header-cell-style="{ 'text-align': 'center' }"
  :cell-style="{ 'text-align': 'center' }"
  table-layout='auto'
  :height='700'
  @selection-change="handleSelection">
        <el-table-column
              type="index"
              label="序号"
        ></el-table-column>
        <el-table-column
          prop="method"
          label="出口方案"
          width="180"
          size="18px">
        </el-table-column>
        <el-table-column
        prop="number"
        label="出口个数"
        width="180"
        sortable
        :sort-method="(a,b)=>{return a.number - b.number}"
        size="10px">
          </el-table-column>   
        <el-table-column
          prop="time"
          label="最短时间/s"
          width="180"
          :sort-method="(a,b)=>{return a.time - b.time}"
          size="18px">
        </el-table-column>
        <el-table-column
          prop="grd"
          label="总剂量/mSv"
          width="180"
          :sort-method="(a,b)=>{return a.grd - b.grd}"
          :formatter="formatToScientificNotation"
          size="18px">
        </el-table-column>
        <el-table-column
          prop="now_pre_grd"
          label="最大个人剂量/mSv"
          width="180"
          :sort-method="(a,b)=>{return a.now_pre_grd - b.now_pre_grd}"
          :formatter="formatToScientificNotationpre"
          size="18px">
        </el-table-column>
        <el-table-column
          prop="peo"
          label="拥堵区域个数"
          width="180"
          :sort-method="(a,b)=>{return a.peo - b.peo}"
          size="18px">
        </el-table-column>
        <el-table-column
          label="选择"
          width="55">
          <template slot-scope="scope">
           <el-radio v-model="selectM" :label="scope.row.method">{{ '' }}</el-radio>
          </template>
    </el-table-column>


</el-table>
  <div slot="footer" class="dialog-footer">
    <el-button type="primary" @click="dialogVisible_attr_6 = false,draw(),saveMethod()">确 定</el-button>
  </div>
  </el-dialog>
</div>
<div v-if="dialogVisible_9">
  <el-dialog
      title="统计框 属性"
      :visible.sync="dialogVisible_9"
      width="40%"
      :append-to-body="true"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
      @close="handleClose2"
      ref="KsForm"
      >
    <el-form v-if="this.ks.length>0 && dialogVisible_9" size="mini">
      <el-form-item label="名称">
        <el-input  v-model="ks[numMovingKs].name" autocomplete="off"> </el-input>
      </el-form-item>
      <el-form-item label="拥挤阈值（最小拥挤密度 人/m^2）">
        <el-input-number  v-model="ks[numMovingKs].speed" :min="0" autocomplete="off"></el-input-number>
      </el-form-item>
      <el-form-item label="颜色">
        <el-color-picker v-model="ks[numMovingKs].color" show-alpha></el-color-picker>
      </el-form-item>
  </el-form>
  <div slot="footer" class="dialog-footer">
    <el-button type="danger" style="float: left;" @click="dialogVisible_9 = false;delKs();draw();TID=28">删除选定框</el-button>
    <el-button type="primary" @click="dialogVisible_9 = false;draw();TID=28">确 定</el-button>
  </div>
  </el-dialog>
</div>
<div v-if="dialogVisible_3">
<el-dialog
      title="集合点 属性"
      :visible.sync="dialogVisible_3"
      width="40%"
      :append-to-body="true"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
      @close="handleClose1"
      >
    <el-form v-if="this.exits.length>0 && dialogVisible_3" size="mini">
      <el-form-item label="名称">
        <el-input v-model="exits[numMovingExit].name" autocomplete="off"></el-input>
      </el-form-item>
      <el-form-item label="颜色">
        <el-color-picker v-model="exits[numMovingExit].color" show-alpha></el-color-picker>
      </el-form-item>
      <el-form-item label="容纳人数">
        <el-input type="number" v-model.number="exits[numMovingExit].peoNum" autocomplete="off"></el-input>
      </el-form-item>
  </el-form>
  <div slot="footer" class="dialog-footer">
    <el-button type="danger" style="float: left;" @click="dialogVisible_3 = false;delExport();draw();TID=16">删除集合点</el-button>
    <el-button type="primary" @click="dialogVisible_3 = false;draw();TID=16">确 定</el-button>
  </div>
  </el-dialog>
</div>

<div class="dialog-content-container" v-show="dialogVisible_attr_show_1">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeDialog">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
      
    <el-tabs type="border-card"  :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange()">
          <el-radio-button label="graph">图表</el-radio-button>
          <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition === 'graph'" class="chart-container"  id="撤离人数-时间(时间优先)"></div>
        <div v-show="tabPosition === 'data'" class="data-container">
          <el-button @click="exportExcel()" style="float: left;">下载</el-button>
          <div class="table-container">
            <el-table
              :data="table_raw"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in table_raw_label"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
              ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_2">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeDialog_2">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange_2()">
          <el-radio-button label="graph">图表</el-radio-button>
          <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition === 'graph'" class="chart-container" id="受照剂量-时间(时间优先)"></div>
        <div v-show="tabPosition === 'data'" class="data-container">
          <el-button @click="exportExcel()" style="float: left;">下载</el-button>
          <div class="table-container">
            <el-table
              :data="table_raw"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in table_raw_label"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
              ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_3">
    <div class="dialog-content">
      
      <div>
        <el-form size="mini">
          <el-form-item label="区域划定">
            <el-button @click="clearK()">清除划区</el-button>
            <div class="close-btn-container" @click="closeDialog_3">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
    </div>
          </el-form-item>
          <!-- 关闭按钮 -->
          <el-table
            :data="this.ks">
            <el-table-column
              label="划框id"
              prop="kid">
            </el-table-column>
            <el-table-column
              label="起始时间/s"
              prop="attr">
              <template slot-scope="scope">
                  <el-input size="small" @input="oninput()" v-model="ks[scope.$index].attr.startTime"></el-input>
              </template>
            </el-table-column>
            <el-table-column
              label="结束时间/s"
              prop="attr">
              <template slot-scope="scope">
                  <el-input size="small" v-model="ks[scope.$index].attr.endTime"></el-input>
              </template>
            </el-table-column>
          </el-table>
        </el-form>
        <el-button style="float:right;margin-top: 30px;" type="primary" @click="isEdit=false;densityCommit()">提交</el-button>
        <el-divider style="border-top-width: 4px;"></el-divider>
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
            label="平均密度 (人/m^2)"
            prop="value">
            <template slot-scope="scope">
                {{ ksd[scope.$index].value +' (人/m^2)'}} 
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_4">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeDialog_4">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange_4()">
          <el-radio-button label="graph">图表</el-radio-button>
          <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition === 'graph'" class="chart-container" id="撤离人数-时间直方图(时间优先)"></div>
        <div v-show="tabPosition === 'data'" class="data-container">
          <el-button @click="exportExcel()" style="float: left;">下载</el-button>
          <div class="table-container">
            <el-table
              :data="table_raw"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in table_raw_label"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
              ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_5">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeDialog_5">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange_5()">
          <el-radio-button label="graph">图表</el-radio-button>
          <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition === 'graph'" class="chart-container" id="受照剂量-人数直方图(时间优先)"></div>
        <div v-show="tabPosition === 'data'" class="data-container">
          <el-button @click="exportExcel()" style="float: left;">下载</el-button>
          <div class="table-container">
            <el-table
              :data="table_raw"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in table_raw_label"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
              ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_6">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeDialog_6">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange_6()">
          <el-radio-button label="graph">图表</el-radio-button>
          <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition === 'graph'" class="chart-container" id="撤离人数-时间(剂量优先)"></div>
        <div v-show="tabPosition === 'data'" class="data-container">
          <el-button @click="exportExcel()" style="float: left;">下载</el-button>
          <div class="table-container">
            <el-table
              :data="table_raw"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in table_raw_label"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
              ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_7">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeDialog_7">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange_7()">
          <el-radio-button label="graph">图表</el-radio-button>
          <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition === 'graph'" class="chart-container" id="受照剂量-时间(剂量优先)"></div>
        <div v-show="tabPosition === 'data'" class="data-container">
          <el-button @click="exportExcel()" style="float: left;">下载</el-button>
          <div class="table-container">
            <el-table
              :data="table_raw"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in table_raw_label"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
              ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_8">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeDialog_8">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange_8()">
          <el-radio-button label="graph">图表</el-radio-button>
          <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition === 'graph'" class="chart-container" id="撤离人数-时间直方图(剂量优先)"></div>
        <div v-show="tabPosition === 'data'" class="data-container">
          <el-button @click="exportExcel()" style="float: left;">下载</el-button>
          <div class="table-container">
            <el-table
              :data="table_raw"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in table_raw_label"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
              ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_9">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeDialog_9">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange_9()">
          <el-radio-button label="graph">图表</el-radio-button>
          <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition === 'graph'" class="chart-container" id="受照剂量-人数直方图(剂量优先)"></div>
        <div v-show="tabPosition === 'data'" class="data-container">
          <el-button @click="exportExcel()" style="float: left;">下载</el-button>
          <div class="table-container">
            <el-table
              :data="table_raw"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in table_raw_label"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
              ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_10">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeDialog_10">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange_10()">
          <el-radio-button label="graph">图表</el-radio-button>
          <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition === 'graph'" class="chart-container" id="撤离人数-时间(最大剂量最小优先)"></div>
        <div v-show="tabPosition === 'data'" class="data-container">
          <el-button @click="exportExcel()" style="float: left;">下载</el-button>
          <div class="table-container">
            <el-table
              :data="table_raw"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in table_raw_label"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
              ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_11">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeDialog_11">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange_11()">
          <el-radio-button label="graph">图表</el-radio-button>
          <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition === 'graph'" class="chart-container" id="受照剂量-时间(最大剂量最小优先)"></div>
        <div v-show="tabPosition === 'data'" class="data-container">
          <el-button @click="exportExcel()" style="float: left;">下载</el-button>
          <div class="table-container">
            <el-table
              :data="table_raw"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in table_raw_label"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
              ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_12">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeDialog_12">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange_12()">
          <el-radio-button label="graph">图表</el-radio-button>
          <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition === 'graph'" class="chart-container" id="撤离人数-时间直方图(最大剂量最小优先)"></div>
        <div v-show="tabPosition === 'data'" class="data-container">
          <el-button @click="exportExcel()" style="float: left;">下载</el-button>
          <div class="table-container">
            <el-table
              :data="table_raw"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in table_raw_label"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
              ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_13">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeDialog_13">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <el-radio-group v-model="tabPosition" style="margin-bottom: 30px;" @change="agreeChange_13()">
          <el-radio-button label="graph">图表</el-radio-button>
          <el-radio-button label="data">原始数据</el-radio-button>
        </el-radio-group>
        <div v-show="tabPosition === 'graph'" class="chart-container" id="受照剂量-人数直方图(最大剂量最小优先)"></div>
        <div v-show="tabPosition === 'data'" class="data-container">
          <el-button @click="exportExcel()" style="float: left;">下载</el-button>
          <div class="table-container">
            <el-table
              :data="table_raw"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in table_raw_label"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
              ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>

<div class="dialog-content-container" v-show="dialogVisible_6">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeMethod">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <div class="data-container">
          <div class="table-container">
            <el-table
              :data="table_raw_method"
              style="width: 100%"
            >
            <el-table-column
              type="index"
              label="序号"
            ></el-table-column>
            <!-- 指标列 -->
            <el-table-column
              prop="indicator"
              label="指标"
            ></el-table-column>
            <!-- 模拟数据列 -->
            <el-table-column
              prop="simulatedData"
              label="模拟数据"
            ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_7">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeMethod_1">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <div class="data-container">
          <div class="table-container">
            <el-table
              :data="table_raw_method"
              style="width: 100%"
            >
            <el-table-column
              type="index"
              label="序号"
              width="50"
            ></el-table-column>
            <!-- 指标列 -->
            <el-table-column
              prop="indicator"
              label="指标"
            ></el-table-column>
            <!-- 模拟数据列 -->
            <el-table-column
              prop="simulatedData"
              label="模拟数据"
            ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_8">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeMethod_2">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <div class="data-container">
          <div class="table-container">
            <el-table
              :data="table_raw_method"
              style="width: 100%"
            >
            <el-table-column
              type="index"
              label="序号"
              width="50"
            ></el-table-column>
            <!-- 指标列 -->
            <el-table-column
              prop="indicator"
              label="指标"
            ></el-table-column>
            <!-- 模拟数据列 -->
            <el-table-column
              prop="simulatedData"
              label="模拟数据"
            ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>

<!--方案对比-->
<div class="dialog-content-container" v-show="dialogVisible_attr_show_17">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeMethod_3">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <div class="data-container">
          <div class="table-title">
            <h3>方案指标对比</h3>
          </div>
          <div class="table-container">
            <el-table
              :data="table_raw_method"
              style="width: 100%; height:auto"
            >
            <el-table-column
              prop="indicator"
              label="指标"
            ></el-table-column>
            <el-table-column
              prop="method1"
              label="时间优先方案"
            ></el-table-column>
            <el-table-column
              prop="method2"
              label="剂量优先方案"
            ></el-table-column>
            <el-table-column
              prop="method3"
              label="个人剂量最小优先方案"
            ></el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_14">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeMethod_4">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
      <div class="table-title">
            <h3>撤离时间对比</h3>
          </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <div class="chart-container" id="撤离时间对比"></div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_15">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeMethod_5">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
      <div class="table-title">
            <h3>受照剂量对比</h3>
          </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <div class="chart-container" id="受照剂量对比"></div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_16">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeMethod_6">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <div class="chart-container" id="最大个人剂量对比"></div>
      </div>
    </el-tabs>
  </div>
</div>
<div class="dialog-content-container" v-show="dialogVisible_attr_show_19">
  <div class="dialog-content">
    <!-- 关闭按钮 -->
    <div class="close-btn-container" @click="closeMethod_7">
        <el-button type="text" class="close-btn" style="float: right;margin-right: 10px">
          <i class="el-icon-close"></i>
        </el-button>
      </div>
    <el-tabs type="border-card" :v-model="typeChoose" @tab-click="selectShow">
      <div>
        <div class="chart-container" id="拥堵区域个数对比"></div>
      </div>
    </el-tabs>
  </div>
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
  <hr style="border:none;height:1px;background-color:rgb(70,130,180)">
  <!-- <div id="heat" :style="tsty">11111</div> -->
  <!-- <div id="1" style="position:absolute;top:0;">11111</div>z-index:10;position:absolute;top:0;width: 1526px; height: 598px; -->
  <el-dialog
      title="动画播放设置"
      :visible.sync="dialogVisible_2"
      width="480px"
      center
      >
      <el-form label-width="120px" size="mini">
        <el-form-item label="出口方案">
          <el-select v-model="animationSetting.plan" placeholder="请选择出口方案" style="width:100%">
            <el-option
              v-for="plan in animationSetting.plans"
              :key="plan.value"
              :label="plan.label"
              :value="plan.value">
            </el-option>
          </el-select>
          <div class="animation-setting__hint">若列表为空，请先在“出口方案选择”中计算并保存方案。</div>
        </el-form-item>
        <el-form-item label="人物颜色">
          <el-color-picker v-model="animationSetting.color" show-alpha></el-color-picker>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
          <el-button @click="dialogVisible_2 = false">取 消</el-button>
          <el-button type="primary" @click="confirmAnimationSetting">开 始</el-button>
      </span>
  </el-dialog>
  <el-dialog
      title="动画模拟"
      :visible.sync="dialogVisible_4"
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
          <el-button @click="dialogVisible_4 = false">取 消</el-button>
          <el-button type="primary" @click="dialogVisible_4 = false;TID=11,playBack_1()">确 定</el-button>
      </span>
  </el-dialog>
  <el-dialog
      title="动画模拟"
      :visible.sync="dialogVisible_5"
      width="40%"
      center
      >
      <div>
        <!-- <el-radio-group v-model="radio_mode" style="display: flex;justify-content: center;">
          <el-radio-button label="在线模式"></el-radio-button>
          <el-radio-button label="本地模式"></el-radio-button>
        </el-radio-group> -->
        <div v-if="radio_mode=='在线模式'">
          <!-- <h3 style="text-align:center">在线模式无需下载，但在大数据量情况可能造成卡顿</h3> -->
          <h3 style="text-align:center">使用动画模拟撤离全部流程</h3>
        </div>
      </div>
        <!-- <div v-if="radio_mode=='本地模式'">
          <h3 style="text-align:center">本地模式需要先下载动画资料</h3>
          动画文件：<el-button @click="download()">下载</el-button>
          <div>
            已下载：<input type="file" id="fileInput">
          </div>
        </div> -->
      <span slot="footer" class="dialog-footer">
          <el-button @click="dialogVisible_5 = false">取 消</el-button>
          <el-button type="primary" @click="dialogVisible_5 = false;TID=11,playBack_2()">确 定</el-button>
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
        <el-descriptions-item label="人口框数">{{peos.length}}</el-descriptions-item>
        <el-descriptions-item label="人数">{{totalNum}}</el-descriptions-item>
        <el-descriptions-item label="统计框数量">{{ks.length}}</el-descriptions-item>
      </el-descriptions>
  </el-dialog>
  </div>
</template>

<script src="./js/main.js"></script>

<style >
@import url('./components/css/light-theme.css');

/* 项目容器样式 */
.project-container {
  background-color: #f8f9fa !important;
  min-height: 100vh;
  padding: 20px;
}

/* 项目头部样式 */
.project-header {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 15px 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  border: 1px solid #e9ecef;
}

/* 按钮行布局 */
.button-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

/* 按钮组样式 */
.button-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 不同颜色按钮组之间的间距 */
.primary-group {
  margin-right: 14px;
}

.success-group {
  margin-right: 14px;
}

.warning-group {
  margin-right: 14px;
}

.danger-group {
  margin-left: auto;
}

/* 移除按钮边框 */
.button-row .el-button {
  border: none !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.button-row .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* 状态显示样式 */
.state {
  display: flex;
  justify-content: center;
  margin-left: 10px;
  margin-top: 10px;
  color: #2c3e50 !important;
  font-weight: 500;
}

.dialog-content-container {
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center; 
  height: 100%; /* Use full viewport height */
  width: 100vw; /* Use full viewport width */
  position: fixed;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent overlay */
  z-index: 1000; /* Ensure it's above other content */
}
.el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
}
.el-checkbox {
  margin-right: 20px;
  margin-bottom: 20px;
}
.dialog-content {
  width: 75%;
  max-height: 80%;
  overflow: auto;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  
}

.chart-container {
  width: 100%;
  height: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.data-container {
  text-align: center;
}

.table-container {
  height: 450px;
  overflow-y: auto;
}
  body::-webkit-scrollbar {
    /*隐藏滚轮*/
    display:flex;  
  }
  .main{
    touch-action: none;
    -ms-touch-action: none;
  }

.el-icon-close {
  font-size: 20px;
  color: #000; /* 黑色 */
}

.dialog-scrollable .el-dialog__body {
  overflow: auto; /* 确保对话框内容可以滚动 */
  position: relative;
  height: 700px; 
  -webkit-overflow-scrolling: touch;
}

/* 确保表格支持鼠标滚轮滚动 */
.dialog-scrollable .el-table__body-wrapper {
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

.dialog-scrollable .el-table__body-wrapper::-webkit-scrollbar {
  width: 8px;
}

.dialog-scrollable .el-table__body-wrapper::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 4px;
}

.dialog-scrollable .el-table__body-wrapper::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}

.dialog-content {
  max-height: 700px; /* 设置最大高度 */
  width: 1250px;
  overflow: auto; /* 当内容超出时显示滚动条 */
  position: sticky;
  top: 0;
  z-index: 10; /* 确保表头在滚动时位于顶部 */
}
.el-table__header-wrapper {
  position: sticky;
  top: 0;
  z-index: 10; /* 确保表头在滚动时在最上层 */
}

.table-header-cell {
  background-color: #bab7b7; /* 设置表头背景色，确保与表格内容区分 */
}

.animation-setting__hint {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}
</style>
