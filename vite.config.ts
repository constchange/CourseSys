import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  
  // 👇 添加这一行！
  // 这里的 '你的仓库名' 必须和 GitHub 上的仓库名一模一样，前后都要加斜杠
  base: '/CourseSys/', 

})