import Vue from 'vue'
import App from './App.vue'
import VueRouter from 'vue-router';
import router from './router/index'
import axios from 'axios';
import ElementUI from 'element-ui'
import leMarkdownEditor from 'le-markdown-editor'
import 'element-ui/lib/theme-chalk/index.css'
// import axios from 'axios';



Vue.use(ElementUI)
Vue.use(VueRouter);
Vue.use(leMarkdownEditor)

new Vue({
  
  render: h => h(App),
  router,
  axios,
}).$mount('#app')
