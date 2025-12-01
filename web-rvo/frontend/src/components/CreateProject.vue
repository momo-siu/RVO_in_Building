<template>
  <div class="create-project" style="padding:20px; max-width:600px;">
    <h3>新建项目</h3>
    <el-form :inline="true">
      <el-form-item label="项目ID">
        <el-input v-model="projectId" placeholder="输入项目ID"></el-input>
      </el-form-item>

      <el-form-item label="底图">
        <input type="file" @change="onFileChange" accept="image/*" />
        <div v-if="preview" style="margin-top:8px;">
          <img :src="preview" style="max-width:240px; max-height:160px; border:1px solid #ddd;" />
        </div>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="create">创建并上传</el-button>
        <el-button @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="message" :title="message" type="info" show-icon closable @close="message=null" />
  </div>
</template>

<script>
export default {
  name: 'CreateProject',
  data() {
    return {
      projectId: '',
      file: null,
      preview: null,
      message: null
    };
  },
  methods: {
    onFileChange(e) {
      const f = e.target.files && e.target.files[0];
      if (!f) { this.file = null; this.preview = null; return; }
      this.file = f;
      this.preview = URL.createObjectURL(f);
    },

    async create() {
      const id = (this.projectId || '').trim();
      if (!id) { this.message = '请输入项目ID'; return; }

      try {
        // 1) 创建目录（后端保证路径为 projectBase/rvo/source/{id}）
        let res = await fetch(`/api/project/create?projectId=${encodeURIComponent(id)}`, { method: 'POST' });
        const createRes = await res.json();
        if (!res.ok || createRes.status === 'error') {
          throw new Error('创建失败: ' + (createRes.msg || JSON.stringify(createRes)));
        }

        // 2) 上传底图（若有选择）
        let savedFilename = null;
        if (this.file) {
          const fd = new FormData();
          fd.append('file', this.file);
          const up = await fetch(`/api/project/${encodeURIComponent(id)}/uploadBackground`, {
            method: 'POST',
            body: fd
          });
          const upRes = await up.json();
          if (!up.ok || upRes.status !== 'ok') {
            throw new Error('上传失败: ' + (upRes.msg || JSON.stringify(upRes)));
          }
          savedFilename = upRes.filename || 'background.jpg';
        }

        // 3) 跳转到项目页（项目页面会通过 /source/{id}/{filename} 读取图片）
        this.message = '创建成功，正在打开项目...';
        // 如果上传了图片则在路由中传递文件名以便前端显示正确图（可选）
        if (savedFilename) {
          this.$router.push({ path: `/project/${id}`, query: { bg: savedFilename } });
        } else {
          this.$router.push(`/project/${id}`);
        }
      } catch (err) {
        console.error(err);
        this.message = err.message || String(err);
      }
    },

    reset() {
      this.projectId = '';
      this.file = null;
      this.preview = null;
      this.message = null;
    }
  },
  beforeDestroy() {
    if (this.preview) URL.revokeObjectURL(this.preview);
  }
};
</script>

<style scoped>
.create-project { background:#fff; border-radius:6px; box-shadow:0 1px 6px rgba(0,0,0,0.08); }
</style>