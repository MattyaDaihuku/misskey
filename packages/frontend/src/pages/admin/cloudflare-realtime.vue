<template>
<PageWithHeader :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<FormSuspense :p="init">
			<div class="_gaps_m">
				<MkSwitch v-model="useCloudflareRealtime">{{ i18n.ts.useCloudflareRealtime }}</MkSwitch>

				<template v-if="useCloudflareRealtime">
					<MkInput v-model="cloudflareRealtimeAppId" :placeholder="'wss://example.com'" type="url">
						<template #label>{{ i18n.ts.cloudflareRealtimeAppId }}</template>
						<template #caption>{{ i18n.ts.cloudflareRealtimeAppIdDesc }}</template>
					</MkInput>

					<MkInput v-model="cloudflareRealtimeApiToken" type="password">
						<template #label>{{ i18n.ts.cloudflareRealtimeApiToken }}</template>
						<template #caption>{{ i18n.ts.cloudflareRealtimeApiTokenDesc }}</template>
					</MkInput>
				</template>
			</div>
		</FormSuspense>
	</div>
	<template #footer>
		<div :class="$style.footer">
			<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 16px;">
				<MkButton primary rounded @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
			</div>
		</div>
	</template>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInput from '@/components/MkInput.vue';
import FormSuspense from '@/components/form/suspense.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import MkButton from '@/components/MkButton.vue';

const useCloudflareRealtime = ref<boolean>(false);
const cloudflareRealtimeAppId = ref<string | null>(null);
const cloudflareRealtimeApiToken = ref<string | null>(null);

async function init() {
	const meta = await misskeyApi('admin/meta');
	useCloudflareRealtime.value = meta.useCloudflareRealtime;
	cloudflareRealtimeAppId.value = meta.cloudflareRealtimeAppId;
	cloudflareRealtimeApiToken.value = meta.cloudflareRealtimeApiToken;
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		useCloudflareRealtime: useCloudflareRealtime.value,
		cloudflareRealtimeAppId: cloudflareRealtimeAppId.value,
		cloudflareRealtimeApiToken: cloudflareRealtimeApiToken.value,
	}).then(() => {
		fetchInstance(true);
	});
}

const headerTabs = computed(() => []);

definePage(() => ({
	title: 'Cloudflare Calls',
	icon: 'ti ti-phone',
}));
</script>

<style lang="scss" module>
.footer {
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
}
</style>
