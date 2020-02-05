const fs = require("fs");

class Watchdog {
	constructor(path, changeCallback, type = ["change"]) {
		this.fsWatcher = null;
		let fkYouNodeJs = false;
		const debounce = 500;

		if (!fs.existsSync(path) || typeof changeCallback !== "function")
			throw new Error("All shit here fucked");

		// eslint-disable-next-line no-unused-vars
		const listener = (eventType, filename) => {
			if (fkYouNodeJs || !type.includes(eventType)) return;
			fkYouNodeJs = true;
			setTimeout(() => { fkYouNodeJs = false; }, debounce);
			setImmediate(() => { changeCallback(); });
		};

		fs.watch(path, listener);
	}

	destructor() {
		if (this.fsWatcher) this.fsWatcher.close();
	}
}
module.exports = Watchdog;