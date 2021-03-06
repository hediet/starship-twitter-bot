import { Search, TwitterClient } from "twitter-api-client";
import { Disposable } from "@hediet/std/disposable";
import { EventEmitter } from "@hediet/std/events";
import { AsyncCache } from "./AsyncCache";
import { Server } from "./Server";
import { setupEnv } from "./setupEnv";

setupEnv();

class Main {
	private readonly twitterClient = new TwitterClient({
		apiKey: process.env.API_KEY!,
		apiSecret: process.env.API_SECRET!,
		accessToken: process.env.ACCESS_TOKEN!,
		accessTokenSecret: process.env.ACCESS_TOKEN_SECRET!,
		disableCache: true,
	});

	private readonly friendsCache = new FriendsCache(this.twitterClient);

	private readonly server = new Server();

	constructor() {
		this.run();
	}

	private screenName: string = "";

	private readonly lastPostCached = new AsyncCache(async () => {
		console.log("Refreshing last post time");
		const myUserInfo = await this.twitterClient.accountsAndUsers.usersShow({
			screen_name: this.screenName,
		});
		if (!myUserInfo.status) {
			return 0;
		}
		return new Date(myUserInfo.status.created_at).getTime();
	}, 1000 * 45);

	async run() {
		this.screenName = (
			await this.twitterClient.accountsAndUsers.accountSettings()
		).screen_name;
		const myUserInfo = await this.twitterClient.accountsAndUsers.usersShow({
			screen_name: this.screenName,
		});

		console.log(
			`Using screen name "${this.screenName}" (id "${myUserInfo.name}")`
		);

		const searchListener = new SearchListener(this.twitterClient, [
			"#StarshipLaunchIn5min",
			"#StarshipLaunchIn10min",
			"#StarshipLaunchIn15min",
			"#StarshipLaunchIn20min",
			"#StarshipLaunchIn25min",
			"#StarshipLaunchIn30min",
			"@starship_alarm",
		]);

		searchListener.onTweet.sub(async (t) => {
			if (
				((t.status as any) as { retweeted_status: undefined })
					.retweeted_status
			) {
				// It must be an original tweet.
				return;
			}

			if (!(await this.friendsCache.isFriend(t.userId))) {
				return;
			}

			function formatMs(ms: number): string {
				return `${Math.round(ms / (100 * 60)) / 10}`;
			}

			const tweetCreatedAtMsAgo =
				new Date().getTime() - t.createdAt.getTime();
			if (tweetCreatedAtMsAgo > 30 * 60 * 1000) {
				// this tweet is too old
				console.log(
					`Ignoring tweet "${t.status.text}" by ${
						t.status.user.screen_name
					} ("${t.status.user.name}") as it is too old (${formatMs(
						tweetCreatedAtMsAgo
					)} min).`
				);
				return;
			}

			const lastPostMsAgo =
				new Date().getTime() - (await this.lastPostCached.get());
			if (lastPostMsAgo < 35 * 60 * 1000) {
				// tweet is too new relative to our last tweet
				console.log(
					`Ignoring tweet "${t.status.text}" by ${
						t.status.user.screen_name
					} ("${
						t.status.user.name
					}") as we already posted about the launch ${formatMs(
						lastPostMsAgo
					)} min ago.`
				);
				return;
			}

			console.log(
				`Retweeting tweet "${t.status.text}" by ${t.status.user.screen_name} ("${t.status.user.name}")!`
			);

			this.lastPostCached.set(new Date().getTime()); // avoid immediate retweeting
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
			const t = new Tweet(s);
			this._onTweet.emit(t);
		}

		this.sinceIdStr = result.search_metadata.max_id_str;
	}
}

class FriendsCache {
	private readonly cache = new AsyncCache(async () => {
		console.log("Refreshing friends");

		const friends = await this.twitterClient.accountsAndUsers.friendsList({
			count: 500,
			include_user_entities: false,
		});

		return new Set(friends.users.map((u) => u.id_str));
	}, 30 * 1000);

	constructor(private readonly twitterClient: TwitterClient) {}

	public async isFriend(id: string): Promise<boolean> {
		return (await this.cache.get()).has(id);
	}
}

new Main();
