<template>
    <div class="main-container">
        <div class="system-header">
            复杂建筑行人疏散模拟
        </div>  
        <input
            type="file"
            name="filename"
            id="open_1"
            style="display: none"
            @change="upBack()"
        />
        <input
            type="file"
            name="filename"
            id="open_2"
            style="display: none"
            @change="upCon()"
        />
        <input
            type="file"
            name="filename"
            id="open_3"
            style="display: none"
            @change="upGRD()"
            multiple
        />

        <div class="control-panel">
            <div style="text-align: center; margin-bottom: 20px; display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap;">
                <el-input v-model="searchId" placeholder="项目编号" style="width: 160px;"></el-input>
                <el-input v-model="searchName" placeholder="项目名称" style="width: 220px;"></el-input>
                <el-input v-model="searchAddr" placeholder="场址" style="width: 220px;"></el-input>
                <el-button @click="resetSearch" style="margin-left: 6px;">重置</el-button>
                <el-button type="primary" @click="doSearch">搜索</el-button>
                <el-button class="create-project-btn" @click="dialogVisible=true">创建项目</el-button>
            </div>

            <div class="projects-grid">
                <div 
                    v-for="project in displayedProjects" 
                    :key="project.ID"
                    class="project-card"
                    @mouseenter="showProjectDetails(project)"
                    @mouseleave="hideProjectDetails()"
                >
                    <div class="project-image">
                        <el-image
                            v-if="project.background"
                            :src="rip + project.background"
                            fit="cover"
                            class="project-bg-image"
                        ></el-image>
                        <div v-else class="project-placeholder">
                            <div class="placeholder-icon">场景</div>
                            <div class="placeholder-text">
                                <div class="placeholder-title">{{ project.name || '未命名项目' }}</div>
                                <div class="placeholder-sub">尚未上传底图</div>
                            </div>
                        </div>
                    </div>
                    <div class="project-info">
                        <h3 class="project-name">{{ project.name }}</h3>
                        <p class="project-description">{{ project.description }}</p>
                    </div>
                    
                    <!-- 悬停时显示的详细信息 -->
                    <div class="project-details" v-show="hoveredProject && hoveredProject.ID === project.ID">
                        <div class="details-content">
                            <div class="detail-item">
                                <span class="detail-label">项目编号：</span>
                                <span class="detail-value">{{ project.ID }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">项目名称：</span>
                                <span class="detail-value">{{ project.name }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">场址：</span>
                                <span class="detail-value">{{ project.addr }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">创建时间：</span>
                                <span class="detail-value">{{ formatDate(project.cTime) }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">修改时间：</span>
                                <span class="detail-value">{{ formatDate(project.uTime) }}</span>
                            </div>
                            <div class="action-buttons">
                                <el-button @click="handleClick(project)" type="primary" size="small">打开</el-button>
                                <el-button @click="handleDel(project)" type="danger" size="small">删除</el-button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 创建项目 -->
        <el-dialog
            title="创建项目"
            :visible.sync="dialogVisible"
            width="50%"
            center
            class="fade-in"
            >
            <div class="dialog-content">
                <div class="form-item">
                    <label><span style="color: red;">*</span>项目名称：</label>
                    <el-input v-model="name" placeholder="请输入项目名称"></el-input>
                </div>
                <div class="form-item">
                    <label><span style="color: red;">*</span>项目介绍：</label>
                    <el-input v-model="description" type="textarea" placeholder="请输入项目介绍"></el-input>
                </div>
                <div class="form-item">
                    <label><span style="color: red;">*</span>外场场址：</label>
                    <el-input v-model="addr" placeholder="请输入外场场址"></el-input>
                </div>
                <div class="form-item">
                    <label><span style="color: red;">*</span>地图大小(m)：</label>
                    <div style="display: flex; gap: 10px; flex: 1;">
                        <el-input-number v-model="mapWidth" :min="1" placeholder="长度(x)"></el-input-number>
                        <el-input-number v-model="mapHeight" :min="1" placeholder="宽度(y)"></el-input-number>
                    </div>
                </div>
                <div class="form-item">
                    <label>底图导入：</label>
                    <el-button v-if="!isTrue" type="success" @click="changeBack()">上传底图</el-button>
                    <el-button v-if="isTrue" type="warning" @click="deleteBack()">清除底图</el-button>
                </div>
            </div>
            
            <span slot="footer" class="dialog-footer">
                <el-button @click="dialogVisible = false">取 消</el-button>
                <el-button type="primary" @click="loading=true;createProject()" v-loading="loading">确 定</el-button>
            </span>
        </el-dialog>
    </div>
</template>

<style>
@import url('./components/css/light-theme.css');

body {
    background-color: #f8f9fa;
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 对话框内容样式 */
.dialog-content {
    padding: 20px 0;
    max-width: 600px;
    margin: 0 auto;
    width: 100%;
}

.form-item {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    gap: 15px;
    flex-wrap: wrap;
}

.form-item label {
    min-width: 100px;
    font-weight: 500;
    color: #2c3e50;
}

.form-item .el-input,
.form-item .el-textarea {
    flex: 1;
    min-width: 0;
}

.form-item .el-button {
    min-width: 120px;
}

.custom-table tbody tr:hover>td {
  background-color:transparent!important;
}

.custom-table__body tr.hover-row>td {
  background-color: transparent;
}

/* 偶数行样式 */
.custom-table .even-row {
    /* 设置表格背景颜色为淡绿色 */
    border-bottom-width: 2px; /* 设置垂直分隔线的粗细 */
  border-right-width:2px; /* 设置水平分隔线的粗细 */
  border-color: #333;
  font-family: 'Arial', sans-serif;
  font-size: 15px;
  color: #333;
  background-color: #dae9e9; /* 你可以选择你喜欢的颜色 */
}


/* 奇数行样式 */
.custom-table .odd-row {
  /* 设置表格背景颜色为淡绿色 */
  font-family: 'Arial', sans-serif;
  font-size: 15px;
  color: #333;
  background-color: #f5f7fa; /* 默认的背景颜色 */
}

/* 项目网格布局 */
.projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

/* 项目卡片样式 */
.project-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border: none;
    overflow: hidden;
    transition: all 0.3s ease;
    cursor: pointer;
    position: relative;
    height: 280px;
    display: flex;
    flex-direction: column;
}

.project-card:hover {
    transform: translateY(-5px) scale(1.02);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

/* 项目图片区域 */
.project-image {
    height: 180px;
    overflow: hidden;
    position: relative;
}

.project-bg-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.project-placeholder {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: radial-gradient(circle at top left, #e0f2fe, #f1f5f9);
    color: #0f172a;
}
.placeholder-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(15,23,42,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    margin-right: 10px;
}
.placeholder-text {
    display: flex;
    flex-direction: column;
}
.placeholder-title {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
}
.placeholder-sub {
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
}

/* 项目信息区域 */
.project-info {
    padding: 15px;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background-color: #eaf4ff; /* 与边框同系的浅蓝底色 */
}

.project-name {
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
    margin: 0 0 8px 0;
    line-height: 1.3;
}

.project-description {
    font-size: 14px;
    color: #666;
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* 悬停时显示的详细信息 */
.project-details {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.82);
    color: white;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.project-card:hover .project-details {
    opacity: 1;
}

.details-content {
    text-align: center;
    width: 100%;
}

.detail-item {
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.detail-label {
    font-weight: 500;
    color: #e0e0e0;
    font-size: 14px;
}

.detail-value {
    color: white;
    font-size: 14px;
    text-align: right;
    flex: 1;
    margin-left: 10px;
}

.action-buttons {
    margin-top: 20px;
    display: flex;
    gap: 10px;
    justify-content: center;
}

.action-buttons .el-button {
    min-width: 80px;
}


</style>



<script>
    import axios from 'axios'
    // import global from './\\Configure\\GlobalPage.vue'
    const restweburl = window.config.baseURL;
    export default {
        created(){
            document.title='复杂建筑行人疏散模拟系统';
            const loading = this.$loading({
                lock: true,
                text: '正在加载项目列表',
                spinner: 'el-icon-loading',
                background: 'rgba(0, 0, 0, 0.7)'
            });
            axios({
                url: restweburl+'listBlueprint',
                method: 'post',
            }).then((res) => {
                this.tableData=res.data.data;
                this.applySearch(true);
                this.options=[];
                this.opt=[];
                for(let i=0;i<this.tableData.length;i++){
                    if(this.options.includes(this.tableData[i].addr)){continue;}
                    if(this.tableData[i].addr==null){continue;} 
                    this.options.push(this.tableData[i].addr);
                }
                console.log(this.options)
                for(let i=0;i<this.options.length;i++){
                    this.opt.push({value:this.options[i]});
                }
                // 获取颜色
                setTimeout(() => {  
                    loading.close();
                }, 1000);
            }).catch((error)=>{
                this.$notify.error({
                    title: '错误',
                    message: error
                });
            });
            let table_color = JSON.parse(localStorage.getItem('color'));
            if (table_color == null){
                table_color = 'rgb(208, 247, 187)'
                localStorage.setItem('color', JSON.stringify('rgb(208, 247, 187)'));
            }
            console.log(table_color);
            document.documentElement.style.setProperty('--table-background-color', table_color);
            
        },
        data() {
            return {
                tableData: [
                    
                ],
                dialogVisible:false,
                formdata :new FormData(),
                name:'',
                description:'',
                addr:'',
                mapWidth: 100,
                mapHeight: 60,
                options: [],
                opt: [],
                value: '',
                rip:restweburl,
                loading:false,

                isTrue:false,
                isTrue_2:false,
                color: this.table_color,
                hoveredProject: null,
                searchId: '',
                searchName: '',
                searchAddr: '',
                displayedProjects: []
            }
        },
        methods:{
            formatDate(str){
                if(!str) return '';
                const d = new Date(str);
                const pad = (n)=> (n<10? '0'+n : ''+n);
                return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            },
            resetSearch(){
                this.searchId='';
                this.searchName='';
                this.searchAddr='';
                this.applySearch();
            },
            doSearch(){
                this.applySearch(true);
            },
            applySearch(sortByIdDesc=false){
                let list = this.tableData.slice();
                if(this.searchId){
                    list = list.filter(p=> String(p.ID) === String(this.searchId).trim());
                }
                if(this.searchName){
                    const kw = this.searchName.trim().toLowerCase();
                    list = list.filter(p=> (p.name||'').toLowerCase().includes(kw));
                }
                if(this.searchAddr){
                    const kw = this.searchAddr.trim().toLowerCase();
                    list = list.filter(p=> (p.addr||'').toLowerCase().includes(kw));
                }
                if(sortByIdDesc){
                    list.sort((a,b)=> Number(b.ID)-Number(a.ID));
                }
                this.displayedProjects = list;
            },
            showProjectDetails(project) {
                this.hoveredProject = project;
            },
            hideProjectDetails() {
                this.hoveredProject = null;
            },
            tableRowClassName({rowIndex}) {
                if (rowIndex % 2 === 0) {
                  return 'even-row';
                } else {
                  return 'odd-row';
                }
            },
            al(){
                // alert(this.value)
            },  

            changeBack(){
                document.getElementById("open_1").value="";
                document.getElementById("open_1").click();
            },
            changeCon(){
                document.getElementById("open_2").value="";
                document.getElementById("open_2").click();
            },
            changeGRD(){
                document.getElementById("open_3").value="";
                document.getElementById("open_3").click();
            },
            deleteBack(){
                this.formdata.delete("background");
                this.isTrue=false;
            },
            deleteCon(){
                this.formdata.delete("config");
                this.isTrue_2=false;
            },
            upBack(){
                let fu = document.getElementById("open_1");
                if (fu == null) return;
                this.formdata.append('background', fu.files[0]);
                this.isTrue=true;
            },
            upCon(){
                let fu = document.getElementById("open_2");
                if (fu == null) return;
                this.formdata.append('config', fu.files[0]);
                this.isTrue_2=true;
            },
            createProject(){
                //参数检验
                if(this.name==""||this.description==""||this.addr==""){
                    this.$notify({
                        title: '警告',
                        message: '请填写名称、介绍和场址',
                        type: 'warning'
                    });
                    this.loading=false;
                    return;
                }
                this.formdata.append('name', this.name);
                this.formdata.append('description', this.description);
                this.formdata.append('addr', this.addr);
                this.formdata.append('mapWidth', this.mapWidth);
                this.formdata.append('mapHeight', this.mapHeight);

                axios({
                    url: restweburl+'createBlueprint',
                    method: 'post',
                    data:this.formdata
                }).then((res) => {
                    //成功创建
                    this.name="";
                    this.description="";
                    this.addr="";
                    this.formdata.delete("name");
                    this.formdata.delete("description");
                    this.formdata.delete("addr");
                    this.formdata.delete("mapWidth");
                    this.formdata.delete("mapHeight");
                    this.deleteCon();
                    this.deleteBack();
                    if(res.data.msg=="success"){
                        this.loading=false;
                        this.dialogVisible = false;
                        this.$notify({
                            title: '成功',
                            message: '创建项目成功',
                            type: 'success'
                        });
                        const loading = this.$loading({
                            lock: true,
                            text: '正在加载项目列表',
                            spinner: 'el-icon-loading',
                            background: 'rgba(0, 0, 0, 0.7)'
                        });
                        this.opt=[];
                        this.options=[];
                        axios({
                            url: restweburl+'listBlueprint',
                            method: 'post',
                        }).then((res) => {
                            this.tableData=res.data.data;
                            this.applySearch(true);
                            for(let i=0;i<this.tableData.length;i++){
                                if(this.options.includes(this.tableData[i].addr)){continue;}
                                if(this.tableData[i].addr==null){continue;} 
                                this.options.push(this.tableData[i].addr);
                            }
                            for(let i=0;i<this.options.length;i++){
                                this.opt.push({value:this.options[i]});
                            }
                            setTimeout(() => {
                                loading.close();
                            }, 1000);
                        }).catch((error)=>{
                            this.$notify.error({
                                title: '错误',
                                message: error
                            });
                        });
                    }
                    else{
                        this.$notify.error({
                            title: '错误',
                            message: '创建失败'
                        });
                        this.name="";
                        this.description="";
                        this.addr="";
                        this.formdata.delete("name");
                        this.formdata.delete("description");
                        this.formdata.delete("addr");
                        this.formdata.delete("mapWidth");
                        this.formdata.delete("mapHeight");
                        this.deleteCon();
                        this.deleteBack();
                    }
                    this.name="";
                    this.description="";
                    this.addr="";
                    this.formdata.delete("name");
                    this.formdata.delete("description");
                    this.formdata.delete("addr");
                    this.formdata.delete("mapWidth");
                    this.formdata.delete("mapHeight");
                    this.deleteCon();
                    this.deleteBack();
                });
            },
            handleClick(row){
                sessionStorage.clear();
                window.open(window.location.href+'project/'+row.ID, '_blank');
            },
            handleDel(row){
                this.$confirm('此操作将永久删除该页面, 是否继续?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => {
                    var url = restweburl + 'deleteBlueprint';
                    axios({
                        url: url,
                        method: "post",
                        data:{
                            bID:row.ID,
                        }
                    }).then((res) => {
                        //成功删除
                        if(res.data.msg=="success"){
                            this.loading=false;
                            this.dialogVisible = false;
                            this.$notify({
                                title: '成功',
                                message: '删除项目成功',
                                type: 'success'
                            });
                            const loading = this.$loading({
                                lock: true,
                                text: '正在加载项目列表',
                                spinner: 'el-icon-loading',
                                background: 'rgba(0, 0, 0, 0.7)'
                            });
                            axios({
                                url: restweburl+'listBlueprint',
                                method: 'post',
                            }).then((res) => {
                                this.options=[];
                                this.opt=[];
                                this.tableData=res.data.data;
                                this.applySearch(true);
                                    for(let i=0;i<this.tableData.length;i++){
                                    if(this.options.includes(this.tableData[i].addr)){continue;}
                                    if(this.tableData[i].addr==null){continue;} 
                                    this.options.push(this.tableData[i].addr);
                                }
                                for(let i=0;i<this.options.length;i++){
                                    this.opt.push({value:this.options[i]});
                                }
                                setTimeout(() => {
                                    loading.close();
                                }, 1000);
                            }).catch((error)=>{
                                this.$notify.error({
                                    title: '错误',
                                    message: error
                                });
                            });
                        }
                        else{
                            this.$notify.error({
                                title: '错误',
                                message: '创建失败'
                            });
                        }
                    }).catch(()=>{
                        this.$notify.error({
                            title: '错误',
                            message: '网络错误'
                        });
                    });
                }).catch(() => {
                    this.$message({
                        type: 'info',
                        message: '已取消删除'
                    });
                });
            }
        }
    }

</script>
