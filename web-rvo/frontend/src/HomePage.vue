<template>
    <div style="height:100%;width: 100%;margin: 0;padding: 0;">
        <div style="background-color: rgb(56, 98, 134);text-align: center;height:40px;line-height: 40px;">
            复杂建筑行人疏散模拟程序
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

        <div style="margin-top: 10px;text-align: center;">
            <el-select v-model="value" clearable placeholder="请选择场址">
                <el-option
                    v-for="item in opt"
                    :key="item.value"
                    :value="item.value">
                </el-option>
            </el-select>
            <el-button @click="dialogVisible=true" style="margin-left: 10px;">创建项目</el-button>
        </div>

        <div style="margin-top: 10px;display: flex;width:auto;margin-left:100px;margin-right:100px;">
            <el-table
                table-layout='auto'
                :data="tableData.filter(data => !value || data.addr==value)"
                border
                :header-cell-style="{ 'text-align': 'center' }"
                :cell-style="{ 'text-align': 'center' }"
                :width="600"
                :default-sort="{prop:'ID',order:'descending'}">
                    <el-table-column
                        prop="ID"
                        label="项目编号"
                        width="70px"
                        >
                    </el-table-column>
                    <el-table-column
                        prop="name"
                        label="项目名称"
                        width="200px"
                        >
                    </el-table-column>
                    <el-table-column
                        prop="description"
                        label="介绍"
                        width="300px"
                        >
                    </el-table-column>
                    <el-table-column
                        prop="addr"
                        label="场址"
                        width="200px"
                        >
                    </el-table-column>
                    <el-table-column
                        prop="background"
                        label="底图预览"
                        >
                        <template slot-scope="scope">
                            <el-image
                                style="width: 100px; height: 100px"
                                :src="rip+scope.row.background"
                                ></el-image>
                        </template>
                    </el-table-column>
                    <el-table-column
                        prop="cTime"
                        label="创建时间"
                        width="100px"
                        >
                    </el-table-column>
                    <el-table-column
                        prop="uTime"
                        label="修改时间"
                        width="100px"
                        >
                    </el-table-column>
                    <el-table-column
                        label="操作">
                        <template slot-scope="scope">
                            <el-button @click="handleClick(scope.row)" size="mini">打开</el-button>
                            <el-button @click="handleDel(scope.row)" size="mini" type="danger">删除</el-button>
                        </template>
                    </el-table-column>
            </el-table>
        </div>

        <!-- 创建项目 -->
        <el-dialog
            title="创建项目"
            :visible.sync="dialogVisible"
            width="40%"
            center
            >
            <div style="text-align: center;justify-content: center;align-items: center;">
                <div style="margin-top:10px;">
                    <span>项目名称：</span>
                    <el-input  v-model="name" style="width:70%;text-align: right;"></el-input>
                </div>
                <div style="margin-top:10px;">
                    <span>项目介绍：</span>
                    <el-input v-model="description" style="width:70%"></el-input>
                </div>
                <div style="margin-top:10px;">
                    <span>外场场址：</span>
                    <el-input v-model="addr" style="width:70%"></el-input>
                </div>
                <div style="margin-top:10px;">
                    <span>底图导入：</span>
                    <el-button v-if="!isTrue" style="width:70%" @click="changeBack()">上传</el-button>
                    <el-button v-if="isTrue" style="width:70%" @click="deleteBack()">清除底图</el-button>
                </div>
                <div style="margin-top:10px;">
                    <span>配置文件：</span>
                    <el-button v-if="isTrue_2==false" style="width:70%" @click="changeCon()">上传</el-button>
                    <el-button v-if="isTrue_2==true" style="width:70%" @click="deleteCon()">清除配置</el-button>
                </div>
                <div style="margin-top:10px;">
                    <span>GRD文件：</span>
                    <el-button v-if="isTrue_3==false" style="width:70%" @click="changeGRD()">上传</el-button>
                    <el-button v-if="isTrue_3==true" style="width:70%" @click="deleteGRD()">清除配置</el-button>
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
    body{
        background-color: rgb(250, 250, 209);
    }
</style>

<script>
    import axios from 'axios'
    // import global from './\\Configure\\GlobalPage.vue'
    const restweburl = window.config.baseURL;
    export default {
        created(){
            document.title='复杂建筑行人疏散模拟程序';
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
                setTimeout(() => {  
                    loading.close();
                }, 1000);
            }).catch((error)=>{
                this.$notify.error({
                    title: '错误',
                    message: error
                });
            });
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
                options: [],
                opt: [],
                value: '',
                rip:restweburl,
                loading:false,

                isTrue:false,
                isTrue_2:false,
                isTrue_3:false,
            }
        },
        methods:{

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
            deleteGRD(){
                this.formdata.delete("files");
                this.isTrue_3=false;
            },
            upBack(){
                let fu = document.getElementById("open_1");
                if (fu == null) return;
                this.formdata.append('background', fu.files[0]);
                this.isTrue=true;
            },
            upGRD(){
                let fu = document.getElementById("open_3");
                if (fu == null) return;
                let da=[];
                for(let i = 0;i<12;i++){
                    this.formdata.append('files', fu.files[i]);
                }
                // alert(1)
                console.log(da)
                console.log(this.formdata)
                this.isTrue_3=true;
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
                if(!this.isTrue|| !this.isTrue_2 || !this.isTrue_3){
                    this.$notify({
                        title: '警告',
                        message: '请上传底图、参数与GRD文件',
                        type: 'warning'
                    });
                    this.loading=false;
                    return;
                }
                this.formdata.append('name', this.name);
                this.formdata.append('description', this.description);
                this.formdata.append('addr', this.addr);
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
                    this.deleteCon();
                    this.deleteBack();
                    this.deleteGRD();
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
                });
            },
            handleClick(row){
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
