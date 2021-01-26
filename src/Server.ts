import * as Koa from "koa";
import * as Router from "koa-router";
import * as json from "koa-json";

export class Server {
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
