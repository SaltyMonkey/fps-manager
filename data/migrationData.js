"use strict";

const DefaultSettings = {
	"enableCommands": true,
	"customCommandTag": "",
	"interactiveMode": true,
	"debugMode": false,
	"classBasedPresets": false,
	"applyTriggers": false,
	"trackPresetsChanges": false
};

module.exports = function MigrateSettings(from_ver, to_ver, settings) {
	if (from_ver === undefined) {
		// Migrate legacy config file
		return { ...DefaultSettings, ...settings };
	} else if (from_ver === null) {
		// No config file exists, use default settings
		return DefaultSettings;
	} else {
		// Migrate from older version (using the new system) to latest one
		throw new Error("So far there is only one settings version and this should never be reached!");
	}
};