'use strict';
// Local dev copy: the offline service worker served stale files after edits, so instead of
// registering it, remove any existing registration and its caches. Original: _originals/register-sw.js
{
	window.C3_RegisterSW = async function C3_RegisterSW() {
		if (!navigator.serviceWorker)
			return;
		try {
			const regs = await navigator.serviceWorker.getRegistrations();
			await Promise.all(regs.map(r => r.unregister()));
			if (window.caches)
				await Promise.all((await caches.keys()).map(k => caches.delete(k)));
			if (regs.length)
				console.info("Removed service worker and offline cache (local dev copy)");
		} catch (err) {
			console.warn("Failed to remove service worker: ", err);
		}
	};
}
