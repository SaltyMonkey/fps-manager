"use strict";

/**
 * Enum for entity hook binding
 * @readonly
 * @enum {number}
 */
exports.ENTITY_HOOK_TYPE = Object.freeze(
	{
		"SPAWN": 1,
		"DESPAWN": 0
	}
);

/**
 * Enum for runtime raw hook types
 * @readonly
 * @enum {string}
 */
exports.RAW_HOOK_MODE = Object.freeze(
	{
		"PAYLOAD": "raw",
		"EVENT": "event"
	}
);

/**
 * Enum for hook priorities
 * @readonly
 * @enum {Object}
 */
exports.HOOK_SETTINGS = Object.freeze(
	{
		"LAST": { "order": 99999, "filter": { "fake": false, "modified": null } },
		"LASTFAKE": { "order": 99999, "filter": { "fake": true, "modified": null } },
		"FIRST": { "order": -10000, "filter": { "fake": false } },
		"FIRSTA": { "order": -99999, "filter": { "fake": false } }
	}
);

/**
 * Enum for special hunting zones
 * @readonly
 * @enum {number}
 */
exports.SPECIAL_ZONES = Object.freeze(
	{
		"HELPERS": 1023
	}
);

/**
 * Enum despawn types
 * @readonly
 * @enum {number}
 */
exports.DESPAWN_TYPES = Object.freeze(
	{
		"OUTOFVIEW": 1,
		"DEAD": 5
	}
);

/**
 * Enum abnormals types
 * @readonly
 * @enum {number}
 */
exports.ABN = Object.freeze(
	{
		"HuntingGoldModifier": 40,
		"QuestingGoldModifier": 41,
		"ReputationBoostModifier": 42,
		"ShapeChanger": 192,
		"BigHead": 193,
		"PostProcessingEffect": 244,
		"CCB": 249,
		"EPExp": 289,
		"FX": 322
	}
);

/**
 * Enum internal events types
 * @readonly
 * @enum {string}
 */
exports.EVENTS = Object.freeze(
	{
		"RECONFIGURE": "changeMode",
		"RECONFIGUREPARTIAL": "partial"
	}
);

/**
 * Enum creature change hp
 * @readonly
 * @enum {string}
 */
exports.HPCHANGE = Object.freeze(
	{
		"NORMAL": 10,
		"BYFALLING": 2
	}
);

/**
 * Enum creature change mp
 * @readonly
 * @enum {string}
 */
exports.MPCHANGE = Object.freeze(
	{
		"DEFAULT": 0,
		"BYABNORMAL": 1,
		"BYPASSIVE": 4
	}
);

/**
 * Enum chat type
 * @readonly
 * @enum {string}
 */
exports.CHAT_CHANNEL = Object.freeze(
	{
		"MEGAPHONE": 213,
		"GREET": 9,
		"EMOTE": 26
	}
);