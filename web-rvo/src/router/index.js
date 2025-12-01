import Vue from "vue";
import VueRouter from 'vue-router'
import project from '../ProjectPage.vue'
import home from '../HomePage.vue'

Vue.use(VueRouter);

const router = new VueRouter({
    //tips:不想要 #（锚点）就添加下面代码
    mode:'hash',
    //4.配置路由的path和组件
    routes :[
        {
            path: "/",
            name:'',
            component: home,
        },
        {
            path: "/project/:bID",
            name:'project',
            component: project,
        },
    ]
});
export default router
