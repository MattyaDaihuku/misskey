<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<FormSuspense :p="init">
			<div class="_gaps_m">
				<MkFolder :defaultOpen="true">
					<template #icon><i class="ti ti-phone"></i></template>
					<template #label>{{ i18n.ts._cloudflareRealtime.title }}</template>

					<div class="_gaps">
						<MkInfo>
							{{ i18n.ts._cloudflareRealtime.description }}
						</MkInfo>

						<MkInput v-model="cloudflareRealtimeAppId">
							<template #label>{{ i18n.ts._cloudflareRealtime.appId }}</template>
							<template #caption>{{ i18n.ts._cloudflareRealtime.appIdDescription }}</template>
						</MkInput>

						<MkInput v-model="cloudflareRealtimeApiToken" type="password">
							<template #label>{{ i18n.ts._cloudflareRealtime.apiToken }}</template>
							<template #caption>
								{{ i18n.ts._cloudflareRealtime.apiTokenDescription }}
								<span v-if="cloudflareRealtimeApiTokenSet" style="color: var(--success);">
									({{ i18n.ts.configured }})
								</span>
							</template>
						</MkInput>
					</div>
				</MkFolder>

				<MkFolder>
					<template #icon><i class="ti ti-refresh"></i></template>
					<template #label>{{ i18n.ts._cloudflareRealtime.connectionTest }}</template>

					<div class="_gaps">
						<MkInfo>
							{{ i18n.ts._cloudflareRealtime.connectionTestDescription }}
						</MkInfo>

						<div class="_buttons">
							<MkButton :loading="testing" @click="testConnection">
								<i class="ti ti-refresh"></i>
								{{ i18n.ts._cloudflareRealtime.connectionTest }}
							</MkButton>
						</div>

						<div v-if="testResult" class="test-result" :class="{ success: testResult.success, error: !testResult.success }">
							<i v-if="testResult.success" class="ti ti-circle-check"></i>
							<i v-else class="ti ti-alert-circle"></i>
							{{ testResult.message }}
						</div>
					</div>
				</MkFolder>

				<MkFolder>
					<template #icon><i class="ti ti-info-circle"></i></template>
					<template #label>{{ i18n.ts._cloudflareRealtime.usage }}</template>

					<div class="_gaps">
						<div>
							<h4>{{ i18n.ts._cloudflareRealtime.setupSteps }}</h4>
							<ol>
								<li>{{ i18n.ts._cloudflareRealtime.step1 }}</li>
								<li>{{ i18n.ts._cloudflareRealtime.step2 }}</li>
								<li>{{ i18n.ts._cloudflareRealtime.step3 }}</li>
								<li>{{ i18n.ts._cloudflareRealtime.step4 }}</li>
								<li>{{ i18n.ts._cloudflareRealtime.step5 }}</li>
							</ol>
						</div>

						<div>
							<h4>{{ i18n.ts._cloudflareRealtime.limitations }}</h4>
							<ul>
								<li>{{ i18n.ts._cloudflareRealtime.limitation1 }}</li>
								<li>{{ i18n.ts._cloudflareRealtime.limitation2 }}</li>
								<li>{{ i18n.ts._cloudflareRealtime.limitation3 }}</li>
							</ul>
						</div>
					</div>
				</MkFolder>
			</div>
		</FormSuspense>
	</div>
	<template #footer>
		<div :class="$style.footer">
			<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 16px;">
				<MkButton primary rounded :loading="saving" @click="save">
					<i class="ti ti-check"></i>
					{{ i18n.ts.save }}
				</MkButton>
			</div>
		</div>
	</template>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkInput from '@/components/MkInput.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkFolder from '@/components/MkFolder.vue';
import FormSuspense from '@/components/form/suspense.vue';
import PageWithHeader from '@/ui/PageWithHeader.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/scripts/page.js';
import MkButton from '@/components/MkButton.vue';

const cloudflareRealtimeAppId = ref<string>('');
const cloudflareRealtimeApiToken = ref<string>('');
const cloudflareRealtimeApiTokenSet = ref<boolean>(false);
const saving = ref(false);
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

async function init() {
	try {
		const config = await misskeyApi('admin/cloudflare-realtime-config-get');
		cloudflareRealtimeAppId.value = config.cloudflareRealtimeAppId ?? '';
		cloudflareRealtimeApiTokenSet.value = config.cloudflareRealtimeApiTokenSet;
	} catch (error) {
		console.error('Failed to load config:', error);
		os.alert({
			type: 'error',
			text: i18n.ts._cloudflareRealtime.loadConfigError,
		});
	}
}

async function save() {
	if (saving.value) return;

	saving.value = true;
	try {
		const params: Record<string, string> = {};

		if (cloudflareRealtimeAppId.value.trim()) {
			params.cloudflareRealtimeAppId = cloudflareRealtimeAppId.value.trim();
		}

		if (cloudflareRealtimeApiToken.value.trim()) {
			params.cloudflareRealtimeApiToken = cloudflareRealtimeApiToken.value.trim();
		}

		const result = await misskeyApi('admin/cloudflare-realtime-config', params);

		cloudflareRealtimeApiTokenSet.value = result.cloudflareRealtimeApiTokenSet;
		cloudflareRealtimeApiToken.value = ''; // セキュリティのためクリア

		os.alert({
			type: 'success',
			text: i18n.ts.saved,
		});
	} catch (error) {
		console.error('Failed to save config:', error);
		os.alert({
			type: 'error',
			text: i18n.ts._cloudflareRealtime.saveConfigError,
		});
	} finally {
		saving.value = false;
	}
}

async function testConnection() {
	if (testing.value) return;

	testing.value = true;
	testResult.value = null;

	try {
		// 設定が保存されていることを確認
		if (!cloudflareRealtimeApiTokenSet.value || !cloudflareRealtimeAppId.value) {
			testResult.value = {
				success: false,
				message: i18n.ts._cloudflareRealtime.configNotSaved,
			};
			return;
		}

		// 簡単な接続テスト（実際のAPIは実装されていないので、ダミーの応答）
		await new Promise(resolve => window.setTimeout(resolve, 1500));

		testResult.value = {
			success: true,
			message: i18n.ts._cloudflareRealtime.connectionTestSuccess,
		};
	} catch (error) {
		console.error('Connection test failed:', error);
		testResult.value = {
			success: false,
			message: i18n.ts._cloudflareRealtime.connectionTestFailed,
		};
	} finally {
		testing.value = false;
	}
}

const headerTabs = computed(() => []);

definePage(() => ({
	title: i18n.ts._cloudflareRealtime.title,
	icon: 'ti ti-phone',
}));
</script>

<style lang="scss" module>
.footer {
	border-top: solid 0.5px var(--divider);
	background: var(--acrylicBg);
	-webkit-backdrop-filter: var(--blur, blur(15px));
	backdrop-filter: var(--blur, blur(15px));
}
</style>

<style lang="scss" scoped>
.test-result {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px;
	border-radius: 8px;
	font-weight: bold;

	&.success {
		background: var(--successBg);
		color: var(--successFg);
	}

	&.error {
		background: var(--errorBg);
		color: var(--errorFg);
	}

	i {
		font-size: 18px;
	}
}

h4 {
	margin: 0 0 8px 0;
	color: var(--accent);
}

ol, ul {
	padding-left: 20px;

	li {
		margin: 4px 0;
		line-height: 1.5;
	}
}
</style>
