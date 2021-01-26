import { existsSync, readFileSync } from "fs";
import { join } from "path";

export function setupEnv() {
	const file = join(__dirname, "../.env.json");
	if (existsSync(file)) {
		try {
			const content = readFileSync(file, { encoding: "utf-8" });
			const data = JSON.parse(content);
			Object.assign(process.env, data);
		} catch (e) {
			console.warn("Could not read local environment overrides.");
		}
	}
}
