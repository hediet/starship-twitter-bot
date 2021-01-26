export class AsyncCache<T> {
	private lastCacheUpdateTimestamp = 0; // in ms
	private loadOperation: Promise<T> | undefined;

	constructor(
		private readonly load: () => Promise<T>,
		private readonly cacheValidityMs: number
	) {}

	async get(): Promise<T> {
		if (
			!this.loadOperation ||
			new Date().getTime() - this.lastCacheUpdateTimestamp >
				this.cacheValidityMs
		) {
			this.lastCacheUpdateTimestamp = new Date().getTime();
			this.loadOperation = this.load();
			try {
				await this.loadOperation;
			} catch (e) {
				console.error("Fetch friends failed: ", e);
			}
		}

		return this.loadOperation;
	}

	public set(value: T): void {
		this.lastCacheUpdateTimestamp = new Date().getTime();
		this.loadOperation = Promise.resolve(value);
	}
}
