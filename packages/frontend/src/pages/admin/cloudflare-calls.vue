<template>
	<div>
		<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
			<div class="_gaps">
				<div class="_panel">
					<div class="_gaps">
						<div>
							<MkInput v-model="cloudflareCallsAppId" type="text">
								<template #label>Cloudflare Calls App ID</template>
								<template #caption>CloudflareのCallsアプリケーションID</template>
							</MkInput>
						</div>

						<div>
							<MkInput v-model="cloudflareCallsApiToken" type="password">
								<template #label>Cloudflare Calls API Token</template>
								<template #caption>
									CloudflareのCalls API Token
									<span v-if="cloudflareCallsApiTokenSet" style="color: var(--success);">
										(設定済み)
									</span>
								</template>
							</MkInput>
						</div>

						<div>
							<MkButton primary @click="save">
								<i class="ti ti-check"></i>
								{{ i18n.ts.save }}
							</MkButton>
						</div>
					</div>
				</div>

				<div class="_panel">
					<div class="_gaps">
						<div>
							<div class="_buttons">
								<MkButton @click="testConnection">
									<i class="ti ti-refresh"></i>
									接続テスト
								</MkButton>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const cloudflareCallsAppId = ref<string>('');
const cloudflareCallsApiToken = ref<string>('');
const cloudflareCallsApiTokenSet = ref<boolean>(false);

const loadConfig = async () => {
	try {
		const config = await misskeyApi('admin/cloudflare-calls-config-get');
		cloudflareCallsAppId.value = config.cloudflareCallsAppId ?? '';
		cloudflareCallsApiTokenSet.value = config.cloudflareCallsApiTokenSet;
	} catch (error) {
		console.error('Failed to load config:', error);
		os.alert({
			type: 'error',
			text: '設定の読み込みに失敗しました',
		});
	}
};

const save = async () => {
	try {
		const params: Record<string, string> = {};

		if (cloudflareCallsAppId.value) {
			params.cloudflareCallsAppId = cloudflareCallsAppId.value;
		}

		if (cloudflareCallsApiToken.value) {
			params.cloudflareCallsApiToken = cloudflareCallsApiToken.value;
		}

		const result = await misskeyApi('admin/cloudflare-calls-config', params);

		cloudflareCallsApiTokenSet.value = result.cloudflareCallsApiTokenSet;
		cloudflareCallsApiToken.value = ''; // セキュリティのためクリア

		os.alert({
			type: 'success',
			text: '設定を保存しました',
		});
	} catch (error) {
		console.error('Failed to save config:', error);
		os.alert({
			type: 'error',
			text: '設定の保存に失敗しました',
		});
	}
};

const testConnection = async () => {
	os.alert({
		type: 'info',
		text: '接続テスト機能は今後実装予定です',
	});
};

onMounted(() => {
	loadConfig();
});

definePageMetadata({
	title: 'Cloudflare Calls',
	icon: 'ti ti-phone',
});
</script>

<style lang="scss" scoped>

</style>
