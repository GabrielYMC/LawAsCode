import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		// 專案路徑含 [pr] 方括號，Vite 的 HMR overlay 會因 URI 解碼失敗而報錯
		hmr: {
			overlay: false
		}
	}
});
