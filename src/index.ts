import { Search, TwitterClient } from "twitter-api-client";
import { Disposable } from "@hediet/std/disposable";
import { EventEmitter } from "@hediet/std/events";
import * as Koa from "koa";
import * as Router from "koa-router";
import * as json from "koa-json";

class Server {
	constructor() {
		const app = new Koa();
		const router = new Router();

		router.get("/", async (ctx, next) => {
			ctx.body = { status: "ok" };
			await next();
		});

		app.use(json());
		app.use(router.routes()).use(router.allowedMethods());

		app.listen(8080, () => {
			console.log("Server listening on port 8080");
		});
	}
}

class Main {
	private readonly twitterClient = new TwitterClient({
		apiKey: process.env.API_KEY!,
		apiSecret: process.env.API_SECRET!,
		accessToken: process.env.ACCESS_TOKEN!,
		accessTokenSecret: process.env.ACCESS_TOKEN_SECRET!,
	});

	private readonly friendsCache = new FriendsCache(this.twitterClient);

	private readonly server = new Server();

	constructor() {
		this.run();
	}

	async run() {
		const screenName = (
			await this.twitterClient.accountsAndUsers.accountSettings()
		).screen_name;
		const myUserInfo = await this.twitterClient.accountsAndUsers.usersShow({
			screen_name: screenName,
		});

		let lastPostTimestamp: number = 0; // in ms

		if (myUserInfo.status) {
			lastPostTimestamp = new Date(
				myUserInfo.status.created_at
			).getTime();
		}

		console.log(
			`Using screen name "${screenName}" (id "${myUserInfo.name}")`
		);

		const searchListener = new SearchListener(this.twitterClient, [
			"#StarshipLaunchIn5min",
			"#StarshipLaunchIn10min",
			"#StarshipLaunchIn15min",
			"#StarshipLaunchIn20min",
			"#StarshipLaunchIn25min",
			"#StarshipLaunchIn30min",
		]);

		searchListener.onTweet.sub(async (t) => {
			if (t.status.retweeted) {
				// It must be an original tweet.
				return;
			}

			if (!(await this.friendsCache.isFriend(t.userId))) {
				return;
			}

			const tweetCreatedAtMsAgo =
				new Date().getTime() - t.createdAt.getTime();
			if (tweetCreatedAtMsAgo > 30 * 60 * 1000) {
				// this tweet is too old
				console.log(
					`Ignoring tweet "${t.status.text}" by ${
						t.status.user.screen_name
					} ("${t.status.user.name}") as it is too old (${
						tweetCreatedAtMsAgo / (1000 * 60)
					} min).`
				);
				return;
			}

			const lastPostMsAgo = new Date().getTime() - lastPostTimestamp;
			if (lastPostMsAgo < 35 * 60 * 1000) {
				// tweet is too new relative to our last tweet
				console.log(
					`Ignoring tweet "${t.status.text}" by ${
						t.status.user.screen_name
					} ("${
						t.status.user.name
					}") as we already posted about the launch ${
						lastPostMsAgo / (1000 * 60)
					} min ago.`
				);
				return;
			}

			console.log(
				`Retweeting tweet "${t.status.text}" by ${t.status.user.screen_name} ("${t.status.user.name}")!`
			);

			lastPostTimestamp = new Date().getDate();
			await this.twitterClient.tweets.statusesRetweetById({ id: t.id });
		});
	}
}

class Tweet {
	public get id(): string {
		return this.status.id_str;
	}
	public get userId(): string {
		return this.status.user.id_str;
	}
	public get createdAt(): Date {
		return new Date(this.status.created_at);
	}

	constructor(public readonly status: Search["statuses"][0]) {}
}

class SearchListener {
	public readonly dispose = Disposable.fn();

	private sinceIdStr: string | undefined;

	private readonly _onTweet = new EventEmitter<Tweet>();
	public readonly onTweet = this._onTweet.asEvent();

	constructor(
		private readonly twitterClient: TwitterClient,
		private readonly tags: string[]
	) {
		setInterval(() => {
			this.run();
		}, (15 * 60 * 1000) / 60); // rate limit: 75 times per 15 minutes
		this.run();
	}

	private async run(): Promise<void> {
		const result = await this.twitterClient.tweets.search({
			q: this.tags.join(" OR "),
			include_entities: false,
			since_id: this.sinceIdStr,
			result_type: "recent",
		});

		for (const s of result.statuses) {
			if (s.id_str === this.sinceIdStr) {
				continue;
			}

			const t = new Tweet(s);
			this._onTweet.emit(t);
		}

		this.sinceIdStr = result.search_metadata.max_id_str;
	}
}

class FriendsCache {
	private cachedFriendIds = new Set<string>();
	private cachedFriendsTimestamp: number = 0; /* in ms */
	private cacheUpdate: Promise<void> | undefined;

	constructor(private readonly twitterClient: TwitterClient) {}

	public async isFriend(id: string): Promise<boolean> {
		const time = new Date().getTime();
		if (time - this.cachedFriendsTimestamp > 30 * 1000) {
			this.cachedFriendsTimestamp = time;

			// Refresh cache every 30 seconds.
			this.cacheUpdate = this.fetchFriends();
		}
		if (this.cacheUpdate) {
			await this.cacheUpdate;
		}
		return this.cachedFriendIds.has(id);
	}

	private async fetchFriends() {
		try {
			const friends = await this.twitterClient.accountsAndUsers.friendsList(
				{
					count: 500,
					include_user_entities: false,
				}
			);
			this.cachedFriendIds = new Set(friends.users.map((u) => u.id_str));
		} catch (e) {
			console.error("Fetch friends failed: ", e);
		}
	}
}

new Main();
